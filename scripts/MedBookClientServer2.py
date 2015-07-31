#!/usr/local/bin/python

import os, os.path, sys, socket, time, re, random
import pdb

version = "0.01"
HOSTPORT=("ku.sdsc.edu", 10021)
DIPSCserverPrefix = "/hive/users/baertsch/SHUFFLE/MedBook/"
DIPSCcommandPath  = "/hive/users/baertsch/SHUFFLE/MedBook_DIPSC.py"

import logging
if sys.argv[1] == "server":
    logfile = DIPSCserverPrefix+ "log_" + re.sub("[. :]", "_",  time.asctime(time.localtime()) + "_%f" % random.random())
else:
    logfile = "log.log"

logging.basicConfig(filename=logfile,level=logging.DEBUG)

"""
Best practices for security
#0 This code is to be reviewed by several security experts.
#1 No dependencies on secrets. The attacker might be in pocessions of this file
#2 Either side may initiate the communication, but do not depend on server initiated communication for security
#3 The client system is vulnerable, the server is secure. Assume the client is compromised. Server must prevent damage. 
#4 Pathanmes of all server files are entirely controlled by the server. Limit the number of Filenames sent from client and make sure those are only directory specfiic.
#5 Only data may be sent from the client. Never allow programs or shell scripts to be sent from the client.
#6 Only benign datatypes may be sent from the server to the client. Secure data types (such as MAF files  which contain bulk mutations) may not be sent from the server and client.
"""

HandShake = "Beat Cancer Now\n"

""" Add in new commands as subclasses of ServerCommand and instantiate and add to list of PossibleCommands"""

BUFSIZ = (20*1024)

class ServerCommand:
    def readFromFileWriteToConnection(self, cfile, filename):
        size =  os.stat( filename ).st_size 
        cfile.write("file\t%s\t%d\n"  % ( filename, size));
        f = open(filename)
        logging.debug( "reading opening %s %d" % ( filename, size))
        while size > 0:
            contents = f.read(min(size, BUFSIZ))
            size -= len(contents)
            cfile.write(contents)
        f.close()

    def readFromConnectionWriteToFile(self, cfile, filename):
        fileline = cfile.readline()
        words = fileline.strip().split("\t")
        if len(words) == 3 and words[0] == "file" and re.match("[0-9]+", words[2]):
            size = int(words[2]);
        else:
            raise BadlyFormedResponse("readFromConnection received badly specified file")
        f = open(filename, "w")
        logging.debug( "opening %s %d" % ( filename, size))
        while size > 0:
            data = cfile.read(min(size, BUFSIZ))
            if len(data) == 0:
                raise BadlyFormedResponse("not ready")
            size -= len(data)
            f.write( data )
        f.close()

class DIPSCcommand(ServerCommand):
    def sendValidCommand(self, cfile, argv):
        assert re.match("[0-9]+", argv[2])
        K = argv[2];
        cfile.write("DIPSC\t"+version+"\t"+K+"\n")

    def isValidCommand(self, line):
        words = line.strip().split("\t")
        return words[0] == "DIPSC" and words[1] == version and re.match("[0-9]+", words[2])

    def executeServer(self, cfile, line):
        args = line.strip().split("\t")
        assert re.match("[0-9]+", args[2])
        K = args[2];

        # principal #4, all server filenames are controlled by the server code
        token = re.sub("[. :]", "_",  time.asctime(time.localtime()) + "_%f" % random.random())
        path = DIPSCserverPrefix+ "run_" + token
        if not os.path.exists(path):
            os.mkdir(path)
        os.chdir(path)

        f1 = path + "/phenotypes.tab"
        f2 = path + "/features.tab"
        f3 = path + "/correlations.tab"
        f4 = path + "/pvalues.tab"
        f5 = path + "/variances.tab"

        cfile.write("token\t"+token+"\tready\n")

        self.readFromConnectionWriteToFile(cfile, f1)
        self.readFromConnectionWriteToFile(cfile, f2)
        logging.info ( "executing %s %s %s " % ( DIPSCcommandPath , path ,  K))
        pfile = os.popen( DIPSCcommandPath + " " + path + " " + K)
        try:
            while True:
                cmdOutput = pfile.read()
                logging.info ( "read %s" % ( cmdOutput ))
                if cmdOutput == '':
                    raise Finished("popen Done")
                cfile.write(cmdOutput)
        except Finished :
            pass
        cfile.write("\nDIPSC DONE\n")
        logging.info ( "done executing %s %s %s " % ( DIPSCcommandPath ,  path , K))

        self.readFromFileWriteToConnection(cfile, f3)
        self.readFromFileWriteToConnection(cfile, f4)
        self.readFromFileWriteToConnection(cfile, f5)

    def executeClient(self, cfile, parms):
        assert int(parms[0]) > 0
        line = cfile.readline()
        words = line.strip().split("\t")
        if len(words) == 3 and words[0] == "token" and words[2] == "ready":
            token = words[1]
            logging.info ( "token %s" % token)
        else:
            raise BadlyFormedResponse("not ready")

        self.readFromFileWriteToConnection(cfile, parms[1])
        self.readFromFileWriteToConnection(cfile, parms[2])
        try:
            while True:
                cmdOutput = cfile.readline()
                if re.match("DIPSC DONE", cmdOutput):
                    raise Finished("finished")
                logging.debug( cmdOutput );
        except Finished:
            pass
        self.readFromConnectionWriteToFile(cfile, parms[3])
        self.readFromConnectionWriteToFile(cfile, parms[4])
        self.readFromConnectionWriteToFile(cfile, parms[5])

class BadlyFormedResponse(Exception): pass
class Finished(Exception): pass

PossibleCommands = {
    "DIPSC": DIPSCcommand()
};
        
class MedBookService:

    def __init__(self):
        self.cfile = None
        self.conn = None

    def cleanup(self):
        if self.cfile: 
            try: 
                self.cfile.close()
            except: pass
            self.cfile = None
        if self.conn:
            try: 
                self.conn.close() 
            except: pass
            self.conn = None

    def client(self):
        self.conn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        val = self.conn.connect(HOSTPORT)
        self.cfile = self.conn.makefile("rw", 0)
        hello = self.cfile.readline()
        self.write(HandShake)
        cmd = PossibleCommands[sys.argv[1]]
        cmd.sendValidCommand(self.cfile, sys.argv)
        cmd.executeClient(self.cfile, sys.argv[2:])
        goodbye = self.cfile.readline()
        self.cleanup()

    def server_inner_loop(self):
        handshake = self.cfile.readline()
        if handshake == HandShake:
            command = self.cfile.readline()
            words = command.strip().split("\t")
            pos = PossibleCommands[words[0]]
            if pos.isValidCommand(command):
                pos.executeServer(self.cfile, command)

    def write(self, str):
        self.cfile.write(str)
        self.cfile.flush()

    def server(self):
        server = socket.socket( socket.AF_INET, socket.SOCK_STREAM )
        server.bind(HOSTPORT)
        server.listen(5)
        logging.info('listening...')
        while True:
            try:
                self.conn, addr = server.accept()
                logging.info( 'Accepted connection from %s' % str(addr))
                if os.fork() == 0:
                    try:
                        server.close()
                        self.cfile = self.conn.makefile("rw", 0)
                        self.write("Hello MedBook! version %s\n" % version)
                        self.server_inner_loop()
                        self.write("Goodbye MedBook!\n")
                    except:
                        logging.info('Exception...', exc_info=True)
                    self.cleanup()
                    sys.exit(0)

            finally:
                self.cleanup()


def __main__():
    mb = MedBookService()
    if sys.argv[1] == "server":
        mb.server()
    else:
        mb.client()


if __name__=="__main__": __main__()


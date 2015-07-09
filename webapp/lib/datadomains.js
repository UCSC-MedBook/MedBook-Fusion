

// The most important data domains: the ones which are indexed by gene (or gene-like) names.
GeneLikeDataDomainsPrototype = [
    {
        label: "Expression RSEM",
        labelItem: "ExprRSEM",
        checkBoxName: "ExprCheckbox",
        dataName: "Expression",
        collection: "Expression",
        subscriptionName: "GeneExpression",
        queryField: 'gene',
        field: "rsem_quan_log2",
        state: false,
    },
    {
        label: "Isoform RSEM",
        labelItem: "IsoformRSEM",
        checkBoxName: "IsoformCheckbox",
        dataName: "ExpressionIsoform",
        collection: "ExpressionIsoform",
        subscriptionName: "GeneExpressionIsoform",
        queryField: 'gene',
        field: "rsem_quan_log2",
        state: false,
    },
    {
        label: "Mutations",
        labelItem: "Mut",
        checkBoxName: "MutCheckbox",
        dataName: "Mutations",
        collection: "Mutations",
        subscriptionName: "GeneMutations",
        queryField: 'Hugo_Symbol',
        field: "Variant_Type",
        state: false,
    },
    {
        label: "Kinase Pathway Signature (Viper Method)",
        labelItem: "Kinase_Sig",
        checkBoxName: "KinaseViperSignatureCheckbox",
        dataName: "KinaseViperSignature",
        collection: "SignatureScores",
        subscriptionName: "GeneSignatureScores",
        queryField: 'gene',
        field: "kinase_viper",
        state: false,
    },
    {
        label: "Transcription Factor Pathway Signature (Viper Method)",
        labelItem: "TF_Sig",
        checkBoxName: "TfViperSignatureCheckbox",
        dataName: "TfViperSignature",
        collection: "SignatureScores",
        subscriptionName: "GeneSignatureScores",
        queryField: 'gene',
        field: "tf_viper",
        state: false,
    },
];





// The most important data domains: the ones which are indexed by gene (or gene-like) names.
GeneLikeDataDomainsPrototype = [
    {
        label: "Expression RSEM",
        labelItem: "ExprRSEM",
        checkBoxName: "ExprCheckbox",
        dataName: "Expression",
        collection: "Expression",
        subscriptionName: "GeneExpression",
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
        field: "Variant_Type",
        state: false,
    },
    {
        label: "Kinase Pathway Signature (Viper Method)",
        labelItem: "KinasePatSig",
        checkBoxName: "ViperSignatureCheckbox",
        dataName: "ViperSignature",
        collection: "SignatureScores",
        subscriptionName: "GeneSignatureScores",
        field: "kinase_viper",
        state: false,
    },
];



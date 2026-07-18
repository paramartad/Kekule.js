describe('Test of converting condensed formula to molecule', function(){

    beforeAll(function(done){
        // TODO: note this test should be done in browser (for loading OpenBabel)
        Kekule.modules('openbabel', function(error) {
            if (!error)
                Kekule.OpenBabel.enable(function() {
                    done();
                });
        });

        /*
        Kekule.modules('indigo', function(error) {
            if (!error)
                Kekule.Indigo.enable(function() {
                    done();
                });
        });
        */
    });

    var testFormula = function(formulaText, expectedSmiles, options)
    {
        it(formulaText, function(){
            if (!expectedSmiles) {
                console.log('non test', formulaText);
                expect(() => Kekule.CondensedFormulaUtils.textToStructureFragment(formulaText, 0, Kekule.Editor.RepositoryData.subGroups, options)).toThrow();
            }
            else {
                var mol1 = Kekule.CondensedFormulaUtils.textToStructureFragment(formulaText, 0, Kekule.Editor.RepositoryData.subGroups, options);
                var mol2 = Kekule.IO.loadFormatData(expectedSmiles, Kekule.IO.DataFormat.SMILES);
                expect(mol1.isSameStructureWith(mol2)).toBeTruthy();
            }
        });
    };

    var testCases = [
        {'text': 'CH4', 'smiles': 'C'},
        {'text': 'CH3CH2OH', 'smiles': 'CCO'},
        {'text': 'H3CCH2OH', 'smiles': 'CCO'},
        {'text': 'H3CH2COH', 'smiles': 'CCO'},
        {'text': 'C2H5OH', 'smiles': 'CCO'},
        {'text': 'EtOH', 'smiles': 'CCO'},
        {'text': 'MeCH2OH', 'smiles': 'CCO'},
        {'text': 'CH3CH2MgCl', 'smiles': 'CC[Mg]Cl'},
        {'text': 'EtMgCl', 'smiles': 'CC[Mg]Cl'},
        {'text': 'Me3CH', 'smiles': 'CC(C)C'},
        {'text': '(CH3)3CH', 'smiles': 'CC(C)C'},
        {'text': 'Me3CEt', 'smiles': 'CCC(C)(C)C'},
        {'text': 'MeCOCH3', 'smiles': 'CC(C)=O'},
        {'text': 'Me3COCH3', 'smiles': 'COC(C)(C)C'},
        {'text': 'MeCOCH2CH2CH2CH3', 'smiles': 'CC(=O)CCCC'},
        {'text': 'EtCHO', 'smiles': 'CCC=O'},
        {'text': 'Et2CHOH', 'smiles': 'CCC(CC)O'},

        {'text': 'ClCH2CH2CH(Br)CH3', 'smiles': 'ClCCC(Br)C'},
        {'text': 'ClCH2CH2C(Br)(Br)CH3', 'smiles': 'ClCCC(Br)(Br)C'},
        {'text': 'ClCH2CH2CH(OCH3)CH3', 'smiles': 'ClCCC(OC)C'},
        {'text': 'ClCH2CH2CH(OMe)Me', 'smiles': 'ClCCC(OC)C'},
        {'text': 'ClCH2CH2C(OCH3)2CH3', 'smiles': 'ClCCC(OC)(OC)C'},
        {'text': 'ClCH2CH2C(OMe)2Me', 'smiles': 'ClCCC(OC)(OC)C'},
        {'text': 'ClCH2CH2C(OCH(CH3)CH3)2Me', 'smiles': 'ClCCC(OC(C)C)(OC(C)C)C'},
        {'text': '(CH3CH2)CH2CH3', 'smiles': 'CCCC'},
        {'text': '(Et)CH2CH3', 'smiles': 'CCCC'},
        {'text': '(CH3CH2)2CHCH3', 'smiles': 'CCC(CC)C'},
        {'text': '(Et)2CHCH3', 'smiles': 'CCC(CC)C'},

        {'text': 'H3CNHCH2COOH', 'smiles': 'CNCC(O)=O'},
        {'text': 'H3CNHCH2CO2H', 'smiles': 'CNCC(O)=O'},
        {'text': 'H3CNHCH2CO3H', 'smiles': 'CNCC(OO)=O'},
        {'text': 'H3CNHCH2COOC2H5', 'smiles': 'CNCC(=O)OCC'},
        {'text': 'H3CNHCH2COOEt', 'smiles': 'CNCC(=O)OCC'},
        {'text': 'H3CNHCH2COOtBu', 'smiles': 'CNCC(=O)OC(C)(C)C'},

        {'text': 'HOOCCH2COOH', 'smiles': 'O=C(O)CC(O)=O'},
        {'text': 'H2NCH2NH2', 'smiles': 'NCN'},
        {'text': 'OHCCH2CH2CHO', 'smiles': 'O=CCCC=O'},

        {'text': 'PhCH2COCH3', 'smiles': 'c1ccccc1CC(=O)C'},
        {'text': 'PhCH2CH2OCH3', 'smiles': 'c1ccccc1CCOC'},
        {'text': 'PhCH2C(CH3)2OCH3', 'smiles': 'c1ccccc1CC(C)(C)OC'},
        {'text': 'PhCOCH2CH2COCH3', 'smiles': 'c1ccccc1C(=O)CCC(=O)C'},
        {'text': 'PhOCH2(OMe)', 'smiles': 'c1ccccc1OCOC'},
        {'text': 'PhOCH(OMe)2', 'smiles': 'c1ccccc1OC(OC)OC'},
        {'text': 'H3CNHCH2COOH', 'smiles': 'CNCC(O)=O'},

        {'text': 'CH3-CH2CHO', 'smiles': 'CCC=O'},
        {'text': 'CH3CH2CH=O', 'smiles': 'CCC=O'},
        {'text': 'CH3CH2C(H)=O', 'smiles': 'CCC=O'},
        {'text': 'CH3CH2COCH3', 'smiles': 'CCC(=O)C'},
        {'text': 'EtCOMe', 'smiles': 'CCC(=O)C'},

        {'text': 'CH3C(-CH3)2CH3', 'smiles': 'CC(C)(C)C'},
        {'text': 'CH3C(=CH2)CH3', 'smiles': 'CC(=C)C'},
        {'text': 'C(#CH)CH3', 'smiles': 'C#CC'},
        {'text': 'CH2=CHCOMe', 'smiles': 'C=CC(=O)C'},
        {'text': 'CH2=CHO', 'smiles': null},
        {'text': 'CH2=CO', 'smiles': 'C=C=O'},
        {'text': 'CH2=CH-CH=CH2', 'smiles': 'C=CC=C'},
        {'text': 'CH2=C=CH2', 'smiles': 'C=C=C'},
        {'text': 'CH2=CH=CH2', 'smiles': null},

        {'text': 'H3C+', 'smiles': '[C+]'},
        // {'text': 'CH3+', 'smiles': '[C+]'},
        {'text': 'C+(CH3)3', 'smiles': 'C[C+](C)C'},
        {'text': 'CH3CH2O+H2', 'smiles': 'CC[O+]'},
        {'text': 'H3C-', 'smiles': '[C-]'},
        // {'text': 'CH3-', 'smiles': '[C-]'},
        {'text': 'C-(CH3)3', 'smiles': 'C[C-](C)C'},
        {'text': 'MeC-HCH2CH3', 'smiles': 'C[C-]CC'},
        {'text': 'MeC-2CH2CH3', 'smiles': 'C[C-2]CC'},
        {'text': 'MeC+2CH2CH3', 'smiles': 'C[C+2]CC'}
    ];

    testCases.forEach(function(info){
        testFormula(info.text, info.smiles, info.options);
    });
});

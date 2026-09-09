describe('Test of molecular formulas', function(){
    function formulaCompare(formulaText1, formulaText2, options, expectedResult) {
        it('Compare formulas: ' + formulaText1 + ' : ' + formulaText2 + ', result is ' + expectedResult, function(){
            var formula1 = Kekule.FormulaUtils.textToFormula(formulaText1);
            var formula2 = Kekule.FormulaUtils.textToFormula(formulaText2);
            expect(Kekule.FormulaUtils.compareFormula(formula1, formula2, options)).toEqual(expectedResult);
        });
    }

    var options = {
        'method': Kekule.ComparisonMethod.CHEM_STRUCTURE
    };
    formulaCompare('CH4', 'CH4', options, 0);
    formulaCompare('H4C', 'CH4', options, 0);
    formulaCompare('CH4', 'H4C', options, 0);

    formulaCompare('CH4', 'H2O', options, -1);
    formulaCompare('CH4', 'OH2', options, -1);

    formulaCompare('CH4', 'KOH', options, -1);
    formulaCompare('CuSO4', 'KOH', options, 1);
    formulaCompare('CuSO4', 'Cu(OH)2', options, -1);
    formulaCompare('Cu(SO4)', 'Cu(OH)2', options, 1);
    formulaCompare('Cu(OH)2', '[Cu(NH3)2]O4', options, -1);
    formulaCompare('[Cu(NH3)2]O4', '[Cu(NH3)2]O4', options, 0);
    formulaCompare('[Cu(NH3)2]O4', '[Cu(NH3)3]O4', options, -1);
});
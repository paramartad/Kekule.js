describe('Test of Kekule.ChemReaction class', function(){
    it('Basic methods test on reaction', function(){
        var r1 = new Kekule.ChemReaction('r1');

        var reactant1 = new Kekule.Molecule('reactant1');
        var reactant2 = new Kekule.Molecule('reactant2');
        var reactant3 = new Kekule.Molecule('reactant3');
        r1.appendChild(reactant2);
        r1.appendReactant(reactant3);
        r1.insertReactantBefore(reactant1, reactant2);

        var product1 = new Kekule.Molecule('product1');
        r1.appendProduct(product1);

        var reagent1 = new Kekule.Molecule('reagent1');
        var reagent2 = new Kekule.Molecule('reagent2');
        r1.appendReagent(reagent2).insertReagentBefore(reagent1, reagent2);

        var catalyst1 = new Kekule.Molecule('catalyst1');
        r1.appendCatalyst(catalyst1);

        r1.appendSolvent(new Kekule.Molecule('solvent1'));

        r1.appendSubstance('custom', new Kekule.Molecule('custom1'));
        r1.appendSubstance('custom', new Kekule.Molecule('custom2'));

        expect(r1.getReactantCount()).toEqual(3);
        expect(r1.getProductCount()).toEqual(1);
        expect(r1.getReagentCount()).toEqual(2);
        expect(r1.getCatalystCount()).toEqual(1);
        expect(r1.getSolventCount()).toEqual(1);
        expect(r1.getSubstanceCount('custom')).toEqual(2);

        expect(r1.getReactantAt(0).getId()).toEqual('reactant1');
        expect(r1.getReactantAt(2).getId()).toEqual('reactant3');
        expect(r1.getProductAt(0).getId()).toEqual('product1');
        expect(r1.getReagentAt(1).getId()).toEqual('reagent2');
        expect(r1.getSolventAt(0).getId()).toEqual('solvent1');
        expect(r1.getSubstanceAt('custom', 1).getId()).toEqual('custom2');

        expect(!r1.getReagentAt(3)).toBeTruthy();

        expect(reactant1.getParent()).toEqual(r1);
        expect(reactant3.getParent()).toEqual(r1);
        expect(reagent1.getParent()).toEqual(r1);

        r1.removeReactant(reactant3);
        expect(r1.getReactantCount()).toEqual(2);
        expect(!reactant3.getParent()).toBeTruthy();
    });

    it('Basic methods test of Multistep reaction', function() {
        var r1 = new Kekule.MultiStepReaction('r1');
        var step1 = new Kekule.EmbeddedReaction('step1');
        step1.appendReactant(new Kekule.Molecule('reactant11')).appendReactant(new Kekule.Molecule('reactant12'))
            .appendProduct(new Kekule.Molecule('product11')).appendProduct(new Kekule.Molecule('product12'));
        r1.appendChild(step1);
        var step3 = r1.newStep('step3');
        step3.appendProduct(new Kekule.Molecule('product31'));
        var step2 = r1.newStep('step2', 1);
        step2.appendReactant(new Kekule.Molecule('reactant21'))
            .appendProduct(new Kekule.Molecule('product21'));

        expect(r1.getStepCount()).toEqual(3);
        expect(r1.getChildAt(0).getId()).toEqual('step1');
        expect(r1.getChildAt(1).getId()).toEqual('step2');
        expect(r1.getChildAt(2).getId()).toEqual('step3');

        expect(r1.getChildAt(0).getReactantCount()).toEqual(2);
        expect(r1.getChildAt(1).getReactantCount()).toEqual(3);
        expect(r1.getChildAt(2).getReactantCount()).toEqual(1);


        expect(r1.getChildAt(1).indexOfReactant(step1.getProductAt(1))).toEqual(1);
        expect(r1.getChildAt(1).indexOfReactant(step2.getExplicitReactantAt(0))).toEqual(2);
    });


});
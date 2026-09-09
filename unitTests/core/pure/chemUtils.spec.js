/**
 * Pure-function tests for src/core/kekule.chemUtils.js static utilities, previously untested.
 * Kekule.ChemStructureUtils, Kekule.FormulaUtils and Kekule.CondensedFormulaUtils are three
 * separate namespace objects in this file -- each function below is namespaced accordingly.
 */
describe('Test of ChemStructureUtils / FormulaUtils / CondensedFormulaUtils utilities', function(){
	var CU = Kekule.ChemStructureUtils;
	var BO = Kekule.BondOrder;

	var makeBenzene = function()
	{
		var mol = new Kekule.Molecule();
		var atoms = [];
		for (var i = 0; i < 6; ++i)
			atoms.push(mol.appendAtom('C'));
		for (var i = 0; i < 6; ++i)
			mol.appendBond([atoms[i], atoms[(i + 1) % 6]], (i % 2 === 0) ? BO.DOUBLE : BO.SINGLE);
		return mol;
	};

	describe('ChemStructureUtils.isSameRing() / isInRings()', function(){
		it('a ring is the same as itself, and is found in a list containing it', function(){
			var mol = makeBenzene();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(1);
			expect(CU.isSameRing(rings[0], rings[0])).toBe(true);
			expect(CU.isInRings(rings[0], rings)).toBe(true);
		});

		it('two rings from different (unfused) molecules are not the same ring', function(){
			var mol1 = makeBenzene();
			var mol2 = makeBenzene();
			var ring1 = mol1.findAllRings()[0];
			var ring2 = mol2.findAllRings()[0];
			expect(CU.isSameRing(ring1, ring2)).toBe(false);
			expect(CU.isInRings(ring1, [ring2])).toBe(false);
		});
	});

	describe('ChemStructureUtils.getChemNodeXConnectors() / getChemNodeXConnectorsOrderSum()', function(){
		it('counts connectors on a node and sums their bond orders', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var c2 = mol.appendAtom('C');
			var c3 = mol.appendAtom('C');
			mol.appendBond([c1, c2], BO.SINGLE);
			mol.appendBond([c2, c3], BO.DOUBLE);

			expect(CU.getChemNodeXConnectors(c2).length).toEqual(2);
			expect(CU.getChemNodeXConnectorsOrderSum(c2)).toEqual(3);  // 1 (single) + 2 (double)
		});
	});

	describe('ChemStructureUtils.getAllStructFragments()', function(){
		it('returns the top-level molecule itself when there are no nested subgroups', function(){
			var mol = makeBenzene();
			expect(CU.getAllStructFragments(mol).length).toEqual(1);
		});
	});

	describe('FormulaUtils.getBondSymbol()', function(){
		it('returns distinct symbols for single, double and triple covalent bonds', function(){
			var single = Kekule.FormulaUtils.getBondSymbol(BO.SINGLE, Kekule.BondType.COVALENT);
			var double_ = Kekule.FormulaUtils.getBondSymbol(BO.DOUBLE, Kekule.BondType.COVALENT);
			var triple = Kekule.FormulaUtils.getBondSymbol(BO.TRIPLE, Kekule.BondType.COVALENT);

			expect(single).toEqual('-');
			expect(double_).toEqual('=');
			expect(single).not.toEqual(double_);
			expect(double_).not.toEqual(triple);
		});
	});

	describe('CondensedFormulaUtils.guessFormulaTextType()', function(){
		it('classifies a plain molecular formula as "normal"', function(){
			expect(Kekule.CondensedFormulaUtils.guessFormulaTextType('CH4')).toEqual('normal');
		});

		it('classifies a condensed/structural formula (with sub-chains) as "condensed"', function(){
			expect(Kekule.CondensedFormulaUtils.guessFormulaTextType('C6H5CH2CH2OH')).toEqual('condensed');
		});
	});
});

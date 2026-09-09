/**
 * Pure-function tests for structural query methods on src/core/kekule.structures.js
 * that had no prior coverage at all.
 */
describe('Test of structural query methods on Kekule.StructureFragment/Atom/Bond/MolecularFormula', function(){
	var BO = Kekule.BondOrder;

	describe('getHydrogenCount(includingBondedHydrogen)', function(){
		// Regression coverage for a real gap: getHydrogenCount() with no argument only
		// resolves explicit-property-or-implicit hydrogens; it misses hydrogens that are
		// stored as their own bonded atom node. Passing `true` is required to count both.

		it('counts an implicit hydroxyl hydrogen (no explicit H atom node)', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var c2 = mol.appendAtom('C');
			var o1 = mol.appendAtom('O');
			mol.appendBond([c1, c2], BO.SINGLE);
			mol.appendBond([c2, o1], BO.SINGLE);

			expect(o1.getHydrogenCount(true)).toEqual(1);
		});

		it('counts an explicit hydroxyl hydrogen atom node only when passed true', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var c2 = mol.appendAtom('C');
			var o1 = mol.appendAtom('O');
			var h1 = mol.appendAtom('H');
			mol.appendBond([c1, c2], BO.SINGLE);
			mol.appendBond([c2, o1], BO.SINGLE);
			mol.appendBond([o1, h1], BO.SINGLE);

			expect(o1.getHydrogenCount()).toEqual(0);      // misses the bonded H atom node
			expect(o1.getHydrogenCount(true)).toEqual(1);  // correctly counts it
		});

		it('ether oxygen (no H on O either way) has zero hydrogens', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var o1 = mol.appendAtom('O');
			var c2 = mol.appendAtom('C');
			mol.appendBond([c1, o1], BO.SINGLE);
			mol.appendBond([o1, c2], BO.SINGLE);

			expect(o1.getHydrogenCount(true)).toEqual(0);
		});
	});

	describe('Bond#isBondBetween()', function(){
		it('matches the two connected elements regardless of argument order', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var o1 = mol.appendAtom('O');
			var bond = mol.appendBond([c1, o1], BO.SINGLE);

			expect(bond.isBondBetween('C', 'O')).toBe(true);
			expect(bond.isBondBetween('O', 'C')).toBe(true);
			expect(bond.isBondBetween('C', 'N')).toBe(false);
		});
	});

	describe('MolecularFormula#getTotalCharge()', function(){
		it('sums the charge of single-count charged sections', function(){
			var formula = new Kekule.MolecularFormula();
			var na = new Kekule.Atom(null, 'Na');
			var cl = new Kekule.Atom(null, 'Cl');
			formula.appendSection(na, 1, 1);
			formula.appendSection(cl, 1, -1);

			expect(formula.getTotalCharge()).toEqual(0);
		});

		it('is zero for an uncharged formula', function(){
			var formula = Kekule.FormulaUtils.textToFormula('CH4');
			expect(formula.getTotalCharge()).toEqual(0);
		});
	});
});

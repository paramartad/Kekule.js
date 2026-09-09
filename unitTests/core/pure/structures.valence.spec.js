/**
 * Pure-function tests for valence and bond-order predicates on
 * src/core/kekule.structures.js (Kekule.Atom / Kekule.Bond), previously untested.
 */
describe('Test of valence and bond-order predicates', function(){
	var BO = Kekule.BondOrder;

	describe('Atom valence: getImplicitValence() / getExplicitValence() / getValence()', function(){
		it('a singly-bonded carbon has implicit/total valence 4, explicit (bond-only) valence 1', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var c2 = mol.appendAtom('C');
			mol.appendBond([c1, c2], BO.SINGLE);

			expect(c1.getImplicitValence()).toEqual(4);
			expect(c1.getExplicitValence()).toEqual(1);
			expect(c1.getValence()).toEqual(4);
		});

		it('a doubly-bonded carbon still has implicit/total valence 4 (valence is per-element, not per-bond)', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var c2 = mol.appendAtom('C');
			mol.appendBond([c1, c2], BO.DOUBLE);

			expect(c1.getImplicitValence()).toEqual(4);
		});

		it('a positively-charged nitrogen (ammonium-like) has valence 4, not the neutral N valence of 3', function(){
			var mol = new Kekule.Molecule();
			var n1 = mol.appendAtom('N');
			var c1 = mol.appendAtom('C');
			mol.appendBond([n1, c1], BO.SINGLE);
			n1.setCharge(1);

			expect(n1.getImplicitValence()).toEqual(4);
			expect(n1.getValence()).toEqual(4);
			// 4 total - 1 existing bond = 3 implicit hydrogens (NH3+ attached to C)
			expect(n1.getHydrogenCount(true)).toEqual(3);
		});
	});

	describe('Bond#isCovalentBond() / isSingleBond() / isDoubleBond() / isTripleBond()', function(){
		var makeBondedPair = function(order)
		{
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var c2 = mol.appendAtom('C');
			return mol.appendBond([c1, c2], order);
		};

		it('classifies a single bond correctly', function(){
			var bond = makeBondedPair(BO.SINGLE);
			expect(bond.isCovalentBond()).toBe(true);
			expect(bond.isSingleBond()).toBe(true);
			expect(bond.isDoubleBond()).toBe(false);
			expect(bond.isTripleBond()).toBe(false);
		});

		it('classifies a double bond correctly', function(){
			var bond = makeBondedPair(BO.DOUBLE);
			expect(bond.isCovalentBond()).toBe(true);
			expect(bond.isSingleBond()).toBe(false);
			expect(bond.isDoubleBond()).toBe(true);
			expect(bond.isTripleBond()).toBe(false);
		});

		it('classifies a triple bond correctly', function(){
			var bond = makeBondedPair(BO.TRIPLE);
			expect(bond.isCovalentBond()).toBe(true);
			expect(bond.isSingleBond()).toBe(false);
			expect(bond.isDoubleBond()).toBe(false);
			expect(bond.isTripleBond()).toBe(true);
		});
	});

	describe('Atom#isHydrogenAtom()', function(){
		it('is true only for hydrogen', function(){
			expect(new Kekule.Atom(null, 'H').isHydrogenAtom()).toBe(true);
			expect(new Kekule.Atom(null, 'C').isHydrogenAtom()).toBe(false);
			expect(new Kekule.Atom(null, 'O').isHydrogenAtom()).toBe(false);
		});
	});
});

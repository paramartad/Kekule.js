/**
 * Pure-function tests for Kekule.StructureFragment#findAromaticRings(), built entirely
 * from in-memory molecules rather than loaded files.
 *
 * The original unitTests/algorithm/aromaticTest.js loads specific heteroatom-containing
 * molecules (furan, quinone, pyridinone...) from .mol fixtures and stays in place,
 * untouched, as part of the integration suite (npm run test:integration). This file
 * covers the same kind of cases (a simple aromatic ring, a heteroatom-containing
 * aromatic ring, and two non-aromatic rings) built programmatically instead.
 */
describe('Test of finding aromatic rings in molecule (pure)', function(){
	var MB = TestMolBuilder;
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

	// Furan: 5-membered ring O1-C2=C3-C4=C5(-O1), aromatic via the oxygen lone pair.
	var makeFuran = function()
	{
		var mol = new Kekule.Molecule();
		var o1 = mol.appendAtom('O');
		var c2 = mol.appendAtom('C');
		var c3 = mol.appendAtom('C');
		var c4 = mol.appendAtom('C');
		var c5 = mol.appendAtom('C');
		mol.appendBond([o1, c2], BO.SINGLE);
		mol.appendBond([c2, c3], BO.DOUBLE);
		mol.appendBond([c3, c4], BO.SINGLE);
		mol.appendBond([c4, c5], BO.DOUBLE);
		mol.appendBond([c5, o1], BO.SINGLE);
		return mol;
	};

	it('aromatic test on benzene', function(){
		var mol = makeBenzene();
		var rings = mol.findAromaticRings();
		expect(rings.length).toEqual(1);
		expect(rings[0].connectors.length).toEqual(6);
	});

	it('aromatic test on furan', function(){
		var mol = makeFuran();
		var rings = mol.findAromaticRings();
		expect(rings.length).toEqual(1);
		expect(rings[0].connectors.length).toEqual(5);
	});

	it('aromatic test on cyclohexene: single double bond is not aromatic', function(){
		var mol = MB.makeCyclohexene();
		var rings = mol.findAromaticRings();
		expect(rings.length).toEqual(0);
	});

	it('aromatic test on cyclobutadiene: 4-membered ring is not aromatic (anti-aromatic)', function(){
		var mol = MB.makeCyclobutadiene();
		var rings = mol.findAromaticRings();
		expect(rings.length).toEqual(0);
	});
});

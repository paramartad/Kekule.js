/**
 * Pure-function tests for Kekule.StructureFragment#findAllRings(), built entirely
 * from in-memory molecules (TestMolBuilder) rather than loaded files.
 *
 * Extracted from unitTests/algorithm/allRingFinderTest.js, whose file-loading
 * specs remain there as part of the integration suite (npm run test:integration).
 */
describe('Test of finding all rings in molecule (pure)', function(){
	var MB = TestMolBuilder;

	it('Ring count test on internal data: Ethyl Propyl Phenantren', function(){
		var mol = MB.makeEthylPropylPhenantren();
		var rings = mol.findAllRings();
		expect(rings.length).toEqual(6);
	});

	it('Ring member test on internal data: Ethyl Propyl Phenantren', function(){
		var mol = MB.makeEthylPropylPhenantren();
		var rings = mol.findAllRings();
		rings.forEach(function(ring){
			var bonds = ring.connectors;
			bonds.forEach(function(bond){
				var atoms = bond.getConnectedObjs();
				atoms.forEach(function(atom){
					expect(ring.nodes.indexOf(atom) >= 0).toBeTruthy();
				});
			});
		});
	});

	it('Ring count test on internal data: simple cyclohexane has one ring', function(){
		var mol = MB.makeCyclohexane();
		var rings = mol.findAllRings();
		expect(rings.length).toEqual(1);
		expect(rings[0].nodes.length).toEqual(6);
	});

	it('Ring count test on internal data: acyclic alkane has no rings', function(){
		var mol = MB.makeAlkane(5);
		var rings = mol.findAllRings();
		expect(rings.length).toEqual(0);
	});

	it('Ring count test on internal data: spiro rings share exactly one atom', function(){
		var mol = MB.makeSpiroRings();
		var rings = mol.findAllRings();
		expect(rings.length).toEqual(2);
	});
});

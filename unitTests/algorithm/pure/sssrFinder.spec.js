/**
 * Pure-function tests for Kekule.StructureFragment#findSSSR(), built entirely
 * from in-memory molecules (TestMolBuilder) rather than loaded files.
 *
 * Extracted from unitTests/algorithm/sssrFinderTest.js, whose file-loading
 * specs remain there as part of the integration suite (npm run test:integration).
 */
describe('Test of finding SSSR in molecule (pure)', function(){
	var MB = TestMolBuilder;

	var mergeRingMembers = function(rings)
	{
		var result = {nodes: [], connectors: []};
		rings.forEach(function(ring){
			Kekule.ArrayUtils.pushUnique(result.nodes, ring.nodes);
			Kekule.ArrayUtils.pushUnique(result.connectors, ring.connectors);
		});
		return result;
	};

	it('SSSR test on internal data: SSSR atoms and bonds in Alpha Pinene', function(){
		var mol = MB.makeAlphaPinene();
		var rings = mol.findSSSR();
		var partition = mergeRingMembers(rings);
		expect(partition.nodes.length).toEqual(7);
		expect(partition.connectors.length).toEqual(8);
	});

	it('SSSR test on internal data: single ring returns one SSSR ring', function(){
		var mol = MB.makeCyclopentane();
		var rings = mol.findSSSR();
		expect(rings.length).toEqual(1);
		expect(rings[0].nodes.length).toEqual(5);
	});

	it('SSSR test on internal data: fused bicyclic azulene returns two SSSR rings', function(){
		var mol = MB.makeAzulene();
		var rings = mol.findSSSR();
		expect(rings.length).toEqual(2);
		var partition = mergeRingMembers(rings);
		expect(partition.nodes.length).toEqual(10);
	});

	it('SSSR test on internal data: acyclic alkane has no SSSR rings', function(){
		var mol = MB.makeAlkane(4);
		var rings = mol.findSSSR();
		expect(rings.length).toEqual(0);
	});
});

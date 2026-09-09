/**
 * Pure-function tests for Kekule.StructureFragment#canonicalize(): a molecule
 * canonicalized after its nodes/connectors are randomly reordered should compare
 * structurally equal (and serialize identically) to the same molecule canonicalized
 * without reordering.
 *
 * Retrofit of unitTests/algorithm/canonicalizeTest.js's assertion logic (random-order
 * round trip), applied to in-memory TestMolBuilder fixtures instead of loaded files.
 * The original file-loading version stays in place as part of the integration suite.
 */
describe('Test of canonicalization of molecule (pure)', function(){
	var MB = TestMolBuilder;

	var randomizeChildren = function(mol)
	{
		var nodes = mol.getNodes();
		var connectors = mol.getConnectors();
		mol.getCtab().setNodes(Kekule.ArrayUtils.randomize(nodes));
		mol.getCtab().setConnectors(Kekule.ArrayUtils.randomize(connectors));
		for (var i = 0, l = mol.getNodeCount(); i < l; ++i)
		{
			var node = mol.getNodeAt(i);
			if (node instanceof Kekule.StructureFragment)
				randomizeChildren(node);
		}
	};

	var testCanonicalization = function(title, molFactory)
	{
		it(title, function(){
			var mol = molFactory();
			var newMol = mol.clone(true);  // clone with id
			randomizeChildren(newMol);

			mol.canonicalize();
			newMol.canonicalize();

			var nodes = mol.getNodes();
			var newNodes = newMol.getNodes();
			var connectors = mol.getConnectors();
			var newConnectors = newMol.getConnectors();

			expect(newNodes.length).toEqual(nodes.length);
			expect(newConnectors.length).toEqual(connectors.length);

			for (var i = 0, l = nodes.length; i < l; ++i)
				expect(Kekule.ObjComparer.compareStructure(nodes[i], newNodes[i])).toEqual(0);
			for (var i = 0, l = connectors.length; i < l; ++i)
				expect(Kekule.ObjComparer.compareStructure(connectors[i], newConnectors[i])).toEqual(0);

			var formats = [Kekule.IO.DataFormat.MOL, Kekule.IO.DataFormat.KEKULE_JSON];
			formats.forEach(function(fmt){
				var molData = Kekule.IO.saveFormatData(mol, fmt);
				var newMolData = Kekule.IO.saveFormatData(newMol, fmt);
				expect(molData).toEqual(newMolData);
			});
		});
	};

	testCanonicalization('Canonicalization on internal data: Azulene (fused bicyclic)', MB.makeAzulene);
	testCanonicalization('Canonicalization on internal data: Biphenyl (two separate rings)', MB.makeBiphenyl);
	testCanonicalization('Canonicalization on internal data: Spiro rings', MB.makeSpiroRings);
	testCanonicalization('Canonicalization on internal data: Ethyl Propyl Phenantren (tricyclic)', MB.makeEthylPropylPhenantren);
});

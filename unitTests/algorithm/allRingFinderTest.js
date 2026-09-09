/**
 * Created by ginger on 2016/3/1.
 * Unit test for all ring perception.
 *
 * This test is ported from CDK.
 */

describe('Test of finding all rings in molecule', function(){
	var MB = TestMolBuilder;

	// Note: internal-data (TestMolBuilder) specs for findAllRings() were moved to
	// unitTests/algorithm/pure/ringFinder.spec.js as part of the pure-function retrofit.
	// The external-file specs below stay here as part of the integration suite.

	it('Ring test on external data: Porphyrine', function(done){
		MB.loadExternalData('mdl/porphyrin.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(20);
			done();
		});
	});

	it('Test on external data: Big ring system test', function(done){
		MB.loadExternalData('mdl/ring_03419.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(1976);
			done();
		});
	});

	it('Test on external data: Choloylcoa', function(done){
		MB.loadExternalData('mdl/choloylcoa.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(14);
			done();
		});
	});

	it('Test on external data: Azulene', function(done){
		MB.loadExternalData('mdl/azulene.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(3);
			done();
		});
	});

	it('Test on external data: Big Molecule With Isolated Rings', function(done){
		MB.loadExternalData('cml/isolated_ringsystems.cml', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			var ringSizes = [];
			rings.forEach(function(ring){
				var old = ringSizes[ring.nodes.length] || 0;
				ringSizes[ring.nodes.length] = old + 1;
			});
			expect(ringSizes[6]).toEqual(18);
			expect(ringSizes[10]).toEqual(6);
			done();
		});
	});

	it('Test on external data: Big ring system test, certain size ring count 1', function(done){
		MB.loadExternalData('mdl/ring_03419.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			var ringSizes = [0, 0, 0, 0, 0, 0, 0];
			rings.forEach(function(ring){
				var old = ringSizes[ring.nodes.length] || 0;
				ringSizes[ring.nodes.length] = old + 1;
			});
			expect(ringSizes[3] + ringSizes[4] + ringSizes[5] + ringSizes[6]).toEqual(12);
			done();
		});
	});

	it('Test on external data: molecule with subgroups - PhCOOH', function(done){
		MB.loadExternalData('json/PhCOOH.kcj', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(1);
			done();
		});
	});

	it('Test on external data: molecule with subgroups - Custom', function(done){
		MB.loadExternalData('json/DoubleRingInSubgroup.kcj', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(4);
			done();
		});
	});

	it('Test on external data: molecule with nested subgroups', function(done){
		MB.loadExternalData('json/NestedSubgroup.kcj', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			expect(rings.length).toEqual(5);
			done();
		});
	});

	// TODO: ring too large
	/*
	xit('Test on external data: Big ring system test, certain size ring count 2', function(done){
		MB.loadExternalData('mdl/four-ring-5x10.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			var ringSizes = [0, 0, 0, 0, 0, 0, 0];
			rings.forEach(function(ring){
				var old = ringSizes[ring.nodes.length] || 0;
				ringSizes[ring.nodes.length] = old + 1;
			});
			expect(ringSizes[3] + ringSizes[4]).toEqual(50);
			done();
		});
	});

	xit('Test on external data: Big ring system test, certain size ring count 3', function(done){
		MB.loadExternalData('mdl/four-ring-5x10.mol', function(mol){
			expect(mol).not.toBeNull();
			var rings = mol.findAllRings();
			var ringSizes = [0, 0, 0, 0, 0, 0, 0];
			rings.forEach(function(ring){
				var old = ringSizes[ring.nodes.length] || 0;
				ringSizes[ring.nodes.length] = old + 1;
			});
			expect(ringSizes[3] + ringSizes[4] + ringSizes[5] + ringSizes[6]).toEqual(135);
			done();
		});
	});
	*/
});
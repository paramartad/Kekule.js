/**
 * Pure-function tests for linkage/topology query methods on
 * src/core/kekule.structures.js, previously untested.
 */
describe('Test of linkage and topology query methods', function(){
	var MB = TestMolBuilder;
	var BO = Kekule.BondOrder;

	var makePropaneChain = function()
	{
		var mol = new Kekule.Molecule();
		var c1 = mol.appendAtom('C');
		var c2 = mol.appendAtom('C');
		var c3 = mol.appendAtom('C');
		var b1 = mol.appendBond([c1, c2], BO.SINGLE);
		var b2 = mol.appendBond([c2, c3], BO.DOUBLE);
		return {mol: mol, c1: c1, c2: c2, c3: c3, b1: b1, b2: b2};
	};

	describe('getLinkedChemNodes() / getLinkedBonds() / getLinkedDoubleBonds()', function(){
		it('returns the neighboring atoms of a middle chain atom', function(){
			var p = makePropaneChain();
			var neighbors = p.c2.getLinkedChemNodes();
			expect(neighbors.length).toEqual(2);
			expect(neighbors.indexOf(p.c1) >= 0).toBe(true);
			expect(neighbors.indexOf(p.c3) >= 0).toBe(true);
		});

		it('returns all bonds on a node, and only bonds of a requested type', function(){
			var p = makePropaneChain();
			expect(p.c2.getLinkedBonds().length).toEqual(2);
			expect(p.c2.getLinkedBonds(Kekule.BondType.COVALENT).length).toEqual(2);
		});

		it('returns only the double bonds on a node', function(){
			var p = makePropaneChain();
			expect(p.c1.getLinkedDoubleBonds().length).toEqual(0);
			expect(p.c2.getLinkedDoubleBonds().length).toEqual(1);
			expect(p.c2.getLinkedDoubleBonds()[0]).toBe(p.b2);
			expect(p.c3.getLinkedDoubleBonds().length).toEqual(1);
		});
	});

	describe('getConnectedObjCount() / getLinkedConnectorCount()', function(){
		it('a bond always connects exactly 2 objects', function(){
			var p = makePropaneChain();
			expect(p.b1.getConnectedObjCount()).toEqual(2);
		});

		it('a chain-end atom has 1 linked connector, a middle atom has 2', function(){
			var p = makePropaneChain();
			expect(p.c1.getLinkedConnectorCount()).toEqual(1);
			expect(p.c2.getLinkedConnectorCount()).toEqual(2);
			expect(p.c3.getLinkedConnectorCount()).toEqual(1);
		});
	});

	describe('hasNode() / hasConnector()', function(){
		it('recognizes nodes/connectors that belong to the molecule and rejects ones that do not', function(){
			var p = makePropaneChain();
			var outsideAtom = new Kekule.Atom(null, 'O');

			expect(p.mol.hasNode(p.c1)).toBe(true);
			expect(p.mol.hasNode(outsideAtom)).toBe(false);
			expect(p.mol.hasConnector(p.b1)).toBe(true);
		});
	});

	describe('isNodeInAromaticRing() / isConnectorInAromaticRing()', function(){
		var makeBenzene = function()
		{
			var mol = new Kekule.Molecule();
			var atoms = [];
			for (var i = 0; i < 6; ++i)
				atoms.push(mol.appendAtom('C'));
			var bonds = [];
			for (var i = 0; i < 6; ++i)
				bonds.push(mol.appendBond([atoms[i], atoms[(i + 1) % 6]], (i % 2 === 0) ? BO.DOUBLE : BO.SINGLE));
			mol.findAromaticRings();  // perceive & cache aromaticity before querying the flags
			return {mol: mol, atoms: atoms, bonds: bonds};
		};

		it('flags nodes/connectors of an aromatic ring as such', function(){
			var b = makeBenzene();
			expect(b.mol.isNodeInAromaticRing(b.atoms[0])).toBe(true);
			expect(b.mol.isConnectorInAromaticRing(b.bonds[0])).toBe(true);
		});

		it('does not flag nodes of a non-aromatic ring', function(){
			var mol = MB.makeCyclohexane();
			mol.findAromaticRings();
			expect(mol.isNodeInAromaticRing(mol.getNodeAt(0))).toBe(false);
		});
	});

	describe('getLeafNodes()', function(){
		// Note: despite the name, this flattens nested subgroup (Kekule.SubGroup) nodes into
		// their constituent atoms -- it is not "chain termini". Confirmed by direct testing.
		it('flattens a subgroup node into its constituent atoms, and passes through plain atoms unchanged', function(){
			var mol = new Kekule.Molecule();
			var c1 = mol.appendAtom('C');
			var sub = new Kekule.SubGroup(null, 'Et');
			var sc1 = sub.appendAtom('C');
			var sc2 = sub.appendAtom('C');
			sub.appendBond([sc1, sc2], BO.SINGLE);
			mol.appendNode(sub);
			mol.appendBond([c1, sub], BO.SINGLE);

			var leafs = mol.getLeafNodes();
			expect(leafs.length).toEqual(3);
			expect(leafs.every(function(n){ return n instanceof Kekule.Atom; })).toBe(true);
			expect(leafs.indexOf(c1) >= 0).toBe(true);
			expect(leafs.indexOf(sc1) >= 0).toBe(true);
			expect(leafs.indexOf(sc2) >= 0).toBe(true);
			expect(leafs.indexOf(sub) >= 0).toBe(false);
		});

		it('returns every atom unchanged for a molecule with no subgroups', function(){
			var p = makePropaneChain();
			var leafs = p.mol.getLeafNodes();
			expect(leafs.length).toEqual(3);
		});
	});
});

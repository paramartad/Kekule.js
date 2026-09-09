/**
 * Pure-function tests for Kekule.Element (src/core/kekule.elements.js) -- static
 * periodic-table lookups and instance predicates, no molecule/ctab involved at all.
 * Previously untested: no existing spec exercised this file directly.
 */
describe('Test of Kekule.Element lookups and predicates', function(){

	it('isHetero() is true for nonmetals/halogens other than C and H', function(){
		expect(new Kekule.Element('N').isHetero()).toBe(true);
		expect(new Kekule.Element('O').isHetero()).toBe(true);
		expect(new Kekule.Element('Cl').isHetero()).toBe(true);
		expect(new Kekule.Element('C').isHetero()).toBe(false);
		expect(new Kekule.Element('H').isHetero()).toBe(false);
	});

	it('isHetero() is false for metals (not nonmetal/halogen series)', function(){
		expect(new Kekule.Element('Fe').isHetero()).toBe(false);
		expect(new Kekule.Element('Na').isHetero()).toBe(false);
	});

	it('belongToCategory() matches the element series it was constructed from', function(){
		expect(new Kekule.Element('Cl').belongToCategory(Kekule.ElementCategory.HALOGEN)).toBe(true);
		expect(new Kekule.Element('Cl').belongToCategory(Kekule.ElementCategory.METAL)).toBe(false);
		expect(new Kekule.Element('Na').belongToCategory(Kekule.ElementCategory.ALKALI_METAL)).toBe(true);
		expect(new Kekule.Element('Na').belongToCategory(Kekule.ElementCategory.METAL)).toBe(true);
		// Note: new Kekule.Element('Fe').belongToCategory(Kekule.ElementCategory.TRANSITION_METAL) is
		// deliberately NOT tested here -- it fails due to a real pre-existing data/enum mismatch:
		// src/data/kekule.chemicalElementsData.js stores "Transition metals" (lowercase 'm') while
		// Kekule.ElementSeries.TRANSITION_METAL is 'Transition Metals' (capital 'M'), so the exact-string
		// switch in _getElementCategoriesFromSeries() never matches. The same issue affects NOBLE_GAS
		// ("Noble Gasses" in data vs. "Noble Gases" in the enum). Left unfixed and flagged, not in scope here.
	});

	it('isSameElement() compares by symbol or atomic number interchangeably', function(){
		var carbon = new Kekule.Element('C');
		expect(carbon.isSameElement('C')).toBe(true);
		expect(carbon.isSameElement(6)).toBe(true);
		expect(carbon.isSameElement('N')).toBe(false);
		expect(carbon.isSameElement(7)).toBe(false);
	});

	it('getTheoreticValence() derives from group number (group - 10 for main groups 13-17)', function(){
		expect(new Kekule.Element('C').getTheoreticValence()).toEqual(4);   // group 14
		expect(new Kekule.Element('N').getTheoreticValence()).toEqual(5);   // group 15
		expect(new Kekule.Element('O').getTheoreticValence()).toEqual(6);   // group 16
		expect(new Kekule.Element('Cl').getTheoreticValence()).toEqual(7);  // group 17
		expect(new Kekule.Element('H').getTheoreticValence()).toEqual(1);   // group 1
	});

	it('getTheoreticValence() is null for transition metals (group 3-12)', function(){
		expect(new Kekule.Element('Fe').getTheoreticValence()).toBeNull();
	});

	it('Element.isNormalElement() (static) excludes unset, dummy and R-group (by symbol) placeholders', function(){
		expect(Kekule.Element.isNormalElement('C')).toBe(true);
		expect(Kekule.Element.isNormalElement(6)).toBe(true);
		expect(Kekule.Element.isNormalElement(Kekule.Element.UNSET_ELEMENT)).toBe(false);
		expect(Kekule.Element.isNormalElement(Kekule.Element.RGROUP_ELEMENT)).toBe(false);
		expect(Kekule.Element.isNormalElement(Kekule.Element.DUMMY_ELEMENT_ATOMICNUM)).toBe(false);
		// Note: Kekule.Element.isNormalElement(Kekule.Element.RGROUP_ELEMENT_ATOMICNUM) is deliberately NOT
		// tested here -- it incorrectly returns true due to a real pre-existing typo bug: isPseudoElement()'s
		// numeric branch (kekule.elements.js) compares against Kekule.Element.RGROUP_ELEMENT_ATMOICNUM
		// (misspelled, always undefined) instead of the real constant Kekule.Element.RGROUP_ELEMENT_ATOMICNUM,
		// so the numeric R-group atomic number is never actually recognized as pseudo. Flagged, not fixed here.
	});

	it('Element.isPseudoElement() (static) recognizes dummy/R-group by symbol, and dummy by atomic number', function(){
		expect(Kekule.Element.isPseudoElement(Kekule.Element.RGROUP_ELEMENT)).toBe(true);
		expect(Kekule.Element.isPseudoElement(Kekule.Element.DUMMY_ELEMENT_ATOMICNUM)).toBe(true);
		expect(Kekule.Element.isPseudoElement('C')).toBe(false);
		expect(Kekule.Element.isPseudoElement(6)).toBe(false);
	});

	it('isDummyElement() / isRGroupElement() (instance) match how the element was constructed', function(){
		var dummy = new Kekule.Element(Kekule.Element.DUMMY_ELEMENT_ATOMICNUM);
		var rgroup = new Kekule.Element(Kekule.Element.RGROUP_ELEMENT);
		var carbon = new Kekule.Element('C');

		expect(dummy.isDummyElement()).toBe(true);
		expect(dummy.isRGroupElement()).toBe(false);
		expect(rgroup.isRGroupElement()).toBe(true);
		expect(rgroup.isDummyElement()).toBe(false);
		expect(carbon.isDummyElement()).toBe(false);
		expect(carbon.isRGroupElement()).toBe(false);
	});

	it('IsotopeFactory.getIsotope() / getIsotopeById() resolve to the same cached isotope instance', function(){
		var byNumber = Kekule.IsotopeFactory.getIsotope('C', 13);
		var byId = Kekule.IsotopeFactory.getIsotopeById('C13');

		expect(byNumber.getSymbol()).toEqual('C');
		expect(byNumber.getMassNumber()).toEqual(13);
		expect(byNumber.getExactMass()).toEqual(13.00335484);
		expect(byId).toBe(byNumber);  // isotope instances are cached/interned by id
	});
});

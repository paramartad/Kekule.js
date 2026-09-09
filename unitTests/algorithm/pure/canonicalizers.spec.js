/**
 * Pure-function tests for Kekule.canonicalizer's executor registry
 * (src/algorithm/kekule.structures.canonicalizers.js), previously untested.
 * The internal graph-math executor implementations are already exercised
 * indirectly through the canonicalize() round-trip tests in canonicalize.spec.js.
 */
describe('Test of Kekule.canonicalizer executor registry', function(){
	it('resolves the pre-registered default "morgan" executor', function(){
		expect(Kekule.canonicalizer.getExecutor('morgan')).toBeTruthy();
	});

	it('returns undefined for an unregistered executor id', function(){
		expect(Kekule.canonicalizer.getExecutor('no-such-executor')).toBeUndefined();
	});

	it('returns null when no id is given', function(){
		expect(Kekule.canonicalizer.getExecutor()).toBeNull();
	});
});

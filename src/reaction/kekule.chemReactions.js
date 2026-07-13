/**
 * @fileoverview
 * This file contains basic classes about chemical reactions.
 * @author Partridge Jiang
 */

/*
 * requires /lan/classes.js
 * requires /core/kekule.common.js
 * requires /core/kekule.structures.js
 */

/**
 * Enumeration of type of molecules or conditions in reaction.
 * @class
 */
Kekule.ChemReactionComponent = {
    REACTANT: 'reactant',
    PRODUCT: 'product',
    CATALYST: 'catalyst',
    SOLVENT: 'solvent',
    REAGENT: 'reagent',
};

/**
 * Enumeration of reaction direction.
 */
Kekule.ChemReactionDirection = {
    /** Reaction equilibrium which is (almost) fully on the product side. Often denoted with a forward arrow. */
    FORWARD: 1,
    /** Reaction equilibrium state. Often denoted by a double arrow. */
    BIDIRECTION: 0,

    /** Actually not a real reaction, just mark two resonances. */
    RESONANCE: 99
};

/**
 * Enumeration of reaction condition component.
 * @enum
 */
Kekule.ReactionConditionComponent = {
    TEMPERATURE: 'temperature',
    PRESSURE: 'pressure',
    WAVELENGTH: 'wavelength',
    TIME: 'time',
    VOLUME: 'volume',
    UNKNOWN: 'unknown'
    // OTHER: 'other'
}

/**
 * Enumeration of reaction qualitative conditions.
 * @enum
 */
Kekule.ReactionQualitativeCondition = {
    HEAT: 'heat',
    HIGH_TEMP: 'hitemp',
    LOW_TEMP: 'lowtemp',
    PRESSURE: 'pressure',
    LIGHT: 'light',
    MICROWAVE: 'microwave'
};

/**
 * Represent an omitted intermediate product of two continuous reactions.
 * E.g. CH3COOEt (NaOEt) -> * -> (H+) CH3COCH2COOEt, where the salt of ethyl acetoacetate is omitted in the reaction.
 * @type {Class}
 */
Kekule.ImplicitReactionIntermediate = Class.create(Kekule.Molecule,
/** @lends Kekule.ImplicitReactionIntermediate# */
{
	/** @private */
	CLASS_NAME: 'Kekule.ImplicitReactionIntermediate',
	/** @private */
	initialize: function(id)
	{
		this.tryApplySuper('initialize', [id, '*']);
	},
    /** @private */
    getAutoIdPrefix: function()
    {
        return 'im';
    }
});

/**
 * A chemical reaction. Including information on reactants, products, reagents and conditions.
 * @class
 * @augments Kekule.ChemObject
 *
 * @property {String} name Name of reaction.
 * @property {String} title Title of reaction.
 * @property {String} reactionType Type of reaction.
 * @property {Float} yield Yield of reaction. 0 <= Value <= 1.
 * @property {Kekule.Molecule[]} reactants Reactants of reaction.
 * @property {Kekule.Molecule[]} products Products of reaction.
 * @property {Kekule.Molecule[]} catalysts Catalysts of reaction.
 * @property {Kekule.Molecule[]} reagents Other reagents (e.g. solvent) of reaction.
 * @property {Kekule.Molecule[]} inputs Inputted molecules in reaction, including reactants, reagents, catalysts and solvents.
 * @property {Kekule.Molecule[]} outputs Outputted molecules in reaction, alias of products.
 *
 */
Kekule.ChemReaction = Class.create(Kekule.ChemObject,
/** @lends Kekule.ChemReaction# */
{
	/** @private */
	CLASS_NAME: 'Kekule.ChemReaction',
	/** @private */
	initialize: function(id)
	{
		this.tryApplySuper('initialize', [id]);
        this._initSubstanceListsManipulationMethods();
	},
    doFinalize: function(/*$super*/)
    {
        var lists = this._getAllSubstanceLists();
        for (var i = 0, l = lists.length; i < l; ++i)
        {
            var list = lists[i];
            if (list)
                list.finalize();
        }
        this.tryApplySuper('doFinalize');
    },
    /** @private */
    initProperties: function()
    {
        this.defineProp('name', {'dataType': DataType.STRING});
        this.defineProp('title', {'dataType': DataType.STRING});
        this.defineProp('reactionType', {'dataType': DataType.STRING});
        this.defineProp('yield', {'dataType': DataType.FLOAT});
        this.defineProp('direction', {
            'dataType': DataType.INT, 'defaultValue': Kekule.ChemReactionDirection.FORWARD,
            'enumSource': Kekule.ChemReactionDirection
        });

        this.defineProp('reactants', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
			'getter': function()
				{
					return this.getSubstancesOfType(Kekule.ChemReactionComponent.REACTANT);
				}
        });
        this.defineProp('products', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
                {
                    return this.getSubstancesOfType(Kekule.ChemReactionComponent.PRODUCT);
                }
        });
        this.defineProp('catalysts', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
                {
                    return this.getSubstancesOfType(Kekule.ChemReactionComponent.CATALYST);
                }
        });
        this.defineProp('solvents', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
                {
                    return this.getSubstancesOfType(Kekule.ChemReactionComponent.SOLVENT);
                }
        });
        this.defineProp('reagents', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
                {
                    return this.getSubstancesOfType(Kekule.ChemReactionComponent.REAGENT);
                }
        });

        this.defineProp('outputs', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
                {
                    return this.getProducts();
                }
        });
        this.defineProp('inputs', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
                {
                    var result = [].concat(this.getReactants() || []).concat(this.getReagents() || []).concat(this.getCatalysts() || []).concat(this.getSolvents() || []);
                    return result;
                }
        });

        // assoc objects (e.g., condition symbol in chem doc)
        this.defineProp('assocObjects', {
            'dataType': DataType.ARRAY,
            'scope': Class.PropertyScope.PRIVATE,
            'setter': null,
            'getter': function(canCreate)
            {
                var r = this.getPropStoreFieldValue('assocObjects');
                if (!r && canCreate)
                {
                    r = [];
                    this.setPropStoreFieldValue('assocObjects', r);
                }
                return r;
            }
        });

        // reaction related molecules, including reactants, products, catalysts and so on
        this.defineProp('substances', {
            'dataType': DataType.HASH,
            'scope': Class.PropertyScope.PRIVATE,
            'setter': null,
            'getter': function(canCreate)
                {
                    var r = this.getPropStoreFieldValue('substances');
                    if (!r && canCreate)
                    {
                        r = {};
                        this.setPropStoreFieldValue('substances', r);
                    }
                    return r;
                }
        });
        // conditions map of reaction
        this.defineProp('conditions', {
            'dataType': DataType.HASH,
            'setter': null,
            'getter': function(canCreate)
            {
                var r = this.getPropStoreFieldValue('conditions');
                if (!r && canCreate)
                {
                    r = {};
                    this.setPropStoreFieldValue('conditions', r);
                }
                return r;
            }
        });
    },
    /** @ignore */
    initPropValues: function()
    {
        this.tryApplySuper('initPropValues');
        this.setPropStoreFieldValue('direction', Kekule.ChemReactionDirection.FORWARD);
    },

    /** @ignore */
    ownerChanged: function(newOwner, oldOwner)
    {
        var lists = this._getAllSubstanceLists();
        for (var i = 0, l = lists.length; i < l; ++i)
            lists[i].setOwner(newOwner);
        this.tryApplySuper('ownerChanged', [newOwner, oldOwner]);
    },

    /** @private */
    _initSubstanceListsManipulationMethods()
    {
        var names = this.getDefaultSubstanceGroupNames();
        for (var i = 0, l = names.length; i < l; ++i)
        {
            var name = names[i];
            var nameUpper = name.upperFirst();
            this['get' + nameUpper + 'Count'] = this.getSubstanceCount.bind(this, name);
            this['get' + nameUpper + 'At'] = this.getSubstanceAt.bind(this, name);
            this['indexOf' + nameUpper] = this.indexOfSubstance.bind(this, name);
            this['remove' + nameUpper] = this.removeSubstance.bind(this, name);
            this['remove' + nameUpper + 'At'] = this.removeSubstanceAt.bind(this, name);
            this['append' + nameUpper] = this.appendSubstance.bind(this, name);
            this['insert' + nameUpper + 'Before'] = this.insertSubstanceBefore.bind(this, name);
            this['insert' + nameUpper + 'At'] = this.insertSubstanceAt.bind(this, name);
        }
    },
    /** @private */
    _getAllSubstanceLists: function()
    {
        var result = [];
        var names = this.getChildSubgroupNames();
        for (var i = 0, l = names.length; i < l; ++i) {
            var list = this._doGetSubstanceListOfType(names[i], false);
            if (list)
                result.push(list);
        }
        return result;
    },

    /** @ignore */
    getDefaultSubstanceGroupNames: function()
    {
        var CC = Kekule.ChemReactionComponent;
        return [CC.REACTANT, CC.PRODUCT, CC.CATALYST, CC.SOLVENT, CC.REAGENT];
    },
    /** @ignore */
    getChildSubgroupNames: function()
    {
        /*
        var result = this.__$childSubgroupNames$__;
        var compKeys = Object.getOwnPropertyNames(Kekule.ChemReactionComponent);
        for (var i = 0, l = compKeys.length; i < l; ++i)
        {
            result.push(Kekule.ChemReactionComponent[compKeys[i]]);
        }
        return result;
        */
        // return ['reactant', 'product', 'catalyst', 'solvent', 'reagent'];
        return Object.getOwnPropertyNames(this.getSubstances() || {});
    },
    /** @ignore */
    getBelongChildSubGroupName: function(obj)
    {
        // default insert child to the reactant group
        return Kekule.ChemReactionComponent.REACTANT;
    },

    /** @private */
    assertAddingMolecule: function(obj)
    {
        if (!(obj instanceof Kekule.Molecule))
        {
            Kekule.chemError(Kekule.$L('ErrorMsg.UNABLE_ADD_NONMOLECULE_AS_REACTION_SUBSTANCE'));
        }
    },

    /**
     * Notify the substances property has been changed.
     * @private
     */
    notifySubstanceChanged: function(substanceType)
    {
        this.notifyPropSet('substances', this.getPropStoreFieldValue('substances'));
        var propName = Kekule.ChemReactionComponent[substanceType] + 's';
        this.notifyPropSet(propName, this.getSubstancesOfType(substanceType));
    },

    /** @private */
    _doSetSubstanceParentAndOwner: function(molecule, parent, owner)
    {
        molecule.setParent(parent);
        molecule.setOwner(owner);
    },

    /** @private */
    _doGetSubstanceListOfType: function(substanceType, canCreate) {
        var substances = this.getSubstances(canCreate);
        var result = substances && substances[substanceType];
        if (!result && canCreate)
        {
            result = new Kekule.ChemObjList(null, Kekule.Molecule, true);
            result.setParent(this);
            result.addEventListener('change', function()
            {
                this.objectChange(['substances', substanceType + 's']);
                this.notifySubstanceChanged(substanceType);
            }, this);
            substances[substanceType] = result;
        }
        return result;
    },
    /**
     * Returns substances of specified type.
     * @param {String} substanceType
     * @returns {Kekule.ChemObjList}
     */
    getSubstanceListOfType: function(substanceType)
    {
        return this._doGetSubstanceListOfType(substanceType, false);
    },
    /**
     * Returns substances list of specified type.
     * @param {String} substanceType
     * @returns {Kekule.Molecule[]}
     */
    getSubstancesOfType: function(substanceType)
    {
        var list = this._doGetSubstanceListOfType(substanceType, false);
        return list? list.getItems(): [];
    },

    /**
     * Returns all substance types in this reaction.
     * @returns {String[]}
     */
    getSubstanceTypes: function()
    {
        var substances = this.getSubstances(false);
        return substances? Object.getOwnPropertyNames(substances): [];
    },

    /**
     * Returns count of substances of specified type.
     * If substanceType is not set, substance countof all types will be returned.
     * @param {String} substanceType
     * @returns {Int}
     */
    getSubstanceCount: function(substanceType) {
        var types = (!substanceType)? this.getSubstanceTypes(): [substanceType];
        var result = 0;
        for (var i = 0, l = types.length; i < l; ++i)
        {
            var subType = types[i];
            var substances = this.getSubstanceListOfType(subType);
            result += substances? substances.getItemCount(): 0;
        }
        return result;
    },

    indexOfSubstance(substanceType, molecule)
    {
        var substances = this.getSubstanceListOfType(substanceType);
        if(substances)
        {
            return substances.indexOf(molecule);
        }
        else
            return -1;
    },
    getSubstanceAt(substanceType, index)
    {
        var substances = this.getSubstanceListOfType(substanceType);
        if(substances)
        {
            return substances.getItemAt(index);
        }
        else
            return null;
    },
    /**
     * Append a molecule to the substance list of reaction.
     * @param {String} substanceType
     * @param {Kekule.Molecule} molecule
     */
    appendSubstance(substanceType, molecule)
    {
        this.assertAddingMolecule(molecule);
        var substances = this._doGetSubstanceListOfType(substanceType, true);
        substances.append(molecule);
        return this;
    },
    /**
     * Insert a molecule to the substance list at index.
     * @param {String} substanceType
     * @param {Kekule.Molecule} molecule
     * @param {Int} index
     */
    insertSubstanceAt(substanceType, molecule, index)
    {
        this.assertAddingMolecule(molecule);
        var substances = this._doGetSubstanceListOfType(substanceType, true);
        substances.insertItemAt(molecule, index);
        return this;
    },
    /**
     * Insert a molecule before refMolecule in the substance list.
     * @param {String} substanceType
     * @param {Kekule.Molecule} molecule
     * @param {Kekule.Molecule} refMolecule
     */
    insertSubstanceBefore(substanceType, molecule, refMolecule)
    {
        this.assertAddingMolecule(molecule);
        var substances = this._doGetSubstanceListOfType(substanceType, true);
        substances.insertItemBefore(molecule, refMolecule);
        return this;
    },
    /**
     * Remove a molecule from the substance list at index.
     * @param {String} substanceType
     * @param {int} index
     */
    removeSubstanceAt(substanceType, index)
    {
        var substances = this.getSubstanceListOfType(substanceType);
        if (substances)
        {
            substances.removeAt(index);
        }
        return this;
    },
    /**
     * Remove a molecule from the substance list.
     * @param {String} substanceType
     * @param {Kekule.Molecule} molecule
     */
    removeSubstance(substanceType, molecule)
    {
        var substances = this.getSubstanceListOfType(substanceType);
        if (substances)
        {
            substances.remove(molecule);
        }
        return this;
    },

    /**
     * Returns the explicitly set condition components of reaction.
     * @returns {Array}
     */
    getConditionComponents: function()
    {
        var conditions = this.getConditions(false);
        return Kekule.ObjUtils.getOwnedFieldNames(conditions);
    },
    /**
     * Get the value of a condition.
     * @param {String} name Condition name.
     * @returns {Variant} Usually a {Kekule.Scalar}, but other objects are also allowed.
     */
    getCondition: function(name)
    {
        var conditions = this.getConditions(false);
        return conditions && conditions[name];
    },
    /**
     * Set the value of a condition.
     * @param {String} name Condition name.
     * @param {Variant} value Usually a {Kekule.Scalar}, but other objects are also allowed.
     */
    setCondition: function(name, value)
    {
        var conditions = this.getConditions(true);
        conditions[name] = value;
        return this;
    },
    /**
     * Unset a condition.
     * @param {String} name Condition name.
     */
    unsetCondition: function(name)
    {
        var conditions = this.getConditions(false);
        if (conditions && conditions[name])
            delete conditions[name];
        return this;
    },
    /**
     * Clear all conditions of reaction.
     */
    clearConditions: function()
    {
        this.setPropStoreFieldValue('conditions', null);
        return this;
    },
    setQualitativeCondition: function(qualitiveCondition)
    {
        var QC = Kekule.ReactionQualitativeCondition;
        var CC = Kekule.ReactionConditionComponent;
        if (qualitiveCondition === QC.HEAT || qualitiveCondition === QC.LOW_TEMP || qualitiveCondition === QC.HIGH_TEMP)
            this.setCondition(CC.TEMPERATURE, qualitiveCondition);
        else if (qualitiveCondition === QC.PRESSURE)
            this.setCondition(CC.PRESSURE, qualitiveCondition);
        else if (qualitiveCondition === QC.LIGHT || qualitiveCondition === QC.MICROWAVE)
            this.setCondition(CC.WAVELENGTH, qualitiveCondition);
        else
            this.setCondition(CC.UNKNOWN, qualitiveCondition);
        return this;
    },

    /** @private */
    appendAssocObject: function(obj) {
        this.getAssocObjects(true).push(obj);
        return this;
    },
    /** @private */
    removeAssocObject: function(obj) {
        Kekule.ArrayUtils.remove(this.getAssocObjects(false) || [], obj, true);
    },
    /** @private */
    clearAssocObjects: function() {
        this.setPropStoreFieldValue( 'assocObjects', null);
    },

    /**
     * Clear all structure stereo features (e.g., bond wedge, node zIndex2D) of all molecules in reaction.
     */
    clearStereo: function()
    {
        this.beginUpdate();
        try
        {
            for (var i = 0, l = this.getChildCount(); i < l; ++i)
            {
                var obj = this.getChildAt(i);
                if (obj && obj.clearStereo)
                    obj.clearStereo();
            }
        }
        finally
        {
            this.endUpdate();
        }
    },

    // /**
    //  * Returns the index of a condition object in condition list of reaction.
    //  * @param {Kekule.Scalar} condition
    //  */
    // indexOfCondition: function(condition)
    // {
    //     var conditions = this.getPropStoreFieldValue('conditions');
    //     if (!conditions)
    //         return -1;
    //     else
    //         return conditions.indexOf(condition);
    // },
    // /**
    //  * Append a condition to condition list of reaction.
    //  * @param {Kekule.Scalar} condition
    //  */
    // appendCondition: function(condition)
    // {
    //     this.getConditions().push(condition);
    //     return this;
    // },
    // /**
    //  * Insert a condition to condition list of reaction.
    //  * @param {Kekule.Scalar} condition
    //  * @param {Int} index
    //  */
    // insertConditionAt: function(condition, index)
    // {
    //     this.getConditions().splice(index, 0, condition);
    //     return this;
    // },
    // /**
    //  * Insert a condition to condition list of reaction.
    //  * @param {Kekule.Scalar} condition
    //  * @param {Kekule.Scalar} refCondition
    //  */
    // insertConditionBefore: function(condition, refCondition)
    // {
    //     if (!refCondition)
    //         return this.appendCondition(condition);
    //     else
    //     {
    //         var refIndex = this.indexOfCondition(refCondition);
    //         return (refIndex >= 0)? this.insertConditionAt(condition, refIndex): this.appendCondition(condition);
    //     }
    // },
    // /**
    //  * Remove a condition at the index of condition list.
    //  * @param {Int} index
    //  */
    // removeConditionAt: function(index)
    // {
    //     var conditions = this.getPropStoreFieldValue('conditions');
    //     if (conditions)
    //     {
    //         conditions.splice(index, 1);
    //     }
    //     return this;
    // },
    // /**
    //  * Remove a condition from condition list.
    //  * @param {Kekule.Scalar} condition
    //  */
    // removeCondition: function(condition)
    // {
    //     var index = this.indexOfCondition(condition);
    //     if (index >= 0)
    //         this.removeConditionAt(index);
    //     return this;
    // },

    // method for comparing two reaction
    /** @private */
    _getComparisonOptionFlagValue: function(options, flagName)
    {
        var compatibleName = 'compare' + flagName.capitalizeFirst();
        var result = options[compatibleName];
        if (Kekule.ObjUtils.isUnset(result))
            result = options[flagName];
        return result;
    },
    /** @private */
    _compareChildArrayItems: function(arr1, arr2, options)  // compare substance array regardless of order
    {
        var result = arr1.length - arr2.length;
        if (!result)
        {
            var a1 = Kekule.ArrayUtils.clone(arr1);
            var a2 = Kekule.ArrayUtils.clone(arr2);
            var self = this;
            // sort these two arrays, then begin the comparison
            a1.sort(function (item1, item2) {
                return Kekule.ObjComparer.compare(item1, item2, options);
            });
            a2.sort(function (item1, item2) {
                return Kekule.ObjComparer.compare(item1, item2, options);
            });
            result = Kekule.ObjComparer.compare(a1, a2, options);
            // console.log('compare', a1, a2, result);
        }
        return result;
    },
    /** @ignore */
    doGetActualCompareOptions: function(options)
    {
        var result = this.tryApplySuper('doGetActualCompareOptions', [options]);
        /*
        // by default we will compare substances
        result = Object.extend({
            'compareSubstances': true
        }, result);
        */
        return result;
    },
    /** @ignore */
    doGetComparisonPropNames: function(options)
    {
        var result = this.tryApplySuper('doGetComparisonPropNames', [options]) || [];
        if (this._getComparisonOptionFlagValue(options, 'direction'))
            result.push('direction');
        if (this._getComparisonOptionFlagValue(options, 'yield'))
            result.push('yield');
        return result;
    },
    /** @ignore */
    doCompare: function(targetObj, options)
    {
        var result = this.tryApplySuper('doCompare', [targetObj, options]);
        // compare substances and conditions
        if (!result && this._getComparisonOptionFlagValue(options, 'conditions'))
            result = this._compareChildArrayItems(this.getConditions(), targetObj.getConditions(), options);
        if (!result)
        {
            if (this._getComparisonOptionFlagValue(options, 'inputsOutputs'))
                result = this._compareChildArrayItems(this.getInputs(), targetObj.getInputs(), options)
                    || this._compareChildArrayItems(this.getOutputs(), targetObj.getOutputs(), options);
            else if (this._getComparisonOptionFlagValue(options, 'substances') !== false)
            {
                var substanceNames = this.getDefaultSubstanceGroupNames();
                for (var i = 0, l = substanceNames.length; i < l; ++i)
                {
                    var name = substanceNames[i];
                    var doCompare = Kekule.oneOf(this._getComparisonOptionFlagValue(options, name), this._getComparisonOptionFlagValue(options, name + 's'));
                    if (doCompare !== false)
                        // result = Kekule.ObjComparer._compareValue(this.getSubstancesOfType(name), targetObj.getSubstancesOfType(name), options);
                        result = this._compareChildArrayItems(this.getSubstancesOfType(name), targetObj.getSubstancesOfType(name), options);
                    if (!!result)
                        break;
                }
            }
        }
        return result;
    },

    /**
     * Explicit set compare method to chem structure and compare to target reaction.
     * @param {Kekule.ChemObject} targetObj
     * @param {Hash} options
     * @returns {Int}
     */
    compareStructure: function(targetObj, options)
    {
        var ops = Object.create(options || {});
        ops.method = Kekule.ComparisonMethod.CHEM_STRUCTURE;
        return this.compare(targetObj, ops);
    },
    /**
     * Check if this reaction and target reaction are same with chem structure.
     * @param {Kekule.ChemObject} targetObj
     * @param {Hash} options
     * @returns {Bool}
     */
    equalStructure: function(targetObj, options)
    {
        return this.compareStructure(targetObj, options) === 0;
    },
});

/**
 * A reaction step inside a {@link Kekule.ConsecutiveReactions}.
 * The multistep reaction may in form A + B -> C -> D,
 * where the reactant of second embedded reaction is actually the product of the first step reaction.
 * Thus, the reactant of embeddedReaction is consisted of two parts: the explicit reactant in substances list of this object,
 * and the implicit reactant, actually the product of the previous step reaction.
 * @class
 * @augments Kekule.ChemObject
 *
 * @property {Kekule.Molecule[]} implicitReactants The implicit reactants of this reaction, usually the product of previous step reaction.
 */
Kekule.EmbeddedReaction = Class.create(Kekule.ChemReaction,
/** @lends Kekule.EmbeddedReaction# */
{
    /** @private */
    CLASS_NAME: 'Kekule.EmbeddedReaction',
    /** @private */
    initialize: function(id)
    {
        this.tryApplySuper('initialize', [id]);
        this._initSubstanceListsManipulationMethods();
    },
    /** @private */
    initProperties: function()
    {
        this.defineProp('implicitReactants', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
			'getter': function()
				{
                    var prev = this.getPrevSibling();
					return (prev && prev.getProducts && prev.getProducts()) || [];
				}
        });
        this.defineProp('explicitReactants', {
            'dataType': DataType.ARRAY,
            'serializable': false,
            'setter': null,
            'getter': function()
            {
                return this.getSubstancesOfType('explicitReactant');
            }
        });
    },

    /** @ignore */
    getDefaultSubstanceGroupNames: function()
    {
        // replace the 'reactant' subgroup to 'explicitReactant'
        var result = this.tryApplySuper('getDefaultSubstanceGroupNames');
        var reactantIndex = result.indexOf(Kekule.ChemReactionComponent.REACTANT);
        if (reactantIndex >= 0)
            result.splice(reactantIndex, 1, 'explicitReactant');
        return result;
    },
    /** @ignore */
    doGetReactants()
    {
        var result = [];
        result = result.concat(this.getImplicitReactants());
        result = result.concat(this.getExplicitReactants());
        return result;
    },

    getReactantCount()
    {
        return this.getImplicitReactantCount() + this.getExplicitReactantCount();
    },
    getReactantAt(index)
    {
        var implicitCount = this.getImplicitReactantCount();
        if (index < implicitCount)
            return this.getImplicitReactantAt(index);
        else
            return this.getExplicitReactantAt(index - implicitCount);
    },
    indexOfReactant: function(molecule) {
        var result = this.indexOfImplicitReactant(molecule);
        if (result < 0) {
            result = this.indexOfExplicitReactant(molecule);
            if (result >= 0)
                result = result + this.getImplicitReactantCount();
        }
        return result;
    },
    removeReactant: function(molecule) {
        var implicitCount = this.getImplicitReactantCount();
        var index = this.indexOfReactant(molecule);
        if (index >= 0)
            return this.removeReactantAt(index);
        else
            return this;
    },
    removeReactantAt: function(index)
    {
        var implicitCount = this.getImplicitReactantCount();
        if (index < implicitCount)
            Kekule.chemError(Kekule.$L('ErrorMsg.UNABLE_TO_REMOVE_IMPLICIT_REACTANT'));
        else
            this.removeExplicitReactantAt(index - implicitCount);
        return this;
    },
    appendReactant(molecule)
    {
        return this.appendExplicitReactant(molecule);
    },
    insertReactantAt(molecule, index)
    {
        var implicitCount = this.getImplicitReactantCount();
        if (index < implicitCount)
            Kekule.chemError(Kekule.$L('ErrorMsg.UNABLE_TO_INSERT_IMPLICIT_REACTANT'));
        else
            return this.insertExplicitReactantAt(molecule, index - implicitCount);
    },
    insertReactantBefore(molecule, refMolecule)
    {
        var refIndex = this.indexOfReactant(refMolecule);
        if (refIndex >= 0)
            return this.insertReactantAt(molecule, refIndex);
        else
            return this.appendReactant(molecule);
    },

    /**
     * Return the count of implicit reactants.
     * @returns {Int}
     */
    getImplicitReactantCount()
    {
        var prev = this.getPrevSibling();
        return (prev && prev.getProductCount && prev.getProductCount()) || 0;
    },
    /**
     * Get the implicit product at index.
     * @param {Int} index
     * @returns {Kekule.Molecule}
     */
    getImplicitReactantAt(index)
    {
        var prev = this.getPrevSibling();
        return prev && prev.getProductAt && prev.getProductAt(index);
    },
    /**
     * Returns the index of molecule in the implicit reactant list.
     * @param {Kekule.Molecule} molecule
     * @returns {Int}
     */
    indexOfImplicitReactant(molecule)
    {
        var prev = this.getPrevSibling();
        return (prev && prev.indexOfProduct && prev.indexOfProduct(molecule)) || -1;
    },

    /** @ignore */
    doGetActualCompareOptions: function(options)
    {
        var result = this.tryApplySuper('doGetActualCompareOptions', [options]);
        result = Object.extend({
            'compareExplicitReactants': true
        }, result);
        return result;
    },
});

/**
 * A multistep chemical reaction, composited of a series of {@link Kekule.EmbeddedReaction}.
 * The multistep reaction may in form A + B -> C -> D,
 * where the reactant of second embedded reaction is actually the product of the first step reaction.
 * @class
 * @augments Kekule.ChemObject
 *
 * @property {String} name Name of reaction.
 * @property {String} title Title of reaction.
 * @property {Kekule.EmbeddedReaction[]} reactions Child embedded reactions.
 */
Kekule.ConsecutiveReactions = Class.create(Kekule.ChemObject,
/** @lends Kekule.ConsecutiveReactions# */
{
	/** @private */
	CLASS_NAME: 'Kekule.ConsecutiveReactions',
	/** @private */
	initialize: function(id)
	{
		this.tryApplySuper('initialize', [id]);
	},
    doFinalize()
    {
        this.getEmbeddedReactions().finalize();
        this.tryApplySuper('finalize');
    },
    /** @private */
    initProperties: function()
    {
        this.defineProp('name', {'dataType': DataType.STRING});
        this.defineProp('title', {'dataType': DataType.STRING});
        this.defineProp('reactions', {'dataType': DataType.ARRAY, 'setter': null, 'serializable': false,
            'getter': function(){
                return this.getEmbeddedReactions().getItems();
            }
        });
        this.defineProp('embeddedReactions', {'dataType': 'Kekule.ChemObjList', 'setter': null, 'scope': Class.PropertyScope.PRIVATE});
    },
    initPropValues: function()
    {
        this.tryApplySuper('initPropValues');
        var list = new Kekule.ChemObjList(null, Kekule.EmbeddedReaction, true);
        list.setParent(this);
        list.addEventListener('change', function()
        {
            this.objectChange(['embeddedReactions']);
        }, this);
        this.setPropStoreFieldValue('embeddedReactions', list);
    },

    /** @ignore */
    ownerChanged: function(newOwner, oldOwner)
    {
        // change owners of children
        this.getEmbeddedReactions().setOwner(newOwner);
        this.tryApplySuper('ownerChanged', [newOwner, oldOwner]);
    },

    /** @ignore */
    getChildHolder: function()
    {
        return this.getEmbeddedReactions();
    },

    /**
     * Returns the child reaction step count.
     * @returns {Int}
     */
    getStepCount() {
        return this.getChildCount();
    },
    /**
     * Returns the child reaction step at index.
     * @param {Int} index
     * @returns {Kekule.EmbeddedReaction}
     */
    getStepAt(index) {
        return this.getChildAt(index);
    },
    /**
     * Create and insert a new reaction step.
     * @param {String} id
     * @param {Int} index
     * @returns {Kekule.EmbeddedReaction}
     */
    newStep: function(id, index) {
        var reactionList = this.getEmbeddedReactions();
        var step = new Kekule.EmbeddedReaction(id);
        if (index === undefined || index < 0)
            reactionList.append(step);
        else if (index >= 0) {
            reactionList.insert(step, index);
        }
        return step;
    },

    /**
     * Clear all structure stereo features (e.g., bond wedge, node zIndex2D) of all molecules in reaction.
     */
    clearStereo: function()
    {
        this.beginUpdate();
        try
        {
            for (var i = 0, l = this.getStepCount(); i < l; ++i)
            {
                var step = this.getStepAt(i);
                if (step && step.clearStereo)
                    step.clearStereo();
            }
        }
        finally
        {
            this.endUpdate();
        }
    },

    /** @ignore */
    doGetComparisonPropNames: function(options)
    {
        var result = this.tryApplySuper('doGetComparisonPropNames', [options]) || [];
        result.push('reactions');
        return result;
    }
});


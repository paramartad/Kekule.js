/**
 * @fileoverview
 * Object modifier to change property of path glyphs in chem editor.
 * @author Partridge Jiang
 */

/*
 * requires /lan/classes.js
 * requires /utils/kekule.utils.js
 * requires /chemdoc/kekule.glyph.pathGlyphs.js
 * requires /widgets/kekule.widget.base.js
 * requires /widgets/commonCtrls/kekule.widget.buttons.js
 * requires /widgets/chem/editor/kekule.chemEditor.editorUtils.js
 * requires /widgets/chem/editor/kekule.chemEditor.baseEditor.js
 * requires /widgets/chem/editor/kekule.chemEditor.objModifiers.js
 * requires /widgets/chem/editor/kekule.chemEditor.utilWidgets.js
 */

(function(){
"use strict";

/*
 * requires /lan/classes.js
 * requires /utils/kekule.utils.js
 * requires /widgets/kekule.widget.base.js
 * requires /widgets/commonCtrls/kekule.widget.buttons.js
 * requires /widgets/chem/editor/kekule.chemEditor.baseEditor.js
 * requires /widgets/chem/editor/kekule.chemEditor.objModifiers.js
 * requires /widgets/chem/editor/kekule.chemEditor.utilWidgets.js
 */


var OU = Kekule.ObjUtils;
var AU = Kekule.ArrayUtils;
var DU = Kekule.DomUtils;
var EU = Kekule.HtmlElementUtils;
var CNS = Kekule.Widget.HtmlClassNames;
var CCNS = Kekule.ChemWidget.HtmlClassNames;
var BNS = Kekule.ChemWidget.ComponentWidgetNames;

Kekule.ChemWidget.HtmlClassNames = Object.extend(Kekule.ChemWidget.HtmlClassNames, {
	COMPOSER_GLYPH_PATH_MODIFIER_BUTTON: 'K-Chem-Composer-GlyphPathModifier-Button',
	COMPOSER_Glyph_PATH_MODIFIER_DROPDOWN: 'K-Chem-Composer-GlyphPathModifier-DropDown',
	COMPOSER_GLYPH_REACTION_ARROW_MODIFIER_BUTTON: 'K-Chem-Composer-ReactionArrowModifier-Button',
	COMPOSER_GLYPH_ARC_PATH_MODIFIER_BUTTON: 'K-Chem-Composer-ArcPathModifier-Button',
	COMPOSER_GLYPH_MULTI_ARC_PATH_MODIFIER_BUTTON: 'K-Chem-Composer-MultiArcPathModifier-Button',
	COMPOSER_GLYPH_ELECTRON_PUSHING_ARROW_MODIFIER_BUTTON: 'K-Chem-Composer-ElectronPushingArrowModifier-Button',
	COMPOSER_GLYPH_BOND_FORMING_ELECTRON_PUSHING_ARROW_MODIFIER_BUTTON: 'K-Chem-Composer-BondFormingElectronPushingArrowModifier-Button'
});

Kekule.globalOptions.add('chemWidget.composer.objModifier.chemCondition', {
	componentNames:	[
		BNS.chemCondition,
		BNS.chemConditionDisplaySymbol,
		BNS.chemConditionGlyphSize
	]
});

/**
 * Base modifier class to change the glyphs in editor.
 * @class
 * @augments Kekule.Editor.ObjModifier.Base
 */
Kekule.Editor.ObjModifier.GlyphModifier = Class.create(Kekule.Editor.ObjModifier.Base,
/** @lends Kekule.Editor.ObjModifier.GlyphModifier# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.GlyphModifier'
});
/** @ignore */
Kekule.Editor.ObjModifier.GlyphModifier.getCategories = function()
{
	return [Kekule.Editor.ObjModifier.Category.GLYPH];
};

/**
 * A modifier to change the params of a path.
 * @class
 * @augments Kekule.Editor.ObjModifier.GlyphModifier
 */
Kekule.Editor.ObjModifier.GlyphPath = Class.create(Kekule.Editor.ObjModifier.GlyphModifier,
/** @lends Kekule.Editor.ObjModifier.GlyphPath# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.GlyphPath',
	/** @private */
	MIX_VALUE: '[mixed]',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
		this._valueStorage = {};
	},
	/** @private */
	initProperties: function()
	{
		// private
		this.defineProp('pathParamSetter', {
			'dataType': 'Kekule.Widget.BaseWidget', 'serializable': false, 'setter': null
		});
	},
	/** @ignore */
	doCreateWidget: function()
	{
		var result = new Kekule.Widget.DropDownButton(this.getEditor());
		result.setHint(this.getModifierHint());
		result.setText(this.getModifierCaption());
		result.setShowText(true);
		result.setButtonKind(Kekule.Widget.Button.Kinds.DROPDOWN);
		result.addClassName(CCNS.COMPOSER_GLYPH_PATH_MODIFIER_BUTTON + ' ' + this.getModifierClassName());

		//var atomSetter = this._createAtomSetter(this.getEditor());
		//result.setDropDownWidget(atomSetter);
		result.setDropDownWidgetGetter(this._createPathParamSetter.bind(this));

		return result;
	},
	/** @private */
	_createPathParamSetter: function(parentWidget)
	{
		if (!parentWidget)
			parentWidget = this.getEditor();
		var widgetClass = this.getPathParamSetterClass();
		var result = new widgetClass(parentWidget);
		result.setCaption(this.getModifierCaption());
		result.addClassName(CCNS.COMPOSER_GLYPH_PATH_MODIFIER_DROPDOWN);

		this.setPropStoreFieldValue('pathParamSetter', result);
		if (this._valueStorage.pathParams)
		{
			/*
			this._updatePathParamSetterComponents(result, {
				'showOppositeStartArrowSlides': this._valueStorage.pathParams._hasOppositeStartArrowSides,
				'showOppositeEndArrowSlides': this._valueStorage.pathParams._hasOppositeEndArrowSides
			});
			*/
			result.setValue(this._valueStorage.pathParams);
			this._valueStorage.pathParams = null;
		}

		// react to value change of setter
		var self = this;
		result.addEventListener('showStateChange', function(e){
			var w = e.widget;
			//console.log(w.getClassName(), e.isShown, w === result);
			if (w === result)
			{
				if (e.isShown)  // when the setter popups, clear the original operations
				{
					self._lastOperation = null;
				}
				else if (e.isDismissed) // when closing and dismissed, ensure operation is undo
				{
					if (self._lastOperation)
						self._lastOperation.reverse();
					self._lastOperation = null;
				}
			}
		});
		result.addEventListener('valueChange', function(e){
			if (e.widget === result)
			{
				//self.applyToTargets();
				self.doModification(self.getEditor(), self.getTargetObjs(), !true);
				self._lastOperation = null;
				//result.dismiss();
				e.stopPropagation();
			}
		});
		result.addEventListener('valueInput', function(e){
			if (e.widget === result)
			{
				//self.applyToTargets();
				self.doModification(self.getEditor(), self.getTargetObjs(), !true);
				//result.dismiss();
				e.stopPropagation();
			}
		});

		return result;
	},
	/* @private */
	/*
	_updatePathParamSetterComponents: function(setter, options)
	{
		if (setter.setShowContinousStartArrowSidesSetter)
			setter.setShowContinousStartArrowSidesSetter(options.showOppositeStartArrowSlides);
		if (setter.setShowContinousEndArrowSidesSetter)
			setter.setShowContinousEndArrowSidesSetter(options.showOppositeEndArrowSlides);
	},
	*/

	/** @private */
	getPathParamSetterClass: function()
	{
		return Kekule.ChemWidget.GlyphPathSettingPanel;
	},
	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_GLYPH_PATH_MODIFIER');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_GLYPH_PATH_MODIFIER');
	},
	/** @private */
	getModifierClassName: function()
	{
		return '';
	},

	/** @private */
	_mergeHashValues: function(hash1, hash2)
	{
		if (!hash1)
			return hash2;
		if (!hash2)
			return hash1;
		else
		{
			var propNames1 = OU.getOwnedFieldNames(hash1, false);
			var propNames2 = OU.getOwnedFieldNames(hash2, false);
			var propNames = AU.clone(propNames1);
			AU.pushUnique(propNames, propNames2);
			if (propNames.length)
			{
				var result = {};
				for (var i = 0, l = propNames.length; i < l; ++i)
				{
					var pname = propNames[i];
					var value1 = hash1[pname];
					var value2 = hash2[pname];
					if (value1 === value2)
						result[pname] = value1;
					else
						result[pname] = this.MIX_VALUE;  // a special value not matching all ordinary param values
				}
				return result;
			}
			else
				return null;
		}
	},
	/** @private */
	_extractPathParamsOfObjs: function(objs)
	{
		var glyphPathParams = null;
		var connectorPathParams = null;
		//var hasOppositeStartArrowSides = false;
		//var hasOppositeEndArrowSides = false;
		for (var i = 0, ii = objs.length; i < ii; ++i)
		{
			var obj = objs[i];
			var connectors = (obj instanceof Kekule.Glyph.PathGlyphConnector) ? [obj] :
				(obj instanceof Kekule.Glyph.PathGlyph) ? obj.getConnectors() :
					null;
			//var glyph = (obj instanceof Kekule.Glyph.PathGlyph)? obj: null;
			if (connectors)
			{
				var param = this._extractPathParamOfConnectors(connectors);
				connectorPathParams = this._mergeHashValues(connectorPathParams, param);
			}
			/*
			if (glyph)
			{
				var oppositeArrowSidesValue = {};
				hasOppositeStartArrowSides = hasOppositeStartArrowSides || !!glyph.getOppositePathStartArrowSides;
				if (glyph.getOppositePathStartArrowSides)
				{
					oppositeArrowSidesValue.startOppositeContinuousArrowSides = glyph.getOppositePathStartArrowSides();
				}
				hasOppositeEndArrowSides = hasOppositeEndArrowSides || !!glyph.getOppositePathEndArrowSides;
				if (glyph.getOppositePathEndArrowSides)
				{
					oppositeArrowSidesValue.endOppositeContinuousArrowSides = glyph.getOppositePathEndArrowSides && glyph.getOppositePathEndArrowSides();
				}
				glyphPathParams = this._mergeHashValues(glyphPathParams, oppositeArrowSidesValue);
			}
			*/
		}
		var result = connectorPathParams;
		//var result = Object.extend(connectorPathParams, glyphPathParams);
		//result._hasOppositeStartArrowSides = hasOppositeStartArrowSides;  // special flag, indicating whether this property exists in glyphs
		//result._hasOppositeEndArrowSides = hasOppositeEndArrowSides;
		return result;
	},
	/** @private */
	_extractPathParamOfConnectors: function(connectors)
	{
		var connectorPathParams = null;
		for (var j = 0, jj = connectors.length; j < jj; ++j)
		{
			var param = this._extractPathParamOfConnector(connectors[j]);
			if (param)
				connectorPathParams = this._mergeHashValues(connectorPathParams, param);
		}
		return connectorPathParams;
	},
	/** @private */
	_extractPathParamOfConnector: function(connector)
	{
		return connector.getPathParams && connector.getPathParams();
	},

	/**
	 * Returns the glyph classes that this modified can be applied to.
	 * Descendants may override this method.
	 * @private
	 */
	getApplicableGlyphClasses: function()
	{
		return [Kekule.Glyph.PathGlyph];
	},
	/** @private */
	isApplicableGlyph: function(obj)
	{
		var checkObj = this.getTargetPathGlyph(obj);
		if (checkObj)
		{
			var classes = this.getApplicableGlyphClasses();
			if (classes)
			{

				for (var i = 0, l = classes.length; i < l; ++i)
				{
					if (obj instanceof classes[i])
						return true;
				}
				return false;
			}
			else
				return true;
		}
		else
			return false;
	},
	/** @private */
	getTargetPathGlyph: function(obj)
	{
		return (obj instanceof Kekule.Glyph.PathGlyph)? obj:
			(obj instanceof Kekule.Glyph.PathGlyphConnector)? obj.getParent():
				null
	},

	/** @private */
	_getActualModificationObjs: function(targets)
	{
		var result = [];
		for (var i = 0, l = targets.length; i < l; ++i)
		{
			var obj = targets[i];
			//if (obj instanceof Kekule.Glyph.PathGlyph || obj instanceof Kekule.Glyph.PathGlyphConnector)
			if (this.isApplicableGlyph(obj))
				AU.pushUnique(result, obj);
		}
		return result;
	},
	/** @private */
	_getActualModificationConnectors: function(targets)
	{
		var result = [];
		var actualTargets = this._getActualModificationObjs(targets);
		for (var i = 0, l = actualTargets.length; i < l; ++i)
		{
			var obj = actualTargets[i];
			if (obj instanceof Kekule.Glyph.PathGlyphConnector)
				result.push(obj);
			else if (obj instanceof Kekule.Glyph.PathGlyph)
				AU.pushUnique(result, obj.getConnectors());
		}
		return result;
	},
	/** @private */
	_getActualModificationGlyphs: function(targets)
	{
		var result = [];
		var actualTargets = this._getActualModificationObjs(targets);
		for (var i = 0, l = actualTargets.length; i < l; ++i)
		{
			var obj = actualTargets[i];
			var glyph = this.getTargetPathGlyph(obj);
			if (glyph)
				AU.pushUnique(result, glyph);
		}
		return result;
	},

	/** @private */
	_filterAppliableParams: function(params)
	{
		var result = {};
		var props = OU.getOwnedFieldNames(params);
		for (var i = 0, l = props.length; i < l; ++i)
		{
			var value = params[props[i]];
			if (value !== undefined && value !== this.MIX_VALUE)
				result[props[i]] = value;
		}
		return result;
	},
	/** @private */
	_splitPathParamValues: function(pathParams)  // extract params into connector and glyph sets
	{
		var result = {};
		var connectorParams = {};

		var fieldNames = OU.getOwnedFieldNames(pathParams);
		//var glyphFields = ['endOppositeContinuousArrowSides', 'startOppositeContinuousArrowSides'];
		for (var i = 0, l = fieldNames.length; i < l; ++i)
		{
			var fname = fieldNames[i];
			if (fname.startsWith('_'))  // internal special field, bypass
				continue;
			/*
			else if (glyphFields.indexOf(fname) >= 0)
				glyphParams[fname] = pathParams[fname];
			*/
			else
			{
				var fieldCategory = this._getPathParamFieldCategory(fname);
				if (!result[fieldCategory])
					result[fieldCategory] = {};
				result[fieldCategory][fname] = pathParams[fname];
			}
		}
		//console.log('extracted', result);
		return result;
	},
	/** @private */
	_getPathParamFieldCategory: function(fieldName)
	{
		return 'connectorParams';
	},

	/* @private */
	/*
	_buildNewGlyphPropValues: function(target, pathParams, glyphParams)
	{
		var propValues = {};

		if (pathParams._hasOppositeEndArrowSides && target.hasProperty('oppositePathEndArrowSides')
			&& OU.notUnset(glyphParams.endOppositeContinuousArrowSides) && glyphParams.endOppositeContinuousArrowSides !== this.MIX_VALUE)
		{
			propValues.oppositePathEndArrowSides = glyphParams.endOppositeContinuousArrowSides;
		}
		if (pathParams._hasOppositeStartArrowSides && target.hasProperty('oppositePathStartArrowSides')
			&& OU.notUnset(glyphParams.startOppositeContinuousArrowSides) && glyphParams.startOppositeContinuousArrowSides !== this.MIX_VALUE)
		{
			propValues.oppositePathStartArrowSides = glyphParams.startOppositeContinuousArrowSides;
		}
		return propValues;
	},
	*/
	/** @private */
	createModificationOperations: function(editor, targets, pathParams)
	{
		var paramGroup = this._splitPathParamValues(pathParams);
		var opers = this.doCreateModificationOperations(editor, targets, paramGroup);

		/*
		if ((pathParams._hasOppositeEndArrowSides || pathParams._hasOppositeStartArrowSides) && (paramGroup.glyphParams))
		{
			var glyphParams = paramGroup.glyphParams;
			var glyphs = this._getActualModificationGlyphs(targets);
			for (var i = 0, l = glyphs.length; i < l; ++i)
			{
				var target = glyphs[i];
				if (target instanceof Kekule.Glyph.PathGlyph)
				{
					var op;
					var propValues = this._buildNewGlyphPropValues(target, pathParams, glyphParams);
					op = new Kekule.ChemObjOperation.Modify(target, propValues, editor);
					if (op)
						opers.push(op);
				}
			}
		}
		*/
		return opers;
	},
	/** @private */
	doCreateModificationOperations: function(editor, targets, paramGroup)
	{
		if (paramGroup.connectorParams)
		{
			// console.log('create', paramGroup.connectorParams);
			var connectors = this._getActualModificationConnectors(targets);
			var connectorOpers = this._createModificationOperationsOnConnectors(editor, connectors, paramGroup.connectorParams);
			return connectorOpers;
		}
		return null;
	},
	/** @private */
	updateModificationOperations: function(editor, targets, pathParams, lastOperation)
	{
		var paramGroup = this._splitPathParamValues(pathParams);

		var operations;
		if (lastOperation.length)
			operations = lastOperation;
		else if (lastOperation instanceof Kekule.MacroOperation)
			operations = lastOperation.getChildren();
		else
			operations = [lastOperation];

		return this.doUpdateModificationOperations(editor, operations, targets, paramGroup);
	},
	/** @private */
	doUpdateModificationOperations: function(editor, operations, targets, paramGroup)
	{
		this._updateModificationOperationsOnConnectors(editor, targets, paramGroup.connectorParams, operations);
		return operations;
	},
	/** @private */
	_updateModificationOperationsOnConnectors: function(editor, targets, connectorParams, operations)
	{
		for (var i = 0, l = operations.length; i < l; ++i)
		{
			var operation = operations[i];
			var target = operation.getTarget();
			if (target instanceof Kekule.Glyph.PathGlyphConnector)
			{
				if (operation instanceof Kekule.ChemObjOperation.ModifyHashProp)
				{
					//console.log('update', paramGroup, operation);
					//operation.setNewPropValue(pathParams);
					this._updateModificationOperationOnConnector(editor, target, operation, connectorParams);
				}
			}
			/*
			else if (target instanceof Kekule.Glyph.PathGlyph)
			{
				if (operation instanceof Kekule.ChemObjOperation.Modify)
				{
					var propValues = this._buildNewGlyphPropValues(target, pathParams, paramGroup.glyphParams);
					operation.setNewPropValues(propValues);
				}
			}
			*/
		}
	},
	/** @private */
	_updateModificationOperationOnConnector: function(editor, target, operation, connectorPathParams)
	{
		if (target instanceof Kekule.Glyph.PathGlyphConnector)
		{
			if (operation instanceof Kekule.ChemObjOperation.ModifyHashProp)
			{
				operation.setNewPropValue(connectorPathParams);
			}
		}
	},
	/** @private */
	_createModificationOperationsOnConnectors: function(editor, connectors, connectorPathParams)
	{
		var opers = [];
		for (var i = 0, l = connectors.length; i < l; ++i)
		{
			var target = connectors[i];
			if (target instanceof Kekule.Glyph.PathGlyphConnector)
			{
				//var op = new Kekule.ChemObjOperation.ModifyHashProp(target, 'pathParams', /*pathParams*/paramGroup.connectorParams, editor);
				var op = this._createModificationOperationOnConnector(editor, target, connectorPathParams);
				if (op)
					opers.push(op);
			}
		}
		return opers;
	},
	/** @private */
	_createModificationOperationOnConnector: function(editor, target, connectorPathParams)
	{
		if (target instanceof Kekule.Glyph.PathGlyphConnector)
		{
			return new Kekule.ChemObjOperation.ModifyHashProp(target, 'pathParams', connectorPathParams, editor);
		}
		else
			return null;
	},
	/** @private */
	_createWrapperOperation: function(childOpers)
	{
		var operation;
		if (childOpers && childOpers.length > 1)
			operation = new Kekule.MacroOperation(childOpers);
		else
			operation = childOpers[0];
		return operation;
	},
	/** @private */
	_execModificationOperationInEditor: function(operation)
	{
		var isNewOperation = !this._lastOperation;
		var editor = this.getEditor();
		editor.beginManipulateAndUpdateObject();
		try
		{
			if (operation)  // only execute when there is real modification
			{
				if (/*doNotAddOperToHistory &&*/ !isNewOperation)  // operation already added to history, do not add again
					operation.execute();
				else
				{
					editor.execOperation(operation);
				}
			}
		}
		finally
		{
			editor.endManipulateAndUpdateObject();
			this._lastOperation = operation;
		}
	},
	/** @private */
	doModification: function(editor, targets, doNotAddOperToHistory)
	{
		var pathParams = this.getPathParamSetter().getValue();
		//console.log('do apply begin', pathParams);
		pathParams = this._filterAppliableParams(pathParams);
		/*
		var opers = [];
		var connectors = this._getActualModificationConnectors(targets);
		var editor = editor || this.getEditor();
		for (var i = 0, l = connectors.length; i < l; ++i)
		{
			var target = connectors[i];
			if (target instanceof Kekule.Glyph.PathGlyphConnector)
			{
				var op = new Kekule.ChemObjOperation.ModifyHashProp(target, 'pathParams', pathParams, editor);
				if (op)
					opers.push(op);
			}
		}
		*/
		var opers;
		//var isNewOperation = !this._lastOperation;
		if (this._lastOperation)
		{
			opers = this.updateModificationOperations(editor, targets, pathParams, this._lastOperation);
		}
		else
		{
			opers = this.createModificationOperations(editor, targets, pathParams);
		}

		/*
		var operation;
		if (opers && opers.length > 1)
			operation = new Kekule.MacroOperation(opers);
		else
			operation = opers[0];
		*/
		var operation = this._createWrapperOperation(opers);

		/*
		var editor = this.getEditor();
		//editor.beginUpdateObject();
		editor.beginManipulateAndUpdateObject();
		try
		{
			if (operation)  // only execute when there is real modification
			{
				if (!isNewOperation)  // operation already added to history, do not add again
					operation.execute();
				else
				{
					editor.execOperation(operation);
					this._lastOperation = operation;
				}
			}
		}
		finally
		{
			//editor.endUpdateObject();
			editor.endManipulateAndUpdateObject();
		}
		*/
		this._execModificationOperationInEditor(operation);
		//console.log('do apply end');
	},

	/** @ignore */
	doLoadFromTargets: function(editor, targets)
	{
		var objs = this._getActualModificationObjs(targets);
		var showModifier = (objs.length > 0);

		this._lastOperation = null;
		//console.log('clear last loadFromTarget');

		if (showModifier)
		{
			var pathParams = this._extractPathParamsOfObjs(objs);
			this._valueStorage.pathParams = pathParams;

			//console.log('pathParams', pathParams);
			var pathParamSetter = this.getPathParamSetter();
			if (pathParamSetter)
			{
				//console.log(pathParams);
				/*
				this._updatePathParamSetterComponents(pathParamSetter, {
					'showOppositeStartArrowSlides': pathParams._hasOppositeStartArrowSides,
					'showOppositeEndArrowSlides': pathParams._hasOppositeEndArrowSides
				});
				*/
				pathParamSetter.setValue(pathParams);
			}
		}
		this.getWidget().setDisplayed(showModifier);
	},
	/** @ignore */
	doApplyToTargets: function(/*$super, */editor, targets)
	{
		this.doModification(editor, targets, false);
	}
});

/**
 * A modifier to change the path params of reaction arrow and line segment.
 * @class
 * @augments Kekule.Editor.ObjModifier.GlyphPath
 */
Kekule.Editor.ObjModifier.ReactionArrowAndSegmentPath = Class.create(Kekule.Editor.ObjModifier.GlyphPath,
/** @lends Kekule.Editor.ObjModifier.ReactionArrowAndSegmentPath# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.ReactionArrowAndSegmentPath',
	/** @private */
	MIX_VALUE: '[mixed]',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
	},
	/** @ignore */
	getPathParamSetterClass: function()
	{
		return Kekule.ChemWidget.GlyphReactionArrowPathSettingPanel;
	},
	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_REACTION_ARROW_AND_SEGMENT_PATH_MODIFIER');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_REACTION_ARROW_AND_SEGMENT_PATH_MODIFIER');
	},
	/** @private */
	getModifierClassName: function()
	{
		return CCNS.COMPOSER_GLYPH_REACTION_ARROW_MODIFIER_BUTTON;
	},
	/** @ignore */
	getApplicableGlyphClasses: function()
	{
		return [Kekule.Glyph.StraightLine, Kekule.Glyph.Segment, Kekule.Glyph.ReactionArrow];
	},
	/** @ignore */
	_extractPathParamsOfObjs: function(/*$super, */objs)
	{
		var reactionArrowType;
		var result = this.tryApplySuper('_extractPathParamsOfObjs', [objs])  /* $super(objs) */;
		for (var i = 0, ii = objs.length; i < ii; ++i)
		{
			var obj = objs[i];
			var glyph = this.getTargetPathGlyph(obj);
			if (glyph)
			{
				if (glyph.getReactionType)
				{
					var rt = glyph.getReactionType();
					if (!reactionArrowType)
						reactionArrowType = rt;
					else if (reactionArrowType !== rt)
					{
						reactionArrowType = Kekule.Glyph.ReactionArrowType.CUSTOM;
						break;
					}
				}
			}
		}
		result.reactionArrowType = reactionArrowType;
		return result;
	},
	/** @ignore */
	createModificationOperations_OLD: function(/*$super, */editor, targets, pathParams)
	{
		var opers = [];
		if (/*pathParams.reactionArrowType &&*/ pathParams.reactionArrowType !== this.MIX_VALUE)
		{
			var glyphs = this._getActualModificationGlyphs(targets);
			for (var i = 0, l = glyphs.length; i < l; ++i)
			{
				var glyph = glyphs[i];
				if (glyph.setReactionType)
				{
					if (!pathParams.reactionArrowType)  // explicit none, change reaction arrow to line segment
					{
						if (glyph instanceof Kekule.Glyph.ReactionArrow)
						{
							opers.push(new Kekule.ChemObjOperation.ChangeClass(glyph, Kekule.Glyph.Segment, editor));
						}
					}
				}
				else
				{
					if (!!pathParams.reactionArrowType)
					{
						if (glyph instanceof Kekule.Glyph.StraightLine)
						{
							opers.push(new Kekule.ChemObjOperation.ChangeClass(glyph, Kekule.Glyph.ReactionArrow, editor));
						}
					}
				}
			}
			opers.push(new Kekule.ChemObjOperation.Modify(glyph, {'reactionType': pathParams.reactionArrowType}, editor));
		}
		var otherOpers = this.tryApplySuper('createModificationOperations_OLD', [editor, targets, pathParams])  /* $super(editor, targets, pathParams) */ || [];
		opers = opers.concat(otherOpers);  // the reaction type operation must before pathParam modification operations, since it may changes pathParams
		return opers;
	},
	/** @ignore */
	doCreateModificationOperations: function(/*$super, */editor, targets, paramGroup)
	{
		var opers = [];
		var connectorParams = paramGroup.connectorParams;
		if (/*connectorParams.reactionArrowType &&*/ connectorParams.reactionArrowType !== this.MIX_VALUE)
		{
			var glyphs = this._getActualModificationGlyphs(targets);
			for (var i = 0, l = glyphs.length; i < l; ++i)
			{
				var glyph = glyphs[i];
				if (glyph.setReactionType)
				{
					if (!connectorParams.reactionArrowType)  // explicit none, change reaction arrow to line segment
					{
						if (glyph instanceof Kekule.Glyph.ReactionArrow)
						{
							opers.push(new Kekule.ChemObjOperation.ChangeClass(glyph, Kekule.Glyph.Segment, editor));
						}
					}
				}
				else
				{
					if (!!connectorParams.reactionArrowType)
					{
						if (glyph instanceof Kekule.Glyph.StraightLine)
						{
							opers.push(new Kekule.ChemObjOperation.ChangeClass(glyph, Kekule.Glyph.ReactionArrow, editor));
						}
					}
				}
			}
			opers.push(new Kekule.ChemObjOperation.Modify(glyph, {'reactionType': connectorParams.reactionArrowType}, editor));
		}
		var otherOpers = this.tryApplySuper('doCreateModificationOperations', [editor, targets, paramGroup])  /* $super(editor, targets, paramGroup) */ || [];
		opers = opers.concat(otherOpers);  // the reaction type operation must before pathParam modification operations, since it may changes pathParams

		return opers;
	},
});

/**
 * A modifier to change the path params of arc segment.
 * @class
 * @augments Kekule.Editor.ObjModifier.GlyphPath
 */
Kekule.Editor.ObjModifier.ArcPath = Class.create(Kekule.Editor.ObjModifier.GlyphPath,
/** @lends Kekule.Editor.ObjModifier.ArcPath# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.ArcPath',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
	},
	/** @ignore */
	getPathParamSetterClass: function()
	{
		return Kekule.ChemWidget.GlyphArcPathSettingPanel;
	},
	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_ARC_PATH_MODIFIER');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_ARC_PATH_MODIFIER');
	},
	/** @private */
	getModifierClassName: function()
	{
		return CCNS.COMPOSER_GLYPH_ARC_PATH_MODIFIER_BUTTON;
	},
	/** @ignore */
	getApplicableGlyphClasses: function()
	{
		return [Kekule.Glyph.Arc];
	}
});

/**
 * A modifier to change the path params of multi arc segment.
 * @class
 * @augments Kekule.Editor.ObjModifier.GlyphPath
 */
Kekule.Editor.ObjModifier.MultiArcPath = Class.create(Kekule.Editor.ObjModifier.GlyphPath,
/** @lends Kekule.Editor.ObjModifier.MultiArcPath# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.MultiArcPath',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
	},
	/** @ignore */
	getPathParamSetterClass: function()
	{
		return Kekule.ChemWidget.GlyphMultiArcPathSettingPanel;
	},
	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_MULTI_ARC_PATH_MODIFIER');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_MULTI_ARC_PATH_MODIFIER');
	},
	/** @private */
	getModifierClassName: function()
	{
		return CCNS.COMPOSER_GLYPH_MULTI_ARC_PATH_MODIFIER_BUTTON;
	},
	/** @ignore */
	getApplicableGlyphClasses: function()
	{
		return [Kekule.Glyph.TwinArc];
	},

	/** @ignore */
	_filterAppliableParams: function(/*$super, */params)
	{
		if (DataType.isArrayValue(params))
		{
			var result = [];
			for (var i = 0, l = params.length; i < l; ++i)
			{
				result.push(this.tryApplySuper('_filterAppliableParams', [params[i]])  /* $super(params[i]) */);
			}
			return result;
		}
		else
			return this.tryApplySuper('_filterAppliableParams', [params])  /* $super(params) */;
	},

	/** @private */
	_buildConnectorGroup: function(targetObjs, createMap)
	{
		var group = [];
		var getGroup = function(index)
		{
			var result = group[index];
			if (!result)
			{
				result = [];
				group[index] = result;
			}
			return result;
		};

		var map;
		if (createMap)
		{
			map = new Kekule.MapEx();
			group.map = map;
		}

		for (var i = 0, ii = targetObjs.length; i < ii; ++i)
		{
			var obj = targetObjs[i];
			var connectors = (obj instanceof Kekule.Glyph.PathGlyphConnector) ? [obj] :
					(obj instanceof Kekule.Glyph.PathGlyph) ? obj.getConnectors() :
							[];
			for (var j = 0, jj = connectors.length; j < jj; ++j)
			{
				var connector = connectors[j];
				getGroup(j).push(connector);
				if (createMap)
					map.set(connector, j);
			}
		}
		return group;
	},
	/** @ignore */
	_extractPathParamsOfObjs: function(objs)
	{
		var result = [];

		var connectorGroup = this._buildConnectorGroup(objs);
		for (var i = 0, l = connectorGroup.length; i < l; ++i)
		{
			var connectors = connectorGroup[i] || [];
			var params = this._extractPathParamOfConnectors(connectors) || null;
			result.push(params);
		}
		return result;
	},
	/** @ignore */
	_splitPathParamValues: function(/*$super, */pathParams)
	{
		if (DataType.isArrayValue(pathParams))
		{
			var result = [];
			for (var i = 0, l = pathParams.length; i < l; ++i)
			{
				var group = this.tryApplySuper('_splitPathParamValues', [pathParams[i]])  /* $super(pathParams[i]) */;
				if (group)
				{
					var categories = OU.getOwnedFieldNames(group);
					for (var j = 0, jj = categories.length; j < jj; ++j)
					{
						var category = categories[j];
						if (!result[category])
							result[category] = [];
						result[category][i] = group[category];
					}
					//result[i] = group;
				}
			}
			return result;
		}
		else
			return this.tryApplySuper('_splitPathParamValues', [pathParams])  /* $super(pathParams) */;
		//return {connectorParams: pathParams};
	},

	/** @ignore */
	_updateModificationOperationsOnConnectors: function(editor, targets, connectorParams, operations)
	{
		var connectorMap = this._buildConnectorGroup(targets, true).map;
		for (var i = 0, l = operations.length; i < l; ++i)
		{
			var operation = operations[i];
			var target = operation.getTarget();
			if (target instanceof Kekule.Glyph.PathGlyphConnector)
			{
				if (operation instanceof Kekule.ChemObjOperation.ModifyHashProp)
				{
					//console.log('update', paramGroup, operation);
					var groupIndex = connectorMap.get(target);
					if (groupIndex >= 0)
						this._updateModificationOperationOnConnector(editor, target, operation, connectorParams[groupIndex]);
				}
			}
		}
	},

	/** @ignore */
	doCreateModificationOperations: function(editor, targets, paramGroup)
	{
		var opers = [];
		if (paramGroup.connectorParams)
		{
			var connectorParamGroup = AU.toArray(paramGroup.connectorParams);
			var connectorGroup = this._buildConnectorGroup(targets);

			for (var i = 0, l = connectorGroup.length; i < l; ++i)
			{
				var param = connectorParamGroup[i];
				if (param)
				{
					var connectors = connectorGroup[i] || [];
					var subOpers = this._createModificationOperationsOnConnectors(editor, connectors, param);
					if (subOpers)
						opers = opers.concat(subOpers);
				}
			}
		}
		return opers;
	},
});

/**
 * A base modifier to change properties of electron pushing arrow.
 * @class
 * @augments Kekule.Editor.ObjModifier.GlyphPath
 */
Kekule.Editor.ObjModifier.BaseElectronPushingArrow = Class.create(Kekule.Editor.ObjModifier.GlyphPath,
/** @lends Kekule.Editor.ObjModifier.BaseElectronPushingArrow# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.BaseElectronPushingArrow',
	/** @ignore */
	getPathParamSetterClass: function()
	{
		return null;  // should be override by descendants
	},
	/** @private */
	getModifierCaption: function()
	{
		return null;  // should be override by descendants
	},
	/** @private */
	getModifierHint: function()
	{
		return null;  // should be override by descendants
	},
	/** @private */
	getModifierClassName: function()
	{
		return '';  // should be override by descendants
	},
	/** @ignore */
	getApplicableGlyphClasses: function()
	{
		return [];  // should be override by descendants
	},

	/** @ignore */
	_extractPathParamsOfObjs: function(/*$super, */objs)
	{
		var electronCount;
		var result = this.tryApplySuper('_extractPathParamsOfObjs', [objs])  /* $super(objs) */;
		for (var i = 0, ii = objs.length; i < ii; ++i)
		{
			var obj = objs[i];
			var glyph = this.getTargetPathGlyph(obj);
			if (glyph)
			{
				if (glyph.getElectronCount)
				{
					var eCount = glyph.getElectronCount();
					if (OU.isUnset(electronCount))
						electronCount = eCount;
					else if (electronCount !== eCount)
					{
						electronCount = 0;  // Mix value
						break;
					}
				}
			}
		}
		result.electronCount = electronCount;
		return result;
	},
	/** @ignore */
	_getPathParamFieldCategory: function(/*$super, */fieldName)
	{
		if (fieldName === 'electronCount')
			return 'glyphParams';
		else
			return this.tryApplySuper('_getPathParamFieldCategory', [fieldName])  /* $super(fieldName) */;
	},
	/* @ignore */
	/*
	createModificationOperations: function($super, editor, targets, pathParams)
	{
		var opers = $super(editor, targets, pathParams) || [];  // arrow param must be set first, since e-count may changes the arrow side
		if (!!pathParams.electronCount)
		{
			var glyphs = this._getActualModificationGlyphs(targets);
			for (var i = 0, l = glyphs.length; i < l; ++i)
			{
				var glyph = glyphs[i];
				if (glyph.hasProperty('electronCount'))
				{
					opers.push(new Kekule.ChemObjOperation.Modify(glyph, {'electronCount': pathParams.electronCount}, editor));
				}
			}
		}
		return opers;
	},
	*/
	/** @ignore */
	doCreateModificationOperations: function(/*$super, */editor, targets, paramGroup)
	{
		var opers = this.tryApplySuper('doCreateModificationOperations', [editor, targets, paramGroup])  /* $super(editor, targets, paramGroup) */ || [];  // arrow param must be set first, since e-count may changes the arrow side
		if (paramGroup.glyphParams && paramGroup.glyphParams.electronCount)
		{
			var glyphs = this._getActualModificationGlyphs(targets);
			for (var i = 0, l = glyphs.length; i < l; ++i)
			{
				var glyph = glyphs[i];
				if (glyph.hasProperty('electronCount'))
				{
					opers.push(new Kekule.ChemObjOperation.Modify(glyph, {'electronCount': paramGroup.glyphParams.electronCount}, editor));
				}
			}
		}
		return opers;
	},
	/** @ignore */
	doUpdateModificationOperations: function(/*$super, */editor, operations, targets, paramGroup)
	{
		this.tryApplySuper('doUpdateModificationOperations', [editor, operations, targets, paramGroup])  /* $super(editor, operations, targets, paramGroup) */;
		this._updateGlyphModificationOperations(editor, operations, paramGroup);
		return operations;
	},
	/* @private */
	_updateGlyphModificationOperations: function(editor, operations, paramGroup)
	{
		// TODO: pending here
		/*
		console.log('paramGroup', paramGroup);
		for (var i = 0, l = operations.length; i < l; ++i)
		{
			var oper = operations[i];
			if (oper instanceof Kekule.ChemObjOperation.Modify)
			{
				var target = oper.getTarget();
				if (target instanceof Kekule.Glyph.PathGlyph && target.hasProperty('electronCount'))
				{

				}
			}
		}
		*/
	}
});

/**
 * A modifier to change the properties of normal electron pushing arrow
 * @class
 * @augments Kekule.Editor.ObjModifier.BaseElectronPushingArrow
 */
Kekule.Editor.ObjModifier.ElectronPushingArrow = Class.create(Kekule.Editor.ObjModifier.BaseElectronPushingArrow,
/** @lends Kekule.Editor.ObjModifier.ElectronPushingArrow# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.ElectronPushingArrow',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
	},
	/** @ignore */
	getPathParamSetterClass: function()
	{
		return Kekule.ChemWidget.GlyphElectronPushingArrowSettingPanel;
	},
	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_ELECTRON_PUSHING_ARROW_MODIFIER');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_ELECTRON_PUSHING_ARROW_MODIFIER');
	},
	/** @private */
	getModifierClassName: function()
	{
		return CCNS.COMPOSER_GLYPH_ELECTRON_PUSHING_ARROW_MODIFIER_BUTTON;
	},
	/** @ignore */
	getApplicableGlyphClasses: function()
	{
		return [Kekule.Glyph.ElectronPushingArrow];
	}
});

/**
 * A modifier to change the properties of bond forming electron pushing arrow
 * @class
 * @augments Kekule.Editor.ObjModifier.MultiArcPath
 */
Kekule.Editor.ObjModifier.BondFormingElectronPushingArrow = Class.create(Kekule.Editor.ObjModifier.MultiArcPath,
/** @lends Kekule.Editor.ObjModifier.BondFormingElectronPushingArrow# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.BondFormingElectronPushingArrow',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
	},
	/** @ignore */
	getPathParamSetterClass: function()
	{
		return Kekule.ChemWidget.GlyphMultiElectronPushingArrowSettingPanel;
	},
	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_BOND_FORMING_ELECTRON_PUSHING_ARROW_MODIFIER');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_BOND_FORMING_ELECTRON_PUSHING_ARROW_MODIFIER');
	},
	/** @private */
	getModifierClassName: function()
	{
		return CCNS.COMPOSER_GLYPH_BOND_FORMING_ELECTRON_PUSHING_ARROW_MODIFIER_BUTTON;
	},
	/** @ignore */
	getApplicableGlyphClasses: function()
	{
		return [Kekule.Glyph.BondFormingElectronPushingArrow];
	},
	/** @ignore */
	_extractPathParamsOfObjs: function(/*$super, */objs)
	{
		var electronCount;
		var result = this.tryApplySuper('_extractPathParamsOfObjs', [objs])  /* $super(objs) */;
		for (var i = 0, ii = objs.length; i < ii; ++i)
		{
			var obj = objs[i];
			var glyph = this.getTargetPathGlyph(obj);
			if (glyph)
			{
				if (glyph.getElectronCount)
				{
					var connectorCount = glyph.getConnectorCount() || 1;
					var eCount = Math.round((glyph.getElectronCount() || 0) / connectorCount);
					if (OU.isUnset(electronCount))
					{
						electronCount = eCount;
						if (electronCount <= 0)
							electronCount = 1;
					}
					else if (electronCount !== eCount)
					{
						electronCount = 0;  // Mix value
						break;
					}
				}
			}
		}
		result.electronCount = electronCount;
		return result;
	},
	/** @ignore */
	_getPathParamFieldCategory: function(/*$super, */fieldName)
	{
		if (fieldName === 'electronCount')
			return 'glyphParams';
		else
			return this.tryApplySuper('_getPathParamFieldCategory', [fieldName])  /* $super(fieldName) */;
	},
	/** @ignore */
	_filterAppliableParams: function(/*$super, */params)
	{
		var result = this.tryApplySuper('_filterAppliableParams', [params])  /* $super(params) */ || [];
		if (params.electronCount)
			result.electronCount = params.electronCount;
		return result;
	},
	/** @ignore */
	_splitPathParamValues: function(/*$super, */pathParams)
	{
		var result = this.tryApplySuper('_splitPathParamValues', [pathParams])  /* $super(pathParams) */ || [];
		if (pathParams.electronCount)
		{
			if (!result.glyphParams)
				result.glyphParams = {};
			result.glyphParams.electronCount = pathParams.electronCount;
		}
		return result;
	},
	/** @ignore */
	doCreateModificationOperations: function(/*$super, */editor, targets, paramGroup)
	{
		var opers = this.tryApplySuper('doCreateModificationOperations', [editor, targets, paramGroup])  /* $super(editor, targets, paramGroup) */ || [];  // arrow param must be set first, since e-count may changes the arrow side
		if (paramGroup.glyphParams && paramGroup.glyphParams.electronCount)
		{
			var glyphs = this._getActualModificationGlyphs(targets);
			for (var i = 0, l = glyphs.length; i < l; ++i)
			{
				var glyph = glyphs[i];
				if (glyph.hasProperty('electronCount'))
				{
					var connectorCount = glyph.getConnectorCount() || 1;
					var perECount = Math.round(paramGroup.glyphParams.electronCount * connectorCount);
					if (perECount <= 0)
						perECount = 1;
					opers.push(new Kekule.ChemObjOperation.Modify(glyph, {'electronCount': perECount}, editor));
				}
			}
		}
		return opers;
	}
});

/**
 * A modifier to change the label of a label glyph.
 * @class
 * @augments Kekule.Editor.ObjModifier.RichText
 */
Kekule.Editor.ObjModifier.GlyphLabel = Class.create(Kekule.Editor.ObjModifier.RichText,
/** @lends Kekule.Editor.ObjModifier.GlyphLabel# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.GlyphLabel',
	/** @construct */
	initialize: function(editor)
	{
		this.tryApplySuper('initialize', [editor]);
	},
	/** @private */
	initProperties: function()
	{
		// private
		// this.defineProp('labelParamSetter', {
		// 	'dataType': 'Kekule.Widget.BaseWidget', 'serializable': false, 'setter': null
		// });
	},

	// /** @ignore */
	// getModifierCaption: function()
	// {
	// 	return Kekule.$L('ChemWidgetTexts.CAPTION_TEXT_FORMAT');
	// },
	// /** @ignore */
	// getModifierHint: function()
	// {
	// 	return Kekule.$L('ChemWidgetTexts.HINT_TEXT_FORMAT');
	// },
	// /** @ignore */
	// getModifierClassName: function()
	// {
	// 	return this.tryApplySuper('getModifierClassName');
	// },

	// /** @ignore */
	/*
	doCreateWidget: function()
	{
		var result = new Kekule.Widget.DropDownButton(this.getEditor());
		result.setHint(this.getModifierHint());
		result.setText(this.getModifierCaption());
		result.setShowText(true);
		result.setButtonKind(Kekule.Widget.Button.Kinds.DROPDOWN);
		result.addClassName(CCNS.COMPOSER_GLYPH_PATH_MODIFIER_BUTTON + ' ' + this.getModifierClassName());

		//var atomSetter = this._createAtomSetter(this.getEditor());
		//result.setDropDownWidget(atomSetter);
		result.setDropDownWidgetGetter(this._createPathParamSetter.bind(this));

		return result;
	}
	*/
});
// the ancestor class is registered as style obj modifier, need to re-register as glyph modifier here
Kekule.Editor.ObjModifier.GlyphLabel.getCategories = function()
{
	return [Kekule.Editor.ObjModifier.Category.GLYPH];
};

/**
 * A modifier to change the reaction condition glyph.
 * @class
 * @augments Kekule.Editor.ObjModifier.GlyphLabel
 */
Kekule.Editor.ObjModifier.ChemCondition = Class.create(Kekule.Editor.ObjModifier.GlyphLabel,
/** @lends Kekule.Editor.ObjModifier.ChemCondition# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.ChemCondition',

	/** @ignore */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_CHEM_CONDITION_MODIFIER');
	},
	/** @ignore */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_CHEM_CONDITION_MODIFIER');
	},
	/** @ignore */
	getModifierClassName: function()
	{
		return this.tryApplySuper('getModifierClassName') + ' ' + CCNS.COMPOSER_REACTION_CONDITION_BUTTON;
	},

	/** @ignore */
	doCreateWidget: function()
	{
		var result = this.tryApplySuper('doCreateWidget');
		// listener to the result(dropdown button)'s dropDown event, when drop down, update the configs of condition setter
		result.on('dropDown', function() {
			var panel = this.getSettingsPanel();
			if (panel)
			{
				this.doApplyConditionPanelConfigs(panel);
			}
		}, this);
		return result;
	},

	/** @ignore */
	doLoadFromTargets: function(editor, targets)
	{
		if (targets && targets.length)
		{
			var valueStorage = this._valueStorage;

			// retrieve current condition value
			var currCondition, currText, currDisplaySymbol;
			for (var i = 0, ii = targets.length; i < ii; ++i)
			{
				var obj = targets[i];
				if (obj instanceof Kekule.Glyph.ChemConditionSymbol)
				{
					/*
					if (currCondition === undefined)
						currCondition = obj.getCondition();
					else if (currCondition !== obj.getCondition())
						currCondition = null;  // null means mixed value
					*/
					if (currText === undefined)
						currText = obj.getText();
					else if (currText !== obj.getText())
						currText = null;    // null means mixed value

					if (currDisplaySymbol === undefined)
						currDisplaySymbol = obj.getDisplaySymbol();
					else if (obj.getDisplaySymbol() && currDisplaySymbol !== obj.getDisplaySymbol())
						currDisplaySymbol = null;
				}
			}
			// valueStorage.condition = currCondition;
			valueStorage.condition = currText;
			valueStorage.displaySymbol = currDisplaySymbol;

			if (this.getSettingsPanel())
			{
				this._updateUiValuesFromStorage(valueStorage);
			}
		}
	},

	/** @private */
	_updateUiValuesFromStorage: function(valueStorage)
	{
		if (this.getSettingsPanel())
		{
			this.getSettingsPanel().setValue(valueStorage);
		}
	},

	/** @private */
	_getDropDownPanelComponents: function()
	{
		var compNames = Kekule.globalOptions.chemWidget.composer.objModifier.chemCondition.componentNames;
		return compNames;
	},

	/** @private */
	_doCreateDropDownPanel: function()
	{
		var compNames = this._getDropDownPanelComponents();
		var configs = this.getEditorConfigs().getChemConditionSetterConfigs();

		var panel = this._doCreateSettingsPanelInstance(this.getEditor());

		this.setPropStoreFieldValue('settingsPanel', panel);
		panel.setComponents(compNames)
			.setCaption(this.getModifierCaption());

		this.doApplyConditionPanelConfigs(panel);
		/*
		panel.setSelectableChemConditions(
			configs.getListedChemConditions()
		);
		panel.setEnableCustomCondition(configs.getEnableCustomCondition());
		*/

		/*
		panel.setConditionGlyphSizeMin(configs.getConditionGlyphFontSizeMin())
			.setConditionGlyphSizeMax(configs.getConditionGlyphFontSizeMax())
			.setConditionGlyphSizeStep(configs.getConditionGlyphFontSizeStep());
		*/

		panel.addEventListener('valueChange', function(e) {
			var doRemove = false;
			if (e.target === panel)
			{
				var modifiedValue = {};
				if (e.modifiedName === 'condition')
				{
					var value = panel.getValue();
					if (!value.condition && !value.conditionText)   // user has erased content of condition, need to remove the symbol
					{
						doRemove = true;
					}
					else
					{
						modifiedValue.text = value.conditionText;  // use text property of condition glyph to do modification
						/*
						if (value.isCustomCondition) {
							modifiedValue.text = value.conditionText;  // use text property of condition glyph to do modification
							modifiedValue.condition = value.condition;
						}
						else
						{
							modifiedValue.text = value.conditionText;
							modifiedValue.condition = value.condition;  // use condition property of condition glyph to do modification
						}
						*/
					}
				}
				/*
				else if (e.modifiedName === 'customCondition')
				{
					modifiedValue.condition = e.modifiedValue;
				}
				*/
				else if (e.modifiedName === 'displaySymbol')
				{
					modifiedValue.displaySymbol = e.modifiedValue;  // use text property of condition glyph to do modification
				}
				/*
				else if (e.modifiedName === 'size')
				{
					console.log('Change size to', e.modifiedValue);
				}
				*/
				// console.log('changed', modifiedValue, e);
				if (doRemove)
					this.getEditor().removeObjects(this.getTargetObjs(), true);
				else
					this.getEditor().modifyObjects(this.getTargetObjs(), modifiedValue, true);
			}
		}, this);

		// set stored field values
		var valueStorage = this._valueStorage;
		if (valueStorage)
		{
			this._updateUiValuesFromStorage(valueStorage);
		}

		return panel;
	},

	/** @ignore */
	_doCreateSettingsPanelInstance: function(targetEditor)
	{
		var result = new Kekule.ChemWidget.ChemConditionSettingPanel(targetEditor);
		return result;
	},

	/** @private */
	doApplyConditionPanelConfigs(panel)
	{
		var configs = this.getEditorConfigs().getChemConditionSetterConfigs();
		panel.setSelectableChemConditions(configs.getListedChemConditions());
		panel.setEnableCustomCondition(configs.getEnableCustomCondition());
	},

	/** @ignore */
	/*
	doCreateWidget: function()
	{
		var result = new Kekule.Widget.DropDownButton(this.getEditor());
		result.setHint(this.getModifierHint());
		result.setText(this.getModifierCaption());
		result.setShowText(false);
		result.setButtonKind(Kekule.Widget.Button.Kinds.DROPDOWN);
		if (this.getModifierClassName())
			result.addClassName(this.getModifierClassName());

		result.setDropDownWidgetGetter(this._doCreateSettingsPanelInstance.bind(this));
		return result;
	}
	*/
});

var OMM = Kekule.Editor.ObjModifierManager;
OMM.register([Kekule.Glyph.StraightLine, Kekule.Glyph.PathGlyphConnector], [Kekule.Editor.ObjModifier.ReactionArrowAndSegmentPath]);
OMM.register([Kekule.Glyph.Arc], [Kekule.Editor.ObjModifier.ArcPath]);
OMM.register([Kekule.Glyph.TwinArc], [Kekule.Editor.ObjModifier.MultiArcPath]);
OMM.register([Kekule.Glyph.ElectronPushingArrow], [Kekule.Editor.ObjModifier.ElectronPushingArrow]);
OMM.register([Kekule.Glyph.BondFormingElectronPushingArrow], [Kekule.Editor.ObjModifier.BondFormingElectronPushingArrow]);
OMM.register([Kekule.Glyph.ChemConditionSymbol], [Kekule.Editor.ObjModifier.ChemCondition]);

})();
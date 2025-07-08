/**
 * @fileoverview
 * Object modifier to change format of text, atom label, etc. in chem editor.
 * @author Partridge Jiang
 */

/*
 * requires /lan/classes.js
 * requires /utils/kekule.utils.js
 * requires /widgets/kekule.widget.base.js
 * requires /widgets/commonCtrls/kekule.widget.buttons.js
 * requires /widgets/chem/editor/kekule.chemEditor.utilWidgets.js
 * requires /widgets/chem/editor/kekule.chemEditor.baseEditor.js
 * requires /widgets/chem/editor/kekule.chemEditor.objModifiers.js
 * requires /widgets/chem/editor/modifiers/kekule.chemEditor.styleModifiers.js
 */

(function(){
"use strict";

var DU = Kekule.DomUtils;
var EU = Kekule.HtmlElementUtils;
var CNS = Kekule.Widget.HtmlClassNames;
var CCNS = Kekule.ChemWidget.HtmlClassNames;
var BNS = Kekule.ChemWidget.ComponentWidgetNames;

Kekule.ChemWidget.HtmlClassNames = Object.extend(Kekule.ChemWidget.HtmlClassNames, {
	COMPOSER_TEXTFORMAT_BUTTON: 'K-Chem-Composer-TextFormat-Button',
	COMPOSER_REACTION_CONDITION_BUTTON: 'K-Chem-Composer-Reaction-Condition-Button',

	COMPOSER_MODIFIER_RICHTEXT_PANEL: 'K-Chem-Composer-Modifier-RichText-Panel',
	COMPOSER_MODIFIER_RICHTEXT_PANEL_GROUP: 'K-Chem-Composer-Modifier-RichText-Panel-Group',
	COMPOSER_MODIFIER_RICHTEXT_PANEL_GROUP_LABELCELL: 'K-Chem-Composer-Modifier-RichText-Panel-Group-LabelCell',
	COMPOSER_MODIFIER_RICHTEXT_PANEL_GROUP_CTRLCELL: 'K-Chem-Composer-Modifier-RichText-Panel-Group-CtrlCell',
	COMPOSER_MODIFIER_RICHTEXT_PANEL_GROUP_LABEL: 'K-Chem-Composer-Modifier-RichText-Panel-Group-Label',
	COMPOSER_TEXTDIRECTION_BOX: 'K-Chem-Composer-TextDirection-Box',
	COMPOSER_TEXTALIGN_BOX: 'K-Chem-Composer-TextAlign-Box'
});

Kekule.globalOptions.add('chemWidget.composer.objModifier.richText', {
	componentNames:	[
		BNS.fontName,
		BNS.fontSize,
		BNS.textDirection,
		BNS.textAlign,
		BNS.nodeDisplayMode
	]
});

/**
 * A text format modifier to change the text font/alignment of some chem objects.
 * @class
 * @augments Kekule.Editor.ObjModifier.BaseRenderOptionModifier
 */
Kekule.Editor.ObjModifier.RichText = Class.create(Kekule.Editor.ObjModifier.BaseRenderOptionModifier,
/** @lends Kekule.Editor.ObjModifier.RichText# */
{
	/** @private */
	CLASS_NAME: 'Kekule.Editor.ObjModifier.RichText',
	/** @construct */
	initialize: function(/*$super, */editor)
	{
		this.tryApplySuper('initialize', [editor])  /* $super(editor) */;
		this._valueStorage = {};
		this._nodeLabelDisplayModeGroup = null;
	},
	/** @private */
	initProperties: function()
	{
		// private
		this.defineProp('settingsPanel', {
			'dataType': 'Kekule.Widget.BaseWidget', 'serializable': false, 'setter': null
		});
	},

	_getDropDownPanelComponents: function()
	{
		var compNames = Kekule.globalOptions.chemWidget.composer.objModifier.richText.componentNames;
		return compNames;
	},
	/** @private */
	_doCreateDropDownPanel: function()
	{
		var compNames = this._getDropDownPanelComponents();
		// var panel = new Kekule.ChemWidget.TextStyleSettingPanel(this.getEditor());
		var panel = this._doCreateSettingsPanelInstance(this.getEditor());
		this.setPropStoreFieldValue('settingsPanel', panel);
		panel.addClassName(CCNS.COMPOSER_MODIFIER_RICHTEXT_PANEL)
			.setComponents(compNames)
			.setCaption(this.getModifierCaption());
		panel.setSelectableFontSizes(this.getEditorConfigs().getStyleSetterConfigs().getListedFontSizes())
			.setSelectableFontFamilies(this.getEditorConfigs().getStyleSetterConfigs().getListedFontNames());
		panel.addEventListener('valueChange', function(e) {
			var value = {};
			value[e.styleName] = e.styleValue;
			this.getEditor().modifyObjectsRenderOptions(this.getTargetObjs(), value, false, true);
		}, this);

		// set stored field values
		var valueStorage = this._valueStorage;
		if (valueStorage)
		{
			this._updateUiValuesFromStorage(valueStorage);
		}

		return panel;
	},
	/** @private */
	_doCreateSettingsPanelInstance: function(targetEditor)
	{
		return new Kekule.ChemWidget.TextStyleSettingPanel(targetEditor);
	},

	/** @private */
	getModifierCaption: function()
	{
		return Kekule.$L('ChemWidgetTexts.CAPTION_TEXT_FORMAT');
	},
	/** @private */
	getModifierHint: function()
	{
		return Kekule.$L('ChemWidgetTexts.HINT_TEXT_FORMAT');
	},
	/** @private */
	getModifierClassName: function()
	{
		return CCNS.COMPOSER_TEXTFORMAT_BUTTON;
	},

	/** @ignore */
	doCreateWidget: function()
	{
		var result = new Kekule.Widget.DropDownButton(this.getEditor());
		result.setHint(this.getModifierHint());
		result.setText(this.getModifierCaption());
		result.setShowText(false);
		result.setButtonKind(Kekule.Widget.Button.Kinds.DROPDOWN);
		if (this.getModifierClassName())
			result.addClassName(this.getModifierClassName());

		//var panel = this._doCreateDropDownPanel();
		//panel.on('valueChange', function(){ this.applyToTargets(); }, this);

		//result.setDropDownWidget(panel);
		result.setDropDownWidgetGetter(this._doCreateDropDownPanel.bind(this));
		return result;
	},

	/** @private */
	_filterNodeLabelDisplayModeTargets: function(targets)
	{
		var result = [];
		for (var i = 0, l = targets.length; i < l; ++i)
		{
			var obj = targets[i];
			if (obj instanceof Kekule.ChemStructureNode)
			{
				if (obj instanceof Kekule.StructureFragment && obj.hasCtab())
					result.push(obj);
				else
					result.push(obj);
			}
		}
		return result;
	},
	/** @private */
	_hasNodeLabelDisplayModeTarget: function(targets)
	{
		return !!this._filterNodeLabelDisplayModeTargets(targets).length;
	},

	/** @private */
	_updateUiValuesFromStorage: function(valueStorage)
	{
		if (this.getSettingsPanel())
		{
			this.getSettingsPanel().setValue(valueStorage);
			var compNames = this._getDropDownPanelComponents() || [];
			if (valueStorage.hasNodeLabelDisplayModeTarget && compNames.indexOf(BNS.nodeDisplayMode) < 0)
			{
				compNames = [BNS.nodeDisplayMode].concat(compNames);
			}
			else if (!valueStorage.hasNodeLabelDisplayModeTarget)
			{
				var index = compNames.indexOf(BNS.nodeDisplayMode);
				if (index >= 0)
				{
					compNames = Kekule.ArrayUtils.clone(compNames);
					compNames.splice(index, 1);
				}
			}
			this.getSettingsPanel().setComponents(compNames);
		}
	},

	/** @ignore */
	doLoadFromTargets: function(editor, targets)
	{
		if (targets && targets.length)
		{
			var valueStorage = this._valueStorage;
			valueStorage.fontFamily = this.getRenderOptionValue(targets, 'fontFamily') || '';  // TODO: atom font family?
			valueStorage.fontSize = this.getRenderOptionValue(targets, 'fontSize') || undefined;
			valueStorage.charDirection = this.getRenderOptionValue(targets, 'charDirection') || Kekule.Render.TextDirection.DEFAULT;
			valueStorage.horizontalAlign = this.getRenderOptionValue(targets, 'horizontalAlign') || Kekule.Render.TextAlign.DEFAULT;
			valueStorage.verticalAlign = this.getRenderOptionValue(targets, 'verticalAlign') || Kekule.Render.TextAlign.DEFAULT;
			valueStorage.nodeDisplayMode = this.getRenderOptionValue(this._filterNodeLabelDisplayModeTargets(targets), 'nodeDisplayMode') || Kekule.Render.NodeLabelDisplayMode.DEFAULT;
			valueStorage.hasNodeLabelDisplayModeTarget = this._hasNodeLabelDisplayModeTarget(targets);

			if (this.getSettingsPanel())
			{
				this._updateUiValuesFromStorage(valueStorage);
			}
		}
	},
	/** @ignore */
	doApplyToTargets: function(/*$super, */editor, targets)
	{
		/*
		var modifications = {};
		// do not use operation, as we can call editor.modifyObjectsRenderOptions directly
		if (this.getFontNameBox().getIsDirty())
			modifications.fontFamily = this.getFontNameBox().getValue() || null;
		if (this.getFontSizeBox().getIsDirty())
			modifications.fontSize = this.getFontSizeBox().getValue() || null;
		editor.modifyObjectsRenderOptions(targets, modifications, false, true);
		*/
	}
});

var OMM = Kekule.Editor.ObjModifierManager;
OMM.register(Kekule.ChemObject, [Kekule.Editor.ObjModifier.RichText]);

})();
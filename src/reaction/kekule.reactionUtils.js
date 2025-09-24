/**
 * @fileoverview
 * This file contains util classes and functions about chem document.
 * @author Partridge Jiang
 */

/*
 * requires /lan/classes.js
 * requires /core/kekule.common.js
 * requires /core/kekule.structures.js
 * requires /core/kekule.chemReactions.js
 * requires /core/kekule.glyph.chemGlyphs.js
 */

// consts for reaction arrangements
Kekule.ReactionLayoutXMode = {
    LtoR: 1,
    RtoL: -1
};
Kekule.ReactionLayoutYMode = {
    BtoT: 1,
    TtoB: -1
};
Kekule.ReactionObjectAlign = {
    LEFT: 1,
    RIGHT: 2,
    TOP: 3,
    BOTTOM: 4,
    CENTER: 5
};

// reaction extraction global options
Kekule.globalOptions.add('reaction', {
    // options for extracting reaction (chains) from chem document
    extraction: {
        ignoredReactionArrowTypes: null,  // default is [Kekule.Glyph.ReactionArrowType.RETROSYNTHESIS], but since Kekule.Glyph.ReactionArrowType is defined after this, we can not use it directly here
        substanceGapLengthThresholdRatioToDocRefLength: 3,
        reactionArrowPerpendicularExpansionRatioToDocRefLength: 1/2,
        reactionArrowHorizontalExpansionRationToDocRefLength: 3,
        reactionSortRefLengthRatioToDocRefLength: 1,
        reactionSortXMode: Kekule.ReactionLayoutXMode.LtoR,
        reactionSortYMode: Kekule.ReactionLayoutYMode.TtoB,
        reactionSortAxisWeightRatioXY: 1/5,
        enableSiblingMerging: true,
        enableMergeSharedProductAndReactant: true,
        enableMergeOnProductOmission: true,
        insertImplicitIntermediate: false
    },
    // options for auto-layout of reaction to chem object
    layout: {
        reactionGapLengthRatioToDocRefLength: 0.5,     // gap between two reactions
        substancePrimaryGapLengthRatioToDocRefLength: 0.5,  // gap of substances in primary direction  (e.g. between reactants and roducts)
        substanceSecondaryGapLengthRatioToDocRefLength: 0.5,  // gap of substances in secondary direction (e.g. between reagents)
        plusSymbolSizeRatioToDocRefLength: 1,
        reactionArrowMinSizeRatioToDocRefLength: 1.5,
        reactionArrowPaddingRatioToDocRefLength: 0.5,  // the reaction arrow should be longer than any of the reagents
        layoutXMode: Kekule.ReactionLayoutXMode.LtoR,
        layoutYMode: Kekule.ReactionLayoutYMode.TtoB,
        primaryAxis: 'x',
        mainSubstancePrimaryAxisAlignMode: Kekule.ReactionObjectAlign.LEFT,  // reactants and products
        mainSubstanceSecondaryAxisAlignMode: Kekule.ReactionObjectAlign.CENTER,
        // assocSubstancePrimaryAxisAlignMode: Kekule.ReactionObjectAlign.CENTER,
        // assocSubstanceSecondaryAxisAlignMode: Kekule.ReactionObjectAlign.CENTER,
        assocSubstanceAlignMode: Kekule.ReactionObjectAlign.CENTER,  // reagents above or below reaction arrow, only consider align in the primary axis direction
        assocSubstanceStackOnPrimaryAxis: true,   // if false, multiple assoc substances will to layout in secondary axis (e.g., primary is x, assoc substances will be layouted from/to top/bottom)
        singleLine: false   // if true, multiple reactions will be layout to one line rather than multiple lines
        // reactionInlineBlockAlignMode: Kekule.ReactionObjectAlign.BASELINE  // in single line mode, the multiple reaction box align mode. Default base line means the arrow position in secondary axis is same.
    }
});

/**
 * Utility functions for extraction chemical reactions from chem document.
 * @namespace
 */
Kekule.ReactionExtractionUtils = {
    _getReactionArrowsInDoc: function(chemDoc)
    {
        return chemDoc.filterChildren(function(child) {
            // var ignoredTypes = [Kekule.Glyph.ReactionArrowType.RESONANCE, Kekule.Glyph.ReactionArrowType.RETROSYNTHESIS];
            var ignoredTypes = Kekule.globalOptions.reaction.extraction.ignoredReactionArrowTypes || [Kekule.Glyph.ReactionArrowType.RETROSYNTHESIS];
            return (child instanceof Kekule.Glyph.ReactionArrow) && (ignoredTypes.indexOf(child.getReactionType()) < 0);
        }, true);
    },
    _getPlusSymbolsInDoc: function(chemDoc)
    {
        return chemDoc.filterChildren(function(child) {
            return (child instanceof Kekule.Glyph.PlusSymbol);
        }, true);
    },
    _getMoleculesInDoc: function(chemDoc)
    {
        return chemDoc.filterChildren(function(child) {
            return (child instanceof Kekule.Molecule);
        }, true);
    },
    _fillMoleculeGeometryMap: function(map, chemDoc, molecules, containerBoxLengthThreshold, expandedContainerBoxExpansion, normalContainerBoxExpansionRatio)
    {
        if (normalContainerBoxExpansionRatio === undefined)
            normalContainerBoxExpansionRatio = 1/100;    // expand the container box a little, let it easier to intersect with arrow line
        var result = map;  // new Kekule.MapEx();
        for (var i = 0, l = molecules.length; i < l; ++i)
        {
            var containerBox = molecules[i].getExposedContainerBox ? molecules[i].getExposedContainerBox(Kekule.CoordMode.COORD2D) : molecules[i].getContainerBox(Kekule.CoordMode.COORD2D);
            var centerCoord = {
                x: (containerBox.x1 + containerBox.x2) / 2,
                y: (containerBox.y1 + containerBox.y2) / 2
            };

            // if container box is quite small in width or height, we expand it a little to check whether it is intersect with reaction arrow line
            var expanded = false;
            var expandedContainerBox = containerBox;
            if (containerBox.y2 - containerBox.y1 < containerBoxLengthThreshold)  // expand in y direction
            {
                expandedContainerBox = Kekule.BoxUtils.inflateBox(expandedContainerBox, 0, expandedContainerBoxExpansion / 2);
                expanded = true;
            }
            if (containerBox.x2 - containerBox.x1 < containerBoxLengthThreshold)  // expand in x direction
            {
                expandedContainerBox = Kekule.BoxUtils.inflateBox(expandedContainerBox, expandedContainerBoxExpansion / 2, 0);
                expanded = true;
            }

            if (normalContainerBoxExpansionRatio)  // expand the container box a little, let it easier to intersect with arrow line
                containerBox = Kekule.BoxUtils.inflateBox(containerBox,
                    (containerBox.x2 - containerBox.x1) * normalContainerBoxExpansionRatio / 2,
                    (containerBox.y2 - containerBox.y1) * normalContainerBoxExpansionRatio / 2);

            result.set(molecules[i], {
                containerBox: containerBox,
                expandedContainerBox: expanded? expandedContainerBox: null,
                centerCoord: centerCoord,
                refLength: Math.max(Math.abs(containerBox.x2 - containerBox.x1), Math.abs(containerBox.y2 - containerBox.y1))
            });
        }
        return result;
    },
    _fillSymbolGeometryMap: function(map, chemDoc, glyphSymbols)
    {
        var result = map; // new Kekule.MapEx();
        for (var i = 0, l = glyphSymbols.length; i < l; ++i)
        {
            var containerBox = glyphSymbols[i].getExposedContainerBox ? glyphSymbols[i].getExposedContainerBox(Kekule.CoordMode.COORD2D) : glyphSymbols[i].getContainerBox(Kekule.CoordMode.COORD2D);
            var centerCoord = {
                x: (containerBox.x1 + containerBox.x2) / 2,
                y: (containerBox.y1 + containerBox.y2) / 2
            };
            result.set(glyphSymbols[i], {
                containerBox: containerBox,
                centerCoord: centerCoord
            });
        }
        return result;
    },
    _isContainerBoxEmpty: function(containerBox)
    {
        return !containerBox
            || (Kekule.NumUtils.isFloatEqual(containerBox.x1 - containerBox.x2, 0)
                && Kekule.NumUtils.isFloatEqual(containerBox.y1 - containerBox.y2, 0));
    },

    _getObjDetailNeighborEx: function(reactionInfo, objDetailOrIndex, substanceType, direction, candidateDetails, initialStep)
    {
        var molDetails = reactionInfo[substanceType + 'Details'];
        var currMolDetail, molIndex;
        var dir = direction || 1;
        if (typeof(objDetailOrIndex) === 'object')
        {
            currMolDetail = objDetailOrIndex;
            molIndex = molDetails.indexOf(currMolDetail);
        }
        else
        {
            molIndex = objDetailOrIndex;
            currMolDetail = molDetails[molIndex];
        }
        if (!currMolDetail || molIndex < 0)
            return {};

        var step = (substanceType === 'reactant')? 1:
            (substanceType === 'product')? -1:
                (substanceType === 'reagent')? (currMolDetail.onTop? 1: -1): null;
        if (!step)
            return {};

        step *= dir;

        var neighborIndex = molIndex + step;
        var neighborDetail = molDetails[neighborIndex];
        if (substanceType === 'reagent' && neighborDetail && neighborDetail.onTop !== currMolDetail.onTop)
            neighborDetail = null;

        // if neighbor not in candidate list, check neighbor's neighbor
        if (candidateDetails && neighborDetail && candidateDetails.indexOf(neighborDetail) < 0)
            return RU._getObjDetailNeighborEx(reactionInfo, neighborDetail, substanceType, dir, candidateDetails, (initialStep || 0) + step);

        return {neighborDetail: neighborDetail, step: step};
    },
    _getObjDetailNeighbor: function(reactionInfo, objDetailOrIndex, substanceType, direction, candidateDetails)
    {
        var neighborEx = RU._getObjDetailNeighborEx(reactionInfo, objDetailOrIndex, substanceType, direction, candidateDetails, 0);
        return neighborEx && neighborEx.neighborDetail;
    },

    _getObjDetailDistanceToNeighborOrReactionArrowEx: function(reactionInfo, objDetailOrIndex, substanceType, candidatedDetails)
    {
        var molDetails = reactionInfo[substanceType + 'Details'];
        var currMolDetail, molIndex;
        if (typeof(objDetailOrIndex) === 'object')
        {
            currMolDetail = objDetailOrIndex;
            molIndex = molDetails.indexOf(currMolDetail);
        }
        else
        {
            molIndex = objDetailOrIndex;
            currMolDetail = molDetails[molIndex];
        }
        if (!currMolDetail || molIndex < 0)
            return null;

        /*
        var step = (substanceType === 'reactant')? 1:
            (substanceType === 'product')? -1:
            (substanceType === 'reagent')? (currMolDetail.onTop? 1: -1): null;
        if (!step)
            return null;

        var neighborIndex = molIndex + step;
        var neighborMolDetail = molDetails[neighborIndex];
        if (substanceType === 'reagent' && neighborMolDetail && neighborMolDetail.onTop !== currMolDetail.onTop)
            neighborMolDetail = null;
        */
        var neighborDetailEx = RU._getObjDetailNeighborEx(reactionInfo, objDetailOrIndex, substanceType, null, candidatedDetails);
        var neighborDetail = neighborDetailEx.neighborDetail;

        var distance;
        if (substanceType === 'reagent')
        {
            if (neighborDetail)
                distance = Math.min(currMolDetail.distanceToArrow, Kekule.CoordUtils.getDistance(currMolDetail.centerCoord, neighborDetail.centerCoord));
            else
                distance = currMolDetail.distanceToArrow;  //  currMolDetail.distanceToArrowCenter;

            /*
            distance = neighborDetail ?
                (Math.abs(currMolDetail.distance - neighborDetail.distance)) :
                currMolDetail.distance;
            */
        }
        else  // product and reactant
        {
            distance = neighborDetail?
                (Math.abs((currMolDetail.distance - currMolDetail.crossLengthOnReactionArrowLine / 2) - (neighborDetail.distance + neighborDetail.crossLengthOnReactionArrowLine / 2))):
                currMolDetail.distance - currMolDetail.crossLengthOnReactionArrowLine / 2;
        }
        return {
            distance: distance,
            neighborDetail: neighborDetail,
            neighborStep: neighborDetailEx.step   // step distance to objDetail
        };
    },
    _getObjDetailDistanceToNeighborOrReactionArrow: function(reactionInfo, objDetailOrIndex, substanceType, candidatedDetails)
    {
        return RU._getObjDetailDistanceToNeighborOrReactionArrowEx(reactionInfo, objDetailOrIndex, substanceType, candidatedDetails).distance;
    },

    _getObjDetailOverlapsEx: function(objDetails1, objDetails2, options)
    {
        var ops = options || {};
        var calcDistancesToCenter = ops.calcDistancesToCenter;

        var overlaps = [];
        var overlapsWithExtra = [];
        for (var i = 0, l = objDetails1.length; i < l; ++i)
        {
            var objDetail1 = objDetails1[i];
            for (var j = 0, k = objDetails2.length; j < k; ++j)
            {
                var objDetail2 = objDetails2[j];
                if (objDetail2.object === objDetail1.object)
                {
                    overlaps.push(objDetail1.object);
                    if (calcDistancesToCenter)
                    {
                        overlapsWithExtra.push({
                            object: objDetail1.object,
                            distances: [
                                objDetail1.distance,
                                objDetail2.distance
                            ]
                        });
                    }
                }
            }
        }

        var result = { overlaps: overlaps };
        if (calcDistancesToCenter)
            result.overlapsWithExtra = overlapsWithExtra;

        if (ops.checkUnoverlaps)
        {
            var Unoverlaps = [[], []];
            for (var i = 0, l = objDetails1.length; i < l; ++i)
            {
                if (overlaps.indexOf(objDetails1[i].object) < 0)
                    Unoverlaps[0].push(objDetails1[i]);
            }
            for (var i = 0, l = objDetails2.length; i < l; ++i)
            {
                if (overlaps.indexOf(objDetails2[i].object) < 0)
                    Unoverlaps[0].push(objDetails2[i]);
            }
            result.unoverlapDetails = Unoverlaps;
        }

        return result;
    },
    _getReactionDetailOverlapsEx: function(reactionInfo1, reactionInfo2, checkedSubstanceTypes, options)
    {
        if (!checkedSubstanceTypes)
            checkedSubstanceTypes = ['reactant', 'product', 'reagent'];

        var reactionComponentDetails1 = [];
        var reactionComponentDetails2 = [];
        for (var i = 0, l = checkedSubstanceTypes.length; i < l; ++i)
        {
            var substanceType = checkedSubstanceTypes[i];
            var substanceDetails1 = reactionInfo1[substanceType + 'Details'];
            var substanceDetails2 = reactionInfo2[substanceType + 'Details'];
            reactionComponentDetails1 = reactionComponentDetails1.concat(substanceDetails1);
            reactionComponentDetails2 = reactionComponentDetails2.concat(substanceDetails2);
        }
        return RU._getObjDetailOverlapsEx(reactionComponentDetails1, reactionComponentDetails2, options);
    },
    _getReactionDetailOverlaps: function(reactionInfo1, reactionInfo2, checkedSubstanceTypes)
    {
        return RU._getReactionDetailOverlapsEx(reactionInfo1, reactionInfo2, checkedSubstanceTypes).overlaps;
    },

    _getSubstanceTypeInReactionInfo: function(reactionInfo, object, checkedSubstanceTypes)
    {
        var molDetail = this._getObjDetailsInReactionInfo(object, reactionInfo, checkedSubstanceTypes);
        return molDetail && molDetail.substanceType;
    },

    _getObjDetailsInReactionInfo: function(object, reactionInfo, checkedSubstanceTypes)
    {
        if (!checkedSubstanceTypes)
            checkedSubstanceTypes = ['reactant', 'product', 'reagent'];
        for (var i = 0, l = checkedSubstanceTypes.length; i < l; ++i)
        {
            var substanceType = checkedSubstanceTypes[i];
            var fieldName = substanceType + 'Details';
            var field = reactionInfo[fieldName];
            for (var j = 0, k = field.length; j < k; ++j)
            {
                if (field[j].object === object)
                {
                    return field[j];
                }
            }
        }
        return null;
    },

    _removeObjFromReactionInfo: function(object, reactionInfo, checkedSubstanceTypes)
    {
        if (!checkedSubstanceTypes)
            checkedSubstanceTypes = ['reactant', 'product', 'reagent'];
        for (var i = 0, l = checkedSubstanceTypes.length; i < l; ++i)
        {
            var substanceType = checkedSubstanceTypes[i];
            var fieldName = substanceType + 'Details';
            var field = reactionInfo[fieldName];
            for (var j = field.length - 1; j >= 0; --j)
            {
                if (field[j].object === object)
                {
                    field.splice(j, 1);
                    return;
                }
            }
        }
    },

    _getPossibleReactionRelationWithOverlappingObject: function(reactionInfo1, reactionInfo2, overlappingObject, objDetails1, objDetails2)
    {
        if (!objDetails1)
            objDetails1 = RU._getObjDetailsInReactionInfo(overlappingObject, reactionInfo1);
        if (!objDetails2)
            objDetails2 = RU._getObjDetailsInReactionInfo(overlappingObject, reactionInfo2);

        var objSharable = false;
        var possibleReactionRelation = null;  // 0: parallel reaction sharing reactant, -1: reaction1 -> reaction2, 1: reaction2 -> reaction1, null: no relation
        if (objDetails1 && objDetails2)
        {
            if (objDetails1.substanceType === 'reactant' && objDetails2.substanceType !== 'reagent')
            {
                objSharable = true;
                possibleReactionRelation = (objDetails2.substanceType === 'product')? 1: 0;
            }
            else if (objDetails2.substanceType === 'reactant' && objDetails1.substanceType !== 'reagent')
            {
                objSharable = true;
                possibleReactionRelation = (objDetails1.substanceType === 'product')? -1: 0;
            }
        }
        return {
            objSharable: objSharable,
            possibleReactionRelation: possibleReactionRelation // 0: parallel reaction sharing reactant, -1: reaction1 -> reaction2, 1: reaction2 -> reaction1
        };
    },
    _getPossibleReactionRelationWithOverlappingMoleculeSet: function(reactionInfo1, reactionInfo2, overlappingObjects)
    {
        var result;
        for (var i = 0, l = overlappingObjects.length; i < l; ++i)
        {
            var possibleRelationOnCurr = RU._getPossibleReactionRelationWithOverlappingObject(reactionInfo1, reactionInfo2, overlappingObjects[i]);
            if (result && (result.objSharable !== possibleRelationOnCurr.objSharable || result.possibleReactionRelation !== possibleRelationOnCurr.possibleReactionRelation))
                throw 'Reaction relation can not be calculated';    // TODO: relation not match on different molecule, temporarily throw a exception
            else
                result = possibleRelationOnCurr;
        }
        return result.possibleReactionRelation;
    },

    // decide the overlapping molecule belongs to which reaction
    _getOverlappingObjectArrangementInfo: function(reactionInfo1, reactionInfo2, object, unoverlappedDetails, objGeometryMap)
    {
        var getCoordRelPosToLines = function(coord, lineParamsList)
        {
            var result = [];
            for (var i = 0, l = lineParamsList.length; i < l; ++i)
            {
                var relPos = Kekule.GeometryUtils.getPointRelPositionToLine(coord, lineParamsList[i]);
                result.push(relPos);
            }
            return result;
        };
        var isReactantOrProductMolNeighboringToPlusSymbol = function(reactionInfo, objDetail) {
            if (objDetail.substanceType !== 'reactant' && objDetail.substanceType !== 'product')
                return false;
            if (!(objDetail.object instanceof Kekule.Molecule))
                return false;
            // get the next neighbor
            var neighborDetail = RU._getObjDetailNeighbor(reactionInfo, objDetail, objDetail.substanceType, null, null);
            var result = neighborDetail && (neighborDetail.object instanceof Kekule.Glyph.PlusSymbol);
            return result;
        }

        // var moleculeInShareZone = false;
        // var molBelongReaction = null;

        // var molGeoInfo = molGeometryMap.get(molecule);
        var objDetails1 = RU._getObjDetailsInReactionInfo(object, reactionInfo1);
        var objDetails2 = RU._getObjDetailsInReactionInfo(object, reactionInfo2);

        var normalLineParamsList = [reactionInfo1.arrowDetails.normalLineEquationParams, reactionInfo2.arrowDetails.normalLineEquationParams];

        // 计算两个反应箭头的共享区域与独享区域，作两个反应箭头中点出发的法线。
        // 此外分子类型也与能否共享相关。一反应的产物可共享为另一反应的反应物，或两反应共享反应物，但两反应不能共享产物。至于Reagent，均不视作可共享。
        /*
                [molType1/molType2]   reactant    product   reagent
                reactant                Y           Y           N
                product                 Y           N           N
                reagent                 N           N           N
         */
        // 若两反应共享reactant，则两反应箭头起点必须处于同一法线分隔区域中才行。

        var possibleRelationResult = RU._getPossibleReactionRelationWithOverlappingObject(reactionInfo1, reactionInfo2, object, objDetails1, objDetails2);
        var objSharable = possibleRelationResult.objSharable;
        var possibleReactionRelation = possibleRelationResult.possibleReactionRelation;

        // further check
        if (possibleReactionRelation === 0)  // may share reactant
        {
            // 若共享反应物，则要求两反应箭头的起点位于法线分隔的同一区域中
            // var molRelPositions = getCoordRelPosToLines(molGeoInfo.centerCoord, normalLineParamsList);
            var reaction1StartingPointRelPositions = getCoordRelPosToLines(reactionInfo1.arrowDetails.coords[0], normalLineParamsList);
            var reaction2StartingPointRelPositions = getCoordRelPosToLines(reactionInfo2.arrowDetails.coords[0], normalLineParamsList);
            if (reaction1StartingPointRelPositions[0] !== reaction2StartingPointRelPositions[0] || reaction1StartingPointRelPositions[1] !== reaction2StartingPointRelPositions[1])
                objSharable = false;
        }

        var result = {sharable: objSharable};
        if (!objSharable)
        {
            /*
            // reagent has the lowest priority
            if (objDetails1.substanceType === 'reagent' && objDetails2.substanceType !== 'reagent')
            {
                result.belongedReactionIndex = 1;
                result.belongedReactionInfo = reactionInfo2;
            }
            else if (objDetails1.substanceType !== 'reagent' && objDetails2.substanceType === 'reagent')
            {
                result.belongedReactionIndex = 0;
                result.belongedReactionInfo = reactionInfo1;
            }
            else
            */

            // 检查反应物或产物分子是否与 + 相邻，若是，则 molecule 属于 + 所在反应
            var reactantOrProductNeighboringPlusSymbol1 = isReactantOrProductMolNeighboringToPlusSymbol(reactionInfo1, objDetails1);
            var reactantOrProductNeighboringPlusSymbol2 = isReactantOrProductMolNeighboringToPlusSymbol(reactionInfo2, objDetails2);

            if (reactantOrProductNeighboringPlusSymbol1 && !reactantOrProductNeighboringPlusSymbol2)
            {
                result.belongedReactionIndex = 0;
                result.belongedReactionInfo = reactionInfo1;
            }
            else if (reactantOrProductNeighboringPlusSymbol2 && !reactantOrProductNeighboringPlusSymbol1)
            {
                result.belongedReactionIndex = 1;
                result.belongedReactionInfo = reactionInfo2;
            }
            else
            {
                // /* 计算分子与两个反应箭头中点的距离，较近者拥有此分子 */
                // if (molDetails2.distance < molDetails1.distance)
                // 计算分子与不共享的临近分子的距离，较近者拥有此分子
                // /* 注意此时分子在两个反应中，要么都是反应物，要么都是产物 */
                var distanceInfoToNeighbor1 = RU._getObjDetailDistanceToNeighborOrReactionArrowEx(reactionInfo1, objDetails1, objDetails1.substanceType, unoverlappedDetails[0]);
                var distanceInfoToNeighbor2 = RU._getObjDetailDistanceToNeighborOrReactionArrowEx(reactionInfo2, objDetails2, objDetails2.substanceType, unoverlappedDetails[1]);
                var distanceToNeighbor1 = distanceInfoToNeighbor1.distance;
                var distanceToNeighbor2 = distanceInfoToNeighbor2.distance;
                if (distanceToNeighbor2 < distanceToNeighbor1)
                {
                    result.belongedReactionIndex = 1;
                    result.belongedReactionInfo = reactionInfo2;
                }
                else
                {
                    result.belongedReactionIndex = 0;
                    result.belongedReactionInfo = reactionInfo1;
                }
            }
        }
        else
        {
            result.reactionRelation = possibleReactionRelation;
        }
        return result;

        /*
        var reactionArrowCrossPoint = Kekule.GeometryUtils.getCrossPointOfLines(
            reactionInfo1.arrowDetails.coords[0], reactionInfo1.arrowDetails.coords[1],
            reactionInfo2.arrowDetails.coords[0], reactionInfo2.arrowDetails.coords[0],
            true, true
        );


        if (!reactionArrowCrossPoint)
        {
            // 两箭头平行无交点，则两法线分隔为三区域，中间区域共享，两端区域独享
        }
        else
        {
            // 两箭头（延长线）相交，此时二法线将平面分隔为四个区域。该交点所处的区域即为两个反应的共享区域，其余区域均为独享。
        }
        */

        /*
        {
            // calc the delta of two reaction arrow centers
            // if delta.x < 0, means reactionArrow2 is on the left side of reactionArrow1; otherwise on the right side
            // if delta.y < 0, means reactionArrow1 is on the top side of reactionArrow1; otherwise on the bottom side
            var reactionArrowCenterCoordDelta = Kekule.CoordUtils.substract(reactionInfo2.arrowDetails.centerCoord, reactionInfo1.arrowDetails.centerCoord);



            var molGeometryInfo = molGeometryMap.get(molecule);
            var molCenterCoord = molGeometryInfo.centerCoord;





            // 直线l：Ax+By+C=0分坐标平面为两个半平面：一个半平面内的点的坐标满足不等式 Ax+By+C>0；另一个半平面内的点的坐标满足不等式Ax+By+C<0
            var molCenterRelPositions = getCoordRelPosToLines(molCenterCoord, normalLineParamsList);

            if (molCenterRelPositions[0] === 0)
            {
                // on normal line 1, belongs to reaction 1

            }
            else if (molCenterRelPositions[1] === 0)
            {
                // on normal line 2, belongs to reaction 2
            }
            else if (Math.sign(molCenterRelPositions[0]) !== Math.sign(molCenterRelPositions)[1])
            {
                // on sharing zone?
                var reactionArrowCommonCenterCoord = Kekule.CoordUtils.getCenter([reactionInfo1.centerCoord, reactionInfo2.centerCoord]);
                var reactionArrowCommonCenterCoordRelPositions = getCoordRelPosToLines(reactionArrowCommonCenterCoord, normalLineParamsList);
                if ((Math.sign(reactionArrowCommonCenterCoordRelPositions[0]) === Math.sign(molCenterRelPositions[0]))
                    && (Math.sign(reactionArrowCommonCenterCoordRelPositions[1]) === Math.sign(molCenterRelPositions[1])))
                {
                    // belongs to sharing zone
                    moleculeInShareZone = true;
                }
                else
                {
                    // belongs to opposite region of sharing zone
                }
            }
            else
            {
                // 在两条法线的同一侧，属于某一反应
            }
        }

        if (!moleculeInShareZone)
        {
            // decide the molecule belongs to which reaction

        }
        */
    },

    _calcReactionChainGeometry: function(reactionInfos, objGeometryMap, options)
    {
        var result = {};
        // consider reactant and product only, bypass reagents
        var objCenterCoordSum = {};
        var objCenterCount = 0;
        var geoObjs = [];
        for (var i = 0, l = reactionInfos.length; i < l; ++i)
        {
            var reactionInfo = reactionInfos[i];
            geoObjs = geoObjs.concat(reactionInfo.reactantDetails).concat(reactionInfo.productDetails);
            objCenterCoordSum = Kekule.CoordUtils.add(objCenterCoordSum, reactionInfo.arrowDetails.centerCoord);
            ++objCenterCount;
        }
        for (var i = 0, l = geoObjs.length; i < l; ++i)
        {
            var obj = geoObjs[i].object;
            var objGeometryInfo = objGeometryMap.get(obj);
            if (objGeometryInfo)
            {
                result.containerBox = Kekule.BoxUtils.getContainerBox(objGeometryInfo.containerBox, result);
                objCenterCoordSum = Kekule.CoordUtils.add(objCenterCoordSum, objGeometryInfo.centerCoord);
                ++objCenterCount;
            }
        }
        result.centerCoord = Kekule.CoordUtils.divide(objCenterCoordSum, objCenterCount);
        return result;
    },

    _extractReactionInfoFromChemDocument: function(chemDoc, reactionArrow, plusSymbols, targetMolecules, objGeometryMap, options)
    {
        var ops = options || {};
        // var cloneMolecules = (ops.cloneMolecules === undefined)? true: !!ops.cloneMolecules;
        var calcContainerBoxes = ops.calcContainerBoxes || false;

        if (!reactionArrow)
        {
            reactionArrow = RU._getReactionArrowsInDoc(chemDoc)[0];
        }
        if (!reactionArrow)
            return null;

        if (!plusSymbols)
        {
            plusSymbols = RU._getPlusSymbolsInDoc(chemDoc);
        }

        var arrowCoords = [];
        for (var i = 0, l = reactionArrow.getNodeCount(); i < l; ++i)
        {
            var endNode = reactionArrow.getNodeAt(i);
            arrowCoords.push(endNode.getAbsCoord2D());
        }
        var arrowCenterCoord = Kekule.CoordUtils.getCenter(arrowCoords);
        var reactionContainerBox = Kekule.BoxUtils.createBox(arrowCoords[0], arrowCoords[1]);  // the large container box to be contain all reaction components
        var reactantContainerBox, productContainerBox, reagentContainerBox;

        // normal line cross to arrow
        var arrowNormalLineCoords = [
            {x: -(arrowCoords[0].y - arrowCenterCoord.y) + arrowCenterCoord.x, y: (arrowCoords[0].x - arrowCenterCoord.x) + arrowCenterCoord.y},
            {x: -(arrowCoords[1].y - arrowCenterCoord.y) + arrowCenterCoord.x, y: (arrowCoords[1].x - arrowCenterCoord.x) + arrowCenterCoord.y}
        ];
        var arrowNormalLineEquationParams = Kekule.GeometryUtils.getLineGeneralEquationParams(arrowNormalLineCoords[0], arrowNormalLineCoords[1]);
        var arrowStartingPointRelPositionToNormalLine = Kekule.GeometryUtils.getPointRelPositionToLine(arrowCoords[0], arrowNormalLineEquationParams);

        /*
        var arrowBox = reactionArrow.getExposedContainerBox? reactionArrow.getExposedContainerBox(): reactionArrow.getContainerBox();
        var arrowCoords = [
            {x: arrowBox.x1, y: arrowBox.y1},
            {x: arrowBox.x2, y: arrowBox.y2}
        ];
        */

        var arrowLength = Kekule.CoordUtils.getDistance(arrowCoords[0], arrowCoords[1]);
        var arrowDirection = Math.sign(arrowCoords[1].x - arrowCoords[0].x || arrowCoords[1].y - arrowCoords[0].y);
        var arrowNormalLineDirection = Math.sign(arrowNormalLineCoords[1].x - arrowNormalLineCoords[0].x || arrowNormalLineCoords[1].y - arrowNormalLineCoords[0].y);
        /*
        var arrowCoordDelta = Kekule.CoordUtils.substract(arrowCoords[1], arrowCoords[0]);
        var arrowPrimaryAxis = (Math.abs(arrowCoordDelta.y) > Math.abs(arrowCoordDelta.x))? 'y': 'x';
        */


        var reactionAutoRefLength = arrowLength;
        // some geometry params
        // TODO: current fixed ratio
        var reactionArrowPerpendicularExpansionRatio = ops.reactionArrowPerpendicularExpansionRatio || 0.6;  // TODO: currently the default ratio is fixed
        var reactionArrowHorizontalExpansionRatio = 1 + (ops.reactionArrowHorizontalExpansionRatio || 0.6); // TODO: currently the default ratio is fixed
        var substanceGapThreshold = ops.substanceGapLengthThreshold || (reactionAutoRefLength * 2);  // substance faraway larger than this distance will not be regarded as reaction component
        var reactionArrowPerpendicularExpansion = ops.reactionArrowPerpendicularExpansion || reactionAutoRefLength * reactionArrowPerpendicularExpansionRatio;
        var reactionArrowHorizontalExpansion = ops.reactionArrowHorizontalExpansion || reactionAutoRefLength * reactionArrowHorizontalExpansionRatio;

        var calcPointRelationInfoToReactionArrowLine = function(pointCoord, perpendicularCrossPointCoord)
        {
            if (!perpendicularCrossPointCoord)
                perpendicularCrossPointCoord = Kekule.GeometryUtils.getPerpendicularCrossPointFromCoordToLine(objCenterCoord, arrowCoords[0], arrowCoords[1], true);
            var perpendicularDistance = Kekule.CoordUtils.getDistance(pointCoord, perpendicularCrossPointCoord);
            if (perpendicularDistance * 2 < reactionArrowPerpendicularExpansion)
            {
                // inside the expansion area of reaction arrow in horizontal direction, should be a substance of reaction
                crossPointDirection = Math.sign((perpendicularCrossPointCoord.x - arrowCenterCoord.x) || (perpendicularCrossPointCoord.y - arrowCenterCoord.y));
                objInReactionArrowHorizontalDirection = true;
                distance = Kekule.CoordUtils.getDistance(perpendicularCrossPointCoord, arrowCenterCoord);
                return {
                    inReactionArrowHorizontalDirection: objInReactionArrowHorizontalDirection,
                    crossPointDirection: crossPointDirection,
                    distance: distance,
                    perpendicularDistance: perpendicularDistance
                }
            }
            else
                return { inReactionArrowHorizontalDirection: false }
        }

        var molecules = targetMolecules || RU._getMoleculesInDoc(chemDoc);
        var molAndPlusSymbols = [].concat(molecules).concat(plusSymbols);  // we mix the plus symbol and molecule, since they acts similar in reactants and products (but not in reagents)
        // var molContainerBoxes = [];
        var reactantDetails = [], productDetails = [], reagentDetails = [];
        for (var i = 0, l = molAndPlusSymbols.length; i < l; ++i) {
            var currObj = molAndPlusSymbols[i];
            var objInReactionArrowHorizontalDirection = false;
            var objInReactionArrowVerticalDirection = false;
            var crossPointDirection, crossPointToNormalLineDirection;


            var containerBox, expandedContainerBox, objCenterCoord;
            if (!(currObj instanceof Kekule.Glyph.PlusSymbol))  // currObj is molecule
            {
                var molGeometryInfo = objGeometryMap.get(currObj);
                containerBox = molGeometryInfo.containerBox;
                expandedContainerBox = molGeometryInfo.expandedContainerBox;
                objCenterCoord = molGeometryInfo.centerCoord;
                reactionAutoRefLength = Math.max(reactionAutoRefLength, molGeometryInfo.refLength);
            }
            else  // currObj is plus symbol
            {
                var symbolGeometryInfo = objGeometryMap.get(currObj);
                containerBox = symbolGeometryInfo.containerBox;   // we regard the plus symbol as a single point
                objCenterCoord = symbolGeometryInfo.centerCoord;
            }

            var distance = null, distanceOnNormalLine = null, perpendicularDistance = null, crossLengthOnReactionArrowLine = null;

            // check if molecule is on the horizontal direction of arrow line, if so, it may be a reactant or product
            var perpendicularCrossPointCoord = Kekule.GeometryUtils.getPerpendicularCrossPointFromCoordToLine(objCenterCoord, arrowCoords[0], arrowCoords[1], true);
            if (RU._isContainerBoxEmpty(containerBox) || !(currObj instanceof Kekule.Molecule))
            {
                // plus symbol or molecule with no ctab (but with formula), we need to handle it in another way.
                var relationInfo = calcPointRelationInfoToReactionArrowLine(objCenterCoord, perpendicularCrossPointCoord);
                if (relationInfo.inReactionArrowHorizontalDirection)
                {
                    objInReactionArrowHorizontalDirection = true;
                    crossPointDirection = relationInfo.crossPointDirection;
                    distance = relationInfo.distance;
                    perpendicularDistance = relationInfo.perpendicularDistance;
                }
            }
            else
            {
                // molecule with ctab and container box, check if the reaction arrow line direction crosses the box four edges
                var crossPoints = Kekule.GeometryUtils.getCrossPointsOfLineAndBox(arrowCoords, containerBox, true);
                if (!crossPoints || !crossPoints.length)
                {
                    // here we expand the box to the normal line direction by reactionArrowPerpendicularExpansion,
                    // to allow some very small molecule to be regarded as reactant or product
                    if (expandedContainerBox)
                        crossPoints = Kekule.GeometryUtils.getCrossPointsOfLineAndBox(arrowCoords, expandedContainerBox, true);
                    /*
                    var expandedContainerBox = containerBox;
                    if (containerBox.y2 - containerBox.y1 < reactionArrowPerpendicularExpansion)  // expand in y direction
                        expandedContainerBox = Kekule.BoxUtils.inflateBox(expandedContainerBox, 0, reactionArrowPerpendicularExpansion / 2);
                    if (containerBox.x2 - containerBox.x1 < reactionArrowPerpendicularExpansion)  // expand in x direction
                        expandedContainerBox = Kekule.BoxUtils.inflateBox(expandedContainerBox, reactionArrowPerpendicularExpansion / 2, 0);
                    crossPoints = Kekule.GeometryUtils.getCrossPointsOfLineAndBox(arrowCoords, expandedContainerBox, true);
                    */
                }

                if (crossPoints && crossPoints.length)
                {
                    // molecule containing box intersecting with the line direction of arrow should be the reactant and product
                    var crossPointCenter = Kekule.CoordUtils.getCenter(crossPoints);
                    crossLengthOnReactionArrowLine = (crossPoints.length > 1)? Kekule.CoordUtils.getDistance(crossPoints[0], crossPoints[1]): 0;
                    distance = Kekule.CoordUtils.getDistance(crossPointCenter, arrowCenterCoord);
                    /*
                    var crossPointDirectionX = crossPointCenter.x - arrowCenterCoord.x;
                    var crossPointDirectionY = crossPointCenter.y - arrowCenterCoord.y;
                    if (arrowPrimaryAxis === 'y')
                        crossPointDirection = Math.sign(crossPointDirectionY || crossPointDirectionX);
                    else
                        crossPointDirection = Math.sign(crossPointDirectionX || crossPointDirectionY);
                    */
                    var crossPointRelPositionToArrowNormalLine = Kekule.GeometryUtils.getPointRelPositionToLine(crossPointCenter, arrowNormalLineEquationParams);
                    if (crossPointRelPositionToArrowNormalLine === arrowStartingPointRelPositionToNormalLine)
                        crossPointDirection = -arrowDirection;  // on contrast to the direction of arrow line
                    else
                        crossPointDirection = arrowDirection;   // on same side of arrow

                    // crossPointDirection = Math.sign((crossPointCenter.x - arrowCenterCoord.x) || (crossPointCenter.y - arrowCenterCoord.y));
                    objInReactionArrowHorizontalDirection = true;
                    perpendicularDistance = Kekule.CoordUtils.getDistance(objCenterCoord, crossPointCenter);
                }
            }

            // check if molecule/symbol is on the vertical direction of arrow line, if so, it may be a reagent
            var perpendicularCrossPointCoordToNormalLine = Kekule.GeometryUtils.getPerpendicularCrossPointFromCoordToLine(objCenterCoord, arrowNormalLineCoords[0], arrowNormalLineCoords[1], true);
            var perpendicularDistanceToNormalLine = Kekule.CoordUtils.getDistance(objCenterCoord, perpendicularCrossPointCoordToNormalLine);
            if (perpendicularDistanceToNormalLine * 2 < arrowLength + reactionArrowHorizontalExpansion)
            {
                // inside the expansion area of reaction arrow in vertical direction, should be a reagent of reaction
                crossPointToNormalLineDirection = Math.sign((perpendicularCrossPointCoordToNormalLine.x - arrowCenterCoord.x) || (perpendicularCrossPointCoordToNormalLine.y - arrowCenterCoord.y));
                objInReactionArrowVerticalDirection = true;
                distanceOnNormalLine = Kekule.CoordUtils.getDistance(perpendicularCrossPointCoordToNormalLine, arrowCenterCoord);
            }

            if (objInReactionArrowHorizontalDirection && objInReactionArrowVerticalDirection)
            {
                // a molecule can be both regarded as reactant/product and reagent, decide its role with distance
                if (perpendicularDistanceToNormalLine * 2 < arrowLength)
                {
                    // on the vertical direction of arrow without expansion, regard it as reagent
                    objInReactionArrowHorizontalDirection = false;
                }
                else if (perpendicularDistance <= perpendicularDistanceToNormalLine)
                    objInReactionArrowVerticalDirection = false;
                else
                    objInReactionArrowHorizontalDirection = false;
            }

            if (objInReactionArrowHorizontalDirection)  // reactant or product
            {
                var halfReactionArrowLength = arrowLength / 2;
                if (crossPointDirection === arrowDirection)
                {
                    // on the end side of arrow, product
                    // product and reactant distance should be measure to a end of arrow (not center of arrow), so substract half length here
                    productDetails.push({
                        'substanceType': 'product', 'distance': distance - halfReactionArrowLength,
                        'containerBox': containerBox, 'centerCoord': objCenterCoord,
                        'crossLengthOnReactionArrowLine': crossLengthOnReactionArrowLine || 0,
                        'object': molAndPlusSymbols[i]
                    });
                    if (calcContainerBoxes)
                        productContainerBox = Kekule.BoxUtils.getContainerBox(productContainerBox, containerBox);
                }
                else
                {
                    // on the start side of arrow, reactant
                    // product and reactant distance should be measure to a end of arrow (not center of arrow), so substract half length here
                    reactantDetails.push({
                        'substanceType': 'reactant', 'distance': distance - halfReactionArrowLength,
                        'containerBox': containerBox, 'centerCoord': objCenterCoord,
                        'crossLengthOnReactionArrowLine': crossLengthOnReactionArrowLine || 0,
                        'object': molAndPlusSymbols[i],
                    });
                    if (calcContainerBoxes)
                        reactantContainerBox = Kekule.BoxUtils.getContainerBox(reactantContainerBox, containerBox);
                }
            }
            else if (objInReactionArrowVerticalDirection)  // reagent
            {
                if (currObj instanceof Kekule.Molecule)
                {
                    // only molecule can be reagent, so here we ignores the plus symbol
                    var distanceToArrowCenter = Kekule.CoordUtils.getDistance(objCenterCoord, arrowCenterCoord);
                    var distanceToArrowLineSegment = Kekule.GeometryUtils.getDistanceFromPointToLine(objCenterCoord, arrowCoords[0], arrowCoords[1], false);
                    reagentDetails.push({
                        'substanceType': 'reagent', 'onTop': crossPointToNormalLineDirection == arrowNormalLineDirection,
                        'containerBox': containerBox, 'centerCoord': objCenterCoord, 'distance': distanceOnNormalLine,
                        'distanceToArrowCenter': distanceToArrowCenter,
                        'distanceToArrow': distanceToArrowLineSegment,
                        'object': molAndPlusSymbols[i]
                    });
                    if (calcContainerBoxes)
                        reagentContainerBox = Kekule.BoxUtils.getContainerBox(reagentContainerBox, containerBox);
                }
            }
        }

        var result = null;
        if (reactantDetails.length || productDetails.length)
        {
            // sort reactants and products with distance to arrow
            reactantDetails.sort(function(a, b) { return b.distance - a.distance;});
            productDetails.sort(function(a, b) { return a.distance - b.distance;});

            // sort reagent
            reagentDetails.sort(function(a, b) {
                if (a.onTop === b.onTop) {
                    return a.onTop? (b.distance - a.distance): (a.distance - b.distance);
                } else {
                    return a.onTop? -1: 1;
                }
            });

            var roughReactionInfo = {
                reactantDetails: reactantDetails,
                productDetails: productDetails,
                reagentDetails: reagentDetails
            };

            // erase substances too faraway, and record the delta distance to neighbor
            var distanceThreshold = substanceGapThreshold;
            for (var l = reactantDetails.length - 1, i = l; i >= 0; --i)
            {
                var deltaDistance = RU._getObjDetailDistanceToNeighborOrReactionArrow(roughReactionInfo, i, 'reactant');
                if (deltaDistance > distanceThreshold)  // too faraway from nearby substance, remove all following ones
                {
                    reactantDetails.splice(0, i + 1);
                    break;
                }
                // reactantDetails[i].distanceToNeighbor = deltaDistance;
            }
            for (var l = productDetails.length, i = 0; i < l; ++i)
            {
                var deltaDistance = RU._getObjDetailDistanceToNeighborOrReactionArrow(roughReactionInfo, i, 'product');
                if (deltaDistance > distanceThreshold)  // too faraway from nearby substance, remove all following ones
                {
                    productDetails.splice(i, l);
                    break;
                }
                // productDetails[i].distanceToNeighbor = deltaDistance;
            }
            for (var l = reagentDetails.length - 1, i = l; i >= 0; --i)
            {
                if (!reagentDetails[i].onTop)
                    continue;
                var deltaDistance = RU._getObjDetailDistanceToNeighborOrReactionArrow(roughReactionInfo, i, 'reagent');
                if (deltaDistance > distanceThreshold)  // too faraway from nearby substance, remove all following ones
                {
                    reagentDetails.splice(0, i + 1);
                    break;
                }
                // reagentDetails[i].distanceToNeighbor = deltaDistance;
            }
            for (var l = reagentDetails.length, i = 0; i < l; ++i)
            {
                if (reagentDetails[i].onTop)
                    continue;
                var deltaDistance = RU._getObjDetailDistanceToNeighborOrReactionArrow(roughReactionInfo, i, 'reagent');
                if (deltaDistance > distanceThreshold)  // too faraway from nearby substance, remove all following ones
                {
                    reagentDetails.splice(i, l);
                    break;
                }
                // reagentDetails[i].distanceToNeighbor = deltaDistance;
            }


            result = {
                reactantDetails: reactantDetails,
                productDetails: productDetails,
                reagentDetails: reagentDetails,
                arrowDetails: {
                    coords: arrowCoords,
                    centerCoord: arrowCenterCoord,
                    length: arrowLength,
                    direction: arrowDirection,
                    normalLineCoords: arrowNormalLineCoords,
                    normalLineEquationParams: arrowNormalLineEquationParams,

                    reactionArrowType: reactionArrow.getReactionType()
                }
            };
            if (calcContainerBoxes) {
                reactionContainerBox = Kekule.BoxUtils.getContainerBox(reactionContainerBox, reactantContainerBox);
                reactionContainerBox = Kekule.BoxUtils.getContainerBox(reactionContainerBox, productContainerBox);
                reactionContainerBox = Kekule.BoxUtils.getContainerBox(reactionContainerBox, reagentContainerBox);

                result = Object.extend(result, {
                    reactantContainerBox: reactantContainerBox,
                    productContainerBox: productContainerBox,
                    reagentContainerBox: reagentContainerBox,
                    reactionContainerBox: reactionContainerBox
                });
            }
        }
        
        return result;
    },

    _extractReactionChainsInfoFromChemDocument: function(chemDoc, targetReactionArrows, targetPlusSymbols, targetMolecules, objGeometryMap, options)
    {
        // need to generate a directed reaction graph from document

        // force to calc container box of each reaction
        var ops = Object.create(options || null);
        ops.calcContainerBox = true;

        // retrieve all reaction arrows in document
        var reactionArrows = targetReactionArrows || RU._getReactionArrowsInDoc(chemDoc);

        // retrieve all plus symbols in document
        if (!targetPlusSymbols)
        {
            targetPlusSymbols = RU._getPlusSymbolsInDoc(chemDoc);
        }

        // extract reaction of each reaction arrow, do not consider other arrows first
        var reactionInfos = [];
        for (var i = 0, l = reactionArrows.length; i < l; ++i)
        {
            var info = RU._extractReactionInfoFromChemDocument(chemDoc, reactionArrows[i], targetPlusSymbols, targetMolecules, objGeometryMap, ops);
            if (info)
                reactionInfos.push(info);
        }

        // step1: iterate reactions, handle the mol overlapping first
        for (var i = 0, ii = reactionInfos.length; i < ii - 1; ++i)
        {
            var currReactionInfo = reactionInfos[i];
            for (var j = i + 1, jj = reactionInfos.length; j < jj; ++j)
            {
                var refReactionInfo = reactionInfos[j];
                // get overlapped molecules in two reactions. If empty, the two reactions has no relation, otherwise, need to rearrange their substances and sequences.
                var overlappingInfo = RU._getReactionDetailOverlapsEx(currReactionInfo, refReactionInfo, null, {checkUnoverlaps: true, calcDistancesToCenter: true});
                var overlappedObjsInfo = overlappingInfo.overlapsWithExtra;
                var unoverlappedDetails = overlappingInfo.unoverlapDetails;
                // var overlappedObjs = RU._getReactionDetailOverlaps(currReactionInfo, refReactionInfo);
                if (overlappedObjsInfo && overlappedObjsInfo.length)
                {
                    // handle this overlaps
                    // firstly, sort the overlappedObjs with distance to the center of either arrow, we will handle them from near to far
                    overlappedObjsInfo.sort(function(objInfo1, objInfo2) {
                        return Math.min(objInfo1.distances[0], objInfo1.distances[1]) - Math.min(objInfo2.distances[0], objInfo2.distances[1]);
                    });

                    var recalcUnoverlaps = false;
                    for (var k = 0, kk = overlappedObjsInfo.length; k < kk; ++k)
                    {
                        if (recalcUnoverlaps)
                            unoverlappedDetails = RU._getReactionDetailOverlapsEx(currReactionInfo, refReactionInfo, null, {checkUnoverlaps: true, calcDistancesToCenter: true}).unoverlapDetails;

                        var currOverlappingObj = overlappedObjsInfo[k].object;
                        var arrangeInfo = RU._getOverlappingObjectArrangementInfo(currReactionInfo, refReactionInfo, currOverlappingObj, unoverlappedDetails);
                        if (!arrangeInfo.sharable) {
                            // if overlapping mol is not sharable, remove it from the reaction it not belongs to
                            var notBelongedReactionInfo = (arrangeInfo.belongedReactionInfo === refReactionInfo)? currReactionInfo: refReactionInfo;
                            RU._removeObjFromReactionInfo(currOverlappingObj, notBelongedReactionInfo);
                            // after removing, we need to mark to recalculate the unoverlappedDetails for next loop
                            recalcUnoverlaps = true;
                        }
                    }
                }
            }
        }

        // debug
        // console.log('reactionInfos', reactionInfos);
        // return reactionInfos;


        var findReactionInfoInChains = function(reactionInfo, chains)
        {
            for (var i = 0, l = chains.length; i < l; ++i)
            {
                var chain = chains[i];
                if (chain.indexOf(reactionInfo) >= 0)
                    return {chain: chain, index: i};
            }
            return null;
        }
        /*
        var insertReactionToChain = function(reactionInfo, refReactionInfo, relation, chain)
        {
            var result = false;
            var chainInfo = refReactionInfo? findReactionInfoInChains(refReactionInfo): null;
            if (chainInfo)
            {
                result = true;
                if (relation === 1)
                {
                    // insert after refReactionInfo
                    chainInfo.chain.splice(chainInfo.index + 1, 0, reactionInfo);
                }
                else if (relation === -1)
                {
                    // insert before refReactionInfo
                    chainInfo.chain.splice(chainInfo.index, 0, reactionInfo);
                }
                else if (relation === 0) // parrel reaction, need to insert to new chain
                {
                    addNewChain(reactionInfo, chains);
                }
                else  // relation === null, no relation, do nothing
                {
                    result = false;
                }
            }
            return result;
        };
        */
        var tryInsertReactionToChain = function(reactionInfo, chains)
        {
            var result = false;
            for (var i = 0, ii = chains.length; i < ii; ++i)
            {
                var chain = chains[i];
                for (var j = 0, jj = chain.length; j < jj; ++j)
                {
                    var refReactionInfo = chain[j];
                    var overlappedMols = RU._getReactionDetailOverlaps(reactionInfo, refReactionInfo);
                    if (overlappedMols && overlappedMols.length)
                    {
                        var reactionRelation = RU._getPossibleReactionRelationWithOverlappingMoleculeSet(refReactionInfo, reactionInfo, overlappedMols);
                        if (reactionRelation !== null)
                        {
                            if (reactionRelation === 1)
                            {
                                // insert before refReactionInfo, if ref is at the head of chain
                                if (j === 0)
                                    chain.splice(j, 0, reactionInfo);
                                else
                                    addNewChain(reactionInfo, chains);
                            }
                            else if (reactionRelation === -1)
                            {
                                // insert after refReactionInfo, if ref is at the tail of chain
                                if (j === chain.length - 1)
                                    chain.splice(j + 1, 0, reactionInfo);
                                else
                                    addNewChain(reactionInfo, chains);
                            }
                            else if (reactionRelation === 0) // parrel reaction, need to insert to new chain
                            {
                                addNewChain(reactionInfo, chains);
                            }
                            result = true;
                        }
                        if (result)
                            return result;
                    }
                }
            }
            return result;
        };
        var addNewChain = function(firstReactionInfo, chains)
        {
            var result = [];
            result.push(firstReactionInfo);
            chains.push(result);
            return result;
        };

        /*
        var getReactionCountInChains = function(chains)
        {
            var result = 0;
            for (var i = 0, l = chains.length; i < l; ++i)
            {
                result += chains[i].length;
            }
            return result;
        };
        */

        // step2: after the first round, the reactions may have common molecules, use them to build a chain
        var chains = [];
        var currChain;
        // var allReactionCount = reactionInfos.length;
        var remainingReactions = Kekule.ArrayUtils.clone(reactionInfos);
        var refReactionInfo = remainingReactions.shift();
        if (refReactionInfo)
            addNewChain(refReactionInfo, chains);  // insert the first reaction to a new chain as initial
        while (remainingReactions.length > 0)
        {
            var reactionInsertedInThisRound = false;
            var i = 0;
            while (i < remainingReactions.length)
            {
                var currReactionInfo = remainingReactions[i];
                var inserted = tryInsertReactionToChain(currReactionInfo, chains);
                if (inserted)
                {
                    remainingReactions.splice(i, 1);
                    reactionInsertedInThisRound = true;
                }
                else
                    ++i;
            }
            if (!reactionInsertedInThisRound)
            {
                // no reaction can be inserted, so add a new chain
                addNewChain(remainingReactions.shift(), chains);
            }
        }

        RU._sortReactionChains(chemDoc, chains, objGeometryMap, ops.xSortMode, ops.ySortMode, /*ops.primarySortAxis*/ops.sortAxisWeightRatioXY, ops.reactionSortRefLength);

        // console.log('chains', chains);

        if (ops.enableSiblingMerging)
            chains = RU._mergeMatchedSiblingChains(chemDoc, chains, ops);

        // console.log('merged chains', chains);

        return chains;
    },

    _mergeMatchedSiblingChains: function(chemDoc, reactionChains, mergeOptions)
    {
        var result = [].concat(reactionChains);
        var enableMergeSharedProductAndReactant = mergeOptions.enableSiblingMerging && mergeOptions.enableMergeSharedProductAndReactant;
        var enableMergeOnProductOmission = mergeOptions.enableSiblingMerging && mergeOptions.enableMergeOnProductOmission;
        // check the sorted reaction chains, if the prev chain has no products and the next chain has no reactants, or vice versa, then merge them
        // TODO: this algorithm is quite simple, need to refine it later
        for (var i = result.length - 1; i > 0; --i)
        {
            var prevChain = result[i - 1];
            var prevChainTailReaction = prevChain[prevChain.length - 1];
            var currChain = result[i];
            var currChainHeadReaction = currChain[0];
            var mergeChain = false;
            if (enableMergeSharedProductAndReactant && !currChainHeadReaction.reactantDetails.length && prevChainTailReaction.productDetails.length)
            {
                currChainHeadReaction.reactantDetails = prevChainTailReaction.productDetails;
                mergeChain = true;
            }
            else if (enableMergeSharedProductAndReactant && !prevChainTailReaction.productDetails.length && currChainHeadReaction.reactantDetails.length)
            {
                prevChainTailReaction.productDetails = currChainHeadReaction.reactantDetails;
                mergeChain = true;
            }
            else if (enableMergeOnProductOmission && !currChainHeadReaction.reactantDetails.length && !prevChainTailReaction.productDetails.length)
            {
                // both empty, may be a simple continous reaction
                mergeChain = true;
            }
            if (mergeChain)
            {
                prevChain = prevChain.concat(currChain);
                result[i - 1] = prevChain;
                result.splice(i, 1);
            }
        }
        return result;
    },
    _sortReactionChains: function(chemDoc, reactionChains, objGeometryMap, xSortMode, ySortMode, /*primaryAxis*/sortAxisWeightRatioXY, reactionSortRefLength)
    {
        // sort the chains, from top to bottom, left to right by default
        var reactionGeometryMap = new Kekule.MapEx();
        try {

            for (var i = 0, l = reactionChains.length; i < l; ++i)
                reactionGeometryMap.set(reactionChains[i], RU._calcReactionChainGeometry(reactionChains[i], objGeometryMap));

            var axisSortModes = [xSortMode, ySortMode];
            // var primarySortAxisIndex = (primaryAxis === 'x')? 0: 1;
            // var secondarySortAxisIndex = (primarySortAxisIndex === 0)? 1: 0;
            reactionChains.sort(function(chain1, chain2) {
                var g1 = reactionGeometryMap.get(chain1);
                var g2 = reactionGeometryMap.get(chain2);
                var deltaCenterCoord = Kekule.CoordUtils.substract(g1.centerCoord, g2.centerCoord);
                var deltaLengthes = [deltaCenterCoord.x, deltaCenterCoord.y];
                var sortLength;
                var concreteSortAxisIndex;
                /*
                if (Math.abs(deltaLengthes[primarySortAxisIndex]) > reactionSortRefLength)
                {
                    sortLength = deltaLengthes[primarySortAxisIndex];
                    concreteSortAxisIndex = primarySortAxisIndex;
                }
                else if (Math.abs(deltaLengthes[secondarySortAxisIndex]) > reactionSortRefLength)
                {
                    sortLength = deltaLengthes[secondarySortAxisIndex];
                    concreteSortAxisIndex = secondarySortAxisIndex;
                }
                else {
                    // all less than ref length, use the larger delta distance as the comparison value
                    if (Math.abs(deltaLengthes[secondarySortAxisIndex]) > Math.abs(deltaLengthes[primarySortAxisIndex]))
                    {
                        sortLength = deltaLengthes[secondarySortAxisIndex];
                        concreteSortAxisIndex = secondarySortAxisIndex;
                    }
                    else
                    {
                        sortLength = deltaLengthes[primarySortAxisIndex];
                        concreteSortAxisIndex = primarySortAxisIndex;
                    }
                }
                return sortLength * axisSortModes[concreteSortAxisIndex];
                */
                var deltaLengthesWeighted = [deltaLengthes[0] * sortAxisWeightRatioXY, deltaLengthes[1]];
                if (Math.abs(deltaLengthesWeighted[0]) > Math.abs(deltaLengthesWeighted[1]))
                {
                    sortLength = deltaLengthesWeighted[0];
                    concreteSortAxisIndex = 0;
                }
                else
                {
                    sortLength = deltaLengthesWeighted[1];
                    concreteSortAxisIndex = 1;
                }
                return sortLength * axisSortModes[concreteSortAxisIndex];
            });
        }
        finally
        {
            reactionGeometryMap.finalize();
        }
    },

    _prepareReactionExtractionOptions: function(chemDoc, options)
    {
        var globalOps = Kekule.globalOptions.reaction.extraction;
        var ops = options || {};
        // TODO: property defAutoScaleRefLength is defined in render.extension.js, without it, how can we determinate the reference length?
        if (!ops.docRefLength)
            ops.docRefLength = chemDoc.getDefAutoScaleRefLength(Kekule.CoordMode.COORD2D);
        var docRefLength = ops.docRefLength;
        if (ops.substanceGapLengthThreshold === undefined)
            ops.substanceGapLengthThreshold = docRefLength * oneOf(ops.substanceGapLengthThresholdRatioToDocRefLength, globalOps.substanceGapLengthThresholdRatioToDocRefLength) || undefined;  // TODO: currently fixed ratio
        if (ops.reactionArrowPerpendicularExpansion === undefined)
            ops.reactionArrowPerpendicularExpansion = docRefLength * oneOf(ops.reactionArrowPerpendicularExpansionRatioToDocRefLength, globalOps.reactionArrowPerpendicularExpansionRatioToDocRefLength);
        if (ops.reactionArrowHorizontalExpansion === undefined)
            ops.reactionArrowHorizontalExpansion = docRefLength * oneOf(ops.reactionArrowHorizontalExpansionRationToDocRefLength, globalOps.reactionArrowHorizontalExpansionRationToDocRefLength);
        if (ops.reactionSortRefLength === undefined)
            ops.reactionSortRefLength = docRefLength * oneOf(ops.reactionSortRefLengthRatioToDocRefLength, globalOps.reactionSortRefLengthRatioToDocRefLength);
        ops.xSortMode = ops.xSortMode? ops.xSortMode: globalOps.reactionSortXMode;  // 1: from left to right, -1: from right to left
        ops.ySortMode = ops.ySortMode? ops.ySortMode: globalOps.reactionSortYMode;  // -1: from top to bottom, 1: from bottom to top
        // ops.primarySortAxis = ops.primarySortAxis || 'y' ;
        if (ops.sortAxisWeightRatioXY === undefined || ops.sortAxisWeightRatioXY === null)
            ops.sortAxisWeightRatioXY = globalOps.reactionSortAxisWeightRatioXY;    // weight of deltaX/deltaY when sorting reactions

        if (ops.enableSiblingMerging === undefined)
            ops.enableSiblingMerging = globalOps.enableSiblingMerging;
        if (ops.enableMergeSharedProductAndReactant === undefined)
            ops.enableMergeSharedProductAndReactant = globalOps.enableMergeSharedProductAndReactant;
        if (ops.enableMergeOnProductOmission === undefined)
            ops.enableMergeOnProductOmission = globalOps.enableMergeOnProductOmission;
        if (ops.insertImplicitIntermediate === undefined)
            ops.insertImplicitIntermediate = globalOps.insertImplicitIntermediate;

        return ops;
    },

    _getReactionDirectionFromArrowType: function(arrowType) {
        var result = (arrowType === Kekule.Glyph.ReactionArrowType.RESONANCE)? Kekule.ChemReactionDirection.RESONANCE:
            (arrowType === Kekule.Glyph.ReactionArrowType.REVERSIBLE)? Kekule.ChemReactionDirection.BIDIRECTION:
                Kekule.ChemReactionDirection.FORWARD;
        return result;
    },

    /**
     * Create a single step {@link Kekule.ChemReaction} from {@link Kekule.ChemDocument} content.
     * @param {@link Kekule.ChemDocument} chemDoc
     * @param {Object} options May include fields: {
     *     substanceGapLengthThreshold: max gap between two reactants/products/reagents,
     *     reactionArrowPerpendicularExpansion: the length of arrow vertical height expansion, to determinate whether an unsized molecule is within the reaction as reactant or product.
     *     reactionArrowHorizontalExpansion: the length of arrow horizontal length expansion, to determinate whether a molecule is around the arrow, acting as the reagent.
     *     reactionSortRefLength: the reference length used to sort the reaction chains. If x/y distance between two reaction chain centers is less than this length, the two chains x/y will be regarded as same.
     *     cloneMolecules: whether clone molecules to reaction (rather than move them from chem document). Default value is true.
     * }
     * @returns {@link Kekule.ChemReaction}
     */
    extractReactionFromChemDocument: function(chemDoc, options)
    {
        var ops = RU._prepareReactionExtractionOptions(chemDoc, options);

        var cloneMolecules = (ops.cloneMolecules === undefined)? true: !!ops.cloneMolecules;

        var objGeometryMap = new Kekule.MapEx();
        var molecules = RU._getMoleculesInDoc(chemDoc);
        var plusSymbols = RU._getPlusSymbolsInDoc(chemDoc);
        RU._fillMoleculeGeometryMap(objGeometryMap, chemDoc, molecules, ops.reactionArrowPerpendicularExpansion, ops.reactionArrowPerpendicularExpansion);
        RU._fillSymbolGeometryMap(objGeometryMap, chemDoc, plusSymbols);

        try {
            var reactionInfo = RU._extractReactionInfoFromChemDocument(chemDoc, null, plusSymbols, molecules, objGeometryMap, ops);  // retrieve the reaction of the first reaction arrow object
            if (reactionInfo)
            {
                var reactantDetails = reactionInfo.reactantDetails;
                var productDetails = reactionInfo.productDetails;
                var reagentDetails = reactionInfo.reagentDetails;

                var result = new Kekule.ChemReaction();
                if (reactionInfo.arrowDetails.reactionArrowType !== undefined) {
                    var reactionDirection = this._getReactionDirectionFromArrowType(reactionInfo.arrowDetails.reactionArrowType);
                    result.setDirection(reactionDirection);
                }

                for (var i = 0, l = reactantDetails.length; i < l; ++i)
                {
                    if (reactantDetails[i].object instanceof Kekule.Molecule)
                    {
                        var mol = cloneMolecules ? reactantDetails[i].object.clone(true) : reactantDetails[i].object;
                        result.appendReactant(mol);
                    }
                }
                for (var i = 0, l = productDetails.length; i < l; ++i)
                {
                    if (productDetails[i].object instanceof Kekule.Molecule)
                    {
                        var mol = cloneMolecules ? productDetails[i].object.clone(true) : productDetails[i].object;
                        result.appendProduct(mol);
                    }
                }
                for (var i = 0, l = reagentDetails.length; i < l; ++i)
                {
                    if (reagentDetails[i].object instanceof Kekule.Molecule)
                    {
                        var mol = cloneMolecules ? reagentDetails[i].object.clone(true) : reagentDetails[i].object;
                        result.appendReagent(mol);
                    }
                }
            }
        }
        finally
        {
            objGeometryMap.finalize();
        }
        return result;
    },

    /**
     * Create {@link Kekule.ConsecutiveReactions} group from {@link Kekule.ChemDocument} content.
     * @param {@link Kekule.ChemDocument} chemDoc
     * @param {Object} options May include fields: {
     *     substanceGapLengthThreshold: max gap between two reactants/products/reagents,
     *     reactionArrowPerpendicularExpansion: the length of arrow vertical height expansion, to determinate whether an unsized molecule is within the reaction as reactant or product.
     *     reactionArrowHorizontalExpansion: the length of arrow horizontal length expansion, to determinate whether a molecule is around the arrow, acting as the reagent.
     *     reactionSortRefLength: the reference length used to sort the reaction chains. If x/y distance between two reaction chain centers is less than this length, the two chains x/y will be regarded as same.
     *     xSortMode, ySortMode: 1: from left to right, -1: from right to left,
     *     primarySortAxis: 'x' or 'y', the primary axis used to sort the reaction chains,
     *     disableSiblingMerging: Whether merge two sibling chains when the prev one has products and the next one has no reactants or vice versa.
     *     insertImplicitIntermediate: whether fill an extra implicit intermediate object between two consecutive reactions omitting the common product/reactant.
     *     cloneMolecules: whether clone molecules to reaction (rather than move them from chem document). Default value is true.
     * }
     * @returns {@link Kekule.ConsecutiveReactions}
     */
    extractReactionChainsFromChemDocument: function(chemDoc, options)
    {
        var ops = RU._prepareReactionExtractionOptions(chemDoc, options);

        var cloneMolecules = (ops.cloneMolecules === undefined)? true: !!ops.cloneMolecules;

        var objGeometryMap = new Kekule.MapEx();
        var molecules = RU._getMoleculesInDoc(chemDoc);
        var plusSymbols = RU._getPlusSymbolsInDoc(chemDoc);
        RU._fillMoleculeGeometryMap(objGeometryMap, chemDoc, molecules, ops.reactionArrowPerpendicularExpansion, ops.reactionArrowPerpendicularExpansion);
        RU._fillSymbolGeometryMap(objGeometryMap, chemDoc, plusSymbols);

        try {
            var chains = RU._extractReactionChainsInfoFromChemDocument(chemDoc, null, plusSymbols, molecules, objGeometryMap, ops);
            // console.log('chains', chains);

            // from the chains info, build the final multistep reactions
            var result = [];
            for (var i = 0, ii = chains.length; i < ii; ++i)
            {
                var chain = chains[i];
                var reaction = new Kekule.ConsecutiveReactions();
                var prevReactionInfo = null;
                var prevReactionStep = null;
                for (var j = 0, jj = chain.length; j < jj; ++j)
                {
                    var reactionInfo = chain[j];
                    var reactionStep = reaction.newStep();
                    if (reactionInfo.arrowDetails.reactionArrowType !== undefined) {
                        var reactionDirection = this._getReactionDirectionFromArrowType(reactionInfo.arrowDetails.reactionArrowType);
                        reactionStep.setDirection(reactionDirection);
                    }

                    for (var k = 0, kk = reactionInfo.reactantDetails.length; k < kk; ++k)
                    {
                        var obj = reactionInfo.reactantDetails[k].object;
                        if (obj instanceof Kekule.Molecule)
                        {
                            // first step, add all to reactant, otherwise the reactants should be the products of the previous step.
                            // but if this step has explicit reactants that are not products of previous step, add them to the prev product list
                            if (j === 0)
                            {
                                var mol = cloneMolecules ? reactionInfo.reactantDetails[k].object.clone(true) : reactionInfo.reactantDetails[k].object;
                                reactionStep.appendReactant(mol);
                            }
                            else
                            {
                                if (prevReactionStep && prevReactionInfo && !RU._getObjDetailsInReactionInfo(obj, prevReactionInfo, ['product']))
                                {
                                    var mol = cloneMolecules ? reactionInfo.reactantDetails[k].object.clone(true) : reactionInfo.reactantDetails[k].object;
                                    prevReactionStep.appendProduct(mol);
                                }
                            }
                        }
                    }

                    /*
                    if (j === 0)
                    {
                        // first step, add reactant, else the reactants is the products of the previous step
                        for (var k = 0, kk = reactionInfo.reactantDetails.length; k < kk; ++k)
                        {
                            if (reactionInfo.reactantDetails[k].object instanceof Kekule.Molecule)
                            {
                                var mol = cloneMolecules ? reactionInfo.reactantDetails[k].object.clone(true) : reactionInfo.reactantDetails[k].object;
                                reactionStep.appendReactant(mol);
                            }
                        }
                    }
                    else
                    {
                        // not first step, if this step has explicit reactants that are not products of previous step, add them to the prev product list
                        var prevReactionStep = reaction.getStepAt(j - 1);
                        for (var k = 0, kk = reactionInfo.reactantDetails.length; k < kk; ++k)
                        {

                        }
                    }
                    */
                    for (var k = 0, kk = reactionInfo.productDetails.length; k < kk; ++k)
                    {
                        if (reactionInfo.productDetails[k].object instanceof Kekule.Molecule)
                        {
                            var mol = cloneMolecules ? reactionInfo.productDetails[k].object.clone(true) : reactionInfo.productDetails[k].object;
                            reactionStep.appendProduct(mol);
                        }
                    }
                    for (var k = 0, kk = reactionInfo.reagentDetails.length; k < kk; ++k)
                    {
                        if (reactionInfo.reagentDetails[k].object instanceof Kekule.Molecule)
                        {
                            var mol = cloneMolecules ? reactionInfo.reagentDetails[k].object.clone(true) : reactionInfo.reagentDetails[k].object;
                            reactionStep.appendReagent(mol);
                        }
                    }
                    prevReactionStep = reactionStep;
                    prevReactionInfo = reactionInfo;
                }
                result.push(reaction);
            }

            // then fill the omitted intermediates
            if (ops.insertImplicitIntermediate)
            {
                var imIndex = 1;
                for (var i = 0, ii = result.length; i < ii; ++i)
                {
                    var consecutiveReaction = result[i];
                    var reactions = consecutiveReaction.getReactions();
                    if (reactions.length > 1)
                    {
                        for (var j = 1, jj = reactions.length; j < jj; ++j)
                        {
                            var prevReaction = reactions[j - 1];
                            var currReaction = reactions[j];
                            if (!prevReaction.getProductCount() && !currReaction.getReactantCount())
                            {
                                var intermediate = new Kekule.ImplicitReactionIntermediate();
                                intermediate.setId(intermediate.getAutoIdPrefix() + imIndex);
                                ++imIndex;
                                prevReaction.appendProduct(intermediate);
                            }
                        }
                    }
                }
            }
        }
        finally
        {
            objGeometryMap.finalize();
        }
        return result;
    }
};

/**
 * Utils to layout reaction substances and arrows automatically.
 * @namespace
 */
Kekule.ReactionLayoutUtils = {
    /** @private */
    _prepareReactionLayoutOptions: function(chemDoc, options)
    {
        var globalOps = Kekule.globalOptions.reaction.layout;
        var ops = options || {};
        // TODO: property defAutoScaleRefLength is defined in render.extension.js, without it, how can we determinate the reference length?
        if (!ops.docRefLength)
            ops.docRefLength = chemDoc.getDefAutoScaleRefLength(Kekule.CoordMode.COORD2D);
        var docRefLength = ops.docRefLength;
        if (ops.reactionGap === undefined || ops.reactionGap === null)
            ops.reactionGap = docRefLength * oneOf(ops.reactionGapLengthRatioToDocRefLength, globalOps.reactionGapLengthRatioToDocRefLength);
        if (ops.substanceGapPrimary === undefined || ops.substanceGapPrimary === null)
            ops.substanceGapPrimary = docRefLength * oneOf(ops.substancePrimaryGapLengthRatioToDocRefLength, globalOps.substancePrimaryGapLengthRatioToDocRefLength);
        if (ops.substanceGapSecondary === undefined || ops.substanceGapSecondary === null)
            ops.substanceGapSecondary = docRefLength * oneOf(ops.substanceSecondaryGapLengthRatioToDocRefLength, globalOps.substanceSecondaryGapLengthRatioToDocRefLength);
        if (ops.plusSymbolSize === undefined)
            ops.plusSymbolSize = docRefLength * oneOf(ops.plusSymbolSizeRatioToDocRefLength, globalOps.plusSymbolSizeRatioToDocRefLength);
        if (ops.reactionArrowMinSize === undefined)
            ops.reactionArrowMinSize = docRefLength * oneOf(ops.reactionArrowMinSizeRatioToDocRefLength, globalOps.reactionArrowMinSizeRatioToDocRefLength);
        if (ops.reactionArrowPadding === undefined)
            ops.reactionArrowPadding = docRefLength * oneOf(ops.reactionArrowPaddingRatioToDocRefLength, globalOps.reactionArrowPaddingRatioToDocRefLength);
        if (!ops.primaryAxis)
            ops.primaryAxis = globalOps.primaryAxis;
        ops.layoutXMode = oneOf(ops.layoutXMode, globalOps.layoutXMode);
        ops.layoutYMode = oneOf(ops.layoutYMode, globalOps.layoutYMode);
        ops.mainSubstancePrimaryAxisAlignMode = oneOf(ops.mainSubstancePrimaryAxisAlignMode, globalOps.mainSubstancePrimaryAxisAlignMode);
        ops.mainSubstanceSecondaryAxisAlignMode = oneOf(ops.mainSubstanceSecondaryAxisAlignMode, globalOps.mainSubstanceSecondaryAxisAlignMode);
        // ops.assocSubstancePrimaryAxisAlignMode = oneOf(ops.assocSubstancePrimaryAxisAlignMode, globalOps.assocSubstancePrimaryAxisAlignMode);
        // ops.assocSubstanceSecondaryAxisAlignMode = oneOf(ops.assocSubstanceSecondaryAxisAlignMode, globalOps.assocSubstanceSecondaryAxisAlignMode);
        ops.assocSubstanceAlignMode = oneOf(ops.assocSubstanceAlignMode, globalOps.assocSubstanceAlignMode);
        ops.assocSubstanceStackOnPrimaryAxis = oneOf(ops.assocSubstanceStackOnPrimaryAxis, globalOps.assocSubstanceStackOnPrimaryAxis);

        ops.singleLine = oneOf(ops.singleLine, globalOps.singleLine);
        ops.reactionInlineBlockAlignMode = oneOf(ops.reactionInlineBlockAlignMode, globalOps.reactionInlineBlockAlignMode);

        if (ops.reactionBoxXAlignment === undefined)
            ops.reactionBoxXAlignment = Kekule.Render.BoxXAlignment.LEFT;
        if (ops.reactionBoxYAlignment === undefined)
            ops.reactionBoxYAlignment = Kekule.Render.BoxYAlignment.BOTTOM;

        if (!ops.targetSubstances)
            ops.targetSubstances = Kekule.ObjUtils.getOwnedFieldValues(Kekule.ChemReactionComponent);

        if (ops.cloneMolecules === undefined)
            ops.cloneMolecules = true;

        return ops;
    },

    /** @private */
    _calcReactionLayoutInChemDoc: function(chemDoc, reaction, baseCoord, objGeometryMap, ops)
    {
        // retrieve layout options
        var substanceGapPrimary = ops.substanceGapPrimary;  // (primaryAxis === 'y')? ops.substanceGapY: ops.substanceGapX;  // gap between substances and plus symbol
        var substanceGapSecondary = ops.substanceGapSecondary;  // (secondaryAxis === 'y')? ops.substanceGapY: ops.substanceGapX;
        var primaryAxis = ops.primaryAxis;
        var secondaryAxis = (primaryAxis === 'y')? 'x': 'y';
        var doMoleculesClone = ops.cloneMolecules;
        var singleLineMode = !!ops.singleLine;
        var ROA = Kekule.ReactionObjectAlign;

        var targetMainSubstanceTypes = [];
        if (ops.targetSubstances.indexOf(Kekule.ChemReactionComponent.REACTANT) >= 0)
            targetMainSubstanceTypes.push(Kekule.ChemReactionComponent.REACTANT);
        if (ops.targetSubstances.indexOf(Kekule.ChemReactionComponent.PRODUCT) >= 0)
            targetMainSubstanceTypes.push(Kekule.ChemReactionComponent.PRODUCT);
        var targetAssocSubstanceTypes = Kekule.ArrayUtils.exclude(ops.targetSubstances, [Kekule.ChemReactionComponent.REACTANT, Kekule.ChemReactionComponent.PRODUCT]);

        var mainSubstancePrimaryAxisLayoutWeight, mainSubstanceSecondaryAxisAlignWeight;
        var assocSubstancePrimaryAxisLayoutWeight, assocSubstanceSecondaryAxisLayoutWeight;
        if (primaryAxis === 'y')
        {
            // mainSubstancePrimaryAxisLayoutWeight = (ops.mainSubstancePrimaryAxisAlignMode === ROA.BOTTOM)? 1 : -1;
            mainSubstancePrimaryAxisLayoutWeight = (ops.layoutYMode === Kekule.ReactionLayoutYMode.BtoT)? 1: -1;
            mainSubstanceSecondaryAxisAlignWeight = (ops.mainSubstanceSecondaryAxisAlignMode === ROA.RIGHT)? -1:
                (ops.mainSubstanceSecondaryAxisAlignMode === ROA.LEFT)? 1
                    :0;  // center
            if (ops.assocSubstanceStackOnPrimaryAxis)
                assocSubstancePrimaryAxisLayoutWeight = mainSubstancePrimaryAxisLayoutWeight;
            else
                assocSubstancePrimaryAxisLayoutWeight = (ops.assocSubstanceAlignMode === ROA.BOTTOM)? 1:
                    (ops.assocSubstanceAlignMode === ROA.TOP)? -1
                        :0;  // center
        }
        else
        {
            // mainSubstancePrimaryAxisLayoutWeight = (ops.mainSubstancePrimaryAxisAlignMode === ROA.RIGHT) ? -1 : 1;
            mainSubstancePrimaryAxisLayoutWeight = (ops.layoutXMode === Kekule.ReactionLayoutXMode.RtoL)? -1: 1;
            mainSubstanceSecondaryAxisAlignWeight = (ops.mainSubstanceSecondaryAxisAlignMode === ROA.BOTTOM)? 1:
                (ops.mainSubstanceSecondaryAxisAlignMode === ROA.TOP)? -1:
                    0;   // center

            if (ops.assocSubstanceStackOnPrimaryAxis)
                assocSubstancePrimaryAxisLayoutWeight = mainSubstancePrimaryAxisLayoutWeight;
            else
                assocSubstancePrimaryAxisLayoutWeight = (ops.assocSubstanceAlignMode === ROA.RIGHT)? -1:
                    (ops.assocSubstanceAlignMode === ROA.LEFT)? 1
                        :0;  // center
        }


        var getTargetMolecule = function(srcMolecule, targetChemDoc, doMoleculeClone)
        {
            var result;
            if (doMoleculeClone) {
                result = srcMolecule.clone();
                // result.setOwner(targetChemDoc);
                targetChemDoc.appendChild(result);
            }
            else
                result = srcMolecule;
            return result;
        };
        var createPlusSymbol = function(targetChemDoc)
        {
            var result = new Kekule.Glyph.PlusSymbol(null, ops.plusSymbolSize);
            targetChemDoc.appendChild(result);
            return result;
        };

        var arrangeReactionObject = function(stackOnSecondaryAxis, startingCoord, substance, leadingPadding,
                                      primaryAxis, secondaryAxis,
                                      primaryAxisAlignWeight, secondaryAxisAlignWeight,   // for main object
                                      // assocSubstancePrimaryAxisWeight,    // for assoc object, align weight on primary axis
                                      // assocSubstanceSecondaryAxisWeight,   // for assoc object, layout weight on secondary axis
                                      objsContainerBox, objGeometryMap)
        {
            var currCoord = Object.extend({}, startingCoord);
            if (leadingPadding)
            {
                if (stackOnSecondaryAxis)
                    currCoord[secondaryAxis] += leadingPadding * secondaryAxisAlignWeight;
                else
                    currCoord[primaryAxis] += leadingPadding * primaryAxisAlignWeight;
            }
            var containerBox = substance.getExposedContainerBox? substance.getExposedContainerBox(Kekule.CoordMode.COORD2D): substance.getContainerBox(Kekule.CoordMode.COORD2D);
            var containerBoxSize = {x: containerBox.x2 - containerBox.x1, y: containerBox.y2 - containerBox.y1};
            var objCenterCoord = Object.extend({}, currCoord);
            /*
            if (stackOnSecondaryAxis)
            {
                objCenterCoord[primaryAxis] += containerBoxSize[primaryAxis] / 2 * assocSubstancePrimaryAxisWeight;
                objCenterCoord[secondaryAxis] += containerBoxSize[secondaryAxis] / 2 * assocSubstanceSecondaryAxisWeight;
                currCoord[secondaryAxis] += containerBoxSize[secondaryAxis] * assocSubstanceSecondaryAxisWeight;
            }
            else
            {
                objCenterCoord[primaryAxis] += containerBoxSize[primaryAxis] / 2 * primaryAxisAlignWeight;
                objCenterCoord[secondaryAxis] = containerBoxSize[secondaryAxis] / 2 * secondaryAxisAlignWeight;
                currCoord[primaryAxis] += containerBoxSize[primaryAxis] * primaryAxisAlignWeight;
            }
            */
            objCenterCoord[primaryAxis] += containerBoxSize[primaryAxis] / 2 * primaryAxisAlignWeight;
            objCenterCoord[secondaryAxis] += containerBoxSize[secondaryAxis] / 2 * secondaryAxisAlignWeight;
            if (stackOnSecondaryAxis)
                currCoord[secondaryAxis] += containerBoxSize[secondaryAxis] * secondaryAxisAlignWeight;
            else
                currCoord[primaryAxis] += containerBoxSize[primaryAxis] * primaryAxisAlignWeight;

            // var objOriginalCenterCoord = substance.getCoordOfMode(Kekule.CoordMode.COORD2D);
            var objOriginalCenterCoord = Kekule.BoxUtils.getCenterCoord(containerBox);
            var coordDelta = Kekule.CoordUtils.substract(objCenterCoord, objOriginalCenterCoord || {});

            var result = {
                'objCenterCoord': objCenterCoord,
                'coordDelta': coordDelta,
                'originContainerBox': containerBox,
                'adjustedContainerBox': Kekule.BoxUtils.transform2D(containerBox, {translateX: coordDelta.x, translateY: coordDelta.y}),
                'nextStartingCoord': currCoord
            };

            objGeometryMap.set(substance, result);
            var newObjsContainerBox = Kekule.BoxUtils.getContainerBox(objsContainerBox, result.adjustedContainerBox);
            // modify the original objContainerBox
            Object.extend(objsContainerBox, newObjsContainerBox);

            // objGeometryMap.set(substance, result);
            return result;
        };

        var arrangeReactionObjectSubGroup = function(stackOnSecondaryAxis, revObjSeq, startingCoord, objectGroup, objPadding,
                                                  primaryAxis, secondaryAxis,
                                                  objPrimaryAxisAlignWeight, objSecondaryAxisAlignWeight,   // for individual object inside group
                                                  groupPrimaryAxisAlignWeight, groupSecondaryAxisAlignWeight,   // for the whole group
                                                  objsContainerBox, objGeometryMap)
        {
            var sumContainerBox = {};
            var currCoord = Kekule.CoordUtils.create(0, 0);  // start from zero, adjust when all objects are arranged
            for (var i = 0, l = objectGroup.length; i < l; ++i)
            {
                var objIndex = revObjSeq? l - i - 1: i;
                var currGeometry = arrangeReactionObject(stackOnSecondaryAxis, currCoord, objectGroup[objIndex], (i > 0)? objPadding: 0,
                    primaryAxis, secondaryAxis,
                    objPrimaryAxisAlignWeight, objSecondaryAxisAlignWeight,
                    sumContainerBox, objGeometryMap);
                currCoord = currGeometry.nextStartingCoord;
            }
            // adjust the position of each object according to the starting coord
            var sumContainerBoxSize = {x: sumContainerBox.x2 - sumContainerBox.x1, y: sumContainerBox.y2 - sumContainerBox.y1};
            var sumContainerBoxCenter = Kekule.BoxUtils.getCenterCoord(sumContainerBox);

            var delta = Kekule.CoordUtils.substract(startingCoord, sumContainerBoxCenter);
            delta[primaryAxis] += sumContainerBoxSize[primaryAxis] / 2 * (0 + groupPrimaryAxisAlignWeight);
            delta[secondaryAxis] += sumContainerBoxSize[secondaryAxis] / 2 * (0 + groupSecondaryAxisAlignWeight);

            for (var i = 0, l = objectGroup.length; i < l; ++i)
            {
                var objGeometry = objGeometryMap.get(objectGroup[i]);
                objGeometry.coordDelta = Kekule.CoordUtils.add(objGeometry.coordDelta, delta);
            }

            var adjustedContainerBox = Kekule.BoxUtils.transform2D(sumContainerBox, {translateX: delta.x, translateY: delta.y});
            var newObjsContainerBox = Kekule.BoxUtils.getContainerBox(objsContainerBox, adjustedContainerBox);
            // modify the original objContainerBox
            Object.extend(objsContainerBox, newObjsContainerBox);

            var result = {
                'adjustedContainerBox': adjustedContainerBox
            };

            return result;
        };

        var mainObjectsBox = {}, assocObjectsBox = {}, reactionArrowBox = {};
        // var objGeometryMap = new Kekule.MapEx();
        // try
        {
            var mainObjects = [];  // objects in arrow direction, reactants, products and plus symbol, reaction arrow
            var assocObjects = [];    // objects in arrow vertical direction, reagents

            // the first time layout
            var currCoord = {x: 0, y: 0};  // since we need to adjust coords of each object, we start from 0, 0 here

            // first handle reagents, we divide them into two groups, one above arrow and one below arrow, and we need to calc the length of reaction arrow also
            var reagents = [];
            for (var i = 0, l = targetAssocSubstanceTypes.length; i < l; ++i)
            {
                reagents = reagents.concat(reaction.getSubstancesOfType(targetAssocSubstanceTypes[i]));
            }

            var firstHalfReagentCount = Math.ceil(reagents.length / 2);
            var reagentGroup1 = reagents.slice(0, firstHalfReagentCount);
            var reagentGroup2 = reagents.slice(firstHalfReagentCount);
            var reagentStackOnSecondardyAxis = !ops.assocSubstanceStackOnPrimaryAxis;

            /*
            if (false && reagentStackOnSecondardyAxis) {
                for (var i = reagentGroup1.length - 1; i >= 0; --i)  // group1, arrange them from bottom to top by default
                {
                    var currGeometry;
                    var substance = getTargetMolecule(reagentGroup1[i], chemDoc, doMoleculesClone);
                    currGeometry = arrangeReactionObject(reagentStackOnSecondardyAxis, currCoord, substance, substanceGapSecondary, primaryAxis, secondaryAxis,
                        assocSubstancePrimaryAxisLayoutWeight, 1, assocObjectsBox, objGeometryMap);
                    assocObjects.push(substance);
                    currCoord = currGeometry.nextStartingCoord;
                }
                currCoord = {x: 0, y: 0};   // reset to the zero point, begin to arrange group 2
                for (var i = 0, l = reagentGroup2.length; i < l; ++i)  // group2, arrange them from top to bottom by default
                {
                    var currGeometry;
                    var substance = getTargetMolecule(reagentGroup2[i], chemDoc, doMoleculesClone);
                    currGeometry = arrangeReactionObject(reagentStackOnSecondardyAxis, currCoord, substance, substanceGapSecondary, primaryAxis, secondaryAxis,
                        assocSubstancePrimaryAxisLayoutWeight, -1, assocObjectsBox, objGeometryMap);
                    assocObjects.push(substance);
                    currCoord = currGeometry.nextStartingCoord;
                }
            }
            else  // reagentStackOnPrimaryAxis, we can not layout them individually, must handle them as group
            */
            {
                var groupPrimaryAxisLayoutWeight;
                if (primaryAxis === 'y')
                {
                    groupPrimaryAxisLayoutWeight = (ops.assocSubstanceAlignMode === ROA.BOTTOM) ? 1 :
                        (ops.assocSubstanceAlignMode === ROA.TOP) ? -1
                            : 0;  // center
                }
                else
                {
                    groupPrimaryAxisLayoutWeight = (ops.assocSubstanceAlignMode === ROA.RIGHT) ? -1 :
                        (ops.assocSubstanceAlignMode === ROA.LEFT) ? 1
                            : 0;  // center
                }

                // group1
                if (reagentGroup1.length)
                {
                    var targetGroup = []
                    for (var i = 0, l = reagentGroup1.length; i < l; ++i)
                    {
                        var substance = getTargetMolecule(reagentGroup1[i], chemDoc, doMoleculesClone);
                        targetGroup.push(substance);
                    }
                    currCoord = {x: 0, y: 0};
                    currCoord[secondaryAxis] += substanceGapSecondary;
                    var groupGeometry = arrangeReactionObjectSubGroup(
                        reagentStackOnSecondardyAxis, reagentStackOnSecondardyAxis, currCoord, targetGroup, substanceGapPrimary, primaryAxis, secondaryAxis,
                        assocSubstancePrimaryAxisLayoutWeight, 1,
                        groupPrimaryAxisLayoutWeight, 1,
                        assocObjectsBox, objGeometryMap
                    );
                    assocObjects = assocObjects.concat(targetGroup);
                }
                // group2
                if (reagentGroup2.length)
                {
                    var targetGroup = []
                    for (var i = 0, l = reagentGroup2.length; i < l; ++i)
                    {
                        var substance = getTargetMolecule(reagentGroup2[i], chemDoc, doMoleculesClone);
                        targetGroup.push(substance);
                    }
                    currCoord = {x: 0, y: 0};
                    currCoord[secondaryAxis] -= substanceGapSecondary;
                    groupGeometry = arrangeReactionObjectSubGroup(
                        reagentStackOnSecondardyAxis, false, currCoord, targetGroup, substanceGapPrimary, primaryAxis, secondaryAxis,
                        assocSubstancePrimaryAxisLayoutWeight, -1,
                        groupPrimaryAxisLayoutWeight, -1,
                        assocObjectsBox, objGeometryMap
                    );
                    assocObjects = assocObjects.concat(targetGroup);
                }
            }

            var assocObjectBoxSize = !Kekule.BoxUtils.isUnset(assocObjectsBox)? {x: assocObjectsBox.x2 - assocObjectsBox.x1, y: assocObjectsBox.y2 - assocObjectsBox.y1}: {x: 0, y: 0};

            // reset the curr coord and arrange the reaction arrow
            currCoord = {x: 0, y: 0};
            var reactionArrowSize = Math.max(ops.reactionArrowMinSize, (assocObjectBoxSize[primaryAxis] || 0) + ops.reactionArrowPadding * 2);
            // var reactionArrowActualPadding = Math.max(ops.reactionArrowPadding, (ops.reactionArrowMinSize - assocObjectBoxSize[primaryAxis] / 2));
            var reactionArrowActualPadding = (reactionArrowSize - (assocObjectBoxSize[primaryAxis] || 0)) / 2;
            var reactionArrowStartingCoord = Object.extend({}, currCoord), reactionArrowEndingCoord = Object.extend({}, currCoord);


            reactionArrowStartingCoord[primaryAxis] = (assocObjectsBox[primaryAxis + '1'] || 0) - reactionArrowActualPadding;
            reactionArrowEndingCoord[primaryAxis] = (assocObjectsBox[primaryAxis + '2'] || 0) + reactionArrowActualPadding;

            /*
            if (assocSubstancePrimaryAxisLayoutWeight === -1)  // align to right or top
            {
                reactionArrowStartingCoord[primaryAxis] += (assocObjectBoxSize[primaryAxis] + reactionArrowActualPadding) * assocSubstancePrimaryAxisLayoutWeight;
                reactionArrowEndingCoord[primaryAxis] += (-reactionArrowActualPadding * assocSubstancePrimaryAxisLayoutWeight);
            }
            else if (assocSubstancePrimaryAxisLayoutWeight === 1)  // align to left or bottom
            {
                reactionArrowStartingCoord[primaryAxis] -= reactionArrowActualPadding * assocSubstancePrimaryAxisLayoutWeight;
                reactionArrowEndingCoord[primaryAxis] -= -(assocObjectBoxSize[primaryAxis] + reactionArrowActualPadding) * assocSubstancePrimaryAxisLayoutWeight;
            }
            else   // align to center
            {
                reactionArrowStartingCoord[primaryAxis] -= (reactionArrowActualPadding + assocObjectBoxSize[primaryAxis]/2);
                reactionArrowEndingCoord[primaryAxis] += (reactionArrowActualPadding + assocObjectBoxSize[primaryAxis]/2);
            }
            */

            if (mainSubstancePrimaryAxisLayoutWeight < 0)  // reversed direction, need to revert starting/ending coord
            {
                var tempCoord = reactionArrowStartingCoord;
                reactionArrowStartingCoord = reactionArrowEndingCoord;
                reactionArrowEndingCoord = tempCoord;
            }
            var reactionArrow = new Kekule.Glyph.ReactionArrow(null, ops.docRefLength, {
                // 'endArrowType': Kekule.Glyph.ArrowType.OPEN,
                'startArrowWidth': 0.25,
                'startArrowLength': 0.25,
                'endArrowWidth': 0.25,
                'endArrowLength': 0.25,
                // 'startArrowType': Kekule.Glyph.ArrowType.NONE,
                // 'lineLength': 1.5
            });
            chemDoc.appendChild(reactionArrow);
            reactionArrow.setCoord2D(currCoord);
            if (reaction.getDirection() === Kekule.ChemReactionDirection.BIDIRECTION)
                reactionArrow.setReactionType(Kekule.Glyph.ReactionArrowType.REVERSIBLE);
            else if (reaction.getDirection() === Kekule.ChemReactionDirection.RESONANCE)
                reactionArrow.setReactionType(Kekule.Glyph.ReactionArrowType.RESONANCE);
            else
                reactionArrow.setReactionType(Kekule.Glyph.ReactionArrowType.NORMAL);
            reactionArrow.getNodeAt(0).setCoord2D(reactionArrowStartingCoord);
            reactionArrow.getNodeAt(1).setCoord2D(reactionArrowEndingCoord);
            objGeometryMap.set(reactionArrow, {
                'coordDelta': {x: 0, y: 0},
            });
            reactionArrowBox = Kekule.BoxUtils.createBox(reactionArrowStartingCoord, reactionArrowEndingCoord);

            // the reactants, on arrow left by default, we arrange them from the near to far (right to left by default, reverse the primary direction)
            if (targetMainSubstanceTypes.indexOf(Kekule.ChemReactionComponent.REACTANT) >= 0)
            {
                // reset to the reaction arrow start coord, begin to arrange reactants
                currCoord = Object.extend({}, reactionArrowStartingCoord);
                // currCoord[primaryAxis] += assocObjectBoxSize[primaryAxis] * assocSubstancePrimaryAxisLayoutWeight;

                for (var i = reaction.getReactantCount() - 1; i >= 0; --i)
                {
                    var currGeometry;

                    var substance = getTargetMolecule(reaction.getReactantAt(i), chemDoc, doMoleculesClone);
                    currGeometry = arrangeReactionObject(false, currCoord, substance, substanceGapPrimary, primaryAxis, secondaryAxis,
                        -mainSubstancePrimaryAxisLayoutWeight, mainSubstanceSecondaryAxisAlignWeight,
                        mainObjectsBox, objGeometryMap);
                    mainObjects.push(substance);
                    currCoord = currGeometry.nextStartingCoord;

                    if (i > 0)  // need to add a plus symbol
                    {
                        var plusSymbol = createPlusSymbol(chemDoc);
                        currGeometry = arrangeReactionObject(false, currCoord, plusSymbol, substanceGapPrimary, primaryAxis, secondaryAxis,
                            -mainSubstancePrimaryAxisLayoutWeight, mainSubstanceSecondaryAxisAlignWeight,
                            mainObjectsBox, objGeometryMap);
                        mainObjects.push(plusSymbol);
                        currCoord = currGeometry.nextStartingCoord;
                    }
                }
            }

            if (targetMainSubstanceTypes.indexOf(Kekule.ChemReactionComponent.PRODUCT) >= 0)
            {
                // the products, on arrow right by default, arrange them from near to far (left to right by default)
                currCoord = Object.extend({}, reactionArrowEndingCoord);

                for (var i = 0, l = reaction.getProductCount(); i < l; ++i)
                {
                    var currGeometry;

                    if (i > 0)  // need to add a plus symbol
                    {
                        var plusSymbol = createPlusSymbol(chemDoc);
                        currGeometry = arrangeReactionObject(false, currCoord, plusSymbol, substanceGapPrimary, primaryAxis, secondaryAxis,
                            mainSubstancePrimaryAxisLayoutWeight, mainSubstanceSecondaryAxisAlignWeight,
                            mainObjectsBox, objGeometryMap);
                        mainObjects.push(plusSymbol);
                        currCoord = currGeometry.nextStartingCoord;
                    }

                    var substance = getTargetMolecule(reaction.getProductAt(i), chemDoc, doMoleculesClone);
                    currGeometry = arrangeReactionObject(false, currCoord, substance, substanceGapPrimary, primaryAxis, secondaryAxis,
                        mainSubstancePrimaryAxisLayoutWeight, mainSubstanceSecondaryAxisAlignWeight,
                        mainObjectsBox, objGeometryMap);
                    mainObjects.push(substance);
                    currCoord = currGeometry.nextStartingCoord;
                }
            }

            // second: adjust the position of each object, calculate the delta coord
            var XA = Kekule.Render.BoxXAlignment, YA = Kekule.Render.BoxYAlignment;
            var totalContainerBox = Kekule.BoxUtils.getContainerBox(mainObjectsBox, assocObjectsBox);
            totalContainerBox = Kekule.BoxUtils.getContainerBox(totalContainerBox, reactionArrowBox);

            var currPositionPointCoord = {};
            currPositionPointCoord.x = (ops.reactionBoxXAlignment === XA.LEFT)? totalContainerBox.x1:
                (ops.reactionBoxXAlignment === XA.RIGHT)? totalContainerBox.x2:
                totalContainerBox.x1 + (totalContainerBox.x2 - totalContainerBox.x1)/2;  // (ops.reactionBoxXAlignment === XA.CENTER)
            currPositionPointCoord.y = (ops.reactionBoxYAlignment === YA.TOP)? totalContainerBox.y2:
                (ops.reactionBoxYAlignment === YA.BOTTOM)? totalContainerBox.y1:
                totalContainerBox.y1 + (totalContainerBox.y2 - totalContainerBox.y1)/2;

            var deltaCoord = Kekule.CoordUtils.substract(baseCoord, currPositionPointCoord);

            if (singleLineMode)
            {
                if (primaryAxis === 'x')
                    deltaCoord.y = 0;
                else if (primaryAxis === 'y')
                    deltaCoord.x = 0;
            }

            // var deltaCoord = {x: 0, y: 0};
            var allObjects = [reactionArrow].concat(mainObjects).concat(assocObjects);
            for (var i = 0, l = allObjects.length; i < l; ++i)
            {
                var obj = allObjects[i];
                var currGeometry = objGeometryMap.get(obj);
                var currDelta = currGeometry.coordDelta || {x: 0, y: 0};
                var newDelta = Kekule.CoordUtils.add(currDelta, deltaCoord);
                // var oldCoord = obj.getCoord2D() || {x: 0, y: 0};
                // obj.setCoord2D(Kekule.CoordUtils.add(oldCoord, newDelta));
                currGeometry.coordDelta = newDelta;
            }

            var finalContainerBox = Kekule.BoxUtils.transform2D(totalContainerBox, {translateX: deltaCoord.x, translateY: deltaCoord.y});
            return {
                objects: allObjects,
                containerBox: finalContainerBox,
                // reactionArrowBox: reactionArrowBox
            };
        }
        // finally
        {
            // objGeometryMap.finalize();
        }
    },

    /**
     * Auto layout molecules and arrows of a series reactions in chemDoc.
     * By default, each reaction occupies a row.
     * @param {Kekule.ChemDocument} chemDoc
     * @param {Kekule.ChemReaction} reaction
     * @param {Hash} baseCoord
     * @param {Object} options Layout options, see source code of {@link Kekule.ReactionLayoutUtils._prepareReactionLayoutOptions} for details.
     * //@returns {Hash} The final container box to render the whole reaction.
     */
    layoutReactionsInChemDoc: function(chemDoc, reactions, baseCoord, options)
    {
        var XA = Kekule.Render.BoxXAlignment, YA = Kekule.Render.BoxYAlignment;
        var ROA = Kekule.ReactionObjectAlign;

        var ops = RLU._prepareReactionLayoutOptions(chemDoc, options);
        var singleReactionOps = Object.create(ops);

        var singleLineMode = !!ops.singleLine;

        var directionWeight;
        var primaryAxis = ops.primaryAxis;
        var secondaryAxis;
        if (ops.primaryAxis === 'y')
        {
            secondaryAxis = 'x';
            if (!singleLineMode)
                directionWeight = (ops.layoutXMode === Kekule.ReactionLayoutXMode.RtoL)? -1: 1;
            else
                directionWeight = (ops.layoutYMode === Kekule.ReactionLayoutYMode.BtoT)? 1: -1;
            singleReactionOps.reactionBoxXAlignment = (directionWeight < 0)? XA.RIGHT: XA.LEFT;  // for stacking reactions
            singleReactionOps.reactionBoxYAlignment = (ops.mainSubstancePrimaryAxisAlignMode === ROA.CENTER)? YA.CENTER:
                (ops.mainSubstancePrimaryAxisAlignMode === ROA.BOTTOM)? YA.BOTTOM
                    :YA.TOP;
        }
        else
        {
            secondaryAxis = 'y';
            if (!singleLineMode)
                directionWeight = (ops.layoutYMode === Kekule.ReactionLayoutYMode.BtoT)? 1: -1;
            else
                directionWeight = (ops.layoutXMode === Kekule.ReactionLayoutXMode.RtoL)? -1: 1;
            singleReactionOps.reactionBoxYAlignment = (directionWeight < 0)? YA.TOP: YA.BOTTOM;  // for stacking reactions
            singleReactionOps.reactionBoxXAlignment = (ops.mainSubstancePrimaryAxisAlignMode === ROA.CENTER)? XA.CENTER:
                (ops.mainSubstancePrimaryAxisAlignMode === ROA.RIGHT)? XA.RIGHT
                    :XA.LEFT;
        }

        var objGeometryMap = new Kekule.MapEx();
        try
        {
            chemDoc.beginUpdate();
            try
            {
                var reactionContainerBoxes = [];  // for debug
                var totalContainerBox = {};
                var totalObjects = [];
                var currCoord = Object.extend({}, baseCoord);

                for (var i = 0, l = reactions.length; i < l; ++i)
                {
                    var reaction = reactions[i];
                    var reactionLayoutResult = RLU._calcReactionLayoutInChemDoc(chemDoc, reaction, currCoord, objGeometryMap, singleReactionOps);
                    var currContainerBox = reactionLayoutResult.containerBox;
                    var currContainerBoxSize = {x: currContainerBox.x2 - currContainerBox.x1, y: currContainerBox.y2 - currContainerBox.y1};
                    reactionContainerBoxes.push(currContainerBox);

                    // console.log(i, currCoord, currContainerBox);

                    totalObjects = totalObjects.concat(reactionLayoutResult.objects);
                    totalContainerBox = Kekule.BoxUtils.getContainerBox(totalContainerBox, currContainerBox);

                    // decide the baseCoord for next reaction
                    if (i < l - 1)
                    {
                        if (!singleLineMode)  // layout in next line
                            currCoord[secondaryAxis] += (currContainerBoxSize[secondaryAxis] + (ops.reactionGap || 0)) * directionWeight;
                        else  // layout in curr line
                            currCoord[primaryAxis] += (currContainerBoxSize[ops.primaryAxis] + (ops.reactionGap || 0)) * directionWeight;
                    }
                }

                // adjust the position of each object, calculate the delta coord
                var currPositionPointCoord = {};
                currPositionPointCoord.x = (ops.reactionBoxXAlignment === XA.LEFT)? totalContainerBox.x1:
                    (ops.reactionBoxXAlignment === XA.RIGHT)? totalContainerBox.x2:
                        totalContainerBox.x1 + (totalContainerBox.x2 - totalContainerBox.x1)/2;  // (ops.reactionBoxXAlignment === XA.CENTER)
                currPositionPointCoord.y = (ops.reactionBoxYAlignment === YA.TOP)? totalContainerBox.y2:
                    (ops.reactionBoxYAlignment === YA.BOTTOM)? totalContainerBox.y1:
                        totalContainerBox.y1 + (totalContainerBox.y2 - totalContainerBox.y1)/2;

                var deltaCoord = Kekule.CoordUtils.substract(baseCoord, currPositionPointCoord);

                for (var i = 0, l = totalObjects.length; i < l; ++i)
                {
                    var obj = totalObjects[i];
                    var currGeometry = objGeometryMap.get(obj);
                    var currDelta = currGeometry.coordDelta || {x: 0, y: 0};
                    var newDelta = Kekule.CoordUtils.add(currDelta, deltaCoord);
                    var oldCoord = obj.getCoord2D() || {x: 0, y: 0};
                    obj.setCoord2D(Kekule.CoordUtils.add(oldCoord, newDelta));
                }
            }
            finally
            {
                chemDoc.endUpdate();
            }
        }
        finally
        {
            objGeometryMap.finalize();
        }
    },

    /**
     * Auto layout reaction molecules and arrow in chemDoc.
     * @param {Kekule.ChemDocument} chemDoc
     * @param {Kekule.ChemReaction} reaction
     * @param {Hash} baseCoord
     * @param {Object} options Layout options, see source code of {@link Kekule.ReactionLayoutUtils._prepareReactionLayoutOptions} for details.
     * //@returns {Hash} The final container box to render the whole reaction.
     */
    layoutReactionInChemDoc: function(chemDoc, reaction, baseCoord, options)
    {
        RLU.layoutReactionsInChemDoc(chemDoc, [reaction], baseCoord, options);
    }
}

var RU = Kekule.ReactionExtractionUtils;
var RLU = Kekule.ReactionLayoutUtils;
var oneOf = Kekule.oneOf;



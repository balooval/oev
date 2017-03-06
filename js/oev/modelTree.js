Oev.Model = Oev.Model || {};

Oev.Model.Tree = (function(){
	'use strict';
	
	var api = {
		build : function(_geometry, _coords, _tags) {
			if (_tags === undefined) {
				buildDefault(_geometry, _coords);
			} else {
				buildFromTags(_geometry, _coords, _tags);
			}
		}, 
	}
	
	function buildDefault(_geometry, _coords) {
		var defaultProps = { // in meters
			height : (5 + Math.random() * 2), 
		};
		defaultProps.circumference = defaultProps.height / 10;
		defaultProps.diameter_crown = defaultProps.circumference * 4;
		defaultProps.diameter_crown_top = defaultProps.diameter_crown ;
		generate(_geometry, _coords, defaultProps);
	}
		
	function buildFromTags(_geometry, _coords, _tags) {
		var propsToTest = [
			// 'height', 
			// 'circumference', 
			// 'genus', 
			// 'species', 
			// 'taxon', 
			// 'diameter_crown', 
			// 'leaf_type', 
			// 'leaf_cycle', 
		];
		for (var p = 0; p < propsToTest.length; p ++) {
			if (_tags[propsToTest[p]]) {
				console.log('Tree', propsToTest[p], _tags[propsToTest[p]]);
			}
		}
		var defaultProps = { // in meters
			height : _tags.height || (5 + Math.random() * 2), 
		};
		if (!_tags.height && _tags.diameter_crown) {
			defaultProps.height = _tags.diameter_crown / 5 * 8;
		}
		defaultProps.circumference = defaultProps.height / 8;
		if (_tags.circumference) {
			defaultProps.circumference = _tags.circumference;
		}
		defaultProps.diameter_crown = defaultProps.circumference * 4;
		if (_tags.diameter_crown) {
			defaultProps.diameter_crown = _tags.diameter_crown;
		}
		
		defaultProps.diameter_crown_top = defaultProps.diameter_crown ;
		if (_tags.leaf_type) {
			if (_tags.leaf_type == 'broadleaved') {
				defaultProps.diameter_crown_top *= 0.5;
			} else {
				defaultProps.diameter_crown_top *= 0.3;
			}
		}
		generate(_geometry, _coords, defaultProps);
	}
	
	function generate(_geometry, _coords, _props) {
			var treeProps = {
				altitude : _coords.alt, 
				lat : _coords.lat, 
				lon : _coords.lon, 
				// nbSections : 6, 
				nbSections : Math.max(4, Math.min(20, Math.round(_props.diameter_crown * 1)))
			};
			// var ratioCrownHeight = _props.diameter_crown / _props.circumference;
			// console.log('ratioCrownHeight', ratioCrownHeight);
			
			_props.diameter_crown *= 0.00002;
			_props.diameter_crown_top *= 0.00002;
			_props.circumference *= 0.00002;
			var trunkHeight = 0.3 + Math.random() * 0.25;
			var crownHeight = trunkHeight + Math.random() * 0.35;
			var tileVariant = Math.floor(Math.random() * 4) / 4;
			treeProps.height = _props.height;
			
			
			treeProps.texTile = [
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0, 
					endY : 0.2, 
				}, 
				// {
					// startX : tileVariant, 
					// endX : tileVariant + 0.25, 
					// startY : 0.2, 
					// endY : 0.5, 
				// }, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.5, 
					endY : 0.55, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.6, 
					endY : 0.7, 
				}, 
				// {
					// startX : tileVariant, 
					// endX : tileVariant + 0.25, 
					// startY : 0.7, 
					// endY : 0.8, 
				// }, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.8, 
					endY : 0.9, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.9, 
					endY : 1, 
				}, 
			];
			treeProps.radius = [
				_props.circumference * 1.5, 
				// _props.circumference, 
				_props.circumference, 
				_props.diameter_crown, 
				// _props.diameter_crown * 1.3, 
				_props.diameter_crown_top, 
				0, 
			];
			treeProps.radiusVariations = [
				0.8,
				// 0,
				0,
				0.4,
				// 0.3,
				0.1,
				0,
			];
			treeProps.alts = [
				0, 
				// trunkHeight * 0.1, 
				trunkHeight, 
				crownHeight, 
				1, 
				1.1, 
			];
			
			if(treeProps.height > 15) {
				treeProps.alts.splice(1, 0, trunkHeight * 0.1);
				treeProps.alts.splice(3, 0, crownHeight * 0.9);
				treeProps.alts.splice(5, 0, crownHeight + (1 - crownHeight) / 2);
				treeProps.radiusVariations.splice(1, 0, 0);
				treeProps.radiusVariations.splice(3, 0, 0.3);
				treeProps.radiusVariations.splice(5, 0, 0.2);
				treeProps.radius.splice(1, 0, _props.circumference);
				treeProps.radius.splice(3, 0, _props.diameter_crown * 0.8);
				treeProps.radius.splice(5, 0, _props.diameter_crown * 1.3);
				treeProps.texTile.splice(1, 0, {
						startX : tileVariant, 
						endX : tileVariant + 0.25, 
						startY : 0.2, 
						endY : 0.5, 
					} 
				);
				treeProps.texTile.splice(3, 0, {
						startX : tileVariant, 
						endX : tileVariant + 0.25, 
						startY : 0.55, 
						endY : 0.6, 
					}
				);
				treeProps.texTile.splice(5, 0, {
						startX : tileVariant, 
						endX : tileVariant + 0.25, 
						startY : 0.7, 
						endY : 0.8, 
					}
				);
				
				
			}
			
			Oev.GeometryBuilder.cylinder(_geometry, treeProps);
			
			// geometry.computeFaceNormals();
			// geometry.computeVertexNormals();
			// geometry.elementsNeedUpdate = true;
			// geometry.uvsNeedUpdate = true;
			// geometry.verticesNeedUpdate = true;
			// return geometry;
		}
	
	return api;
})();
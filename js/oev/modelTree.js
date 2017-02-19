Oev.Model = Oev.Model || {};

Oev.Model.Tree = (function(){
	'use strict';
	
	var api = {
		generate : function(_geometry, _lon, _lat, _alt, _tags) {
			var treeProps = {
				altitude : _alt, 
				lat : _lat, 
				lon : _lon, 
			};
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
			defaultProps.diameter_crown *= 0.00002;
			defaultProps.diameter_crown_top *= 0.00002;
			defaultProps.circumference *= 0.00002;
			var trunkHeight = 0.3 + Math.random() * 0.25;
			var crownHeight = Math.random() * 0.4;
			var tileVariant = Math.floor(Math.random() * 4) / 4;
			treeProps.height = defaultProps.height;
			treeProps.texTile = [
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0, 
					endY : 0.2, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.2, 
					endY : 0.5, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.5, 
					endY : 0.55, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.55, 
					endY : 0.7, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.7, 
					endY : 0.9, 
				}, 
				{
					startX : tileVariant, 
					endX : tileVariant + 0.25, 
					startY : 0.9, 
					endY : 1, 
				}, 
			];
			treeProps.scales = [
				defaultProps.circumference * 1.9, 
				defaultProps.circumference, 
				defaultProps.circumference, 
				defaultProps.diameter_crown, 
				defaultProps.diameter_crown_top, 
				0, 
			];
			treeProps.radiusVariations = [
				0.8,
				0,
				0,
				0.6,
				0.4,
				0,
			];
			treeProps.alts = [
				0, 
				trunkHeight * 0.15, 
				trunkHeight, 
				trunkHeight + crownHeight, 
				1, 
				1.1, 
			];
			Oev.GeometryBuilder.cylinder(_geometry, treeProps);
			
			// geometry.computeFaceNormals();
			// geometry.computeVertexNormals();
			// geometry.elementsNeedUpdate = true;
			// geometry.uvsNeedUpdate = true;
			// geometry.verticesNeedUpdate = true;
			// return geometry;
		}, 
	}
	
	return api;
})();
Oev.Geo = (function(){
	'use strict';
	console.warn('use Oev.Geo');
	
	var api = {
		projection : 'PLANE', 
		
		coordsToTile : function(_lon, _lat, _zoom) {
			_zoom = Math.floor(_zoom);
			var tile = new THREE.Vector2();
			tile.x = Math.floor( (_lon + 180) / 360 * Math.pow( 2, _zoom));
			tile.y = Math.floor((1 - Math.log(Math.tan(_lat * Math.PI / 180) + 1 / Math.cos(_lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow( 2, _zoom));
			tile.z = _zoom;
			return tile;
		}, 
		
		// Return altitude in opengl unit
		getAltitude : function(_zoomlevel, _radius) {
			if (api.projection == "SPHERE") {
				var C = (Math.PI * 2) * _radius;
				return (C * Math.cos(0) / Math.pow(2, _zoomlevel));
			}else if( api.projection == "PLANE" ){
				return ((_radius * Math.PI * 2) / Math.pow(2, _zoomlevel));
			}
		}, 
		
		zoomFromAltitude : function(_altitude, _radius, _globalScale) { // _altitude : meters units
			var a = ((_radius * _globalScale) * Math.PI * 2) / _altitude;
			return Math.min(Math.max(Math.log(a) / Math.log(2), 4), 19);
		}, 
	};
	
	return api;
})();

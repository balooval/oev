Oev.Geo = (function(){
	'use strict';
	
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
				
		mercatorLonToX : function(_lon) {
			var r_major = 6378137.000;
			return r_major * Oev.Math.radians(_lon);
		}, 
		
		mercatorLatToY : function(_lat) {
			if (_lat > 89.5)
				_lat = 89.5;
			if (_lat < -89.5)
				_lat = -89.5;
			var r_major = 6378137.000;
			var r_minor = 6356752.3142;
			var temp = r_minor / r_major;
			var es = 1.0 - (temp * temp);
			var eccent = Math.sqrt(es);
			var phi = Oev.Math.radians(_lat);
			var sinphi = Math.sin(phi);
			var con = eccent * sinphi;
			var com = .5 * eccent;
			con = Math.pow((1.0-con)/(1.0+con), com);
			var ts = Math.tan(.5 * (Math.PI*0.5 - phi))/con;
			var y = 0 - r_major * Math.log(ts);
			return y;
		}, 
		
	};
	
	return api;
})();

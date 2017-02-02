var Oev = (function(){
	var api = {};
	return api;
})();

Oev.Utils = (function(){
	'use strict';
	var api = {
		tileToCoords : function(_tile_x, _tile_y, _zoom){
			var p = new THREE.Vector2( 0, 0 );
			var n = Math.PI - ( (2.0 * Math.PI * _tile_y ) / Math.pow( 2.0, _zoom ) );
			p.x = ( ( _tile_x / Math.pow( 2.0, _zoom ) * 360.0 ) - 180.0 );
			p.y = (180.0 / Math.PI * Math.atan(Math.sinh( n ) ) );
			return p;
		}, 

		rgbToHex : function(r, g, b) {
			if (r > 255 || g > 255 || b > 255)
				throw "Invalid color component";
			return ((r << 16) | (g << 8) | b).toString(16);
		}, 
		
		getPolygonCentroid : function(pts) {
			var first = pts[0], last = pts[pts.length-1];
			if (first.lon != last.lon || first.lat != last.lat) pts.push(first);
			var twicearea=0,
			lon=0, lat=0,
			nPts = pts.length,
			p1, p2, f;
			for ( var i=0, j=nPts-1 ; i<nPts ; j=i++ ) {
				p1 = pts[i]; p2 = pts[j];
				f = p1.lon*p2.lat - p2.lon*p1.lat;
				twicearea += f;          
				lon += ( p1.lon + p2.lon ) * f;
				lat += ( p1.lat + p2.lat ) * f;
			}
			f = twicearea * 3;
			return { lon:lon/f, lat:lat/f };
		}, 
		
		coordDistance : function(_startLon, _startLat, _endLon, _endLat){
			var R = 6371000; // metres
			var sigma1 = Oev.Math.radians( _startLat );
			var sigma2 = Oev.Math.radians( _endLat );
			var deltaSigma = Oev.Math.radians( _endLat-_startLat )
			var deltaTruc = Oev.Math.radians( _endLon - _startLon );
			var a = Math.sin( deltaSigma / 2 ) * Math.sin( deltaSigma / 2 ) +
					Math.cos( sigma1 ) * Math.cos( sigma2 ) *
					Math.sin( deltaTruc / 2 ) * Math.sin( deltaTruc / 2 );
			var c = 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( 1 - a ) );
			var distance = R * c;
			return distance;
		}, 
	};
	
	api.Evt = function() {
		this.events = {};
		this.listeners = {};
	};
	
	api.Evt.prototype = {
		addEventListener : function(name, listener, handler) {
			if (this.events.hasOwnProperty(name)){
				this.events[name].push(handler);
				this.listeners[name].push(listener);
			}else{
				this.events[name] = [handler];
				this.listeners[name] = [listener];
			}
		}, 
		
		removeEventListener : function(name, listener, handler) {
			if (!this.events.hasOwnProperty(name))
				return;
			var index = -1;
			for( var i = 0; i < this.listeners[name].length; i ++ ){
				if( this.listeners[name][i] == listener && this.events[name][i] == handler ){
					index = i;
				}
			}
			if (index != -1){
				this.events[name].splice(index, 1);
				this.listeners[name].splice(index, 1);
			}else{
				debug( "removeEventListener NOT found" );
			}
		}, 

		fireEvent : function(name, args) {
			if (!this.events.hasOwnProperty(name)) {
				return;
			}
			if (args === undefined || !args.length) {
				args = [];
			}
			var evs = this.events[name], l = evs.length;
			for (var i = 0; i < l; i++) {
				evs[i].apply(this.listeners[name][i], args);
			}
		}
	}
	
	return api;
})();
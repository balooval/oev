Oev.Math = (function(){
	'use strict';
	var api = {
		radians : function(_degres){
			return Math.PI * _degres / 180;
		}, 
		
		angle2D : function(x1, y1, x2, y2) {
			var dtheta,theta1,theta2;
			theta1 = Math.atan2( y1, x1 );
			theta2 = Math.atan2( y2, x2 );
			dtheta = theta2 - theta1;
			while( dtheta > Math.PI ){
				dtheta -= ( Math.PI * 2 );
			}
			while( dtheta < -Math.PI ){
				dtheta += ( Math.PI * 2 );
			}
			return dtheta;
		}, 
		
		ptIsInPolygon : function(_polygon, _lon, _lat) {
			var angle = 0;
			var ptA;
			var ptB;
			var segNb = _polygon.length - 1;
			for( var i = 0; i < segNb; i++ ){
				ptA = _polygon[i];
				ptB = _polygon[i+1];
				angle += Oev.Math.angle2D( ptA[0]-_lon, ptA[1]-_lat, ptB[0]-_lon, ptB[1]-_lat );
			}
			if( Math.abs( angle ) < Math.PI ){
				return false;
			}
			return true;
		}, 
		
		findCentroid : function (pts){
			var nPts = pts.length;
			var off = pts[0];
			var twicearea = 0;
			var x = 0;
			var y = 0;
			var p1,p2;
			var i;
			var j;
			var f;
			for (i = 0, j = nPts - 1; i < nPts; j = i++) {
				p1 = pts[i];
				p2 = pts[j];
				f = (p1[1] - off[1]) * (p2[0] - off[0]) - (p2[1] - off[1]) * (p1[0] - off[0]);
				twicearea += f;
				x += (p1[1] + p2[1] - 2 * off[1]) * f;
				y += (p1[0] + p2[0] - 2 * off[0]) * f;
			}
			f = twicearea * 3;
			return {
				lat: x / f + off[1],
				lon: y / f + off[0]
			};
		},
	};
	
	return api;
})();

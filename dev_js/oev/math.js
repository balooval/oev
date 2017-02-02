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
	};
	
	return api;
})();

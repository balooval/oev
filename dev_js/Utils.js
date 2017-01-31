var TweenValue = function ( _value ) {
	_value = _value || 0;
	this.value = _value;
	this.valueStart = 0;
	this.valueEnd = 0;
	this.timeStart = -1;
	this.timeEnd = -1;
	this.timeTotal = -1;
	this.running = false;
	
	this.evt = new Evt();
}

TweenValue.prototype.setTargetValue = function( _value, _duration ) {
	var d = new Date();
	var curTime = d.getTime();
	this.valueStart = this.value;
	this.valueEnd = _value;
	this.timeStart = curTime;
	this.timeEnd = curTime + _duration;
	this.timeTotal = this.timeEnd - this.timeStart;
	this.running = true;
}

TweenValue.prototype.getValueAtTime = function( _curTime ) {
	this.timeTotal = this.timeEnd - this.timeStart;
	var timeElapsed = _curTime - this.timeStart;
	var timePrct = ( timeElapsed / this.timeTotal );
	var delta = this.valueEnd - this.valueStart;
	this.value = this.valueStart + ( delta * ( timePrct ) );
	if( timePrct >= 1 ){
		this.reachTargetValue();
	}
	return this.value;
}

TweenValue.prototype.reachTargetValue = function() {
	this.value = this.valueEnd;
	this.valueStart = this.valueEnd;
	this.timeEnd = -1;
	this.timeTotal = -1;
	this.running = false;
	
	this.evt.fireEvent( "END" );
}


function radians( _degres ){
	return Math.PI * _degres / 180;
}

function coordDistance( _startLon, _startLat, _endLon, _endLat ){
	var R = 6371000; // metres
	var sigma1 = radians( _startLat );
	var sigma2 = radians( _endLat );
	var deltaSigma = radians( _endLat-_startLat )
	var deltaTruc = radians( _endLon - _startLon );
	var a = Math.sin( deltaSigma / 2 ) * Math.sin( deltaSigma / 2 ) +
			Math.cos( sigma1 ) * Math.cos( sigma2 ) *
			Math.sin( deltaTruc / 2 ) * Math.sin( deltaTruc / 2 );
	var c = 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( 1 - a ) );
	var distance = R * c;
	return distance;
}


function ptIsInPolygon( _polygon, _lon, _lat ) {
	var angle = 0;
	var ptA;
	var ptB;
	var segNb = _polygon.length - 1;
	for( var i = 0; i < segNb; i++ ){
		ptA = _polygon[i];
		ptB = _polygon[i+1];
		angle += angle2D( ptA[0]-_lon, ptA[1]-_lat, ptB[0]-_lon, ptB[1]-_lat );
	}
	if( Math.abs( angle ) < Math.PI ){
		return false;
	}
	return true;
}



function angle2D( x1, y1, x2, y2 ) {
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
}




var Evt = function () {
    var _this = this;
    _this.events = {};
    _this.listeners = {};

    _this.addEventListener = function(name, listener, handler) {
        if (_this.events.hasOwnProperty(name)){
            _this.events[name].push(handler);
            _this.listeners[name].push(listener);
        }else{
            _this.events[name] = [handler];
            _this.listeners[name] = [listener];
		}
    };

    _this.removeEventListener = function(name, listener, handler) {
        if (!_this.events.hasOwnProperty(name))
            return;
		/*
        var index = _this.events[name].indexOf(handler);
        if (index != -1){
            _this.events[name].splice(index, 1);
            _this.listeners[name].splice(index, 1);
		}
		*/
		
		var index = -1;
		for( var i = 0; i < _this.listeners[name].length; i ++ ){
			if( _this.listeners[name][i] == listener && _this.events[name][i] == handler ){
				index = i;
			}
		}
		if (index != -1){
            _this.events[name].splice(index, 1);
            _this.listeners[name].splice(index, 1);
		}else{
			debug( "removeEventListener NOT found" );
		}
    };

    _this.fireEvent = function(name, args) {
        if (!_this.events.hasOwnProperty(name))
            return;

        if (!args || !args.length)
            args = [];

        var evs = _this.events[name], l = evs.length;
        for (var i = 0; i < l; i++) {
            // evs[i].apply(null, args);
            evs[i].apply(_this.listeners[name][i], args);
        }
    };
}

function tileToCoords( _tile_x, _tile_y, _zoom){
    var p = new THREE.Vector2( 0, 0 );
    var n = Math.PI - ( (2.0 * Math.PI * _tile_y ) / Math.pow( 2.0, _zoom ) );
    p.x = ( ( _tile_x / Math.pow( 2.0, _zoom ) * 360.0 ) - 180.0 );
    p.y = (180.0 / Math.PI * Math.atan(Math.sinh( n ) ) );
    return p;
}


function getPolygonCentroid( pts ) {
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
}


function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

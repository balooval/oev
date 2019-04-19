export let projection = 'PLANE';

export function tileToCoords(_tile_x, _tile_y, _zoom) {
	const p = [];
	const n = Math.PI - ((2.0 * Math.PI * _tile_y) / Math.pow(2.0, _zoom));
	p[0] = ((_tile_x / Math.pow(2.0, _zoom) * 360.0) - 180.0);
	p[1]= (180.0 / Math.PI * Math.atan(Math.sinh(n)));
	return p;
}

export function tileToCoordsVect(_tile_x, _tile_y, _zoom){
	const res = tileToCoords(_tile_x, _tile_y, _zoom);
	return new THREE.Vector2(res[0], res[1]);
}

export function coordDistance(_startLon, _startLat, _endLon, _endLat){
	const R = 6371000; // metres
	const sigma1 = Oev.Math.radians( _startLat );
	const sigma2 = Oev.Math.radians( _endLat );
	const deltaSigma = Oev.Math.radians( _endLat-_startLat )
	const deltaTruc = Oev.Math.radians( _endLon - _startLon );
	const a = Math.sin(deltaSigma / 2) * Math.sin(deltaSigma / 2) +
			Math.cos(sigma1) * Math.cos(sigma2) *
			Math.sin(deltaTruc / 2) * Math.sin(deltaTruc / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;
	return distance;
}

export function coordsToTile(_lon, _lat, _zoom) {
	_zoom = Math.floor(_zoom);
	const tile = new THREE.Vector3();
	tile.x = Math.floor( (_lon + 180) / 360 * Math.pow( 2, _zoom));
	tile.y = Math.floor((1 - Math.log(Math.tan(_lat * Math.PI / 180) + 1 / Math.cos(_lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow( 2, _zoom));
	tile.z = _zoom;
	return tile;
}

// Return altitude in opengl unit
export function getAltitude(_zoomlevel, _radius) {
	if (projection == "SPHERE") {
		const C = (Math.PI * 2) * _radius;
		return (C * Math.cos(0) / Math.pow(2, _zoomlevel));
	}
	if (projection == "PLANE") {
		return ((_radius * Math.PI * 2) / Math.pow(2, _zoomlevel));
	}
}

export function zoomFromAltitude(_altitude, _radius, _globalScale) { // _altitude : meters units
	const a = ((_radius * _globalScale) * Math.PI * 2) / _altitude;
	return Math.min(Math.max(Math.log(a) / Math.log(2), 4), 19);
}
		
export function mercatorLonToX(_lon) {
	const r_major = 6378137.000;
	return r_major * Oev.Math.radians(_lon);
}

export function mercatorLatToY(_lat) {
	_lat = Math.max(-89.5, Math.min(89.5, _lat));
	const r_major = 6378137.000;
	const r_minor = 6356752.3142;
	const temp = r_minor / r_major;
	const es = 1.0 - (temp * temp);
	const eccent = Math.sqrt(es);
	const phi = Oev.Math.radians(_lat);
	const sinphi = Math.sin(phi);
	let con = eccent * sinphi;
	const com = 0.5 * eccent;
	con = Math.pow((1.0 - con) / (1.0 + con), com);
	const ts = Math.tan(0.5 * (Math.PI*0.5 - phi)) / con;
	const y = 0 - r_major * Math.log(ts);
	return y;
}
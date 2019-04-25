import GLOBE from './globe.js';

const store = [{
	zoom : 1, 
	startLon : -180, 
	startLat : 90, 
	endLon : 180, 
	endLat : -90, 
	datas : null, 
	childs : [], 
}];

const api = {
	
	set : function(_tile, _buffer) {
		let struct = {
			zoom : _tile.zoom, 
			startLon : _tile.startCoord.x, 
			startLat : _tile.startCoord.y, 
			endLon : _tile.endCoord.x, 
			endLat : _tile.endCoord.y, 
			datas : _buffer, 
			childs : [], 
		};
		addStruct(struct, store);
	}, 

	get : function(_lon, _lat) {
		const struct = searchCoord(_lon, _lat);
		if (!struct) return 0;
		if (!struct.datas) return 0;
		return interpolate(struct, _lon, _lat);
	}

};

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	return (_value - _min) / length;
}

function slideValue(_min, _max, _prct) {
	const diff = _max - _min;
	return _min + diff * _prct;
}

function interpolate(_struct, _lon, _lat) {
	const prctFromLon = mapValue(_lon, _struct.startLon, _struct.endLon);
	const prctFromLat = mapValue(_lat, _struct.endLat, _struct.startLat);
	const vertBySide = GLOBE.tilesDefinition + 1;
	
	// const bufferX = Math.round(prctFromLon * vertBySide);
	// const bufferY = vertBySide - Math.round(prctFromLat * vertBySide);
	// const bufferIndex = (bufferX * vertBySide) + bufferY;
	// const elevation = _struct.datas[bufferIndex];

	const prctX = mapValue(prctFromLon * vertBySide, Math.floor(prctFromLon * vertBySide), Math.ceil(prctFromLon * vertBySide));
	const prctY = mapValue(prctFromLat * vertBySide, Math.floor(prctFromLat * vertBySide), Math.ceil(prctFromLat * vertBySide));
	
	const bufferXMin = Math.floor(prctFromLon * vertBySide);
	const bufferYMin = vertBySide - Math.floor(prctFromLat * vertBySide);
	const bufferXMax = Math.ceil(prctFromLon * vertBySide);
	const bufferYMax = vertBySide - Math.ceil(prctFromLat * vertBySide);
	
	const bufferIndexMinXMinY = (bufferXMin * vertBySide) + bufferYMin;
	const elevationMinXMinY = _struct.datas[bufferIndexMinXMinY];
	const bufferIndexMaxXMinY = (bufferXMax * vertBySide) + bufferYMin;
	const elevationMaxXMinY = _struct.datas[bufferIndexMaxXMinY];

	const bufferIndexMinXMaxY = (bufferXMin * vertBySide) + bufferYMax;
	const elevationMinXMaxY = _struct.datas[bufferIndexMinXMaxY];
	const bufferIndexMaxXMaxY = (bufferXMax * vertBySide) + bufferYMax;
	const elevationMaxXMaxY = _struct.datas[bufferIndexMaxXMaxY];

	const interpolXMin = slideValue(elevationMinXMinY, elevationMaxXMinY, prctX);
	const interpolXMax = slideValue(elevationMinXMaxY, elevationMaxXMaxY, prctX);
	const interpolY = slideValue(interpolXMin, interpolXMax, prctY);
	return interpolY;
	

	// return elevation;
}

function searchCoord(_lon, _lat) {
	let validParent;
	let parents = store;
	while(true) {
		let parent = parents.filter(s => structContainCoord(s, _lon, _lat)).pop();
		if (parent) {
			parents = parent.childs;
			validParent = parent;
		} else {
			break;
		}
	}
	return validParent;
}

function addStruct(_struct, _parents) {
	let validParent;
	while(true) {
		let parent = _parents.filter(s => structContainStruct(s, _struct)).pop();
		if (parent) {
			_parents = parent.childs;
			validParent = parent;
		} else {
			break;
		}
	}
	_struct.childs = validParent.childs.filter(s => structContainStruct(_struct, s));
	validParent.childs = validParent.childs.filter(s => !structContainStruct(_struct, s));
	validParent.childs.push(_struct);
}

function structContainStruct(_structA, _structB) {
	if (_structA.zoom >= _structB.zoom) return false;
	if (_structA.startLon > _structB.startLon) return false;
	if (_structA.startLat < _structB.startLat) return false;
	if (_structA.endLon < _structB.endLon) return false;
	if (_structA.endLat > _structB.endLat) return false;
	return true;
}

function structContainCoord(_struct, _lon, _lat) {
	if (_struct.startLon > _lon) return false;
	if (_struct.startLat < _lat) return false;
	if (_struct.endLon < _lon) return false;
	if (_struct.endLat > _lat) return false;
	return true;
}

function debug() {
	console.log('STORE', store);
	// const tmp = store[0].childs.filter(s => structContainCoord(s, 4.1, 43.7));
	// console.log('searchCoord', searchCoord(4.1, 43.7));
	console.log('get', api.get(3.85, 43.962));
}

window.debug = debug;

export { api as default}

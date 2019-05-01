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
	}, 

	delete : function(_tile) {
		let startLon = _tile.startCoord.x;
		let startLat = _tile.startCoord.y;
		let endLon = _tile.endCoord.x;
		let endLat = _tile.endCoord.y;
		let midLon = _tile.middleCoord.x;
		let midLat = _tile.middleCoord.y;
		let validParent;
		let parents = store;
		let prevParent;
		while(true) {
			prevParent = validParent;
			let parent = parents.filter(s => structContainCoord(s, midLon, midLat)).pop();
			if (!parent) break;
			validParent = parent;
			parents = parent.childs;
			if (isStructure(validParent, startLon, startLat, endLon, endLat)) {
				prevParent.childs = prevParent.childs.filter(s => !isStructure(s, startLon, startLat, endLon, endLat));
				break;
			}
		}
		
	}, 
	
};

function isStructure(_struct, _startLon, _startLat, _endLon, _endLat) {
	if (_struct.startLon != _startLon) return false;
	if (_struct.startLat != _startLat) return false;
	if (_struct.endLon != _endLon) return false;
	if (_struct.endLat != _endLat) return false;
	return true;
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}

function slideValue(_min, _max, _prct) {
	const diff = _max - _min;
	return _min + diff * _prct;
}

function interpolate(_struct, _lon, _lat) {
	const vertBySide = GLOBE.tilesDefinition + 0;
	const vertBySideMax = GLOBE.tilesDefinition + 1;

	const prctFromLon = mapValue(_lon, _struct.startLon, _struct.endLon); // 0 -> 1
	const prctFromLat = mapValue(_lat, _struct.endLat, _struct.startLat);

	const bufferXMin = Math.floor(prctFromLon * vertBySide); // 0 -> 17
	const bufferYMin = vertBySide - Math.floor(prctFromLat * vertBySide);
	const bufferXMax = Math.ceil(prctFromLon * vertBySide); // 0 -> 17
	const bufferYMax = vertBySide - Math.ceil(prctFromLat * vertBySide);
	
	const bufferIndexMinXMinY = (bufferXMin * vertBySideMax) + bufferYMin;
	const bufferIndexMaxXMinY = (bufferXMax * vertBySideMax) + bufferYMin;
	const bufferIndexMinXMaxY = (bufferXMin * vertBySideMax) + bufferYMax;
	const bufferIndexMaxXMaxY = (bufferXMax * vertBySideMax) + bufferYMax;

	const elevationMinXMinY = _struct.datas[bufferIndexMinXMinY];
	const elevationMaxXMinY = _struct.datas[bufferIndexMaxXMinY];
	const elevationMinXMaxY = _struct.datas[bufferIndexMinXMaxY];
	const elevationMaxXMaxY = _struct.datas[bufferIndexMaxXMaxY];

	const prctX = mapValue(prctFromLon * vertBySide, Math.floor(prctFromLon * vertBySide), Math.ceil(prctFromLon * vertBySide)); // 0 -> 16
	const prctY = mapValue(prctFromLat * vertBySide, Math.floor(prctFromLat * vertBySide), Math.ceil(prctFromLat * vertBySide));
	
	const interpolXMin = slideValue(elevationMinXMinY, elevationMaxXMinY, prctX);
	const interpolXMax = slideValue(elevationMinXMaxY, elevationMaxXMaxY, prctX);
	const interpolY = slideValue(interpolXMin, interpolXMax, prctY);
	return interpolY;
}

function searchCoord(_lon, _lat) {
	let validParent;
	let parents = store;
	while(true) {
		let parent = parents.filter(s => structContainCoord(s, _lon, _lat)).pop();
		if (parent) {
			validParent = parent;
			parents = parent.childs;
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
	let count = toto(0, store[0]);
	console.log('COUNT', count);
}

function toto(_count, _struct) {
	let nb = _struct.childs.length;
	_struct.childs.forEach(s => {
		nb += toto(_count, s);
	});
	return _count + nb;
}

window.debug = debug;

export { api as default}

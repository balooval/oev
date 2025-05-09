import {TILES_DEFINITION} from '../../core/tile.js';

let store = [{
	zoom : 1, 
	startLon : -180, 
	startLat : 90, 
	endLon : 180, 
	endLat : -90, 
	datas : null, 
	childs : [], 
}];


export function debug() {
	const res = debugCount(0, store[0]);
	console.log('res', res);
}

function debugCount(count, parent) {
	count += parent.childs.length;
	for (let i = 0; i < parent.childs.length; i ++) {
		count = debugCount(count, parent.childs[i]);
	}
	return count;
}

export function set(tile, buffer) {
	const struct = {
		zoom : tile.zoom, 
		startLon : tile.startCoord.x, 
		startLat : tile.startCoord.y, 
		endLon : tile.endCoord.x, 
		endLat : tile.endCoord.y, 
		midLon : tile.middleCoord.x, 
		midLat : tile.middleCoord.y, 
		datas : buffer, 
		childs : [], 
	};
	addStruct(struct, store);
}

export function get(lon, lat) {
	const struct = searchCoord(lon, lat);

	if (struct === null) {
		return 0;
	}

	if (!struct.datas) {
		return 0;
	}

	return interpolate(struct, lon, lat);
}

export function clear(tile) {
	const startLon = tile.startCoord.x;
	const startLat = tile.startCoord.y;
	const endLon = tile.endCoord.x;
	const endLat = tile.endCoord.y;
	const midLon = tile.middleCoord.x;
	const midLat = tile.middleCoord.y;
	let validParent;
	let parents = store;
	let prevParent;

	while(true) {
		prevParent = validParent;

		let parent = null;

		for (const struct of parents) {
			if (structContainCoord(struct, midLon, midLat) === true) {
				parent = struct;
				break;
			}
		}

		if (!parent) {
			break;
		}

		validParent = parent;
		parents = parent.childs;

		if (isStructure(validParent, startLon, startLat, endLon, endLat)) {

			validParent.datas = null;
			validParent.childs = [];

			const newChilds = []
			for (const child of prevParent.childs) {
				if (!isStructure(child, startLon, startLat, endLon, endLat)) {
					newChilds.push(child);
				}
			}
			
			prevParent.childs = newChilds;
			
			break;
		}
	}
}

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

function interpolate(struct, lon, lat) {
	const vertBySide = TILES_DEFINITION + 0;
	const vertBySideMax = TILES_DEFINITION + 1;

	const prctFromLon = mapValue(lon, struct.startLon, struct.endLon); // 0 -> 1
	const prctFromLat = mapValue(lat, struct.endLat, struct.startLat);

	const bufferXMin = Math.floor(prctFromLon * vertBySide); // 0 -> TILES_DEFINITION + 1
	const bufferYMin = Math.floor(prctFromLat * vertBySide);
	const bufferXMax = Math.ceil(prctFromLon * vertBySide); // 0 -> TILES_DEFINITION + 1
	const bufferYMax = Math.ceil(prctFromLat * vertBySide);
	
	const bufferIndexMinXMinY = (bufferXMin * vertBySideMax) + bufferYMin;
	const bufferIndexMaxXMinY = (bufferXMax * vertBySideMax) + bufferYMin;
	const bufferIndexMinXMaxY = (bufferXMin * vertBySideMax) + bufferYMax;
	const bufferIndexMaxXMaxY = (bufferXMax * vertBySideMax) + bufferYMax;

	const elevationMinXMinY = struct.datas[bufferIndexMinXMinY];
	const elevationMaxXMinY = struct.datas[bufferIndexMaxXMinY];
	const elevationMinXMaxY = struct.datas[bufferIndexMinXMaxY];
	const elevationMaxXMaxY = struct.datas[bufferIndexMaxXMaxY];

	const prctX = mapValue(prctFromLon * vertBySide, Math.floor(prctFromLon * vertBySide), Math.ceil(prctFromLon * vertBySide)); // 0 -> TILES_DEFINITION
	const prctY = mapValue(prctFromLat * vertBySide, Math.floor(prctFromLat * vertBySide), Math.ceil(prctFromLat * vertBySide));
	
	const interpolXMin = slideValue(elevationMinXMinY, elevationMaxXMinY, prctX);
	const interpolXMax = slideValue(elevationMinXMaxY, elevationMaxXMaxY, prctX);
	const interpolY = slideValue(interpolXMin, interpolXMax, prctY);
	
	if (isNaN(interpolY)) {
		return 0;
	}
	
	return interpolY;
}

function searchCoord(_lon, _lat) {
	let validParent = null;
	let parents = store;
	
	while(true) {
		let parent = null;

		for (let i = 0; i < parents.length; i ++) {
			const struct = parents[i];
			if (structContainCoord(struct, _lon, _lat) === true) {
				parent = struct
			}
		}

		if (parent === null) {
			break;
		}

		validParent = parent;
		parents = parent.childs;
	}
	return validParent;
}

function addStruct(struct, parents) {
	let validParent;

	while(true) {
		let currentParent;

		for (const parent of parents) {
			if (structContainStruct(parent, struct) === true) {
				currentParent = parent;
				break;
			}
		}

		if (currentParent) {
			parents = currentParent.childs;
			validParent = currentParent;
		} else {
			break;
		}
	}

	struct.childs = validParent.childs.filter(s => structContainStruct(struct, s));
	validParent.childs = validParent.childs.filter(s => !structContainStruct(struct, s));
	validParent.childs.push(struct);
}

function structContainStruct(structA, structB) {
	if (structA.zoom >= structB.zoom) return false;
	if (structA.startLon > structB.midLon) return false;
	if (structA.endLon < structB.midLon) return false;
	if (structA.startLat < structB.midLat) return false;
	if (structA.endLat > structB.midLat) return false;
	return true;
}

function structContainCoord(struct, lon, lat) {
	if (lon < struct.startLon) return false;
	if (lon >= struct.endLon) return false;
	if (lat > struct.startLat) return false;
	if (lat <= struct.endLat) return false;
	return true;
}

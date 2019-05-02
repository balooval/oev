import * as BuildingsLoader from './buildingLoader.js';

const mainZoom = 14;
let waitings = {};

export const store = {
	get : function(_zoom, _tileX, _tileY, _bbox, _priority, _callback) {
		const mainValues = valueAtMainZoom(_zoom, _tileX, _tileY);
		const key = mainValues.z + '_' + mainValues.x + '_' + mainValues.y;
		waitings[key] = waitings[key] || 0;
		waitings[key] ++;
		BuildingsLoader.loader.getData(
			{
				z : mainValues.z, 
				x : mainValues.x, 
				y : mainValues.y, 
				priority : _priority, 
				bbox : _bbox, 
			}, _callback
		);
	}, 

	abort : function(_zoom, _tileX, _tileY) {
		const mainValues = valueAtMainZoom(_zoom, _tileX, _tileY);
		const key = mainValues.z + '_' + mainValues.x + '_' + mainValues.y;
		waitings[key] = waitings[key] || 0;
		// console.warn('Abort', waitings[key]);
		waitings[key] --;
		waitings[key] = Math.max(0, waitings[key]);
		if (waitings[key] == 0) BuildingsLoader.loader.abort({key : key});
	}
};

function valueAtMainZoom(_zoom, _tileX, _tileY) {
	let res = {
		z : _zoom, 
		x : _tileX, 
		y : _tileY, 
	};
	while (res.z > mainZoom) {
		res.z --;
		res.x = Math.floor(res.x / 2);
		res.y = Math.floor(res.y / 2);
	}
	return res;
}
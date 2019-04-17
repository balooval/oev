import * as OLD_UI from '../UI.js';

export const Params = {};
const DataLoader = {};


export class Proxy {
	constructor(_type) {
		this._type = _type;
		var simulByType = {
			TILE2D : 4, 
			ELE : 4, 
			BUILDINGS : 2, 
			NORMAL : 1, 
			PLANE : 1, 
			OVERPASS_CACHE : 1, 
		};
		this._simulLoad = simulByType[this._type];
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this._loaders = [];
		this.serverUrl = 'https://val.openearthview.net';
		this._initLoaders();
	}

	getData(_params, _callback) {
		_params.priority = _params.priority || 1;
		_params.key = this._genKey(_params);
		_params.callback = _callback;
		if (this._type == 'BUILDINGO') {
			console.log('getData', _params.key);
		}
		if (this._sendCachedData(_params) === true) return true;
		if (this._isWaiting(_params.key) || this._isLoading(_params.key)) return false;
		this._addSorted(_params);
		this._checkForNextLoad();
	}
	
	_genKey(_params) {
		_params.keyOpt = _params.keyOpt || '';
		return _params.z + '-' + _params.x + '-' + _params.y + '-' + _params.keyOpt;
	}
	
	_initLoaders() {
		var i;
		var loader;
		var _self = this;
		for (i = 0; i < this._simulLoad; i ++) {
			if (this._type == 'TILE2D') {
				loader = new LoaderTile2D(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'ELE') {
				loader = new LoaderElevation(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'BUILDINGS') {
				loader = new DataLoader.Building(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'NORMAL') {
				loader = new DataLoader.Normal(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'PLANE') {
				loader = new DataLoader.Planes(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'OVERPASS_CACHE') {
				loader = new DataLoader.OverpassCache(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			}
			this._loaders.push(loader);
		}
	}
	
	onDataLoaded(_data, _params) {
		if (this._type == 'OVERPASS_CACHE0') {
			console.log('_params', _params.key);
		}
		var i;
		if (_data === null) {
			console.warn('Error loading ressource');
			return false;
		}
		this._datasLoading = this._datasLoading.filter(l => l.key != _params.key);
		_params.callback(_data);
		if (_params.dropDatas === undefined || _params.dropDatas == false) {
			this._datasLoaded[_params.key] = _data;
		}
		this._checkForNextLoad();
	}
	
	_addSorted(_params) {
		var i;
		_params.priority /= _params.z;
		for (var i = 0; i < this._datasWaiting.length; i ++) {
			if (_params.priority < this._datasWaiting[i].priority) {
				this._datasWaiting.splice(i, 0, _params);
				return true;
			}
		}
		this._datasWaiting.push(_params);
		return false;
	}
	
	_sendCachedData(_params) {
		if (this._datasLoaded[_params.key] === undefined) return false;
		_params.callback(this._datasLoaded[_params.key]);
		return true;
	}
	
	abort(_params) {
		if (_params.key === undefined) {
			_params.key = this._genKey(_params);
		}
		this._datasWaiting = this._datasWaiting.filter(w => w.key != _params.key);
	}
	
	clear() {
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
	}
	
	_checkForNextLoad() {
		if (this._datasLoading.length >= this._simulLoad) return false;
		this._loadNext();
		return true;
	}
	
	_loadNext() {
		if (this._datasWaiting.length == 0) return false;
		var freeLoader = this._getAvailableLoader();
		if (!freeLoader) return false;
		var currentLoadingParams = this._datasWaiting.shift();
		this._datasLoading.push(currentLoadingParams);
		OLD_UI.updateLoadingDatas(this._type, this._datasWaiting.length);
		freeLoader.load(currentLoadingParams);
	}
	
	_getAvailableLoader() {
		return this._loaders.filter(l => !l.isLoading).pop();
	}
	
	_isWaiting(_key) {
		return this._datasWaiting.some(w => w.key == _key);
	}
	
	_isLoading(_key) {
		return this._datasLoading.some(w => w.key == _key);
	}
}



DataLoader.Ajax = function () {
	this.request = new XMLHttpRequest();
	this.request.onreadystatechange = this.bindFunction(this.stateChange, this);
}

DataLoader.Ajax.prototype = {
	load : function(url, _callback) {
		this.url = url;
		this.callback = _callback;
		this.request.open("GET", url, true);
		this.request.send();
	}, 
	
	bindFunction : function(caller, object) {
		return function() {
			return caller.apply(object, [object]);
		};
	}, 

	stateChange : function() {
		if (this.request.readyState==4){
			this.callback(this.request.responseText, this.request);
		}
	}, 
}


DataLoader.Canvas = (function() {
	const canvas = document.createElement('canvas');
	canvas.width = '64';
	canvas.height = '64';
	const context = canvas.getContext('2d');
	
	var api = {
		extractElevation : function(_img, _imgWidth, _imgHeight) {
			context.drawImage(_img, 0, 0, _imgWidth, _imgHeight);
			const imageData = context.getImageData(0, 0, _imgWidth, _imgHeight).data;
			const eleBuffer = new Uint16Array(imageData.length / 4);
			let bufferIndex = 0;
			for (let x = 0; x < _imgWidth; ++x) {
				for (let y = 0; y < _imgHeight; ++y) {
					let index = (y * _imgWidth + x) * 4;
					const red = imageData[index];
					index ++;
					const blue = imageData[++index];
					const alt = red * 256 + blue;
					eleBuffer[bufferIndex] = alt;
					bufferIndex ++;
				}
			}
			return eleBuffer;
		}
	};
	
	return api;
})();


Params.Elevation = {
	definition : 4, 
}

class LoaderElevation {

	constructor(_callback) {
		this.definition = Params.Elevation.definition;
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		var loader = this;
		this.imageObj = new Image();
		this.imageObj.crossOrigin = 'Anonymous';
		this.imageObj.onload = function() {
			loader.onImgReady(this);
		};
		this.serverUrl = 'https://val.openearthview.net';
	}

	load(_params) {
		this.isLoading = true;
		this.params = _params;
		this.imageObj.src = this.serverUrl + '/libs/remoteImg.php?tileEle=1&def=' + this.definition + '&z='+_params.z+'&x='+_params.x+'&y='+_params.y;
	}
	
	onImgReady(_img) {
		var res = DataLoader.Canvas.extractElevation(_img, _img.width, _img.height);
		this.isLoading = false;
		if (this.callback) {
			this.callback(res, this.params);
		}
	}
}

class LoaderTile2D {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.serverUrl = 'https://val.openearthview.net';
		this.tileLoader = new THREE.TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.tileLoader.load(this.serverUrl + '/libs/remoteImg.php?'+OEV.earth.tilesProvider+'=1&z='+this.params.z+'&x='+this.params.x+'&y='+this.params.y, 
			_texture => loader.onDataLoadSuccess(_texture), 
			xhr => {},
			xhr => loader.onDataLoadError()
		);
	}
	
	onDataLoadSuccess(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}
	
	onDataLoadError() {
		this.isLoading = false;
		console.warn( 'LoaderTile2D error', this.params);
		this.callback(null);
	}
}

DataLoader.Normal = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.tileLoader = new THREE.TextureLoader();
	this.serverUrl = 'https://val.openearthview.net';
}

DataLoader.Normal.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		var url = this.serverUrl + '/libs/remoteImg.php?tileNormal';
		this.tileLoader.load(url + '=1&def=64&z='+_params.z+'&x='+_params.x+'&y='+_params.y, 
			function(_texture){
				loader.onDataLoadSuccess(_texture);
			}, 
			function(xhr) {
			},
			function(xhr) {
				loader.onDataLoadError(xhr);
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}, 
	
	onDataLoadError : function(_evt) {
		this.isLoading = false;
		console.warn( 'DataLoader.Normal error', this.params, _evt);
		this.callback(null);
	}, 
}


DataLoader.BuildingWorker = (function() {
	var worker = new Worker('js/oev/workers/buildingJson.js');
	var loaders = [];
	
	var api = {
		
		compute : function(_loader, _datas) {
			loaders.push(_loader);
			worker.postMessage(_datas);
		}, 
		
		onWorkerMessage : function(_res) {
			var loader = loaders.shift();
			loader.datasReady(_res.data);
		}, 
	};
	
	worker.onmessage = api.onWorkerMessage;
	
	return api;
})();

DataLoader.Building = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.ajax = new DataLoader.Ajax();
	this.serverUrl = 'https://val.openearthview.net';
}

DataLoader.Building.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.ajax.load(this.serverUrl + "/libs/remoteImg.php?overpass_buildings=1&zoom="+_params.z+"&tileX="+_params.x+"&tileY="+_params.y, 
			function(_datas){
				loader.onDataLoadSuccess(_datas);
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data) {
		DataLoader.BuildingWorker.compute(this, {"json" : _data, "bbox" : this.params.bbox});
	}, 
	
	datasReady : function(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}, 
}




DataLoader.Planes = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.ajax = new DataLoader.Ajax();
	this.serverUrl = 'https://val.openearthview.net';
}

DataLoader.Planes.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.ajax.load(this.serverUrl + '/libs/remoteImg.php?planes', 
			function(_datas){
				loader.onDataLoadSuccess(JSON.parse(_datas));
			}
		);
	}, 
	
	onDataLoadSuccess : function(_datas) {
		this.isLoading = false;
		this.callback(_datas.states, this.params);
	}, 
}





DataLoader.OverpassCache = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.ajax = new DataLoader.Ajax();
	this.serverUrl = 'https://val.openearthview.net';
}

DataLoader.OverpassCache.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.ajax.load(this.serverUrl + '/libs/remoteImg.php?overpassClient=1&type=' + _params.nodeType + '&z='+_params.z+'&x='+_params.x+'&y='+_params.y,  
			function(_datas, _xhr){
				loader.onDataLoadSuccess(_datas, _xhr);
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data, _xhr) {
		this.isLoading = false;
		if (_xhr.status == 206) {
			this.params.dropDatas = true;
		}
		this.callback(_data, this.params);
	}, 
}

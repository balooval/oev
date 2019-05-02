import * as OLD_UI from '../UI.js';

export const Params = {};
const DataLoader = {};

const registeredLoaders = {};

export function registerLoader(_type, _class) {
	registeredLoaders[_type] = _class;
}

export class Proxy {
	constructor(_type) {
		this._type = _type;
		const simulByType = {
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

		this.clientsWaiting = [];

		this._loaders = [];
		this.serverUrl = 'https://val.openearthview.net';
		this._initLoaders();

		window.debugLoader = () => {
			console.log('debugLoader', this._datasWaiting);
		}
	}

	_initLoaders() {
		let loader;
		const _self = this;
		for (let i = 0; i < this._simulLoad; i ++) {
			if (this._type == 'NORMAL') {
				loader = new DataLoader.Normal(function(_datas, _params){_self.onDataLoaded(_datas, _params)});
			} else if (this._type == 'OVERPASS_CACHE') {
				loader = new DataLoader.OverpassCache(function(_datas, _params){_self.onDataLoaded(_datas, _params)});
			} else if (registeredLoaders[this._type]) {
				loader = new registeredLoaders[this._type](function(_datas, _params){_self.onDataLoaded(_datas, _params)});
			}
			this._loaders.push(loader);
		}
	}

	getData(_params, _callback) {
		_params.priority = _params.priority || 1;
		_params.key = this._genKey(_params);
		_params.callback = _callback;
		if (this._sendCachedData(_params) === true) return true;
		if (this._isWaiting(_params.key) || this._isLoading(_params.key)) {
			const waiting = this._datasWaiting.some(w => w.key == _params.key);
			const loading = this._datasLoading.some(w => w.key == _params.key);
			this.clientsWaiting.push(_params);
			return false;
		};
		this._addSorted(_params);
		const test = this._checkForNextLoad();
	}
	
	_genKey(_params) {
		_params.keyOpt = _params.keyOpt || '';
		return _params.z + '-' + _params.x + '-' + _params.y + '-' + _params.keyOpt;
	}
	
	onDataLoaded(_data, _params) {
		if (_data === null) {
			console.warn('Error loading ressource');
			return false;
		}

		this._datasLoading = this._datasLoading.filter(l => l.key != _params.key);
		_params.callback(_data);

		this.clientsWaiting.filter(c => c.key == _params.key).forEach(c => c.callback(_data));
		this.clientsWaiting = this.clientsWaiting.filter(c => c.key != _params.key);

		if (_params.dropDatas === undefined || _params.dropDatas == false) {
			this._datasLoaded[_params.key] = _data;
		}
		this._checkForNextLoad();
	}
	
	_addSorted(_params) {
		_params.priority /= _params.z;
		for (let i = 0; i < this._datasWaiting.length; i ++) {
			if (_params.priority < this._datasWaiting[i].priority) {
				this._datasWaiting.splice(i, 0, _params);
				return true;
			}
		}
		this._datasWaiting.push(_params);
		return false;
	}
	
	_sendCachedData(_params) {
		if (!this._datasLoaded[_params.key]) return false;
		_params.callback(this._datasLoaded[_params.key]);
		return true;
	}
	
	abort(_params) {
		if (_params.key === undefined) {
			_params.key = this._genKey(_params);
		}
		this._datasWaiting = this._datasWaiting.filter(w => w.key != _params.key);
		this.clientsWaiting = this.clientsWaiting.filter(c => c.key != _params.key);
	}
	
	clear() {
		console.warn('CLEAR LOADER', this._type);
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this.clientsWaiting = [];
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
		const currentLoadingParams = this._datasWaiting.shift();
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

Params.Elevation = {
	definition : 4, 
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

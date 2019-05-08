import Evt from './utils/event.js';

const DataLoader = {};
const registeredLoaders = {};
export let evt;

export function init() {
	evt = new Evt();
}

function onRessourceLoaded(_type, _nb) {
	evt.fireEvent('DATA_LOADED', {type:_type, nb:_nb});
}

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
			LANDUSE : 1, 
		};
		this._simulLoad = simulByType[this._type];
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this.clientsWaiting = [];
		this._loaders = [];
		this._initLoaders();
		window.debugLoader = () => {
			console.log('debugLoader', this._datasWaiting);
		}
	}

	_initLoaders() {
		let loader;
		const _self = this;
		for (let i = 0; i < this._simulLoad; i ++) {
			loader = new registeredLoaders[this._type](function(_datas, _params){_self.onDataLoaded(_datas, _params)});
			this._loaders.push(loader);
		}
	}

	getData(_params, _callback) {
		_params.priority = _params.priority || 1;
		_params.key = this._genKey(_params);
		_params.callback = _callback;
		if (this._sendCachedData(_params) === true) return true;
		if (this._isWaiting(_params.key) || this._isLoading(_params.key)) {
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
		onRessourceLoaded(this._type, this._datasWaiting.length);
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
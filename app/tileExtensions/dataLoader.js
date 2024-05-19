import Evt from '../core/event.js';
import {evt as TileExtensionEvt} from './tileExtension.js';

const USE_CACHE = false;
const registeredLoaders = {};
const loadersParams = {};
export let evt;

export function init() {
	evt = new Evt();
}

function onRessourceLoaded(_type, _nb) {
	evt.fireEvent('DATA_LOADED', {type:_type, nb:_nb});
}

export function registerLoader(_type, _class, _params) {
	registeredLoaders[_type] = _class;
	loadersParams[_type] = _params;
}

export class Loader {
	constructor(_type) {
		this._type = _type;
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this.clientsWaiting = [];
		this.loaderParams = loadersParams[_type];
		this._loaders = this.#initLoaders(this.loaderParams.nbLoaders);
		TileExtensionEvt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this._type, this, this.clear);
	}

	#initLoaders(_nb) {
		const loaders = [];
		for (let i = 0; i < _nb; i ++) {
			const loader = new registeredLoaders[this._type]((_datas, _params) => this.onDataLoaded(_datas, _params));
			loaders.push(loader);
		}
		return loaders;
	}

	getData(params, callback) {
		params.priority = params.priority || 1;
		params.key = this.#genKey(params);
		params.callback = callback;
		if (this.#sendCachedData(params) === true) {
			return true;
		}
		if (this.#isWaiting(params.key) || this.#isLoading(params.key)) {
			this.clientsWaiting.push(params);
			return false;
		};
		this.#addSorted(params);
		this.#checkForNextLoad();
	}
	
	#genKey(params) {
		params.keyOpt = params.keyOpt || '';
		return params.z + '-' + params.x + '-' + params.y + '-' + params.keyOpt;
	}
	
	onDataLoaded(data, params) {
		onRessourceLoaded(this._type, this._datasWaiting.length);
		if (data === null) {
			console.warn('Error loading ressource');
			console.log(params);
			return false;
		}
		this._datasLoading = this._datasLoading.filter(l => l.key != params.key);
		params.callback(data);
		this.clientsWaiting.filter(c => c.key == params.key).forEach(c => c.callback(data));
		this.clientsWaiting = this.clientsWaiting.filter(c => c.key != params.key);

		if (USE_CACHE && this.loaderParams.useCache) {
			this._datasLoaded[params.key] = data;
		}

		if (!this.loaderParams.delay) {
			this.#checkForNextLoad();
		} else {
			setTimeout(() => this.#checkForNextLoad(), this.loaderParams.delay);
		}
	}
	
	#addSorted(params) {
		params.priority /= params.z;
		for (let i = 0; i < this._datasWaiting.length; i ++) {
			if (params.priority < this._datasWaiting[i].priority) {
				this._datasWaiting.splice(i, 0, params);
				return true;
			}
		}
		this._datasWaiting.push(params);
		return false;
	}
	
	#sendCachedData(params) {
		if (!this._datasLoaded[params.key]) {
			return false;
		}

		params.callback(this._datasLoaded[params.key]);
		return true;
	}
	
	abort(params) {
		if (params.key === undefined) params.key = this.#genKey(params);
		this._datasWaiting = this._datasWaiting.filter(w => w.key != params.key);
		this.clientsWaiting = this.clientsWaiting.filter(c => c.key != params.key);
	}
	
	clear() {
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this.clientsWaiting = [];
	}
	
	#checkForNextLoad() {
		if (this._datasLoading.length >= this.loaderParams.nbLoaders) return false;
		this.#loadNext();
		return true;
	}
	
	#loadNext() {
		if (this._datasWaiting.length == 0) return false;
		var freeLoader = this.#getAvailableLoader();
		if (!freeLoader) return false;
		const currentLoadingParams = this._datasWaiting.shift();
		this._datasLoading.push(currentLoadingParams);
		freeLoader.load(currentLoadingParams);
	}
	
	#getAvailableLoader() {
		return this._loaders.filter(l => !l.isLoading).pop();
	}
	
	#isWaiting(_key) {
		return this._datasWaiting.some(w => w.key == _key);
	}
	
	#isLoading(_key) {
		return this._datasLoading.some(w => w.key == _key);
	}
}
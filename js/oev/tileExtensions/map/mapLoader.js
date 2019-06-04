import * as DataLoader from '../dataLoader.js';

const PARAMS = {
	nbLoaders : 4, 
	useCache : false, 
};

let API_URL = '';

export function setApiUrl(_url) {
	API_URL = _url;
}

class LoaderTile2D {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.textureLoader = new THREE.TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.textureLoader.load(API_URL + '&z='+this.params.z+'&x='+this.params.x+'&y='+this.params.y, 
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

DataLoader.registerLoader('TILE2D', LoaderTile2D, PARAMS);
export const loader = new DataLoader.Loader('TILE2D');
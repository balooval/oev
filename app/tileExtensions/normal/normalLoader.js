import {
	TextureLoader,
} from '../../vendor/three.module.js';
import * as DataLoader from '../dataLoader.js';

const PARAMS = {
	nbLoaders : 2,
	useCache : false,
};

let API_URL = '';

export function setApiUrl(_url) {
	API_URL = _url;
}

class LoaderNormal {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.textureLoader = new TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		// this.textureLoader.load(API_URL + '&z=' + this.params.z + '&x=' + this.params.x + '&y=' + this.params.y + '&def=' + GLOBE.tilesDefinition, 
		this.textureLoader.load(API_URL + '&z=' + this.params.z + '&x=' + this.params.x + '&y=' + this.params.y + '&def=' + 16, 
			_texture => this.onDataLoadSuccess(_texture), 
			xhr => {},
			xhr => this.onDataLoadError()
		);
	}
	
	onDataLoadSuccess(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}
	
	onDataLoadError() {
		this.isLoading = false;
		console.warn( 'LoaderNormal error', this.params);
		this.callback(null, this.params);
	}
}

DataLoader.registerLoader('NORMAL', LoaderNormal, PARAMS);
export const loader = new DataLoader.Loader('NORMAL');
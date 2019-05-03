import * as DataLoader from '../../dataLoader.js';

class LoaderTile2D {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.serverUrl = 'https://val.openearthview.net/api/index.php?ressource=osm&';
		this.textureLoader = new THREE.TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.textureLoader.load(this.serverUrl + 'z='+this.params.z+'&x='+this.params.x+'&y='+this.params.y, 
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

DataLoader.registerLoader('TILE2D', LoaderTile2D);
export const loader = new DataLoader.Proxy('TILE2D');
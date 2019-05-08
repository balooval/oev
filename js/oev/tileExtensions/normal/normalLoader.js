import * as DataLoader from '../../dataLoader.js';
import GLOBE from '../../globe.js';

class LoaderNormal {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.serverUrl = 'https://val.openearthview.net/api/index.php?ressource=normal';
		this.textureLoader = new THREE.TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.textureLoader.load(this.serverUrl + '&z=' + this.params.z + '&x=' + this.params.x + '&y=' + this.params.y + '&def=' + GLOBE.tilesDefinition, 
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
		console.warn( 'LoaderNormal error', this.params);
		this.callback(null, this.params);
	}
}

DataLoader.registerLoader('NORMAL', LoaderNormal);
export const loader = new DataLoader.Proxy('NORMAL');
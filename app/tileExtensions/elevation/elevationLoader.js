import * as DataLoader from '../dataLoader.js';
import {TILES_DEFINITION} from '../../core/tile.js';
import {extractElevation} from './elevationDecoder.js';

const PARAMS = {
	nbLoaders : 2,
	useCache : false, 
};

let API_URL = '';
const IGN_URL = 'https://ns378984.ip-5-196-69.eu/server/api/index.php?ressource=ign';

export function setApiUrl(_url) {
	API_URL = _url;
}

class LoaderElevation {

	constructor(_callback) {
		const bufferSize = Math.pow(TILES_DEFINITION + 1, 2);
		this.eleBuffer = new Float32Array(bufferSize);
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		var loader = this;
		this.imageObj = new Image();
		this.imageObj.crossOrigin = 'Anonymous';
		this.imageObj.onload = function() {
			loader.onImgReady(this);
		};
	}

	load(params) {
		this.isLoading = true;
		this.params = params;

		let baseUrl = API_URL;
		
		if (params.z >= 15) {
			baseUrl = IGN_URL;
		}

		let url = baseUrl + '&def=' + TILES_DEFINITION + '&z=' + params.z + '&x='+params.x+'&y='+params.y;
		this.imageObj.src = url;
	}
	
	onImgReady(image) {
		const res = extractElevation(this.eleBuffer, image, image.width, image.height);
		this.isLoading = false;

		if (this.callback) {
			this.callback(res, this.params);
		}
	}
}

DataLoader.registerLoader('ELEVATION', LoaderElevation, PARAMS);
export const loader = new DataLoader.Loader('ELEVATION');
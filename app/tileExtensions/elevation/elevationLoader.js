import * as DataLoader from '../dataLoader.js';
import {GLOBE} from '../../core/globe.js';

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
		this.definition = GLOBE.tilesDefinition;
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

		let url = baseUrl + '&def=' + this.definition + '&z=' + params.z + '&x='+params.x+'&y='+params.y;
		this.imageObj.src = url;
	}
	
	onImgReady(image) {
		const res = extractElevation(image, image.width, image.height);
		this.isLoading = false;

		if (this.callback) {
			this.callback(res, this.params);
		}
	}
}

const canvasSize = GLOBE.tilesDefinition + 1;
const canvas = new OffscreenCanvas(canvasSize, canvasSize);
const context = canvas.getContext('2d', {willReadFrequently: true});

function extractElevation(image, imageWidth, imageHeight) {
    context.drawImage(image, 0, 0, imageWidth, imageHeight);
    const imageData = context.getImageData(0, 0, imageWidth, imageHeight).data;
    const eleBuffer = new Float32Array(imageData.length / 4);
    let bufferIndex = 0;

    for (let x = 0; x < imageWidth; ++x) {
        // for (let y = 0; y < _imgHeight; ++y) {
        for (let y = imageHeight - 1; y >= 0; y --) {
            let index = (y * imageWidth + x) * 4;
            const red = imageData[index];
            index ++;
            const blue = imageData[++index];
            const green = imageData[++index];
			const centimeters = green / 100;
            const alt = red * 256 + blue + centimeters;
            eleBuffer[bufferIndex] = alt;
            bufferIndex ++;
        }
    }

    return eleBuffer;
}

DataLoader.registerLoader('ELEVATION', LoaderElevation, PARAMS);
export const loader = new DataLoader.Loader('ELEVATION');
import * as DataLoader from '../../dataLoader.js';
import GLOBE from '../../globe.js';

const canvas = document.createElement('canvas');
canvas.width = '64';
canvas.height = '64';
const context = canvas.getContext('2d');

function extractElevation(_img, _imgWidth, _imgHeight) {
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

class LoaderElevation {

	constructor(_callback) {
        console.log('Create LoaderElevation', GLOBE.tilesDefinition);
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
		this.serverUrl = 'https://val.openearthview.net';
	}

	load(_params) {
		this.isLoading = true;
		this.params = _params;
		this.imageObj.src = this.serverUrl + '/api/index.php?ressource=elevation&def=' + this.definition + '&z='+_params.z+'&x='+_params.x+'&y='+_params.y;
	}
	
	onImgReady(_img) {
		var res = extractElevation(_img, _img.width, _img.height);
		this.isLoading = false;
		if (this.callback) {
			this.callback(res, this.params);
		}
	}
}

DataLoader.registerLoader('ELE', LoaderElevation);
export const loaderEle = new DataLoader.Proxy('ELE');
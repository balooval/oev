import * as DataLoader from '../../dataLoader.js';

const PARAMS = {
	nbLoaders : 2, 
	useCache : true, 
};

let API_URL = '';

export function setApiUrl(_url) {
	API_URL = _url;
}

const loadersWaiting = [];

function compute(_loader, _datas) {
    loadersWaiting.push(_loader);
    workerParser.postMessage(_datas);
}

function onWorkerMessage(_res) {
    const loader = loadersWaiting.shift();
    loader.datasReady(_res.data);
}

const workerParser = new Worker('js/oev/tileExtensions/building/workerBuildingJsonParser.js');
workerParser.onmessage = onWorkerMessage;


class LoaderBuilding {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = API_URL + "&z=" + _params.z + "&x=" + _params.x + "&y=" + _params.y;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text));
	}
	
	onDataLoadSuccess(_data) {
		compute(this, {
			json : _data, 
			bbox : this.params.bbox
		});
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

DataLoader.registerLoader('BUILDING', LoaderBuilding, PARAMS);
export const loader = new DataLoader.Proxy('BUILDING');
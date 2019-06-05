import * as DataLoader from '../dataLoader.js';

const PARAMS = {
	nbLoaders : 1, 
	useCache : false, 
	delay : 2000, 
};

let API_URL = 'https://opensky-network.org/api/states/all?';

export function setApiUrl(_url) {
	API_URL = _url;
}

class LoaderPlane {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
        const url = API_URL + 'lamin=' + this.params.minLat + '&lomin=' + this.params.minLon + '&lamax=' + this.params.maxLat + '&lomax=' + this.params.maxLon;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text))
		.catch(error => console.log('Error', error));
	}
	
	onDataLoadSuccess(_data) {
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

DataLoader.registerLoader('PLANE', LoaderPlane, PARAMS);
export const loader = new DataLoader.Loader('PLANE');
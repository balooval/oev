import * as DataLoader from '../dataLoader.js';

const PARAMS = {
	nbLoaders : 1, 
	useCache : false, 
};

let API_URL = '';

export function setApiUrl(_url) {
	API_URL = _url;
}

class LoaderCoast {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = API_URL + '&z=' + _params.z + '&x=' + _params.x + '&y=' + _params.y;
		fetch(url)
		.then(response => response.json())
		.then(json => this.onDataLoadSuccess(json));
	}
	
	onDataLoadSuccess(_data) {
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

DataLoader.registerLoader('COAST', LoaderCoast, PARAMS);
export const loader = new DataLoader.Loader('COAST');
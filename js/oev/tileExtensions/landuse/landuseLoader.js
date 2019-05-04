import * as DataLoader from '../../dataLoader.js';

class LoaderLanduse {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.serverUrl = 'https://val.openearthview.net/api/index.php?ressource=landuse&';
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = this.serverUrl + "z=" + _params.z + "&x=" + _params.x + "&y=" + _params.y;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text));
	}
	
	onDataLoadSuccess(_data) {
		// compute(this, {
		// 	json : _data, 
		// 	bbox : this.params.bbox
        // });
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

DataLoader.registerLoader('LANDUSE', LoaderLanduse);
export const loader = new DataLoader.Proxy('LANDUSE');
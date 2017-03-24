'use strict';
Oev.DataLoader = {};

Oev.DataLoader.Proxy = function(_type) {
	this._type = _type;
	var simulByType = {
		TILE2D : 4, 
		ELE : 4, 
		BUILDINGS : 2, 
		NORMAL : 1, 
		PLANE : 1, 
		OVERPASS : 1, 
	};
	this._simulLoad = simulByType[this._type];
	this._datasLoaded = {};
	this._datasWaiting = [];
	this._datasLoading = [];
	this._loaders = [];
	this._initLoaders();
}

Oev.DataLoader.Proxy.prototype = {
	
	getData : function(_params, _callback) {
		_params.priority = _params.priority || 1;
		// _params.key = _params.z + '-' + _params.x + '-' + _params.y;
		_params.key = this._genKey(_params);
		_params.callback = _callback;
		if (this._type == 'OELE') {
			console.log('getData', _params.key);
		}
		if (this._sendCachedData(_params) === true) {
			return true;
		}
		if (this._isWaiting(_params.key) || this._isLoading(_params.key)) {
			return false;
		}
		this._addSorted(_params);
		this._checkForNextLoad();
	}, 
	
	_genKey : function(_params) {
		_params.keyOpt = _params.keyOpt || '';
		return _params.z + '-' + _params.x + '-' + _params.y + '-' + _params.keyOpt;
	}, 
	
	_initLoaders : function() {
		var i;
		var loader;
		var _self = this;
		for (i = 0; i < this._simulLoad; i ++) {
			if (this._type == 'TILE2D') {
				loader = new Oev.DataLoader.Tile2D(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'ELE') {
				loader = new Oev.DataLoader.Elevation(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'BUILDINGS') {
				loader = new Oev.DataLoader.Building(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'NORMAL') {
				loader = new Oev.DataLoader.Normal(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'PLANE') {
				loader = new Oev.DataLoader.Planes(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			} else if (this._type == 'OVERPASS') {
				loader = new Oev.DataLoader.Overpass(function(_datas, _params){_self.onDataLoaded(_datas, _params);});
			}
			this._loaders.push(loader);
		}
	}, 
	
	onDataLoaded : function(_data, _params) {
		if (this._type == 'OVERPASS0') {
			console.log('_params', _params.key);
			// var date = new Date();
			// console.log(this._type, date.getHours()+':'+date.getMinutes()+':'+date.getSeconds(), 'Waiting queue :', this._datasWaiting.length);
		}
		var i;
		if (_data === null) {
			console.warn('Error loading ressource');
			return false;
		}
		for (i = 0; i < this._datasLoading.length; i ++) {
			if (this._datasLoading[i].key == _params.key) {
				this._datasLoading.splice(i, 1);
				break;
			}
		}
		_params.callback(_data);
		this._datasLoaded[_params.key] = _data;
		this._checkForNextLoad();
	}, 
	
	_addSorted : function(_params) {
		var i;
		_params.priority /= _params.z;
		for (var i = 0; i < this._datasWaiting.length; i ++) {
			if (_params.priority < this._datasWaiting[i].priority) {
				this._datasWaiting.splice(i, 0, _params);
				return true;
			}
		}
		this._datasWaiting.push(_params);
		return false;
	}, 
	
	_sendCachedData : function(_params) {
		if (this._datasLoaded[_params.key] === undefined) {
			return false;
		}
		_params.callback(this._datasLoaded[_params.key]);
		return true;
	}, 
	
	abort : function(_params) {
		if (_params.key === undefined) {
			// _params.key = _params.z + '-' + _params.x + '-' + _params.y;
			_params.key = this._genKey(_params);
		}
		var i;
		for (i = 0; i < this._datasWaiting.length; i ++) {
			if (this._datasWaiting[i].key == _params.key) {
				this._datasWaiting.splice(i, 1);
				return true;
			}
		}
		return false;
	}, 
	
	clear : function() {
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
	}, 
	
	_checkForNextLoad : function() {
		if (this._datasLoading.length < this._simulLoad) {
			this._loadNext();
			return true;
		}
		return false;
	}, 
	
	_loadNext : function() {
		if (this._datasWaiting.length == 0) {
			return false;
		}
		var freeLoader = this._getAvailableLoader();
		if (freeLoader === null) {
			return false;
		}
		var currentLoadingParams = this._datasWaiting.shift();
		this._datasLoading.push(currentLoadingParams);
		freeLoader.load(currentLoadingParams);
	}, 
	
	_getAvailableLoader : function() {
		var i;
		for (i = 0; i < this._simulLoad; i ++) {
			if (!this._loaders[i].isLoading) {
				return this._loaders[i];
			}
		}
		return null;
	}, 
	
	_isWaiting : function(_key) {
		var i;
		for (i = 0; i < this._datasWaiting.length; i ++) {
			if (this._datasWaiting[i].key == _key) {
				return true;
			}
		}
		return false;
	}, 
	
	_isLoading : function(_key) {
		var i;
		for (i = 0; i < this._datasLoading.length; i ++) {
			if (this._datasLoading[i].key == _key) {
				return true;
			}
		}
		return false;
	}, 
}



Oev.DataLoader.Ajax = function () {
	this.request = new XMLHttpRequest();
	this.request.onreadystatechange = this.bindFunction(this.stateChange, this);
}

Oev.DataLoader.Ajax.prototype = {
	load : function(url, _callback) {
		this.url = url;
		this.callback = _callback;
		this.request.open("GET", url, true);
		this.request.send();
	}, 
	
	bindFunction : function(caller, object) {
		return function() {
			return caller.apply(object, [object]);
		};
	}, 

	stateChange : function(object) {
		if (this.request.readyState==4){
			this.callback(this.request.responseText);
		}
	}, 
}


Oev.DataLoader.Canvas = (function() {
	var canvas = document.createElement('canvas');
	canvas.width = '64';
	canvas.height = '64';
	var context = canvas.getContext('2d');
	
	var api = {
		extractElevation : function(_img, _w, _h) {
			context.drawImage(_img, 0, 0, _w, _h);
			var img = context.getImageData(0, 0, _w, _h); 
			var imgWidth = _w;
			var imgHeight = _h;
			var imageData = context.getImageData(0, 0, imgWidth, imgHeight);
			var data = imageData.data;
			var eleBuffer = new Uint16Array(data.length / 4);
			var x, y;
			var index;
			var red;
			var green;
			var blue;
			var alt;
			var bufferIndex = 0;
			for (x = 0; x < imgWidth; ++x) {
				for (y = 0; y < imgHeight; ++y) {
					index = (y * imgWidth + x) * 4;
					red = data[index];
					green = data[++index];
					blue = data[++index];
					alt = red * 256 + blue;
					eleBuffer[bufferIndex] = alt;
					bufferIndex ++;
				}
			}
			return eleBuffer;
		}
	};
	
	return api;
})();

Oev.DataLoader.Elevation = function(_callback) {
	this.definition = Oev.DataLoader.Elevation.definition;
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	var loader = this;
	this.imageObj = new Image();
	this.imageObj.onload = function() {
		loader.onImgReady(this);
	};
}

Oev.DataLoader.Elevation.definition = 4;

Oev.DataLoader.Elevation.prototype = {
	load : function(_params) {
		this.isLoading = true;
		this.params = _params;
		this.imageObj.src = 'libs/remoteImg.php?tileEle=1&def=' + this.definition + '&z='+_params.z+'&x='+_params.x+'&y='+_params.y;
	}, 
	
	onImgReady : function(_img) {
		var res = Oev.DataLoader.Canvas.extractElevation(_img, _img.width, _img.height);
		this.isLoading = false;
		if (this.callback) {
			this.callback(res, this.params);
		}
	}, 
}

Oev.DataLoader.Tile2D = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.tileLoader = new THREE.TextureLoader();
}

Oev.DataLoader.Tile2D.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.tileLoader.load('libs/remoteImg.php?'+OEV.earth.tilesProvider+'=1&z='+_params.z+'&x='+_params.x+'&y='+_params.y+'', 
			function(_texture){
				loader.onDataLoadSuccess(_texture);
			}, 
			function(xhr) {
			},
			function(xhr) {
				loader.onDataLoadError();
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}, 
	
	onDataLoadError : function() {
		this.isLoading = false;
		console.warn( 'Oev.DataLoader.Tile2D error', this.params);
		this.callback(null);
	}, 
}



Oev.DataLoader.Normal = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.tileLoader = new THREE.TextureLoader();
}

Oev.DataLoader.Normal.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		var url = 'libs/remoteImg.php?tileNormal';
		this.tileLoader.load(url + '=1&def=64&z='+_params.z+'&x='+_params.x+'&y='+_params.y, 
			function(_texture){
				loader.onDataLoadSuccess(_texture);
			}, 
			function(xhr) {
			},
			function(xhr) {
				loader.onDataLoadError(xhr);
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}, 
	
	onDataLoadError : function(_evt) {
		this.isLoading = false;
		console.warn( 'Oev.DataLoader.Normal error', this.params, _evt);
		this.callback(null);
	}, 
}


Oev.DataLoader.Building = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.ajax = new Oev.DataLoader.Ajax();
	this.myWorker = Oev.Tile.workerBuilding;
	
	var _self = this;
	this.myWorker.onmessage = function(evt) {
		_self.isLoading = false;
		_self.callback(evt.data, _self.params);
	}
}

Oev.DataLoader.Building.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.ajax.load("libs/remoteImg.php?overpass_buildings=1&zoom="+_params.z+"&tileX="+_params.x+"&tileY="+_params.y, 
			function(_datas){
				loader.onDataLoadSuccess(_datas);
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data) {
		this.myWorker.postMessage({"json" : _data, "bbox" : this.params.bbox});
	}, 
}




Oev.DataLoader.Planes = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.ajax = new Oev.DataLoader.Ajax();
}

Oev.DataLoader.Planes.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.ajax.load('libs/remoteImg.php?planes', 
			function(_datas){
				loader.onDataLoadSuccess(JSON.parse(_datas));
			}
		);
	}, 
	
	onDataLoadSuccess : function(_datas) {
		this.isLoading = false;
		this.callback(_datas.states, this.params);
	}, 
}





Oev.DataLoader.Overpass = function(_callback) {
	this.isLoading = false;
	this.callback = _callback;
	this.params = {};
	this.ajax = new Oev.DataLoader.Ajax();
}

Oev.DataLoader.Overpass.prototype = {
	load : function(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.ajax.load('libs/remoteImg.php?overpassClient=1&type=pylone&z='+_params.z+'&x='+_params.x+'&y='+_params.y,  
			function(_datas){
				loader.onDataLoadSuccess(_datas);
			}
		);
	}, 
	
	onDataLoadSuccess : function(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}, 
}
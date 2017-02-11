'use strict';
Oev.DataLoader = {};

Oev.DataLoader.Proxy = function(_type) {
	this._type = _type;
	var simulByType = {
		TILE2D : 4, 
		ELE : 4, 
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
		_params.key = _params.z + '-' + _params.x + '-' + _params.y;
		_params.callback = _callback;
		if (this._sendCachedData(_params) === true) {
			return true;
		}
		if (this._isWaiting(_params.key) || this._isLoading(_params.key)) {
			return false;
		}
		this._addSorted(_params);
		this._checkForNextLoad();
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
			}
			this._loaders.push(loader);
		}
	}, 
	
	onDataLoaded : function(_data, _params) {
		if (this._type == 'AAELE') {
			var date = new Date();
			console.log(this._type, date.getHours()+':'+date.getMinutes()+':'+date.getSeconds(), 'Waiting queue :', this._datasWaiting.length);
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
			_params.key = _params.z + '-' + _params.x + '-' + _params.y;
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
	
	// clearAll
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



Oev.DataLoader.Ajax = function (url, params, _callbackFunction) {
	this.request = new XMLHttpRequest();
	this.request.onreadystatechange = this.bindFunction(this.stateChange, this);
}

Oev.DataLoader.Ajax.prototype = {
	load : function(url, params, _callbackFunction) {
		this.url = url;
		this.params = params;
		this.callbackFunction = _callbackFunction;
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
			this.callbackFunction(this.request.responseText, this.params);
		}
	}, 
}


Oev.DataLoader.Canvas = (function() {
	var canvas = document.createElement('canvas');
	canvas.width = '64';
	canvas.height = '64';
	var context = canvas.getContext('2d');
	
	function debugCanvas(_img) {
		var c = document.getElementById("myCanvas");
		var ctx = c.getContext("2d");
		ctx.putImageData(_img, 0, 0);
	}
	
	var api = {
		extractElevation : function(_img, _w, _h) {
			context.drawImage(_img, 0, 0, _w, _h);
			var img = context.getImageData(0, 0, _w, _h); 
			// debugCanvas(img);
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
		debug( 'getTile .An error happened ' + this.key);
		this.callback(null);
	}, 
}


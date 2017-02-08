'use strict';
Oev.DataLoader = {};

Oev.DataLoader.Proxy = function(_type) {
	this._simulLoad = 4;
	this._datasLoaded = {};
	this._datasWaiting = [];
	this._datasLoading = [];
	
	if (_type == 'TILE2D') {
		this._loader = new Oev.DataLoader.Tile2D();
	} else if (_type == 'ELE') {
		this._loader = new Oev.DataLoader.Elevation();
	} else if (_type == 'tutu') {
		this._loader = 'tutu';
	}
}

Oev.DataLoader.Proxy.prototype = {
	getData : function(_tile, _key) {
		if (this._setLoadedData(_tile, _key)) {
			return true;
		}
		if (this._isWaiting() || this._isLoading()) {
			return false;
		}
		this._datasWaiting.push({key : _key, tile : _tile});
		this._checkForNextLoad();
	}, 
	
	// removeLoadingList
	abort : function(_key) {
		
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
		}
	}, 
	
	_loadNext : function() {
		if (this._datasWaiting.length == 0) {
			return false;
		}
		this._loader.load();
	}, 
	
	_isWaiting : function(_key) {
		return false;
	}, 
	
	_isLoading : function(_key) {
		return false;
	}, 
	
	_setLoadedData : function() {
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
	
	var api = {
		drawImage : function(_img, _x, _y, _w, _h) {
			context.drawImage(_img, _x, _y, _w, _h);
			var img = context.getImageData(_x, _y, _w, _h); 
			console.warn('C', img);
			
			var c = document.getElementById("myCanvas");
			var ctx = c.getContext("2d");
			ctx.putImageData(img, _x, _y);
			// return context.getImageData(_x, _y, _w, _h); 
		}
	};
	
	return api;
})();

Oev.DataLoader.Elevation = function(_proxy) {
	this.proxy = _proxy;
	this.target = undefined;
	this.key = undefined;
	// this.ajax = new Oev.DataLoader.Ajax();
	var loader = this;
	this.imageObj = new Image();
	this.imageObj.onload = function() {
		console.warn('A Oev.DataLoader.Elevation imageObj.onload');
		loader.onImgReady(this);
	};
	this.offsetTmp = 0;
}

Oev.DataLoader.Elevation.prototype = {
	load : function(_tile) {
		this.target = _tile;
		var url = 'libs/remoteImg.php?tileEle=1&z='+this.target.zoom+'&x='+this.target.tileX+'&y='+this.target.tileY
		this.imageObj.src = url;
	}, 
	
	onImgReady : function(_img) {
		console.warn('B Oev.DataLoader.Elevation.onImgReady');
		Oev.DataLoader.Canvas.drawImage(_img, 0, 0, 64, 64);
		// ctx.putImageData(Oev.DataLoader.Canvas.drawImage(_img, 0, 0, 32, 32), 0, 0);
	}, 
}


Oev.DataLoader.Tile2D = function(_proxy) {
	this.proxy = _proxy;
	this.target = undefined;
	this.key = undefined;
	this.tileLoader = new THREE.TextureLoader();
}

Oev.DataLoader.Tile2D.prototype = {
	load : function(_tile) {
		this.target = _tile;
		this.key = this.target.zoom + '-' + this.target.tileX + '-' + this.target.tileY;
		var loader = this;
		this.tileLoader.load('libs/remoteImg.php?'+OEV.earth.tilesProvider+'=1&z='+this.target.zoom+'&x='+this.target.tileX+'&y='+this.target.tileY+'', 
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
		this.proxy.datasLoaded[this.key] = _data;
		this.target.setTexture(_data);
		this.proxy.removeLoadingList(this.key);
		this.proxy.checkForNextLoad();
	}, 
	
	onDataLoadError : function() {
		debug( 'getTile .An error happened ' + this.key);
		this.proxy.removeLoadingList(this.key);
		this.proxy.checkForNextLoad();
	}, 
}


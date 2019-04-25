import * as OLD_UI from '../UI.js';

class DatasMng {
	constructor(_type) {
		this.logQuery = false;
		this.loaderPool = [];
		this.loaderBusy = [];
		this.type = _type;
		const loadParams = {
			TILE2D : {
				simulLoad : 2, 
				maxRamNb : 1000, 
			}, 
			ELE : {
				simulLoad : 2, 
				maxRamNb : 1000, 
			}, 
			MODELS : {
				simulLoad : 1, 
				maxRamNb : 10, 
			}, 
			BUILDINGS : {
				simulLoad : 2, 
				maxRamNb : 10, 
			}, 
			OBJECTS : {
				simulLoad : 1, 
				maxRamNb : 10, 
			}, 
			SURFACE : {
				simulLoad : 1, 
				maxRamNb : 100, 
			}, 
			WEATHER : {
				simulLoad : 1, 
				maxRamNb : 20, 
			}, 
			NODES : {
				simulLoad : 1, 
				maxRamNb : 10, 
			}, 
		};
		this.simulLoad = loadParams[this.type].simulLoad;
		this.maxRamNb = loadParams[this.type].maxRamNb;
		this.datasLoaded = {};
		this.datasWaiting = [];
		this.datasLoading = [];
		this.datasLastAccess = [];
	}

	clearOldDatas() {
		if (this.datasLastAccess.length > this.maxRamNb) {
			console.log(this.type + " A clearOldDatas " + this.datasLastAccess.length);
			while(this.datasLastAccess.length > this.maxRamNb / 2) {
				var keyToDel = this.datasLastAccess.pop();
				this.datasLoaded[keyToDel] = null;
				delete this.datasLoaded[keyToDel];
			}
			console.log(this.type + " B clearOldDatas " + this.datasLastAccess.length);
		}
	}

	updateLastAccess( _key ) {
		var prevId = this.datasLastAccess.indexOf( _key );
		if (prevId >= 0) {
			this.datasLastAccess.splice(prevId, 1);
		}
		this.datasLastAccess.unshift(_key);
	}


	setDatas(_tile, _datas) {
		if( this.type == "ELE" ){
			// _tile.computeEle( _datas );
		}else if( this.type == "TILE2D" ){
			_tile.setTexture( _datas );
		}else if( this.type == "MODELS" ){
			_tile.drawModels( _datas );
		}else if( this.type == "BUILDINGS" ){
			_tile.setDatas( _datas );
		}else if( this.type == "NODES" ){
			_tile.onDatasLoaded( _datas );
		}else if( this.type == "OBJECTS" ){
			_tile.onDatasLoaded( _datas );
		}else if( this.type == "SURFACE" ){
			_tile.setDatas( _datas );
		}else if( this.type == "WEATHER" ){
			_tile.setWeather( _datas );
		}
	}

	getDatas(_tile, _key, _tileX, _tileY, _zoom, _priority) {
		_priority = _priority || -1;
		var i;
		if (this.datasLoaded[_key] != undefined) {
			if (_tile != undefined) {
				this.setDatas(_tile, this.datasLoaded[_key]);
			}
			return this.updateLastAccess(_key);
		}
		let mustLoad = true;
		for (i = 0; i < this.datasLoading.length; i ++ ){
			if (this.datasLoading[i].key == _key) {
				mustLoad = false;
				break;
			}
		}
		if (mustLoad) {
			for (i = 0; i < this.datasWaiting.length; i ++ ){
				if (this.datasWaiting[i].key == _key) {
					mustLoad = false;
					break;
				}
			}
		}
		if (mustLoad) {
			if (_priority >= 0 && this.datasWaiting.length > 0) {
				_priority /= _zoom;
				for (var w = 0; w < this.datasWaiting.length; w ++) {
					if (this.datasWaiting[w]["priority"] > _priority) {
						this.datasWaiting.splice(w, 0, {"priority" : _priority, "key" : _key, "tile" : _tile, "z" : _zoom, "x" : _tileX, "y" : _tileY});
						mustLoad = false;
						break;
					}
				}
			}
		}
		if (mustLoad) {
			this.datasWaiting.push({"priority" : _priority, "key" : _key, "tile" : _tile, "z" : _zoom, "x" : _tileX, "y" : _tileY});
			this.checkForNextLoad();
		}
	}


	checkForNextLoad() {
		updateLoadingDatas(this.type, this.datasWaiting.length);
		if (this.datasLoading.length < this.simulLoad) {
			this.loadNext();
		}
	}

	removeWaitingList( _key ) {
		for (var i = 0; i < this.datasWaiting.length; i ++) {
			if (this.datasWaiting[i]["key"] == _key) {
				this.datasWaiting.splice(i, 1);
				break;
			}
		}
		OLD_UI.updateLoadingDatas(this.type, this.datasWaiting.length);
	}

	removeLoadingList(_key) {
		for (var i = 0; i < this.datasLoading.length; i ++) {
			if (this.datasLoading[i]["key"] == _key) {
				this.datasLoading.splice(i, 1);
				break;
			}
		}
	}

	clearAll() {
		this.datasLoaded = {};
		this.datasWaiting = [];
		this.datasLoading = [];
	}

	loadNext() {
		if (this.datasWaiting.length > 0) {
			var loadInfos = this.datasWaiting.shift();
			this.datasLoading.push(loadInfos);
			if (this.logQuery) {
				preloadQuery.push({"type" : this.type, "key" : loadInfos["key"], "x" : loadInfos["x"], "y" : loadInfos["y"], "z" : loadInfos["z"]});
			}
			if (this.type == "ELE") {
				// this.loadElevation(loadInfos);
			} else if(this.type == "TILE2D") {
				this.loadTile2d(loadInfos);
			} else if (this.type == "MODELS") {
				this.loadOverpass(loadInfos);
			} else if (this.type == "BUILDINGS") {
				this.loadBuildingsOverpass(loadInfos);
			} else if (this.type == "NODES") {
				this.loadNodes(loadInfos);
			} else if (this.type == "OBJECTS") {
				this.loadObjects(loadInfos);
			} else if (this.type == "WEATHER") {
				this.loadWeather(loadInfos);
			} else if (this.type == "SURFACE") {
				this.loadSurfaces(loadInfos);
			}
		}
	}

	loadWeather( _loadInfos ) {
		var mng = this;
		var url = "libs/remoteImg.php?getWeather=1&z="+_loadInfos["z"]+"&x="+_loadInfos["x"]+"&y="+_loadInfos["y"];
		var ajaxMng = new AjaxMng( url, {"key" : _loadInfos["key"], "tile":_loadInfos["tile"], "mng" : mng}, 
			function( res, _params ){
				_params["mng"].datasLoaded[ _params["key"]] = JSON.parse( res );
				if( _params["tile"] != undefined ){
					_params["tile"].setWeather( _params["mng"].datasLoaded[ _params["key"]] );
				}
				_params["mng"].removeLoadingList( _params["key"] );
				_params["mng"].checkForNextLoad();
			}
		);
	}

	onWorkerBuildingResponse(evt) {
		
	}

	loadBuildingsOverpass( _loadInfos ) {
		var mng = this;
		var useCache = '&nocache=1';
		if (Tile3d.prototype.useCache) {
			useCache = '';
		}
		var url = "libs/remoteImg.php?overpass_buildings=1&zoom="+_loadInfos["z"]+"&tileX="+_loadInfos["x"]+"&tileY="+_loadInfos["y"]+''+useCache;
		var ajaxMng = new AjaxMng( url, {"key" : _loadInfos["key"], "tile":_loadInfos["tile"], "mng" : mng}, 
			function( res, _params ){
				var bbox = undefined;
				if (_params["tile"] != undefined) {
					bbox = { 
						"minLon" : _params["tile"].tile.startCoord.x, 
						"maxLon" : _params["tile"].tile.endCoord.x, 
						"minLat" : _params["tile"].tile.endCoord.y, 
						"maxLat" : _params["tile"].tile.startCoord.y
					};
				}
				var myWorker = Oev.Tile.workerBuilding;
				myWorker.postMessage({"json" : res, "bbox" : bbox});
				myWorker.onmessage = function(evt) {
					_params["mng"].datasLoaded[ _params["key"]] = evt.data;
					if (_params["tile"] != undefined) {
						_params["tile"].setDatas(_params["mng"].datasLoaded[ _params["key"]]);
					}
					_params["mng"].removeLoadingList(_params["key"]);
					_params["mng"].checkForNextLoad();
				}
			}
		);
	}

	loadNodes( _loadInfos ) {
		var mng = this;
		var useCache = '';
		// var useCache = '&nocache=1';
		var url = "libs/remoteImg.php?overpass_nodes=1&tileX="+_loadInfos["x"]+"&tileY="+_loadInfos["y"]+"&zoom="+_loadInfos["z"]+useCache;
		var ajaxMng = new AjaxMng( url, {"key" : _loadInfos["key"], "tile":_loadInfos["tile"], "mng" : mng}, 
			function( res, _params ){
				_params["mng"].datasLoaded[ _params["key"]] = JSON.parse( res );
				if( _params["tile"] != undefined ){
					_params["tile"].onDatasLoaded( JSON.parse( res ) );
				}
				_params["mng"].removeLoadingList( _params["key"] );
				_params["mng"].checkForNextLoad();
			}
		);
	}

	loadObjects( _loadInfos ) {
		var mng = this;
		var url = "libs/remoteImg.php?overpass_obj=1&tileX="+_loadInfos["x"]+"&tileY="+_loadInfos["y"]+"&zoom="+_loadInfos["z"]+"&model="+_loadInfos["tile"].name;
		var ajaxMng = new AjaxMng( url, {"key" : _loadInfos["key"], "tile":_loadInfos["tile"], "mng" : mng}, 
			function( res, _params ){
				_params["mng"].datasLoaded[ _params["key"]] = JSON.parse( res );
				if( _params["tile"] != undefined ){
					_params["tile"].onDatasLoaded( JSON.parse( res ) );
				}
				_params["mng"].removeLoadingList( _params["key"] );
				_params["mng"].checkForNextLoad();
			}
		);
	}

	loadSurfaces( _loadInfos ) {
		var useCache = '&nocache=1';
		if( TileSurface.prototype.useCache ){
			useCache = '';
		}
		var mng = this;
		var url = "libs/remoteImg.php?overpass_surface=1&tileX="+_loadInfos["x"]+"&tileY="+_loadInfos["y"]+"&zoom="+_loadInfos["z"]+useCache;
		var ajaxMng = new AjaxMng( url, {"key" : _loadInfos["key"], "tile":_loadInfos["tile"], "mng" : mng}, 
			function( res, _params ){
				_params["mng"].datasLoaded[ _params["key"]] = JSON.parse( res );
				if( _params["tile"] != undefined ){
					_params["tile"].setDatas( JSON.parse( res ) );
				}
				_params["mng"].removeLoadingList( _params["key"] );
				_params["mng"].checkForNextLoad();
			}
		);
	}


	loadOverpass( _loadInfos ) {
		var mng = this;
		var url = "libs/remoteImg.php?overpass=1&tileX="+_loadInfos["x"]+"&tileY="+_loadInfos["y"]+"&zoom="+_loadInfos["z"];
		var ajaxMng = new AjaxMng( url, {"key" : _loadInfos["key"], "tile":_loadInfos["tile"], "mng" : mng}, 
			function( res, _params ){
				_params["mng"].datasLoaded[ _params["key"]] = JSON.parse( res );
				if( _params["tile"] != undefined ){
					_params["tile"].drawModels( JSON.parse( res ) );
				}
				_params["mng"].removeLoadingList( _params["key"] );
				_params["mng"].checkForNextLoad();
			}
		);
	}

	loadTile2d( _loadInfos ) {
		console.log('loadTile2d');
		var mng = this;
		var tileLoader = new THREE.TextureLoader();
		tileLoader.load( 'libs/remoteImg.php?'+OEV.earth.tilesProvider+'=1&z='+_loadInfos["z"]+'&x='+_loadInfos["x"]+'&y='+_loadInfos["y"]+'', 
		// tileLoader.load( 'libs/remoteImg.php?tileEle=1&z='+_loadInfos["z"]+'&x='+_loadInfos["x"]+'&y='+_loadInfos["y"]+'', 
				function(t){
					mng.datasLoaded[_loadInfos["key"]] = t;
					if( _loadInfos["tile"] != undefined ){
						_loadInfos["tile"].setTexture(t);
					}
					mng.removeLoadingList( _loadInfos["key"] );
					mng.checkForNextLoad();
				}, 
				function ( xhr ) {
				},
				function ( xhr ) {
					console.log( 'getTile .An error happened ' + _loadInfos["key"] );
					// console.log( xhr );
					mng.removeLoadingList( _loadInfos["key"] );
					mng.checkForNextLoad();
				}
			);
	}
}

class AjaxMng {
	constructor( url, params, callbackFunction ) {
		this.url = url;
		this.params = params;
		this.callbackFunction = callbackFunction;
		this.request = this.getRequest();
		if (this.request) {
			var req = this.request;
			req.onreadystatechange = this.bindFunction(this.stateChange, this);
			req.open("GET", url, true);
			req.send(this.postBody);
		}
	}

	bindFunction(caller, object) {
		return function() {
			return caller.apply(object, [object]);
		};
	}

	stateChange(object) {
		if (this.request.readyState==4){
			this.callbackFunction(this.request.responseText, this.params);
		}
	}

	getRequest() {
		if (window.ActiveXObject)
			return new ActiveXObject('Microsoft.XMLHTTP');
		else if (window.XMLHttpRequest)
			return new XMLHttpRequest();
		return false;
	}
}

export { DatasMng as default}
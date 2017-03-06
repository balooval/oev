Oev.Tile = (function(){
	'use strict';
	
	var api = {
		workerBuilding : new Worker("js/WorkerBuildings.js"), 
	};
		
	api.Basic = function ( _globe, _tileX, _tileY, _zoom ) {
		this.evt = new Oev.Utils.Evt();
		this.isReady = false;
		this.meshInstance = null;
		this.onStage = true;
		this.globe = _globe;
		this.parentTile = undefined;
		this.parentOffset = new THREE.Vector2( 0, 0 );
		this.tileX = _tileX;
		this.tileY = _tileY;
		this.zoom = _zoom;
		this.childsZoom = _zoom;
		this.childTiles = [];
		this.textureLoaded = false;
		this.tileLoader = new THREE.TextureLoader();
		this.remoteTex = undefined;
		this.meshe = undefined;
		this.materialBorder = new THREE.MeshBasicMaterial({color: 0xffffff,map: OEV.textures["checker"]});
		this.startCoord = Oev.Utils.tileToCoords( this.tileX, this.tileY, this.zoom );
		this.endCoord = Oev.Utils.tileToCoords( this.tileX + 1, this.tileY + 1, this.zoom );
		this.startLargeCoord = Oev.Utils.tileToCoords( this.tileX - 1, this.tileY - 1, this.zoom );
		this.endLargeCoord = Oev.Utils.tileToCoords( this.tileX + 2, this.tileY + 2, this.zoom );
		this.startMidCoord = Oev.Utils.tileToCoords( this.tileX - 0.5, this.tileY - 0.5, this.zoom );
		this.endMidCoord = Oev.Utils.tileToCoords( this.tileX + 1.5, this.tileY + 1.5, this.zoom );
		this.middleCoord = new THREE.Vector2( ( this.startCoord.x + this.endCoord.x ) / 2, ( this.startCoord.y + this.endCoord.y ) / 2 );
		this.vertCoords = [];
		var nbTiles = Math.pow(2, this.zoom);
		this.angleStep = (1.0 / nbTiles) * Math.PI;
		this.angleXStart = this.tileX * (this.angleStep * 2);
		this.angleXEnd = (this.tileX + 1) * (this.angleStep * 2);
		this.angleYStart = this.tileY * this.angleStep;
		this.angleYEnd = (this.tileY + 1) * this.angleStep;
		this.surfacesProviders = [];
		this.nodesProvider = new TileNodes(this);
		this.distToCam = -1;
		this.globe.evt.addEventListener("DATAS_TO_LOAD_CHANGED", this, this.loadDatas);
		this.material = new THREE.MeshPhongMaterial({color: 0xA0A0A0, shininess: 0, map: OEV.textures["checker"]});
		for (var key in this.globe.tileExtensions) {
			this.globe.tileExtensions[key](this);
		}

	}

	api.Basic.prototype = {
		
		makeFace : function() {
			this.distToCam = ((this.globe.coordDetails.x - this.middleCoord.x) * (this.globe.coordDetails.x - this.middleCoord.x) + (this.globe.coordDetails.y - this.middleCoord.y) * (this.globe.coordDetails.y - this.middleCoord.y));
			var geometry = new THREE.Geometry();
			// geometry.dynamic = false;
			geometry.faceVertexUvs[0] = [];
			this.vertCoords = [];
			var vertBySide = this.globe.tilesDefinition + 1;
			var vect;
			var vectIndex = 0;
			var x;
			var y;
			var vectX, vectY, vertZ;
			var stepUV = 1 / this.globe.tilesDefinition;
			var stepCoord = new THREE.Vector2((this.endCoord.x - this.startCoord.x) / this.globe.tilesDefinition, (this.endCoord.y - this.startCoord.y) / this.globe.tilesDefinition);
			for( x = 0; x < vertBySide; x ++ ){
				for (y = 0; y < vertBySide; y ++) {
					vectX = this.startCoord.x + (stepCoord.x * x);
					vectY = this.startCoord.y + (stepCoord.y * y);
					vertZ = this._getVerticeElevation(vectIndex, vectX, vectY);
					this.vertCoords.push(new THREE.Vector3(vectX, vectY, vertZ));
					vect = this.globe.coordToXYZ(vectX, vectY, vertZ);
					geometry.vertices.push(vect);
					vectIndex ++;
				}
			}
			for (x = 0; x < this.globe.tilesDefinition; x ++) {
				for (y = 0; y < this.globe.tilesDefinition; y ++) {
					geometry.faces.push(new THREE.Face3((y + 1) + (x * vertBySide), y + ((x + 1) * vertBySide), y + (x * vertBySide)));
					geometry.faceVertexUvs[0][(geometry.faces.length - 1 )] = [new THREE.Vector2((x * stepUV), 1 - ((y + 1) * stepUV)), new THREE.Vector2(((x + 1) * stepUV), 1 - (y * stepUV)), new THREE.Vector2((x * stepUV), 1 - (y * stepUV))];
					geometry.faces.push(new THREE.Face3((y + 1) + (x * vertBySide), (y + 1) + ((x + 1) * vertBySide), y + ((x + 1) * vertBySide)));
					geometry.faceVertexUvs[0][(geometry.faces.length - 1)] = [new THREE.Vector2((x * stepUV), 1 - ((y + 1) * stepUV)), new THREE.Vector2(((x + 1) * stepUV), 1 - ((y + 1) * stepUV)), new THREE.Vector2(((x + 1) * stepUV), 1 - (y * stepUV))];
				}
			}
			geometry.uvsNeedUpdate = true;
			geometry.computeFaceNormals();
			// geometry.mergeVertices();
			geometry.computeVertexNormals();
			this.meshe = new THREE.Mesh(geometry, this.material);
			this.meshe.matrixAutoUpdate = false;
			if (this.onStage) {
				this.globe.addMeshe(this.meshe);
			}
			this.meshe.castShadow = true;
			this.meshe.receiveShadow = true;
			this.mapParentTexture();
			this.loadImage();
			this.loadDatas();
			this.isReady = true;
			this.evt.fireEvent('TILE_READY');
		}, 
		
		loadDatas : function() {
			this.loadModels();
			this.loadLanduse();
			this.loadNodes();
			this.evt.fireEvent('LOAD_DATAS');
		}, 


		mapParentTexture : function() {
			var x;
			var y;
			var stepUV;
			var curFace;
			var curParent = this.parentTile;
			if (!this.textureLoaded && curParent != undefined) {
				var uvReduc = 0.5;
				var curOffsetX = this.parentOffset.x * 0.5;
				var curOffsetY = this.parentOffset.y * 0.5;
				while (curParent != undefined && !curParent.textureLoaded) {
					uvReduc *= 0.5;
					curOffsetX = curParent.parentOffset.x * 0.5 + (curOffsetX * 0.5);
					curOffsetY = curParent.parentOffset.y * 0.5 + (curOffsetY * 0.5);
					curParent = curParent.parentTile;
				}
				if (curParent != undefined) {
					this.material.map = curParent.material.map;
					curFace = 0;
					stepUV = uvReduc / this.globe.tilesDefinition;
					for (x = 0; x < this.globe.tilesDefinition; x ++) {
						for (y = 0; y < this.globe.tilesDefinition; y ++){
							this.meshe.geometry.faceVertexUvs[0][curFace][0].set( curOffsetX + ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV )- curOffsetY );
							this.meshe.geometry.faceVertexUvs[0][curFace][1].set( curOffsetX + ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV )- curOffsetY );
							this.meshe.geometry.faceVertexUvs[0][curFace][2].set( curOffsetX + ( x * stepUV ), 1 - ( y * stepUV )- curOffsetY ) ;
							curFace ++;
							this.meshe.geometry.faceVertexUvs[0][curFace][0].set( curOffsetX + ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV )- curOffsetY );
							this.meshe.geometry.faceVertexUvs[0][curFace][1].set( curOffsetX + ( ( x + 1 ) * stepUV ), 1 - ( ( y + 1 ) * stepUV )- curOffsetY );
							this.meshe.geometry.faceVertexUvs[0][curFace][2].set( curOffsetX + ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV )- curOffsetY );
							curFace ++;
						}
					}
				}
			} else if(this.textureLoaded) {
				curFace = 0;
				stepUV = 1 / this.globe.tilesDefinition;
				if (this.meshe.geometry.faceVertexUvs[0].length == 0) {
					console.warn('ERROR', this.tileX, this.tileY, this.zoom);
					return false;
				}
				for (x = 0; x < this.globe.tilesDefinition; x ++) {
					for (y = 0; y < this.globe.tilesDefinition; y ++) {
						try{
							this.meshe.geometry.faceVertexUvs[0][curFace][0].set((x * stepUV), 1 - ((y + 1) * stepUV));
							this.meshe.geometry.faceVertexUvs[0][curFace][1].set(((x + 1) * stepUV), 1 - (y * stepUV));
							this.meshe.geometry.faceVertexUvs[0][curFace][2].set((x * stepUV), 1 - (y * stepUV));
							curFace ++;
							this.meshe.geometry.faceVertexUvs[0][curFace][0].set((x * stepUV), 1 - ((y + 1) * stepUV));
							this.meshe.geometry.faceVertexUvs[0][curFace][1].set(((x + 1) * stepUV), 1 - ((y + 1) * stepUV));
							this.meshe.geometry.faceVertexUvs[0][curFace][2].set(((x + 1) * stepUV), 1 - (y * stepUV));
							curFace ++;
						} catch (e) {
							console.log('ERROR', this.tileX, this.tileY, this.zoom);
						}
					}
				}
				this.meshe.geometry.uvsNeedUpdate = true;
			}
		}, 

		updateVertex : function() {
			this.globe.removeMeshe(this.meshe);
			this.meshe.geometry.dispose();
			this.makeFace();
			for( var i = 0; i < this.childTiles.length; i ++ ){
				this.childTiles[i].updateVertex();
			}
			OEV.MUST_RENDER = true;
		}, 

		show : function() {
			if (this.onStage) {
				return false;
			}
			var i;
			this.onStage = true;
			this.globe.addMeshe(this.meshe);
			this.loadImage();
			this.loadDatas();
			for (i = 0; i < this.surfacesProviders.length; i ++) {
				this.surfacesProviders[i].hide(false);
			}
			this.nodesProvider.hide(false);
			this.loadNodes();
			if(this.meshInstance) {
				OEV.scene.add(this.meshInstance);
			}
			this.evt.fireEvent('SHOW');
		}, 
		
		hide : function() {
			if (!this.onStage) {
				return false;
			}
			var i;
			this.onStage = false;
			this.globe.removeMeshe(this.meshe);
			if (!this.textureLoaded) {
				this.globe.loaderTile2D.abort({
					z : this.zoom, 
					x : this.tileX, 
					y : this.tileY
				});
			}
			for (i = 0; i < this.surfacesProviders.length; i ++) {
				this.surfacesProviders[i].hide(true);
			}
			this.nodesProvider.hide(true);
			if(this.meshInstance) {
				OEV.scene.remove(this.meshInstance);
			}
			this.evt.fireEvent('HIDE');
		}, 

		clearChildrens : function() {
			if( this.childTiles.length == 0 ){
				return false;
			}
			for (var i = 0; i < this.childTiles.length; i ++) {
				this.childTiles[i].dispose();
				this.childTiles[i] = undefined;
			}
			this.childTiles = [];
			this.show();
		}, 

		clearTilesOverzoomed : function() {
			if ((this.zoom + 1) > this.globe.CUR_ZOOM) {
				this.clearChildrens();
			}
		}, 

		updateDetails : function() {
			var i;
			var newTile;
			var childZoom;
			if (this.checkCameraHover(this.globe.tilesDetailsMarge)) {
				// console.log('updateDetails', this.zoom, this.globe.CUR_ZOOM);
				if (this.childTiles.length == 0 && this.zoom < Math.floor(this.globe.CUR_ZOOM)) {
					// console.log('updateDetails', this.globe.CUR_ZOOM, this.zoom);
					this.childsZoom = this.globe.CUR_ZOOM;
					childZoom = this.zoom + 1;
					newTile = new Oev.Tile.Basic(this.globe, this.tileX * 2, this.tileY * 2, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 0, 0 );
					newTile.makeFace();
					this.childTiles.push(newTile);
					newTile.updateDetails();
					newTile = new Oev.Tile.Basic(this.globe, this.tileX * 2, this.tileY * 2 + 1, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 0, 1 );
					newTile.makeFace();
					this.childTiles.push( newTile );
					newTile.updateDetails();
					newTile = new Oev.Tile.Basic(this.globe, this.tileX * 2 + 1, this.tileY * 2, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 1, 0 );
					newTile.makeFace();
					this.childTiles.push(newTile);
					newTile.updateDetails();
					newTile = new Oev.Tile.Basic(this.globe, this.tileX * 2 + 1, this.tileY * 2 + 1, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 1, 1 );
					newTile.makeFace();
					this.childTiles.push(newTile);
					newTile.updateDetails();
					this.hide();
					/*
					for (i = 0; i < this.datasProviders.length; i ++ ){
						this.datasProviders[i].passModelsToChilds();
					}
					*/
				}else{
					if (this.childTiles.length > 0 && this.childsZoom > this.globe.CUR_ZOOM) {
						this.clearTilesOverzoomed();
					}
					for (i = 0; i < this.childTiles.length; i ++) {
						this.childTiles[i].updateDetails();
					}
				}
			}else{
				this.clearChildrens();
				if( this.zoom + 5 < this.globe.CUR_ZOOM ){
					this.hide();
				}else{
					this.show();	
				}
			}
		}, 

		checkCameraHover : function( _marge ) {
			var startLimit = Oev.Utils.tileToCoords(this.tileX - (_marge - 1), this.tileY - (_marge - 1), this.zoom);
			var endLimit = Oev.Utils.tileToCoords(this.tileX + _marge, this.tileY + _marge, this.zoom);
			if (startLimit.x > this.globe.coordDetails.x) {
				return false;
			}
			if (endLimit.x < this.globe.coordDetails.x) {
				return false;
			}
			if (startLimit.y < this.globe.coordDetails.y) {
				return false;
			}
			if (endLimit.y > this.globe.coordDetails.y) {
				return false;
			}
			return true;
		}, 

		loadLanduse : function() {
			if( this.globe.loadLanduse ){
				if (this.onStage && this.zoom >= 15) {
					var myParent = this;
					while( myParent.zoom > 15 ){
						myParent = myParent.parentTile;
					}
					if( this.surfacesProviders.length == 0 ){
						var surfA = new Oev.Tile.Surface( this, myParent.tileX, myParent.tileY, myParent.zoom );
						this.surfacesProviders.push( surfA );
						surfA.load();
					}else{
						for( var i = 0; i < this.surfacesProviders.length; i ++ ){
							this.surfacesProviders[i].hide(false);
						}
					}
				}
			}else if( !this.globe.loadLanduse ){
				for( var i = 0; i < this.surfacesProviders.length; i ++ ){
					this.surfacesProviders[i].dispose();
					this.surfacesProviders[i] = undefined;
				}
				this.surfacesProviders = [];
				OEV.MUST_RENDER = true;
			}
		}, 

		reloadTexture : function() {
			this.textureLoaded = false;
			this.remoteTex = undefined;
			for( var i = 0; i < this.childTiles.length; i ++ ){
				this.childTiles[i].reloadTexture();
			}
			this.loadImage();
		}, 

		setTexture : function(_texture) {
			this.textureLoaded = true;
			this.remoteTex = _texture;
			this.material.map = this.remoteTex;
			this.material.map.anisotropy = 8;
			this.materialBorder.map = this.remoteTex;
			this.mapParentTexture();
			OEV.MUST_RENDER = true;
		}, 

		loadImage : function() {
			if( !this.textureLoaded ){
				var _self = this;
				this.globe.loaderTile2D.getData(
					{
						z : this.zoom, 
						x : this.tileX, 
						y : this.tileY, 
						priority : this.distToCam
					}, 
					function(_texture) {
						_self.setTexture(_texture);
					}
				);
			}else{
				this.setTexture(this.remoteTex);
			}
		}, 

		update : function() {
			this.material.uniforms.time.value = ( OEV.globalTime - 1456688420000 ) / 10;
			this.material.uniforms.time.value.needsUpdate = true;
			OEV.MUST_RENDER = true;
		}, 

		loadNodes : function() {
			if( this.globe.loadNodes ){
				this.nodesProvider.drawDatas();
			}else{
				this.nodesProvider.hide(true);
			}
		}, 
			
		loadModels : function() {
			/*
			for( var i = 0; i < this.datasProviders.length; i ++ ){
				this.datasProviders[i].drawDatas();
			}
			*/
		}, 
		
		
		getElevation : function(_lon, _lat) {
			return 0;
		}, 

		_getVerticeElevation : function(_vertIndex, _lon, _lat) {
			return 0;
		}, 

		interpolateEle : function(_lon, _lat, _debug) {
			return 0;
		}, 

		calcBBoxCurZoom : function(_bbox) {
			if( this.zoom == Math.round( this.globe.CUR_ZOOM ) ){
				if( this.startCoord.x < _bbox["left"] ){
					_bbox["left"] = this.startCoord.x;
				}
				if( this.endCoord.x > _bbox["right"] ){
					_bbox["right"] = this.endCoord.x;
				}
				if( this.startCoord.y > _bbox["top"] ){
					_bbox["top"] = this.startCoord.y;
				}
				if( this.endCoord.y < _bbox["bottom"] ){
					_bbox["bottom"] = this.endCoord.y;
				}
			}else{
				for( var i = 0; i < this.childTiles.length; i ++ ){
					_bbox = this.childTiles[i].calcBBoxCurZoom( _bbox );
				}
			}
			return _bbox;
		}, 

		dispose : function() {
			this.globe.evt.removeEventListener("DATAS_TO_LOAD_CHANGED", this, this.loadDatas);
			this.clearChildrens();
			this.hide();
			this.nodesProvider.dispose();
			for( var i = 0; i < this.surfacesProviders.length; i ++ ){
				this.surfacesProviders[i].dispose();
			}
			if( this.meshe != undefined ){
				this.meshe.geometry.dispose();
				this.material.map.dispose();
				this.material.dispose();
			}
			if (this.textureLoaded) {
				this.remoteTex.dispose();
			}
			if( this.mustUpdate ){
				OEV.removeObjToUpdate( this );
			}
			if (this.meshInstance) {
				this.meshInstance.geometry.dispose();
			}
			this.isReady = false;
			this.evt.fireEvent('DISPOSE');
		}, 
	}
	
	return api;
})();


Oev.Tile.ProcessQueue = (function(){
	var waitingTiles = [];
	
	var api = {
		addWaiting : function(_tile) {
			waitingTiles.push(_tile);
			OEV.addObjToUpdate(api);
		}, 
		
		processNext : function() {
			if (waitingTiles.length == 0) {
				OEV.removeObjToUpdate(api);
				return null;
			}
			return waitingTiles.shift();
		}, 
		
		update : function() {
			var tile = api.processNext();
			if (tile === null) {
				return false;
			}
			tile.construct();
		}, 
	};
	
	return api;
})();


Oev.Cache = (function(){
	var materials = {
		'MeshPhongMaterial' : [], 
		'MeshBasicMaterial' : [], 
	};
	
	
	var api = {
		getMaterial : function(_type) {
			if (materials[_type].length == 0) {
				if (_type == 'MeshPhongMaterial') {
					materials[_type].push(new THREE.MeshPhongMaterial( { shininess: 0, color: 0xffffff, map: OEV.textures["checker"]}));
				} else if (_type == 'MeshBasicMaterial') {
					materials[_type].push(new THREE.MeshBasicMaterial({color: 0xffffff,map: OEV.textures["checker"]}));
				}
			}
			return materials[_type].pop();
		}, 
		
		freeMaterial : function(_type, _material) {
			materials[_type].push(_material);
		}, 
	};
	
	return api;
})();

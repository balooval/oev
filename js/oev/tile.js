var minX = 999999999;
var maxX = -999999999;
var minY = 999999999;
var maxY = -999999999;


var tmpTile = 0;

Oev.Tile = (function(){
	'use strict';
	
	var api = {
		
	};
		
	api.Basic = function (_tileX, _tileY, _zoom) {
		this.evt = new Oev.Utils.Evt();
		this.isReady = false;
		this.meshInstance = null;
		this.onStage = true;
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
		// this.materialBorder = new THREE.MeshBasicMaterial({color: 0xffffff,map: OEV.textures["checker"]});
		this.startCoord = Oev.Utils.tileToCoordsVect( this.tileX, this.tileY, this.zoom );
		this.endCoord = Oev.Utils.tileToCoordsVect( this.tileX + 1, this.tileY + 1, this.zoom );
		this.startLargeCoord = Oev.Utils.tileToCoordsVect( this.tileX - 1, this.tileY - 1, this.zoom );
		this.endLargeCoord = Oev.Utils.tileToCoordsVect( this.tileX + 2, this.tileY + 2, this.zoom );
		this.startMidCoord = Oev.Utils.tileToCoordsVect( this.tileX - 0.5, this.tileY - 0.5, this.zoom );
		this.endMidCoord = Oev.Utils.tileToCoordsVect( this.tileX + 1.5, this.tileY + 1.5, this.zoom );
		this.middleCoord = new THREE.Vector2( ( this.startCoord.x + this.endCoord.x ) / 2, ( this.startCoord.y + this.endCoord.y ) / 2 );
		this.vertCoords = [];
		this.surfacesProviders = [];
		this.nodesProvider = new TileNodes(this);
		this.distToCam = -1;
		Oev.Globe.evt.addEventListener("DATAS_TO_LOAD_CHANGED", this, this.loadDatas);
		this.material = new THREE.MeshPhongMaterial({color: 0xA0A0A0, wireframe:false, shininess: 0, map: OEV.textures["checker"]});
		
		
		this.extensions = [];
		for (var i = 0; i < Oev.Tile.Extension.activated.length; i ++) {
			// console.log('Tile init, add extension', Oev.Tile.Extension.activated[i]);
			this.addExtension(Oev.Tile.Extension.activated[i]);
		}
		/*
		for (var key in Oev.Globe.tileExtensions) {
			var ext = new Oev.Globe.tileExtensions[key](this);
			this.extensions.push(ext);
		}
		*/
		this.tmpNb = 0;
		Oev.Tile.Extension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
	}

	api.Basic.prototype = {
		
		onExtensionActivation : function(_extensionId) {
			this.addExtension(_extensionId);
		}, 
		
		addExtension : function(_extensionId) {
			if (this.ownExtension(_extensionId)) {
				return false;
			}
			var ext = new Oev.Globe.tileExtensions[_extensionId](this);
			this.extensions.push(ext);
			for (var i = 0; i < this.childTiles.length; i ++) {
				this.childTiles[i].addExtension(_extensionId);
			}
			return true;
		}, 
		
		ownExtension : function(_id) {
			this.tmpNb ++;
			for (var i = 0; i < this.extensions.length; i ++) {
				if (this.extensions[i].id === _id) {
					return true;
				}
			}
			return false;
		}, 
		
		removeExtension : function(_id) {
			var found = false;
			for (var i = 0; i < this.extensions.length; i ++) {
				if (this.extensions[i].id == _id) {
					this.extensions.splice(i, 1);
					found = true;
					break;
				}
			}
			for (i = 0; i < this.childTiles.length; i ++) {
				this.childTiles[i].removeExtension(_id);
			}
			if (found === true) {
				return true;
			}
			console.warn('Tile.removeExtension, not found :', _id);
			return false;
		}, 
		
		mapParentTextureBuffer : function() {
			// return false;
			var stepUV;
			var curParent = this.parentTile;
			if (this.textureLoaded || curParent === undefined) {
				return false;
			}
			var uvReduc = 0.5;
			var curOffsetX = this.parentOffset.x * 0.5;
			var curOffsetY = this.parentOffset.y * 0.5;
			while (curParent != undefined && !curParent.textureLoaded) {
				uvReduc *= 0.5;
				curOffsetX = curParent.parentOffset.x * 0.5 + (curOffsetX * 0.5);
				curOffsetY = curParent.parentOffset.y * 0.5 + (curOffsetY * 0.5);
				curParent = curParent.parentTile;
			}
			if (curParent === undefined) {
				return false;
			}
			var def = Oev.Globe.tilesDefinition;
			var vertBySide = def + 1;
			var nbVertices = vertBySide * vertBySide;
			var bufferUvs = new Float32Array(nbVertices * 2);
			stepUV = uvReduc / def;
			var uvIndex = 0;
			for (var x = 0; x < vertBySide; x ++) {
				for (var y = 0; y < vertBySide; y ++) {
					uvIndex = (x * vertBySide) + y;
					bufferUvs[uvIndex * 2] = curOffsetX + (stepUV * x);
					bufferUvs[uvIndex * 2 + 1] = 1 - (stepUV * y)- curOffsetY;
				}
			}
			this.material.map = curParent.material.map;
			this.meshe.geometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
			this.meshe.geometry.attributes.uv.needsUpdate = true;
			return true;
		}, 
		
		mapSelfTexture : function() {
			if (this.meshe === undefined) {
				return false;
			}
			var def = Oev.Globe.tilesDefinition;
			var vertBySide = def + 1;
			var stepUV = 1 / def;
			var nbVertices = vertBySide * vertBySide;
			var bufferUvs = new Float32Array(nbVertices * 2);
			var uvIndex = 0;
			var vertId = 0;
			for (var x = 0; x < vertBySide; x ++) {
				for (var y = 0; y < vertBySide; y ++) {
					uvIndex = (x * vertBySide) + y;
					bufferUvs[uvIndex * 2] = stepUV * x;
					bufferUvs[uvIndex * 2 + 1] = 1 - (stepUV * y);
					
				}
			}
			this.meshe.geometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
			this.meshe.geometry.attributes.uv.needsUpdate = true;
		}, 
		
		makeFaceBuffer : function() {
			this.distToCam = ((Oev.Globe.coordDetails.x - this.middleCoord.x) * (Oev.Globe.coordDetails.x - this.middleCoord.x) + (Oev.Globe.coordDetails.y - this.middleCoord.y) * (Oev.Globe.coordDetails.y - this.middleCoord.y));
			this.vertCoords = [];
			var def = Oev.Globe.tilesDefinition;
			var vertBySide = def + 1;
			var nbFaces = (def * def) * 2;
			var nbVertices = vertBySide * vertBySide;
			var bufferVertices = new Float32Array(nbVertices * 3);
			var bufferFaces = new Uint32Array(nbFaces * 3);
			var faceVertId = 0;
			var curVertId = 0;
			var curVertAltId = 0;
			var stepCoord = new THREE.Vector2((this.endCoord.x - this.startCoord.x) / def, (this.endCoord.y - this.startCoord.y) / def);
			var vectX;
			var vectY;
			var vertZ;
			var vertPos;
			var startLon = this.startCoord.x;
			var startLat = this.startCoord.y;
			for (var x = 0; x < vertBySide; x ++) {
				for (var y = 0; y < vertBySide; y ++) {
					curVertAltId = y + x * vertBySide;
					vectX = startLon + (stepCoord.x * x);
					vectY = startLat + (stepCoord.y * y);
					vertZ = this._getVerticeElevation(curVertAltId, vectX, vectY);
					this.vertCoords.push(new THREE.Vector3(vectX, vectY, vertZ));
					vertPos = Oev.Globe.coordToXYZ(vectX, vectY, vertZ);
					bufferVertices[curVertId] = vertPos.x;
					curVertId ++;
					bufferVertices[curVertId] = vertPos.y;
					curVertId ++;
					bufferVertices[curVertId] = vertPos.z;
					curVertId ++;
				}
			}
			var faceId = 0;
			for (var x = 0; x < def; x ++) {
				for (var y = 0; y < def; y ++) {
					bufferFaces[faceId + 0] = (x * vertBySide) + y;
					bufferFaces[faceId + 1] = (x * vertBySide) + y + 1;
					bufferFaces[faceId + 2] = ((x + 1) * vertBySide) + y + 1;
					bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1;
					bufferFaces[faceId + 4] = ((x + 1) * vertBySide) + y;
					bufferFaces[faceId + 5] = (x * vertBySide) + y;
					faceId += 6;
				}
			}
			var geoBuffer = new THREE.BufferGeometry();
			geoBuffer.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
			// geoBuffer.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
			geoBuffer.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
			geoBuffer.computeFaceNormals();
			geoBuffer.computeVertexNormals();
			if (this.meshe !== undefined) {
				Oev.Globe.removeMeshe(this.meshe);
				this.meshe.geometry.dispose();
				this.meshe = undefined;
			}
			this.meshe = new THREE.Mesh(geoBuffer, this.material);
			
			
			if (this.onStage) {
				Oev.Globe.addMeshe(this.meshe);
			}
			this.meshe.castShadow = true;
			this.meshe.receiveShadow = true;
			if (this.mapParentTextureBuffer() === false) {
				this.mapSelfTexture();
			}
			this.loadImage();
			this.loadDatas();
			this.isReady = true;
			this.evt.fireEvent('TILE_READY');
		}, 
		
		makeFace : function() {
			this.makeFaceBuffer();
			return false;
			
			this.distToCam = ((Oev.Globe.coordDetails.x - this.middleCoord.x) * (Oev.Globe.coordDetails.x - this.middleCoord.x) + (Oev.Globe.coordDetails.y - this.middleCoord.y) * (Oev.Globe.coordDetails.y - this.middleCoord.y));
			var geometry = new THREE.Geometry();
			// geometry.dynamic = false;
			geometry.faceVertexUvs[0] = [];
			this.vertCoords = [];
			var vertBySide = Oev.Globe.tilesDefinition + 1;
			var vect;
			var vectIndex = 0;
			var x;
			var y;
			var vectX, vectY, vertZ;
			var stepUV = 1 / Oev.Globe.tilesDefinition;
			var stepCoord = new THREE.Vector2((this.endCoord.x - this.startCoord.x) / Oev.Globe.tilesDefinition, (this.endCoord.y - this.startCoord.y) / Oev.Globe.tilesDefinition);
			for( x = 0; x < vertBySide; x ++ ){
				for (y = 0; y < vertBySide; y ++) {
					vectX = this.startCoord.x + (stepCoord.x * x);
					vectY = this.startCoord.y + (stepCoord.y * y);
					vertZ = this._getVerticeElevation(vectIndex, vectX, vectY);
					this.vertCoords.push(new THREE.Vector3(vectX, vectY, vertZ));
					vect = Oev.Globe.coordToXYZ(vectX, vectY, vertZ);
					geometry.vertices.push(vect);
					vectIndex ++;
				}
			}
			
			for (x = 0; x < Oev.Globe.tilesDefinition; x ++) {
				for (y = 0; y < Oev.Globe.tilesDefinition; y ++) {
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
				Oev.Globe.addMeshe(this.meshe);
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
			this.loadLanduse();
			this.loadNodes();
			this.evt.fireEvent('LOAD_DATAS');
		}, 

		mapParentTexture : function() {
			this.mapParentTextureBuffer();
			return false;
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
					stepUV = uvReduc / Oev.Globe.tilesDefinition;
					for (x = 0; x < Oev.Globe.tilesDefinition; x ++) {
						for (y = 0; y < Oev.Globe.tilesDefinition; y ++){
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
				stepUV = 1 / Oev.Globe.tilesDefinition;
				if (this.meshe.geometry.faceVertexUvs[0].length == 0) {
					console.warn('ERROR', this.tileX, this.tileY, this.zoom);
					return false;
				}
				for (x = 0; x < Oev.Globe.tilesDefinition; x ++) {
					for (y = 0; y < Oev.Globe.tilesDefinition; y ++) {
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
			Oev.Globe.removeMeshe(this.meshe);
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
			Oev.Globe.addMeshe(this.meshe);
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
			Oev.Globe.removeMeshe(this.meshe);
			if (!this.textureLoaded) {
				Oev.Globe.loaderTile2D.abort({
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
			if ((this.zoom + 1) > Oev.Globe.CUR_ZOOM) {
				this.clearChildrens();
			}
		}, 

		updateDetails : function(_coords) {
			var i;
			var newTile;
			var childZoom;
			if (this.checkCameraHover(_coords, Oev.Globe.tilesDetailsMarge)) {
				if (this.childTiles.length == 0 && this.zoom < Math.floor(Oev.Globe.CUR_ZOOM)) {
					this.childsZoom = Oev.Globe.CUR_ZOOM;
					childZoom = this.zoom + 1;
					newTile = new Oev.Tile.Basic(this.tileX * 2, this.tileY * 2, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 0, 0 );
					newTile.makeFace();
					this.childTiles.push(newTile);
					newTile.updateDetails(_coords);
					newTile = new Oev.Tile.Basic(this.tileX * 2, this.tileY * 2 + 1, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 0, 1 );
					newTile.makeFace();
					this.childTiles.push( newTile );
					newTile.updateDetails(_coords);
					newTile = new Oev.Tile.Basic(this.tileX * 2 + 1, this.tileY * 2, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 1, 0 );
					newTile.makeFace();
					this.childTiles.push(newTile);
					newTile.updateDetails(_coords);
					newTile = new Oev.Tile.Basic(this.tileX * 2 + 1, this.tileY * 2 + 1, childZoom);
					newTile.parentTile = this;
					newTile.parentOffset = new THREE.Vector2( 1, 1 );
					newTile.makeFace();
					this.childTiles.push(newTile);
					newTile.updateDetails(_coords);
					this.hide();
				}else{
					if (this.childTiles.length > 0 && this.childsZoom > Oev.Globe.CUR_ZOOM) {
						this.clearTilesOverzoomed();
					}
					for (i = 0; i < this.childTiles.length; i ++) {
						this.childTiles[i].updateDetails(_coords);
					}
				}
			}else{
				this.clearChildrens();
				if( this.zoom + 5 < Oev.Globe.CUR_ZOOM ){
					this.hide();
				}else{
					this.show();	
				}
			}
			if (this.onStage) {
				var pos = Oev.Globe.coordToXYZ(this.middleCoord.x, this.middleCoord.y, 0);
				minX = Math.min(pos.x, minX);
				maxX = Math.max(pos.x, maxX);
				minY = Math.min(pos.z, minY);
				maxY = Math.max(pos.z, maxY);
			}
		}, 
		
		searchMainTile : function(_coords) {
			if (this.checkCameraHover(_coords, 1)) {
				if (this.childTiles.length == 0) {
					return this;
				}
				for (var i = 0; i < this.childTiles.length; i ++) {
					var childRes = this.childTiles[i].searchMainTile(_coords);
					if (childRes !== false) {
						return childRes;
					}
				}
			}
			return false;
		}, 

		checkCameraHover : function(_coords, _marge) {
			var startLimit = Oev.Utils.tileToCoords(this.tileX - (_marge - 1), this.tileY - (_marge - 1), this.zoom);
			var endLimit = Oev.Utils.tileToCoords(this.tileX + _marge, this.tileY + _marge, this.zoom);
			if (startLimit[0] > _coords.x) {
				return false;
			}
			if (endLimit[0] < _coords.x) {
				return false;
			}
			if (startLimit[1] < _coords.y) {
				return false;
			}
			if (endLimit[1] > _coords.y) {
				return false;
			}
			return true;
		}, 

		loadLanduse : function() {
			if (Oev.Globe.loadLanduse) {
				if (this.onStage && this.zoom >= 15) {
					var myParent = this;
					while (myParent.zoom > 15) {
						myParent = myParent.parentTile;
					}
					if (this.surfacesProviders.length == 0) {
						var surfA = new Oev.Tile.Surface(this, myParent.tileX, myParent.tileY, myParent.zoom);
						this.surfacesProviders.push(surfA);
						surfA.load();
					} else {
						for (var i = 0; i < this.surfacesProviders.length; i ++) {
							this.surfacesProviders[i].hide(false);
						}
					}
				}
			} else if (!Oev.Globe.loadLanduse) {
				for (var i = 0; i < this.surfacesProviders.length; i ++) {
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
			// this.materialBorder.map = this.remoteTex;
			// this.mapParentTexture();
			this.mapSelfTexture();
			OEV.MUST_RENDER = true;this.evt.fireEvent('TEXTURE_LOADED');
		}, 

		loadImage : function() {
			if( !this.textureLoaded ){
				var _self = this;
				Oev.Globe.loaderTile2D.getData(
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
			if( Oev.Globe.loadNodes ){
				this.nodesProvider.drawDatas();
			}else{
				this.nodesProvider.hide(true);
			}
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
		
		dispose : function() {
			Oev.Tile.Extension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
			Oev.Globe.evt.removeEventListener("DATAS_TO_LOAD_CHANGED", this, this.loadDatas);
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
				this.meshe = undefined;
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
			this.extensions = [];
			this.isReady = false;
			this.evt.fireEvent('DISPOSE');
		}, 
	}
	
	return api;
})();


Oev.Tile.ProcessQueue = (function(){
	var waitingsObj = [];
	
	var api = {
		addWaiting : function(_caller) {
			waitingsObj.push(_caller);
			OEV.addObjToUpdate(api);
			Oev.Ui.setQueueNb(waitingsObj.length);
		}, 
		
		processNext : function() {
			if (waitingsObj.length == 0) {
				OEV.removeObjToUpdate(api);
				Oev.Ui.setQueueNb('0');
				return null;
			}
			return waitingsObj.shift();
		}, 
		
		update : function() {
			var caller = api.processNext();
			if (caller === null) {
				return false;
			}
			caller.construct();
		}, 
	};
	
	return api;
})();
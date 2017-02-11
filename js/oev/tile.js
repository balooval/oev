Oev.Tile = (function(){
	'use strict';
	
	var api = {
		buildingWorker : new Worker("js/WorkerBuildings.js"), 
	};
		
	api.Basic = function ( _globe, _tileX, _tileY, _zoom ) {
		this.onStage = true;
		this.globe = _globe;
		this.parentTile = undefined;
		this.parentOffset = new THREE.Vector2( 0, 0 );
		this.tileX = _tileX;
		this.tileY = _tileY;
		this.zoom = _zoom;
		this.detailsSeg = this.globe.tilesDefinition;
		this.childsZoom = _zoom;
		this.childTiles = [];
		this.textureLoaded = false;
		this.eleLoaded = false;
		this.tileLoader = new THREE.TextureLoader();
		this.remoteTex = undefined;
		this.meshe = undefined;
		this.mesheBorder = undefined;
		this.materialBorder = new THREE.MeshBasicMaterial({color: 0xffffff,map: OEV.textures["checker"] });
		// this.materialBorder = Oev.Cache.getMaterial('MeshBasicMaterial');
		
		this.startCoord = Oev.Utils.tileToCoords( this.tileX, this.tileY, this.zoom );
		this.endCoord = Oev.Utils.tileToCoords( this.tileX + 1, this.tileY + 1, this.zoom );
		this.startLargeCoord = Oev.Utils.tileToCoords( this.tileX - 1, this.tileY - 1, this.zoom );
		this.endLargeCoord = Oev.Utils.tileToCoords( this.tileX + 2, this.tileY + 2, this.zoom );
		this.startMidCoord = Oev.Utils.tileToCoords( this.tileX - 0.5, this.tileY - 0.5, this.zoom );
		this.endMidCoord = Oev.Utils.tileToCoords( this.tileX + 1.5, this.tileY + 1.5, this.zoom );
		this.middleCoord = new THREE.Vector2( ( this.startCoord.x + this.endCoord.x ) / 2, ( this.startCoord.y + this.endCoord.y ) / 2 );
		this.vertCoords = [];
		this.myLOD = 0;
		if( this.zoom >= this.globe.LOD_STREET ){
			this.myLOD = this.globe.LOD_STREET;
		}else if( this.zoom >= this.globe.LOD_PLANET ){
			this.myLOD = this.globe.LOD_PLANET;
		}
		var nbTiles = Math.pow(2, this.zoom);
		this.angleStep = (1.0 / nbTiles) * Math.PI;
		this.angleXStart = this.tileX * (this.angleStep * 2);
		this.angleXEnd = (this.tileX + 1) * (this.angleStep * 2);
		this.angleYStart = this.tileY * this.angleStep;
		this.angleYEnd = (this.tileY + 1) * this.angleStep;
		this.tile3d = undefined;
		this.surfacesProviders = [];
		this.datasProviders = [];
		this.nodesProvider = new TileNodes(this);
		for (var model in OEV.MODELS_CFG) {
			if (OEV.MODELS_CFG[model]["ACTIV"]) {
				if( this.zoom >= OEV.MODELS_CFG[model]["ZOOM_MIN"] ){
					this.datasProviders.push(new DatasProvider(this, OEV.MODELS_CFG[model]["NAME"]));
				}
			}
		}
		this.distToCam = -1;
		this.globe.evt.addEventListener("DATAS_TO_LOAD_CHANGED", this, this.loadDatas);
		// this.material = new THREE.MeshPhongMaterial({shininess: 0, color: 0xffffff, map: OEV.textures["checker"]});
		this.material = new THREE.MeshLambertMaterial({color: 0xA0A0A0, map: OEV.textures["checker"]});
		// this.material = Oev.Cache.getMaterial('MeshPhongMaterial');
		this.customEle = false;
		
		this.elevationBuffer = new Uint16Array((32 * 32) / 4);;
	}

	api.Basic.prototype = {
		updateDatasProviders : function( _added, _name ) {
			for( var i = 0; i < this.childTiles.length; i ++ ){
				this.childTiles[i].updateDatasProviders( _added, _name );
			}
			
			if( _added ){
				if( this.zoom >= OEV.MODELS_CFG[_name]["ZOOM_MIN"] ){
					this.datasProviders.push(new DatasProvider(this, _name));
					this.loadModels();
				}
			}else{
				for( var i = 0; i < this.datasProviders.length; i ++ ){
					if( this.datasProviders[i].name == _name ){
						this.datasProviders[i].dispose();
						this.datasProviders.splice( i, 1 );
						break;
					}
				}
			}
		}, 


		
		makeFace : function() {
			this.distToCam = ((this.globe.coordDetails.x - this.middleCoord.x) * (this.globe.coordDetails.x - this.middleCoord.x) + (this.globe.coordDetails.y - this.middleCoord.y) * (this.globe.coordDetails.y - this.middleCoord.y));
			var geometry = new THREE.Geometry();
			// geometry.dynamic = false;
			geometry.faceVertexUvs[0] = [];
			if (!this.eleLoaded) {
				this.vertCoords = [];
			}
			var vertBySide = this.detailsSeg + 1;
			var vect;
			var vectIndex = 0;
			var x;
			var y;
			var vectX, vectY, vertZ;
			var stepUV = 1 / this.detailsSeg;
			var stepCoord = new THREE.Vector2((this.endCoord.x - this.startCoord.x) / this.detailsSeg, (this.endCoord.y - this.startCoord.y) / this.detailsSeg);
			for( x = 0; x < vertBySide; x ++ ){
				for (y = 0; y < vertBySide; y ++) {
					vectX = this.startCoord.x + (stepCoord.x * x);
					vectY = this.startCoord.y + (stepCoord.y * y);
					vertZ = this.getVerticeElevation(vectIndex, vectX, vectY);
					this.vertCoords.push(new THREE.Vector3(vectX, vectY, vertZ));
					vect = this.globe.coordToXYZ(vectX, vectY, vertZ);
					geometry.vertices.push(vect);
					vectIndex ++;
				}
			}
			for (x = 0; x < this.detailsSeg; x ++) {
				for (y = 0; y < this.detailsSeg; y ++) {
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
			this.makeBorders();
			if (this.onStage) {
				this.globe.addMeshe(this.meshe);
			}
			this.meshe.castShadow = true;
			this.meshe.receiveShadow = true;
			this.mapParentTexture();
			this.loadImage();
			this.loadDatas();
		}, 
		

		loadDatas : function() {
			this.loadElevation();
			this.loadBuildings();
			this.loadModels();
			this.loadLanduse();
			this.loadNodes();
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
					stepUV = uvReduc / this.detailsSeg;
					for (x = 0; x < this.detailsSeg; x ++) {
						for (y = 0; y < this.detailsSeg; y ++){
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
				// console.warn('inutile ?', this.tileX, this.tileY, this.zoom);
				// return false;
				curFace = 0;
				stepUV = 1 / this.detailsSeg;
				if (this.meshe.geometry.faceVertexUvs[0].length == 0) {
					console.warn('ERROR', this.tileX, this.tileY, this.zoom);
					return false;
				}
				for (x = 0; x < this.detailsSeg; x ++) {
					for (y = 0; y < this.detailsSeg; y ++) {
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
							// console.warn(e);
							// debugger;
						}
					}
				}
				this.meshe.geometry.uvsNeedUpdate = true;
			}
		}, 

		makeBorders : function() {
			var b;
			var x;
			var y;
			var vect;
			var vertEle;
			if (!this.globe.eleActiv) {
				return false;
			}
			if (this.mesheBorder != undefined) {
				this.meshe.remove(this.mesheBorder);
				this.mesheBorder.geometry.dispose();
				this.mesheBorder = undefined;
			}
			var stepUV = 1 / this.detailsSeg;
			var stepCoord = new THREE.Vector2((this.endCoord.x - this.startCoord.x) / this.detailsSeg, (this.endCoord.y - this.startCoord.y) / this.detailsSeg);
			var geoBorders = new THREE.Geometry();
			geoBorders.dynamic = false;
			geoBorders.faceVertexUvs[0] = [];
			var vertBorder = [];
			var vertUvs = [];
			var vEId;
			for (x = 0; x < (this.detailsSeg + 1); x ++) {
				vertUvs.push( new THREE.Vector2( x * stepUV, 0 ) );
				vertUvs.push( new THREE.Vector2( x * stepUV, 0 ) );
				vEId = x * ( this.detailsSeg + 1 );
				vertEle = this.vertCoords[vEId].z;
				vect = this.globe.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y, vertEle );
				vertBorder.push( vect );
				vect = this.globe.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y, 0 );
				vertBorder.push( vect );
			}
			for (y = 1; y < this.detailsSeg + 1; y ++ ){
				vertUvs.push( new THREE.Vector2( 0, y * stepUV ) );
				vertUvs.push( new THREE.Vector2( 0, y * stepUV ) );
				vEId = y + ( this.detailsSeg ) * ( this.detailsSeg + 1 );
				vertEle = this.vertCoords[vEId].z;
				vect = this.globe.coordToXYZ( this.startCoord.x + ( stepCoord.x * this.detailsSeg ), this.startCoord.y + ( stepCoord.y * y ), vertEle );
				vertBorder.push( vect );
				vect = this.globe.coordToXYZ( this.startCoord.x + ( stepCoord.x * this.detailsSeg ), this.startCoord.y + ( stepCoord.y * y ), 0 );
				vertBorder.push( vect );
			}
			for (x = 1; x < ( this.detailsSeg + 1 ); x ++ ){
				vertUvs.push( new THREE.Vector2( 1 - ( x * stepUV ), 0 ) );
				vertUvs.push( new THREE.Vector2( 1 - ( x * stepUV ), 0 ) );
				
				vEId = (this.detailsSeg + 0) + ( ( this.detailsSeg + 0 ) - x ) * ( this.detailsSeg + 1 );
				vertEle = this.vertCoords[vEId].z;
				vect = this.globe.coordToXYZ( this.endCoord.x - ( stepCoord.x * x ), this.endCoord.y, vertEle );
				vertBorder.push( vect );
				vect = this.globe.coordToXYZ( this.endCoord.x - ( stepCoord.x * x ), this.endCoord.y, 0 );
				vertBorder.push( vect );
			}
			for (y = 1; y < ( this.detailsSeg + 1 ); y ++ ){
				vertUvs.push( new THREE.Vector2( 1, 1 - ( y * stepUV ) ) );
				vertUvs.push( new THREE.Vector2( 1, 1 - ( y * stepUV ) ) );
				vEId = ( ( this.detailsSeg + 0 ) - y ) + ( 0 );
				vertEle = this.vertCoords[vEId].z;
				vect = this.globe.coordToXYZ( this.startCoord.x, this.endCoord.y - ( stepCoord.y * y ), vertEle );
				vertBorder.push( vect );
				vect = this.globe.coordToXYZ( this.startCoord.x, this.endCoord.y - ( stepCoord.y * y ), 0 );
				vertBorder.push( vect );
			}
			for (b = 0; b < vertBorder.length; b ++) {
				geoBorders.vertices.push(vertBorder[b]);
			}
			for (b = 0; b < vertBorder.length - 2; b += 2) {
				geoBorders.faces.push( new THREE.Face3( b + 2, b + 1, b + 0 ) );
				geoBorders.faceVertexUvs[0][( geoBorders.faces.length - 1 )] = [ vertUvs[b+2], vertUvs[b+1], vertUvs[b+0] ];
				geoBorders.faces.push( new THREE.Face3( b + 1, b + 2, b + 3 ) );
				geoBorders.faceVertexUvs[0][( geoBorders.faces.length - 1 )] = [ vertUvs[b+1], vertUvs[b+2], vertUvs[b+3] ];
			}
			geoBorders.uvsNeedUpdate = true;
			geoBorders.computeFaceNormals();
			geoBorders.mergeVertices()
			geoBorders.computeVertexNormals();
			this.mesheBorder = new THREE.Mesh(geoBorders, this.materialBorder);
			this.mesheBorder.matrixAutoUpdate = false;
			this.meshe.add(this.mesheBorder);
		}, 

		updateVertex : function() {
			if (this.tile3d != undefined) {
				this.tile3d.hide(true);
			}
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
			this.loadBuildings();
			this.loadElevation();
			if (this.tile3d != undefined) {
				this.tile3d.hide(false);
			}
			for (i = 0; i < this.surfacesProviders.length; i ++) {
				this.surfacesProviders[i].hide(false);
			}
			this.nodesProvider.hide(false);
			for (i = 0; i < this.datasProviders.length; i ++) {
				this.datasProviders[i].drawDatas();
			}
			this.loadNodes();
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
			if (!this.eleLoaded) {
				this.globe.loaderEle.abort({
					z : this.zoom, 
					x : this.tileX, 
					y : this.tileY
				});
			}
			this.clearModels();
			if (this.tile3d != undefined) {
				this.tile3d.hide(true);
			}
			for (i = 0; i < this.datasProviders.length; i ++) {
				this.datasProviders[i].hideDatas();
			}
			for (i = 0; i < this.surfacesProviders.length; i ++) {
				this.surfacesProviders[i].hide(true);
			}
			this.nodesProvider.hide(true);
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
					for (i = 0; i < this.datasProviders.length; i ++ ){
						this.datasProviders[i].passModelsToChilds();
					}
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


		passDatasToProvider : function( _name, _datas ) {
			for (var i = 0; i < this.datasProviders.length; i ++) {
				if (this.datasProviders[i].name == _name) {
					this.datasProviders[i].onDatasLoaded(_datas);
					this.datasProviders[i].drawDatas();
					break;
				}
			}
		}, 

		loadBuildings : function() {
			if( this.globe.loadBuildings ){
				if (this.onStage && this.zoom >= 15) {
					if (this.tile3d == undefined) {
						this.tile3d = new Oev.Tile.Building(this, this.tileX, this.tileY, this.zoom);
						this.tile3d.load();
					} else {
						this.tile3d.hide(false);
					}
				}
			} else if (!this.globe.loadBuildings && this.tile3d != undefined) {
				this.tile3d.dispose();
				this.tile3d = undefined;
				OEV.MUST_RENDER = true;
			}
		}, 


		loadLanduse : function() {
			if( this.globe.loadLanduse ){
				if (this.onStage && this.zoom >= 15) {
					var myParent = this;
					while( myParent.zoom > 15 ){
						myParent = myParent.parentTile;
					}
					if( this.surfacesProviders.length == 0 ){
						var surfA = new TileSurface( this, myParent.tileX, myParent.tileY, myParent.zoom );
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

		setTexture : function( _texture ) {
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
				this.globe.loaderTile2D.getData({
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

		clearModels : function() {
			OEV.scene.remove( this.modelsMeshe );
			for( var objName in this.modelsMesheLib ){
				OEV.scene.remove( this.modelsMesheLib[objName] );
			}
		}, 

		loadNodes : function() {
			if( this.globe.loadNodes ){
				this.nodesProvider.drawDatas();
			}else{
				this.nodesProvider.hide(true);
			}
		}, 
			
		loadModels : function() {
			for( var i = 0; i < this.datasProviders.length; i ++ ){
				this.datasProviders[i].drawDatas();
			}
		}, 
		
		loadElevation : function() {
			if (this.globe.eleActiv && !this.eleLoaded) {
				var _self = this;
				this.globe.loaderEle.getData({
						z : this.zoom, 
						x : this.tileX, 
						y : this.tileY, 
						priority : this.distToCam
					}, 
					function(_datas) {
						_self.onElevationLoaded(_datas);
					}
				);
			}
		}, 
		
		onElevationLoaded : function(_datas) {
			var i;
			this.elevationBuffer = _datas;
			this.eleLoaded = true;
			this.applyElevationToGeometry();
			// this.updateVertex();
		}, 
		
		applyElevationToGeometry : function() {
			if (!this.eleLoaded) {
				return false;
			}
			var x, y;
			var index = 0;
			var nbVertX = this.detailsSeg + 1;
			var nbVertY = this.detailsSeg + 1;
			var verticePosition;
			var stepCoord = new THREE.Vector2((this.endCoord.x - this.startCoord.x) / this.detailsSeg, (this.endCoord.y - this.startCoord.y) / this.detailsSeg);
			for (x = 0; x < nbVertX; x ++) {
				for (y = 0; y < nbVertY; y ++) {
					var ele = this.elevationBuffer[index];
					this.vertCoords[index].z = ele;
					verticePosition = this.globe.coordToXYZ(this.startCoord.x + (stepCoord.x * x), this.startCoord.y + (stepCoord.y * y), ele);
					this.meshe.geometry.vertices[index].x = verticePosition.x;
					this.meshe.geometry.vertices[index].y = verticePosition.y;
					this.meshe.geometry.vertices[index].z = verticePosition.z;
					index ++;
				}
			}
			this.makeBorders();
			this.meshe.geometry.verticesNeedUpdate = true;
			this.meshe.geometry.uvsNeedUpdate = true;
			this.meshe.geometry.computeFaceNormals();
			this.meshe.geometry.mergeVertices()
			this.meshe.geometry.computeVertexNormals();
			OEV.MUST_RENDER = true;
		}, 
		
		getElevation : function(_lon, _lat) {
			var res = -9999;
			if( this.childTiles.length == 0 ){
				res = this.interpolateEle( _lon, _lat );
			}else{
				for( var i = 0; i < this.childTiles.length; i ++ ){
					var childEle = this.childTiles[i].getElevation( _lon, _lat );
					if( childEle > -9999 ){
						res = childEle;
						break;
					}
				}
			}
			return res;
		}, 

		getVerticeElevation : function(_vertIndex, _lon, _lat) {
			if (!this.globe.eleActiv) {
				return 0;
			}
			if (this.eleLoaded) {
				this.vertCoords[_vertIndex].z;
			}
			if (this.parentTile != undefined) {
				return this.parentTile.interpolateEle(_lon, _lat);
			}
		}, 

		interpolateEle : function(_lon, _lat, _debug) {
			_debug = _debug || false;
			if( this.globe.eleActiv ){
				var gapLeft = this.endCoord.x - this.startCoord.x;
				var distFromLeft = _lon - this.startCoord.x;
				var prctLeft = distFromLeft / gapLeft;
				var gapTop = this.endCoord.y - this.startCoord.y;
				var distFromTop = _lat - this.startCoord.y;
				var prctTop = distFromTop / gapTop;
				if( prctLeft < 0 || prctLeft > 1 || prctTop < 0 || prctTop > 1 ){
					if( _debug ){
						// console.log( "OUT interpolateEle " + prctLeft + " / " + prctTop );
						// test
						prctLeft = Math.min( Math.max( prctLeft, 0 ), 1 );
						prctTop = Math.min( Math.max( prctTop, 0 ), 1 );
					}else{
						return -9999;
					}
				}
				// get boundings vertex
				if( prctLeft == 1 ){
					var vertLeftTopIdX = Math.floor( this.detailsSeg * prctLeft ) - 1;
				}else{
					var vertLeftTopIdX = Math.floor( this.detailsSeg * prctLeft );
				}
				if( prctTop == 1 ){
					var vertLeftTopIdY = Math.floor( this.detailsSeg * prctTop ) - 1;
				}else{
					var vertLeftTopIdY = Math.floor( this.detailsSeg * prctTop );
				}
				var vertLeftTopId = vertLeftTopIdY + ( vertLeftTopIdX * ( this.detailsSeg + 1 ) );
				
				if( prctLeft == 1 ){
					var vertRightTopIdX = Math.floor( this.detailsSeg * prctLeft );
				}else{
					var vertRightTopIdX = Math.floor( this.detailsSeg * prctLeft ) + 1;
				}
				if( prctTop == 1 ){
					var vertRightTopIdY = Math.floor( this.detailsSeg * prctTop ) - 1;
				}else{
					var vertRightTopIdY = Math.floor( this.detailsSeg * prctTop );
				}
				var vertRightTopId = vertRightTopIdY + ( vertRightTopIdX * ( this.detailsSeg + 1 ) );
				
				if( prctLeft == 1 ){
					var vertLeftBottomIdX = Math.floor( this.detailsSeg * prctLeft ) - 1;
				}else{
					var vertLeftBottomIdX = Math.floor( this.detailsSeg * prctLeft );
				}
				if( prctTop == 1 ){
					var vertLeftBottomIdY = Math.floor( this.detailsSeg * prctTop );
				}else{
					var vertLeftBottomIdY = Math.floor( this.detailsSeg * prctTop ) + 1;
				}
				var vertLeftBottomId = vertLeftBottomIdY + ( vertLeftBottomIdX * ( this.detailsSeg + 1 ) );
				
				if( prctLeft == 1 ){
					var vertRightBottomIdX = Math.floor( this.detailsSeg * prctLeft );
				}else{
					var vertRightBottomIdX = Math.floor( this.detailsSeg * prctLeft ) + 1;
				}
				if( prctTop == 1 ){
					var vertRightBottomIdY = Math.floor( this.detailsSeg * prctTop );
				}else{
					var vertRightBottomIdY = Math.floor( this.detailsSeg * prctTop ) + 1;
				}
				var vertRightBottomId = vertRightBottomIdY + ( vertRightBottomIdX * ( this.detailsSeg + 1 ) );
				if( vertLeftTopId > this.vertCoords.length - 1 ){
					console.log( "Overflow A " + vertLeftTopId + " / " + this.vertCoords.length );
					console.log( "prctLeft : " + prctLeft + " / prctTop : " + prctTop );
				}
				if( vertRightTopId > this.vertCoords.length - 1 ){
					console.log( "Overflow B " + vertRightTopId + " / " + this.vertCoords.length );
					console.log( "prctLeft : " + prctLeft + " / prctTop : " + prctTop );
				}
				if( vertLeftBottomId > this.vertCoords.length - 1 ){
					console.log( "Overflow C " + vertLeftBottomId + " / " + this.vertCoords.length );
					console.log( "prctLeft : " + prctLeft + " / prctTop : " + prctTop );
				}
				if( vertRightBottomId > this.vertCoords.length - 1 ){
					console.log( "Overflow D " + vertRightBottomId + " / " + this.vertCoords.length );
					console.log( "prctLeft : " + prctLeft + " / prctTop : " + prctTop );
				}
				// interpolate boundings vertex elevations
				var ampEleTop = this.vertCoords[vertRightTopId].z - this.vertCoords[vertLeftTopId].z;
				var ampEleBottom = this.vertCoords[vertRightBottomId].z - this.vertCoords[vertLeftBottomId].z;
				var ampEleLeft = this.vertCoords[vertLeftBottomId].z - this.vertCoords[vertLeftTopId].z;
				var ampEleRight = this.vertCoords[vertRightBottomId].z - this.vertCoords[vertRightTopId].z;
				var gapVertLeft = this.vertCoords[vertRightTopId].x - this.vertCoords[vertLeftTopId].x;
				var distFromVertLeft = _lon - this.vertCoords[vertLeftTopId].x;
				var prctVertLeft = distFromVertLeft / gapVertLeft;
				var gapVertTop = this.vertCoords[vertLeftBottomId].y - this.vertCoords[vertLeftTopId].y;
				var distFromVertTop = _lat - this.vertCoords[vertLeftTopId].y;
				var prctVertTop = distFromVertTop / gapVertTop;
				var eleInterpolTop = this.vertCoords[vertLeftTopId].z + ( ampEleTop * prctVertLeft );
				var eleInterpolBottom = this.vertCoords[vertLeftBottomId].z + ( ampEleTop * prctVertLeft );
				var amplVert = eleInterpolBottom - eleInterpolTop;
				var eleInterpolFinal = eleInterpolTop + ( amplVert * prctVertTop );
				if( isNaN( eleInterpolFinal ) ){
					console.log( "NaN eleInterpolFinal : " + vertLeftTopId + " / " + vertRightTopId + " / " + vertLeftBottomId + " / " + vertRightBottomId );
				}
				return eleInterpolFinal;
			}
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
			this.clearModels();
			this.hide();
			if( this.tile3d != undefined ){
				this.tile3d.dispose();
				this.tile3d = undefined;
			}
			this.nodesProvider.dispose();
			for( var i = 0; i < this.surfacesProviders.length; i ++ ){
				this.surfacesProviders[i].dispose();
			}
			for( var i = 0; i < this.datasProviders.length; i ++ ){
				this.datasProviders[i].dispose();
			}
			if( this.meshe != undefined ){
				this.meshe.geometry.dispose();
				this.material.map.dispose();
				this.material.dispose();
			}
			if( this.mesheBorder != undefined ){
				this.mesheBorder.geometry.dispose();
				this.materialBorder.map.dispose();
				this.materialBorder.dispose();
			}
			if( this.textureLoaded ){
				this.remoteTex.dispose();
			}
			this.canvasOverlay = undefined;
			if( this.mustUpdate ){
				OEV.removeObjToUpdate( this );
			}
		}, 
	}
	
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

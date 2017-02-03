var GeoTile = function ( _globe, _tileX, _tileY, _zoom ) {
	this.onStage = true;
	this.globe = _globe;
	this.parentTile = undefined;
	this.parentOffset = new THREE.Vector2( 0, 0 );
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.zoom = _zoom;
	// this.detailsSeg = 1;
	this.detailsSeg = this.globe.tilesDefinition;
	// if( this.zoom > 11 ){
		// this.detailsSeg *= 2;
	// }
	this.childsZoom = _zoom;
	this.childTiles = [];
	this.textureLoaded = false;
	this.eleLoaded = false;
	this.tileLoader = new THREE.TextureLoader();
	this.remoteTex = undefined;
	this.meshe = undefined;
	this.mesheBorder = undefined;
	this.materialBorder = new THREE.MeshBasicMaterial({color: 0xffffff,map: OEV.textures["checker"] });
	
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
	
	var nbTiles = Math.pow( 2, this.zoom );
	this.angleStep = ( 1.0 / nbTiles ) * Math.PI;
	this.angleXStart = this.tileX * ( this.angleStep * 2 );
	this.angleXEnd = ( this.tileX + 1 ) * ( this.angleStep * 2 );
	this.angleYStart = this.tileY * this.angleStep;
	this.angleYEnd = ( this.tileY + 1 ) * this.angleStep;
	
	this.tile3d = undefined;
	
	this.surfacesProviders = [];
	// this.tileSurface = undefined;
	
	this.datasProviders = [];
	
	this.nodesProvider = new TileNodes( this );
	
	
	for( var model in OEV.MODELS_CFG ){
		if( OEV.MODELS_CFG[model]["ACTIV"] ){
			if( this.zoom >= OEV.MODELS_CFG[model]["ZOOM_MIN"] ){
				this.datasProviders.push( new DatasProvider( this, OEV.MODELS_CFG[model]["NAME"] ) );
			}
		}
	}
	this.distToCam = -1;
	
	this.globe.evt.addEventListener( "DATAS_TO_LOAD_CHANGED", this, this.loadDatas );
	
	
	this.showWater = false;
	// this.showWater = true;
	
	if( this.showWater ){
		this.water = new THREE.Water( OEV.renderer, OEV.camera, OEV.scene, {
			textureWidth: 256,
			textureHeight: 256,
			waterNormals: OEV.textures['waternormals'],
			alpha: 	1.0,
			sunDirection: Oev.Sky.lightSun.position.normalize(),
			sunColor: 0xffffff,
			waterColor: 0x001e0f,
		});
		
		this.canvasOverlay = document.createElement('canvas');
		this.canvasOverlay.height = 256;
		this.canvasOverlay.width = 256;
		var context1 = this.canvasOverlay.getContext('2d');
		context1.beginPath();
		context1.fillStyle = "rgba(255, 255, 255, 0)";
		context1.fill();
		var texture1 = new THREE.Texture( this.canvasOverlay ) 
		texture1.needsUpdate = true;
		this.mustUpdate = false;

		// var attributes = {}; // custom attributes
		var uniforms = {    // custom uniforms (your textures)
			tOne: { type: "t", value: texture1 },
			tSec: { type: "t", value: OEV.textures["checker"] }, 
			time: { type: "f", value: 0 }, 
			tileOffset: { type: "v2", value: new THREE.Vector2( this.tileX, this.tileY ) }
		};
		this.material = new THREE.ShaderMaterial({
			uniforms: uniforms,
			vertexShader: vertMixShader,
			fragmentShader: fragMixShader
		});
		
	}else{
		// this.material = new THREE.MeshPhongMaterial( { shininess: 0, color: 0xffffff, map: OEV.textures["checker"] } );
		this.material = Oev.Cache.getMaterial();
	}
	
	
	
	this.customEle = false;
	this.customEle = true;

	
}


GeoTile.prototype.updateDatasProviders = function( _added, _name ) {
	for( var i = 0; i < this.childTiles.length; i ++ ){
		this.childTiles[i].updateDatasProviders( _added, _name );
	}
	
	if( _added ){
		if( this.zoom >= OEV.MODELS_CFG[_name]["ZOOM_MIN"] ){
			this.datasProviders.push( new DatasProvider( this, _name ) );
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
}


GeoTile.prototype.makeFace = function() {
	this.distToCam = ((this.globe.coordDetails.x - this.middleCoord.x) * (this.globe.coordDetails.x - this.middleCoord.x) + (this.globe.coordDetails.y - this.middleCoord.y) * (this.globe.coordDetails.y - this.middleCoord.y));
	var geometry = new THREE.Geometry();
	geometry.dynamic = false;
	geometry.faceVertexUvs[0] = [];
	if (!this.eleLoaded) {
		this.vertCoords = [];
	}
	var vect;
	var v = 0;
	var x;
	var y;
	var vertEle;
	var stepUV = 1 / this.detailsSeg;
	var stepCoord = new THREE.Vector2( ( this.endCoord.x - this.startCoord.x ) / this.detailsSeg, ( this.endCoord.y - this.startCoord.y ) / this.detailsSeg );
	for( x = 0; x < ( this.detailsSeg + 1 ); x ++ ){
		for( y = 0; y < ( this.detailsSeg + 1 ); y ++ ){
			vertEle = 0;
			this.vertCoords.push( new THREE.Vector3( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ), vertEle ) );
			if( this.globe.eleActiv ){
				if( !this.eleLoaded ){
					if( this.parentTile != undefined ){
						vertEle = this.parentTile.interpolateEle( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ) );
					}
					this.vertCoords[this.vertCoords.length - 1].z = vertEle;
				}else{
					vertEle = this.vertCoords[v].z;
				}
			}else if( this.zoom > 5 && this.customEle ){
				vertEle = this.getCustomElevation( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ) ) * 10;
			}
			vect = this.globe.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ), vertEle );
			geometry.vertices.push( vect );
			v ++;
		}
	}
	for (x = 0; x < this.detailsSeg; x ++) {
		for (y = 0; y < this.detailsSeg; y ++) {
			geometry.faces.push(new THREE.Face3((y + 1) + (x * (this.detailsSeg + 1)), y + ((x + 1) * (this.detailsSeg + 1)), y + (x * (this.detailsSeg + 1))));
			
			geometry.faceVertexUvs[0][(geometry.faces.length - 1 )] = [new THREE.Vector2((x * stepUV), 1 - ((y + 1) * stepUV)), new THREE.Vector2(((x + 1) * stepUV), 1 - (y * stepUV)), new THREE.Vector2((x * stepUV), 1 - (y * stepUV))];
			
			geometry.faces.push(new THREE.Face3((y + 1) + (x * (this.detailsSeg + 1)), (y + 1) + ((x + 1) * (this.detailsSeg + 1)), y + ((x + 1) * (this.detailsSeg + 1))));
			
			geometry.faceVertexUvs[0][( geometry.faces.length - 1 )] = [new THREE.Vector2((x * stepUV), 1 - ((y + 1) * stepUV)), new THREE.Vector2(((x + 1) * stepUV), 1 - ((y + 1) * stepUV)), new THREE.Vector2(((x + 1) * stepUV), 1 - (y * stepUV))];
		}
	}
	this.makeBorders();
	geometry.uvsNeedUpdate = true;
	geometry.computeFaceNormals();
	geometry.mergeVertices()
	geometry.computeVertexNormals();
	this.meshe = new THREE.Mesh(geometry, this.material);
	this.meshe.matrixAutoUpdate = false;
	if( this.mesheBorder != undefined ){
		this.meshe.add( this.mesheBorder );
	}
	if( this.onStage ){
		this.globe.meshe.add( this.meshe );
	}
	this.meshe.castShadow = true;
	this.meshe.receiveShadow = true;
	this.mapParentTexture();
	this.loadImage();
	this.loadDatas();
}

GeoTile.prototype.loadDatas = function() {
	this.loadEle();
	this.loadBuildings();
	this.loadModels();
	this.loadLanduse();
	this.loadNodes();
}


GeoTile.prototype.mapParentTexture = function() {
	var x;
	var y;
	var stepUV;
	var curFace;
	var curParent = this.parentTile;
	if( !this.textureLoaded && curParent != undefined ){
		var uvReduc = 0.5;
		var curOffsetX = this.parentOffset.x * 0.5;
		var curOffsetY = this.parentOffset.y * 0.5;
		while( curParent != undefined && !curParent.textureLoaded ){
			uvReduc *= 0.5;
			curOffsetX = curParent.parentOffset.x * 0.5 + ( curOffsetX * 0.5 );
			curOffsetY = curParent.parentOffset.y * 0.5 + ( curOffsetY * 0.5 );
			curParent = curParent.parentTile;
		}
		if( curParent != undefined ){
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
	}else if( this.textureLoaded ){
		curFace = 0;
		stepUV = 1 / this.detailsSeg;
		for (x = 0; x < this.detailsSeg; x ++) {
			for (y = 0; y < this.detailsSeg; y ++) {
				this.meshe.geometry.faceVertexUvs[0][curFace][0].set((x * stepUV), 1 - ((y + 1) * stepUV));
				this.meshe.geometry.faceVertexUvs[0][curFace][1].set(((x + 1) * stepUV), 1 - (y * stepUV));
				this.meshe.geometry.faceVertexUvs[0][curFace][2].set((x * stepUV), 1 - (y * stepUV));
				curFace ++;
				this.meshe.geometry.faceVertexUvs[0][curFace][0].set((x * stepUV), 1 - ((y + 1) * stepUV));
				this.meshe.geometry.faceVertexUvs[0][curFace][1].set(((x + 1) * stepUV), 1 - ((y + 1) * stepUV));
				this.meshe.geometry.faceVertexUvs[0][curFace][2].set(((x + 1) * stepUV), 1 - (y * stepUV));
				curFace ++;
			}
		}
		this.meshe.geometry.uvsNeedUpdate = true;
	}
}

GeoTile.prototype.makeBorders = function() {
	var b;
	if (this.globe.eleActiv) {
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
		// geoBorders.computeVertexNormals();
		this.mesheBorder = new THREE.Mesh(geoBorders, this.materialBorder);
		this.mesheBorder.matrixAutoUpdate = false;
	}
}


GeoTile.prototype.updateVertex = function() {
	if( this.tile3d != undefined ){
		this.tile3d.hide( true );
	}
	this.globe.meshe.remove( this.meshe );
	this.meshe.geometry.dispose();
	this.makeFace();

	for( var i = 0; i < this.childTiles.length; i ++ ){
		this.childTiles[i].updateVertex();
	}
	OEV.MUST_RENDER = true;
}



GeoTile.prototype.hide = function( _state ) {
	if( _state && this.onStage == true ){
		this.globe.meshe.remove( this.meshe );
		if( !this.textureLoaded ){
			this.globe.tiles2dMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
		}
		if( !this.eleLoaded ){
			this.globe.tilesEledMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
		}
		this.onStage = false;
		this.clearModels();
		if( this.tile3d != undefined ){
			this.tile3d.hide( true );
		}
		for( var i = 0; i < this.datasProviders.length; i ++ ){
			this.datasProviders[i].hideDatas();
		}
		for( var i = 0; i < this.surfacesProviders.length; i ++ ){
			this.surfacesProviders[i].hide( true );
		}
		this.nodesProvider.hide( true );
	}else if( !_state && this.onStage == false ){
		this.globe.meshe.add( this.meshe );
		this.onStage = true;
		this.loadImage();
		this.loadBuildings();
		this.loadEle();
		if( this.tile3d != undefined ){
			this.tile3d.hide( false );
		}
		for( var i = 0; i < this.surfacesProviders.length; i ++ ){
			this.surfacesProviders[i].hide( false );
		}
		this.nodesProvider.hide( false );
		for( var i = 0; i < this.datasProviders.length; i ++ ){
			this.datasProviders[i].drawDatas();
		}
		this.loadNodes();
	}
}

	
	
GeoTile.prototype.clearChildrens = function() {
	if( this.childTiles.length > 0 ){
		for( var i = 0; i < this.childTiles.length; i ++ ){
			this.childTiles[i].dispose();
			this.childTiles[i] = undefined;
		}
		this.childTiles = [];
		this.hide( false );
	}
}


GeoTile.prototype.clearTilesOverzoomed = function() {
	if( ( this.zoom + 1 ) > this.globe.CUR_ZOOM ){
		this.clearChildrens();
	}
}
	

GeoTile.prototype.updateDetails = function() {
	var i;
	var newTile;
	var middleLat;
	var childZoom;
	if (this.checkCameraHover(this.globe.tilesDetailsMarge)) {
		if (this.childTiles.length == 0 && this.zoom < this.globe.CUR_ZOOM) {
			this.childsZoom = this.globe.CUR_ZOOM;
			childZoom = this.zoom + 1;
			newTile = new GeoTile(this.globe, this.tileX * 2, this.tileY * 2, childZoom);
			newTile.parentTile = this;
			newTile.parentOffset = new THREE.Vector2( 0, 0 );
			newTile.makeFace();
			this.childTiles.push(newTile);
			newTile.updateDetails();
			newTile = new GeoTile(this.globe, this.tileX * 2, this.tileY * 2 + 1, childZoom);
			newTile.parentTile = this;
			newTile.parentOffset = new THREE.Vector2( 0, 1 );
			newTile.makeFace();
			this.childTiles.push( newTile );
			newTile.updateDetails();
			newTile = new GeoTile(this.globe, this.tileX * 2 + 1, this.tileY * 2, childZoom);
			newTile.parentTile = this;
			newTile.parentOffset = new THREE.Vector2( 1, 0 );
			newTile.makeFace();
			this.childTiles.push(newTile);
			newTile.updateDetails();
			newTile = new GeoTile(this.globe, this.tileX * 2 + 1, this.tileY * 2 + 1, childZoom);
			newTile.parentTile = this;
			newTile.parentOffset = new THREE.Vector2( 1, 1 );
			newTile.makeFace();
			this.childTiles.push(newTile);
			newTile.updateDetails();
			this.hide( true );
			for (i = 0; i < this.datasProviders.length; i ++ ){
				this.datasProviders[i].passModelsToChilds();
			}
		}else{
			if( this.childTiles.length > 0 && this.childsZoom > this.globe.CUR_ZOOM) {
				this.clearTilesOverzoomed();
			}
			for (i = 0; i < this.childTiles.length; i ++) {
				this.childTiles[i].updateDetails();
			}
		}
	}else{
		this.clearChildrens();
		if( this.zoom + 5 < this.globe.CUR_ZOOM ){
			this.hide( true );
		}else{
			this.hide( false );	
		}
	}
}

GeoTile.prototype.checkCameraHover = function( _marge ) {
	var startLimit = Oev.Utils.tileToCoords( this.tileX - ( _marge - 1 ), this.tileY - ( _marge - 1 ), this.zoom );
	var endLimit = Oev.Utils.tileToCoords( this.tileX + _marge, this.tileY + _marge, this.zoom );
	if( startLimit.x > this.globe.coordDetails.x ){
		return false;
	}
	if( endLimit.x < this.globe.coordDetails.x ){
		return false;
	}
	if( startLimit.y < this.globe.coordDetails.y ){
		return false;
	}
	if( endLimit.y > this.globe.coordDetails.y ){
		return false;
	}
	return true;
}


GeoTile.prototype.passDatasToProvider = function( _name, _datas ) {
	for( var i = 0; i < this.datasProviders.length; i ++ ){
		if( this.datasProviders[i].name == _name ){
			this.datasProviders[i].onDatasLoaded( _datas );
			this.datasProviders[i].drawDatas();
			break;
		}
	}
}

/*
GeoTile.prototype.loadBuildingsTest = function() {
	if( this.globe.loadBuildings ){
		// if( this.onStage && this.zoom >= 16 ){
		if( this.onStage && this.zoom >= 15 ){
			
			if( this.tile3d == undefined ){
				var myParent = this;
				while( myParent.zoom > 15 ){
					myParent = myParent.parentTile;
				}
				// this.tile3d = new Tile3d( this, this.tileX, this.tileY, this.zoom );
				// this.tile3d = new TileBuildings( this, this.tileX, this.tileY, this.zoom );
				this.tile3d = new TileBuildings( this, myParent.tileX, myParent.tileY, myParent.zoom );
				this.tile3d.load();
			}else{
				this.tile3d.hide( false );
			}
		}
	}else if( !this.globe.loadBuildings && this.tile3d != undefined ){
		this.tile3d.dispose();
		this.tile3d = undefined;
		OEV.MUST_RENDER = true;
	}
}
*/

GeoTile.prototype.loadBuildings = function() {
	if( this.globe.loadBuildings ){
		// debug( 'loadBuildings ' + this.zoom + ' / ' + this.onStage );
		if( this.onStage && this.zoom >= 16 ){
		// if( this.onStage && this.zoom >= 15 ){
			if( this.tile3d == undefined ){
				// this.tile3d = new Tile3d( this, this.tileX, this.tileY, this.zoom );
				this.tile3d = new TileBuildings( this, this.tileX, this.tileY, this.zoom );
				this.tile3d.load();
			}else{
				this.tile3d.hide( false );
			}
		}
	}else if( !this.globe.loadBuildings && this.tile3d != undefined ){
		this.tile3d.dispose();
		this.tile3d = undefined;
		OEV.MUST_RENDER = true;
	}
}


GeoTile.prototype.loadLanduse = function() {
	if( this.globe.loadLanduse ){
		// if( this.onStage && this.zoom == 16 ){
		if( this.onStage && this.zoom >= 15 ){
			
			
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
					this.surfacesProviders[i].hide( false );
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
}


GeoTile.prototype.loadLanduseOk = function() {
	if( this.globe.loadLanduse ){
		// if( this.onStage && this.zoom == 16 ){
		if( this.onStage && this.zoom == 15 ){
			if( this.surfacesProviders.length == 0 ){
				var surfA = new TileSurface( this, this.tileX, this.tileY, this.zoom );
				this.surfacesProviders.push( surfA );
				surfA.load();
			}else{
				for( var i = 0; i < this.surfacesProviders.length; i ++ ){
					this.surfacesProviders[i].hide( false );
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
}

GeoTile.prototype.reloadTexture = function() {
	this.textureLoaded = false;
	this.remoteTex = undefined;
	for( var i = 0; i < this.childTiles.length; i ++ ){
		this.childTiles[i].reloadTexture();
	}
	this.loadImage();
}

GeoTile.prototype.setTexture = function( _texture ) {
	// debug( "setTexture" );
	this.textureLoaded = true;
	this.remoteTex = _texture;
	if( this.showWater ){
		this.material.uniforms.tSec.value = _texture;
		this.material.uniforms.tSec.needsUpdate = true;
	}else{
		this.material.map = this.remoteTex;
		this.material.map.anisotropy = 8;
	}
	this.materialBorder.map = this.remoteTex;
	this.mapParentTexture();
	OEV.MUST_RENDER = true;
}

GeoTile.prototype.loadImage = function() {
	if( !this.textureLoaded ){
		this.globe.tiles2dMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.distToCam );
	}else{
		this.setTexture( this.remoteTex );
	}
	
}


GeoTile.prototype.update = function() {
	// var d = new Date();
	// var curTime = d.getTime();
	// debug( 'Geotile.update ' + curTime );
	// this.material.uniforms.time.value = curTime;
	// this.material.uniforms.time.value += 1;
	this.material.uniforms.time.value = ( OEV.globalTime - 1456688420000 ) / 10;
	this.material.uniforms.time.value.needsUpdate = true;
	OEV.MUST_RENDER = true;
}

GeoTile.prototype.makeTextureOverlay = function( _pts, _type ) {
	if( _pts.length > 0 ){
		this.mustUpdate = true;
		OEV.addObjToUpdate( this );
		var pixelWidth = Math.abs( this.startCoord.x - this.endCoord.x );
		var pixelHeight = Math.abs( this.endCoord.y - this.startCoord.y );
		var context1 = this.canvasOverlay.getContext('2d');
		context1.beginPath();
		if( _type == 'vineyard' ){
			context1.fillStyle = '#f00';
		}else{
			context1.fillStyle = '#00f';
		}
		
		context1.moveTo( 256 * ( ( _pts[0][0] - this.startCoord.x ) / pixelWidth ), 256 - ( 256 * ( ( _pts[0][1] - this.endCoord.y ) / pixelHeight ) ) );
		for( var p = 1; p < _pts.length; p ++ ){
			context1.lineTo( 256 * ( ( _pts[p][0] - this.startCoord.x ) / pixelWidth ), 256 - ( 256 * ( ( _pts[p][1] - this.endCoord.y ) / pixelHeight ) ) );
		}
		context1.closePath();
		context1.fill();
		
		this.material.uniforms.tOne.value.needsUpdate = true;
		this.material.uniforms.tOne.needsUpdate = true;
	}
}


GeoTile.prototype.clearModels = function() {
	OEV.scene.remove( this.modelsMeshe );
	for( var objName in this.modelsMesheLib ){
		OEV.scene.remove( this.modelsMesheLib[objName] );
	}
}


GeoTile.prototype.loadNodes = function() {
	if( this.globe.loadNodes ){
		this.nodesProvider.drawDatas();
	}else{
		this.nodesProvider.hide( true );
	}
}
	
GeoTile.prototype.loadModels = function() {
	for( var i = 0; i < this.datasProviders.length; i ++ ){
		this.datasProviders[i].drawDatas();
	}
}


GeoTile.prototype.loadEle = function() {
	if( this.globe.eleActiv && !this.eleLoaded ){
		var nbVertToQuery = 0;
		for( var v = 0; v < this.vertCoords.length; v ++ ){
			var vertCoord = this.vertCoords[v];
			if( vertCoord.y < 60 && vertCoord.y > -50 ){
				nbVertToQuery ++;
			}
		}
		if( nbVertToQuery > 0 ){
			this.globe.tilesEledMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.distToCam );
		}
	}
}



GeoTile.prototype.getElevation = function( _lon, _lat ) {
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
}


GeoTile.prototype.interpolateEle = function( _lon, _lat, _debug ) {
	// console.log('interpolateEle');
	_debug = _debug || false;
	if( this.globe.eleActiv ){
		// get coord percent
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
}

GeoTile.prototype.computeEle = function( _datas ) {
	this.eleLoaded = true;
	if( _datas["RESULT"] != 'OK' ){
		debug( 'Error elevation : ' + _datas["RESULT"] );
	}
	for( var i = 0; i < _datas["ALT"].length; i ++ ){
		var curEle = parseInt( _datas["ALT"][i] );
		if( _datas["ALT"][i] < -999 ){
			curEle = 0;
		}else if( _datas["ALT"][i] > 30000 ){
			debug( 'Ele extreme : ' + _datas["ALT"][i] );
			curEle = 0;
		}
		if( isNaN( curEle ) ){
			debug( this.zoom + '/' + this.tileX + '/' + this.tileY );
			console.log( "NAN curEle : " + _datas["ALT"][i] );
			curEle = 0;
		}
		if( i < this.vertCoords.length ){
			this.vertCoords[i].z = curEle;
		}else{
			console.log( "Error this.vertCoords[" + i + "] DONT EXIST (this.vertCoords.length : " + this.vertCoords.length + ") / _datas[NB] : " + _datas["NB"] + " / _datas[ALT].length : " + _datas["ALT"].length );
		}
	}
	this.updateVertex();
}

GeoTile.prototype.computeEleOk = function( _datas ) {
	this.eleLoaded = true;
	if( _datas["RESULT"] != 'OK' ){
		debug( 'Error elevation : ' + _datas["RESULT"] );
	}
	for( var i = 0; i < _datas["ALT"].length; i ++ ){
		var curEle = parseInt( _datas["ALT"][i]["alt"] );
		if( _datas["ALT"][i]["alt"] < -999 ){
			curEle = 0;
		}else if( _datas["ALT"][i]["alt"] > 30000 ){
			debug( 'Ele extreme : ' + _datas["ALT"][i]["alt"] );
			curEle = 0;
		}
		if( isNaN( curEle ) ){
			debug( this.zoom + '/' + this.tileX + '/' + this.tileY );
			console.log( "NAN curEle : " + _datas["ALT"][i]["alt"] );
			curEle = 0;
		}
		if( i < this.vertCoords.length ){
			this.vertCoords[i].z = curEle;
		}else{
			console.log( "Error this.vertCoords[" + i + "] DONT EXIST (this.vertCoords.length : " + this.vertCoords.length + ") / _datas[NB] : " + _datas["NB"] + " / _datas[ALT].length : " + _datas["ALT"].length );
		}
	}
	this.updateVertex();
}

GeoTile.prototype.calcBBoxCurZoom = function( _bbox ) {
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
}

GeoTile.prototype.dispose = function() {
	this.globe.evt.removeEventListener( "DATAS_TO_LOAD_CHANGED", this, this.loadDatas );
	
	this.clearChildrens();
	this.clearModels();
	this.hide( true );
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
		// this.material.dispose();
		Oev.Cache.freeMaterial(this.material);
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
}


Oev.Cache = (function(){
	var materials = [];
	
	var api = {
		getMaterial : function() {
			if (materials.length == 0) {
				materials.push(new THREE.MeshPhongMaterial( { shininess: 0, color: 0xffffff, map: OEV.textures["checker"] } ));
			}
			return materials.pop();
		}, 
		
		freeMaterial : function(_material) {
			materials.push(_material);
		}, 
	};
	
	return api;
})();

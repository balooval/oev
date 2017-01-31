var GeoTile = function ( _tileX, _tileY, _zoom ) {
	this.onStage = true;
	this.parentTile = undefined;
	this.parentOffset = undefined;
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.zoom = _zoom;
	this.detailsSeg = 1;
	this.childsZoom = _zoom;
	this.childTiles = [];
	this.textureLoaded = false;
	this.eleLoaded = false;
	this.tileLoader = new THREE.TextureLoader();
	this.remoteTex = undefined;
	this.meshe = undefined;
	// this.material = new THREE.MeshBasicMaterial({map: textures["checker"] });
	this.material = new THREE.MeshLambertMaterial( { map: textures["checker"] } );
	
	
	
	this.materialIndex = earth.tilesMaterials.length;
	debug( "this.materialIndex: " + this.materialIndex );
	earth.tilesMaterials.push( new THREE.MeshLambertMaterial( { map: textures["checker"] } ) );
	// earth.tilesMaterials.push( new THREE.MeshBasicMaterial( { map: textures["checker"] } ) );
	
	this.mesheBorder = undefined;
	this.materialBorder = new THREE.MeshBasicMaterial({map: textures["checker"] });
	
	this.startCoord = earth.tileToCoords( this.tileX, this.tileY, this.zoom );
	this.endCoord = earth.tileToCoords( this.tileX + 1, this.tileY + 1, this.zoom );
	this.startLargeCoord = earth.tileToCoords( this.tileX - 1, this.tileY - 1, this.zoom );
	this.endLargeCoord = earth.tileToCoords( this.tileX + 2, this.tileY + 2, this.zoom );
	this.startMidCoord = earth.tileToCoords( this.tileX - 0.5, this.tileY - 0.5, this.zoom );
	this.endMidCoord = earth.tileToCoords( this.tileX + 1.5, this.tileY + 1.5, this.zoom );
	this.middleCoord = new THREE.Vector2( ( this.startCoord.x + this.endCoord.x ) / 2, ( this.startCoord.y + this.endCoord.y ) / 2 );
	
	this.vertCoords = [];
	
	this.myLOD = 0;
	if( this.zoom >= earth.LOD_STREET ){
		this.myLOD = earth.LOD_STREET;
	}else if( this.zoom >= earth.LOD_PLANET ){
		this.myLOD = earth.LOD_PLANET;
	}
	
	var nbTiles = Math.pow( 2, this.zoom );
	this.angleStep = ( 1.0 / nbTiles ) * Math.PI;
	this.angleXStart = this.tileX * ( this.angleStep * 2 );
	this.angleXEnd = ( this.tileX + 1 ) * ( this.angleStep * 2 );
	this.angleYStart = this.tileY * this.angleStep;
	this.angleYEnd = ( this.tileY + 1 ) * this.angleStep;
	
	this.tile3d = undefined;
	
	this.datasProviders = [];
	if( earth.loadModels && this.zoom >= 16 ){
		this.datasProviders.push( new DatasProvider( this, "CAPITELLE" ) );
		this.datasProviders.push( new DatasProvider( this, "TREE" ) );
		this.datasProviders.push( new DatasProvider( this, "LAMP" ) );
		this.datasProviders.push( new DatasProvider( this, "HYDRANT" ) );
	}

	this.distToCam = -1;
}



GeoTile.prototype.debugNbTiles = function( _nb ) {
	_nb += 1;
	for( var i = 0; i < this.childTiles.length; i ++ ){
		_nb = this.childTiles[i].debugNbTiles( _nb );
	}
	return _nb;
}


GeoTile.prototype.makeFace = function() {
	this.distToCam = ( ( earth.camCoords.x - this.middleCoord.x ) * ( earth.camCoords.x - this.middleCoord.x ) + ( earth.camCoords.y - this.middleCoord.y ) * ( earth.camCoords.y - this.middleCoord.y ) );
	if( this.zoom <= 5 && earth.projection == "SPHERE" ){
		this.makeFaceSub( earth.tilesDefinition );
	}else{
		this.makeFaceSub( earth.tilesDefinition );
	}
}


GeoTile.prototype.makeFaceSub = function( _level ) {
	this.detailsSeg = _level;
	// var geometry = earth.mesheTiles.geometry;
	// var geometry = new THREE.Geometry();
	// geometry.faceVertexUvs[0] = [];
	
	if( !this.eleLoaded ){
		this.vertCoords = [];
	}
	
	var nbPrecVert = earth.tilesGeo.vertices.length;
	// debug( "nbPrecVert: " + nbPrecVert );
	
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
			if( earth.eleActiv ){
				if( !this.eleLoaded ){
					if( this.parentTile != undefined ){
						vertEle = this.parentTile.interpolateEle( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ) );
					}
					this.vertCoords[this.vertCoords.length - 1].z = vertEle;
					// this.vertCoords.push( new THREE.Vector3( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ), vertEle ) );
				}else{
					vertEle = this.vertCoords[v].z;
				}
			}
			vect = earth.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ), earth.radius + ( vertEle * ( earth.meter * earth.eleFactor ) ) );
			earth.tilesGeo.vertices.push( vect );
			v ++;
		}
	}
	
	// earth.tilesGeo.faceVertexUvs[this.materialIndex] = [];
	
	for( x = 0; x < this.detailsSeg; x ++ ){
		for( y = 0; y < this.detailsSeg; y ++ ){
			earth.tilesGeo.faces.push( new THREE.Face3( nbPrecVert + ( ( y + 1 ) + ( x * ( this.detailsSeg + 1 ) ) ), nbPrecVert + ( y + ( ( x + 1 ) * ( this.detailsSeg + 1 ) ) ), nbPrecVert + ( y + ( x * ( this.detailsSeg + 1 ) ) ) ) );
			
			earth.tilesGeo.faces[earth.tilesGeo.faces.length - 1].materialIndex = this.materialIndex;
			
			// earth.tilesGeo.faceVertexUvs[this.materialIndex][0] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ), new THREE.Vector2( ( x * stepUV ), 1 - ( y * stepUV ) ) ];
			earth.tilesGeo.faceVertexUvs[0][earth.tilesGeo.faces.length-1] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ), new THREE.Vector2( ( x * stepUV ), 1 - ( y * stepUV ) ) ];
			// earth.tilesGeo.faceVertexUvs[this.materialIndex][earth.tilesGeo.faces.length-1] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ), new THREE.Vector2( ( x * stepUV ), 1 - ( y * stepUV ) ) ];
			
			earth.tilesGeo.faces.push( new THREE.Face3( nbPrecVert + ( ( y + 1 ) + ( x * ( this.detailsSeg + 1 ) ) ), nbPrecVert + ( ( y + 1 ) + ( ( x + 1 ) * ( this.detailsSeg + 1 ) ) ), nbPrecVert + ( y + ( ( x + 1 ) * ( this.detailsSeg + 1 ) ) ) ) );
			
			earth.tilesGeo.faces[earth.tilesGeo.faces.length - 1].materialIndex = this.materialIndex;
			
			// earth.tilesGeo.faceVertexUvs[this.materialIndex][1] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ) ];
			earth.tilesGeo.faceVertexUvs[0][earth.tilesGeo.faces.length-1] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ) ];
			// earth.tilesGeo.faceVertexUvs[this.materialIndex][earth.tilesGeo.faces.length-1] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ) ];
		}
	}
	
	
	earth.tilesGeo.elementsNeedUpdate = true;
	earth.tilesGeo.uvsNeedUpdate = true;
	earth.tilesGeo.verticesNeedUpdate = true;
	earth.tilesGeo.computeFaceNormals();
	earth.mesheTiles.geometry.normalsNeedUpdate = true;
	
	this.loadImage();
	// geometry.mergeVertices()
	// geometry.computeVertexNormals();
	
	// var tmpM = new THREE.Mesh( geometry );
	// tmpM.updateMatrix();
	// earth.mesheTiles.geometry.merge( tmpM.geometry, tmpM.matrix );
	
	// earth.mesheTiles.geometry.verticesNeedUpdate = true;
	// earth.mesheTiles.geometry.elementsNeedUpdate = true;
	// earth.mesheTiles.geometry.normalsNeedUpdate = true;
	
	// debug( "A " + earth.mesheTiles.geometry.faces.length );
	
	/*
	this.makeBorders();
	
	geometry.uvsNeedUpdate = true;
	geometry.computeFaceNormals();
	geometry.mergeVertices()
	geometry.computeVertexNormals();
	this.meshe = new THREE.Mesh( geometry, this.material );
	if( this.mesheBorder != undefined ){
		this.meshe.add( this.mesheBorder );
	}
	
	if( this.onStage ){
		earth.addMeshe( this.meshe );
	}
	
	this.loadImage();
	this.loadEle();
	this.loadBuildings();
	this.loadModels();
	*/
}

/*

GeoTile.prototype.makeFaceSub = function( _level ) {
	this.detailsSeg = _level;
	var geometry = new THREE.Geometry();
	geometry.faceVertexUvs[0] = [];
	if( !this.eleLoaded ){
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
			if( earth.eleActiv ){
				if( !this.eleLoaded ){
					if( this.parentTile != undefined ){
						vertEle = this.parentTile.interpolateEle( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ) );
					}
					this.vertCoords[this.vertCoords.length - 1].z = vertEle;
					// this.vertCoords.push( new THREE.Vector3( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ), vertEle ) );
				}else{
					vertEle = this.vertCoords[v].z;
				}
			}
			vect = earth.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y + ( stepCoord.y * y ), earth.radius + ( vertEle * ( earth.meter * earth.eleFactor ) ) );
			geometry.vertices.push( vect );
			v ++;
		}
	}
	
	for( x = 0; x < this.detailsSeg; x ++ ){
		for( y = 0; y < this.detailsSeg; y ++ ){
			geometry.faces.push( new THREE.Face3( ( y + 1 ) + ( x * ( this.detailsSeg + 1 ) ), y + ( ( x + 1 ) * ( this.detailsSeg + 1 ) ), y + ( x * ( this.detailsSeg + 1 ) ) ) );
			
			geometry.faceVertexUvs[0][( geometry.faces.length - 1 )] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ), new THREE.Vector2( ( x * stepUV ), 1 - ( y * stepUV ) ) ];
			
			geometry.faces.push( new THREE.Face3( ( y + 1 ) + ( x * ( this.detailsSeg + 1 ) ), ( y + 1 ) + ( ( x + 1 ) * ( this.detailsSeg + 1 ) ), y + ( ( x + 1 ) * ( this.detailsSeg + 1 ) ) ) );
			
			geometry.faceVertexUvs[0][( geometry.faces.length - 1 )] = [ new THREE.Vector2( ( x * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( ( y + 1 ) * stepUV ) ), new THREE.Vector2( ( ( x + 1 ) * stepUV ), 1 - ( y * stepUV ) ) ];
		}
	}
	
	this.makeBorders();
	
	geometry.uvsNeedUpdate = true;
	geometry.computeFaceNormals();
	geometry.mergeVertices()
	geometry.computeVertexNormals();
	   
	this.meshe = new THREE.Mesh( geometry, this.material );
	if( this.mesheBorder != undefined ){
		this.meshe.add( this.mesheBorder );
	}
	
	if( this.onStage ){
		earth.addMeshe( this.meshe );
	}
	
	this.loadImage();
	this.loadEle();
	this.loadBuildings();
	this.loadModels();
}
*/

GeoTile.prototype.makeBorders = function() {
	if( earth.eleActiv ){
		if( this.mesheBorder != undefined ){
			this.meshe.remove( this.mesheBorder );
			this.mesheBorder = undefined;
		}
		var stepUV = 1 / this.detailsSeg;
		var stepCoord = new THREE.Vector2( ( this.endCoord.x - this.startCoord.x ) / this.detailsSeg, ( this.endCoord.y - this.startCoord.y ) / this.detailsSeg );
		var geoBorders = new THREE.Geometry();
		geoBorders.faceVertexUvs[0] = [];
		var vertBorder = [];
		var vertUvs = [];
		var vEId;
		for( x = 0; x < ( this.detailsSeg + 1 ); x ++ ){
			vertUvs.push( new THREE.Vector2( x * stepUV, 0 ) );
			vertUvs.push( new THREE.Vector2( x * stepUV, 0 ) );
			vEId = x * ( this.detailsSeg + 1 );
			vertEle = this.vertCoords[vEId].z;
			vect = earth.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y, earth.radius + ( vertEle * ( earth.meter * earth.eleFactor ) )  );
			vertBorder.push( vect );
			vect = earth.coordToXYZ( this.startCoord.x + ( stepCoord.x * x ), this.startCoord.y, earth.radius );
			vertBorder.push( vect );
		}
		for( y = 1; y < this.detailsSeg + 1; y ++ ){
			vertUvs.push( new THREE.Vector2( 0, y * stepUV ) );
			vertUvs.push( new THREE.Vector2( 0, y * stepUV ) );
			
			vEId = y + ( this.detailsSeg ) * ( this.detailsSeg + 1 );
			vertEle = this.vertCoords[vEId].z;
			vect = earth.coordToXYZ( this.startCoord.x + ( stepCoord.x * this.detailsSeg ), this.startCoord.y + ( stepCoord.y * y ), earth.radius + ( vertEle * ( earth.meter * earth.eleFactor ) ) );
			vertBorder.push( vect );
			vect = earth.coordToXYZ( this.startCoord.x + ( stepCoord.x * this.detailsSeg ), this.startCoord.y + ( stepCoord.y * y ), earth.radius );
			vertBorder.push( vect );
		}
		for( x = 1; x < ( this.detailsSeg + 1 ); x ++ ){
			vertUvs.push( new THREE.Vector2( 1 - ( x * stepUV ), 0 ) );
			vertUvs.push( new THREE.Vector2( 1 - ( x * stepUV ), 0 ) );
			
			vEId = (this.detailsSeg + 0) + ( ( this.detailsSeg + 0 ) - x ) * ( this.detailsSeg + 1 );
			vertEle = this.vertCoords[vEId].z;
			vect = earth.coordToXYZ( this.endCoord.x - ( stepCoord.x * x ), this.endCoord.y, earth.radius + ( vertEle * ( earth.meter * earth.eleFactor ) ) );
			vertBorder.push( vect );
			vect = earth.coordToXYZ( this.endCoord.x - ( stepCoord.x * x ), this.endCoord.y, earth.radius );
			vertBorder.push( vect );
		}
		for( y = 1; y < ( this.detailsSeg + 1 ); y ++ ){
			vertUvs.push( new THREE.Vector2( 1, 1 - ( y * stepUV ) ) );
			vertUvs.push( new THREE.Vector2( 1, 1 - ( y * stepUV ) ) );
			vEId = ( ( this.detailsSeg + 0 ) - y ) + ( 0 );
			vertEle = this.vertCoords[vEId].z;
			vect = earth.coordToXYZ( this.startCoord.x, this.endCoord.y - ( stepCoord.y * y ), earth.radius + ( vertEle * ( earth.meter * earth.eleFactor ) ) );
			vertBorder.push( vect );
			vect = earth.coordToXYZ( this.startCoord.x, this.endCoord.y - ( stepCoord.y * y ), earth.radius );
			vertBorder.push( vect );
		}
		
		for( var b = 0; b < vertBorder.length; b ++ ){
			geoBorders.vertices.push( vertBorder[b] );
		}
		for( var b = 0; b < vertBorder.length - 2; b += 2 ){
			var startVertBorderIndex = b;
			geoBorders.faces.push( new THREE.Face3( b + 2, b + 1, b + 0 ) );
			geoBorders.faceVertexUvs[0][( geoBorders.faces.length - 1 )] = [ vertUvs[b+2], vertUvs[b+1], vertUvs[b+0] ];
			geoBorders.faces.push( new THREE.Face3( b + 1, b + 2, b + 3 ) );
			geoBorders.faceVertexUvs[0][( geoBorders.faces.length - 1 )] = [ vertUvs[b+1], vertUvs[b+2], vertUvs[b+3] ];
		}
		geoBorders.uvsNeedUpdate = true;
		geoBorders.computeFaceNormals();
		geoBorders.mergeVertices()
		geoBorders.computeVertexNormals();
		this.mesheBorder = new THREE.Mesh( geoBorders, this.materialBorder );
	}
}


GeoTile.prototype.updateVertex = function() {
	if( earth.curLOD <= this.myLOD ){
		earth.removeMeshe( this.meshe );
		this.makeFace();
	}
	for( var i = 0; i < this.childTiles.length; i ++ ){
		this.childTiles[i].updateVertex();
	}
}



GeoTile.prototype.hide = function( _state ) {
	if( _state && this.onStage == true ){
		// earth.removeMeshe( this.meshe );
		if( !this.textureLoaded ){
			earth.tiles2dMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
		}
		if( !this.eleLoaded ){
			earth.tilesEledMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
		}
		this.onStage = false;
		this.clearModels();
		if( this.tile3d != undefined ){
			this.tile3d.hide( true );
		}
		for( var i = 0; i < this.datasProviders.length; i ++ ){
			this.datasProviders[i].hideDatas();
		}
	}else if( !_state && this.onStage == false ){
		// earth.addMeshe( this.meshe );
		this.onStage = true;
		this.loadImage();
		this.loadEle();
		if( this.tile3d != undefined ){
			this.tile3d.hide( false );
		}
		// this.loadModels();
		for( var i = 0; i < this.datasProviders.length; i ++ ){
			this.datasProviders[i].drawDatas();
		}
	}
}

	
	
GeoTile.prototype.clearChildrens = function() {
	if( this.childTiles.length > 0 ){
		for( var i = 0; i < this.childTiles.length; i ++ ){
			this.childTiles[i].dispose();
		}
		this.childTiles = [];
		this.hide( false );
	}
}



GeoTile.prototype.dispose = function() {
	this.clearChildrens();
	this.clearModels();
	this.hide( true );
	if( this.tile3d != undefined ){
		this.tile3d.dispose();
	}
	for( var i = 0; i < this.datasProviders.length; i ++ ){
		this.datasProviders[i].dispose();
	}
}


GeoTile.prototype.clearTilesOverzoomed = function() {
	if( ( this.zoom + 1 ) > earth.CUR_ZOOM ){
		this.clearChildrens();
	}
}
	

GeoTile.prototype.updateDetails = function() {
	if( this.checkCameraHover( earth.tilesDetailsMarge ) ){
		if( this.childTiles.length == 0 && this.zoom < earth.CUR_ZOOM ){
			this.childsZoom = earth.CUR_ZOOM;
			var childZoom = this.zoom + 1;
			var middleLat = this.angleYStart + ( this.angleYEnd - this.angleYStart ) / 2;
			var middleLon = this.angleXStart + ( this.angleXEnd - this.angleXStart ) / 2;
			var newTile;
			var newTileA = new GeoTile( this.tileX * 2, this.tileY * 2, childZoom );
			newTileA.parentTile = this;
			newTileA.parentOffset = new THREE.Vector2( 0, 0 );
			newTileA.makeFace();
			this.childTiles.push( newTileA );
			newTileA.updateDetails();
			var newTileB = new GeoTile( this.tileX * 2, this.tileY * 2 + 1, childZoom );
			newTileB.parentTile = this;
			newTileB.parentOffset = new THREE.Vector2( 0, 1 );
			newTileB.makeFace();
			this.childTiles.push( newTileB );
			newTileB.updateDetails();
			var newTileC = new GeoTile( this.tileX * 2 + 1, this.tileY * 2, childZoom );
			newTileC.parentTile = this;
			newTileC.parentOffset = new THREE.Vector2( 1, 0 );
			newTileC.makeFace();
			this.childTiles.push( newTileC );
			newTileC.updateDetails();
			var newTileD = new GeoTile( this.tileX * 2 + 1, this.tileY * 2 + 1, childZoom );
			newTileD.parentTile = this;
			newTileD.parentOffset = new THREE.Vector2( 1, 1 );
			newTileD.makeFace();
			this.childTiles.push( newTileD );
			newTileD.updateDetails();
			
			this.hide( true );

			for( var i = 0; i < this.datasProviders.length; i ++ ){
				this.datasProviders[i].passModelsToChilds();
			}
		}else{
			if( this.childTiles.length > 0 && this.childsZoom > earth.CUR_ZOOM ){
				this.clearTilesOverzoomed();
			}
			for( var i = 0; i < this.childTiles.length; i ++ ){
				this.childTiles[i].updateDetails();
			}
		}
	}else{
		this.clearChildrens();
		
		if( this.zoom + 5 < earth.CUR_ZOOM ){
			// debug( "Hide far " + this.zoom );
			this.hide( true );
		}else{
			// debug( "SHOW far " + this.zoom );
			this.hide( false );	
		}
		
	}
}

GeoTile.prototype.checkCameraHover = function( _marge ) {
	var startLimit = earth.tileToCoords( this.tileX - ( _marge - 1 ), this.tileY - ( _marge - 1 ), this.zoom );
	var endLimit = earth.tileToCoords( this.tileX + _marge, this.tileY + _marge, this.zoom );
	if( startLimit.x > earth.camCoords.x ){
		return false;
	}
	if( endLimit.x < earth.camCoords.x ){
		return false;
	}
	if( startLimit.y < earth.camCoords.y ){
		return false;
	}
	if( endLimit.y > earth.camCoords.y ){
		return false;
	}
	return true;
}


GeoTile.prototype.passDatasToProvider = function( _query, _datas ) {
	for( var i = 0; i < this.datasProviders.length; i ++ ){
		if( this.datasProviders[i].query == _query ){
			this.datasProviders[i].onDatasLoaded( _datas );
			this.datasProviders[i].drawDatas();
		}
	}
}


GeoTile.prototype.loadBuildings = function() {
	if( earth.loadBuildings ){
		if( this.onStage && this.zoom >= 17 && this.tile3d == undefined ){
			this.tile3d = new Tile3d( this, this.tileX, this.tileY, this.zoom );
			this.tile3d.load();
		}
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
	this.textureLoaded = true;
	this.remoteTex = _texture;
	// this.material.map = this.remoteTex;
	// this.material.map = this.remoteTex;
	earth.tilesMaterials[this.materialIndex].map = this.remoteTex;
	
	
	this.materialBorder.map = this.remoteTex;
}

GeoTile.prototype.loadImage = function() {
	if( !this.textureLoaded ){
		earth.tiles2dMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.distToCam );
	}else{
		this.setTexture( this.remoteTex );
	}
}


GeoTile.prototype.clearModels = function() {
	scene.remove( this.modelsMeshe );
	for( var objName in this.modelsMesheLib ){
		scene.remove( this.modelsMesheLib[objName] );
	}
}


GeoTile.prototype.loadModels = function() {
	if( this.zoom == 16 ){
		for( var i = 0; i < this.datasProviders.length; i ++ ){
			this.datasProviders[i].drawDatas();
		}
	}
}


GeoTile.prototype.loadEle = function() {
	if( earth.eleActiv && !this.eleLoaded ){
		var nbVertToQuery = 0;
		for( var v = 0; v < this.vertCoords.length; v ++ ){
			var vertCoord = this.vertCoords[v];
			if( vertCoord.y < 60 && vertCoord.y > -50 ){
				nbVertToQuery ++;
			}
		}
		if( nbVertToQuery > 0 ){
			earth.tilesEledMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.distToCam );
		}
	}
}



GeoTile.prototype.getElevation = function( _cX, _cY ) {
	var res = -9999;
	if( this.childTiles.length == 0 ){
		res = this.interpolateEle( _cX, _cY );
	}else{
		for( var i = 0; i < this.childTiles.length; i ++ ){
			var childEle = this.childTiles[i].getElevation( _cX, _cY );
			if( childEle > -9999 ){
				res = childEle;
				break;
			}
		}
	}
	return res;
}


GeoTile.prototype.interpolateEle = function( _cX, _cY, _debug ) {
	_debug = _debug || false;
	if( earth.eleActiv ){
		// get coord percent
		var gapLeft = this.endCoord.x - this.startCoord.x;
		var distFromLeft = _cX - this.startCoord.x;
		var prctLeft = distFromLeft / gapLeft;
		
		var gapTop = this.endCoord.y - this.startCoord.y;
		var distFromTop = _cY - this.startCoord.y;
		var prctTop = distFromTop / gapTop;
		
		// console.log( "prctLeft : " + prctLeft + " / prctTop : " + prctTop );
		
		if( prctLeft < 0 || prctLeft > 1 || prctTop < 0 || prctTop > 1 ){
			if( _debug ){
				console.log( "OUT interpolateEle " + prctLeft + " / " + prctTop );
			}
			return -9999;
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
		var distFromVertLeft = _cX - this.vertCoords[vertLeftTopId].x;
		var prctVertLeft = distFromVertLeft / gapVertLeft;
		var gapVertTop = this.vertCoords[vertLeftBottomId].y - this.vertCoords[vertLeftTopId].y;
		var distFromVertTop = _cY - this.vertCoords[vertLeftTopId].y;
		var prctVertTop = distFromVertTop / gapVertTop;
		
		var eleInterpolTop = this.vertCoords[vertLeftTopId].z + ( ampEleTop * prctVertLeft );
		var eleInterpolBottom = this.vertCoords[vertLeftBottomId].z + ( ampEleTop * prctVertLeft );
		var amplVert = eleInterpolBottom - eleInterpolTop;
		var eleInterpolFinal = eleInterpolTop + ( amplVert * prctVertTop );
		
		if( isNaN( eleInterpolFinal ) ){
			console.log( "NaN eleInterpolFinal : " + vertLeftTopId + " / " + vertRightTopId + " / " + vertLeftBottomId + " / " + vertRightBottomId );
			// console.log( "NaN eleInterpolFinal prctLeft : " + prctLeft + " / prctTop : " + prctTop );
		}
		return eleInterpolFinal;
	}
	return 0;
}


GeoTile.prototype.computeEle = function( _datas ) {
		this.eleLoaded = true;
		for( var i = 0; i < _datas["ALT"].length; i ++ ){
			var curEle = parseInt( _datas["ALT"][i]["alt"] );
			if( _datas["ALT"][i]["alt"] < -999 ){
				curEle = 0;
			}
			if( isNaN( curEle ) ){
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
	if( this.zoom == Math.round( earth.CUR_ZOOM ) ){
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
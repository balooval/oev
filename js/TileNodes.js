var TileNodes = function ( _geoTile ) {
	this.geoTile = _geoTile;
	this.datasLoaded = false;
	this.datasContent = undefined;
	this.meshe = undefined;
	this.meshes = undefined;
	this.onStage = this.geoTile.onStage;
	this.mustUpdate = false;
	this.particules = [];
}

TileNodes.prototype.loadDatas = function() {
	if( OEV.earth.loadNodes && this.onStage && this.geoTile.zoom >= 17 ){
		OEV.earth.nodesLoadManager.getDatas( this, this.geoTile.zoom+'/'+this.geoTile.tileX+'/'+this.geoTile.tileY, this.geoTile.tileX, this.geoTile.tileY, this.geoTile.zoom, this.geoTile.distToCam );
	}
}


TileNodes.prototype.onDatasLoaded = function( _datas ) {
	this.datasLoaded = true;
	this.datasContent = _datas;
	if( this.onStage ){
		this.drawDatas();
	}
}

	

TileNodes.prototype.drawDatas = function() {
	this.onStage = this.geoTile.onStage;
	if( !this.datasLoaded ){
		this.loadDatas();
	}else{
		if( this.meshes == undefined ){
			this.meshes = {};
			var bigGeosTab = new THREE.Geometry();
			
			for( var t = 0; t < this.datasContent["elements"].length; t ++ ){
				
				// debug( 'amenity : ' + this.datasContent["elements"][t]['tags']['amenity'] );
				var tmpBuffGeo;
				var curNodeType = 'none';
				
				if( "amenity" in this.datasContent["elements"][t]['tags'] ){
					if( this.datasContent["elements"][t]['tags']['amenity'] == 'recycling' ){
						curNodeType = 'recycling';
						tmpBuffGeo = OEV.modelsLib["recycling"].geometry.clone();
					}else if( this.datasContent["elements"][t]['tags']['amenity'] == 'fountain' ){
						this.mustUpdate = true;
						curNodeType = 'fountain';
						tmpBuffGeo = OEV.modelsLib["fountain"].geometry.clone();
					}else if( this.datasContent["elements"][t]['tags']['amenity'] == 'waste_basket' ){
						curNodeType = 'poubelle';
						tmpBuffGeo = OEV.modelsLib["poubelle"].geometry.clone();
					}else{
						// curNodeType = 'default';
						// tmpBuffGeo = OEV.modelsLib["LAMP_lod_2"].geometry.clone();
					}
				}else if( "artwork_type" in this.datasContent["elements"][t]['tags'] ){
					curNodeType = 'statue';
					tmpBuffGeo = OEV.modelsLib["statue"].geometry.clone();
				}
				
				if( curNodeType != 'none' ){
				
					if( this.meshes[curNodeType] == undefined ){
						this.meshes[curNodeType] = new THREE.Mesh( new THREE.Geometry(), OEV.earth.modelsMesheMat[curNodeType] );
						this.meshes[curNodeType].receiveShadow = true;
						this.meshes[curNodeType].castShadow = true;
					}
					
					
					var tmpGeo = new THREE.Geometry().fromBufferGeometry( tmpBuffGeo );
					var importMeshe = new THREE.Mesh( tmpGeo );
					
					var lon = this.datasContent["elements"][t]["lon"];
					var lat = this.datasContent["elements"][t]["lat"];
					
					var ele = this.geoTile.interpolateEle( lon, lat, true );
					var pos = OEV.earth.coordToXYZ( lon, lat, ele );
					
					if( curNodeType == 'fountain' ){
						this.particules.push( new Particules( pos ) );
					}
					
					importMeshe.position.x = pos.x;
					importMeshe.position.y = pos.y;
					importMeshe.position.z = pos.z;
					importMeshe.rotation.x = Math.PI;
					importMeshe.rotation.y = Math.random() * 3.14;
					
					var scaleVariation = ( 0.005 + ( 0.005 * ( Math.random() * 0.2 ) ) ) * OEV.earth.globalScale;
					
					importMeshe.scale.x = scaleVariation;
					importMeshe.scale.y = scaleVariation;
					importMeshe.scale.z = scaleVariation;
					importMeshe.updateMatrix();
					this.meshes[curNodeType].geometry.merge( importMeshe.geometry, importMeshe.matrix );
				}
			}
			// bigGeosTab.dynamic = false;
			// this.meshe = new THREE.Mesh( bigGeosTab, OEV.earth.buildingsWallMat );
			// this.meshe.receiveShadow = true;
			// this.meshe.castShadow = true;
			
			if( this.mustUpdate ){
				OEV.addObjToUpdate( this );
			}
		}
		if( this.onStage ){
			for (var key in this.meshes) {
				if (!this.meshes.hasOwnProperty(key)) continue;
				OEV.scene.add( this.meshes[key] );
			}
			OEV.MUST_RENDER = true;
		}
	}
}

TileNodes.prototype.update = function() {
	for( var p = 0; p < this.particules.length; p ++ ){
		this.particules[p].update();
	}
}

TileNodes.prototype.hide = function( _state ) {
	if( _state && this.onStage ){
		this.onStage = false;
		
		if( !this.datasLoaded ){
			OEV.earth.nodesLoadManager.removeWaitingList( this.geoTile.zoom + "/" + this.geoTile.tileX + "/" + this.geoTile.tileY );
		}
		
		for (var key in this.meshes) {
			if (!this.meshes.hasOwnProperty(key)) continue;
			OEV.scene.remove( this.meshes[key] );
		}
		
		if( this.mustUpdate ){
			OEV.removeObjToUpdate( this );
		}
		
		for( var p = 0; p < this.particules.length; p ++ ){
			this.particules[p].hide( true );
		}
		
	}else if( !_state && !this.onStage ){
		this.onStage = true;
		this.drawDatas();
		if( this.mustUpdate ){
			OEV.addObjToUpdate( this );
		}
		for( var p = 0; p < this.particules.length; p ++ ){
			this.particules[p].hide( false );
		}
	}
}

TileNodes.prototype.dispose = function() {
	if( !this.datasLoaded ){
		OEV.earth.nodesLoadManager.removeWaitingList( this.geoTile.zoom + "/" + this.geoTile.tileX + "/" + this.geoTile.tileY );
	}
	this.hide( true );
	OEV.MUST_RENDER = true;
	
	for (var key in this.meshes) {
		if (!this.meshes.hasOwnProperty(key)) continue;
		this.meshes[key].geometry.dispose();
	}
	this.meshes = undefined;
	
	for( var p = 0; p < this.particules.length; p ++ ){
		this.particules[p].dispose();
	}
	this.particules = undefined;
}




var Particules = function ( _pos ) {
	this.onStage = true;
	this.startPos = _pos;
	this.partsSpeed = [];
	this.partsRadialX = [];
	this.partsRadialY = [];
	this.nbPart = 100;
	var partGeo = new THREE.Geometry();
	for( var p = 0; p < this.nbPart; p ++ ){
		partGeo.vertices.push( new THREE.Vector3( this.startPos.x, this.startPos.y, this.startPos.z ) );
		this.partsSpeed.push( ( Math.random() * 0.005 ) + 0.007 );
		this.partsRadialX.push( ( Math.random() * 0.002 ) - 0.001 );
		this.partsRadialY.push( ( Math.random() * 0.002 ) - 0.001 );
	}
	this.partMesh = new THREE.Points( partGeo, OEV.fountainPartMat );
	OEV.scene.add( this.partMesh );
}

Particules.prototype.update = function() {
	for( var p = 0; p < this.nbPart; p ++ ){
		this.partMesh.geometry.vertices[p].x -= this.partsRadialX[p];
		this.partMesh.geometry.vertices[p].z -= this.partsRadialY[p];
		this.partMesh.geometry.vertices[p].y -= this.partsSpeed[p];
		
		this.partsSpeed[p] -= 0.0003;
		
		if( this.partMesh.geometry.vertices[p].y > this.startPos.y ){
		// if( this.partMesh.geometry.vertices[p].y - this.startPos.y < -0.2 ){
			this.partMesh.geometry.vertices[p].x = this.startPos.x;
			this.partMesh.geometry.vertices[p].y = this.startPos.y;
			this.partMesh.geometry.vertices[p].z = this.startPos.z;
			this.partsSpeed[p] = ( Math.random() * 0.005 ) + 0.007;
			this.partsRadialX[p] = ( Math.random() * 0.002 ) - 0.001;
			this.partsRadialY[p] = ( Math.random() * 0.002 ) - 0.001;
		}
	}
	this.partMesh.geometry.verticesNeedUpdate = true;
	OEV.MUST_RENDER = true;
}


Particules.prototype.hide = function( _state ) {
	if( _state && this.onStage ){
		this.onStage = false;
		OEV.scene.remove( this.partMesh );
		
	}else if( !_state && !this.onStage ){
		this.onStage = true;
		OEV.scene.add( this.partMesh );
	}
}

Particules.prototype.dispose = function() {
	this.hide();
	OEV.scene.remove( this.partMesh );
	this.partMesh.geometry.dispose();
	this.partMesh = undefined;
}
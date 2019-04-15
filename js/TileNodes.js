import * as NET_MODELS from './oev/net/NetModels.js';

class TileNodes {
	constructor(_tile) {
		this.tile = _tile;
		this.datasLoaded = false;
		this.datasContent = undefined;
		this.meshe = undefined;
		this.meshes = undefined;
		this.onStage = this.tile.onStage;
		this.mustUpdate = false;
		this.particules = [];
	}

	loadDatas() {
		if (OEV.earth.loadNodes && this.onStage && this.tile.zoom >= 17) {
			OEV.earth.nodesLoadManager.getDatas(this, this.tile.zoom+'/'+this.tile.tileX+'/'+this.tile.tileY, this.tile.tileX, this.tile.tileY, this.tile.zoom, this.tile.distToCam);
		}
	}


	onDatasLoaded( _datas ) {
		this.datasLoaded = true;
		this.datasContent = _datas;
		if( this.onStage ){
			this.drawDatas();
		}
	}

		

	drawDatas() {
		this.onStage = this.tile.onStage;
		if( !this.datasLoaded ){
			this.loadDatas();
		}else{
			if( this.meshes == undefined ){
				this.meshes = {};
				var bigGeosTab = new THREE.Geometry();
				
				for( var t = 0; t < this.datasContent["elements"].length; t ++ ){
					
					// console.log( 'amenity : ' + this.datasContent["elements"][t]['tags']['amenity'] );
					var tmpBuffGeo;
					var curNodeType = 'none';
					
					if( "amenity" in this.datasContent["elements"][t]['tags'] ){
						if( this.datasContent["elements"][t]['tags']['amenity'] == 'recycling' ){
							curNodeType = 'recycling';
							tmpBuffGeo = NET_MODELS.model("recycling").geometry.clone();
						}else if( this.datasContent["elements"][t]['tags']['amenity'] == 'fountain' ){
							this.mustUpdate = true;
							curNodeType = 'fountain';
							tmpBuffGeo = NET_MODELS.model("fountain").geometry.clone();
						}else if( this.datasContent["elements"][t]['tags']['amenity'] == 'waste_basket' ){
							curNodeType = 'poubelle';
							tmpBuffGeo = NET_MODELS.model("poubelle").geometry.clone();
						}else{
							// curNodeType = 'default';
							// tmpBuffGeo = NET_MODELS.model("LAMP_lod_2").geometry.clone();
						}
					}else if( "artwork_type" in this.datasContent["elements"][t]['tags'] ){
						console.log('statue');
						curNodeType = 'statue';
						tmpBuffGeo = NET_MODELS.model("statue").geometry.clone();
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
						
						var ele = this.tile.interpolateEle( lon, lat, true );
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
						this.meshes[curNodeType].geometry.merge(importMeshe.geometry, importMeshe.matrix);
					}
				}
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

	update() {
		for( var p = 0; p < this.particules.length; p ++ ){
			this.particules[p].update();
		}
	}

	hide( _state ) {
		if( _state && this.onStage ){
			this.onStage = false;
			
			if( !this.datasLoaded ){
				OEV.earth.nodesLoadManager.removeWaitingList(this.tile.zoom + "/" + this.tile.tileX + "/" + this.tile.tileY);
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

	dispose() {
		if( !this.datasLoaded ){
			OEV.earth.nodesLoadManager.removeWaitingList(this.tile.zoom + "/" + this.tile.tileX + "/" + this.tile.tileY);
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

export {TileNodes as default}
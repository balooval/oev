var DatasProvider = function(_tile, _name) {
	this.tile = _tile;
	this.datasLoaded = false;
	this.datasContent = undefined;
	this.meshe = undefined;
	this.onStage = this.tile.onStage;
	this.name = _name;
	this.wayPoints = [];
}

DatasProvider.prototype.loadDatas = function() {
	if( this.tile.zoom == OEV.MODELS_CFG[this.name]["ZOOM_MIN"] ){
		OEV.earth.providersLoadManager.getDatas( this, this.tile.zoom+'/'+this.tile.tileX+'/'+this.tile.tileY+'/'+this.name, this.tile.tileX, this.tile.tileY, this.tile.zoom, this.tile.distToCam );
	}
}


DatasProvider.prototype.onDatasLoaded = function( _datas ) {
	this.datasLoaded = true;
	this.datasContent = _datas;
	if( this.onStage ){
		this.drawDatas();
	}else{
		this.passModelsToChilds();
	}
}

	
DatasProvider.prototype.passModelsToChilds = function() {
	var i;
	var e;
	if( this.datasLoaded ){
		for (i = 0; i < this.tile.childTiles.length; i ++) {
			var modelsObj = { "elements" : [] };
			for (e = 0; e < this.datasContent["elements"].length; e ++) {
				var modelLon = this.datasContent["elements"][e]["lon"];
				var modelLat = this.datasContent["elements"][e]["lat"];
				if (this.tile.childTiles[i].startCoord.x < modelLon && this.tile.childTiles[i].endCoord.x >= modelLon && this.tile.childTiles[i].startCoord.y > modelLat && this.tile.childTiles[i].endCoord.y <= modelLat) {
					modelsObj["elements"].push( { "lon" : modelLon, "lat" : modelLat, "tags" : this.datasContent["elements"][e]["tags"] } );
				}
			}
			this.tile.childTiles[i].passDatasToProvider( this.name, modelsObj );
		}
	}
}


DatasProvider.prototype.drawDatas = function() {
	this.onStage = this.tile.onStage;
	if( !this.datasLoaded ){
		this.loadDatas();
	}else{
		if( this.meshe == undefined ){
			var bigGeo = new THREE.Geometry();
			var bigGeosTab = new THREE.Geometry();
			var modelLod = Math.min(2, Math.max(0, (this.tile.zoom - 16)));
			
			for( var t = 0; t < this.datasContent["elements"].length; t ++ ){
				var tmpBuffGeo = OEV.modelsLib[OEV.MODELS_CFG[this.name]["OBJECT"]+"_lod_"+modelLod+""].geometry.clone();
				var tmpGeo = new THREE.Geometry().fromBufferGeometry( tmpBuffGeo );
				var importMeshe = new THREE.Mesh( tmpGeo );
				
				var lon = this.datasContent["elements"][t]["lon"];
				var lat = this.datasContent["elements"][t]["lat"];
				
				if( OEV.MODELS_CFG[this.name]["SHOW_MARKER"] && OEV.MODELS_CFG[this.name]["MARKER"] != 'none' && OEV.MODELS_CFG[this.name]["MARKER"] != 'default' ){
					this.wayPoints.push( new Oev.Navigation.WayPoint(lon, lat, this.tile.zoom, "", 'MARKER_' + OEV.MODELS_CFG[this.name]["NAME"]));
				}
				
				var ele = this.tile.interpolateEle(lon, lat, true);
				var pos = OEV.earth.coordToXYZ(lon, lat, ele);
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
				bigGeosTab.merge( importMeshe.geometry, importMeshe.matrix );
			}
			if( !OEV.earth.modelsMesheMat.hasOwnProperty( this.name ) ){
				OEV.earth.modelsMesheMat[this.name] = new THREE.MeshBasicMaterial({color: 0xFF0000 })
			}
			bigGeosTab.dynamic = false;
			this.meshe = new THREE.Mesh( bigGeosTab, OEV.earth.modelsMesheMat[this.name] );
			this.meshe.receiveShadow = true;
			this.meshe.castShadow = true;
		}
		if( this.onStage ){
			for( var i = 0; i < this.wayPoints.length; i ++ ){
				this.wayPoints[i].hide( false );
			}
			OEV.scene.add( this.meshe );
			OEV.MUST_RENDER = true;
		}else{
			this.passModelsToChilds();
		}
	}
}

DatasProvider.prototype.hideDatas = function() {
	if( this.onStage ){
		this.onStage = false;
		if( this.meshe != undefined ){
			OEV.scene.remove( this.meshe );
		}
		for( var i = 0; i < this.wayPoints.length; i ++ ){
			this.wayPoints[i].hide( true );
		}
	}
}

DatasProvider.prototype.dispose = function() {
	if( !this.datasLoaded ){
		OEV.earth.providersLoadManager.removeWaitingList(this.tile.zoom + "/" + this.tile.tileX + "/" + this.tile.tileY+'/'+this.name);
	}
	for( var i = 0; i < this.wayPoints.length; i ++ ){
		this.wayPoints[i].dispose();
	}
	this.wayPoints = [];
	this.hideDatas();
	OEV.MUST_RENDER = true;
	if( this.meshe != undefined ){
		this.meshe.geometry.dispose();
	}
}
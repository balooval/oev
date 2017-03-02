var Globe = function () {
	this.radius = 10000;
	this.tilesBase = [];
	// this.tiles2dMng = undefined;
	this.meter = this.radius / 40075017.0;
	this.meshe = new THREE.Mesh(new THREE.Geometry());
	this.CUR_ZOOM = 4;
	this.globalScale = 1;
	this.coordDetails = new THREE.Vector2( 0, 0 );
	this.eleActiv = false;
	this.loadBuildings = false;
	this.loadLanduse = false;
	this.LOD_PLANET = 0;
	this.LOD_STREET = 10;
	this.curLOD = this.LOD_PLANET;
	this.curLodOrigine = new THREE.Vector3( 0, 0, 0 );
	this.curTile = new THREE.Vector2( 0, 0, 0 );
	// this.tilesDefinition = 4;
	// this.tilesDefinition = 8;
	this.tilesDefinition = 16;
	this.eleFactor = 1;
	this.coordToXYZ = this.coordToXYZPlane;
	this.nodesLoadManager = new DatasMng( "NODES" );
	this.providersLoadManager = new DatasMng("OBJECTS");
	this.modelsMesheMat = {
		// "TREE":new THREE.MeshLambertMaterial({color: 0xffffff}), 
		"TREE":new THREE.MeshPhongMaterial({color: 0xffffff, shininess: 0}), 
		"LAMP":new THREE.MeshLambertMaterial({color: 0x103c4f }), 
		"HYDRANT":new THREE.MeshLambertMaterial({color: 0x9f0101 }), 
		"CAPITELLE":new THREE.MeshLambertMaterial({color: 0xFF0000 }), 
		"default" : new THREE.MeshLambertMaterial({color: 0xFF0000 }), 
		"fountain" : new THREE.MeshLambertMaterial({color: 0xefeed9 }), 
		"statue" : new THREE.MeshLambertMaterial({color: 0xefeed9 }), 
		"poubelle" : new THREE.MeshLambertMaterial({color: 0x9fc091 }), 
		'recycling' : new THREE.MeshLambertMaterial({color: 0x546e10 })
	};
	this.tilesProvider = "tileOsm";
	this.tilesDetailsMarge = 2;
	this.grassMat = undefined;
	this.vineyardMat = undefined;
	this.forestMat = undefined;
	this.gpxDatas = null;
	this.gpxSpeed = 50;
	this.gpxStep = -1;
	this.gpxCurTime = -1;
	this.gpxStartCoord = new THREE.Vector2( 0, 0 );
	this.gpxDestCoord = new THREE.Vector2( 0, 0 );
	this.gpxTimeout = -1;
	this.gpxMillisStep = -1;
	this.gpxTravelMillis = -1;
	this.evt = new Oev.Utils.Evt();
	
	Oev.DataLoader.Elevation.definition = this.tilesDefinition;
	this.loaderTile2D = new Oev.DataLoader.Proxy('TILE2D');
	this.loaderEle = new Oev.DataLoader.Proxy('ELE');
	this.loaderBuilding = new Oev.DataLoader.Proxy('BUILDINGS');
	this.loaderNormal = new Oev.DataLoader.Proxy('NORMAL');
	this.loaderPlane = new Oev.DataLoader.Proxy('PLANE');
	
	this.coastDatas = null;
	this.coastPxlRatio = 2048 / (20037508 * 2);
	this.loadCoastline();
	
	this.tileExtensions = [];
	this.tileExtensions.push(Oev.Tile.Extension.Normal);
	this.tileExtensions.push(Oev.Tile.Extension.Building);
	this.tileExtensions.push(Oev.Tile.Extension.Planes);
}

Globe.prototype.isCoordOnGround = function(_lon, _lat) {
	if (this.coastDatas === null) {
		return true;
	}
	var mercX = Oev.Geo.mercatorLonToX(_lon);
	var mercY = Oev.Geo.mercatorLatToY(_lat);
	var pxlX = Math.round(mercX * this.coastPxlRatio) + 1024;
	var pxlY = Math.round(mercY * this.coastPxlRatio) + 1024;
	pxlY = Math.abs(2048 - pxlY);
	var bufferIndex = index = (pxlX * 2048 + pxlY);
	// console.log('onGround :', this.coastDatas[bufferIndex]);
}

Globe.prototype.loadCoastline = function() {
	var _self = this;
	var imgCoast = new Image();
	imgCoast.onload = function() {
		_self.onCoastLineLoaded(this);
	};
	imgCoast.src = 'libs/remoteImg.php?coastLine';
}

Globe.prototype.onCoastLineLoaded = function(_img) {
	var imgW = 2048;
	var imgH = 2048;
	var canvas = document.createElement('canvas');
	canvas.width = imgW;
	canvas.height = imgH;
	var context = canvas.getContext('2d');
	context.drawImage(_img, 0, 0, imgW, imgH);
	var img = context.getImageData(0, 0, imgW, imgH); 
	var imageData = context.getImageData(0, 0, imgW, imgH);
	var data = imageData.data;
	this.coastDatas = new Int8Array(data.length / 4);
	var x, y;
	var index;
	var red;
	var isGround;
	var bufferIndex = 0;
	for (x = 0; x < imgW; ++x) {
		for (y = 0; y < imgH; ++y) {
			index = (y * imgW + x) * 4;
			red = data[index];
			isGround = 0;
			if (red > 0) {
				isGround = 1;
			}
			this.coastDatas[bufferIndex] = isGround;
			bufferIndex ++;
		}
	}
	console.log('Coastline parsed');
}

Globe.prototype.addMeshe = function(_meshe) {
	this.meshe.add(_meshe);
}

Globe.prototype.removeMeshe = function(_meshe) {
	this.meshe.remove(_meshe);
}

Globe.prototype.updateTilesModelProvider = function( _added, _name ) {
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		nb = this.tilesBase[i].updateDatasProviders( _added, _name );
	}
}

Globe.prototype.setTilesProvider = function( _provider ) {
	if (this.tilesProvider != _provider) {
		this.loaderTile2D.clear();
		// if (this.tiles2dMng != undefined) {
			// this.tiles2dMng.clearAll();
			for (var i = 0; i < this.tilesBase.length; i ++) {
				this.tilesBase[i].reloadTexture();
			}
		// }
	}
	this.tilesProvider = _provider;
}

Globe.prototype.activLanduse = function( _state ) {
	if( _state && !this.loadLanduse ){
		this.loadLanduse = true;
	}else if( !_state && this.loadLanduse ){
		this.loadLanduse = false;
	}
	this.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
}

Globe.prototype.activNodes = function( _state ) {
	if( _state && !this.loadNodes ){
		this.loadNodes = true;
	}else if( !_state && this.loadNodes ){
		this.loadNodes = false;
	}
	this.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
}

Globe.prototype.activBuildings = function( _state ) {
	if( _state && !this.loadBuildings ){
		this.loadBuildings = true;
	}else if( !_state && this.loadBuildings ){
		this.loadBuildings = false;
	}
	this.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
}

Globe.prototype.activElevation = function( _state ) {
	if( _state && !this.eleActiv ){
		this.eleActiv = true;
	}else if( !_state && this.eleActiv ){
		this.eleActiv = false;
	}
	this.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
}

Globe.prototype.update = function() {
	
}

Globe.prototype.getCurrentBBox = function( _wId ) {
	var bbox = { "left" : this.coordDetails.x, "top" : this.coordDetails.y, "right" : this.coordDetails.x, "bottom" : this.coordDetails.y };
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].calcBBoxCurZoom( bbox );
	}
	return bbox;
}

Globe.prototype.updateLOD = function() {
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].updateVertex();
	}
	for( var w = 0; w < OEV.waypoints.length; w ++ ){
		OEV.waypoints[w].updatePos();
	}
}

Globe.prototype.construct = function() {
	this.setProjection( "PLANE" );
	// this.setProjection( "SPHERE" );
	// this.tiles2dMng = new DatasMng( "TILE2D" );
	// this.tilesModelsMng = new DatasMng( "MODELS" );
	this.tilesBuildingsMng = new DatasMng( "BUILDINGS" );
	this.tilesWeatherMng = new DatasMng( "WEATHER" );
	this.tilesLandusesMng = new DatasMng( "SURFACE" );
	
	// this.modelsMesheMat['TREE'] = new THREE.MeshLambertMaterial({transparent: true, color: 0xFFFFFF, side: THREE.DoubleSide, map: OEV.textures['tree_side'] });
	this.modelsMesheMat['TREE'].map = OEV.textures['tree_procedural'];
	// this.modelsMesheMat['TREE'].normalMap = OEV.textures['normal_foliage'];
	this.modelsMesheMat['TREE'].alphaTest = 0.9;
	this.modelsMesheMat['TREE'].needsUpdate = true;
	
	this.buildingsWallMat = new THREE.MeshPhongMaterial({shininess: 0, color: 0xFFFFFF, side: THREE.DoubleSide, vertexColors: THREE.FaceColors });
	this.buildingsRoofMat = new THREE.MeshPhongMaterial({shininess: 0, color: 0xFFFFFF, side: THREE.DoubleSide, vertexColors: THREE.FaceColors });
	this.testForestMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xFFFFFF, side: THREE.DoubleSide, map: OEV.textures['tree_side'] });
	this.testForestMat.alphaTest = 0.1;
	this.testScrubMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xFFFFFF, side: THREE.DoubleSide, map: OEV.textures['scrub'] });
	this.testScrubMat.alphaTest = 0.1;
	this.forestMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: this.meter * 2000, map: OEV.textures['scrub'] });
	this.forestMat.alphaTest = 0.4;
	this.forestMat.transparent = true;
	this.vineyardMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: this.meter * 1000, map: OEV.textures['vineyard'] });
	this.vineyardMat.alphaTest = 0.4;
	this.vineyardMat.transparent = true;
	this.grassMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: this.meter * 2000, map: OEV.textures['grass'] });
	this.grassMat.alphaTest = 0.4;
	this.grassMat.transparent = true;
	// make faces
	var zoomBase = 4;
	var nbTiles = Math.pow( 2, zoomBase );
	for( var curTileY = 0; curTileY < nbTiles + 1; curTileY ++ ){
		if( curTileY > 0 ){
			for( var curTileX = 0; curTileX < nbTiles + 1; curTileX ++ ){
				if( curTileX > 0 ){
					var tile = new Oev.Tile.Basic( this, curTileX - 1, curTileY - 1, zoomBase );
					this.tilesBase.push(tile);
					tile.makeFace();
				}
			}
		}
	}
	this.matWayPoints = new THREE.SpriteMaterial( { map: OEV.textures['waypoint'], color: 0xffffff, fog: false } );
}


Globe.prototype.updateZoom = function(_value){
	if (this.CUR_ZOOM != _value) {
		this.CUR_ZOOM = _value;
		// document.getElementById("zoom_level").innerHTML = this.CUR_ZOOM + "";
		this.checkLOD();
	}
}

Globe.prototype.switchProjection = function(){
	if( this.projection == "SPHERE" ){
		this.setProjection( "PLANE" );
	}else if( this.projection == "PLANE" ){
		this.setProjection( "SPHERE" );
	}
}

Globe.prototype.setProjection = function( _mode ){
	if( _mode == "PLANE" ){
		Oev.Sky.activAtmosphere( false );
		Oev.Sky.activSky( true );
		this.coordToXYZ = this.coordToXYZPlane;
		OEV.camera.up.set( 0, 0, 1 );
	}else if( _mode == "SPHERE" ){
		Oev.Sky.activAtmosphere( true );
		Oev.Sky.activSky( false );
		this.coordToXYZ = this.coordToXYZSphere;
		OEV.camera.up.set( 0, 1, 0 );
	}
	this.projection = _mode;
	// this.updateCamera();
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].updateVertex();
	}
}


Globe.prototype.coordToXYZPlane = function( _lon, _lat, _elevation ){
	var pos = new THREE.Vector3( 0, 0, 0 );
	pos.x = this.radius * ( _lon / 60 );
	pos.y = this.posFromAltitude( _elevation );

	var tmpZ = Math.log( Math.tan( ( 90 + _lat ) * Math.PI / 360.0 ) ) / ( Math.PI / 180.0 );
    pos.z = ( tmpZ * ( 2 * Math.PI * this.radius / 2.0 ) / 180.0 );
	
	if( this.curLOD == this.LOD_STREET ){
		pos.x -= this.curLodOrigine.x;
		pos.z -= this.curLodOrigine.z;
		pos.x *= this.globalScale;
		pos.y *= this.globalScale;
		pos.z *= this.globalScale;
	}

	return pos;
}


Globe.prototype.coordToXYZSphere = function( lon, lat, _elevation ){
	_elevation *= this.meter;
	_elevation += this.radius;
	var pos = new THREE.Vector3( 0, 0, 0 );
	var radY = Oev.Math.radians( ( lon - 180 ) * -1 );
	var radX =  Oev.Math.radians( lat * -1 );
	pos.x = Math.cos( radY ) * ( ( _elevation ) * Math.cos( radX ) );
	pos.y = Math.sin( radX ) * _elevation * -1;
	pos.z = Math.sin( radY ) * ( _elevation * Math.cos( radX ) );
	if( this.curLOD == this.LOD_STREET ){
		pos.x -= this.curLodOrigine.x;
		pos.y -= this.curLodOrigine.y;
		pos.z -= this.curLodOrigine.z;
		
		pos.x *= this.globalScale;
		pos.y *= this.globalScale;
		pos.z *= this.globalScale;
	}
	return pos;
}


Globe.prototype.posFromAltitude = function( _altitude ) {
	return 0 - (_altitude * (this.meter * this.eleFactor));
}

Globe.prototype.altitudeFromPos = function( _pos ) {
	return ((_pos / this.globalScale) / (this.meter * this.eleFactor)) * -1;
}


Globe.prototype.coordFromPos = function( _x, _y ) {
	var pxlStart = this.coordToXYZ( -180, 85.0511, 0 );
	var pxlEnd = this.coordToXYZ( 180, -85.0511, 0 );
	var pxlWidth = Math.abs( pxlEnd.x - pxlStart.x );
	var pxlHeight = Math.abs( pxlEnd.z - pxlStart.z ) / 2;
	var prctW = ( _x - pxlStart.x ) / pxlWidth;
	var prctH = ( ( _y - pxlEnd.z ) / pxlHeight ) - 1;
	var coordX = -180 + ( prctW * 360 );
	var coordY = ( prctH * 180 );
	coordY = 180 / Math.PI * (2 * Math.atan( Math.exp( coordY * Math.PI / 180.0)) - Math.PI / 2.0);
	var ele = this.getElevationAtCoords( coordX, coordY, true );
	return new THREE.Vector3( coordX, coordY, ele );
}


Globe.prototype.checkLOD = function(){
	if( this.CUR_ZOOM >= this.LOD_STREET ){
		if( this.curLOD != this.LOD_STREET ){
			debug( "SET TO LOD_STREET" );
			this.curLodOrigine = this.coordToXYZ( this.coordDetails.x, this.coordDetails.y, 0 );
			this.globalScale = 10;
			this.curLOD = this.LOD_STREET;
			this.updateLOD();
			this.setProjection( "PLANE" );
			OEV.camera.far = this.radius * this.globalScale;
			OEV.camera.near = ( this.radius * this.globalScale ) / 1000000;
			OEV.camera.updateProjectionMatrix();
			Oev.Sky.initSunPos();
			if( OEV.scene.fog ){
				OEV.scene.fog.near = this.radius * ( 0.01 * this.globalScale );
				OEV.scene.fog.far = this.radius * ( 0.9 * this.globalScale );
			}
			this.evt.fireEvent( "LOD_CHANGED" );
			Oev.Sky.updateCloudsPos();
			return true;
		}
	}else if( this.CUR_ZOOM >= this.LOD_PLANET ){
		if( this.curLOD != this.LOD_PLANET ){
			debug( "SET TO LOD_PLANET" );
			this.curLodOrigine = new THREE.Vector3( 0, 0, 0 );
			this.globalScale = 1;
			this.curLOD = this.LOD_PLANET;
			this.updateLOD();
			this.setProjection( "SPHERE" );
			OEV.camera.far = ( this.radius * 2 ) * this.globalScale;
			OEV.camera.near = ( this.radius * this.globalScale ) / 1000000;
			OEV.camera.updateProjectionMatrix();
			Oev.Sky.initSunPos();
			if( OEV.scene.fog ){
				OEV.scene.fog.near = this.radius * ( 0.01 * this.globalScale );
				OEV.scene.fog.far = this.radius * ( 0.9 * this.globalScale );
			}
			this.evt.fireEvent( "LOD_CHANGED" );
			Oev.Sky.updateCloudsPos();
			return true;
		}
	}
	this.meter = (this.radius / 40075017.0) * this.globalScale;
	return false;
}

Globe.prototype.getElevationAtCoords = function( _lon, _lat, _inMeters ){
	_inMeters = _inMeters || false;
	if( this.eleActiv ){
		for( var i = 0; i < this.tilesBase.length; i ++ ){
			var tile = this.tilesBase[i];
			if( tile.checkCameraHover( 1 ) ){
				var ele = tile.getElevation( _lon, _lat );
				if( _inMeters ){
					return ele;
				}else{
					return ele * ( this.meter * this.eleFactor );
				}
				// break;
			}
		}
	}
	return 0;
}



Globe.prototype.onCurTileChange = function( _newTile ){
	this.curTile = _newTile;
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].updateDetails();
	}
	this.evt.fireEvent( "CURTILE_CHANGED" );
}


Globe.prototype.updateCurTile = function( _coordX, _coordY ){
	this.coordDetails.x = _coordX;
	this.coordDetails.y = _coordY;
	var newTile = Oev.Geo.coordsToTile( this.coordDetails.x, this.coordDetails.y, this.CUR_ZOOM );
	if( newTile.x != this.curTile.x || newTile.y != this.curTile.y || newTile.z != this.curTile.z ){
		this.onCurTileChange( newTile );
	}
	this.curTile = newTile;
}


Globe.prototype.zoomFromAltitude = function( _altitude ) { // _altitude : meters units
	return Oev.Geo.zoomFromAltitude(_altitude, this.radius, this.globalScale);
}


Globe.prototype.zoomFromAltitudeTest = function( _altitude ) { // _altitude : meters units
	var nbTilesToDraw = 4;
	var groundMeterWidth = _altitude;
	var tileMeterWidth = groundMeterWidth / nbTilesToDraw;
	var z = 1;
	var meterByPixel = 78 * 256;
	while( meterByPixel > tileMeterWidth ){
		z ++;
		meterByPixel /= 2;
	}
	// debug( '_altitude : ' + _altitude );
	// debug( 'z : ' + z );
	// debug( 'meterByPixel : ' + meterByPixel );
	// debug( '' );
	// return z + 6;
	return Math.min( Math.max( z + 6 ), 19 );
}


Globe.prototype.altitude = function( _zoomlevel ) { // return altitude in opengl unit
	return Oev.Geo.getAltitude(_zoomlevel, this.radius);
}


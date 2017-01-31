var Globe = function () {
	// this.radius = 20000;
	this.radius = 10000;
	this.tilesBase = [];
	this.tiles2dMng = undefined;
	this.tilesEledMng = undefined;
	this.meter = this.radius / 6371000.0;
	this.meshe = new THREE.Mesh( new THREE.Geometry() );
	// this.mesheTiles = new THREE.Mesh( new THREE.Geometry(), new THREE.MeshBasicMaterial({color: 0xFF0000, side: THREE.DoubleSide, wireframe : false }) );
	this.mesheTiles = undefined;
	this.tilesGeo = undefined;
	this.zoomBase = 4;
	this.CUR_ZOOM = 4;
	this.globalScale = 1;
	
	this.eleActiv = false;
	this.loadModels = false;
	this.loadBuildings = false;
	
	this.travelToWaypoint = -1;
	this.destZoom = this.CUR_ZOOM;
	this.destCoord = new THREE.Vector2( 0, 0 );
	this.travelStep = new THREE.Vector2( 0, 0 );
	this.destHeading = new THREE.Vector2( 0, 0 );
	
	this.camAltitude = this.radius * 2;
	this.camPosTarget = new THREE.Vector3( 0, 0, 0 );
	this.camCoords = new THREE.Vector3( 4.1862, 43.7682, 0 );
	this.camCoordsTarget = new THREE.Vector3( 0, 0, 0 );
	this.LOD_PLANET = 0;
	this.LOD_STREET = 10;
	this.curLOD = this.LOD_PLANET;
	this.curLodOrigine = new THREE.Vector3( 0, 0, 0 );
	this.camRotAngle = new THREE.Vector2( Math.PI, 0.2 );
	
	// this.tilesDefinition = 2;
	this.tilesDefinition = 4;
	// this.tilesDefinition = 8;
	this.eleFactor = 2;
	this.curEle = 0;
	
	this.wayPoints = [];
	this.playingWP = false;
	
	this.curTile = new THREE.Vector2( 0, 0, 0 );
	this.updateCurTile();
	
	this.providersLoadManagers = {};
	this.modelsMesheMat = {"TREE":new THREE.MeshBasicMaterial({color: 0x678713 }), "LAMP":new THREE.MeshBasicMaterial({color: 0x103c4f }), "HYDRANT":new THREE.MeshBasicMaterial({color: 0x9f0101 }), "CAPITELLE":new THREE.MeshBasicMaterial({color: 0xFF0000 })};
	
	this.tilesProvider = "tileOsm";
	// this.tilesProvider = "tileMapbox";
	
	this.tilesDetailsMarge = 2;
	
	scene.add( this.meshe );
	
	
	this.tilesMaterials = [];

}


Globe.prototype.debugNbTiles = function() {
	var nb = 0;
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		nb = this.tilesBase[i].debugNbTiles( nb );
	}
	debug( "debugNbTiles : " + nb );
}



Globe.prototype.configure = function( _params ) {
	this.eleActiv = _params['load_ele'];
	this.loadModels = _params['load_models'];
	this.loadBuildings = _params['load_buildings'];
	this.tilesDefinition = _params['tile_res'];
}


Globe.prototype.setTilesProvider = function( _provider ) {
	if( this.tilesProvider != _provider ){
		// debug( "setTilesProvider UPDATED" );
		if( this.tiles2dMng != undefined ){
			this.tiles2dMng.clearAll();
			for( var i = 0; i < this.tilesBase.length; i ++ ){
				this.tilesBase[i].reloadTexture();
			}
		}
	}
	this.tilesProvider = _provider;
}

Globe.prototype.activModels = function( _state ) {
	if( _state && !this.loadModels ){
		this.loadModels = true;
	}else if( !_state && this.loadModels ){
		this.loadModels = false;
	}
}

Globe.prototype.activBuildings = function( _state ) {
	if( _state && !this.loadBuildings ){
		this.loadBuildings = true;
	}else if( !_state && this.loadBuildings ){
		this.loadBuildings = false;
	}
}

Globe.prototype.activElevation = function( _state ) {
	if( _state && !this.eleActiv ){
		this.eleActiv = true;
	}else if( !_state && this.eleActiv ){
		this.eleActiv = false;
	}
}


Globe.prototype.drawGpx = function( _state ) {
	var url = DEV+"libs/remoteImg.php?gpx=1&name=test";
	var ajaxMng = new AjaxMng( url, {}, function( res, _params ){
		var jsonDatas = JSON.parse( res );
		
		var lineGeo = new THREE.Geometry();
		
		for( var i = 0; i < jsonDatas.length; i ++ ){
			var ele = earth.getElevationAtCoords( parseFloat( jsonDatas[i]["lon"]["0"] ), parseFloat( jsonDatas[i]["lat"]["0"] ) );
			ele += earth.meter * 2;
			var pos = earth.coordToXYZ( parseFloat( jsonDatas[i]["lon"]["0"] ), parseFloat( jsonDatas[i]["lat"]["0"] ), earth.radius + ele );
			lineGeo.vertices.push(
				new THREE.Vector3( pos.x, pos.y, pos.z )
			);
		}
		var line = new THREE.Line( lineGeo, new THREE.LineBasicMaterial({color: 0xFF0000}) );
		scene.add( line );
	});
}


Globe.prototype.update = function() {
	// debug( "globe.update : " + Math.abs( this.destZoom - this.CUR_ZOOM ), true );
	if( Math.abs( this.destZoom - this.CUR_ZOOM ) > 0.1 ){
		var zoomStep = 0;
		if( this.destZoom < this.CUR_ZOOM ){
			zoomStep = -0.1;
		}else{
			zoomStep = 0.1;
		}
		this.varyZoom( zoomStep );
	}else if( this.travelToWaypoint >= 0 ){
		console.log( "travelToWaypoint : " + this.travelToWaypoint );
		var distA = Math.sqrt( ( this.camCoords.x - this.wayPoints[this.travelToWaypoint].lon ) * ( this.camCoords.x - this.wayPoints[this.travelToWaypoint].lon ) + ( this.camCoords.y - this.wayPoints[this.travelToWaypoint].lat ) * ( this.camCoordsTarget.y - this.wayPoints[this.travelToWaypoint].lat ) );
		this.camCoords.x -= this.travelStep.x;
		this.camCoords.y -= this.travelStep.y;
		var distB = Math.sqrt( ( this.camCoords.x - this.wayPoints[this.travelToWaypoint].lon ) * ( this.camCoords.x - this.wayPoints[this.travelToWaypoint].lon ) + ( this.camCoords.y - this.wayPoints[this.travelToWaypoint].lat ) * ( this.camCoordsTarget.y - this.wayPoints[this.travelToWaypoint].lat ) );
		if( distB > distA ){
			console.log( "distB > distA" );
			this.camCoords.x = this.wayPoints[this.travelToWaypoint].lon;
			this.camCoords.y = this.wayPoints[this.travelToWaypoint].lat;
			this.destZoom = this.wayPoints[this.travelToWaypoint].zoom;
			console.log( "STOP travelToWaypoint" );
			if( this.playingWP ){
				console.log( "this.playingWP" );
				if( this.travelToWaypoint < this.wayPoints.length - 1 ){
					this.gotoWaypoint( this.travelToWaypoint + 1 );
				}else{
					this.travelToWaypoint = -1;
				}
			}else{
				this.travelToWaypoint = -1;
			}
		}
		this.updateCamera();
			
	}
}


Globe.prototype.getCurrentBBox = function( _wId ) {
	var bbox = { "left" : this.camCoords.x, "top" : this.camCoords.y, "right" : this.camCoords.x, "bottom" : this.camCoords.y };
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].calcBBoxCurZoom( bbox );
	}
	// debug( "bbox: " + bbox["left"] + " / " + bbox["top"] + " / " + bbox["right"] + " / " + bbox["bottom"] );
	return bbox;
}


Globe.prototype.play = function( _wId ) {
	/*
	console.log( "play " + this.wayPoints.length );
	this.playingWP = true;
	if( this.wayPoints.length > 0 ){
		this.gotoWaypoint( 0 );
	}
	*/
}


Globe.prototype.removeWaypoint = function( _wId ) {
	this.wayPoints[_wId].dispose();
	this.wayPoints.splice( _wId, 1 );
	updateWaypointsList( this.wayPoints );
}

Globe.prototype.gotoWaypoint = function( _wId ) {
	var dist = Math.sqrt( ( this.camCoords.x - this.wayPoints[_wId].lon ) * ( this.camCoords.x - this.wayPoints[_wId].lon ) + ( this.camCoords.y - this.wayPoints[_wId].lat ) * ( this.camCoords.y - this.wayPoints[_wId].lat ) );
	
	if( dist > 0.05 ){
		var travelZoom = Math.max( 4, Math.min( this.CUR_ZOOM, Math.round( ( ( this.radius / dist ) / ( this.radius ) ) * 18 ) - 3 ) );
		this.destZoom = travelZoom;
		this.travelStep.x = ( ( this.camCoords.x - this.wayPoints[_wId].lon ) / dist ) / ( 10 * this.destZoom );
		this.travelStep.y = ( ( this.camCoords.y - this.wayPoints[_wId].lat ) / dist ) / ( 10 * this.destZoom );
		// console.log( "this.travelStep.x : " + this.travelStep.x + " / this.travelStep.y : " + this.travelStep.y + " / " + ( this.travelStep.x + this.travelStep.y ) );
		this.travelToWaypoint = _wId;
	}else{
		// console.log( "dist: " + dist );
	}
	
}

Globe.prototype.saveWayPoints = function( _lon, _lat, _zoom, _name ) {
	_name = _name || "WP " + this.wayPoints.length;
	this.wayPoints.push( new WayPoint( _lon, _lat, _zoom, _name ) );
	updateWaypointsList( this.wayPoints );
}


Globe.prototype.updateLOD = function() {
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].updateVertex();
	}
}


Globe.prototype.onAllDatasLoaded = function() {
	/*
	if( this.tilesDetailsMarge == 2 ){
		var allLoaded = true;
		if( this.tiles2dMng.datasWaiting.length > 0 ){
			allLoaded = false;
		}
		if( this.tilesEledMng.datasWaiting.length > 0 ){
			allLoaded = false;
		}
		if( this.tilesModelsMng.datasWaiting.length > 0 ){
			allLoaded = false;
		}
		if( this.tilesBuildingsMng.datasWaiting.length > 0 ){
			allLoaded = false;
		}
		if( allLoaded ){
			// debug( "onAllDatasLoaded All loaded" );
			this.tilesDetailsMarge = 3;
			for( var i = 0; i < this.tilesBase.length; i ++ ){
				this.tilesBase[i].updateDetails();
			}
			this.tilesDetailsMarge = 2;
		}
	}
	*/
}


Globe.prototype.construct = function() {
	// this.setProjection( "SPHERE" );
	this.setProjection( "PLANE" );
	
	this.tiles2dMng = new DatasMng( "TILE2D" );
	this.tilesEledMng = new DatasMng( "ELE" );
	this.tilesModelsMng = new DatasMng( "MODELS" );
	this.tilesBuildingsMng = new DatasMng( "BUILDINGS" );
	
	this.buildingsWallMat = new THREE.MeshBasicMaterial({color: 0xa39d97, side: THREE.DoubleSide, map:textures['building_wall'] });
	// this.buildingsWallMat = new THREE.MeshBasicMaterial({color: 0xa39d97, side: THREE.DoubleSide, map:textures['checker_alpha'] });
	
	// make faces
	this.tilesGeo = new THREE.Geometry();
	this.tilesGeo.faceVertexUvs[0] = [];
	
	var nbTiles = Math.pow( 2, this.zoomBase );
	for( var curTileY = 0; curTileY < nbTiles + 1; curTileY ++ ){
		if( curTileY > 0 ){
			for( var curTileX = 0; curTileX < nbTiles + 1; curTileX ++ ){
				if( curTileX > 0 ){
					var geoTile = new GeoTile( curTileX - 1, curTileY - 1, this.zoomBase );
					this.tilesBase.push( geoTile );
					geoTile.makeFace();
				}
			}
		}
	}
	
	if( this.mesheTiles != undefined ){
		scene.remove( this.mesheTiles );
	}
	this.mesheTiles = new THREE.Mesh( this.tilesGeo, new THREE.MeshFaceMaterial(this.tilesMaterials) );
	scene.add( this.mesheTiles );
	
	
	
	// default waypoints
	this.matWayPoints = new THREE.SpriteMaterial( { map: textures['waypoint'], color: 0xffffff, fog: false } );
	// this.saveWayPoints( 4.17649, 43.73853, 13, "Home" );
	this.saveWayPoints( 3.7327755, 43.791441, 13, "Saint-Martin de L." );
	this.saveWayPoints( 3.854188, 43.958125, 13, "Cevennes" );
	this.saveWayPoints( 2.383138,48.880945, 13, "Paris" );
	
}


Globe.prototype.addMeshe = function( _meshe ) {
	this.meshe.add( _meshe );
}

Globe.prototype.removeMeshe = function( _meshe ) {
	this.meshe.remove( _meshe );
}






Globe.prototype.addZoom = function( _value ){
	this.destZoom += _value;
}


Globe.prototype.varyZoom = function( _value ){
	this.CUR_ZOOM += _value;
	
	if( Math.abs( this.destZoom - this.CUR_ZOOM ) < Math.abs( _value ) ){
		this.CUR_ZOOM = this.destZoom;
	}
	
	
	if( this.CUR_ZOOM < 3 ){
		this.destZoom = this.CUR_ZOOM;
		this.CUR_ZOOM = 3;
	}
	if( this.CUR_ZOOM > 19 ){
		this.destZoom = this.CUR_ZOOM;
		this.CUR_ZOOM = 19;
	}
	document.getElementById( "zoom_level" ).innerHTML = this.CUR_ZOOM + "";
	earth.updateCamera();
	earth.checkLOD();
	
	var wpScale = ( this.camAltitude / this.radius ) * 1000;
	for( var w = 0; w < this.wayPoints.length; w ++ ){
		this.wayPoints[w].resize( wpScale );
	}
}


Globe.prototype.setProjection = function( _mode ){
	if( _mode == "PLANE" ){
		activAtmosphere( false );
		activSky( true );
		this.coordToXYZ = this.coordToXYZPlane;
		camera.up.set( 0, 0, 1 );
	}else if( _mode == "SPHERE" ){
		activAtmosphere( true );
		activSky( false );
		this.coordToXYZ = this.coordToXYZSphere;
		camera.up.set( 0, 1, 0 );
	}
	this.projection = _mode;
	this.updateCamera();
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].updateVertex();
	}
	onChangeProjection( this.projection );
}

Globe.prototype.switchProjection = function(){
	if( this.projection == "SPHERE" ){
		this.setProjection( "PLANE" );
	}else if( this.projection == "PLANE" ){
		this.setProjection( "SPHERE" );
	}
}


Globe.prototype.coordToXYZSphere = function( lon, lat, _radius ){
	var pos = new THREE.Vector3( 0, 0, 0 );
	var radY = radians( ( lon - 180 ) * -1 );
	var radX =  radians( lat * -1 );
	pos.x = Math.cos( radY ) * ( ( _radius ) * Math.cos( radX ) );
	pos.y = Math.sin( radX ) * _radius * -1;
	pos.z = Math.sin( radY ) * ( _radius * Math.cos( radX ) );
	
	if( this.curLOD == this.LOD_STREET ){
		pos.x -= this.curLodOrigine.x;
		pos.y -= this.curLodOrigine.y;
		pos.z -= this.curLodOrigine.z;
		// pos.mult( 10 );
	}
	return pos;
}


Globe.prototype.coordToXYZPlane = function( _lon, _lat, _radius ){
	var pos = new THREE.Vector3( 0, 0, 0 );
	pos.x = this.radius * ( _lon / 60 );
	pos.y = 0 - _radius; // OK
	// pos.y = ( _radius - this.radius ) * -1;
	var radY = radians( _lat );
	var tmp = Math.log( Math.tan( radY / 2 + Math.PI / 4 ) );
	pos.z = ( this.radius * tmp );
	
	
	if( this.curLOD == this.LOD_STREET ){
		pos.x -= this.curLodOrigine.x;
		// pos.y -= this.curLodOrigine.y;
		pos.z -= this.curLodOrigine.z;
		pos.x *= this.globalScale;
		pos.y *= this.globalScale;
		pos.z *= this.globalScale;
	}

	return pos;
}


Globe.prototype.checkLOD = function(){
	if( this.CUR_ZOOM >= this.LOD_STREET ){
		if( this.curLOD != this.LOD_STREET ){
			console.log( "SET TO LOD_STREET" );
			this.curLodOrigine = this.coordToXYZ( this.camCoords.x, this.camCoords.y, this.radius );
			this.globalScale = 100;
			// this.globalScale = 1;
			this.curLOD = this.LOD_STREET;
			this.updateLOD();
			this.updateCamera();
		}
	}else if( this.CUR_ZOOM >= this.LOD_PLANET ){
		if( this.curLOD != this.LOD_PLANET ){
			console.log( "SET TO LOD_PLANET" );
			this.curLodOrigine = new THREE.Vector3( 0, 0, 0 );
			this.globalScale = 1;
			this.curLOD = this.LOD_PLANET;
			this.updateLOD();
			this.updateCamera();
		}
	}
}


Globe.prototype.rotateCamera = function() {
	if( this.projection == "PLANE" ){
		this.camRotAngle.x += ( mouseX - lastMouseX ) / 100.0;
		this.camRotAngle.y += ( mouseY - lastMouseY ) / 100.0;
		this.updateCameraHeading();
	}
}


Globe.prototype.updateCameraHeading = function() {
	if( this.camRotAngle.x > Math.PI ){
		this.camRotAngle.x = 0 - this.camRotAngle.x;
	}else if( this.camRotAngle.x < -Math.PI ){
		this.camRotAngle.x = this.camRotAngle.x + ( Math.PI * 2 );
	}
	this.camRotAngle.y = Math.min( Math.max( this.camRotAngle.y, 0.2 ), 1.5 );
	
	var orbitRadius = Math.sin( this.camRotAngle.y ) * ( this.camAltitude );
	var camPosition = new THREE.Vector3( 0, 0, 0 );
	camPosition.x = this.camPosTarget.x + Math.sin( this.camRotAngle.x ) * orbitRadius;
	camPosition.z = this.camPosTarget.z + Math.cos( this.camRotAngle.x ) * orbitRadius;
	camPosition.y = this.camPosTarget.y - Math.cos( this.camRotAngle.y ) * ( this.camAltitude );
	camera.up.set( 0, -1, 0 );
	camera.position.x = camPosition.x;
	camera.position.y = camPosition.y;
	camera.position.z = camPosition.z;
	camera.lookAt( this.camPosTarget );
	
	
	document.getElementById("camHeading").style.transform = "rotate("+( 180 + ( 180 * this.camRotAngle.x / Math.PI ) )+"deg)";
}


Globe.prototype.dragCamera = function() {
	this.travelToWaypoint = -1;
	this.destZoom = this.CUR_ZOOM;
	var depX = ( mouseX - lastMouseX ) / Math.pow( 2.0, this.CUR_ZOOM );
	var depY = ( mouseY - lastMouseY ) / Math.pow( 2.0, this.CUR_ZOOM );
	if( this.projection == "SPHERE" ){
		this.camCoords.x -= depX;
		this.camCoords.y += depY;
	}else if( this.projection == "PLANE" ){
		this.camCoords.x += depX * Math.cos( this.camRotAngle.x ) - depY * Math.sin( this.camRotAngle.x );
		this.camCoords.y -= depY * Math.cos( this.camRotAngle.x ) + depX * Math.sin( this.camRotAngle.x );
	}
	if( this.camCoords.x > 180 ){
		this.camCoords.x = this.camCoords.x - 360;
	}else if( this.camCoords.x < -180 ){
		this.camCoords.x = this.camCoords.x + 360;
	}
	this.updateCamera();
}


Globe.prototype.updateCamera = function() {
	this.getCamElevation();
	this.updateCurTile();
	// console.log( "this.curTile: " + this.curTile.x + " / " + this.curTile.y + " / " + this.curTile.z );
	this.camAltitude = this.altitude( this.CUR_ZOOM );
	
	this.camAltitude *= this.globalScale;
	
	var camPosition = this.coordToXYZ( this.camCoords.x, this.camCoords.y, this.radius + this.camAltitude + this.curEle );
	camera.position.x = camPosition.x;
	camera.position.y = camPosition.y;
	camera.position.z = camPosition.z;
	this.camCoordsTarget.x = this.camCoords.x;
	this.camCoordsTarget.y = this.camCoords.y;
	this.camPosTarget = this.coordToXYZ( this.camCoordsTarget.x, this.camCoordsTarget.y, this.radius + this.curEle );
	camera.lookAt( this.camPosTarget );
	// camera.near = this.camAltitude / 10;
	// camera.far = this.camAltitude * 10;
	
	
	var skyScale = ( this.camAltitude / this.radius ) * 15;
	skyScale = Math.min( Math.max( skyScale, 0.04 ), 1.8 );
	if( skyDome != undefined ){
		skyDome.position.x = this.camPosTarget.x;
		skyDome.position.y = this.camPosTarget.y;
		skyDome.position.z = this.camPosTarget.z;
		skyDome.scale.set( skyScale, skyScale, skyScale );
	}
	if( sun != undefined ){
		sun.target.position.set( camPosition.x, camPosition.y, camPosition.z );
	}
	if( scene.fog ){
		scene.fog.near = ( this.radius * 0.3 ) * skyScale;
		scene.fog.far = ( this.radius * 0.8 ) * skyScale;
	}
	if( this.projection == "PLANE" ){
		this.updateCameraHeading();
	}
}


Globe.prototype.getElevationAtCoords = function( _lon, _lat ){
	if( this.eleActiv ){
		for( var i = 0; i < this.tilesBase.length; i ++ ){
			var tile = this.tilesBase[i];
			// if( tile.checkCameraHover( tile.startCoord, tile.endCoord ) ){
			if( tile.checkCameraHover( 1 ) ){
				return tile.getElevation( this.camCoords.x, this.camCoords.y )  * ( this.meter * this.eleFactor );
				break;
			}
		}
	}
	return 0;
}


Globe.prototype.getCamElevation = function(){
	this.curEle = this.getElevationAtCoords( this.camCoords.x, this.camCoords.y );
	
	if( geoDebug != undefined ){
		var debugPosition = this.coordToXYZ( this.camCoords.x, this.camCoords.y, this.radius + this.curEle );
		geoDebug.position.x = debugPosition.x;
		geoDebug.position.y = debugPosition.y;
		geoDebug.position.z = debugPosition.z;
		
		var wpScale = ( this.camAltitude / this.radius ) * 1000;
		geoDebug.scale.x = wpScale;
		geoDebug.scale.y = wpScale;
		geoDebug.scale.z = wpScale;
	}
}


Globe.prototype.onCurTileChange = function( _newTile ){
	this.tilesGeo = new THREE.Geometry();
	this.tilesGeo.faceVertexUvs[0] = [];
	this.curTile = _newTile;
	for( var i = 0; i < this.tilesBase.length; i ++ ){
		this.tilesBase[i].updateDetails();
	}
	
	if( this.mesheTiles != undefined ){
		scene.remove( this.mesheTiles );
	}
	this.mesheTiles = new THREE.Mesh( this.tilesGeo, new THREE.MeshFaceMaterial(this.tilesMaterials) );
	scene.add( this.mesheTiles );
}


Globe.prototype.updateCurTile = function(){
	var newTile = this.coordsToTile( this.camCoords.x, this.camCoords.y, this.CUR_ZOOM );
	if( newTile.x != this.curTile.x || newTile.y != this.curTile.y || newTile.z != this.curTile.z ){
		this.onCurTileChange( newTile );
	}
	this.curTile = newTile;
}

Globe.prototype.coordsToTile = function( _lon, _lat, _zoom ){
	_zoom = Math.floor( _zoom );
	var tile = new THREE.Vector2();
	tile.x = Math.floor( ( _lon + 180 ) / 360 * Math.pow( 2, _zoom) );
	tile.y = Math.floor( ( 1 - Math.log( Math.tan( _lat * Math.PI / 180 ) + 1 / Math.cos( _lat * Math.PI / 180 ) ) / Math.PI ) / 2 * Math.pow( 2, _zoom ) );
	tile.z = _zoom;
	return tile;
}

Globe.prototype.tileToCoords = function( _tile_x, _tile_y, _zoom){
    var p = new THREE.Vector2( 0, 0 );
    var n = Math.PI - ( (2.0 * Math.PI * _tile_y ) / Math.pow( 2.0, _zoom ) );
    p.x = ( ( _tile_x / Math.pow( 2.0, _zoom ) * 360.0 ) - 180.0 );
    p.y = (180.0 / Math.PI * Math.atan(Math.sinh( n ) ) );
    return p;
}


Globe.prototype.altitude = function( _zoomlevel ) {
	if( this.projection == "SPHERE" ){
		var C = ( Math.PI * 2 ) * this.radius;
		return ( C * Math.cos( 0 ) / Math.pow( 2, _zoomlevel ) )  + this.curEle;
	}else if( this.projection == "PLANE" ){
		// return ( ( this.radius * 6 ) / Math.pow( 2, _zoomlevel ) ) + this.curEle;
		return ( ( this.radius * 6 ) / Math.pow( 2, _zoomlevel ) );
	}
}

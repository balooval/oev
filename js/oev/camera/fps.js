import Renderer from '../renderer.js';

var CamCtrlFps = function () {
	this.name = 'FPS';
	this.camera = undefined;
	this.planet = undefined;
	this.pointer = undefined;
	this.mouseLastPos = new THREE.Vector2( 0, 0 );

	this.zoomCur = 4;
	this.coordLookat = new THREE.Vector3( 4.1862, 43.7682, 0 );
	this.zoomDest = this.zoomCur;
	this.coordCam = new THREE.Vector3( this.coordLookat.x, this.coordLookat.y, 0 );
	this.posLookat = new THREE.Vector3( 0, 0, 0 );
	this.posCam = new THREE.Vector3( 0, 0, 0 );
	this.camRotation = new THREE.Vector2( Math.PI, 0.2 );
	this.dragging = false;
	this.rotating = false;
	
	this.coordOnGround = new THREE.Vector2( 0, 0 );
	
	this.zoomTweenValueStart = this.zoomCur;
	this.zoomTweenValueEnd = this.zoomCur;
	this.zoomTweenTimeStart = -1;
	
	this.tweenZoom = new Animation.TweenValue( this.zoomCur );
	this.tweenLon = new Animation.TweenValue( this.coordLookat.x );
	this.tweenLat = new Animation.TweenValue( this.coordLookat.y );
	
	this.clicPointer = undefined;
	this.debugPointer = undefined;
	
	this.evt = new Oev.Utils.Evt();
	
	this.MUST_UPDATE = false;
	
	this.keyMoveSpeed = 4;
	
	this.altitude = 10000;
	
	this.tweenAlt = new Animation.TweenValue( this.altitude );
	
	
	this.keyMoveX = new THREE.Vector2( 0, 0 );
	this.keyMoveY = new THREE.Vector2( 0, 0 );
	this.keyMoveCam = new THREE.Vector2( 0, 0 );
	
	INPUT.Mouse.evt.addEventListener('MOUSE_WHEEL', this, this.onMouseWheel);
	INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', this, this.onMouseDownLeft);
	INPUT.Mouse.evt.addEventListener('MOUSE_RIGHT_DOWN', this, this.onMouseDownRight);
	INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_UP', this, this.onMouseUpLeft);
	INPUT.Mouse.evt.addEventListener('MOUSE_RIGHT_UP', this, this.onMouseUpRight);
}




CamCtrlFps.prototype.checkKeyMovement = function() {
	this.keyMoveCam.x = this.keyMoveX.x + this.keyMoveX.y;
	this.keyMoveCam.y = this.keyMoveY.x + this.keyMoveY.y;
}

CamCtrlFps.prototype.onKeyDown = function() {
	if (Oev.Input.Keyboard.lastKeyDown == 37) { // LEFT
		this.keyMoveX.x = -1;
	}else if (Oev.Input.Keyboard.lastKeyDown == 39) { // RIGHT
		this.keyMoveX.y = 1;
	}else if (Oev.Input.Keyboard.lastKeyDown == 38) { // TOP
		this.keyMoveY.x = -1;
	}else if (Oev.Input.Keyboard.lastKeyDown == 40) { // BOTTOM
		this.keyMoveY.y = 1;
	}
	
	this.checkKeyMovement();
}

CamCtrlFps.prototype.onKeyUp = function() {
	if (Oev.Input.Keyboard.lastKeyUp == 37) { // LEFT
		this.keyMoveX.x = 0;
	}else if (Oev.Input.Keyboard.lastKeyUp == 39) { // RIGHT
		this.keyMoveX.y = 0;
	}else if (Oev.Input.Keyboard.lastKeyUp == 38) { // TOP
		this.keyMoveY.x = 0;
	}else if (Oev.Input.Keyboard.lastKeyUp == 40) { // BOTTOM
		this.keyMoveY.y = 0;
	}
	
	this.checkKeyMovement();
}


CamCtrlFps.prototype.init = function( _cam, _planet ) {
	this.camera = _cam;
	this.planet = _planet;
	this.camera.up.set( 0, -1, 0 );
	this.pointer = new THREE.Mesh( new THREE.SphereGeometry( this.planet.meter * 200, 16, 7 ), new THREE.MeshBasicMaterial({ color: 0x00ff00 }) );
	Renderer.scene.add(this.pointer);
	this.clicPointer = new THREE.Mesh( new THREE.SphereGeometry( this.planet.meter * 150, 16, 7 ), new THREE.MeshBasicMaterial({ color: 0x0000ff }) );
	Renderer.scene.add( this.clicPointer );
	this.debugPointer = new THREE.Mesh( new THREE.SphereGeometry( this.planet.meter * 150, 16, 7 ), new THREE.MeshBasicMaterial({ color: 0xfffc00 }) );
	Renderer.scene.add( this.debugPointer );
	if( location.hash != '' ){
		var urlParamsLoc = location.hash.substr( location.hash.search( '=' ) + 1 ).split( '/' );
		this.zoomCur = parseFloat( urlParamsLoc[0] );
		this.zoomDest = this.zoomCur;
		this.tweenZoom.value = this.zoomCur;
		this.setLookAt( parseFloat( urlParamsLoc[1] ), parseFloat( urlParamsLoc[2] ) );
		this.tweenLon.value = this.coordLookat.x;
		this.tweenLat.value = this.coordLookat.y;
		this.planet.updateZoom(this.zoomCur);
		this.MUST_UPDATE = true;
	}
	Oev.Input.Keyboard.evt.addEventListener("ON_KEY_DOWN", this, this.onKeyDown);
	Oev.Input.Keyboard.evt.addEventListener("ON_KEY_UP", this, this.onKeyUp);
}


CamCtrlFps.prototype.modAltitude = function( _value ) {
	var destAlt;
	if( _value < 0 ){
		// this.altitude *= 0.5;
		destAlt = this.altitude * 0.5;
	}else{
		// this.altitude *= 2;
		destAlt = this.altitude * 2;
	}
	
	this.tweenAlt.setTargetValue( destAlt, 1000 );
	
	// this.altitude += _value;
	// this.altitude = Math.max( this.altitude, 5 );
	// debug( 'this.altitude: ' + this.altitude );
	// this.zoomCur = this.planet.zoomFromAltitudeTest( this.altitude );
	// debug( 'this.zoomCur: ' + this.zoomCur );
	// this.planet.updateZoom( this.zoomCur );
	
	
	this.MUST_UPDATE = true;
}

CamCtrlFps.prototype.setZoomDest = function( _zoom, _duration ) {
	/*
	this.zoomDest = Math.min( Math.max( _zoom, 4 ), 19 );
	if( this.zoomDest != this.zoomCur ){
		this.tweenZoom.setTargetValue( this.zoomDest, _duration );
	}
	*/
}


CamCtrlFps.prototype.update = function() {
	if( this.keyMoveCam.x != 0 || this.keyMoveCam.y != 0 ){
		
		var depX = ( this.keyMoveCam.x * this.keyMoveSpeed ) / Math.pow( 2.0, this.zoomCur );
		var depY = ( this.keyMoveCam.y * this.keyMoveSpeed ) / Math.pow( 2.0, this.zoomCur );
		var finalLon = this.coordLookat.x + ( depX * Math.cos( this.camRotation.x ) - depY * Math.sin( this.camRotation.x ) );
		var finalLat = this.coordLookat.y - ( depY * Math.cos( this.camRotation.x ) + depX * Math.sin( this.camRotation.x ) );

		this.setLookAt( finalLon, finalLat );
	}
	
	if( this.dragging ){
		this.drag();
	}
	if( this.rotating ){
		this.rotate();
	}
	if( this.tweenAlt.running ){
		this.zoom();
	}
	this.checkDestination();
	
	if( this.MUST_UPDATE ){
		this.updateCamera();
		this.MUST_UPDATE = false;
	}
	
	this.mouseLastPos.x = INPUT.Mouse.curMouseX;
	this.mouseLastPos.y = INPUT.Mouse.curMouseY;
}

CamCtrlFps.prototype.setDestination = function( _lon, _lat, _duration ) {
	if( _duration == undefined ){
		var distance = GEO.coordDistance( this.coordLookat.x, this.coordLookat.y, _lon, _lat );
		_duration = Math.min( 5000, distance / 10 );
		// debug( "_duration undefined, set to " + _duration + ' (' + distance + ')' );
	}	
	// _duration = _duration || 3000;
	this.tweenLon.value = this.coordLookat.x;
	this.tweenLat.value = this.coordLookat.y;
	this.tweenLon.setTargetValue( _lon, _duration );
	this.tweenLat.setTargetValue( _lat, _duration );
	
	this.tweenLon.evt.removeEventListener( "END", this, this.onDestReach );
	this.tweenLon.evt.addEventListener( "END", this, this.onDestReach );
}

CamCtrlFps.prototype.onDestReach = function() {
	// debug( "onDestReach" );
	this.tweenLon.evt.removeEventListener( "END", this, this.onDestReach );
	this.evt.fireEvent( "DEST_REACH" );
}

CamCtrlFps.prototype.checkDestination = function() {
	if( this.tweenLon.running ){
		var d = new Date();
		var curTime = d.getTime();
		this.coordLookat.x = this.tweenLon.getValueAtTime( curTime );
		this.coordLookat.y = this.tweenLat.getValueAtTime( curTime );
		this.MUST_UPDATE = true;
	}
}


CamCtrlFps.prototype.zoom = function() {
	
	var d = new Date();
	// this.zoomCur = this.tweenAlt.getValueAtTime( d.getTime() );
	this.altitude = this.tweenAlt.getValueAtTime( d.getTime() );
	debug( 'this.altitude : ' + this.altitude, true );
	this.zoomCur = this.planet.zoomFromAltitudeTest( this.altitude );
	
	this.planet.updateZoom( this.zoomCur );
	
	var wpScale = ( this.coordCam.z / this.planet.radius ) * 1000;
	for( var w = 0; w < OEV.waypoints.length; w ++ ){
		OEV.waypoints[w].resize( wpScale );
	}
	
	this.MUST_UPDATE = true;
	
}


CamCtrlFps.prototype.drag = function() {
	var depX = ( INPUT.Mouse.curMouseX - this.mouseLastPos.x ) / Math.pow( 2.0, this.zoomCur );
	var depY = ( INPUT.Mouse.curMouseY - this.mouseLastPos.y ) / Math.pow( 2.0, this.zoomCur );
	var finalLon = this.coordLookat.x - ( depX * Math.cos( this.camRotation.x ) - depY * Math.sin( this.camRotation.x ) );
	var finalLat = this.coordLookat.y + ( depY * Math.cos( this.camRotation.x ) + depX * Math.sin( this.camRotation.x ) );
	this.setLookAt( finalLon, finalLat );
}

CamCtrlFps.prototype.setLookAt = function( _lon, _lat ) {
	this.coordLookat.x = _lon;
	this.coordLookat.y = _lat;
	if( this.coordLookat.x > 180 ){
		this.coordLookat.x = this.coordLookat.x - 360;
	}else if( this.coordLookat.x < -180 ){
		this.coordLookat.x = this.coordLookat.x + 360;
	}
	this.coordLookat.y = Math.min( Math.max( this.coordLookat.y, -85 ), 85 );
	
	this.MUST_UPDATE = true;
}

CamCtrlFps.prototype.rotate = function() {
	var depX = ( INPUT.Mouse.curMouseX - this.mouseLastPos.x ) / 100.0;
	var depY = ( INPUT.Mouse.curMouseY - this.mouseLastPos.y ) / 100.0;
	this.camRotation.x += depX;
	this.camRotation.y += depY;
	if( this.camRotation.x > Math.PI ){
		this.camRotation.x = 0 - this.camRotation.x;
	}else if( this.camRotation.x < -Math.PI ){
		this.camRotation.x = this.camRotation.x + ( Math.PI * 2 );
	}
	this.camRotation.y = Math.min( Math.max( this.camRotation.y, 0.0 ), ( Math.PI / 2 ) + 2.05 );
	document.getElementById("camHeading").style.transform = "rotate("+( 180 + ( 180 * this.camRotation.x / Math.PI ) )+"deg)";
	
	this.MUST_UPDATE = true;
}



CamCtrlFps.prototype.updateCamera = function() {
	var urlLon = Math.round( this.coordLookat.x * 10000 ) / 10000;
	var urlLat = Math.round( this.coordLookat.y * 10000 ) / 10000;
	var urlZoom = Math.round( this.zoomDest * 10000 ) / 10000;
	history.replaceState( 'toto', "Title", "#location="+urlZoom+"/"+urlLon+"/"+urlLat );
	
	this.coordLookat.z = this.planet.getElevationAtCoords( this.coordLookat.x, this.coordLookat.y, true );
	this.coordLookat.z += this.altitude;
	this.coordCam.z = this.planet.altitude( this.zoomCur );
	this.posLookat = this.planet.coordToXYZ( this.coordLookat.x, this.coordLookat.y, this.coordLookat.z + 6 );
	
	if( this.planet.projection == "SPHERE" ){
		var radLon = Oev.Math.radians( this.coordLookat.x );
		var radLat = Oev.Math.radians( this.coordLookat.y );
		var matGlob = new THREE.Matrix4();
		var matZ = new THREE.Matrix4();
		var matY = new THREE.Matrix4();
		var matX = new THREE.Matrix4();
		
		matX.makeRotationX( 0 );
		matY.makeRotationY( radLon );
		matZ.makeRotationZ( radLat );
		matGlob.multiplyMatrices( matY, matZ );
		matGlob.multiply( matX );
		var tmpG = new THREE.Vector3( this.planet.radius / this.planet.globalScale, 0, 0 );
		tmpG.applyMatrix4( matGlob );
		
		
		// rotation locale
		var matLoc = new THREE.Matrix4();
		var matLocX = new THREE.Matrix4();
		var matLocY = new THREE.Matrix4();
		var matLocZ = new THREE.Matrix4();
		matLocX.makeRotationX( this.camRotation.x * -1 );
		matLocY.makeRotationY( 0 ); // this.camRotation.x
		matLocZ.makeRotationZ( this.camRotation.y * 1 ); // ok
		matGlob.multiply( matLocX );
		matGlob.multiply( matLocZ );
		var tmpL = new THREE.Vector3( this.coordCam.z / this.planet.globalScale, 0, 0 );
		tmpL.applyMatrix4( matGlob );
		
		tmpG.x += tmpL.x;
		tmpG.y += tmpL.y;
		tmpG.z += tmpL.z;
		
		this.posCam.x = -tmpG.x;
		this.posCam.y = tmpG.y;
		this.posCam.z = -tmpG.z;
		
		var vX = new THREE.Vector3();
		var vY = new THREE.Vector3();
		var vZ = new THREE.Vector3();
		matGlob.extractBasis( vX, vY, vZ);
		
		this.camera.up.set( -Math.cos( radLat * -1 ) * Math.cos( radLon ), -Math.sin( radLat * -1 ), Math.cos( radLat * -1 ) * Math.sin( radLon ) );
		
	}else{
		this.coordCam.z *= this.planet.globalScale;
		// var orbitRadius = Math.sin( this.camRotation.y ) * ( this.coordCam.z );
		var orbitRadius = 1 * ( this.coordCam.z );
		this.posCam.x = this.posLookat.x + Math.sin( this.camRotation.x ) * orbitRadius;
		this.posCam.z = this.posLookat.z + Math.cos( this.camRotation.x ) * orbitRadius;
		this.posCam.y = this.posLookat.y - Math.cos( this.camRotation.y ) * ( this.coordCam.z );
		this.camera.up.set( 0, -1, 0 );
	}
	
	// this.camera.position.x = this.posCam.x;
	// this.camera.position.y = this.posCam.y;
	// this.camera.position.z = this.posCam.z;
	
	
	this.camera.position.x = this.posLookat.x;
	// this.camera.position.y = -this.coordCam.z;
	this.camera.position.y = this.posLookat.y;
	this.camera.position.z = this.posLookat.z;
	
	// this.posCam.y = this.posLookat.y;
	
	
	var tmpCoords = this.planet.coordFromPos( this.posCam.x, this.posCam.z );
	this.coordCam.x = tmpCoords.x;
	this.coordCam.y = tmpCoords.y;
	// this.camera.lookAt( this.posLookat );
	
	
	this.camera.lookAt( this.posCam );
	
	
	
	
	this.clicPointer.position.x = this.posCam.x;
	this.clicPointer.position.y = this.posCam.y;
	this.clicPointer.position.z = this.posCam.z;
	
	
	
	this.planet.updateCurTile( this.coordLookat.x, this.coordLookat.y );
	this.planet.zoomDetails = this.zoomCur;
	this.planet.checkLOD();
	
	var wpScale = ( this.coordCam.z / this.planet.radius ) * 500;
	this.pointer.scale.x = wpScale;
	this.pointer.scale.y = wpScale;
	this.pointer.scale.z = wpScale;
	this.pointer.position.x = this.posLookat.x;
	this.pointer.position.y = this.posLookat.y;
	this.pointer.position.z = this.posLookat.z;
	
	this.debugPointer.scale.x = wpScale;
	this.debugPointer.scale.y = wpScale;
	this.debugPointer.scale.z = wpScale;
	
	Renderer.MUST_RENDER = true;
	
	
	if (SKY != undefined) {
		SKY.globalScale = this.planet.globalScale;
	}
	
}


CamCtrlFps.prototype.onMouseDownLeft = function(){
	this.coordOnGround = OEV.checkMouseWorldPos();
	if( this.coordOnGround != undefined ){
		
		var wpScale = ( this.coordCam.z / this.planet.radius ) * 500;
		this.clicPointer.scale.x = wpScale;
		this.clicPointer.scale.y = wpScale;
		this.clicPointer.scale.z = wpScale;
		var pos = this.planet.coordToXYZ( this.coordOnGround.x, this.coordOnGround.y, this.coordOnGround.z );
		this.clicPointer.position.x = pos.x;
		this.clicPointer.position.y = pos.y;
		this.clicPointer.position.z = pos.z;
	
		this.dragging = true;
	}
}

CamCtrlFps.prototype.onMouseUpLeft = function(){
	this.dragging = false;
}

CamCtrlFps.prototype.onMouseDownRight = function(){
	this.rotating = true;
}

CamCtrlFps.prototype.onMouseUpRight = function(){
	this.rotating = false;
}

CamCtrlFps.prototype.onMouseWheel = function(_delta){
	
}
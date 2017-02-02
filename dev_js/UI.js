var dragSun = false;
var majActiv = false;
var notifCloseTimer = -1;
var urlParams = [];
var UiObj = undefined;

var UI = function () {
	this.evt = new Oev.Utils.Evt();
	this.lastKeyDown = -1;
	this.lastKeyUp = -1;
	this.coordOnGround = new THREE.Vector3( 0, 0, 0 );
}

UI.prototype.init = function() {
	Oev.Input.evt.addEventListener('MOUSE_LEFT_DOWN', this, this.onMouseDownLeft);
	Oev.Input.evt.addEventListener('MOUSE_LEFT_UP', this, this.onMouseUpLeft);
}
UI.prototype.onMouseDownLeft = function() {
	var coordOnGround = OEV.checkMouseWorldPos();
	if (coordOnGround === undefined){
		dragSun = true;
	}
}
UI.prototype.onMouseUpLeft = function() {
	dragSun = false;
}

function initUi(){
	UiObj = new UI();
	UiObj.init();
	var elem = document.getElementsByName( "cfg_tile_layer" );
	for( var i = 0; i < elem.length; i ++ ){
		elem[i].addEventListener("click", changeTilesLayer );
	}
	var elem = document.getElementsByClassName( "cfg_load_models" );
	for( var i = 0; i < elem.length; i ++ ){
		elem[i].addEventListener("click", switchModelsToLoad );
	}
	document.getElementById( "contactLink" ).setAttribute('href', "mailto:val.poub@gmail.com");
	document.getElementById( "cfg_load_ele" ).addEventListener("click", switchElevation );
	document.getElementById( "cfg_load_buildings" ).addEventListener("click", switchBuildings );
	document.getElementById( "cfg_load_nodes" ).addEventListener("click", switchNodes );
	document.getElementById( "cfg_load_landuse" ).addEventListener("click", switchLanduse );
	document.getElementById( "cfg_fog_near" ).addEventListener("input", onFogNearChanged );
	document.getElementById( "cfg_fog_far" ).addEventListener("input", onFogFarChanged );
	OEV.renderer.domElement.addEventListener('mousedown',Oev.Input.onMouseDown,false);
	OEV.renderer.domElement.addEventListener('mouseup',Oev.Input.onMouseUp,true);
	OEV.renderer.domElement.addEventListener('contextmenu', function(e){e.preventDefault();}, true);
	var elem = document.getElementsByClassName( "toolsBox" );
	for( var i = 0; i < elem.length; i ++ ){
		var title = elem[i].getElementsByTagName("h3")[0];
		if( title != undefined ){
			title.addEventListener("click", foldToolbox );
		}
	}
	showUICoords();
	if( location.hash != '' ){
		urlParams = location.hash.substr( location.hash.search( '=' ) + 1 ).split( '/' );
		if( urlParams[3] ){
			urlParams = urlParams[3].split( ',' );
			for( var p = 0; p < urlParams.length; p ++ ){
				debug( 'param ' + p + ' : ' + urlParams[p] );
				if( urlParams[p] == 'buildings' ){
					OEV.earth.activBuildings( true );
					document.getElementById( "cfg_load_buildings" ).checked = true;
				}else if( urlParams[p] == 'landuse' ){
					OEV.earth.activLanduse( true );
					document.getElementById( "cfg_load_landuse" ).checked = true;
				}else if( urlParams[p] == 'elevation' ){
					OEV.earth.activElevation( true );
					document.getElementById( "cfg_load_ele" ).checked = true;
				}else if( urlParams[p] == 'tree' ){
					OEV.MODELS_CFG['TREE']["ACTIV"] = true;
					OEV.earth.updateTilesModelProvider( true, OEV.MODELS_CFG['TREE']["NAME"] );
					document.getElementById( "cfg_load_TREE" ).checked = true;
				}
			}
		}
		this.MUST_UPDATE = true;
	}
}

function foldToolbox(){
	var myIcon = document.getElementById( "expend_" + this.dataset.content );
	var myContent = document.getElementById( "toolsContent_" + this.dataset.content );
	if( isElementActiv( myContent ) ){
		setElementActiv( [this, myContent, myIcon], false );
	}else{
		setElementActiv( [this, myContent, myIcon], true );
	}
}

function isElementActiv( _elm ){
	if( _elm.className.indexOf( 'activ' ) < 0 ){
		return false;
	}
	return true;
}

function setElementActiv( _elm, _state ){
	var elmArray;
	if( _elm.constructor === Array ){
		elmArray = _elm;
	}else{
		elmArray = [_elm];
	}
	for( var i = 0; i < elmArray.length; i ++ ){
		if( _state ){
			elmArray[i].classList.add( "activ" );
		}else{
			elmArray[i].classList.remove( "activ" );
		}
	}
}

function onHemilightChanged(){
	Oev.Sky.hemiIntensity = ( this.value / 100 ) * 0.35
	Oev.Sky.updateSun();
	debug( "sky.hemiIntensity : " + Oev.Sky.hemiIntensity );
	OEV.MUST_RENDER = true;	
}

function onBokehChanged(){
	OEV.bokehPass.uniforms.aperture.value = document.getElementById( "cfg_bokeh_aperture" ).value * 0.001;
	OEV.bokehPass.uniforms.maxblur.value = document.getElementById( "cfg_bokeh_maxblur" ).value * 0.0005;
	OEV.bokehPass.uniforms.focus.value = 0.9 + document.getElementById( "cfg_bokeh_focus" ).value * 0.002;
	debug( OEV.bokehPass.uniforms.aperture.value );
	debug( OEV.bokehPass.uniforms.maxblur.value );
	debug( OEV.bokehPass.uniforms.focus.value );
	OEV.MUST_RENDER = true;	
}

function onSunPosChanged(){
	sky.setSunTime( this.value / 100 );
	OEV.MUST_RENDER = true;
}

function onFogNearChanged(){
	OEV.scene.fog.near = ( ( ( OEV.earth.radius / 4 ) * OEV.earth.globalScale ) * ( this.value / 100 ) );
	if( OEV.scene.fog.near > OEV.scene.fog.far ){
		OEV.scene.fog.far = OEV.scene.fog.near;
	}
	OEV.MUST_RENDER = true;
}

function onFogFarChanged(){
	OEV.scene.fog.far = ( ( ( OEV.earth.radius / 50 ) * OEV.earth.globalScale ) * ( this.value / 100 ) );
	if( OEV.scene.fog.far < OEV.scene.fog.near ){
		OEV.scene.fog.near = OEV.scene.fog.far;
	}
	OEV.MUST_RENDER = true;
}

function switchModelsToLoad(){
	if( this.checked ){
		OEV.MODELS_CFG[this.dataset.model]["ACTIV"] = true;
		OEV.earth.updateTilesModelProvider( true, OEV.MODELS_CFG[this.dataset.model]["NAME"] );
	}else{
		OEV.MODELS_CFG[this.dataset.model]["ACTIV"] = false;
		OEV.earth.updateTilesModelProvider( false, OEV.MODELS_CFG[this.dataset.model]["NAME"] );
	}
}

function changeTilesLayer(){
	OEV.earth.setTilesProvider( this.value );
}

function switchLanduse(){
	if( this.checked ){
		OEV.earth.activLanduse( true );
	}else{
		OEV.earth.activLanduse( false );
	}
}

function switchNodes(){
	if( document.getElementById("cfg_load_nodes").checked ){
		OEV.earth.activNodes( true );
	}else{
		OEV.earth.activNodes( false );
	}
}

function switchBuildings(){
	if( document.getElementById("cfg_load_buildings").checked ){
		OEV.earth.activBuildings( true );
	}else{
		OEV.earth.activBuildings( false );
	}
}

function switchElevation(){
	if( document.getElementById("cfg_load_ele").checked ){
		OEV.earth.activElevation( true );
	}else{
		OEV.earth.activElevation( false );
	}
}

function showNotification( _content, _msgType ){
	_msgType = _msgType || 'info';
	var notifBox = document.getElementById( "boxNotification" );
	
	notifBox.className = "";
	notifBox.classList.add( _msgType );
	
	notifBox.innerHTML = _content;
	setElementActiv( notifBox, true );
	if( notifCloseTimer >= 0 ){
		clearTimeout( notifCloseTimer );
	}
	notifCloseTimer = setTimeout( hideNotification, 2000 );
}

function hideNotification(){
	var notifBox = document.getElementById( "boxNotification" );
	notifBox.innerHTML = '';
	setElementActiv( notifBox, false );
	notifCloseTimer = -1;
}

function openModal( _content ){
	document.getElementById( "modalContent" ).innerHTML = _content;
	document.getElementById( "modalContainer" ).classList.add( "activ" );
}

function closeModal(){
	document.getElementById( "modalContainer" ).classList.remove( "activ" );
	document.getElementById( "modalContent" ).innerHTML = '';
}

function minimapSetPos( _id, _lon, _lat ){
	var posX = 128 + ( 64 * ( _lon / 90 ) );
	var posY = Math.log( Math.tan( ( 90 + _lat ) * Math.PI / 360.0 ) ) / ( Math.PI / 180.0 );
    posY = 128 - ( posY * ( 2 * Math.PI * 32 / 2.0 ) / 180.0 );
	var marker = document.getElementById( _id );
	var elementStyle = marker.style;
	elementStyle.left = posX+"px";
	elementStyle.top = posY+"px";
}


function keyEvent(event) {
	if( document.activeElement.type == undefined ){
		var key = event.keyCode || event.which;
		var keychar = String.fromCharCode(key);
		console.log( "keyEvent : " + key + " / " + keychar );
		if( UiObj.lastKeyDown != key ){
			UiObj.lastKeyUp = -1;
			UiObj.lastKeyDown = key;
			UiObj.evt.fireEvent( "ON_KEY_DOWN" );
		}
		if( key == 87 ){ // w
			var bbox = new THREE.Box3().setFromObject( OEV.scene );
			console.log( bbox );
			
		}else if( key == 16 ){ // MAJ
			majActiv = true;
		}else if( key == 17 ){ // CTRL
			ctrlActiv = true;
		}else if( key == 37 ){ // LEFT
			
		}else if( key == 39 ){ // RIGHT
			
		}else if( key == 38 ){ // TOP
			
			// OEV.earth.gpxSpeed += 5;
			// debug( "OEV.earth.gpxSpeed : " + OEV.earth.gpxSpeed );
			
		}else if( key == 40 ){ // BOTTOM

		}else if( key == 49 ){ // 1
			OEV.gotoWaypoint( 0 );
		}else if( key == 50 ){ // 2
			OEV.gotoWaypoint( 1 );
		}else if( key == 51 ){ // 3
			OEV.gotoWaypoint( 2 );
			
		}else if( key == 65 ){ // a
			// Oev.Sky.addPlane( OEV.camCtrl.coordLookat, new THREE.Vector2( 2.383138,48.880945 ) );
			OpenEarthViewer.planes.addPlane();
		}else if( key == 66 ){ // b
			// earth.getCurrentBBox();
		}else if( key == 67 ){ // c
			OEV.switchClouds();
		}else if( key == 68 ){ // d
			OEV.switchDof();
		}else if( key == 69 ){ // e

		}else if( key == 71 ){ // g
		
		}else if( key == 76 ){ // l

		}else if( key == 79 ){ // o
			
		}else if( key == 80 ){ // p
			OEV.earth.switchProjection();
			OEV.camCtrl.updateCamera();
		}else if( key == 82 ){ // r
			
		}else if( key == 83 ){ // s
			showWPDialog();
		}else if( key == 90 ){ // z
			
		}else if( key == 107 ){ // +
			zoomIn();
		}else if( key == 109 ){ // -
			zoomOut();
		}else if( key == 88 ){ // x
			var tmp;
			tmp = OEV.earth.coordToXYZPlane( 0, 0, 0 );
			tmp = OEV.earth.coordToXYZPlane( -180, 0, 0 );
			tmp = OEV.earth.coordToXYZPlane( 180, 0, 0 );
			tmp = OEV.earth.coordToXYZPlane( 0, -89, 0 );
			tmp = OEV.earth.coordToXYZPlane( 0, 89, 0 );
		}
	}
}

function metaKeyUp (event) {
	var key = event.keyCode || event.which;
	if( UiObj.lastKeyUp != key ){
		UiObj.lastKeyDown = -1;
		UiObj.lastKeyUp = key;
		UiObj.evt.fireEvent( "ON_KEY_UP" );
	}
	if( key == 17 ){ // CTRL
		ctrlActiv = false;
	}else if( key == 16 ){ // MAJ
		majActiv = false;
	}
}

function showWPDialog(){
	var html = '<input type="text" id="wpSaveName" value="" placeholder="insert name for new waypoint">';
	html += '<div class="btn" id="btnPlugins" onclick="saveNewWP(document.getElementById(\'wpSaveName\').value);closeModal();" title="more tools">Save</div>';
	openModal( html );
}

function saveNewWP( _name ){
	if( _name == '' ){
		_name = 'New WP';
	}
	OEV.saveWaypoint( OEV.camCtrl.coordLookat.x, OEV.camCtrl.coordLookat.y, OEV.earth.CUR_ZOOM, _name, 'default', true );
}

function updateWaypointsList( _waysPts ){
	document.getElementById( "waypointsInfos" ).innerHTML = "";
	for( var w = 0; w < _waysPts.length; w ++ ){
		if( _waysPts[w].showList ){
			document.getElementById( "waypointsInfos" ).innerHTML = document.getElementById( "waypointsInfos" ).innerHTML + '<span class="hand" onclick="OEV.removeWaypoint('+w+')">X</span> ' + ( w + 1 ) + ' : <span class="hand waypoint" onclick="OEV.gotoWaypoint('+w+');" title=" '+ ( Math.round( _waysPts[w].lon * 1000 ) / 1000 ) + " / " + ( Math.round( _waysPts[w].lat * 1000 ) / 1000 ) +'">'+_waysPts[w].name + '</span><br>';
		}
	}
}


function showUICoords(){
	document.getElementById( "overlayUICoords" ).innerHTML = "<h2>Position</h2>Lon : " + ( Math.round( OEV.camCtrl.coordLookat.x * 1000 ) / 1000 ) + "<br>Lat : " + ( Math.round( OEV.camCtrl.coordLookat.y * 1000 ) / 1000 ) + "<br>Elevation : " + Math.round( OEV.camCtrl.coordLookat.z )+ "m<br>Ele. factor : " + OEV.earth.eleFactor+'<br>SunTime: ' + Math.round( Oev.Sky.normalizedTime * 24 )+'H';
}



function onPostChatMsg( evt ){
	evt.returnValue = false;
	var msg = document.getElementById( 'ws_chat_msg' ).value;
	OEV.netCtrl.chatSendMsg( msg );
	document.getElementById( 'ws_chat_msg' ).value = '';
	return false;
}

function updateLoadingDatas( _datasMng ){
	var elmt = document.getElementById( "loading_" + _datasMng.type );
	if( elmt != null ){
		elmt.innerHTML = _datasMng.datasWaiting.length + " " + _datasMng.type + " to load";
	}
}

function zoomOut( _value ){
	_value = _value || 1;
	if( OEV.camCtrl.name == 'FPS' ){
		OEV.camCtrl.modAltitude( 50 );
	}else{
		OEV.camCtrl.setZoomDest( OEV.camCtrl.zoomDest - _value, 200 );
	}
}

function zoomIn( _value ){
	_value = _value || 1;
	if( OEV.camCtrl.name == 'FPS' ){
		OEV.camCtrl.modAltitude( -50 );
	}else{
		OEV.camCtrl.setZoomDest( OEV.camCtrl.zoomDest + _value, 200 );
	}
}

function querySearch(){
	var searchValue = document.getElementById( "search_value" ).value;
	debug( "searchValue: " + searchValue );
	var bbox = OEV.earth.getCurrentBBox();
	var url = DEV+"libs/remoteImg.php?nominatim=1&searchValue="+searchValue+"&left="+bbox["left"]+"&top="+bbox["top"]+"&right="+bbox["right"]+"&bottom="+bbox["bottom"]+"";
	var ajaxMng = new AjaxMng( url, { "searchValue" : searchValue }, function( res, _params ){
		var results = JSON.parse( res );
		if( results.length > 0 ){
			debug( "Found" );
			OEV.earth.saveWayPoints( parseFloat( results[0]["lon"] ), parseFloat( results[0]["lat"] ), 10, _params["searchValue"] );
			OEV.gotoWaypoint( OEV.earth.wayPoints.length - 1 );
		}else{
			debug( "No results" );
		}
	});
	return false;
}

function debug( _msg, _inHtml ){
	_inHtml = _inHtml || false;
	if( _inHtml ){
		document.getElementById( "debugBox" ).innerHTML = _msg;
	}else{
		console.log( _msg );
	}
}

function openConfigLanduse(){
	var content = '<h3>Landuse</h3><br>';
	var checked = '';
	if( TileSurface.prototype.useCache == true ){
		checked = 'checked="checked"';
	}
	content += 'Use cache : <input type="checkbox" onclick="TileSurface.prototype.useCache=!TileSurface.prototype.useCache;" '+checked+'><br>';
	openModal( content );
}

function openConfigBuildings(){
	var content = '<h3>Buildings</h3><br>';
	content += '<img src="img/ico_buildings.png" alt="buildings"><br>';
	var checked = '';
	if( Tile3d.prototype.useCache == true ){
		checked = 'checked="checked"';
	}
	content += 'Use cache : <input type="checkbox" onclick="Tile3d.prototype.useCache=!Tile3d.prototype.useCache;" '+checked+'><br>';
	openModal( content );
}


function openConfigModel( _name ){
	var content = '';
	content += '<h3>'+OEV.MODELS_CFG[_name]["NAME"]+'</h3><br>';
	content += 'ZOOM_MIN : ' + OEV.MODELS_CFG[_name]["ZOOM_MIN"]+'<br>';
	content += 'QUERY : ' + OEV.MODELS_CFG[_name]["QUERY"]+'<br>';
	var disabled = '';
	if( OEV.MODELS_CFG[_name]["MARKER"] == 'none' ){
		disabled = 'disabled="disabled"';
	}else if( OEV.MODELS_CFG[_name]["MARKER"] == 'default' ){
		content += '<img src="textures/waypoint.png" alt="'+OEV.MODELS_CFG[_name]["MARKER"]+'"><br>';
	}else{
		content += '<img src="textures/' + OEV.MODELS_CFG[_name]["MARKER"]+'" alt="'+OEV.MODELS_CFG[_name]["MARKER"]+'"><br>';
	}
	var checked = '';
	if( OEV.MODELS_CFG[_name]["SHOW_MARKER"] == true ){
		checked = 'checked="checked"';
	}
	content += 'SHOW MARKER : <input type="checkbox" '+disabled+' onclick="OEV.MODELS_CFG[\''+_name+'\'][\'SHOW_MARKER\']='+(!OEV.MODELS_CFG[_name]["SHOW_MARKER"])+';" '+checked+'><br>';
	openModal( content );
}



function showCredits(){
	var html = '<h3>Credits</h3>';
	html += '<a></a>tiles, map datas :<br><a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
	html += '<br>';
	html += '<br>';
	html += 'elevation :<br><a href="http://srtm.usgs.gov/">nasa srtm</a> / <a href="http://www.geonames.org">geoname</a>';
	openModal( html );
}

function openPlugins(){
	var modalContent = '<h3>Plugins</h3>';
	for (var key in OpenEarthViewer.plugins) {
		if (!OpenEarthViewer.plugins.hasOwnProperty(key)) continue;
		modalContent += OpenEarthViewer.plugins[key].drawDialog() + ' ';
	}
	openModal( modalContent );
}

import Evt from './oev/event.js';
import * as INPUT from './oev/input.js';
import SKY from './oev/sky.js';

export let dragSun = false;
var notifCloseTimer = -1;
var urlParams = [];
var UiObj = undefined;

var htmlElmtLoadingDatas;
var lastTimeLoadingUpdated = 0;

var UI = function () {
	this.evt = new Evt();
	this.coordOnGround = new THREE.Vector3( 0, 0, 0 );
}

UI.prototype.init = function() {
	INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', this, this.onMouseDownLeft);
	INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_UP', this, this.onMouseUpLeft);
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

export function initUi(){
	UiObj = new UI();
	UiObj.init();
	htmlElmtLoadingDatas = {
		'loading_OBJECTS' : document.getElementById( "loading_OBJECTS"), 
		'loading_TILE2D' : document.getElementById( "loading_TILE2D"), 
		'loading_ELE' : document.getElementById( "loading_ELE"), 
		'loading_MODELS' : document.getElementById( "loading_MODELS"), 
		'loading_BUILDINGS' : document.getElementById( "loading_BUILDINGS"), 
		'loading_SURFACE' : document.getElementById( "loading_SURFACE"), 
		'loading_NODES' : document.getElementById( "loading_NODES")
	};
	var elem = document.getElementsByName( "cfg_tile_layer" );
	for( var i = 0; i < elem.length; i ++ ){
		elem[i].addEventListener("click", changeTilesLayer );
	}
	document.getElementById( "contactLink" ).setAttribute('href', "mailto:val.poub@gmail.com");
	document.getElementById( "cfg_load_ele" ).addEventListener("click", switchElevation );
	document.getElementById( "cfg_load_nodes" ).addEventListener("click", switchNodes );
	document.getElementById( "cfg_fog_near" ).addEventListener("input", onFogNearChanged );
	document.getElementById( "cfg_fog_far" ).addEventListener("input", onFogFarChanged );
	const domContainer = OEV.domContainer();
	domContainer.addEventListener('mousedown',INPUT.Mouse.onMouseDown,false);
	domContainer.addEventListener('mouseup',INPUT.Mouse.onMouseUp,true);
	domContainer.addEventListener('contextmenu', function(e){e.preventDefault();}, true);
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
				console.log( 'param ' + p + ' : ' + urlParams[p] );
				if( urlParams[p] == 'buildings' ){
					Oev.Tile.Extension.activateExtension('BUILDINGS');
					document.getElementById( "cfg_load_buildings" ).checked = true;
				}else if( urlParams[p] == 'landuse' ){
					OEV.earth.activLanduse( true );
					document.getElementById( "cfg_load_landuse" ).checked = true;
				}else if( urlParams[p] == 'elevation' ){
					OEV.earth.activElevation( true );
					document.getElementById( "cfg_load_ele" ).checked = true;
				}
			}
		}
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
	SKY.hemiIntensity = ( this.value / 100 ) * 0.35
	SKY.updateSun();
	console.log( "sky.hemiIntensity : " + SKY.hemiIntensity );
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

function changeTilesLayer(){
	OEV.earth.setTilesProvider( this.value );
}

function switchLanduse(){
	console.log('switchLanduse');
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

function showWPDialog(){
	var html = '<input type="text" id="wpSaveName" value="" placeholder="insert name for new waypoint">';
	html += '<div class="btn" id="btnPlugins" onclick="saveNewWP(document.getElementById(\'wpSaveName\').value);closeModal();" title="more tools">Save</div>';
	openModal( html );
}

function saveNewWP( _name ){
	if( _name == '' ){
		_name = 'New WP';
	}
	Oev.Navigation.saveWaypoint( OEV.camCtrl.coordLookat.x, OEV.camCtrl.coordLookat.y, OEV.earth.CUR_ZOOM, _name, 'default', true );
}



export function showUICoords(){
	document.getElementById( "overlayUICoords" ).innerHTML = "<h2>Position</h2>Lon : " + ( Math.round( OEV.camCtrl.coordLookat.x * 1000 ) / 1000 ) + "<br>Lat : " + ( Math.round( OEV.camCtrl.coordLookat.y * 1000 ) / 1000 ) + "<br>Elevation : " + Math.round( OEV.camCtrl.coordLookat.z )+ 'm<br>SunTime: ' + Math.round( SKY.normalizedTime * 24 )+'H';
}

function onPostChatMsg( evt ){
	evt.returnValue = false;
	var msg = document.getElementById( 'ws_chat_msg' ).value;
	OEV.netCtrl.chatSendMsg( msg );
	document.getElementById( 'ws_chat_msg' ).value = '';
	return false;
}

export function updateLoadingDatas(_type, _nb){
	var curTime = OEV.clock.getElapsedTime();
	if (curTime - lastTimeLoadingUpdated > 1) {
		lastTimeLoadingUpdated = curTime;
		if (htmlElmtLoadingDatas['loading_' + _type] === undefined) {
			console.log('not ', _type);
			return false;
		}
		htmlElmtLoadingDatas['loading_' + _type].innerHTML = _nb + " " + _type + " to load";
	}
}

function zoomOut( _value ){
	_value = _value || 1;
	if( OEV.camCtrl.name == 'FPS' ){
		OEV.camCtrl.modAltitude(50);
	}else{
		OEV.camCtrl.setZoomDest(OEV.camCtrl.zoomDest - _value, 200);
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
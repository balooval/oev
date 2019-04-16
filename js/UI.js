import Evt from './oev/event.js';
import * as INPUT from './oev/input.js';
import SKY from './oev/sky.js';

export let dragSun = false;
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
	setElementActiv([this, myContent, myIcon], !isElementActiv(myContent));
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
	elmArray.forEach(e => e.classList.toggle('activ', _state));
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

function hideNotification(){
	var notifBox = document.getElementById( "boxNotification" );
	notifBox.innerHTML = '';
	setElementActiv( notifBox, false );
	notifCloseTimer = -1;
}

export function showUICoords(){
	document.getElementById( "overlayUICoords" ).innerHTML = "<h2>Position</h2>Lon : " + ( Math.round( OEV.camCtrl.coordLookat.x * 1000 ) / 1000 ) + "<br>Lat : " + ( Math.round( OEV.camCtrl.coordLookat.y * 1000 ) / 1000 ) + "<br>Elevation : " + Math.round( OEV.camCtrl.coordLookat.z )+ 'm<br>SunTime: ' + Math.round( SKY.normalizedTime * 24 )+'H';
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
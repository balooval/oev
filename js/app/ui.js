import {Mouse} from '../oev/input/input.js';
import * as TileExtension from '../oev/tileExtensions/tileExtension.js';
import GLOBE from '../oev/globe.js';
import Navigation from './navigation.js';
import * as DataLoader from '../oev/tileExtensions/dataLoader.js';
import MATH from '../oev/utils/math.js';

let elmtCamHeading;
let elmtCoord;
let elmtCurTile;
let lastTimeLoadingUpdated = 0;

const apiUi = {
	dragSun : false, 

	init : function() {
		UiTilesExtension.init();
		GLOBE.evt.addEventListener('READY', null, onGlobeReady);
		elmtCamHeading = document.getElementById("camHeading");
		elmtCoord = document.getElementById("overlayUICoords");
		elmtCurTile = document.getElementById("overlayCurtile");
		Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', null, onMouseDownLeft);
		Mouse.evt.addEventListener('MOUSE_LEFT_UP', null, onMouseUpLeft);
		DataLoader.evt.addEventListener('DATA_LOADED', UiTilesExtension, UiTilesExtension.updateLoadingDatas);
		APP.evt.addEventListener('APP_INIT', null, onAppInit);
		APP.evt.addEventListener('APP_START', null, onAppStart);
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', UiTilesExtension, UiTilesExtension.onExtensionActivate);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', UiTilesExtension, UiTilesExtension.onExtensionDesctivate);
	}, 
		
	setCamera : function(_camCtrl) {
		_camCtrl.evt.addEventListener('ON_ROTATE', null, onCamRotate);
	}, 

	showUICoords : function(_lon, _lat, _ele){
		elmtCoord.innerHTML = 'Lon : ' + (Math.round(_lon * 1000) / 1000) + ', Lat : ' + (Math.round(_lat * 1000) / 1000) + ', Elevation : ' + Math.round(_ele);
	}, 

	listenOnChildsClass : function(_parentId, _event, _childsClass, _callback) {
		var childClass = _childsClass;
		document.getElementById(_parentId).addEventListener(_event, function(_evt) {
			if (_evt.target.classList.contains(childClass)) {
				_callback(_evt);
			}
		}, false);
	}, 

	openModal : function( _content ){
		document.getElementById( "modalContent" ).innerHTML = _content;
		document.getElementById( "modalContainer" ).classList.add( "activ" );
	}, 

	closeModal : function(){
		document.getElementById( "modalContainer" ).classList.remove( "activ" );
		document.getElementById( "modalContent" ).innerHTML = '';
	}, 
};

function onGlobeReady() {
	GLOBE.evt.removeEventListener('READY', null, onGlobeReady);
	document.getElementById('btn-zoom-in').addEventListener('click', () => GLOBE.cameraControler.zoomIn());
	document.getElementById('btn-zoom-out').addEventListener('click', () => GLOBE.cameraControler.zoomOut());
}

function onCamRotate(_radian) {
	elmtCamHeading.style.transform = 'rotate(' + (180 + MATH.degree(_radian)) + 'deg)';
}

function onAppInit() {
	APP.evt.removeEventListener('APP_INIT', null, onAppInit);
	GLOBE.evt.addEventListener('CURTILE_CHANGED', null, onCurTileChanged);
}

function onAppStart() {
	onWaypointsChanged(Navigation.waypoints());
	Navigation.evt.addEventListener('WAYPOINT_ADDED', null, onWaypointsChanged);
}

function onWaypointsChanged(_waypoints) {
	const elmt = document.getElementById('waypointsInfos');
	let html = '';
	_waypoints
	.filter(w => w.showList)
	.forEach((w, i) => {
		html += '<img src="img/ico_waypoint.png" />  <span class="hand waypoint" onclick="APP.gotoWaypoint(' + i + ');" title=" '+ ( Math.round( w.lon * 1000 ) / 1000 ) + " / " + ( Math.round( w.lat * 1000 ) / 1000 ) +'">' + w.name + '</span><br>';
	});
	elmt.innerHTML = html;
	
}

function onCurTileChanged(_evt) {
	elmtCurTile.innerText = 'Z : ' + _evt.z + ', X : ' + _evt.x + ', Y : ' + _evt.y;
}

function onMouseDownLeft() {
	var coordOnGround = GLOBE.screenToSurfacePosition(Mouse.curMouseX, Mouse.curMouseY);
	if (coordOnGround === undefined){
		apiUi.dragSun = true;
	}
}
function onMouseUpLeft() {
	apiUi.dragSun = false;
}


const UiTilesExtension = (function(){
	var api = {
		
		init : function() {
			APP.evt.addEventListener('APP_START', api, api.onAppStart);
		}, 
		
		onAppStart : function() {
			apiUi.listenOnChildsClass('overlayExtensions', 'click', 'extension-switch', api._onClickExtensionSwitch);
			addExtensionsSwitchs();
		}, 
		
		onExtensionDesctivate : function(_evt) {
			document.getElementById('extension-icon-' + _evt).src = 'img/extension-' + _evt.toLocaleLowerCase() + '.png';
		}, 
		onExtensionActivate : function(_evt) {
			document.getElementById('extension-icon-' + _evt).src = 'img/extension-' + _evt.toLocaleLowerCase() + '-active.png';
		}, 

		_onClickExtensionSwitch : function(_evt) {
			var extension = _evt.target.dataset.extension;
			if (extension === undefined) return false;
			if (_evt.target.classList.contains('active')) {
				TileExtension.desactivate(extension);
			} else {
				TileExtension.activate(extension);
				api.updateLoadingDatas({type:extension, nb:'...'})
			}
			_evt.target.classList.toggle('active');
		}, 

		updateLoadingDatas : function(_evt){
			var curTime = APP.clock.getElapsedTime();
			if (_evt.nb > 0 && curTime - lastTimeLoadingUpdated <= 1) return false;
			lastTimeLoadingUpdated = curTime;
			const elmt = document.getElementById('btn-extension-switch-' + _evt.type);
			elmt.dataset.loading_nb = _evt.nb || '';
		}, 
		
	};

	function addExtensionsSwitchs() {
		var iconsExtensions = '';
		const extensionsActives = TileExtension.listActives();
		for (var key in TileExtension.extensions) {
			const active = extensionsActives.includes(key) ? 'active' : '';
			const activeImg = extensionsActives.includes(key) ? '-active' : '';
			iconsExtensions += '<span title="' + key + '" class="floating-btn extension-switch ' + active + '" data-extension="' + key + '" id="btn-extension-switch-' + key + '" data-loading_nb=""><img id="extension-icon-' + key + '" src="img/extension-' + key.toLocaleLowerCase() + activeImg + '.png"/></span>';
		}
		document.getElementById('overlayExtensions').innerHTML += iconsExtensions;
	}
	
	return api;
})();

export {apiUi as default}
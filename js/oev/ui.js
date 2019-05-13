import * as INPUT from './input/input.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import Globe from './globe.js';
import Navigation from './navigation.js';
import * as DataLoader from './dataLoader.js';
import MATH from './utils/math.js';

let elmtCamHeading;
let elmtCoord;
let elmtCurTile;
let lastTimeLoadingUpdated = 0;

const apiUi = {
	dragSun : false, 

	init : function() {
		UiTilesExtension.init();

		/*
		document.getElementById('btn-saveWaypoint').addEventListener('click', () => {
			const lon = OEV.cameraCtrl.coordLookat.x;
			const lat = OEV.cameraCtrl.coordLookat.y;
			const zoom = OEV.cameraCtrl.zoomCur;
			Navigation.saveWaypoint(lon, lat, zoom);
		});
		*/
		document.getElementById('btn-zoom-in').addEventListener('click', () => OEV.cameraCtrl.zoomIn());
		document.getElementById('btn-zoom-out').addEventListener('click', () => OEV.cameraCtrl.zoomOut());
		elmtCamHeading = document.getElementById("camHeading");
		elmtCoord = document.getElementById("overlayUICoords");
		elmtCurTile = document.getElementById("overlayCurtile");
		INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', null, onMouseDownLeft);
		INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_UP', null, onMouseUpLeft);
		DataLoader.evt.addEventListener('DATA_LOADED', UiTilesExtension, UiTilesExtension.updateLoadingDatas);
		OEV.evt.addEventListener('APP_INIT', null, onAppInit);
		OEV.evt.addEventListener('APP_START', null, onAppStart);
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

function onCamRotate(_radian) {
	elmtCamHeading.style.transform = 'rotate(' + (180 + MATH.degree(_radian)) + 'deg)';
}

function onAppInit() {
	OEV.evt.removeEventListener('APP_INIT', null, onAppInit);
	Globe.evt.addEventListener('CURTILE_CHANGED', null, onCurTileChanged);
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
		html += '<img src="img/ico_waypoint.png" />  <span class="hand waypoint" onclick="OEV.gotoWaypoint(' + i + ');" title=" '+ ( Math.round( w.lon * 1000 ) / 1000 ) + " / " + ( Math.round( w.lat * 1000 ) / 1000 ) +'">' + w.name + '</span><br>';
	});
	elmt.innerHTML = html;
	
}

function onCurTileChanged(_evt) {
	elmtCurTile.innerText = 'Z : ' + _evt.z + ', X : ' + _evt.x + ', Y : ' + _evt.y;
}

function onMouseDownLeft() {
	var coordOnGround = OEV.checkMouseWorldPos();
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
			OEV.evt.addEventListener('APP_START', api, api.onAppStart);
		}, 
		
		onAppStart : function() {
			apiUi.listenOnChildsClass('overlayExtensions', 'click', 'extension-switch', api._onClickExtensionSwitch);
			addExtensionsSwitchs();
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
			var curTime = OEV.clock.getElapsedTime();
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
			iconsExtensions += '<span title="' + key + '" class="floating-btn extension-switch ' + active + '" data-extension="' + key + '" id="btn-extension-switch-' + key + '" data-loading_nb=""><img src="img/extension-' + key.toLocaleLowerCase() + '.png"/></span>';
		}
		document.getElementById('overlayExtensions').innerHTML += iconsExtensions;
	}
	
	return api;
})();

export {apiUi as default}
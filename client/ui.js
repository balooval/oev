import {Mouse} from '../app/input/input.js';
import * as TileExtension from '../app/tileExtensions/tileExtension.js';
import * as DataLoader from '../app/tileExtensions/dataLoader.js';
import UiPlane from './uiPlane.js';
import OEV from '../app/app.js';

let elmtCamHeading;
let elmtCoord;
let lastTimeLoadingUpdated = 0;
let params;
let startTime;

const apiUi = {
	dragSun : false, 

	init : function(_params) {
		params = _params;
		startTime = Date.now();
		UiPlane.init();
		Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', null, onMouseDownLeft);
		Mouse.evt.addEventListener('MOUSE_LEFT_UP', null, onMouseUpLeft);
		if (!params.waypoints) {
			document.getElementById('overlayWaypoints').remove();
		}
		if (params.navigation) {
			const navigationContainer = document.getElementById('overlayNavigation');
			createButton(navigationContainer, '<div class="heading" id="camHeading"></div>');
			createButton(navigationContainer, '<img src="img/icon_zoom_out.png"/>', 'btn-zoom-out');
			createButton(navigationContainer, '<img src="img/icon_zoom_in.png"/>', 'btn-zoom-in');
			elmtCamHeading = document.getElementById("camHeading");
		} else {
			document.getElementById('overlayNavigation').remove();
		}
		if (params.extensions) {
			elmtCoord = document.getElementById('overlayUICoords');
			DataLoader.evt.addEventListener('DATA_LOADED', UiTilesExtension, UiTilesExtension.updateLoadingDatas);
			TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', UiTilesExtension, UiTilesExtension.onExtensionActivate);
			TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', UiTilesExtension, UiTilesExtension.onExtensionDesctivate);
			UiTilesExtension.start();
		} else {
			document.getElementById('overlayExtensions').remove();
			document.getElementById('overlayUICoords').remove();
		}
	}, 

	start : function() {
		if (params.waypoints) {
			onWaypointsChanged(OEV.listWaypoints());
		}
		document.getElementById('btn-zoom-in').addEventListener('click', () => OEV.zoomIn());
		document.getElementById('btn-zoom-out').addEventListener('click', () => OEV.zoomOut());
	}, 
		
	setCamera : function(_camCtrl) {
		if (!params.navigation) return;
		_camCtrl.evt.addEventListener('ON_ROTATE', null, onCamRotate);
	}, 

	showUICoords : function(_lon, _lat, _ele){
		if (!params.extensions) return;
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
		document.getElementById('modalContent').innerHTML = _content;
		document.getElementById('modalContainer').classList.add('activ');
	}, 

	closeModal : function(){
		document.getElementById('modalContainer').classList.remove('activ');
		document.getElementById('modalContent').innerHTML = '';
	}, 
};

function createButton(_parent, _content, _id = '', _classes = []) {
	var button = document.createElement('span')
	button.id = _id;
	button.classList.add('floating-btn');
	button.classList.add(..._classes);
	button.innerHTML = _content;
	_parent.appendChild(button);
}

function onCamRotate(_radian) {
	const degree = 180 * _radian / Math.PI;
	elmtCamHeading.style.transform = 'rotate(' + (180 + degree) + 'deg)';
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

function onMouseDownLeft() {
	var coordOnGround = OEV.screenToGroundPos(Mouse.curMouseX, Mouse.curMouseY);
	if (coordOnGround === undefined){
		apiUi.dragSun = true;
	}
}
function onMouseUpLeft() {
	apiUi.dragSun = false;
}


const UiTilesExtension = (function(){
	var api = {
		start : function() {
			apiUi.listenOnChildsClass('overlayExtensions', 'click', 'extension-switch', api._onClickExtensionSwitch);
			addExtensionsSwitchs();
		}, 
		
		onExtensionDesctivate : function(_evt) {
			const elmtIcon = document.getElementById('extension-icon-' + _evt);
			elmtIcon.src = 'img/extension-' + _evt.toLocaleLowerCase() + '.png';
		}, 
		onExtensionActivate : function(_evt) {
			const elmtIcon = document.getElementById('extension-icon-' + _evt);
			elmtIcon.src = 'img/extension-' + _evt.toLocaleLowerCase() + '-active.png';
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
			var curTime = getElapsedTime();
			if (_evt.nb > 0 && curTime - lastTimeLoadingUpdated <= 1) return false;
			lastTimeLoadingUpdated = curTime;
			const elmt = document.getElementById('btn-extension-switch-' + _evt.type);
			elmt.dataset.loading_nb = _evt.nb || '';
		}, 
		
	};

	function getElapsedTime() {
		return Date.now() - startTime;
	}

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
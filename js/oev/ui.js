import * as INPUT from './input/input.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import Globe from './globe.js';

let elmtCamHeading;
let elmtComputingQUeue;
let elmtCoord;
let elmtPlugins;
export let dragSun = false;

function onMouseDownLeft() {
	var coordOnGround = OEV.checkMouseWorldPos();
	if (coordOnGround === undefined){
		dragSun = true;
	}
}
function onMouseUpLeft() {
	dragSun = false;
}

export function setCamera(_camCtrl) {
	_camCtrl.evt.addEventListener('ON_ROTATE', null, onCamRotate);
}

export function showUICoords(){
	elmtCoord.innerHTML = "Lon : " + (Math.round(OEV.camCtrl.coordLookat.x * 1000) / 1000) + "<br>Lat : " + (Math.round(OEV.camCtrl.coordLookat.y * 1000) / 1000) + "<br>Elevation : " + Math.round(OEV.camCtrl.coordLookat.z);
}

function onCamRotate(_evt) {
	elmtCamHeading.style.transform = "rotate("+(180 + (180 * _evt / Math.PI))+"deg)";
}

export function init() {
	TilesExtension.init();
	document.getElementById('cfg_sun_time').addEventListener('input', function() {
		Oev.Sky.setSunTime(this.value / 100);
	});
	document.getElementById('cfg_sun_luminosity').addEventListener('input', function() {
		Oev.Sky.testLuminosity(this.value / 50);
	});
	elmtCamHeading = document.getElementById("camHeading");
	elmtComputingQUeue = document.getElementById('computingQueue');
	elmtCoord = document.getElementById("overlayUICoords");
	elmtPlugins = document.getElementById("overlayPlugins");
	INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', null, onMouseDownLeft);
	INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_UP', null, onMouseUpLeft);
	OEV.evt.addEventListener('APP_INIT', null, onAppInit);
}

function onAppInit() {
	OEV.evt.removeEventListener('APP_INIT', null, onAppInit);
	Globe.evt.addEventListener('CURTILE_CHANGED', null, onCurTileChanged);
}

function onCurTileChanged(_evt) {
	elmtPlugins.innerText = 'Z : ' + _evt.z + ', X : ' + _evt.x + ', Y : ' + _evt.y;
}

export function listenOnChildsClass(_parentId, _event, _childsClass, _callback) {
	var childClass = _childsClass;
	document.getElementById(_parentId).addEventListener(_event, function(_evt) {
		if (_evt.target.classList.contains(childClass)) {
			_callback(_evt);
		}
	}, false);
}

export function setQueueNb(_nb) {
	elmtComputingQUeue.innerHTML = 'compute waiting : ' + _nb;
}

export function openModal( _content ){
	document.getElementById( "modalContent" ).innerHTML = _content;
	document.getElementById( "modalContainer" ).classList.add( "activ" );
}

export function closeModal(){
	document.getElementById( "modalContainer" ).classList.remove( "activ" );
	document.getElementById( "modalContent" ).innerHTML = '';
}

export function updateWaypointsList( _waysPts ){
	document.getElementById( "waypointsInfos" ).innerHTML = "";
	_waysPts
		.filter(w => w.showList)
		.forEach((w, i) => {
			document.getElementById( "waypointsInfos" ).innerHTML = document.getElementById( "waypointsInfos" ).innerHTML + '<span class="hand" onclick="Oev.Navigation.removeWaypoint(' + i + ')">X</span> ' + (i + 1) + ' : <span class="hand waypoint" onclick="OEV.gotoWaypoint(' + i + ');" title=" '+ ( Math.round( w.lon * 1000 ) / 1000 ) + " / " + ( Math.round( w.lat * 1000 ) / 1000 ) +'">' + w.name + '</span><br>';
	});

}

const TilesExtension = (function(){
	'use strict';
	var api = {
		
		init : function() {
			OEV.evt.addEventListener('APP_START', api, api.onAppStart);
		}, 
		
		onAppStart : function() {
			listenOnChildsClass('tools', 'click', 'oev-btn-dataToLoad', api._onExtensionChange);
			addExtensionsSwitchs();
		}, 
		
		_onExtensionChange : function(_evt) {
			var extension = _evt.target.dataset.extension;
			if (extension === undefined) {
				return false;
			}
			if (_evt.target.checked === true) {
				TileExtension.activateExtension(extension);
			} else {
				TileExtension.desactivateExtension(extension);
			}
		}, 
		
	};
	
	function addExtensionsSwitchs() {
		var btnExtensions = '';
		for (var key in Globe.tileExtensions) {
			btnExtensions += '<input id="cfg_load_' + key + '" data-extension="' + key + '" class="oev-btn-dataToLoad" type="checkbox" value="1"> <label for="cfg_load_' + key + '">' + key + '</label><br>';
		}
		document.getElementById('toolsContent_datasToLoad').innerHTML += btnExtensions;
	}
	
	return api;
})();

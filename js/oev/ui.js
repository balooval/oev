import * as INPUT from './input/input.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import Globe from './globe.js';

let elmtCamHeading;
let elmtComputingQUeue;
let elmtCoord;
let elmtPlugins;
export let dragSun = false;

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

export function setCamera(_camCtrl) {
	_camCtrl.evt.addEventListener('ON_ROTATE', null, onCamRotate);
}

export function showUICoords(_lon, _lat, _ele){
	elmtCoord.innerHTML = 'Lon : ' + (Math.round(_lon * 1000) / 1000) + '<br>Lat : ' + (Math.round(_lat * 1000) / 1000) + '<br>Elevation : ' + Math.round(_ele);
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

function onCamRotate(_evt) {
	elmtCamHeading.style.transform = "rotate("+(180 + (180 * _evt / Math.PI))+"deg)";
}


function onAppInit() {
	OEV.evt.removeEventListener('APP_INIT', null, onAppInit);
	Globe.evt.addEventListener('CURTILE_CHANGED', null, onCurTileChanged);
}

function onCurTileChanged(_evt) {
	elmtPlugins.innerText = 'Z : ' + _evt.z + ', X : ' + _evt.x + ', Y : ' + _evt.y;
}

function onMouseDownLeft() {
	var coordOnGround = OEV.checkMouseWorldPos();
	if (coordOnGround === undefined){
		dragSun = true;
	}
}
function onMouseUpLeft() {
	dragSun = false;
}


const TilesExtension = (function(){
	var api = {
		
		init : function() {
			OEV.evt.addEventListener('APP_START', api, api.onAppStart);
			TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', null, onExtensionActivated);
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
	
	function onExtensionActivated(_key) {
		console.log('onExtensionActivated', _key);
		// const elmt = document.getElementById('cfg_load_' + _key);
		// console.log('elmt', elmt);
		// elmt.checked = true;
	}

	function addExtensionsSwitchs() {
		var btnExtensions = '';
		for (var key in Globe.tileExtensions) {
			const checked = TileExtension.Params.activated.includes(key) ? 'checked' : '';
			btnExtensions += '<input ' + checked + ' id="cfg_load_' + key + '" data-extension="' + key + '" class="oev-btn-dataToLoad" type="checkbox" value="1"> <label for="cfg_load_' + key + '">' + key + '</label><br>';
		}
		document.getElementById('toolsContent_datasToLoad').innerHTML += btnExtensions;
	}
	
	return api;
})();

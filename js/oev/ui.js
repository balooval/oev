import * as INPUT from './input/input.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import Globe from './globe.js';
import MATH from './utils/math.js';

let elmtCamHeading;
let elmtCoord;
let elmtPlugins;
let htmlElmtLoadingDatas;
let lastTimeLoadingUpdated = 0;

const apiUi = {
	dragSun : false, 

	init : function() {
		TilesExtension.init();
		const elmtLoading = [
			'TILE2D', 
			'ELE', 
			'BUILDINGS', 
		];
		htmlElmtLoadingDatas = elmtLoading.map(id => document.getElementById('loading_' + id));
		document.getElementById('cfg_sun_time').addEventListener('input', function() {
			Oev.Sky.setSunTime(this.value / 100);
		});
		document.getElementById('cfg_sun_luminosity').addEventListener('input', function() {
			Oev.Sky.testLuminosity(this.value / 50);
		});
		document.getElementById('btn-zoom-in').addEventListener('click', () => OEV.camCtrl.zoomIn());
		document.getElementById('btn-zoom-out').addEventListener('click', () => OEV.camCtrl.zoomOut());
		elmtCamHeading = document.getElementById("camHeading");
		elmtCoord = document.getElementById("overlayUICoords");
		elmtPlugins = document.getElementById("overlayPlugins");
		INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', null, onMouseDownLeft);
		INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_UP', null, onMouseUpLeft);
		OEV.evt.addEventListener('APP_INIT', null, onAppInit);
	}, 

	updateLoadingDatas : function(_type, _nb){
		var curTime = OEV.clock.getElapsedTime();
		if (_nb > 0 && curTime - lastTimeLoadingUpdated <= 1) return false;
		lastTimeLoadingUpdated = curTime;
		htmlElmtLoadingDatas.filter(e => e.id == 'loading_' + _type).forEach(e => e.innerText = _nb + ' ' + _type + ' to load');
	}, 
		
	setCamera : function(_camCtrl) {
		_camCtrl.evt.addEventListener('ON_ROTATE', null, onCamRotate);
	}, 

	showUICoords : function(_lon, _lat, _ele){
		elmtCoord.innerHTML = 'Lon : ' + (Math.round(_lon * 1000) / 1000) + '<br>Lat : ' + (Math.round(_lat * 1000) / 1000) + '<br>Elevation : ' + Math.round(_ele);
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

	updateWaypointsList : function( _waysPts ){
		document.getElementById( "waypointsInfos" ).innerHTML = "";
		_waysPts
			.filter(w => w.showList)
			.forEach((w, i) => {
				document.getElementById( "waypointsInfos" ).innerHTML = document.getElementById( "waypointsInfos" ).innerHTML + '<span class="hand" onclick="Oev.Navigation.removeWaypoint(' + i + ')">X</span> ' + (i + 1) + ' : <span class="hand waypoint" onclick="OEV.gotoWaypoint(' + i + ');" title=" '+ ( Math.round( w.lon * 1000 ) / 1000 ) + " / " + ( Math.round( w.lat * 1000 ) / 1000 ) +'">' + w.name + '</span><br>';
		});
	}, 
};

function onCamRotate(_radian) {
	elmtCamHeading.style.transform = 'rotate(' + (180 + MATH.degree(_radian)) + 'deg)';
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
		apiUi.dragSun = true;
	}
}
function onMouseUpLeft() {
	apiUi.dragSun = false;
}


const TilesExtension = (function(){
	var api = {
		
		init : function() {
			OEV.evt.addEventListener('APP_START', api, api.onAppStart);
			TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', null, onExtensionActivated);
		}, 
		
		onAppStart : function() {
			apiUi.listenOnChildsClass('tools', 'click', 'oev-btn-dataToLoad', api._onExtensionChange);
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

export {apiUi as default}
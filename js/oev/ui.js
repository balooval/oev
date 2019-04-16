import * as TileExtension from './tileExtensions/tileExtension.js';

export function init() {
	TilesExtension.init();
	document.getElementById('cfg_sun_time').addEventListener('input', function() {
		Oev.Sky.setSunTime(this.value / 100);
	});
	document.getElementById('cfg_sun_luminosity').addEventListener('input', function() {
		Oev.Sky.testLuminosity(this.value / 50);
	});
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
	document.getElementById('computingQueue').innerHTML = 'compute waiting : ' + _nb;
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
		for (var key in OEV.earth.tileExtensions) {
			btnExtensions += '<input id="cfg_load_' + key + '" data-extension="' + key + '" class="oev-btn-dataToLoad" type="checkbox" value="1"> <label for="cfg_load_' + key + '">' + key + '</label><br>';
		}
		document.getElementById('toolsContent_datasToLoad').innerHTML += btnExtensions;
	}
	
	return api;
})();

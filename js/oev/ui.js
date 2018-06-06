Oev.Ui = (function(){
	'use strict';
	var api = {
		
		init : function() {
			Oev.Ui.TilesExtension.init();
			
			document.getElementById('cfg_sun_time').addEventListener('input', function() {
				Oev.Sky.setSunTime(this.value / 100);
			});
			
			document.getElementById('cfg_sun_luminosity').addEventListener('input', function() {
				Oev.Sky.testLuminosity(this.value / 50);
				// skyParamsNew.sunLuminosity
			});
			
			
			
		}, 
		
		listenOnChildsClass : function(_parentId, _event, _childsClass, _callback) {
			var childClass = _childsClass;
			document.getElementById(_parentId).addEventListener(_event, function(_evt) {
				if (_evt.target.classList.contains(childClass)) {
					_callback(_evt);
				}
			}, false);
		}, 
		
		setQueueNb : function(_nb) {
			document.getElementById('computingQueue').innerHTML = 'compute waiting : ' + _nb;
		}, 
		
	};
	
	return api;
})();


Oev.Ui.TilesExtension = (function(){
	'use strict';
	var api = {
		
		init : function() {
			OEV.evt.addEventListener('APP_START', api, api.onAppStart);
		}, 
		
		onAppStart : function() {
			Oev.Ui.listenOnChildsClass('tools', 'click', 'oev-btn-dataToLoad', api._onExtensionChange);
			addExtensionsSwitchs();
		}, 
		
		_onExtensionChange : function(_evt) {
			var extension = _evt.target.dataset.extension;
			if (extension === undefined) {
				return false;
			}
			if (_evt.target.checked === true) {
				Oev.Tile.Extension.activateExtension(extension);
			} else {
				Oev.Tile.Extension.desactivateExtension(extension);
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
Oev.Ui = (function(){
	'use strict';
	var api = {
		
		init : function() {
			Oev.Ui.TilesExtension.init();
		}, 
		
		listenOnChildsClass : function(_parentId, _event, _childsClass, _callback) {
			var childClass = _childsClass;
			document.getElementById(_parentId).addEventListener(_event, function(_evt) {
				if (_evt.target.classList.contains(childClass)) {
					_callback(_evt);
				}
			}, false);
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
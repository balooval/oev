Oev.Ui = (function(){
	'use strict';
	var api = {
		
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
		
		onExtensionChange : function(_evt) {
			var extension = _evt.target.dataset.extension;
			if (extension === undefined) {
				return false;
			}
			console.log('checked', extension);
			Oev.Tile.Extension.toggleExtension(extension, _evt.target.checked);
		}, 
		
	};
	
	return api;
})();
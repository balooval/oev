Oev.Net = (function(){
	'use strict';
	
	var api = {
		init : function() {
			OEV.evt.addEventListener('APP_INIT', api, api.onAppInit);
			// OEV.evt.addEventListener('APP_START', api, api.onAppStart);
		}, 
		
		onAppInit : function() {
			Oev.Net.Textures.onAppInit();
			Oev.Net.Models.onAppInit();
		}, 
	};
	
	return api;
})();
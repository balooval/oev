Oev.Net.Textures = (function(){
	'use strict';
	
	var textureLoader = null;
	var batchs = [];
	var curBatch = null;
	var textLoaded = {};
	
	var api = {
		tmpGetTextures : function() {
			return textLoaded;
		}, 
		
		onAppInit : function() {
			textureLoader = new THREE.TextureLoader();
			textLoaded = {};
		}, 
		
		addToList : function(_list, _id, _url) {
			_list.push({id:_id, url:_url});
		}, 
		
		loadFile : function(_id, _url, _callback) {
			api.loadBatch([{id:_id, url:_url}], _callback);
		}, 
		
		loadBatch : function(_list, _callback) {
			var batch = {
				callback : _callback, 
				list : _list, 
			};
			batchs.push(batch);
			if (curBatch === null) {
				loadNextBatch();
			}
		}, 
	};
	
	function loadNextBatch() {
		if (batchs.length == 0) {
			curBatch = null;
			return false;
		}
		curBatch = batchs.shift();
		loadNextTexture();
	}
	
	function loadNextTexture() {
		var nextText = curBatch.list.shift();
		textureLoader.load(
			'assets/textures/' + nextText.url, 
			function(t){
				textLoaded[nextText.id] = t;
				textLoaded[nextText.id].wrapS = textLoaded[nextText.id].wrapT = THREE.RepeatWrapping;
				if (curBatch.list.length == 0) {
					curBatch.callback();
					loadNextBatch();
				}else{
					loadNextTexture();
				}
			}, 
			function(xhr) {
				
			},
			function(xhr) {
				console.warn( 'Oev.Net.Textures error for loading', nextText.url );
			}
		);
	}
	
	return api;
})();
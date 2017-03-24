Oev.Rtt = Oev.Model || {};

Oev.Rtt = (function(){
	'use strict';
	var bufferTexture;
	var bufferScene;
	var camera;
	var renderer;
	var cube;
	
	var api = {
		init : function(_renderer) {
			renderer = _renderer;
			bufferScene = new THREE.Scene();
			bufferTexture = new THREE.WebGLRenderTarget(512, 512, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
			camera = new THREE.PerspectiveCamera( 70, 512/512, 1, 1000 );
			
			camera.position.z = 5;
			var geometry = new THREE.BoxGeometry( 1, 1, 1 );
			var material = new THREE.MeshBasicMaterial( { color: 0x00ff00, transparent : true, alphaTest:0.9 } );
			cube = new THREE.Mesh(geometry, material);
			bufferScene.add(cube);
		}, 
		
		render : function() {
			// renderer.setClearColor( 0xff0000, 0.5 );
			// renderer.setViewport(0, 0, 256, 256);
			renderer.autoClear = false;
			renderer.render(bufferScene, camera, bufferTexture, false);
			// renderer.setViewport(256, 0, 256, 512);
			// renderer.setClearAlpha(0);
			cube.position.x = 1;
			cube.rotation.y = 0.5;
			renderer.render(bufferScene, camera, bufferTexture, false);
			// renderer.setViewport(0, 0, OEV.sceneWidth, OEV.sceneHeight);
			renderer.setClearColor( 0x101020, 1 );
		}, 
		
		getTexture : function() {
			return bufferTexture.texture;
		}, 
	}
	
	return api;
})();
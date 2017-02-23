
var Rtt = (function(){
	'use strict';
	var bufferTexture;
	var bufferScene;
	var camera;
	var renderer;
	var cube;
	var noze;
	
	var textureW = 1024;
	var textureH = 1024;
	
	var api = {
		init : function(_renderer) {
			renderer = _renderer;
			bufferScene = new THREE.Scene();
			bufferTexture = new THREE.WebGLRenderTarget(textureW, textureH, {
				minFilter: THREE.LinearFilter, 
				magFilter: THREE.LinearFilter, 
				anisotropy: renderer.getMaxAnisotropy(), 
			});
			// console.log(bufferTexture.viewport);
			camera = new THREE.PerspectiveCamera( 70, textureW/textureH, 1, 1000 );
			camera.position.y = 2;
			camera.position.z = 5;
			
			var light = new THREE.PointLight(0xffffff, 1, 100);
			light.position.set( 3, 5, 30 );
			bufferScene.add(light);
			
			var material = new THREE.MeshPhongMaterial( { color: 0x00ff00});
			var geometry = new THREE.BoxGeometry( 3, 3, 3 );
			cube = new THREE.Mesh(geometry, material);
			bufferScene.add(cube);
			
			var material = new THREE.MeshPhongMaterial( { color: 0x0000ff});
			var geometry = new THREE.BoxGeometry( 1, 1, 4 );
			noze = new THREE.Mesh(geometry, material);
			noze.position.z = 1;
			cube.add(noze);
			
			camera.lookAt(cube.position);
			
			
			
			
			
			api.shader(-3.15);
			api.shader(-1.5);
			api.shader(0);
			api.shader(1.7);
			api.shader(3.15);
		}, 
		
		shader : function(_test) {
			var pi = 3.14;
			var tilesNb = 4.0;
			var tileW = 1 / tilesNb;
			var tileIndex = (_test + pi) / (pi * 2.0);
			console.log('_test', _test);
			console.log('tileW', tileW);
			console.log('A', tileIndex);
			console.log('B', Math.round(tileIndex / tileW) * tileW);
			console.log('C', Math.floor((tileIndex / tileW) + 0.5) * tileW);
			// console.log('C', (1 / tileIndex));
			console.log('');
			// tileIndex = (tileIndex * 100.0 % tilesNb) / 100.0;
			// console.log('tileIndex', tileIndex);
		}, 
		
		crop : function(_x, _y, _w, _h, _col) {
			// renderer.setClearColor( _col, 0.6 );
			bufferTexture.scissorTest = true;
			bufferTexture.scissor.x = _x;
			bufferTexture.scissor.z = _w;
			bufferTexture.scissor.y = _y;
			bufferTexture.scissor.w = _h;
			bufferTexture.viewport.x = _x;
			bufferTexture.viewport.z = _w;
			bufferTexture.viewport.y = _y;
			bufferTexture.viewport.w = _h;
		}, 
		
		render : function() {
			renderer.setClearColor( 0x208080, 0.0 );
			// renderer.setViewport(0, 0, 256, 256);
			//renderer.autoClear = false;
			
			
			var nbTileW = 16;
			var nbTileH = 1;
			var tileW = textureW / nbTileW;
			var tileH = textureH / nbTileH;
			var tilesNb = nbTileW * nbTileH;
			var stepAngle = (Math.PI * 2) / tilesNb;
			var cols = [0xff0000, 0x00ff00, 0x0000ff, 0xffffff];
			for (var j = 0; j < nbTileH; j ++) {
				for (var i = 0; i < nbTileW; i ++) {
					cube.rotation.y += stepAngle;
					// noze.rotation.y -= stepAngle;
					api.crop(i * tileW, j * tileH, tileW, tileH, cols[i]);
					renderer.render(bufferScene, camera, bufferTexture, false);
				}
			}
			renderer.setClearColor( 0x606060, 1 );
		}, 
		
		getTexture : function() {
			return bufferTexture.texture;
		}, 
	}
	
	return api;
})();
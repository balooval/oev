
var Rtt = (function(){
	'use strict';
	var bufferTexture;
	var bufferScene;
	var camera;
	var renderer;
	var cube;
	var noze;
	var hairs;
	var barPrct;
	
	var textureW = 2048;
	var textureH = 2048;
	
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
			camera.position.y = 3;
			camera.position.z = 5;
			
			var light = new THREE.PointLight(0xffffff, 1, 100);
			light.position.set( 3, 10, 10 );
			bufferScene.add(light);
			var lightAmbiant = new THREE.AmbientLight(0x303030);
			bufferScene.add(lightAmbiant);
			
			var material = new THREE.MeshPhongMaterial( { color: 0x00ff00});
			var geometry = new THREE.BoxGeometry( 3, 3, 3 );
			cube = new THREE.Mesh(geometry, material);
			bufferScene.add(cube);
			
			var material = new THREE.MeshPhongMaterial( { color: 0x0000ff});
			var geometry = new THREE.BoxGeometry( 1, 1, 4 );
			noze = new THREE.Mesh(geometry, material);
			noze.position.z = 1;
			cube.add(noze);
			
			
			var material = new THREE.MeshPhongMaterial( { color: 0xff0000});
			var geometry = new THREE.BoxGeometry( 4, 1, 1 );
			hairs = new THREE.Mesh(geometry, material);
			hairs.position.x = 1;
			cube.add(hairs);
			
			
			var material = new THREE.MeshPhongMaterial( { color: 0xffffff});
			var geometry = new THREE.BoxGeometry( 50, 0.3, 0.3 );
			barPrct = new THREE.Mesh(geometry, material);
			barPrct.position.x = -28;
			barPrct.position.y = 3;
			// bufferScene.add(barPrct);

			camera.lookAt(cube.position);
		}, 
		
		shaderV : function(_tileX) {
			var nbH = 16;
			var nbV = 2;
			var tileY = Math.floor(_tileX / (nbH / nbV));
			tileY /= nbV;
			console.log('B', tileY);
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
			console.log('');
		}, 
		
		crop : function(_x, _y, _w, _h, _col, _alpha) {
			// renderer.setClearColor( _col, _alpha );
			renderer.setClearColor( _col, 0 );
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
			
			
			var nbTileW = 32;
			var nbTileH = 32;
			var tileW = textureW / nbTileW;
			var tileH = textureH / nbTileH;
			var tilesNb = nbTileW * nbTileH;
			var stepAngle = (Math.PI * 2) / nbTileW;
			var stepAngleV = (Math.PI / 2) / nbTileH;
			var curAngle = 0;
			var cols = [0xffff00, 0xff00ff, 0x0000ff, 0xffffff];
			var alphas = [0.4, 0.6, 0.8, 1];
			
			
			var distH = 5;
			
			for (var j = 0; j < nbTileH; j ++) {
				curAngle = 0;
				distH = Math.cos(stepAngleV * j) * 5;
				// console.log('distH', distH);
				camera.position.y = Math.sin(stepAngleV * j) * 5;
				for (var i = 0; i < nbTileW; i ++) {
					camera.position.x = Math.cos(curAngle) * distH;
					camera.position.z = Math.sin(curAngle) * distH;
					camera.lookAt(cube.position);
					curAngle += stepAngle;
					api.crop(i * tileW, j * tileH, tileW, tileH, cols[j], alphas[i]);
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

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
	
	var textureW = 1024;
	var textureH = 1024;
	
	var api = {
		tilesX : 8, 
		tilesY : 8, 
		
		setTilesNb : function(_x, _y) {
			api.tilesX = _x;
			api.tilesY = _y;
		}, 
		
		setTextureSize : function(_x, _y) {
			textureW = _x;
			textureH = _y;
		}, 
	
		init : function(_renderer) {
			renderer = _renderer;
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
			bufferScene = new THREE.Scene();
			bufferTexture = new THREE.WebGLRenderTarget(textureW, textureH, {
				minFilter: THREE.LinearFilter, 
				magFilter: THREE.LinearFilter, 
				anisotropy: renderer.getMaxAnisotropy(), 
			});
			camera = new THREE.PerspectiveCamera( 70, textureW/textureH, 1, 1000 );
			camera.position.y = 3;
			camera.position.z = 5;
			
			var light = new THREE.PointLight(0xffffff, 1, 100);
			light.castShadow = true;
			light.position.set( 3, 10, 10 );
			bufferScene.add(light);
			var lightAmbiant = new THREE.AmbientLight(0x303030);
			bufferScene.add(lightAmbiant);
			
			var material = new THREE.MeshPhongMaterial( { color: 0x634115});
			var geometry = new THREE.BoxGeometry( 0.5, 2, 0.5 );
			cube = new THREE.Mesh(geometry, material);
			cube.castShadow = true;
			cube.receiveShadow = true;
			bufferScene.add(cube);
			
			
			var materialBranch = new THREE.MeshPhongMaterial( { color: 0x84aa11});
			var leafSize = 0.3;
			var geometryBranch = new THREE.BoxGeometry(leafSize, leafSize, leafSize);
			var leafStartY = 0.8;
			var leafDistribution = 2;
			var leafDistributionY = 0.7;
			for (var b = 0; b < 40; b ++) {
				var branch = new THREE.Mesh(geometryBranch, materialBranch);
				branch.position.x = Math.random() * leafDistribution - leafDistribution / 2;
				branch.position.y = leafStartY + Math.random() * leafDistributionY - leafDistributionY / 2;
				branch.position.z = Math.random() * leafDistribution - leafDistribution / 2;
				branch.castShadow = true;
				branch.receiveShadow = true;
				cube.add(branch);
			}
			
			
			camera.lookAt(cube.position);
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
			var nbTileW = api.tilesX;
			var nbTileH = api.tilesY;
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
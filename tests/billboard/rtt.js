
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
	var materialDepth;
	
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
			camera = new THREE.PerspectiveCamera( 70, textureW/textureH, 1, 10000 );
			camera.position.y = 30;
			camera.position.z = 50;
			materialDepth = new THREE.MeshDepthMaterial();
			
			var light = new THREE.PointLight(0xffffff, 1, 1000);
			light.castShadow = true;
			light.position.set( 20, 100, -50 );
			/*
			light.shadow.camera.far = 1000;
			light.shadow.camera.near = 1;
			*/
			light.shadow.mapSize.width = 2048;
			light.shadow.mapSize.height = 2048;
			
			bufferScene.add(light);
			var lightAmbiant = new THREE.AmbientLight(0x303030);
			bufferScene.add(lightAmbiant);
			
			var material = new THREE.MeshPhongMaterial( { color: 0xffffff});
			var geometry = new THREE.BoxGeometry(1, 1, 1);
			cube = new THREE.Mesh(geometry, material);
			cube.castShadow = true;
			cube.receiveShadow = true;
			bufferScene.add(cube);
			
			
			
			
			// api.buildGround();
			
			api.buildTree();

			camera.lookAt(cube.position);
		}, 
		
		buildGround : function() {
			var geoGround = new THREE.BoxGeometry( 100, 1, 100 );
			var ground = new THREE.Mesh(geoGround, material);
			cube.add(ground);
		}, 
		
		buildTree : function() {
			var materialTrunk = new THREE.MeshPhongMaterial( { color: 0x806020});
			var geoTrunk = new THREE.BoxGeometry( 5, 20, 5 );
			var trunkMesh = new THREE.Mesh(geoTrunk, materialTrunk);
			trunkMesh.position.y = 10;
			trunkMesh.castShadow = true;
			trunkMesh.receiveShadow = true;
			bufferScene.add(trunkMesh);
			
			var materialLeaf = new THREE.MeshPhongMaterial( { color: 0xa2e504, side: THREE.DoubleSide,});
			var leafSize = 3;
			var leafStartY = 6;
			var leafDistribution = 20;
			var leafDistributionY = 4;
			
			var leafGeo = new THREE.BoxGeometry( 10, 0.4, 10 );
			var nbLeaves = 100;
			for (var b = 0; b < nbLeaves; b ++) {
				var branch = new THREE.Mesh(leafGeo, materialLeaf);
				branch.position.y = leafStartY + (b / nbLeaves) * 15;
				branch.rotation.y = Math.random() * Math.PI * 2;
				var leafScale = (nbLeaves - (b*0.8)) / (nbLeaves * 0.7);
				branch.scale.multiplyScalar(leafScale * (0.7 + Math.random() * 0.9));
				branch.castShadow = true;
				branch.receiveShadow = true;
				bufferScene.add(branch);
			}
		}, 
		
		
		crop : function(_x, _y, _w, _h, _col, _alpha) {
			// renderer.setClearColor( _col, 0.8 );
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
			var cols = [0xff0000, 0x00ff00, 0x0000ff, 0x000000];
			var alphas = [0.4, 0.6, 0.8, 1];
			var distH = 50;
			var camTarget = new THREE.Vector3(0, 25, 0);
			for (var j = 0; j < nbTileH; j ++) {
				curAngle = 0;
				distH = Math.cos(stepAngleV * j) * 50;
				camera.position.y = Math.sin(stepAngleV * j) * 50;
				for (var i = 0; i < nbTileW; i ++) {
					camera.position.x = Math.cos(curAngle) * distH;
					camera.position.z = Math.sin(curAngle) * distH;
					camera.lookAt(camTarget);
					curAngle += stepAngle;
					api.crop(i * tileW, j * tileH, tileW, tileH, cols[i%4], alphas[j%4]);
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
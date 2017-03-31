
var Rtt = (function(){
	'use strict';
	var textureDepth;
	var bufferTexture;
	var curTexture;
	
	var bufferScene;
	var camera;
	var renderer;
	var cube;
	var noze;
	var hairs;
	var barPrct;
	var materialDepth;
	
	var meshTree = null;
	var meshGround = null;
	
	var textureW = 2048;
	var textureH = 2048;
	
	var useDepthMat = false;
	
	var api = {
		tilesX : 4, 
		tilesY : 4, 
		
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
			textureDepth = new THREE.WebGLRenderTarget(textureW, textureH, {
				minFilter: THREE.LinearFilter, 
				magFilter: THREE.LinearFilter, 
				anisotropy: renderer.getMaxAnisotropy(), 
			});
			camera = new THREE.PerspectiveCamera( 70, textureW/textureH, 1, 10000 );
			camera.position.y = 30;
			camera.position.z = 50;
			
			materialDepth = new THREE.ShaderMaterial({  
				uniforms: {
					
				},
				vertexShader: document.getElementById('vertexDepth').textContent,
				fragmentShader: document.getElementById('fragmentDepth').textContent, 
			});

			var light = new THREE.PointLight(0xffffff, 1, 1000);
			light.castShadow = true;
			light.position.set( 20, 50, -30 );
			light.shadow.mapSize.width = 1024;
			light.shadow.mapSize.height = 1024;
			bufferScene.add(light);
			
			var backLight = new THREE.PointLight(0x505060, 1, 1000);
			backLight.castShadow = true;
			backLight.position.set( -10, 5, 30 );
			backLight.shadow.mapSize.width = 512;
			backLight.shadow.mapSize.height = 512;
			bufferScene.add(backLight);
			
			var lightAmbiant = new THREE.AmbientLight(0x303030);
			bufferScene.add(lightAmbiant);
			
			var material = new THREE.MeshPhongMaterial( { color: 0xffffff});
			var geometry = new THREE.BoxGeometry(1, 1, 1);
			cube = new THREE.Mesh(geometry, material);
			cube.castShadow = true;
			cube.receiveShadow = true;
			bufferScene.add(cube);
			
			// api.buildGround();
			// api.buildTree();

			camera.lookAt(cube.position);
		}, 
		
		buildGround : function() {
			if (meshGround !== null) {
				bufferScene.remove(meshGround);
			}
			var matGround = new THREE.MeshPhongMaterial( { color: 0xffffff});
			if (useDepthMat) {
				matGround = materialDepth;
			}
			var geoGround = new THREE.BoxGeometry( 100, 1, 100 );
			meshGround = new THREE.Mesh(geoGround, matGround);
			bufferScene.add(meshGround);
		}, 
		
		buildTree : function() {
			
			if (meshTree !== null) {
				bufferScene.remove(meshTree);
			}
			meshTree = new THREE.Mesh();
			bufferScene.add(meshTree);
			
			var materialTrunk = new THREE.MeshPhongMaterial( { color: 0x806020});
			var materialLeaf = new THREE.MeshPhongMaterial( { color: 0x528721, side: THREE.DoubleSide,});
			if (useDepthMat) {
				materialTrunk = materialDepth;
				materialLeaf = materialDepth;
			}
			var geoTrunk = new THREE.BoxGeometry( 5, 20, 5 );
			var trunkMesh = new THREE.Mesh(geoTrunk, materialTrunk);
			trunkMesh.position.y = 10;
			trunkMesh.castShadow = true;
			trunkMesh.receiveShadow = true;
			meshTree.add(trunkMesh);
			
			// var materialLeaf = new THREE.MeshPhongMaterial( { color: 0x528721, side: THREE.DoubleSide,});
			// var materialLeaf = new THREE.MeshNormalMaterial();
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
				meshTree.add(branch);
			}
		}, 
		
		
		crop : function(_x, _y, _w, _h, _col, _alpha) {
			// renderer.setClearColor( 0x506090, 0.0 );
				renderer.setClearColor( _col, 0.6 );
			if (useDepthMat) {
				// renderer.setClearColor( _col, 0 );
				// renderer.setClearColor( 0x303030, 1.0 );
				// renderer.setClearColor( 0xffffff, 1.0 );
			}
			curTexture.scissorTest = true;
			curTexture.scissor.x = _x;
			curTexture.scissor.z = _w;
			curTexture.scissor.y = _y;
			curTexture.scissor.w = _h;
			curTexture.viewport.x = _x;
			curTexture.viewport.z = _w;
			curTexture.viewport.y = _y;
			curTexture.viewport.w = _h;
		}, 
		
		render : function(_mode) {
			useDepthMat = false;
			curTexture = bufferTexture;
			if (_mode == 'DEPTH') {
				useDepthMat = true;
				curTexture = textureDepth;
			}
			console.log('useDepthMat', useDepthMat);
			// api.buildGround();
			api.buildTree();
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
					renderer.render(bufferScene, camera, curTexture, false);
				}
			}
			renderer.setClearColor( 0x606060, 1 );
		}, 
		
		getTexture : function() {
			return bufferTexture.texture;
		}, 
		
		getTextureDepth : function() {
			return textureDepth.texture;
		}, 
	}
	
	return api;
})();
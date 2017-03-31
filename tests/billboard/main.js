var Main = (function() {
	var scene;
    var renderer;
	var camera;
	var shaderMatTest;
	var controls;
	var textureDyn;
	var textureDynDepth;
	var time;
	var meshBillboard;
	var light;
	var matParallax;
	
	var api = {
		
		init : function() {
			renderer = new THREE.WebGLRenderer({
				antialias: true
			});
			renderer.setClearColor(0x000000);
			document.body.appendChild(renderer.domElement);
			camera = new THREE.PerspectiveCamera(55, 1, 0.1, 40000);
			window.onresize = function () {
				renderer.setSize(window.innerWidth, window.innerHeight);
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
			};
			window.onresize();
			scene = new THREE.Scene();
			camera.position.z = 25;
			camera.position.y = 15;
			scene.add(camera);
			var grid = new THREE.GridHelper(100, 10);
			scene.add(grid);
			controls = new THREE.OrbitControls(camera);
			controls.damping = 0.2;


			createBillboardAtlas();
			setMatParallax();
			setMatBillboard();
			// addMeshTexture();
			
			meshBillboard = addBillboard();
			time = 0;
		}, 
		
		start : function() {
			animate();
		}, 
	};
	
	
	function createBillboardAtlas() {
		// Rtt.setTilesNb(1, 1);
		// Rtt.setTextureSize(2048, 2048);
		Rtt.init(renderer);
		Rtt.render();
		textureDyn = Rtt.getTexture();
		Rtt.render('DEPTH');
		textureDynDepth = Rtt.getTextureDepth();
	}
	
	function setMatBillboard() {
		shaderMatTest = new THREE.ShaderMaterial({  
			uniforms: {
				texture: { type:'t', value: textureDyn}, 
				tilesNbW : { value: Rtt.tilesX}, 
				tilesNbH : { value: Rtt.tilesY}, 
				tilePrctH : { value: 1.0 / Rtt.tilesX}, 
				tilePrctV : { value: 1.0 / Rtt.tilesY}, 
				meshPosX : { value : 0}, 
				meshPosZ : { value : 0}, 
				sunPos : { value : new THREE.Vector3(25, 30, 20)}, 
				sunX : { value : 25}, 
				sunY : { value : 30}, 
				sunZ : { value : 20}, 
			},
			vertexShader: document.getElementById('vertexTest').textContent,
			// fragmentShader: document.getElementById('fragmentDebug').textContent, 
			// fragmentShader: document.getElementById('fragment').textContent, 
			fragmentShader: document.getElementById('fragmentBlend').textContent, 
			// fragmentShader: document.getElementById('fragmentLight').textContent, 
			side: THREE.DoubleSide,
			transparent: true, 
			alphaTest: 0.9,
		});
	}
	function setMatParallax() {
		var shader = THREE.ParallaxShader;
		var uniforms = THREE.UniformsUtils.clone( shader.uniforms );
		var parameters = {
			fragmentShader: document.getElementById('fragmentParallel').textContent,
			vertexShader: document.getElementById('vertexParallel').textContent,
			uniforms: uniforms, 
			transparent: true, 
		};
		matParallax = new THREE.ShaderMaterial( parameters );
		matParallax.map = textureDyn;
		// matParallax.map = textureDynDepth;
		matParallax.bumpMap = textureDynDepth;
		matParallax.map.anisotropy = 4;
		matParallax.bumpMap.anisotropy = 4;
		uniforms[ 'map' ].value = matParallax.map;
		uniforms[ 'bumpMap' ].value = matParallax.bumpMap;
		
		uniforms[ 'parallaxScale' ].value = -1.2;
		uniforms[ 'parallaxMinLayers' ].value = 5;
		uniforms[ 'parallaxMaxLayers' ].value = 25;

		matParallax.defines = {};
		matParallax.defines['USE_RELIEF_PARALLAX'] = '';
		matParallax.needsUpdate = true;
	}
	
	function addMeshTexture() {
		var geometry = new THREE.PlaneGeometry( 10, 10, 1 );
		var plane = new THREE.Mesh(geometry, matParallax);
		scene.add( plane );
	}
	
	function addBillboard() {
		var billGeom = Billboard.buildGeometry();
		// var billMesh = new THREE.Mesh(billGeom, matParallax);
		var billMesh = new THREE.Mesh(billGeom, shaderMatTest);
		scene.add(billMesh);
		return billMesh;
	}
	
    function animate() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate, renderer.domElement);
		time += 0.02;
		// meshBillboard.position.x = Math.cos(time) * 20;
		// console.log(camera.position.x);
		shaderMatTest.uniforms.meshPosX.value = meshBillboard.position.x;
		shaderMatTest.uniforms.meshPosZ.value = meshBillboard.position.z;
    }
	
	return api;
    
})();
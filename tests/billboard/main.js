var Main = (function() {
	var scene;
    var renderer;
	var camera;
	var shaderMatTest;
	var controls;
	var textureDyn;
	var time;
	var meshBillboard;
	
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
			// addMeshTexture();
			
			shaderMatTest = new THREE.ShaderMaterial({  
				uniforms: {
					texture: { type:'t', value: textureDyn}, 
					tilesNbW : { value: Rtt.tilesX}, 
					tilesNbH : { value: Rtt.tilesY}, 
					tilePrctH : { value: 1.0 / Rtt.tilesX}, 
					tilePrctV : { value: 1.0 / Rtt.tilesY}, 
					meshPosX : { value : 0}, 
					meshPosZ : { value : 0}, 
				},
				vertexShader: document.getElementById('vertexTest').textContent,
				// fragmentShader: document.getElementById('fragmentDebug').textContent, 
				// fragmentShader: document.getElementById('fragment').textContent, 
				fragmentShader: document.getElementById('fragmentBlend').textContent, 
				side: THREE.DoubleSide,
				transparent: true, 
				alphaTest: 0.9,
			});
			meshBillboard = addBillboard();
			time = 0;
		}, 
		
		start : function() {
			animate();
		}, 
	};
	
	
	function createBillboardAtlas() {
		Rtt.setTilesNb(16, 16);
		Rtt.setTextureSize(1024, 1024);
		Rtt.init(renderer);
		Rtt.render();
		textureDyn = Rtt.getTexture();
	}
	
	function addMeshTexture() {
		var geometry = new THREE.PlaneGeometry( 10, 10, 1 );
		var material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: textureDyn, side: THREE.DoubleSide} );
		var plane = new THREE.Mesh( geometry, material );
		plane.position.y = 5;
		scene.add( plane );
	}
	
	function addBillboard() {
		var billGeom = Billboard.buildGeometry();
		var billMesh = new THREE.Mesh(billGeom, shaderMatTest);
		// billMesh.position.y = 1;
		scene.add(billMesh);
		return billMesh;
	}
	
    function animate() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate, renderer.domElement);
		time += 0.005;
		//meshBillboard.position.x = Math.cos(time) * 50;
		// console.log(camera.position.x);
		shaderMatTest.uniforms.meshPosX.value = meshBillboard.position.x;
		shaderMatTest.uniforms.meshPosZ.value = meshBillboard.position.z;
    }
	
	return api;
    
})();
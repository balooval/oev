var OpenEarthViewer = function ( _containerId ) {
	this.appStarted = false;
	this.htmlContainer = _containerId;
	this.sceneWidth = 400;
	this.sceneHeight = 300;
	this.scene;
	this.camera;
	this.renderer;
	this.containerOffset = undefined;
	this.tileLoader = new THREE.TextureLoader();
	this.earth;
	this.evt = new Oev.Utils.Evt();
	this.textures = {};
	this.modelsLib = {};
	this.geoDebug = undefined;
	this.postprocessing = {};
	this.materialPOILine;
	this.ctrlActiv = false;
	this.bokehPass;
	this.MUST_RENDER = true;
	this.MODELS_CFG;
	this.showRendererInfos = false;
	this.raycaster = undefined;
	this.clock = null;
	this.preloadQuery = [];
	this.camCtrl = null;
	this.userMat = undefined;
	this.waypoints = [];
	this.plugins = [];
	this.WpStored = [];
	this.shadowsEnabled = true;
	this.objToUpdate = [];
	this.globalTime = 0;
	this.mouseScreenClick = new THREE.Vector2( 0, 0 );
	this.socketEnabled = false;
	this.aMeshMirror = undefined;
	this.tuniform = {
		iGlobalTime: {
			type: 'f',
			value: 0.1
		}
	};
	
	this.shaders = {};
}

OpenEarthViewer.plugins = {};

OpenEarthViewer.prototype.init = function() {
	Oev.Ui.init();
	Oev.Net.init();
	Oev.Input.init();
	Oev.Sky.init();
	Oev.Navigation.init();
	this.clock = new THREE.Clock();
	document.getElementById( "tools" ).style['max-height'] = document.getElementById( "main" ).clientHeight+'px';
	var intElemClientWidth = document.getElementById( this.htmlContainer ).clientWidth;
	var intElemClientHeight = document.getElementById( "tools" ).clientHeight;
	this.sceneWidth = Math.min( intElemClientWidth, 13000 );
	this.sceneHeight = Math.min( intElemClientHeight, 800 );
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 90, this.sceneWidth / this.sceneHeight, 0.1, 20000 );
	// this.earth = new Globe();
	this.earth = Oev.Globe;
	this.earth.init();
	this.scene.add(this.earth.meshe);
	this.renderer = new THREE.WebGLRenderer( { alpha: true, clearAlpha: 1 } );
	this.raycaster = new THREE.Raycaster();
	this.renderer.setSize( this.sceneWidth, this.sceneHeight );
	document.getElementById( this.htmlContainer ).appendChild( this.renderer.domElement );
	this.containerOffset = new THREE.Vector2( document.getElementById( this.htmlContainer ).offsetLeft, document.getElementById( this.htmlContainer ).offsetTop );
	this.camera.position.x = 0;
	this.camera.position.y = 0;
	this.camera.position.z = 500;	
	// DOF
	/*
	var renderPass = new THREE.RenderPass( this.scene, this.camera );
	this.bokehPass = new THREE.BokehPass( this.scene, this.camera, {
		focus: 		1.0,
		aperture:	0.055,
		maxblur:	0.2, // OK
		width: this.sceneWidth,
		height: this.sceneHeight
	} );
	this.bokehPass.renderToScreen = true;
	var composer = new THREE.EffectComposer(this.renderer);
	composer.addPass(renderPass);
	composer.addPass(this.bokehPass);
	this.postprocessing.composer = composer;
	this.postprocessing.bokeh = this.bokehPass;
	*/
	this.renderer.setClearColor( 0x101020, 1 );
	if (this.shadowsEnabled) {
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	}
	if( this.socketEnabled ){
		this.netCtrl = new NetCtrl();
		this.netCtrl.init( this );
	}
	this.camCtrl = new CamCtrlGod();
	this.evt.fireEvent('APP_INIT');	
	this.loadTextures();
}

OpenEarthViewer.prototype.start = function() {
	initUi();
	this.fountainPartMat = new THREE.PointsMaterial({color:0xFFFFFF, size:((this.earth.meter) * 10), map:this.textures['particleWater']});
	this.fountainPartMat.alphaTest = 0.4;
	this.fountainPartMat.transparent = true;
	this.userMat = new THREE.SpriteMaterial( { map: this.textures['god'], color: 0xffffff, fog: false } );
	var debugGeo = new THREE.SphereGeometry(this.earth.meter * 100, 16, 7); 
	var debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
	this.geoDebug = new THREE.Mesh(debugGeo, debugMat);
	this.scene.add(this.geoDebug);
	this.materialPOILine = new THREE.LineBasicMaterial({color: 0xFFFFFF});
	// this.earth.construct();
	this.camCtrl.init(this.camera, this.earth);
	Oev.Navigation.saveWaypoint(4.231021, 43.795594, 13);
	Oev.Navigation.saveWaypoint(3.854188, 43.958125, 13);
	Oev.Navigation.saveWaypoint(2.383138,48.880945, 13);
	this.appStarted = true;
	
	Oev.Tile.Extension.LanduseWorker.init();
	
	console.log('OEV.START');
	this.evt.fireEvent('APP_START');
	render();
}

OpenEarthViewer.prototype.loadShader = function() {
	Oev.Shader.build('ocean', onShaderLoader, {map:OEV.textures['sea'], normalMap:OEV.textures['waternormals']});
}

function onShaderLoader(_name, _material) {
	console.log('Shader "' + _name + '" loaded');
	OEV.shaders[_name] = _material;
}

OpenEarthViewer.prototype.loadTextures = function() {
	openModal( "Loading textures" );
	var textList = [];
	Oev.Net.Textures.addToList(textList, 'landuse_sprites', 'landuse_sprites.png');
	Oev.Net.Textures.addToList(textList, 'normal_flat', 'normal_flat.png');
	Oev.Net.Textures.addToList(textList, 'normal_scrub', 'normal_scrub.png');
	Oev.Net.Textures.addToList(textList, 'normal_vineyard', 'normal_vineyard.png');
	Oev.Net.Textures.addToList(textList, 'normal_forest', 'normal_forest.png');
	Oev.Net.Textures.addToList(textList, 'landuse_vineyard', 'landuse_vineyard.png');
	Oev.Net.Textures.addToList(textList, 'landuse_scrub', 'landuse_scrub.png');
	Oev.Net.Textures.addToList(textList, 'landuse_forest', 'landuse_forest.png');
	Oev.Net.Textures.addToList(textList, 'tree_top', 'tree_top.png');
	Oev.Net.Textures.addToList(textList, 'skydome', 'skydome.jpg');
	Oev.Net.Textures.addToList(textList, 'pylone', 'pylone.png');
	Oev.Net.Textures.addToList(textList, 'sea', 'sea.jpg');
	Oev.Net.Textures.addToList(textList, 'water_color', 'water_color.jpg');
	Oev.Net.Textures.addToList(textList, 'roof', 'roof.png');
	Oev.Net.Textures.addToList(textList, 'god', 'god_2.png');
	Oev.Net.Textures.addToList(textList, 'waternormals', 'waternormals.png');
	Oev.Net.Textures.addToList(textList, 'waypoint', 'waypoint.png');
	Oev.Net.Textures.addToList(textList, 'checker', 'loading.png');
	Oev.Net.Textures.addToList(textList, 'sky', 'sky.png');
	Oev.Net.Textures.addToList(textList, 'checker_alpha', 'checker_alpha.png');
	Oev.Net.Textures.addToList(textList, 'sun', 'sun2.png');
	Oev.Net.Textures.addToList(textList, 'cloud', 'cloud.png');
	Oev.Net.Textures.addToList(textList, 'sky_gradient', 'sky_gradient.png');
	Oev.Net.Textures.addToList(textList, 'grass', 'grass2.png');
	Oev.Net.Textures.addToList(textList, 'vineyard', 'vineyard.png');
	Oev.Net.Textures.addToList(textList, 'natural_tree', 'natural_tree.png');
	Oev.Net.Textures.addToList(textList, 'tree_side', 'tree_tiles.png');
	Oev.Net.Textures.addToList(textList, 'scrub', 'scrub.png');
	Oev.Net.Textures.addToList(textList, 'plane_contrail', 'plane_contrail_2.png');
	Oev.Net.Textures.addToList(textList, 'particleWater', 'particleWater.png');
	Oev.Net.Textures.addToList(textList, 'tree_procedural', 'tree_procedural.png');
	Oev.Net.Textures.loadBatch(textList, onOevTexturesLoaded);
}

function onOevTexturesLoaded() {
	console.log('All default textures loaded');
	OEV.textures = Oev.Net.Textures.tmpGetTextures();
	
	// OEV.textures['skydome'].mapping = THREE.SphericalReflectionMapping;
	OEV.textures['skydome'].mapping = THREE.EquirectangularReflectionMapping;
	
	OEV.loadShader();
	OEV.loadModels();
}


OpenEarthViewer.prototype.loadModels = function() {
	openModal( "Loading models" );
	var modelList = [];
	Oev.Net.Models.addToList(modelList, 'eolienne', 'eolienne.json');
	Oev.Net.Models.addToList(modelList, 'pylone', 'pylone.json');
	Oev.Net.Models.addToList(modelList, 'tree_lod_1', 'hydrant_lod_0.json');
	Oev.Net.Models.addToList(modelList, 'HYDRANT_lod_1', 'hydrant_lod_1.json');
	Oev.Net.Models.addToList(modelList, 'HYDRANT_lod_2', 'hydrant_lod_1.json');
	Oev.Net.Models.addToList(modelList, 'LAMP_lod_0', 'lamp_lod_0.json');
	Oev.Net.Models.addToList(modelList, 'LAMP_lod_1', 'lamp_lod_1.json');
	Oev.Net.Models.addToList(modelList, 'LAMP_lod_2', 'lamp_lod_2.json');
	Oev.Net.Models.addToList(modelList, 'recycling', 'recycling.json');
	Oev.Net.Models.addToList(modelList, 'fountain', 'fountain2.json');
	Oev.Net.Models.addToList(modelList, 'poubelle', 'poubelle2.json');
	Oev.Net.Models.addToList(modelList, 'statue', 'statue.json');
	Oev.Net.Models.addToList(modelList, 'plane', 'avion.json');
	Oev.Net.Models.addToList(modelList, 'whale', 'whale.json');
	Oev.Net.Models.loadBatch(modelList, onOevModelsLoaded);
}


function onOevModelsLoaded() {
	console.log('All default models loaded');
	OEV.modelsLib = Oev.Net.Models.tmpGetModels();
	closeModal();
	OEV.start();
}

OpenEarthViewer.prototype.switchClouds = function() {
	if (Oev.Sky.cloudsActiv) {
		Oev.Sky.clearClouds();
		setElementActiv( document.getElementById( "btnClouds" ), false );
	} else {
		Oev.Sky.makeClouds();
		setElementActiv( document.getElementById( "btnClouds" ), true );
	}
}

OpenEarthViewer.prototype.checkMouseWorldPos = function() {
	var mX = ( ( Oev.Input.Mouse.curMouseX - this.containerOffset.x ) / this.sceneWidth ) * 2 - 1;
	var mY = -( ( Oev.Input.Mouse.curMouseY - this.containerOffset.y ) / this.sceneHeight ) * 2 + 1;
	this.mouseScreenClick.x = mX;
	this.mouseScreenClick.y = mY;
	this.raycaster.near = this.camera.near;
	this.raycaster.far = this.camera.far;
	this.raycaster.setFromCamera( new THREE.Vector2( mX, mY ), this.camera );
	var intersects = this.raycaster.intersectObjects( this.earth.meshe.children );
	var coord = undefined;
	for ( var i = 0; i < intersects.length; i++ ) {
		coord = this.earth.coordFromPos( intersects[ i ].point.x, intersects[ i ].point.z );
	}
	return coord;
}

OpenEarthViewer.prototype.addObjToUpdate = function( _obj ) {
	if( this.objToUpdate.indexOf( _obj ) < 0 ){
		this.objToUpdate.push( _obj );
	}
}

OpenEarthViewer.prototype.removeObjToUpdate = function( _obj ) {
	var index = this.objToUpdate.indexOf( _obj );
	if( index < 0 ){
		console.warn( 'OEV.removeObjToUpdate NOT FOUND !' );
	}else{
		this.objToUpdate.splice( index, 1 );
	}
}

OpenEarthViewer.prototype.render = function() {
	if( this.MUST_RENDER ){
		if( this.tuniform != undefined ){
			this.tuniform.iGlobalTime.value += 0.1;
		}
		if( this.aMeshMirror != undefined ){
			this.aMeshMirror.position.x = Oev.Sky.posCenter.x;
			this.aMeshMirror.position.z = Oev.Sky.posCenter.z;
		}
		var d = new Date();
		this.globalTime = d.getTime();
		showUICoords();
		// this.postprocessing.composer.render(0.0);
		this.renderer.render( this.scene, this.camera );
		this.MUST_RENDER = false;
	}
	this.camCtrl.update();
	if( dragSun ){
		var mX = ( ( Oev.Input.Mouse.curMouseX - this.containerOffset.x ) / this.sceneWidth );
		Oev.Sky.setSunTime(mX);
	}
	if( this.showRendererInfos ){
		var rendererInfos = '';
		for( var key in this.renderer.info ){
			for( var prop in this.renderer.info[key] ){
				rendererInfos += "info " + key + " / " + prop + " / " + this.renderer.info[key][prop] + '<br>';
			}
		}
		console.log(rendererInfos, true);
	}
	this.earth.update();
	Oev.Sky.update();
	
	for( var u = 0; u < this.objToUpdate.length; u ++ ){
		this.objToUpdate[u].update();
	}
	if (OEV.shaders['ocean'] !== undefined) {
		OEV.shaders['ocean'].uniforms.time.value += 0.01;
	}
}

OpenEarthViewer.prototype.gotoWaypoint = function(_waypointIndex) {
	var waypoint = Oev.Navigation.getWaypointById(_waypointIndex);
	this.camCtrl.setDestination(waypoint.lon, waypoint.lat);
	this.camCtrl.setZoomDest(waypoint.zoom, 2000);
}
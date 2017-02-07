var OpenEarthViewer = function ( _containerId ) {
	this.htmlContainer = _containerId;
	this.sceneWidth = 400;
	this.sceneHeight = 300;
	this.scene;
	this.camera;
	this.renderer;
	this.containerOffset = undefined;
	this.tileLoader = new THREE.TextureLoader();
	this.earth;
	this.texturesToPreload = [ 'waypoint.png', 'loading.png', 'sky.png', 'building_wall_5.png', 'checker_alpha.png' ];
	this.texturesToPreload.push( 'roof.png' );
	this.texturesToPreload.push( 'sun2.png' );
	this.texturesToPreload.push( 'cloud_3.png' );
	this.texturesToPreload.push( 'sky_gradient.png' );
	this.texturesToPreload.push( 'grass.png' );
	this.texturesToPreload.push( 'vineyard.png' );
	this.texturesToPreload.push( 'natural_tree.png' );
	this.texturesToPreload.push( 'plane_contrail_2.png' );
	this.texturesToPreload.push( 'particleWater.png' );
	this.texturesToPreload.push( 'testMix.png' );
	this.texturesToPreload.push( 'god_2.png' );
	this.texturesToPreload.push( 'particleSnow.png' );
	this.texturesToPreload.push( 'particleRain2.png' );
	this.texturesToPreload.push( 'waternormals.png' );
	this.texturesNames = [ 'waypoint', 'checker', 'sky', 'building_wall', 'checker_alpha' ];
	this.texturesNames.push( 'roof' );
	this.texturesNames.push( 'sun' );
	this.texturesNames.push( 'cloud' );
	this.texturesNames.push( 'sky_gradient' );
	this.texturesNames.push( 'grass' );
	this.texturesNames.push( 'vineyard' );
	this.texturesNames.push( 'natural_tree' );
	this.texturesNames.push( 'plane_contrail' );
	this.texturesNames.push( 'particleWater' );
	this.texturesNames.push( 'testMix' );
	this.texturesNames.push( 'god' );
	this.texturesNames.push( 'particleSnow' );
	this.texturesNames.push( 'particleRain' );
	this.texturesNames.push( 'waternormals' );
	this.textures = {};
	this.curTextureLoading = -1;
	this.modelsToLoad = [ 'tree_lod_1.json', 'tree_lod_1.json', 'tree_lod_0.json', 'hydrant_lod_0.json', 'hydrant_lod_1.json', 'hydrant_lod_1.json' ];
	this.modelsToLoad.push( 'lamp_lod_0.json' );
	this.modelsToLoad.push( 'lamp_lod_1.json' );
	this.modelsToLoad.push( 'lamp_lod_2.json' );
	this.modelsToLoad.push( 'capitelle.json' );
	this.modelsToLoad.push( 'capitelle.json' );
	this.modelsToLoad.push( 'capitelle.json' );
	this.modelsToLoad.push( 'recycling.json' );
	this.modelsToLoad.push( 'fountain2.json' );
	this.modelsToLoad.push( 'poubelle2.json' );
	this.modelsToLoad.push( 'statue.json' );
	this.modelsToLoad.push( 'plane.json' );
	this.modelsName = [ 'TREE_lod_2', 'TREE_lod_1', 'TREE_lod_0', 'HYDRANT_lod_0', 'HYDRANT_lod_1', 'HYDRANT_lod_2' ];
	this.modelsName.push( 'LAMP_lod_0' );
	this.modelsName.push( 'LAMP_lod_1' );
	this.modelsName.push( 'LAMP_lod_2' );
	this.modelsName.push( 'CAPITELLE_lod_0' );
	this.modelsName.push( 'CAPITELLE_lod_1' );
	this.modelsName.push( 'CAPITELLE_lod_2' );
	this.modelsName.push( 'recycling' );
	this.modelsName.push( 'fountain' );
	this.modelsName.push( 'poubelle' );
	this.modelsName.push( 'statue' );
	this.modelsName.push( 'plane' );
	this.modelsLib = {};
	this.curModelLoading = -1;
	this.modelsLoader = new THREE.ObjectLoader();
	this.geoDebug = undefined;
	this.materialWaypoints = {};
	this.postprocessing = {};
	this.dofActiv = false;
	this.materialPOILine;
	this.ctrlActiv = false;
	this.bokehPass;
	this.MUST_RENDER = true;
	this.MODELS_CFG;
	this.showRendererInfos = false;
	this.raycaster = undefined;
	this.clock = null;
	this.preloadQuery = [];
	this.camCtrl = new CamCtrlGod();
	this.userMat = undefined;
	this.waypoints = [];
	this.plugins = [];
	this.WpStored = [];
	this.shadowsEnabled = true;
	this.objToUpdate = [];
	this.globalTime = 0;
	this.mouseScreenClick = new THREE.Vector2( 0, 0 );
	this.socketEnabled = false;
	// this.socketEnabled = true;
	this.aMeshMirror = undefined;
	this.tuniform = {
		iGlobalTime: {
			type: 'f',
			value: 0.1
		}
	};
}

OpenEarthViewer.plugins = {};

OpenEarthViewer.prototype.init = function() {
	this.clock = new THREE.Clock();
	document.getElementById( "tools" ).style['max-height'] = document.getElementById( "main" ).clientHeight+'px';
	var intElemClientWidth = document.getElementById( this.htmlContainer ).clientWidth;
	var intElemClientHeight = document.getElementById( "tools" ).clientHeight;
	this.sceneWidth = Math.min( intElemClientWidth, 13000 );
	this.sceneHeight = Math.min( intElemClientHeight, 800 );
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 90, this.sceneWidth / this.sceneHeight, 0.1, 20000 );
	this.earth = new Globe();
	this.scene.add(this.earth.meshe);
	this.renderer = new THREE.WebGLRenderer( { alpha: true, clearAlpha: 1 } );
	this.raycaster = new THREE.Raycaster();
	this.renderer.setSize( this.sceneWidth, this.sceneHeight );
	document.getElementById( this.htmlContainer ).appendChild( this.renderer.domElement );
	this.containerOffset = new THREE.Vector2( document.getElementById( this.htmlContainer ).offsetLeft, document.getElementById( this.htmlContainer ).offsetTop );
	this.camera.position.x = 0;
	this.camera.position.y = 0;
	this.camera.position.z = 500;
	this.loadConfig();
	// DOF
	var renderPass = new THREE.RenderPass( this.scene, this.camera );
	this.bokehPass = new THREE.BokehPass( this.scene, this.camera, {
		focus: 		1.0,
		aperture:	0.055,
		maxblur:	0.2, // OK
		width: this.sceneWidth,
		height: this.sceneHeight
	} );
	this.bokehPass.renderToScreen = true;
	var composer = new THREE.EffectComposer( this.renderer );
	composer.addPass( renderPass );
	composer.addPass( this.bokehPass );
	this.postprocessing.composer = composer;
	this.postprocessing.bokeh = this.bokehPass;
	this.renderer.setClearColor( 0x101020, 1 );
	this.tmpCanvas = document.createElement('canvas');
	this.initPlugins();
	if( this.shadowsEnabled ){
		this.initShadow();
	}
	if( this.socketEnabled ){
		this.netCtrl = new NetCtrl();
		this.netCtrl.init( this );
	}
}

OpenEarthViewer.prototype.initShadow = function() {
	this.renderer.shadowMap.enabled = true;
	this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	// this.renderer.shadowMap.type = THREE.BasicShadowMap; // default THREE.PCFShadowMap
}

OpenEarthViewer.prototype.initPlugins = function() {
	for (var key in OpenEarthViewer.plugins) {
		if (!OpenEarthViewer.plugins.hasOwnProperty(key)) continue;
		OpenEarthViewer.plugins[key].init();
	}
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

OpenEarthViewer.prototype.switchDof = function() {
	this.dofActiv = !this.dofActiv;
	if( this.dofActiv ){
		setElementActiv( document.getElementById( "btnDof" ), true );
	}else{
		setElementActiv( document.getElementById( "btnDof" ), false );
	}
	this.MUST_RENDER = true;
}

OpenEarthViewer.prototype.start = function() {
	initUi();
	Oev.Input.Mouse.init();
	this.fountainPartMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: ( ( this.earth.meter ) * 10 ), map: this.textures['particleWater'] });
	this.fountainPartMat.alphaTest = 0.4;
	this.fountainPartMat.transparent = true;
	this.userMat = new THREE.SpriteMaterial( { map: this.textures['god'], color: 0xffffff, fog: false } );
	var debugGeo = new THREE.SphereGeometry( this.earth.meter * 100, 16, 7 ); 
	var debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
	this.geoDebug = new THREE.Mesh(debugGeo, debugMat);
	this.scene.add(this.geoDebug);
	this.materialWaypoints['default'] = new THREE.SpriteMaterial( { map: this.textures['waypoint'], color: 0xffffff, fog: false } );
	for( var model in this.MODELS_CFG ){
		if( this.MODELS_CFG[model]["MARKER"] != "none" && this.MODELS_CFG[model]["MARKER"] != 'default' && this.texturesToPreload.indexOf( this.MODELS_CFG[model]["MARKER"] ) < 0 ){
			this.materialWaypoints['MARKER_' + this.MODELS_CFG[model]["NAME"]] = new THREE.SpriteMaterial( { map: this.textures['MARKER_' + this.MODELS_CFG[model]["NAME"]], color: 0xffffff, fog: false } );
		}
	}
	this.materialPOILine = new THREE.LineBasicMaterial({color: 0xFFFFFF});
	this.earth.construct();
	Oev.Sky.init();
	this.camCtrl.init( this.camera, this.earth );
	this.camCtrl.updateCamera();
	render();
	this.saveWaypoint( 4.231021, 43.795594, 13, "Capitelles" );
	this.saveWaypoint( 3.854188, 43.958125, 13, "Cevennes" );
	this.saveWaypoint( 2.383138,48.880945, 13, "Paris" );
	if( localStorage.getItem("waypoints") == undefined ){
		localStorage.setItem("waypoints", JSON.stringify( this.WpStored ) );
	}else{
		this.WpStored = JSON.parse( localStorage.getItem("waypoints") );
		for( w = 0; w < this.WpStored.length; w ++ ){
			this.saveWaypoint( this.WpStored[w]["lon"],this.WpStored[w]["lat"], this.WpStored[w]["zoom"], this.WpStored[w]["name"] );
			
		}
	}
}

OpenEarthViewer.prototype.loadConfig = function() {
	openModal( "Loading resources..." );
	var ajaxCfg = new AjaxMng( 'cfg_models.json', {'APP':this}, function(res, _params){
			debug( 'Config loaded' );
			_params['APP'].MODELS_CFG = JSON.parse( res );
			for( var model in _params['APP'].MODELS_CFG ){
				if( _params['APP'].MODELS_CFG[model]["MARKER"] != "none" && _params['APP'].MODELS_CFG[model]["MARKER"] != 'default' && _params['APP'].texturesToPreload.indexOf( _params['APP'].MODELS_CFG[model]["MARKER"] ) < 0 ){
					_params['APP'].texturesToPreload.push( _params['APP'].MODELS_CFG[model]["MARKER"] );
					_params['APP'].texturesNames.push( 'MARKER_' + _params['APP'].MODELS_CFG[model]["NAME"] );
				}
				document.getElementById( "models_switch" ).innerHTML += '<input type="checkbox" class="cfg_load_models" data-model="'+_params['APP'].MODELS_CFG[model]["NAME"]+'" id="cfg_load_'+_params['APP'].MODELS_CFG[model]["NAME"]+'" value="1" > <label for="cfg_load_'+_params['APP'].MODELS_CFG[model]["NAME"]+'" title="zoom min : '+_params['APP'].MODELS_CFG[model]["ZOOM_MIN"]+'">'+_params['APP'].MODELS_CFG[model]["NAME"]+'</label> <a href="#" onclick="openConfigModel(\''+_params['APP'].MODELS_CFG[model]["NAME"]+'\');"><img src="img/ico_config.png" alt="config" title="config"></a><br>';
			}
			openModal( "Loading textures..." );
			_params['APP'].loadTextures();
		}
	);
}

OpenEarthViewer.prototype.loadModels = function() {
	this.curModelLoading ++;
	var curModel = this.modelsToLoad.shift();
	this.modelsLoader.load(
		'assets/models/'+curModel, 
		function(object) {
			object.rotation.x = Math.PI;
			object.scale.x = 0.005;
			object.scale.y = 0.005;
			object.scale.z = 0.005;
			OEV.modelsLib[OEV.modelsName[OEV.curModelLoading]] = object;
			if( OEV.modelsToLoad.length > 0 ){
				OEV.loadModels();
			}else{
				debug( "All " + OEV.modelsName.length + ' models loaded' );
				closeModal();
				OEV.start();
			}
		}, function(_xhr) {
			// console.log(curModel + ' loading : ' + _xhr.loaded + ' / ' + _xhr.total);
		}
	);
}

OpenEarthViewer.prototype.loadTextures = function() {
	var curText = this.texturesToPreload.shift();
	this.curTextureLoading ++;
	this.tileLoader.load(
		'assets/textures/' + curText, 
		function(t){
			OEV.textures[OEV.texturesNames[OEV.curTextureLoading]] = t;
			OEV.textures[OEV.texturesNames[OEV.curTextureLoading]].wrapS = OEV.textures[OEV.texturesNames[OEV.curTextureLoading]].wrapT = THREE.RepeatWrapping;
			if( OEV.texturesToPreload.length == 0 ){
				debug( "All " + OEV.texturesNames.length + " textures loaded" );
				openModal( "Loading models..." );
				OEV.loadModels();
			}else{
				OEV.loadTextures();
			}
		}, 
		function(xhr) {
			// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		function(xhr) {
			debug( 'TilesMng. An error happened' );
		}
	);
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
		debug( 'OEV.removeObjToUpdate NOT FOUND !' );
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
		if( this.dofActiv ){
			this.postprocessing.composer.render( 0.0 );
		}else{
			this.renderer.render( this.scene, this.camera );
		}
		this.MUST_RENDER = false;
	}
	this.camCtrl.update();
	if( dragSun ){
		var mX = ( ( Oev.Input.Mouse.curMouseX - this.containerOffset.x ) / this.sceneWidth );
		Oev.Sky.setSunTime( mX );
	}
	if( this.showRendererInfos ){
		var rendererInfos = '';
		for( var key in this.renderer.info ){
			for( var prop in this.renderer.info[key] ){
				rendererInfos += "info " + key + " / " + prop + " / " + this.renderer.info[key][prop] + '<br>';
			}
		}
		debug( rendererInfos, true );
	}
	this.earth.update();
	Oev.Sky.update();
	
	for( var u = 0; u < this.objToUpdate.length; u ++ ){
		this.objToUpdate[u].update();
	}
}

OpenEarthViewer.prototype.gotoWaypoint = function( _wp ) {
	this.camCtrl.setDestination( this.waypoints[_wp].lon, this.waypoints[_wp].lat );
	this.camCtrl.setZoomDest( this.waypoints[_wp].zoom, 2000 );
}

OpenEarthViewer.prototype.saveWaypoint = function( _lon, _lat, _zoom, _name, _textureName, _localStore ) {
	_name = _name || "WP " + this.waypoints.length;
	_textureName = _textureName || 'default';
	_localStore = _localStore || false;
	var wp = new Oev.Navigation.WayPoint( _lon, _lat, _zoom, _name, _textureName );
	this.waypoints.push( wp );
	updateWaypointsList( this.waypoints );
	if( _localStore ){
		console.log( this.WpStored );
		this.WpStored.push( { "name" : _name, "lon" : _lon, "lat" : _lat, "zoom" : _zoom } );
		localStorage.setItem("waypoints", JSON.stringify( this.WpStored ) );
	}
	return wp;
}

OpenEarthViewer.prototype.removeWaypoint = function( _wId ) {
	for( w = 0; w < this.WpStored.length; w ++ ){
		var storedWP = this.WpStored[w];
		if( storedWP["lon"] == this.waypoints[_wId].lon && storedWP["lat"] == this.waypoints[_wId].lat && storedWP["zoom"] == this.waypoints[_wId].zoom  ){
			debug( "found stored WP to remove" );
			this.WpStored.splice( w, 1 );
			break;
		}
	}
	localStorage.setItem("waypoints", JSON.stringify( this.WpStored ) );	
	this.waypoints[_wId].dispose();
	this.waypoints.splice( _wId, 1 );
	updateWaypointsList( this.waypoints );
}
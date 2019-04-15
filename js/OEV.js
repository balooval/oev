import Evt from './oev/event.js';
import * as UI from './oev/ui.js';
import * as OLD_UI from './UI.js';
import * as NET from './oev/net/Net.js';
import * as NET_TEXTURES from './oev/net/NetTextures.js';
import * as NET_MODELS from './oev/net/NetModels.js';
import * as INPUT from './oev/input.js';
import SKY from './oev/sky.js';
import NAVIGATION from './oev/navigation.js';
import GLOBE from './oev/globe.js';
import * as CamCtrl from './CamCtrl.js';
import * as SHADER from './oev/shader.js';

class OpenEarthViewer {
	constructor( _containerId ) {
		this.appStarted = false;
		this.htmlContainer = _containerId;
		this.sceneWidth = 400;
		this.sceneHeight = 300;
		this.scene;
		this.camera;
		this.renderer;
		this.containerOffset = undefined;
		this.earth;
		this.evt = new Evt();
		this.textures = {};
		this.modelsLib = {};
		this.geoDebug = undefined;
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

	init() {
		UI.init();
		NET.init();
		INPUT.init();
		SKY.init();
		NAVIGATION.init();
		this.clock = new THREE.Clock();
		document.getElementById( "tools" ).style['max-height'] = document.getElementById( "main" ).clientHeight+'px';
		var intElemClientWidth = document.getElementById( this.htmlContainer ).clientWidth;
		var intElemClientHeight = document.getElementById( "tools" ).clientHeight;
		this.sceneWidth = Math.min( intElemClientWidth, 13000 );
		this.sceneHeight = Math.min( intElemClientHeight, 800 );
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera( 90, this.sceneWidth / this.sceneHeight, 0.1, 20000 );
		this.earth = GLOBE;
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
		this.renderer.setClearColor( 0x101020, 1 );
		if (this.shadowsEnabled) {
			this.renderer.shadowMap.enabled = true;
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
		}
		if( this.socketEnabled ){
			this.netCtrl = new NetCtrl();
			this.netCtrl.init( this );
		}
		this.camCtrl = new CamCtrl.CamCtrlGod();
		this.evt.fireEvent('APP_INIT');	
		this.loadTextures();
	}

	start() {
		OLD_UI.initUi();
		this.fountainPartMat = new THREE.PointsMaterial({color:0xFFFFFF, size:((this.earth.meter) * 10), map:this.textures['particleWater']});
		this.fountainPartMat.alphaTest = 0.4;
		this.fountainPartMat.transparent = true;
		this.userMat = new THREE.SpriteMaterial( { map: this.textures['god'], color: 0xffffff, fog: false } );
		var debugGeo = new THREE.SphereGeometry(this.earth.meter * 100, 16, 7); 
		var debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
		this.geoDebug = new THREE.Mesh(debugGeo, debugMat);
		this.scene.add(this.geoDebug);
		// this.earth.construct();
		this.camCtrl.init(this.camera, this.earth);
		NAVIGATION.saveWaypoint(4.231021, 43.795594, 13);
		NAVIGATION.saveWaypoint(3.854188, 43.958125, 13);
		NAVIGATION.saveWaypoint(2.383138,48.880945, 13);
		this.appStarted = true;
		
		// Oev.Tile.Extension.LanduseWorker.init();
		
		console.log('OEV.START');
		this.evt.fireEvent('APP_START');
		render();
	}

	loadShader() {
		SHADER.build('ocean', onShaderLoader, {map:OEV.textures['sea'], normalMap:OEV.textures['waternormals']});
	}


	loadTextures() {
		UI.openModal( "Loading textures" );
		var textList = [];
		NET_TEXTURES.addToList(textList, 'landuse_sprites', 'landuse_sprites.png');
		NET_TEXTURES.addToList(textList, 'normal_flat', 'normal_flat.png');
		NET_TEXTURES.addToList(textList, 'normal_scrub', 'normal_scrub.png');
		NET_TEXTURES.addToList(textList, 'normal_vineyard', 'normal_vineyard.png');
		NET_TEXTURES.addToList(textList, 'normal_forest', 'normal_forest.png');
		NET_TEXTURES.addToList(textList, 'landuse_vineyard', 'landuse_vineyard.png');
		NET_TEXTURES.addToList(textList, 'landuse_scrub', 'landuse_scrub.png');
		NET_TEXTURES.addToList(textList, 'landuse_forest', 'landuse_forest.png');
		NET_TEXTURES.addToList(textList, 'tree_top', 'tree_top.png');
		NET_TEXTURES.addToList(textList, 'skydome', 'skydome.jpg');
		NET_TEXTURES.addToList(textList, 'pylone', 'pylone.png');
		NET_TEXTURES.addToList(textList, 'sea', 'sea.jpg');
		NET_TEXTURES.addToList(textList, 'water_color', 'water_color.jpg');
		NET_TEXTURES.addToList(textList, 'roof', 'roof.png');
		NET_TEXTURES.addToList(textList, 'god', 'god_2.png');
		NET_TEXTURES.addToList(textList, 'waternormals', 'waternormals.png');
		NET_TEXTURES.addToList(textList, 'waypoint', 'waypoint.png');
		NET_TEXTURES.addToList(textList, 'checker', 'loading.png');
		NET_TEXTURES.addToList(textList, 'sky', 'sky.png');
		NET_TEXTURES.addToList(textList, 'checker_alpha', 'checker_alpha.png');
		NET_TEXTURES.addToList(textList, 'sun', 'sun2.png');
		NET_TEXTURES.addToList(textList, 'cloud', 'cloud.png');
		NET_TEXTURES.addToList(textList, 'sky_gradient', 'sky_gradient.png');
		NET_TEXTURES.addToList(textList, 'grass', 'grass2.png');
		NET_TEXTURES.addToList(textList, 'vineyard', 'vineyard.png');
		NET_TEXTURES.addToList(textList, 'natural_tree', 'natural_tree.png');
		NET_TEXTURES.addToList(textList, 'tree_side', 'tree_tiles.png');
		NET_TEXTURES.addToList(textList, 'scrub', 'scrub.png');
		NET_TEXTURES.addToList(textList, 'plane_contrail', 'plane_contrail_2.png');
		NET_TEXTURES.addToList(textList, 'particleWater', 'particleWater.png');
		NET_TEXTURES.addToList(textList, 'tree_procedural', 'tree_procedural.png');
		NET_TEXTURES.loadBatch(textList, onOevTexturesLoaded);
	}


	loadModels() {
		UI.openModal( "Loading models" );
		var modelList = [];
		NET_MODELS.addToList(modelList, 'eolienne', 'eolienne.json');
		NET_MODELS.addToList(modelList, 'pylone', 'pylone.json');
		NET_MODELS.addToList(modelList, 'tree_lod_1', 'hydrant_lod_0.json');
		NET_MODELS.addToList(modelList, 'HYDRANT_lod_1', 'hydrant_lod_1.json');
		NET_MODELS.addToList(modelList, 'HYDRANT_lod_2', 'hydrant_lod_1.json');
		NET_MODELS.addToList(modelList, 'LAMP_lod_0', 'lamp_lod_0.json');
		NET_MODELS.addToList(modelList, 'LAMP_lod_1', 'lamp_lod_1.json');
		NET_MODELS.addToList(modelList, 'LAMP_lod_2', 'lamp_lod_2.json');
		NET_MODELS.addToList(modelList, 'recycling', 'recycling.json');
		NET_MODELS.addToList(modelList, 'fountain', 'fountain2.json');
		NET_MODELS.addToList(modelList, 'poubelle', 'poubelle2.json');
		// NET_MODELS.addToList(modelList, 'statue', 'statue.json');
		NET_MODELS.addToList(modelList, 'plane', 'avion.json');
		NET_MODELS.addToList(modelList, 'whale', 'whale.json');
		NET_MODELS.loadBatch(modelList, onOevModelsLoaded);
	}

	switchClouds() {
		if (Oev.Sky.cloudsActiv) {
			Oev.Sky.clearClouds();
			setElementActiv( document.getElementById( "btnClouds" ), false );
		} else {
			Oev.Sky.makeClouds();
			setElementActiv( document.getElementById( "btnClouds" ), true );
		}
	}

	checkMouseWorldPos() {
		var mX = ( ( INPUT.Mouse.curMouseX - this.containerOffset.x ) / this.sceneWidth ) * 2 - 1;
		var mY = -( ( INPUT.Mouse.curMouseY - this.containerOffset.y ) / this.sceneHeight ) * 2 + 1;
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

	addObjToUpdate( _obj ) {
		if( this.objToUpdate.indexOf( _obj ) < 0 ){
			this.objToUpdate.push( _obj );
		}
	}

	removeObjToUpdate( _obj ) {
		var index = this.objToUpdate.indexOf( _obj );
		if( index < 0 ){
			console.warn( 'OEV.removeObjToUpdate NOT FOUND !' );
		}else{
			this.objToUpdate.splice( index, 1 );
		}
	}

	render() {
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
			OLD_UI.showUICoords();
			this.renderer.render( this.scene, this.camera );
			this.MUST_RENDER = false;
		}
		this.camCtrl.update();
		if( OLD_UI.dragSun ){
			var mX = ( ( INPUT.Mouse.curMouseX - this.containerOffset.x ) / this.sceneWidth );
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
		SKY.update();
		
		for( var u = 0; u < this.objToUpdate.length; u ++ ){
			this.objToUpdate[u].update();
		}
		if (OEV.shaders['ocean'] !== undefined) {
			OEV.shaders['ocean'].uniforms.time.value += 0.01;
		}
	}

	gotoWaypoint(_waypointIndex) {
		var waypoint = NAVIGATION.getWaypointById(_waypointIndex);
		this.camCtrl.setDestination(waypoint.lon, waypoint.lat);
		this.camCtrl.setZoomDest(waypoint.zoom, 2000);
	}

	setPlugin(_name, _object) {
		console.log('setPlugin', _name, _object);
		this.plugins[_name] = _object;
	}
}

function onShaderLoader(_name, _material) {
	console.log('Shader "' + _name + '" loaded');
	OEV.shaders[_name] = _material;
}

function onOevTexturesLoaded() {
	console.log('All default textures loaded');
	OEV.textures = NET_TEXTURES.tmpGetTextures();
	
	// OEV.textures['skydome'].mapping = THREE.SphericalReflectionMapping;
	OEV.textures['skydome'].mapping = THREE.EquirectangularReflectionMapping;
	
	OEV.loadShader();
	OEV.loadModels();
}

function onOevModelsLoaded() {
	console.log('All default models loaded');
	OEV.modelsLib = NET_MODELS.tmpGetModels();
	UI.closeModal();
	OEV.start();
}

window.OEV = new OpenEarthViewer('threeContainer');
console.log('window.OEV', window.OEV);
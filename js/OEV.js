import Evt from './oev/event.js';
import * as UI from './oev/ui.js';
import * as OLD_UI from './UI.js';
import * as NET_TEXTURES from './oev/net/NetTextures.js';
import * as NET_MODELS from './oev/net/NetModels.js';
import * as INPUT from './oev/input.js';
import SKY from './oev/sky.js';
import NAVIGATION from './oev/navigation.js';
import GLOBE from './oev/globe.js';
import * as CamCtrl from './CamCtrl.js';
import * as SHADER from './oev/shader.js';

let containerOffset = undefined;
const objToUpdate = [];
const mouseScreenClick = new THREE.Vector2( 0, 0 );
const socketEnabled = false;
let renderer = undefined;

const OpenEarthViewer = (function() {

	let api = {
		appStarted : false, 
		sceneWidth : 400, 
		sceneHeight : 300, 
		scene : undefined, 
		camera : undefined, 
		earth : undefined, 
		evt : new Evt(), 
		textures : {}, 
		geoDebug : undefined, 
		MUST_RENDER : true, 
		MODELS_CFG : undefined, 
		raycaster : undefined, 
		clock : null, 
		camCtrl : null, 
		userMat : undefined, 
		waypoints : [], 
		plugins : [], 
		shadowsEnabled : true, 
		globalTime : 0, 
		tuniform : {
			iGlobalTime: {
				type: 'f',
				value: 0.1
			}
		}, 
	}

	api.init = function(_htmlContainer) {
		UI.init();
		NET_TEXTURES.init();
		NET_MODELS.init();
		INPUT.init();
		SKY.init();
		NAVIGATION.init();
		api.clock = new THREE.Clock();
		document.getElementById( "tools" ).style['max-height'] = document.getElementById( "main" ).clientHeight+'px';
		const intElemClientWidth = document.getElementById( _htmlContainer ).clientWidth;
		const intElemClientHeight = document.getElementById( "tools" ).clientHeight;
		api.sceneWidth = Math.min( intElemClientWidth, 13000 );
		api.sceneHeight = Math.min( intElemClientHeight, 800 );
		api.scene = new THREE.Scene();
		api.camera = new THREE.PerspectiveCamera( 90, api.sceneWidth / api.sceneHeight, 0.1, 20000 );
		api.earth = GLOBE;
		api.earth.init();
		api.scene.add(api.earth.meshe);
		renderer = new THREE.WebGLRenderer( { alpha: true, clearAlpha: 1 } );
		api.raycaster = new THREE.Raycaster();
		renderer.setSize( api.sceneWidth, api.sceneHeight );
		document.getElementById( _htmlContainer ).appendChild( renderer.domElement );
		containerOffset = new THREE.Vector2( document.getElementById( _htmlContainer ).offsetLeft, document.getElementById( _htmlContainer ).offsetTop );
		api.camera.position.x = 0;
		api.camera.position.y = 0;
		api.camera.position.z = 500;	
		renderer.setClearColor( 0x101020, 1 );
		if (api.shadowsEnabled) {
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
		}
		if( socketEnabled ){
			api.netCtrl = new NetCtrl();
			api.netCtrl.init( this );
		}
		api.camCtrl = new CamCtrl.CamCtrlGod();
		api.evt.fireEvent('APP_INIT');	
		api.loadTextures();
	}

	api.start = function() {
		OLD_UI.initUi();
		api.fountainPartMat = new THREE.PointsMaterial({color:0xFFFFFF, size:((api.earth.meter) * 10), map:NET_TEXTURES.texture('particleWater')});
		api.fountainPartMat.alphaTest = 0.4;
		api.fountainPartMat.transparent = true;
		api.userMat = new THREE.SpriteMaterial( { map: NET_TEXTURES.texture('god'), color: 0xffffff, fog: false } );
		const debugGeo = new THREE.SphereGeometry(api.earth.meter * 100, 16, 7); 
		const debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
		api.geoDebug = new THREE.Mesh(debugGeo, debugMat);
		api.scene.add(api.geoDebug);
		// api.earth.construct();
		api.camCtrl.init(api.camera, api.earth);
		NAVIGATION.saveWaypoint(4.231021, 43.795594, 13);
		NAVIGATION.saveWaypoint(3.854188, 43.958125, 13);
		NAVIGATION.saveWaypoint(2.383138,48.880945, 13);
		api.appStarted = true;
		// Oev.Tile.Extension.LanduseWorker.init();
		console.log('OEV.START');
		api.evt.fireEvent('APP_START');
		render();
	}

	api.loadTextures = function() {
		UI.openModal( "Loading textures" );
		const textList = [];
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


	api.loadShaders = function() {
		SHADER.loadList([
			'cloud', 
			'sky', 
			'sun', 
		], onOevShadersLoaded);
	}

	api.loadModels = function() {
		UI.openModal( "Loading models" );
		const modelList = [];
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
		NET_MODELS.addToList(modelList, 'plane', 'avion.json');
		NET_MODELS.addToList(modelList, 'whale', 'whale.json');
		NET_MODELS.loadBatch(modelList, onOevModelsLoaded);
	}

	api.domContainer = function() {
		return renderer.domElement;
	}

	api.switchClouds = function() {
		if (Oev.Sky.cloudsActiv) {
			Oev.Sky.clearClouds();
			setElementActiv( document.getElementById( "btnClouds" ), false );
		} else {
			Oev.Sky.makeClouds();
			setElementActiv( document.getElementById( "btnClouds" ), true );
		}
	}

	api.checkMouseWorldPos = function() {
		const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / api.sceneWidth) * 2 - 1;
		const mY = -((INPUT.Mouse.curMouseY - containerOffset.y) / api.sceneHeight) * 2 + 1;
		mouseScreenClick.x = mX;
		mouseScreenClick.y = mY;
		api.raycaster.near = api.camera.near;
		api.raycaster.far = api.camera.far;
		api.raycaster.setFromCamera( new THREE.Vector2(mX, mY), api.camera);
		const intersects = api.raycaster.intersectObjects( api.earth.meshe.children);
		let coord = undefined;
		intersects.forEach(i => coord = api.earth.coordFromPos(i.point.x, i.point.z));
		return coord;
	}

	api.addObjToUpdate = function(_obj) {
		if (objToUpdate.includes(_obj)) return false;
		objToUpdate.push(_obj);
	}

	api.removeObjToUpdate = function(_obj) {
		const index = objToUpdate.indexOf( _obj );
		if (index < 0) {
			console.warn('OEV.removeObjToUpdate NOT FOUND !');
			return false;
		}
		objToUpdate.splice(index, 1);
	}

	api.render = function() {
		if (api.MUST_RENDER) {
			if (api.tuniform != undefined) {
				api.tuniform.iGlobalTime.value += 0.1;
			}
			const d = new Date();
			api.globalTime = d.getTime();
			OLD_UI.showUICoords();
			renderer.render(api.scene, api.camera);
			api.MUST_RENDER = false;
		}
		api.camCtrl.update();
		if (OLD_UI.dragSun) {
			const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / api.sceneWidth);
			SKY.setSunTime(mX);
		}
		api.earth.update();
		SKY.update();
		objToUpdate.forEach(o => o.update());
	}

	api.gotoWaypoint = function(_waypointIndex) {
		const waypoint = NAVIGATION.getWaypointById(_waypointIndex);
		api.camCtrl.setDestination(waypoint.lon, waypoint.lat);
		api.camCtrl.setZoomDest(waypoint.zoom, 2000);
	}

	api.setPlugin = function(_name, _object) {
		console.log('setPlugin', _name, _object);
		api.plugins[_name] = _object;
	}

	return api;
})();

function onOevTexturesLoaded() {
	console.log('All default textures loaded');
	NET_TEXTURES.texture('skydome').mapping = THREE.EquirectangularReflectionMapping;
	OEV.loadShaders();
}

function onOevShadersLoaded() {
	OEV.loadModels();
}

function onOevModelsLoaded() {
	console.log('All default models loaded');
	UI.closeModal();
	OEV.start();
}

window.OEV = OpenEarthViewer;
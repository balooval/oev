import Evt from './oev/utils/event.js';
import * as UI from './oev/ui.js';
import * as OLD_UI from './UI.js';
import * as NET_TEXTURES from './oev/net/NetTextures.js';
import * as NET_MODELS from './oev/net/NetModels.js';
import * as INPUT from './oev/input/input.js';
import SKY from './oev/sky.js';
import Navigation from './oev/navigation.js';
import GLOBE from './oev/globe.js';
import * as CamCtrl from './oev/camera/god.js';
import * as SHADER from './oev/shader.js';
import * as TileExtension from './oev/tileExtensions/tileExtension.js';
import * as DataLoader from './oev/dataLoader.js';
import * as BuildingsDatas from './oev/tileExtensions/building/globeBuildings.js';

let containerOffset = undefined;
const objToUpdate = [];
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
	}

	api.init = function(_htmlContainer) {
		UI.init();
		NET_TEXTURES.init('assets/textures');
		NET_MODELS.init();
		INPUT.init();
		SKY.init();
		Navigation.init();
		api.clock = new THREE.Clock();
		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		document.getElementById('tools').style['max-height'] = document.getElementById('main').clientHeight + 'px';
		const intElemClientWidth = elmtHtmlContainer.clientWidth;
		const intElemClientHeight = document.getElementById( "tools" ).clientHeight;
		api.sceneWidth = Math.min(intElemClientWidth, 13000);
		api.sceneHeight = Math.min(intElemClientHeight, 800);
		api.scene = new THREE.Scene();
		api.camera = new THREE.PerspectiveCamera( 90, api.sceneWidth / api.sceneHeight, 0.1, 20000);
		api.earth = GLOBE;
		api.earth.init();
		api.scene.add(api.earth.meshe);
		renderer = new THREE.WebGLRenderer( { alpha: true, clearAlpha: 1 } );
		api.raycaster = new THREE.Raycaster();
		renderer.setSize(api.sceneWidth, api.sceneHeight);
		elmtHtmlContainer.appendChild(renderer.domElement);
		containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
		api.camera.position.x = 0;
		api.camera.position.y = 0;
		api.camera.position.z = 500;	
		renderer.setClearColor( 0x101020, 1 );
		if (api.shadowsEnabled) {
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
		}
		api.camCtrl = new CamCtrl.CamCtrlGod();
		UI.setCamera(api.camCtrl);
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
		api.camCtrl.init(api.camera, api.earth);
		Navigation.saveWaypoint(4.231021, 43.795594, 13);
		Navigation.saveWaypoint(3.854188, 43.958125, 13);
		Navigation.saveWaypoint(2.383138,48.880945, 13);
		api.appStarted = true;
		console.log('OEV.START');
		api.evt.fireEvent('APP_START');
		render();
	}

	api.loadTextures = function() {
		UI.openModal('Loading textures');
		const textList = [];
		const toLoad = [
			['checker', 'loading.png'], 
			['sky_gradient', 'sky_gradient.png'], 
		];
		toLoad.forEach(d => NET_TEXTURES.addToList(textList, d[0], d[1]));
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
		onOevModelsLoaded();
	}

	api.domContainer = function() {
		return renderer.domElement;
	}

	api.switchClouds = function() {
		if (SKY.cloudsActiv) {
			SKY.clearClouds();
			setElementActiv( document.getElementById( "btnClouds" ), false );
		} else {
			SKY.makeClouds();
			setElementActiv( document.getElementById( "btnClouds" ), true );
		}
	}

	api.checkMouseWorldPos = function() {
		const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / api.sceneWidth) * 2 - 1;
		const mY = -((INPUT.Mouse.curMouseY - containerOffset.y) / api.sceneHeight) * 2 + 1;
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
		objToUpdate = objToUpdate.filter(o => o != _obj);
	}

	api.render = function() {
		if (api.MUST_RENDER) {
			const d = new Date();
			api.globalTime = d.getTime();
			UI.showUICoords();
			renderer.render(api.scene, api.camera);
			api.MUST_RENDER = false;
		}
		api.camCtrl.update();
		if (UI.dragSun) {
			const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / api.sceneWidth);
			SKY.setSunTime(mX);
		}
		api.earth.update();
		SKY.update();
		objToUpdate.forEach(o => o.update());
	}

	api.gotoWaypoint = function(_waypointIndex) {
		const waypoint = Navigation.getWaypointById(_waypointIndex);
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
	OEV.loadShaders();
}

function onOevShadersLoaded() {
	OEV.loadModels();
}

function onOevModelsLoaded() {
	UI.closeModal();
	OEV.start();
}

window.OEV = OpenEarthViewer;
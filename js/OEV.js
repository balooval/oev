import Evt from './oev/utils/event.js';
import Renderer from './oev/renderer.js';
import UI from './oev/ui.js';
import * as NET_TEXTURES from './oev/net/NetTextures.js';
import * as NET_MODELS from './oev/net/NetModels.js';
import * as INPUT from './oev/input/input.js';
import SKY from './oev/sky.js';
import Navigation from './oev/navigation.js';
import GLOBE from './oev/globe.js';
import * as CamCtrl from './oev/camera/god.js';
import * as SHADER from './oev/shader.js';

let containerOffset = undefined;
const objToUpdate = [];

const OpenEarthViewer = (function() {

	let api = {
		appStarted : false, 
		earth : undefined, 
		evt : new Evt(), 
		textures : {}, 
		geoDebug : undefined, 
		raycaster : undefined, 
		clock : null, 
		camCtrl : null, 
		waypoints : [], 
		plugins : [], 
	}

	api.init = function(_htmlContainer) {
		Renderer.init(_htmlContainer);
		NET_TEXTURES.init('assets/textures');
		NET_MODELS.init();
		INPUT.init();
		SKY.init();
		Navigation.init();
		api.clock = new THREE.Clock();
		document.getElementById('tools').style['max-height'] = document.getElementById('main').clientHeight + 'px';
		api.earth = GLOBE;
		api.earth.init();
		Renderer.scene.add(api.earth.meshe);
		api.raycaster = new THREE.Raycaster();
		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
		api.camCtrl = new CamCtrl.CamCtrlGod();
		UI.init();
		UI.setCamera(api.camCtrl);
		api.evt.fireEvent('APP_INIT');	
		api.loadTextures();
	}

	api.start = function() {
		const debugGeo = new THREE.SphereGeometry(api.earth.meter * 100, 16, 7); 
		const debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
		api.geoDebug = new THREE.Mesh(debugGeo, debugMat);
		Renderer.scene.add(api.geoDebug);
		api.camCtrl.init(Renderer.camera, api.earth);
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
			['cloud', 'cloud.png'], 
			['waypoint', 'waypoint.png'], 
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
		const sceneSize = Renderer.sceneSize();
		const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / sceneSize[0]) * 2 - 1;
		const mY = -((INPUT.Mouse.curMouseY - containerOffset.y) / sceneSize[1]) * 2 + 1;
		api.raycaster.near = Renderer.camera.near;
		api.raycaster.far = Renderer.camera.far;
		api.raycaster.setFromCamera( new THREE.Vector2(mX, mY), Renderer.camera);
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
		if (Renderer.MUST_RENDER) {
			UI.showUICoords(api.camCtrl.coordLookat.x, api.camCtrl.coordLookat.y, api.camCtrl.coordLookat.y);
		}
		Renderer.render();
		api.camCtrl.update();
		if (UI.dragSun) {
			const sceneSize = Renderer.sceneSize();
			const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / sceneSize[0]);
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
import Evt from './oev/utils/event.js';
import Renderer from './oev/renderer.js';
import UI from './oev/ui.js';
import * as DataLoader from './oev/dataLoader.js';
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

const APP = {
	appStarted : false, 
	evt : null, 
	geoDebug : undefined, 
	raycaster : undefined, 
	clock : null, 
	cameraCtrl : null, 
	waypoints : [], 

	init : function(_htmlContainer) {
		APP.evt = new Evt();
		Renderer.init(_htmlContainer);
		NET_TEXTURES.init('assets/textures');
		NET_MODELS.init();
		DataLoader.init();
		INPUT.init();
		SKY.init();
		Navigation.init();
		APP.clock = new THREE.Clock();
		document.getElementById('tools').style['max-height'] = document.getElementById('main').clientHeight + 'px';
		GLOBE.init();
		Renderer.scene.add(GLOBE.meshe);
		APP.raycaster = new THREE.Raycaster();
		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
		APP.cameraCtrl = new CamCtrl.CameraGod();
		UI.init();
		UI.setCamera(APP.cameraCtrl);
		APP.evt.fireEvent('APP_INIT');	
		APP.loadTextures();
	}, 

	start : function() {
		const debugGeo = new THREE.SphereGeometry(GLOBE.meter * 100, 16, 7); 
		const debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
		APP.geoDebug = new THREE.Mesh(debugGeo, debugMat);
		Renderer.scene.add(APP.geoDebug);
		APP.cameraCtrl.init(Renderer.camera, GLOBE);
		Navigation.saveWaypoint(4.231021, 43.795594, 13);
		Navigation.saveWaypoint(3.854188, 43.958125, 13);
		Navigation.saveWaypoint(2.383138,48.880945, 13);
		APP.appStarted = true;
		console.log('OEV.START');
		APP.evt.fireEvent('APP_START');
		render();
	}, 

	loadTextures : function() {
		UI.openModal('Loading textures');
		const textList = [];
		const toLoad = [
			['checker', 'loading.png'], 
			['sky_gradient', 'sky_gradient.png'], 
			['cloud', 'cloud.png'], 
			['waypoint', 'waypoint.png'], 
			['shell_grass_1', 'shell_grass_1_256.png'], 
			['shell_grass_2', 'shell_grass_2_256.png'], 
			['shell_grass_3', 'shell_grass_3_256.png'], 
			['shell_grass_4', 'shell_grass_4_256.png'], 

			['water_color', 'water_color.jpg'], 
			['landuse_vineyard', 'landuse_vineyard.png'], 
		];
		toLoad.forEach(d => NET_TEXTURES.addToList(textList, d[0], d[1]));
		NET_TEXTURES.loadBatch(textList, APP.loadShaders);
	}, 
	
	
	loadShaders : function() {
		SHADER.loadList([
			'cloud', 
			'sky', 
			'sun', 
		], () => {
			UI.closeModal();
			APP.start();
		});
	}, 

	switchClouds : function() {
		if (SKY.cloudsActiv) {
			SKY.clearClouds();
			setElementActiv( document.getElementById( "btnClouds" ), false );
		} else {
			SKY.makeClouds();
			setElementActiv( document.getElementById( "btnClouds" ), true );
		}
	}, 

	checkMouseWorldPos : function() {
		const sceneSize = Renderer.sceneSize();
		const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / sceneSize[0]) * 2 - 1;
		const mY = -((INPUT.Mouse.curMouseY - containerOffset.y) / sceneSize[1]) * 2 + 1;
		APP.raycaster.near = Renderer.camera.near;
		APP.raycaster.far = Renderer.camera.far;
		APP.raycaster.setFromCamera( new THREE.Vector2(mX, mY), Renderer.camera);
		const intersects = APP.raycaster.intersectObjects( GLOBE.meshe.children);
		let coord = undefined;
		intersects.forEach(i => coord = GLOBE.coordFromPos(i.point.x, i.point.z));
		return coord;
	}, 

	addObjToUpdate : function(_obj) {
		if (objToUpdate.includes(_obj)) return false;
		objToUpdate.push(_obj);
	}, 

	removeObjToUpdate : function(_obj) {
		objToUpdate = objToUpdate.filter(o => o != _obj);
	}, 

	render : function() {
		if (Renderer.MUST_RENDER) {
			UI.showUICoords(APP.cameraCtrl.coordLookat.x, APP.cameraCtrl.coordLookat.y, APP.cameraCtrl.coordLookat.y);
		}
		Renderer.render();
		APP.cameraCtrl.update();
		if (UI.dragSun) {
			const sceneSize = Renderer.sceneSize();
			const mX = ((INPUT.Mouse.curMouseX - containerOffset.x) / sceneSize[0]);
			SKY.setSunTime(mX);
		}
		GLOBE.update();
		SKY.update();
		objToUpdate.forEach(o => o.update());
	}, 

	gotoWaypoint : function(_waypointIndex) {
		const waypoint = Navigation.getWaypointById(_waypointIndex);
		APP.cameraCtrl.setDestination(waypoint.lon, waypoint.lat);
		APP.cameraCtrl.setZoomDest(waypoint.zoom, 2000);
	},  

};

window.OEV = APP;
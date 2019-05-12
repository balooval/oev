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
import * as TileExtension from './oev/tileExtensions/tileExtension.js';
import MapExtension from './oev/tileExtensions/map/mapExtension.js';
import ElevationExtension from './oev/tileExtensions/elevation/elevationExtension.js';
import BuildingExtension from './oev/tileExtensions/building/buildingExtension.js';
import NormalExtension from './oev/tileExtensions/normal/normalExtension.js';
import LanduseExtension from './oev/tileExtensions/landuseGeo/landuseExtension.js';

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
	tileExtensions : {}, 

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

		TileExtension.register('TILE2D', MapExtension);
		TileExtension.register('ELEVATION', ElevationExtension);
		TileExtension.register('NORMAL', NormalExtension);
		TileExtension.register('LANDUSE', LanduseExtension);
		TileExtension.register('BUILDING', BuildingExtension);
		TileExtension.activate('TILE2D');
		TileExtension.activate('ELEVATION');
		// TileExtension.activate('NORMAL');
		TileExtension.activate('LANDUSE');
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
		Navigation.saveWaypoint(4.231021, 43.795594, 13, 'Vaunage');
		Navigation.saveWaypoint(3.854188, 43.958125, 13, 'St Hippo');
		Navigation.saveWaypoint(2.383138,48.880945, 13, 'Paris');
		Navigation.saveWaypoint(5.7333, 43.1637, 15, 'St Cyr');
		APP.appStarted = true;
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
			
			['shell_void', 'shell_void.png'], 

			['shell_tree_1', 'shell_tree_1.png'], 
			['shell_tree_2', 'shell_tree_2.png'], 
			['shell_tree_3', 'shell_tree_3.png'], 
			['shell_tree_4', 'shell_tree_4.png'], 

			['shell_vine_1', 'shell_vine_1.png'], 
			['shell_vine_2', 'shell_vine_2.png'], 
			['shell_vine_3', 'shell_vine_3.png'], 
			['shell_vine_4', 'shell_vine_4.png'], 

			['shell_grass_1', 'shell_grass_1.png'], 
			['shell_grass_2', 'shell_grass_2.png'], 

			['shell_scrub_1', 'shell_scrub_1.png'], 
			['shell_scrub_2', 'shell_scrub_2.png'], 
		];
		toLoad.forEach(d => NET_TEXTURES.addToList(textList, d[0], d[1]));
		NET_TEXTURES.loadBatch(textList, () => {
			console.log('TEXTURES_LOADED');
			APP.evt.fireEvent('TEXTURES_LOADED');
			APP.loadShaders();
		});
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
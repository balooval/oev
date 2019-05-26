import Evt from './oev/utils/event.js';
import Renderer from './oev/renderer.js';
import UI from './oev/ui.js';
import * as DataLoader from './oev/dataLoader.js';
import * as NET_TEXTURES from './oev/net/NetTextures.js';
import * as NET_MODELS from './oev/net/NetModels.js';
import * as INPUT from './oev/input/input.js';
import ENVIRONMENT from './oev/environment.js';
import Navigation from './oev/navigation.js';
import GLOBE from './oev/globe.js';
import * as CamCtrl from './oev/camera/god.js';
import * as SHADER from './oev/shader.js';
import * as TileExtension from './oev/tileExtensions/tileExtension.js';
import * as MapExtension from './oev/tileExtensions/map/mapExtension.js';
import * as ElevationExtension from './oev/tileExtensions/elevation/elevationExtension.js';
import * as BuildingExtension from './oev/tileExtensions/building/buildingExtension.js';
import * as NormalExtension from './oev/tileExtensions/normal/normalExtension.js';
import * as LanduseExtension from './oev/tileExtensions/landuse/landuseExtension.js';
import * as SatelliteExtension from './oev/tileExtensions/satellite/satelliteExtension.js';
import * as NodeExtension from './oev/tileExtensions/node/nodeExtension.js';
import * as LinesExtension from './oev/tileExtensions/lines/linesExtension.js';
import UrlParser from './app/urlParser.js';

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
		ENVIRONMENT.init();
		Navigation.init();
		UrlParser.init();
		
		APP.clock = new THREE.Clock();

		const serverURL = 'https://val.openearthview.net/api/';
		MapExtension.setApiUrl(serverURL + 'index.php?ressource=osm');
		SatelliteExtension.setApiUrl(serverURL + 'index.php?ressource=satellite');
		ElevationExtension.setApiUrl(serverURL + 'index.php?ressource=elevation');
		NormalExtension.setApiUrl(serverURL + 'index.php?ressource=normal');
		LanduseExtension.setApiUrl(serverURL + 'index.php?ressource=landuse');
		BuildingExtension.setApiUrl(serverURL + 'index.php?ressource=building');
		NodeExtension.setApiUrl(serverURL + 'index.php?ressource=node');
		LinesExtension.setApiUrl(serverURL + 'index.php?ressource=lines');
		
		TileExtension.register('TILE2D', MapExtension.extensionClass());
		TileExtension.register('SATELLITE', SatelliteExtension.extensionClass());
		TileExtension.register('ELEVATION', ElevationExtension.extensionClass());
		TileExtension.register('NORMAL', NormalExtension.extensionClass());
		TileExtension.register('LANDUSE', LanduseExtension.extensionClass());
		TileExtension.register('BUILDING', BuildingExtension.extensionClass());
		TileExtension.register('NODE', NodeExtension.extensionClass());
		TileExtension.register('LINES', LinesExtension.extensionClass());
		
		TileExtension.activate('TILE2D');
		TileExtension.activate('ELEVATION');
		TileExtension.activate('NORMAL');

		const activesExtensions = UrlParser.activesExtensions();
		activesExtensions.forEach(extensionToActivate => {
			TileExtension.activate(extensionToActivate);
		});

		GLOBE.init();

		Renderer.scene.add(GLOBE.meshe);
		APP.raycaster = new THREE.Raycaster();
		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);

		const cameraLocation = UrlParser.cameraLocation();
		console.log('cameraLocation', cameraLocation);
		APP.cameraCtrl = new CamCtrl.CameraGod(cameraLocation);

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
		Navigation.saveWaypoint(3.8139,43.7925, 13, 'Pic St Loup');
		Navigation.saveWaypoint(5.2659, 44.1747, 13, 'Mt Ventoux');
		Navigation.saveWaypoint(5.7333, 43.1637, 14, 'St Cyr');
		Navigation.saveWaypoint(2.383138,48.880945, 13, 'Paris');
		APP.appStarted = true;
		APP.evt.fireEvent('APP_START');
		render();
	}, 

	loadTextures : function() {
		UI.openModal('Loading textures, please wait');
		const textList = [];
		const toLoad = [
			['checker', 'loading.png'], 
			['sky_gradient', 'sky_gradient.png'], 
			['cloud', 'cloud.png'], 
			['waypoint', 'waypoint.png'], 
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
			const normalizedTIme = ((INPUT.Mouse.curMouseX - containerOffset.x) / sceneSize[0]);
			APP.evt.fireEvent('TIME_CHANGED', normalizedTIme);	
		}
		GLOBE.update();
		objToUpdate.forEach(o => o.update());
	}, 

	gotoWaypoint : function(_waypointIndex) {
		const waypoint = Navigation.getWaypointById(_waypointIndex);
		APP.cameraCtrl.setDestination(waypoint.lon, waypoint.lat);
		APP.cameraCtrl.setZoomDest(waypoint.zoom, 2000);
	},  

};

window.OEV = APP;
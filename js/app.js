import UI from './app/ui.js';
import UrlParser from './app/urlParser.js';
import Evt from './oev/utils/event.js';
import Renderer from './oev/renderer.js';
import * as DataLoader from './oev/tileExtensions/dataLoader.js';
import * as NET_TEXTURES from './oev/net/textures.js';
import * as NET_MODELS from './oev/net/models.js';
import * as INPUT from './oev/input/input.js';
import Navigation from './app/navigation.js';
import GLOBE from './oev/globe.js';
import * as CamCtrl from './oev/camera/god.js';
import * as Shader from './oev/net/shader.js';
import * as TileExtension from './oev/tileExtensions/tileExtension.js';
import * as MapExtension from './oev/tileExtensions/map/mapExtension.js';
import * as ElevationExtension from './oev/tileExtensions/elevation/elevationExtension.js';
import * as BuildingExtension from './oev/tileExtensions/building/buildingExtension.js';
import * as NormalExtension from './oev/tileExtensions/normal/normalExtension.js';
import * as LanduseExtension from './oev/tileExtensions/landuse/landuseExtension.js';
import * as SatelliteExtension from './oev/tileExtensions/satellite/satelliteExtension.js';
import * as NodeExtension from './oev/tileExtensions/node/nodeExtension.js';
import * as LinesExtension from './oev/tileExtensions/lines/linesExtension.js';
import * as PlaneExtension from './oev/tileExtensions/plane/planeExtension.js';
import * as GpxLoader from './oev/utils/gpxLoader.js';
// import * as THREEJS from './libs/three.module.js';

let containerOffset = undefined;

const APP = {
	appStarted : false, 
	evt : null, 
	clock : null, 
	tileExtensions : {}, 

	parseParams : function(_params) {
		// const serverURL = 'https://val.openearthview.net/api/';
		const serverURL = 'https://ns378984.ip-5-196-69.eu/api/';
		_params = _params ?? {};
		_params.CAMERA = _params.CAMERA ?? {};
		_params.CAMERA.x = _params.CAMERA.x ?? 2.3831;
		_params.CAMERA.y = _params.CAMERA.y ?? 48.8809;
		_params.CAMERA.z = _params.CAMERA.z ?? 13;
		_params.UI = _params.UI ?? {};
		_params.UI.extensions = _params.UI.extensions ?? false;
		_params.UI.waypoints = _params.UI.waypoints ?? false;
		_params.UI.navigation = _params.UI.navigation ?? false;
		_params.URL = _params.URL ?? {};
		_params.URL.disabled = _params.URL.enabled ?? false;
		_params.EXTENSIONS = _params.EXTENSIONS ?? {};
		_params.EXTENSIONS.map = _params.EXTENSIONS.map ?? {};
		_params.EXTENSIONS.map.active = _params.EXTENSIONS.map.active ?? true;
		_params.EXTENSIONS.map.url = _params.EXTENSIONS.map.url ?? serverURL + 'index.php?ressource=osm';
		_params.EXTENSIONS.elevation = _params.EXTENSIONS.elevation ?? {};
		_params.EXTENSIONS.elevation.active = _params.EXTENSIONS.elevation.active ?? true;
		_params.EXTENSIONS.elevation.url = _params.EXTENSIONS.elevation.url ?? serverURL + 'index.php?ressource=elevation';
		return _params;
	}, 

	init : function(_htmlContainer, _params = {}) {
		const params = this.parseParams(_params);
		APP.evt = new Evt();
		Renderer.init(_htmlContainer);
		NET_TEXTURES.init('assets/textures');
		NET_MODELS.init();
		DataLoader.init();
		INPUT.init();
		GLOBE.init();
		Navigation.init();
		UrlParser.init(params.URL, params.CAMERA);
		APP.clock = new THREE.Clock();
		// const serverURL = 'https://val.openearthview.net/api/';
		const serverURL = 'https://ns378984.ip-5-196-69.eu/api/';
		if (_params.EXTENSIONS.map.active) {
			MapExtension.setApiUrl(_params.EXTENSIONS.map.url);
			TileExtension.register('TILE2D', MapExtension.extensionClass());
			TileExtension.activate('TILE2D');
		}
		if (_params.EXTENSIONS.elevation.active) {
			ElevationExtension.setApiUrl(serverURL + 'index.php?ressource=elevation');
			TileExtension.register('ELEVATION', ElevationExtension.extensionClass());
			TileExtension.activate('ELEVATION');
		}
		SatelliteExtension.setApiUrl(serverURL + 'index.php?ressource=satellite');
		NormalExtension.setApiUrl(serverURL + 'index.php?ressource=normal');
		LanduseExtension.setApiUrl(serverURL + 'index.php?ressource=landuse');
		BuildingExtension.setApiUrl(serverURL + 'index.php?ressource=building');
		NodeExtension.setApiUrl(serverURL + 'index.php?ressource=node');
		LinesExtension.setApiUrl(serverURL + 'index.php?ressource=lines');
		
		// TileExtension.register('TILE2D', MapExtension.extensionClass());
		TileExtension.register('SATELLITE', SatelliteExtension.extensionClass());
		TileExtension.register('NORMAL', NormalExtension.extensionClass());
		TileExtension.register('LANDUSE', LanduseExtension.extensionClass());
		TileExtension.register('BUILDING', BuildingExtension.extensionClass());
		TileExtension.register('NODE', NodeExtension.extensionClass());
		TileExtension.register('LINES', LinesExtension.extensionClass());
		TileExtension.register('PLANE', PlaneExtension.extensionClass());
		
		// TileExtension.activate('TILE2D');
		TileExtension.activate('NORMAL');
		const activesExtensions = UrlParser.activesExtensions();
		activesExtensions.forEach(extensionToActivate => {
			TileExtension.activate(extensionToActivate);
		});
		Renderer.scene.add(GLOBE.meshe);
		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
		UI.init(params.UI);
		APP.evt.fireEvent('APP_INIT');	
		APP.loadTextures()
		.then(() => {
			return APP.loadShaders();
		})
		.then(() => {
			UI.closeModal();
			APP.start();
		});
	}, 
	
	start : function() {
		const cameraLocation = UrlParser.cameraLocation();
		const cameraCtrl = new CamCtrl.CameraGod(Renderer.camera, cameraLocation);
		UI.setCamera(cameraCtrl);
		GLOBE.setCameraControler(cameraCtrl);
		Navigation.saveWaypoint(4.231021, 43.795594, 13, 'Vaunage');
		Navigation.saveWaypoint(3.854188, 43.958125, 13, 'St Hippo');
		Navigation.saveWaypoint(3.8139,43.7925, 13, 'Pic St Loup');
		Navigation.saveWaypoint(5.2659, 44.1747, 13, 'Mt Ventoux');
		Navigation.saveWaypoint(5.7333, 43.1637, 14, 'St Cyr');
		Navigation.saveWaypoint(2.383138,48.880945, 13, 'Paris');
		APP.appStarted = true;
		APP.evt.fireEvent('APP_START');
		GLOBE.construct();
		APP.render();
		GpxLoader.load('/assets/gpx/test.gpx');
	}, 

	loadTextures : function() {
		UI.openModal('Loading textures, please wait');
		const textList = [];
		const toLoad = [
			['checker', 'loading.png'], 
			['sky_gradient', 'sky_gradient.png'], 
			['waypoint', 'waypoint.png'], 
		];
		toLoad.forEach(d => NET_TEXTURES.addToList(textList, d[0], d[1]));
		return new Promise((resolve) => {
			NET_TEXTURES.loadBatch(textList, resolve);
		});
	}, 
	
	loadShaders : function() {
		return new Promise((resolve) => {
			Shader.loadList(['cloud', 'sky', 'sun'], resolve);
		});
	}, 

	render : function() {
		if (Renderer.MUST_RENDER) {
			UI.showUICoords(GLOBE.cameraControler.coordLookat.x, GLOBE.cameraControler.coordLookat.y, GLOBE.cameraControler.coordLookat.y);
		}
		Renderer.render();
		GLOBE.cameraControler.update();
		if (UI.dragSun) {
			const sceneSize = Renderer.sceneSize();
			const normalizedTIme = ((INPUT.Mouse.curMouseX - containerOffset.x) / sceneSize[0]);
			GLOBE.setTime(normalizedTIme);	
		}
		GLOBE.update();
		requestAnimationFrame(APP.render);
	}, 

	gotoWaypoint : function(_waypointIndex) {
		const waypoint = Navigation.getWaypointById(_waypointIndex);
		GLOBE.cameraControler.setDestination(waypoint.lon, waypoint.lat, waypoint.zoom);
	},  

};

window.APP = APP;
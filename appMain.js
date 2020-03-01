import UI from '../client/ui.js';
import UrlParser from '../client/urlParser.js';
import Evt from './core/event.js';
import Renderer from './core/renderer.js';
import * as DataLoader from './tileExtensions/dataLoader.js';
import * as NET_TEXTURES from './net/textures.js';
import * as NET_MODELS from './net/models.js';
import * as INPUT from './input/input.js';
import Navigation from './core/navigation.js';
import GLOBE from './core/globe.js';
import * as CamCtrl from './camera/god.js';
import * as Shader from './net/shader.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import * as MapExtension from './tileExtensions/map/mapExtension.js';
import * as ElevationExtension from './tileExtensions/elevation/elevationExtension.js';
import * as BuildingExtension from './tileExtensions/building/buildingExtension.js';
import * as NormalExtension from './tileExtensions/normal/normalExtension.js';
import * as LanduseExtension from './tileExtensions/landuse/landuseExtension.js';
import * as SatelliteExtension from './tileExtensions/satellite/satelliteExtension.js';
import * as NodeExtension from './tileExtensions/node/nodeExtension.js';
import * as LinesExtension from './tileExtensions/lines/linesExtension.js';
import * as PlaneExtension from './tileExtensions/plane/planeExtension.js';
import * as GpxLoader from './utils/gpxLoader.js';
import * as THREE from './vendor/three.module.js';

let containerOffset = undefined;

const APP = {
	evt : null, 
	clock : null, 
	tileExtensions : {}, 

	parseParams : function(_params) {
		const serverURL = 'https://ns378984.ip-5-196-69.eu/server/api/';
		_params = _choose(_params, {});
		_params.CAMERA = _choose(_params.CAMERA, {});
		_params.CAMERA.x = _choose(_params.CAMERA.x, 2.3831);
		_params.CAMERA.y = _choose(_params.CAMERA.y, 48.8809);
		_params.CAMERA.z = _choose(_params.CAMERA.z, 13);
		_params.UI = _choose(_params.UI, {});
		_params.UI.extensions = _choose(_params.UI.extensions, false);
		_params.UI.waypoints = _choose(_params.UI.waypoints, false);
		_params.UI.navigation = _choose(_params.UI.navigation, false);
		_params.URL = _choose(_params.URL, {});
		_params.URL.disabled = _choose(_params.URL.enabled, false);
		_params.EXTENSIONS = _choose(_params.EXTENSIONS, {});
		_params.EXTENSIONS.map = _choose(_params.EXTENSIONS.map, {});
		_params.EXTENSIONS.map.active = _choose(_params.EXTENSIONS.map.active, true);
		_params.EXTENSIONS.map.url = _choose(_params.EXTENSIONS.map.url, serverURL + 'index.php?ressource=osm');
		const extensions = [
			'elevation', 
			'satellite', 
			'normal', 
			'landuse', 
			'building', 
			'node', 
			'lines', 
		];
		extensions.forEach(extension => {
			_params.EXTENSIONS[extension] = _choose(_params.EXTENSIONS[extension], {});
			_params.EXTENSIONS[extension].active = _choose(_params.EXTENSIONS[extension].active, true);
			_params.EXTENSIONS[extension].url = _choose(_params.EXTENSIONS[extension].url, serverURL + 'index.php?ressource=' + extension);
		})

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
		if (_params.EXTENSIONS.map.active) {
			MapExtension.setApiUrl(_params.EXTENSIONS.map.url);
			TileExtension.register('TILE2D', MapExtension.extensionClass());
			TileExtension.activate('TILE2D');
		}
		if (_params.EXTENSIONS.elevation.active) {
			ElevationExtension.setApiUrl(_params.EXTENSIONS.elevation.url);
			TileExtension.register('ELEVATION', ElevationExtension.extensionClass());
			TileExtension.activate('ELEVATION');
		}
		if (_params.EXTENSIONS.satellite.active) {
			SatelliteExtension.setApiUrl(_params.EXTENSIONS.satellite.url);
			TileExtension.register('SATELLITE', SatelliteExtension.extensionClass());
		}
		if (_params.EXTENSIONS.normal.active) {
			NormalExtension.setApiUrl(_params.EXTENSIONS.normal.url);
			TileExtension.register('NORMAL', NormalExtension.extensionClass());
			TileExtension.activate('NORMAL');
		}
		if (_params.EXTENSIONS.landuse.active) {
			LanduseExtension.setApiUrl(_params.EXTENSIONS.landuse.url);
			TileExtension.register('LANDUSE', LanduseExtension.extensionClass());
		}
		if (_params.EXTENSIONS.building.active) {
			BuildingExtension.setApiUrl(_params.EXTENSIONS.building.url);
			TileExtension.register('BUILDING', BuildingExtension.extensionClass());
		}
		if (_params.EXTENSIONS.node.active) {
			NodeExtension.setApiUrl(_params.EXTENSIONS.node.url);
			TileExtension.register('NODE', NodeExtension.extensionClass());
		}
		if (_params.EXTENSIONS.lines.active) {
			LinesExtension.setApiUrl(_params.EXTENSIONS.lines.url);
			TileExtension.register('LINES', LinesExtension.extensionClass());
		}
		TileExtension.register('PLANE', PlaneExtension.extensionClass());
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

function _choose(_value, _defaultValue) {
	if (_value === undefined) return _defaultValue;
	if (_value === null) return _defaultValue;
	return _value;
}

window.APP = APP;
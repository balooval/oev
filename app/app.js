import {CameraGod} from './camera/god.js';
import Evt from './core/event.js';
import GLOBE from './core/globe.js';
import Navigation from './core/navigation.js';
import Renderer from './core/renderer.js';
import * as INPUT from './input/input.js';
import * as NET_MODELS from './net/models.js';
import * as Shader from './net/shader.js';
import * as NET_TEXTURES from './net/textures.js';
import * as DataLoader from './tileExtensions/dataLoader.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import * as BuildingExtension from './tileExtensions/building/buildingExtension.js';
import * as ElevationExtension from './tileExtensions/elevation/elevationExtension.js';
import * as LanduseExtension from './tileExtensions/landuse/landuseExtension.js';
import * as LinesExtension from './tileExtensions/lines/linesExtension.js';
import * as MapExtension from './tileExtensions/map/mapExtension.js';
import * as NodeExtension from './tileExtensions/node/nodeExtension.js';
import * as NormalExtension from './tileExtensions/normal/normalExtension.js';
import * as PlaneExtension from './tileExtensions/plane/planeExtension.js';
import * as SatelliteExtension from './tileExtensions/satellite/satelliteExtension.js';
import * as GpxLoader from './utils/gpxLoader.js';

let containerOffset;

const OEV = {
	isBuild : false, 
	tileExtensions : {}, 
	params : {}, 

	evt : new Evt(), 

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
		_params.URL.enabled = _choose(_params.URL.enabled, true);
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
			_params.EXTENSIONS[extension].active = _choose(_params.EXTENSIONS[extension].active, false);
			_params.EXTENSIONS[extension].url = _choose(_params.EXTENSIONS[extension].url, serverURL + 'index.php?ressource=' + extension);
		});
		_params.EXTENSIONS.elevation.active = true;
		_params.EXTENSIONS.normal.active = true;

		return _params;
	}, 

	init : function(_htmlContainer, _params, _callback) {
		OEV.params = this.parseParams(_params);
		Renderer.init(_htmlContainer);
		NET_TEXTURES.init('assets/textures');
		NET_MODELS.init();
		DataLoader.init();
		INPUT.init();
		GLOBE.init();
		Navigation.init();
		MapExtension.setApiUrl(OEV.params.EXTENSIONS.map.url);
		TileExtension.register('TILE2D', MapExtension.extensionClass());
		ElevationExtension.setApiUrl(OEV.params.EXTENSIONS.elevation.url);
		TileExtension.register('ELEVATION', ElevationExtension.extensionClass());
		SatelliteExtension.setApiUrl(OEV.params.EXTENSIONS.satellite.url);
		TileExtension.register('SATELLITE', SatelliteExtension.extensionClass());
		NormalExtension.setApiUrl(OEV.params.EXTENSIONS.normal.url);
		TileExtension.register('NORMAL', NormalExtension.extensionClass());
		LanduseExtension.setApiUrl(OEV.params.EXTENSIONS.landuse.url);
		TileExtension.register('LANDUSE', LanduseExtension.extensionClass());
		BuildingExtension.setApiUrl(OEV.params.EXTENSIONS.building.url);
		TileExtension.register('BUILDING', BuildingExtension.extensionClass());
		NodeExtension.setApiUrl(OEV.params.EXTENSIONS.node.url);
		TileExtension.register('NODE', NodeExtension.extensionClass());
		LinesExtension.setApiUrl(OEV.params.EXTENSIONS.lines.url);
		TileExtension.register('LINES', LinesExtension.extensionClass());
		TileExtension.register('PLANE', PlaneExtension.extensionClass());

		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', null, OEV.onExtensionActivate);
        TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', null, OEV.onExtensionDesctivate);

		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		containerOffset = elmtHtmlContainer.offsetLeft;

		OEV.build(_callback);
	}, 
	
	build : function(_callback) {
		if (OEV.params.EXTENSIONS.map.active) {
			TileExtension.activate('TILE2D');
		}
		if (OEV.params.EXTENSIONS.elevation.active) {
			TileExtension.activate('ELEVATION');
		}
		if (OEV.params.EXTENSIONS.normal.active) {
			TileExtension.activate('NORMAL');
		}

		if (OEV.params.EXTENSIONS.landuse.active) {
			TileExtension.activate('LANDUSE');
		}
		if (OEV.params.EXTENSIONS.building.active) {
			TileExtension.activate('BUILDING');
		}
		if (OEV.params.EXTENSIONS.node.active) {
			TileExtension.activate('NODE');
		}
		if (OEV.params.EXTENSIONS.lines.active) {
			TileExtension.activate('LINES');
		}

		Renderer.scene.add(GLOBE.meshe);
		OEV.loadTextures()
		.then(() => {
			return OEV.loadShaders();
		})
		.then(() => {
			_callback();
		});
		OEV.isBuild = true;
	}, 
	
	start : function(_cameraCtrl) {
		GLOBE.setCameraControler(_cameraCtrl);
		GLOBE.construct();
		GpxLoader.load('/assets/gpx/test.gpx');
		_cameraCtrl.evt.addEventListener('CAM_UPDATED', OEV, OEV.onCameraUpdate);
	}, 

	onExtensionActivate : function(_extension) {
		OEV.evt.fireEvent('TILE_EXTENSION_ACTIVATE', _extension);
	}, 
	
	onExtensionDesctivate : function(_extension) {
		OEV.evt.fireEvent('TILE_EXTENSION_DESACTIVATE', _extension);
	}, 

	loadTextures : function() {
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

	update : function() {
		if (!OEV.isBuild) return;
		Renderer.render();
		GLOBE.cameraControler.update();
		GLOBE.update();
	}, 

	setTime : function(_normalizedTIme) {
		GLOBE.setTime(_normalizedTIme);
	}, 

	getCoordLookAt : function() {
		return {
			lon : GLOBE.cameraControler.coordLookat.x, 
			lat : GLOBE.cameraControler.coordLookat.y, 
			ele : GLOBE.cameraControler.coordLookat.z, 
		};
	}, 

	goto : function(_waypoint) {
		console.log('GOTO');
		GLOBE.cameraControler.setDestination(_waypoint.lon, _waypoint.lat, _waypoint.zoom);
	}, 

	zoomIn : function() {
		GLOBE.cameraControler.zoomIn()
	}, 

	zoomOut : function() {
		GLOBE.cameraControler.zoomOut()
	}, 

	hasChanged : function() {
		return Renderer.MUST_RENDER;
	}, 

	getCamera : function(_type, _location) {
		if (_type == 'GOD') {
			return new CameraGod(Renderer.camera, _location);
		}
		console.warn('Camera', _type, 'not supported');
		return new CameraGod(Renderer.camera, _location);
	}, 

	getMouseNormalizedPosition : function() {
		const sceneSize = Renderer.sceneSize();
		return ((INPUT.Mouse.curMouseX - containerOffset) / sceneSize[0]);
	}, 

	saveWaypoint : function(_lon, _lat, _ele, _name) {
		Navigation.saveWaypoint(_lon, _lat, _ele, _name);
	},
	
	getWaypoint : function(_name) {
		return Navigation.getWaypointById(_name);
	}, 

	listWaypoints : function() {
		return Navigation.waypoints();
	}, 

	screenToGroundPos : function(_screenPosX, _screenPosY) {
		return GLOBE.screenToSurfacePosition(_screenPosX, _screenPosY);
	}, 

	onCameraUpdate : function(_evtDatas) {
		OEV.evt.fireEvent('CAMERA_UPDATED', _evtDatas);
	}

};

function _choose(_value, _defaultValue) {
	if (_value === undefined) return _defaultValue;
	if (_value === null) return _defaultValue;
	return _value;
}

export {OEV as default};
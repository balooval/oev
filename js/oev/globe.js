import Renderer from './renderer.js';
import Evt from './utils/event.js';
import ENVIRONMENT from './environment.js';
import TILE from './tile.js';
import GEO from './utils/geo.js';
import MATH from './utils/math.js';
import ElevationStore from './tileExtensions/elevation/elevationStore.js';

let curLodOrigine = new THREE.Vector3(0, 0, 0);
let curTile = new THREE.Vector2(0, 0, 0);
const eleFactor = 1;
let time = 0.5;

const api = {
	evt : null, 
	cameraControler : null, 
	tilesBase : [], 
	CUR_ZOOM : 14, 
	LOD_PLANET : 0, 
	LOD_CITY : 10, 
	LOD_STREET : 19, 
	curLOD : 0, 
	tilesDetailsMarge : 2, 
	coordDetails : new THREE.Vector2( 0, 0 ), 
	tileExtensions : {}, 
	radius : 10000, 
	meter : 1, 
	globalScale : 1, 
	meshe : null, 
	tilesDefinition : 16, 
	
	init : function() {
		api.evt = new Evt();
		api.meshe = new THREE.Mesh(new THREE.Geometry());
		api.coordToXYZ = api.coordToXYZPlane;
		api.meter = api.radius / 40075017.0;
	}, 

	setCameraControler(_controler) {
		api.cameraControler = _controler;
		api.cameraControler.init(api);
	}, 
	
	construct : function() {
		const zoomBase = 4;
		const nbTiles = Math.pow(2, zoomBase);
		for (let curTileY = 0; curTileY < nbTiles; curTileY ++) {
			for (let curTileX = 0; curTileX < nbTiles; curTileX ++) {
				const tile = new TILE(curTileX, curTileY, zoomBase);
				api.tilesBase.push(tile);
				tile.buildGeometry();
			}
		}
		ENVIRONMENT.init();
		api.cameraControler.start();
		api.evt.fireEvent('READY');
	}, 

	setTime : function(_time) {
		time = _time;
		api.evt.fireEvent('TIME_CHANGED', time);	
	}, 

	screenToSurfacePosition : function(_x, _y) {
		return Renderer.checkMouseWorldPos(_x, _y, api.meshe);
	}, 

	addMeshe : function(_meshe) {
		api.meshe.add(_meshe);
	}, 

	removeMeshe : function(_meshe) {
		api.meshe.remove(_meshe);
	},  

	update : function() {
		
	},  

	updateLOD : function() {
		api.tilesBase.forEach(t => t.updateVertex());
	}, 

	updateZoom : function(_value){
		if (api.CUR_ZOOM == _value) return false;
		if (Math.floor(api.CUR_ZOOM) != Math.floor(_value)) {
			api.evt.fireEvent('ZOOM_CHANGE', Math.floor(_value));
		}
		api.CUR_ZOOM = _value;
		api.checkLOD();
	}, 

	switchProjection : function(){
		if (api.projection == 'SPHERE') {
			api.setProjection('PLANE');
		} else if (api.projection == 'PLANE') {
			api.setProjection('SPHERE');
		}
	}, 

	setProjection : function(_mode) {
		if (_mode == 'PLANE') {
			ENVIRONMENT.activate(true);
			api.coordToXYZ = api.coordToXYZPlane;
			Renderer.camera.up.set(0, 0, 1);
		} else if (_mode == 'SPHERE') {
			ENVIRONMENT.activate(false);
			api.coordToXYZ = api.coordToXYZSphere;
			Renderer.camera.up.set(0, 1, 0);
		}
		api.projection = _mode;
		api.tilesBase.forEach(t => t.updateVertex());
	}, 

	coordToXYZPlane : function(_lon, _lat, _elevation) {
		const pos = new THREE.Vector3(0, 0, 0);
		pos.x = api.radius * (_lon / 60);
		pos.y = api.posFromAltitude(_elevation);
		const tmpZ = Math.log(Math.tan((90 + _lat) * Math.PI / 360.0)) / (Math.PI / 180.0);
		pos.z = (tmpZ * (2 * Math.PI * api.radius / 2.0) / 180.0);
		pos.x *= api.globalScale;
		pos.y *= 10;
		pos.z *= api.globalScale;
		pos.x -= curLodOrigine.x;
		pos.z -= curLodOrigine.z;
		return pos;
	}, 

	coordToXYZSphere : function(lon, lat, _elevation) {
		_elevation *= api.meter;
		_elevation += api.radius;
		const pos = new THREE.Vector3(0, 0, 0);
		const radY = MATH.radians((lon - 180) * -1);
		const radX = MATH.radians(lat * -1);
		pos.x = Math.cos(radY) * ((_elevation) * Math.cos(radX));
		pos.y = Math.sin(radX) * _elevation * -1;
		pos.z = Math.sin(radY) * (_elevation * Math.cos(radX));
		if (api.curLOD == api.LOD_CITY) {
			pos.x -= curLodOrigine.x;
			pos.y -= curLodOrigine.y;
			pos.z -= curLodOrigine.z;
			pos.x *= api.globalScale;
			pos.y *= api.globalScale;
			pos.z *= api.globalScale;
		}
		return pos;
	}, 

	posFromAltitude : function(_altitude) {
		return 0 - (_altitude * (api.meter * eleFactor));
	}, 

	altitudeFromPos : function(_pos) {
		return ((_pos / api.globalScale) / (api.meter * eleFactor)) * -1;
	}, 

	coordFromPos : function(_x, _y, _eleMeter = 0) {
		const pxlStart = api.coordToXYZ( -180, 85.0511, 0);
		const pxlEnd = api.coordToXYZ( 180, -85.0511, 0);
		const pxlWidth = Math.abs( pxlEnd.x - pxlStart.x);
		const pxlHeight = Math.abs( pxlEnd.z - pxlStart.z) / 2;
		const prctW = (_x - pxlStart.x) / pxlWidth;
		const prctH = ((_y - pxlEnd.z) / pxlHeight) - 1;
		const coordX = -180 + (prctW * 360);
		let coordY = (prctH * 180);
		coordY = 180 / Math.PI * (2 * Math.atan( Math.exp( coordY * Math.PI / 180.0)) - Math.PI / 2.0);
		const ele = api.getElevationAtCoords(coordX, coordY, true);
		return new THREE.Vector3(coordX, coordY, ele + _eleMeter);
	}, 

	checkLOD : function(){
		if (api.CUR_ZOOM >= api.LOD_STREET) {
			if (api.curLOD != api.LOD_STREET) {
				console.log("SET TO LOD_STREET");
				api.globalScale = 100;
				updateMeter();
				curLodOrigine = api.coordToXYZ(api.coordDetails.x, api.coordDetails.y, 0);
				console.log('curLodOrigine', curLodOrigine);
				api.curLOD = api.LOD_STREET;
				api.updateLOD();
				api.setProjection("PLANE");
				Renderer.camera.far = api.radius * api.globalScale;
				Renderer.camera.near = (api.radius * api.globalScale) / 10000000;
				Renderer.camera.updateProjectionMatrix();
				if (Renderer.scene.fog) {
					Renderer.scene.fog.near = api.radius * (0.01 * api.globalScale);
					Renderer.scene.fog.far = api.radius * (0.9 * api.globalScale);
				}
				api.evt.fireEvent("LOD_CHANGED");
			}
		} else if (api.CUR_ZOOM >= api.LOD_CITY) {
			if (api.curLOD != api.LOD_CITY) {
				console.log("SET TO LOD_CITY");
				api.globalScale = 10;
				// api.globalScale = 100;
				updateMeter();
				curLodOrigine = api.coordToXYZ(api.coordDetails.x, api.coordDetails.y, 0);
				api.curLOD = api.LOD_CITY;
				api.updateLOD();
				api.setProjection("PLANE");
				Renderer.camera.far = api.radius * api.globalScale;
				Renderer.camera.near = (api.radius * api.globalScale ) / 1000000;
				Renderer.camera.updateProjectionMatrix();
				if (Renderer.scene.fog) {
					Renderer.scene.fog.near = api.radius * ( 0.01 * api.globalScale );
					Renderer.scene.fog.far = api.radius * ( 0.9 * api.globalScale );
				}
				api.evt.fireEvent('LOD_CHANGED');
			}
		} else if (api.CUR_ZOOM >= api.LOD_PLANET) {
			if (api.curLOD != api.LOD_PLANET) {
				console.log("SET TO LOD_PLANET");
				curLodOrigine = new THREE.Vector3( 0, 0, 0 );
				api.globalScale = 1;
				updateMeter();
				api.curLOD = api.LOD_PLANET;
				api.setProjection("SPHERE");
				api.updateLOD();
				Renderer.camera.far = (api.radius * 2 ) * api.globalScale;
				Renderer.camera.near = (api.radius * api.globalScale) / 1000000;
				Renderer.camera.updateProjectionMatrix();
				if (Renderer.scene.fog) {
					Renderer.scene.fog.near = api.radius * (0.01 * api.globalScale);
					Renderer.scene.fog.far = api.radius * (0.9 * api.globalScale);
				}
				api.evt.fireEvent("LOD_CHANGED");
			}
		}
	}, 
	
	getElevationAtCoords : function(_lon, _lat, _inMeters = false) {
		let ele = ElevationStore.get(_lon, _lat) || 0;
		if (_inMeters) return ele;
		return ele *= (api.meter * eleFactor);
	}, 
	
	getCurTile : function() {
		return api.tilesBase.map(t => {
			return t.getCurTile(api.coordDetails)
		}).filter(res => res).pop();
	}, 
	
	onCurTileChange : function(_newTile){
		curTile = _newTile;
		api.tilesBase.forEach(t => t.updateDetails(api.coordDetails));
		api.evt.fireEvent('CURTILE_CHANGED', curTile);
	}, 

	updateCurTile : function(_coordX, _coordY) {
		api.coordDetails.x = _coordX;
		api.coordDetails.y = _coordY;
		const newTile = GEO.coordsToTile(api.coordDetails.x, api.coordDetails.y, api.CUR_ZOOM);
		if (newTile.x != curTile.x || newTile.y != curTile.y || newTile.z != curTile.z) {
			api.onCurTileChange(newTile);
		}
		curTile = newTile;
	}, 

	altitude : function(_zoomlevel) { // return altitude in opengl unit
		return GEO.getAltitude(_zoomlevel, api.radius);
	}, 
};

function updateMeter() {
	api.meter = (api.radius / 40075017.0) * api.globalScale;
}

export { api as default}

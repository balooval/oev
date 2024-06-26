import {
	BufferGeometry,
	Mesh,
	Vector2,
} from '../vendor/three.module.js';
import Renderer from './renderer.js';
import * as TILE from './tile.js';
import Evt from './event.js';
import GEO from './geo.js';
import ENVIRONMENT from '../environment/environment.js';
import MATH from './math.js';
import * as ElevationStore from '../tileExtensions/elevation/elevationStore.js';
import CheapRuler from '../vendor/cheap-ruler.js';


export const PROJECTION_PLANE = 'PLANE';
export const PROJECTION_SPHERE = 'SPHERE';
const EARTH_RADIUS_METERS = 6371000;
const LOD_PLANET = 0; 
const LOD_CITY = 10;

class Globe {
	#curLOD = LOD_PLANET;
	#currentZoom = 4;
	#rootTiles = [];
	#coordDetails = new Vector2(0, 0);
	#offset = [0, 0];

	constructor() {
		this.evt = new Evt();
		this.cameraControler = null;
		this.tilesDetailsMarge = 2;
		this.radius = EARTH_RADIUS_METERS;
		this.webglUnitsByMeter = this.radius / 40075017.0;
		this.globalScale = 1;
		this.meshe = null;
		this.tilesDefinition = 32;
		this.objToUpdate = [];
		this.meshe = new Mesh(new BufferGeometry());
		this.coordToXYZ = this.#coordToXYZSphere;
		this.ruler = new CheapRuler(0, 'meters');
	}
	
	setCameraControler(_controler) {
		this.cameraControler = _controler;
		this.cameraControler.init(this);

		this.cameraControler.evt.addEventListener('READY', this, this.#onCameraReady);
		this.cameraControler.evt.addEventListener('CAM_UPDATED', this, this.#onCameraUpdated);
	}
	
	#onCameraReady() {
		this.cameraControler.evt.removeEventListener('READY', this, this.#onCameraReady);

		this.#coordDetails.x = this.cameraControler.coordLookat.x;
		this.#coordDetails.y = this.cameraControler.coordLookat.y;

		this.webglUnitsByMeter = 1;
		this.#setCoordToWebglUnitsOffset(this.cameraControler.coordLookat.x, this.cameraControler.coordLookat.y);

		this.#applySphereProjection();
		this.updateZoom(this.cameraControler.zoomCur);

		ENVIRONMENT.activate(true);
	}

	#setCoordToWebglUnitsOffset(lon, lat) {
		this.#offset[0] = this.ruler.distance([0, 0], [lon, 0]) * this.webglUnitsByMeter;
		this.#offset[1] = this.ruler.distance([0, 0], [0, lat]) * this.webglUnitsByMeter;

		const sensLon = Math.sign(lon);
		const sensLat = Math.sign(lat);
		this.#offset[0] *= sensLon;
		this.#offset[1] *= sensLat;
	}

	#onCameraUpdated(cameraDatas) {
		this.#coordDetails.x = cameraDatas.coordLookat.x;
		this.#coordDetails.y = cameraDatas.coordLookat.y;
		
		for (let i = 0; i < this.#rootTiles.length; i ++) {
				this.#rootTiles[i].onCameraUpdated(cameraDatas);
		}
	}
	
	start() {
		const zoomBase = 4;
		const nbTiles = Math.pow(2, zoomBase);
		for (let curTileY = 0; curTileY < nbTiles; curTileY ++) {
			for (let curTileX = 0; curTileX < nbTiles; curTileX ++) {
				const tile = new TILE.TileBasic(curTileX, curTileY, zoomBase, null);
				this.#rootTiles.push(tile);
				tile.buildGeometry();
			}
		}
		ENVIRONMENT.init();
		this.cameraControler.start();
		this.evt.fireEvent('READY');
	}

	setTime(timeValue) {
		this.evt.fireEvent('TIME_CHANGED', timeValue);	
	}

	screenToSurfacePosition(_x, _y) {
		return Renderer.checkMouseWorldPos(_x, _y, this.meshe);
	}

	addMeshe(mesh) {
		this.meshe.add(mesh);
	}
	
	removeMeshe(mesh) {
		this.meshe.remove(mesh);
	}

	getRadius() {
		return this.radius;
	}

	update() {
		this.objToUpdate.forEach(o => o.update());
	}

	addObjToUpdate(_obj) {
		if (this.objToUpdate.includes(_obj)) return false;
		this.objToUpdate.push(_obj);
	}

	removeObjToUpdate(_obj) {
		this.objToUpdate = this.objToUpdate.filter(o => o != _obj);
	}

	updateZoom(zoomValue){
		if (this.#currentZoom == zoomValue) {
			return false;
		}
		
		if (Math.floor(this.#currentZoom) != Math.floor(zoomValue)) {
			this.evt.fireEvent('ZOOM_CHANGE', Math.floor(zoomValue));
		}
		
		this.#currentZoom = zoomValue;
		this.checkLOD();
	}

	#applyNewProjection(projectionMode) {
		if (projectionMode == PROJECTION_PLANE) {
			// ENVIRONMENT.activate(true);
			this.coordToXYZ = this.#coordToXYZPlane;

		} else if (projectionMode == PROJECTION_SPHERE) {
			// ENVIRONMENT.activate(true);
			this.coordToXYZ = this.#coordToXYZSphere;
		}

		this.projection = projectionMode;

		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].updategeometry();
		}

		this.evt.fireEvent('PROJECTION_CHANGE', this.projection);

		Renderer.MUST_RENDER = true;
	}

	#coordToXYZPlane(lon, lat, elevation) {
		let x = this.ruler.distance([0, 0], [lon, 0]) * this.webglUnitsByMeter;
		let z = this.ruler.distance([0, 0], [0, lat]) * -this.webglUnitsByMeter;

		const sensLon = Math.sign(lon);
		x *= sensLon;
		const sensLat = Math.sign(lat);
		z *= sensLat;

		let y = this.#altitudeToWebglUnit(elevation, lat);

		x -= this.#offset[0];
		z += this.#offset[1];

		return [x, y, z];
	}

	#coordToXYZSphere(lon, lat, elevation) {
		const radius = this.radius + this.#altitudeToWebglUnit(elevation, lat);
		const radianX = MATH.radians(lon);
		const radianY = MATH.radians(lat * -1);
		let x = Math.sin(radianX) * ((radius) * Math.cos(radianY));
		let y = Math.sin(radianY) * radius * -1;
		let z = Math.cos(radianX) * (radius * Math.cos(radianY));
		if (this.#curLOD == LOD_CITY) {
			console.log('ICI');
			x *= this.globalScale;
			y *= this.globalScale;
			z *= this.globalScale;
		}
		return [x, y, z];
	}

	#altitudeToWebglUnit(altitude, lat) {
		// TODO: réduire d'autant que la largeur d'une bande diminue à l'approche des pôles !
		const baseValue = altitude * this.webglUnitsByMeter;
		const latRadians = MATH.radians(lat);
		const latRatio = (Math.cos(latRadians) + 1) / 2;
		return baseValue * latRatio;
	}

	webglUnitToAltitude(webglUnit) {
		return webglUnit / this.webglUnitsByMeter;
	}

	webglUnitsToCoord(webglX, webglY, webglZ, elevationMeter = 0) {
		if (this.projection === PROJECTION_PLANE) {
			const absolutePosY = webglZ - this.#offset[1];
			const pxlStart = this.coordToXYZ(-180, 85.0511, 0);
			const pxlEnd = this.coordToXYZ(180, -85.0511, 0);
			const pxlWidth = Math.abs(pxlEnd[0] - pxlStart[0]);
			const latUnitSize = this.coordToXYZ(0, 85.0511, 0);
			const absoluteLatUnitSize = Math.abs(latUnitSize[2]  - this.#offset[1]);
			const prctW = (webglX - pxlStart[0]) / pxlWidth;
			const prctH = (absolutePosY / absoluteLatUnitSize) * -1;
			const coordX = -180 + (prctW * 360);
			let coordY = (prctH * 85.0511);
			const elevationAtCoord = this.getElevationMetersAtCoords(coordX, coordY);

			return [coordX, coordY, elevationAtCoord + elevationMeter];
		}

		const lon = (Math.atan2(webglX, webglZ) / Math.PI) * 180;
		const radius = Math.sqrt(Math.pow(webglX, 2) + Math.pow(webglZ, 2));
		const lat = (Math.atan2(webglY, radius) / Math.PI) * 180;
		const elevationAtCoord = this.getElevationMetersAtCoords(lon, lat);

		return [lon, lat, elevationAtCoord + elevationMeter];
	}

	tileFromXYZ(tileX, tileY, zoom) {
		for (let i = 0; i < this.#rootTiles.length; i ++) {
			const res = this.#rootTiles[i].searchTileAtXYZ(tileX, tileY, zoom);
			if (res) {
				return res;
			}
		}

		return null;
	}

	checkLOD(){
		const targetLod = this.#mustChangeToLod();
		
		if (targetLod === null) {
			return;
		}

		if (targetLod === LOD_CITY) {
			this.#applyPlaneProjection();

		} else if (targetLod === LOD_PLANET) {
			this.#applySphereProjection();
		}

		this.evt.fireEvent('LOD_CHANGED', this.#curLOD);
	}

	#mustChangeToLod() {
		const expectedLod = this.#getExpectedLod(this.#currentZoom);

		if (expectedLod !== this.#curLOD) {
			return expectedLod;
		}

		return null;
	}

	#getExpectedLod(zoom) {
		if (zoom >= LOD_CITY) {
			return LOD_CITY;
		}
		
		return LOD_PLANET;
	}

	#applyPlaneProjection() {
		this.globalScale = 1;
		this.radius = EARTH_RADIUS_METERS * this.globalScale;
		this.#updateUnitsByMeter();
		
		this.ruler = new CheapRuler(this.#coordDetails.y, 'meters');
		this.#setCoordToWebglUnitsOffset(this.#coordDetails.x, this.#coordDetails.y);
		
		this.#curLOD = LOD_CITY;
		this.#applyNewProjection(PROJECTION_PLANE);
		
		Renderer.camera.near = this.webglUnitsByMeter * 1;
		Renderer.camera.far = this.webglUnitsByMeter * 500000;
		Renderer.camera.updateProjectionMatrix();
	}

	#applySphereProjection() {
		this.globalScale = 0.01;
		this.radius = EARTH_RADIUS_METERS * this.globalScale;
		this.#updateUnitsByMeter();

		this.#curLOD = LOD_PLANET;
		this.#applyNewProjection(PROJECTION_SPHERE);

		Renderer.camera.near = 1;
		Renderer.camera.far = this.radius * 2;
		Renderer.camera.updateProjectionMatrix();
	}

	getTileDistance(tile) {
		const distLon = this.#coordDetails.x - tile.middleCoord.x;
		const distLat = this.#coordDetails.y - tile.middleCoord.y;
		return Math.sqrt(Math.pow(distLon, 2) + Math.pow(distLat, 2));
	}
	
	getElevationUnitsAtCoords(lon, lat) {
		const elevation = this.getElevationMetersAtCoords(lon, lat);
		return elevation *= this.webglUnitsByMeter;
	}

	getElevationMetersAtCoords(lon, lat) {
		let elevation = ElevationStore.get(lon, lat);
		return elevation;
	}

	getElevationUnitsForZoom(zoomlevel) { // return altitude in opengl unit
		return GEO.getAltitude(zoomlevel, this.radius, this.projection);
	}

	#updateUnitsByMeter() {
		this.webglUnitsByMeter = 1 * this.globalScale;
	}
}

export const GLOBE = new Globe();
import {
	BufferGeometry,
	Mesh,
	Vector2,
	Vector3,
} from '../vendor/three.module.js';
import * as GlMatrix from "../vendor/gl-matrix/vec3.js";
import Renderer from './renderer.js';
import * as TILE from './tile.js';
import Evt from './event.js';
import GEO from './geo.js';
import ENVIRONMENT from '../environment/environment.js';
import MATH from './math.js';
import ElevationStore from '../tileExtensions/elevation/elevationStore.js';
import CheapRuler from '../vendor/cheap-ruler.js';


const glCurLodOrigine = GlMatrix.create(0, 0, 0);

const EARTH_RADIUS_METERS = 6371000;
const LOD_PLANET = 0; 
const LOD_CITY = 10;
// const LOD_CITY = 16;
const PROJECTION_PLANE = 'PLANE';
const PROJECTION_SPHERE = 'SPHERE';

class Globe {
	#time = 0.5;

	#curLOD = LOD_PLANET;

	#rootTiles = [];

	#currentTile = {
		x: 0,
		y: 0,
		z: 0,
	};

	constructor() {
		this.evt = new Evt();
		this.cameraControler = null;
		this.CUR_ZOOM = 14;
		this.tilesDetailsMarge = 2;
		this.coordDetails = new Vector2( 0, 0 );
		this.radius = EARTH_RADIUS_METERS;
		this.webglUnitsByMeter = this.radius / 40075017.0;
		this.globalScale = 1;
		this.meshe = null;
		this.tilesDefinition = 32;
		this.objToUpdate = [];
		this.meshe = new Mesh(new BufferGeometry());
		this.coordToXYZ = this.#coordToXYZPlane;

		this.offset = [0, 0];

		this.ruler = new CheapRuler(0, 'meters');
	}

	debug() {
		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].debug();
		}
	}
	
	setCameraControler(_controler) {
		this.cameraControler = _controler;
		this.cameraControler.init(this);

		this.cameraControler.evt.addEventListener('READY', this, this.#onCameraReady);
		this.cameraControler.evt.addEventListener('CAM_UPDATED', this, this.#onCameraUpdated);
	}
	
	#onCameraReady() {
		this.cameraControler.evt.removeEventListener('READY', this, this.#onCameraReady);

		this.ruler = new CheapRuler(this.cameraControler.coordLookat.y, 'meters');
		this.webglUnitsByMeter = 1;
		this.#setCoordToWebglUnitsOffset(this.cameraControler.coordLookat.x, this.cameraControler.coordLookat.y);
	}

	#setCoordToWebglUnitsOffset(lon, lat) {
		this.offset[0] = this.ruler.distance([0, 0], [lon, 0]) * this.webglUnitsByMeter;
		this.offset[1] = this.ruler.distance([0, 0], [0, lat]) * this.webglUnitsByMeter;

		const sensLon = Math.sign(lon);
		const sensLat = Math.sign(lat);
		this.offset[0] *= sensLon;
		this.offset[1] *= sensLat;
	}

	#onCameraUpdated(cameraDatas) {
		this.evt.fireEvent('GLOBE_CAMERA_UPDATE', cameraDatas);
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
		this.#time = timeValue;
		this.evt.fireEvent('TIME_CHANGED', this.#time);	
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

	#updateLOD() {
		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].updateVertex();
		}
		Renderer.MUST_RENDER = true;
	}

	updateZoom(zoomValue){
		if (this.CUR_ZOOM == zoomValue) {
			return false;
		}

		if (Math.floor(this.CUR_ZOOM) != Math.floor(zoomValue)) {
			this.evt.fireEvent('ZOOM_CHANGE', Math.floor(zoomValue));
		}

		this.CUR_ZOOM = zoomValue;
		this.checkLOD();
	}

	#setProjection(projectionMode) {
		if (projectionMode == PROJECTION_PLANE) {
			ENVIRONMENT.activate(true);
			this.coordToXYZ = this.#coordToXYZPlane;

		} else if (projectionMode == PROJECTION_SPHERE) {
			ENVIRONMENT.activate(false);
			this.coordToXYZ = this.#coordToXYZSphere;
		}

		this.projection = projectionMode;

		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].updateVertex();
		}

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

		x -= this.offset[0];
		z += this.offset[1];

		return [x, y, z];
	}

	#coordToXYZSphere(lon, lat, elevation) {
		const radius = this.radius + this.#altitudeToWebglUnit(elevation, lat);
		const radY = MATH.radians((lon - 180) * -1);
		const radX = MATH.radians(lat * -1);
		let x = Math.cos(radY) * ((radius) * Math.cos(radX));
		let y = Math.sin(radX) * radius * -1;
		let z = Math.sin(radY) * (radius * Math.cos(radX));
		if (this.#curLOD == LOD_CITY) {
			x -= glCurLodOrigine[0];
			y -= glCurLodOrigine[1];
			z -= glCurLodOrigine[2];
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

	webglUnitsToCoord(webglX, webglY, elevationMeter = 0) {
		// A vérifier, notamment pour les X/Lon
		const absolutePosY = webglY - this.offset[1];
		const pxlStart = this.coordToXYZ(-180, 85.0511, 0);
		const pxlEnd = this.coordToXYZ(180, -85.0511, 0);
		const pxlWidth = Math.abs( pxlEnd[0] - pxlStart[0]);
		const latUnitSize = this.coordToXYZ(0, 85.0511, 0);
		const absoluteLatUnitSize = Math.abs(latUnitSize[2]  - this.offset[1]);
		const prctW = (webglX - pxlStart[0]) / pxlWidth;
		const prctH = (absolutePosY / absoluteLatUnitSize) * -1;
		const coordX = -180 + (prctW * 360);
		let coordY = (prctH * 85.0511);
		const elevationAtCoord = this.getElevationMetersAtCoords(coordX, coordY);
		return [coordX, coordY, elevationAtCoord + elevationMeter];
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
			this.globalScale = 1;
			this.radius = EARTH_RADIUS_METERS;
			this.#updateUnitsByMeter();
			
			this.ruler = new CheapRuler(this.coordDetails.y, 'meters');
			this.#setCoordToWebglUnitsOffset(this.coordDetails.x, this.coordDetails.y);
			
			const origin = this.coordToXYZ(this.coordDetails.x, this.coordDetails.y, 0);
			GlMatrix.set(glCurLodOrigine, origin[0], origin[1], origin[2]);
			
			this.#curLOD = LOD_CITY;
			this.#updateLOD();
			this.#setProjection(PROJECTION_PLANE);
			Renderer.camera.far = this.webglUnitsByMeter * 500000;
			Renderer.camera.near = this.webglUnitsByMeter * 1;
			Renderer.camera.updateProjectionMatrix();

		} else if (targetLod === LOD_PLANET) {
			GlMatrix.set(glCurLodOrigine, 0, 0, 0)
			this.globalScale = 0.01;
			this.radius = EARTH_RADIUS_METERS * this.globalScale;
			this.#updateUnitsByMeter();

			this.#curLOD = LOD_PLANET;
			this.#setProjection(PROJECTION_SPHERE);
			this.#updateLOD();
			Renderer.camera.near = 1;
			Renderer.camera.far = this.radius;
			Renderer.camera.updateProjectionMatrix();
		}

		this.evt.fireEvent("LOD_CHANGED");
	}

	#mustChangeToLod() {
		if (this.CUR_ZOOM >= LOD_CITY && this.#curLOD != LOD_CITY) {
			return LOD_CITY;
		}

		if (this.CUR_ZOOM >= LOD_PLANET && this.CUR_ZOOM < LOD_CITY && this.#curLOD != LOD_PLANET) {
			return LOD_PLANET;
		}

		return null;
	}
	
	getElevationUnitsAtCoords(lon, lat) {
		const elevation = this.getElevationMetersAtCoords(lon, lat);
		return elevation *= this.webglUnitsByMeter;
	}

	getElevationMetersAtCoords(lon, lat) {
		let elevation = ElevationStore.get(lon, lat);
		return elevation;
	}

	getCoordsDistanceToCamera(lon, lat) {
		return this.ruler.distance([lon, lat], [this.cameraControler.coordLookat.x, this.cameraControler.coordLookat.y]);
	}
	
	#getCurTile() {
		return this.#rootTiles.map(t => {
			return t.getCurTile(this.coordDetails)
		}).filter(res => res).pop();
	}
	
	#onCurTileChange(newTile){
		this.#currentTile = newTile;

		const date = new Date();
		const now = date.getTime();
		
		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].updateDetails(this.coordDetails);
		}
		
		const toto = new Date();
		const after = toto.getTime();
		const elapsedTime = after - now;
		console.log('elapsedTime', elapsedTime);
	}

	updateCurrentTile(coordX, coordY) {
		this.coordDetails.x = coordX;
		this.coordDetails.y = coordY;
		const newTile = GEO.coordsToTile(this.coordDetails.x, this.coordDetails.y, this.CUR_ZOOM);
		if (newTile.x != this.#currentTile.x || newTile.y != this.#currentTile.y || newTile.z != this.#currentTile.z) {
			this.#onCurTileChange(newTile);
		}
		this.#currentTile = newTile;
	}

	getElevationUnitsForZoom(zoomlevel) { // return altitude in opengl unit
		return GEO.getAltitude(zoomlevel, this.radius, this.projection);
	}

	#updateUnitsByMeter() {
		this.webglUnitsByMeter = 1 * this.globalScale;
	}
}

const globe = new Globe();


export { globe as default}

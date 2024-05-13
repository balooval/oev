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

const glCurLodOrigine = GlMatrix.create(0, 0, 0);
const elevationFactor = 1;

const LOD_PLANET = 0; 
const LOD_CITY = 10;
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
		this.radius = 10000;
		this.meter = this.radius / 40075017.0;
		this.globalScale = 1;
		this.meshe = null;
		this.tilesDefinition = 32;
		this.objToUpdate = [];
		this.meshe = new Mesh(new BufferGeometry());
		this.coordToXYZ = this.#coordToXYZPlane;
	} 
	
	setCameraControler(_controler) {
		this.cameraControler = _controler;
		this.cameraControler.init(this);

		this.cameraControler.evt.addEventListener('CAM_UPDATED', this, this.#onCameraUpdated);
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

	addMeshe(_meshe) {
		this.meshe.add(_meshe);
	}

	removeMeshe(_meshe) {
		this.meshe.remove(_meshe);
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
			Renderer.camera.up.set(0, 0, 1);

		} else if (projectionMode == PROJECTION_SPHERE) {
			ENVIRONMENT.activate(false);
			this.coordToXYZ = this.#coordToXYZSphere;
			Renderer.camera.up.set(0, 1, 0);
		}

		this.projection = projectionMode;

		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].updateVertex();
		}

		Renderer.MUST_RENDER = true;
	}

	#coordToXYZPlane(_lon, _lat, _elevation) {
		let x = this.radius * (_lon / 60);
		let y = this.#posFromAltitude(_elevation);
		const tmpZ = Math.log(Math.tan((90 + _lat) * Math.PI / 360.0)) / (Math.PI / 180.0);
		let z = (tmpZ * (2 * Math.PI * this.radius / 2.0) / 180.0);
		x *= this.globalScale;
		y *= this.globalScale;
		z *= this.globalScale;
		x -= glCurLodOrigine[0];
		z -= glCurLodOrigine[2];
		return [x, y, z];
	}

	#coordToXYZSphere(lon, lat, _elevation) {
		_elevation *= this.meter;
		_elevation += this.radius;
		const radY = MATH.radians((lon - 180) * -1);
		const radX = MATH.radians(lat * -1);
		let x = Math.cos(radY) * ((_elevation) * Math.cos(radX));
		let y = Math.sin(radX) * _elevation * -1;
		let z = Math.sin(radY) * (_elevation * Math.cos(radX));
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

	#posFromAltitude(_altitude) {
		return 0 - (_altitude * (this.meter * elevationFactor));
	}

	altitudeFromPos(webglPosition) {
		return ((webglPosition / this.globalScale) / (this.meter * elevationFactor)) * -1;
	}

	coordFromPos(webglX, webglY, elevationMeter = 0) {
		const pxlStart = this.coordToXYZ( -180, 85.0511, 0);
		const pxlEnd = this.coordToXYZ( 180, -85.0511, 0);
		const pxlWidth = Math.abs( pxlEnd[0] - pxlStart[0]);
		const pxlHeight = Math.abs( pxlEnd[2] - pxlStart[2]) / 2;
		const prctW = (webglX - pxlStart[0]) / pxlWidth;
		const prctH = ((webglY - pxlEnd[2]) / pxlHeight) - 1;
		const coordX = -180 + (prctW * 360);
		let coordY = (prctH * 180);
		coordY = 180 / Math.PI * (2 * Math.atan( Math.exp( coordY * Math.PI / 180.0)) - Math.PI / 2.0);
		const elevationAtCoord = this.getElevationAtCoords(coordX, coordY, true);
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
			this.globalScale = 10;
			this.#updateMeter();
			GlMatrix.copy(glCurLodOrigine, this.coordToXYZ(this.coordDetails.x, this.coordDetails.y, 0));
			this.#curLOD = LOD_CITY;
			this.#updateLOD();
			this.#setProjection(PROJECTION_PLANE);
			Renderer.camera.far = this.radius * this.globalScale;
			Renderer.camera.near = (this.radius * this.globalScale ) / 1000000;
			Renderer.camera.updateProjectionMatrix();

		} else if (targetLod === LOD_PLANET) {
			GlMatrix.set(glCurLodOrigine, 0, 0, 0)
			this.globalScale = 1;
			this.#updateMeter();
			this.#curLOD = LOD_PLANET;
			this.#setProjection(PROJECTION_SPHERE);
			this.#updateLOD();
			Renderer.camera.far = (this.radius * 2 ) * this.globalScale;
			Renderer.camera.near = (this.radius * this.globalScale) / 1000000;
			Renderer.camera.updateProjectionMatrix();
			if (Renderer.scene.fog) {
				Renderer.scene.fog.near = this.radius * (0.01 * this.globalScale);
				Renderer.scene.fog.far = this.radius * (0.9 * this.globalScale);
			}
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
	
	getElevationAtCoords(lon, lat, inMeters = false) {
		let elevation = ElevationStore.get(lon, lat);

		if (inMeters) {
			return elevation;
		}

		return elevation *= (this.meter * elevationFactor);
	}
	
	#getCurTile() {
		return this.#rootTiles.map(t => {
			return t.getCurTile(this.coordDetails)
		}).filter(res => res).pop();
	}
	
	#onCurTileChange(newTile){
		this.#currentTile = newTile;
		for (let i = 0; i < this.#rootTiles.length; i ++) {
			this.#rootTiles[i].updateDetails(this.coordDetails);
		}
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

	altitude(zoomlevel) { // return altitude in opengl unit
		return GEO.getAltitude(zoomlevel, this.radius, this.projection);
	}

	#updateMeter() {
		this.meter = (this.radius / 40075017.0) * this.globalScale;
	}
}

const globe = new Globe();


export { globe as default}

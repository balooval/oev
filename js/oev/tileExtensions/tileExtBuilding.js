import GLOBE from '../globe.js';
import * as TileExtension from './tileExtension.js';
import ElevationDatas from '../globeElevation.js';
import Evt from '../event.js';

const workerEvent = new Evt();
const worker = new Worker('js/oev/workers/buildingMaker.js');
worker.onmessage = onWorkerMessage;

function onWorkerMessage(_res) {
	workerEvent.fireEvent('BUILDING_READY_' + _res.data.tileKey, _res.data.result);
}

let loaderBuilding = null;
export function setBuildingLoader(_loader) {
	loaderBuilding = _loader;
}

export class BuildingExtension {
	constructor(_tile) {
		this.id = 'BUILDING';
		this.datas = undefined;
		this.meshWalls = undefined;
		this.meshRoof = undefined;
		this.waiting = false;
		this.tile = _tile;
		this.tileKey = this.tile.zoom + '_' + this.tile.tileX + '_' + this.tile.tileY;
		if (TileExtension.Params.actives['ACTIV_' + this.id] === undefined) {
			TileExtension.Params.actives['ACTIV_' + this.id] = false;
		}
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		if (TileExtension.Params.actives['ACTIV_' + this.id]) {
			this.onActivate();
		}
	}

	onActivate() {
		TileExtension.Params.actives['ACTIV_' + this.id] = true;
		this.dataLoaded = false;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		if (this.tile.isReady) {
			this.onTileReady();
		}
	}

	onDesactivate() {
		TileExtension.Params.actives['ACTIV_' + this.id] = false;
	}

	onTileReady(_evt) {
		if (!this.tile.onStage) return false;
		if (this.tile.zoom != 15) return false;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		this.waiting = true;
		loaderBuilding.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam, 
				bbox : bbox, 
			}, 
			_datas => {
				this.waiting = false;
				this.onBuildingsLoaded(_datas);
			}
		);
	}
	
	show() {
		if (this.dataLoaded) {
			Oev.Tile.ProcessQueue.addWaiting(this);
		} else {
			this.tileReady();
		}
	}

	onTileDispose() {
		if (TileExtension.Params.actives['ACTIV_' + this.id] === true) {
			this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		}
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.dispose();
	}
	
	onBuildingsLoaded(_datas) {
		if (!this.tile.onStage) return false;
		if (!TileExtension.Params.actives['ACTIV_' + this.id]) return false;
		this.dataLoaded = true;
		this.datas = _datas;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		workerEvent.addEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		worker.postMessage({
			tileKey : this.tileKey,
			buildingsDatas : this.datas,  
			bbox : bbox, 
		});
		
	}

	onWorkerFinishedBuild(_res) {
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		this.construct(_res);
	}

	buildRoof(_datas) {
		let bufferVertices = this.applyElevationToVertices(_datas.buildings, _datas.roofsGeometry, 'nbVertRoof');
		bufferVertices = this.convertCoordToPosition(bufferVertices);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('color', new THREE.BufferAttribute(_datas.roofsGeometry.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_datas.roofsGeometry.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.meshRoof = new THREE.Mesh(bufferGeometry, GLOBE.buildingsRoofMat);
		this.meshRoof.receiveShadow = true;
		this.meshRoof.castShadow = true;
		OEV.scene.add(this.meshRoof);
	}

	construct(_datas) {
		if (_datas.buildings.length == 0) return false;
		if (this.meshWalls != undefined) {
			OEV.scene.add(this.meshWalls);
			return false;
		}
		this.buildRoof(_datas);
		let bufferVertices = this.applyElevationToVertices(_datas.buildings, _datas.geometry, 'nbVert');
		bufferVertices = this.convertCoordToPosition(bufferVertices);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('color', new THREE.BufferAttribute(_datas.geometry.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_datas.geometry.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.meshWalls = new THREE.Mesh(bufferGeometry, GLOBE.buildingsWallMatBuffer);
		this.meshWalls.receiveShadow = true;
		this.meshWalls.castShadow = true;
		OEV.scene.add(this.meshWalls);
		OEV.MUST_RENDER = true;
	}

	applyElevationToVertices(_buildings, _geometry, _prop) {
		let bufferVertIndex = 0;
		const buffer = new Float32Array(_geometry.bufferCoord);
		for (let b = 0; b < _buildings.length; b ++) {
			const curBuilding = _buildings[b];
			const alt = ElevationDatas.get(curBuilding.centroid[0], curBuilding.centroid[1]);
			for (let v = 0; v < curBuilding[_prop]; v ++) {
				buffer[bufferVertIndex + 2] += alt;
				bufferVertIndex += 3;
			}
		}
		return buffer;
	}

	convertCoordToPosition(_bufferCoord) {
		const bufferPos = new Float32Array(_bufferCoord);
		let bufferVertIndex = 0;
		for (let c = 0; c < _bufferCoord.length; c ++) {
			const vertPos = GLOBE.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			bufferPos[bufferVertIndex + 0] = vertPos.x;
			bufferPos[bufferVertIndex + 1] = vertPos.y;
			bufferPos[bufferVertIndex + 2] = vertPos.z;
			bufferVertIndex += 3;
		}
		return bufferPos;
	}

	dispose() {
		if (!this.dataLoaded){
			loaderBuilding.abort({
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY
			});
		}
		if (this.meshWalls != undefined) {
			OEV.scene.remove(this.meshWalls);
			OEV.scene.remove(this.meshRoof);
			this.meshWalls.geometry.dispose();
			this.meshWalls = undefined;
			this.meshRoof.geometry.dispose();
			this.meshRoof = undefined;
		}
		OEV.MUST_RENDER = true;
	}

}
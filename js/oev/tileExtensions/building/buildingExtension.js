import Renderer from '../../renderer.js';
import Evt from '../../utils/event.js';
import GLOBE from '../../globe.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as BuildingsDatas from './buildingStore.js';

export {setApiUrl} from './buildingLoader.js';

export function extensionClass() {
	return BuildingExtension;
}

const materialWalls = new THREE.MeshPhongMaterial({shininess:0,color:0xdddddd,vertexColors:THREE.VertexColors});
const materialRoof = new THREE.MeshPhongMaterial({shininess:0,color:0xeeeeee,vertexColors:THREE.VertexColors});

const workerEvent = new Evt();
const worker = new Worker('js/oev/tileExtensions/building/workerBuildingMaker.js');
worker.onmessage = onWorkerMessage;

function onWorkerMessage(_res) {
	workerEvent.fireEvent('BUILDING_READY_' + _res.data.tileKey, _res.data.result);
}

class BuildingExtension {
	constructor(_tile) {
		this.id = 'BUILDING';
		this.datas = undefined;
		this.dataLoaded = false;
		this.meshWalls = undefined;
		this.meshRoof = undefined;
		this.waiting = false;
		this.tile = _tile;
		this.isActive = this.tile.zoom == 15;
		// this.isActive = this.tile.key == '16597_11268_15';

		this.tileKey = this.tile.zoom + '_' + this.tile.tileX + '_' + this.tile.tileY;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.dispose);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady(_evt) {
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		if (!this.isActive) return false;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		this.waiting = true;
		BuildingsDatas.store.get(this.tile.zoom, this.tile.tileX, this.tile.tileY, bbox, this.tile.distToCam, _datas => {
			this.waiting = false;
			this.onBuildingsLoaded(_datas);
		});
	}

	onBuildingsLoaded(_datas) {
		if (!this.tile) return false;
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
			zoom : this.tile.zoom, 
		});
	}

	onWorkerFinishedBuild(_res) {
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		this.construct(_res);
	}

	construct(_datas) {
		if (this.meshWalls != undefined) {
			Renderer.scene.add(this.meshWalls);
			return false;
		}
		this.buildRoof(_datas.roofsBuffers);
		this.buildWalls(_datas.wallsBuffers);
		Renderer.MUST_RENDER = true;
	}

	buildRoof(roofsDatas) {
		if (!roofsDatas) return;
		const roofsGeometries = [];
		for (let r = 0; r < roofsDatas.buildingNb; r ++) {
			const roofBuffers = roofsDatas.buffers[r];
			this.applyElevationToVerticesRoof(roofBuffers, roofsDatas.centroids[r]);
			this.convertCoordToPositionRoof(roofBuffers.bufferCoord);
			const bufferGeometry = new THREE.BufferGeometry();
			bufferGeometry.addAttribute('position', new THREE.BufferAttribute(roofBuffers.bufferCoord, 3));
			bufferGeometry.addAttribute('color', new THREE.BufferAttribute(roofBuffers.bufferColor, 3, true));
			bufferGeometry.setIndex(new THREE.BufferAttribute(roofBuffers.bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			bufferGeometry.computeFaceNormals();
			roofsGeometries.push(bufferGeometry);
		}
		const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(roofsGeometries);
		this.meshRoof = new THREE.Mesh(mergedGeometry, materialRoof);
		this.meshRoof.receiveShadow = true;
		this.meshRoof.castShadow = true;
		Renderer.scene.add(this.meshRoof);
	}

	applyElevationToVerticesRoof(_buffers, _centroid) {
		const alt = ElevationStore.get(_centroid[0], _centroid[1]);
		for (let v = 2; v < _buffers.bufferCoord.length; v += 3) {
		_buffers.bufferCoord[v] += alt;
		}
	}
	convertCoordToPositionRoof(_bufferCoord) {
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
			const vertPos = GLOBE.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			_bufferCoord[bufferVertIndex + 0] = vertPos.x;
			_bufferCoord[bufferVertIndex + 1] = vertPos.y;
			_bufferCoord[bufferVertIndex + 2] = vertPos.z;
			bufferVertIndex += 3;
		}
	}

	buildWalls(_buffers) {
		if (!_buffers) return;
		this.applyElevationToVertices(_buffers);
		this.convertCoordToPosition(_buffers.bufferCoord);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(_buffers.bufferCoord, 3));
		bufferGeometry.addAttribute('color', new THREE.BufferAttribute(_buffers.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_buffers.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.meshWalls = new THREE.Mesh(bufferGeometry, materialWalls);
		this.meshWalls.receiveShadow = true;
		this.meshWalls.castShadow = true;
		Renderer.scene.add(this.meshWalls);
	}

	applyElevationToVertices(_buffers) {
		let bufferVertIndex = 0;
		for (let b = 0; b < _buffers.buildingNb; b ++) {
			const center = _buffers.centroids[b];
			const alt = ElevationStore.get(center[0], center[1]);
			for (let v = 0; v < _buffers.verticesNbs[b]; v ++) {
				_buffers.bufferCoord[bufferVertIndex + 2] += alt;
				bufferVertIndex += 3;
			}
		}
	}

	convertCoordToPosition(_bufferCoord) {
		// const bufferPos = new Float32Array(_bufferCoord);
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
			const vertPos = GLOBE.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			_bufferCoord[bufferVertIndex + 0] = vertPos.x;
			_bufferCoord[bufferVertIndex + 1] = vertPos.y;
			_bufferCoord[bufferVertIndex + 2] = vertPos.z;
			bufferVertIndex += 3;
		}
		// return bufferPos;
	}

	dispose() {
		this.tile.evt.removeEventListener('DISPOSE', this, this.dispose);
		if (!this.isActive) return false;
		if (!this.dataLoaded){
			BuildingsDatas.store.abort(this.tile.zoom, this.tile.tileX, this.tile.tileY);
		}
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		if (this.meshWalls != undefined) {
			Renderer.scene.remove(this.meshWalls);
			Renderer.scene.remove(this.meshRoof);
			this.meshWalls.geometry.dispose();
			this.meshWalls = undefined;
			this.meshRoof.geometry.dispose();
			this.meshRoof = undefined;
		}
		this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}
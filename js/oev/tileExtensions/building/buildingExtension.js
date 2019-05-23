import Renderer from '../../renderer.js';
import Evt from '../../utils/event.js';
import GLOBE from '../../globe.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as BuildingsDatas from './buildingStore.js';

export {setApiUrl} from './buildingLoader.js';

export function extensionClass() {
	return BuildingExtension;
}

const materialWalls = new THREE.MeshPhongMaterial({shininess: 0, color: 0xeeeeee, side: THREE.DoubleSide, vertexColors: THREE.FaceColors});
const materialRoof = new THREE.MeshPhongMaterial({shininess: 0, color: 0xCCCCCC, side: THREE.DoubleSide, vertexColors: THREE.VertexColors });

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
		// this.isActive = this.tile.key == '9649_12315_15';

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

	buildRoof(_buffers) {
		if (!_buffers) return;
		let bufferVertices = this.applyElevationToVertices(_buffers);
		bufferVertices = this.convertCoordToPosition(bufferVertices);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('color', new THREE.BufferAttribute(_buffers.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_buffers.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.meshRoof = new THREE.Mesh(bufferGeometry, materialRoof);
		this.meshRoof.receiveShadow = true;
		this.meshRoof.castShadow = true;
		Renderer.scene.add(this.meshRoof);
	}

	buildWalls(_buffers) {
		if (!_buffers) return;
		let bufferVertices = this.applyElevationToVertices(_buffers);
		bufferVertices = this.convertCoordToPosition(bufferVertices);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
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
		const buffer = new Float32Array(_buffers.bufferCoord);
		for (let b = 0; b < _buffers.buildingNb; b ++) {
			const center = _buffers.centroids[b];
			const alt = ElevationStore.get(center[0], center[1]);
			for (let v = 0; v < _buffers.verticesNbs[b]; v ++) {
				buffer[bufferVertIndex + 2] += alt;
				bufferVertIndex += 3;
			}
		}
		return buffer;
	}

	convertCoordToPosition(_bufferCoord) {
		const bufferPos = new Float32Array(_bufferCoord);
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
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
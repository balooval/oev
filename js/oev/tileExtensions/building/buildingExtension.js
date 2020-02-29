import * as THREE from '../../../libs/three.module.js';
import * as BufferGeometryUtils from '../../../libs/BufferGeometryUtils-module.js';
import Renderer from '../../renderer.js';
import Evt from '../../utils/event.js';
import GLOBE from '../../globe.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as BuildingsDatas from './buildingStore.js';
import * as CachedGeometry from '../../utils/cacheGeometry.js';

export {setApiUrl} from './buildingLoader.js';

export function extensionClass() {
	return BuildingExtension;
}

const materialWalls = new THREE.MeshPhongMaterial({shininess:0,color:0xaaaaaa,vertexColors:THREE.VertexColors});
const materialRoof = new THREE.MeshPhongMaterial({shininess:0,color:0xaaaaaa,vertexColors:THREE.VertexColors});

const workerEvent = new Evt();
const worker = new Worker('js/oev/tileExtensions/building/workerBuildingMaker.js', {type:'module'});
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
		this.meshEntrances = undefined;
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
		if (this.meshWalls != undefined) { // TODO: et le mesh roof ?
			Renderer.scene.add(this.meshWalls);
			return false;
		}
		this.buildRoof(_datas.roofsBuffers);
		this.buildWalls(_datas.wallsBuffers);
		this.buildEntrances(_datas.entrancesDatas);
		Renderer.MUST_RENDER = true;
	}

	buildEntrances(_entrancesDatas) {
		if (!_entrancesDatas) return;
		if (!_entrancesDatas.length) return;
		const entrancesGeometries = new Array(_entrancesDatas.length);
		for (let i = 0; i < _entrancesDatas.length; i ++) {
			const entrance = _entrancesDatas[i];
			const alt = ElevationStore.get(entrance.coord[0], entrance.coord[1]);
			const distance = (GLOBE.meter * 0.001) * 3;
			const corners = [];
			const angleStep = Math.PI / 2;
			for (let a = 0; a < 4; a ++) {
				const curAngle = (entrance.angle - Math.PI / 4) + (angleStep * a);
				corners.push([
					entrance.coord[0] + Math.cos(curAngle) * distance, 
					entrance.coord[1] + Math.sin(curAngle) * distance, 
					alt - 5, 
				]);
			}
			const positions = [];
			for (let j = 0; j < 2; j ++) {
				for (let c = 0; c < corners.length; c ++) {
					const vertPos = GLOBE.coordToXYZ(
						corners[c][0], 
						corners[c][1], 
						corners[c][2] + (j * 7), 
					);
					positions.push(vertPos.x);
					positions.push(vertPos.y);
					positions.push(vertPos.z);
				}
			}
			const bufferCoord = Float32Array.from(positions);
			const facesIndex = [
				0, 1, 4, 
				1, 5, 4, 
				1, 2, 5, 
				2, 6, 5, 
				2, 3, 6, 
				3, 7, 6, 
				3, 0, 7, 
				0, 4, 7, 
				4, 5, 7, 
				5, 6, 7, 
			];
			const bufferFaces = Uint32Array.from(facesIndex);

			// const bufferGeometry = new THREE.BufferGeometry();
			const bufferGeometry = CachedGeometry.getGeometry();
			bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferCoord, 3));
			bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			bufferGeometry.computeFaceNormals();
			entrancesGeometries[i] = bufferGeometry;
		}
		const mergedGeometry = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(entrancesGeometries);
		CachedGeometry.storeGeometries(entrancesGeometries);
		// this.meshEntrances = new THREE.Mesh(mergedGeometry, materialRoof);
		this.meshEntrances = CachedGeometry.getMesh();
		this.meshEntrances.geometry = mergedGeometry;
		this.meshEntrances.material = materialRoof;
		this.meshEntrances.receiveShadow = true;
		this.meshEntrances.castShadow = true;
		Renderer.scene.add(this.meshEntrances);
	}

	buildRoof(roofsDatas) {
		if (!roofsDatas) return;
		const roofsGeometries = new Array(roofsDatas.buildingNb);
		for (let r = 0; r < roofsDatas.buildingNb; r ++) {
			const roofBuffers = roofsDatas.buffers[r];
			this.applyElevationToVerticesRoof(roofBuffers, roofsDatas.centroids[r]);
			this.convertCoordToPositionRoof(roofBuffers.bufferCoord);
			const bufferGeometry = CachedGeometry.getGeometry();
			// const bufferGeometry = new THREE.BufferGeometry();
			bufferGeometry.setAttribute('position', new THREE.BufferAttribute(roofBuffers.bufferCoord, 3));
			bufferGeometry.setAttribute('color', new THREE.BufferAttribute(roofBuffers.bufferColor, 3, true));
			bufferGeometry.setIndex(new THREE.BufferAttribute(roofBuffers.bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			bufferGeometry.computeFaceNormals();
			roofsGeometries[r] = bufferGeometry;
		}
		const mergedGeometry = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(roofsGeometries);
		CachedGeometry.storeGeometries(roofsGeometries);
		// this.meshRoof = new THREE.Mesh(mergedGeometry, materialRoof);
		this.meshRoof = CachedGeometry.getMesh();
		this.meshRoof.geometry = mergedGeometry;
		this.meshRoof.material = materialRoof;

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
		const bufferGeometry = CachedGeometry.getGeometry();
		// const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.setAttribute('position', new THREE.BufferAttribute(_buffers.bufferCoord, 3));
		bufferGeometry.setAttribute('color', new THREE.BufferAttribute(_buffers.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_buffers.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		// this.meshWalls = new THREE.Mesh(bufferGeometry, materialWalls);
		this.meshWalls = CachedGeometry.getMesh();
		this.meshWalls.geometry = bufferGeometry;
		this.meshWalls.material = materialWalls;

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
			Renderer.scene.remove(this.meshEntrances);
			// this.meshWalls.geometry.dispose();
			CachedGeometry.storeGeometries(this.meshWalls.geometry);
			CachedGeometry.storeMesh(this.meshWalls);
			this.meshWalls = undefined;
			this.meshRoof.geometry.dispose();
			CachedGeometry.storeMesh(this.meshRoof);
			this.meshRoof = undefined;
		}
		if (this.meshEntrances) {
			this.meshEntrances.geometry.dispose();
			CachedGeometry.storeMesh(this.meshEntrances);
			this.meshEntrances = undefined;
		}
		this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}
import {
	BufferAttribute,
	DoubleSide,
	MeshPhysicalMaterial,
} from '../../vendor/three.module.js';
import * as BufferGeometryUtils from '../../vendor/BufferGeometryUtils.module.js';
import Renderer from '../../core/renderer.js';
import Evt from '../../core/event.js';
import Earcut from '../../vendor/Earcut.module.js';
import GLOBE from '../../core/globe.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as BuildingsDatas from './buildingStore.js';
import * as CachedGeometry from '../../utils/cacheGeometry.js';
import MATH from '../../core/math.js';

export {setApiUrl} from './buildingLoader.js';

export function extensionClass() {
	return BuildingExtension;
}

const materialWalls = new MeshPhysicalMaterial({roughness:1, metalness:0,color:0xffffff,vertexColors:true, side: DoubleSide});
const materialRoof = new MeshPhysicalMaterial({roughness:1, metalness:0,color:0xffffff,vertexColors:true,side: DoubleSide});

const workerEvent = new Evt();
const workerBuildingMaker = new Worker('/app/tileExtensions/building/workerBuildingMaker.js', {type:'module'});
workerBuildingMaker.onmessage = onWorkerMessage;

function onWorkerMessage(res) {
	workerEvent.fireEvent('BUILDING_READY_' + res.data.tileKey, res.data.result);
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
		this.tileKey = this.tile.zoom + '_' + this.tile.tileX + '_' + this.tile.tileY;
		this.tile.evt.addEventListener('TILE_READY', this, this.#onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.dispose);
		if (this.tile.isReady) this.#onTileReady();
	}

	#onTileReady(_evt) {
		this.tile.evt.removeEventListener('TILE_READY', this, this.#onTileReady);
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
			this.#onBuildingsLoaded(_datas);
		});
	}

	#onBuildingsLoaded(_datas) {
		if (!this.tile) return false;
		this.dataLoaded = true;
		this.datas = _datas;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		workerEvent.addEventListener('BUILDING_READY_' + this.tileKey, this, this.#onWorkerFinishedBuild);
		workerBuildingMaker.postMessage({
			tileKey : this.tileKey,
			buildingsDatas : this.datas,  
			bbox : bbox, 
			zoom : this.tile.zoom, 
		});
	}

	#onWorkerFinishedBuild(_res) {
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.#onWorkerFinishedBuild);
		this.#construct(_res);
	}

	#construct(_datas) {
		if (this.meshWalls != undefined) { // TODO: et le mesh roof ?
			Renderer.scene.add(this.meshWalls);
			return false;
		}
		this.#buildRoof(_datas.roofsBuffers);
		this.#buildWalls(_datas.wallsBuffers);
		// this.#buildEntrances(_datas.entrancesDatas);
		Renderer.MUST_RENDER = true;
	}

	#buildEntrances(_entrancesDatas) {
		if (!_entrancesDatas) return;
		if (!_entrancesDatas.length) return;
		const entrancesGeometries = new Array(_entrancesDatas.length);
		for (let i = 0; i < _entrancesDatas.length; i ++) {
			const entrance = _entrancesDatas[i];
			const alt = ElevationStore.get(entrance.coord[0], entrance.coord[1]);
			const distance = (GLOBE.webglUnitsByMeter * 0.001) * 3;
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
					positions.push(vertPos[0]);
					positions.push(vertPos[1]);
					positions.push(vertPos[2]);
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

			const bufferGeometry = CachedGeometry.getGeometry();
			bufferGeometry.setAttribute('position', new BufferAttribute(bufferCoord, 3));
			bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			entrancesGeometries[i] = bufferGeometry;
		}
		const mergedGeometry = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(entrancesGeometries);
		CachedGeometry.storeGeometries(entrancesGeometries);
		// this.meshEntrances = new Mesh(mergedGeometry, materialRoof);
		this.meshEntrances = CachedGeometry.getMesh();
		this.meshEntrances.geometry = mergedGeometry;
		this.meshEntrances.material = materialRoof;
		this.meshEntrances.receiveShadow = true;
		this.meshEntrances.castShadow = true;
		Renderer.scene.add(this.meshEntrances);
	}

	#buildRoof(roofsDatas) {
		if (!roofsDatas) {
			return;
		}

		const roofsGeometries = [];

		for (let roofIndex = 0; roofIndex < roofsDatas.buildingNb; roofIndex ++) {
			let roofBuffers = roofsDatas.buffers[roofIndex];

			if (roofBuffers.skeleton) {
				roofBuffers = this.#buildSkeletonRoof(roofBuffers);
				if (roofBuffers === null) {
					continue;
				}
			}

			this.#applyElevationToVerticesRoof(roofBuffers, roofsDatas.centroids[roofIndex]);
			this.#convertCoordToPositionRoof(roofBuffers.bufferCoord);
			const bufferGeometry = CachedGeometry.getGeometry();
			bufferGeometry.setAttribute('position', new BufferAttribute(roofBuffers.bufferCoord, 3));
			bufferGeometry.setAttribute('color', new BufferAttribute(roofBuffers.bufferColor, 3, true));
			bufferGeometry.setIndex(new BufferAttribute(roofBuffers.bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			roofsGeometries.push(bufferGeometry);
		}

		if (roofsGeometries.length === 0) {
			return;
		}

		const mergedGeometry = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(roofsGeometries);
		CachedGeometry.storeGeometries(roofsGeometries);
		this.meshRoof = CachedGeometry.getMesh();
		this.meshRoof.geometry = mergedGeometry;
		this.meshRoof.material = materialRoof;

		this.meshRoof.receiveShadow = true;
		this.meshRoof.castShadow = true;
		Renderer.scene.add(this.meshRoof);
	}

	#buildSkeletonRoof(roofBuffers) {
		const orientedBorder = MATH.fixPolygonDirection(roofBuffers.border, false);
		const polygon = [
			orientedBorder
		];

		const result = SkeletonBuilder.buildFromPolygon(polygon);

		if (result === null) {
			return null;
		}

		const verticesPositions = [];
		const colors = [];
		for (let i = 0; i < result.vertices.length; i ++) {
			let vertAlt = 0;
			if (result.vertices[i][2] > 0) {
				vertAlt = roofBuffers.roofHeight;
			}
			verticesPositions.push(
				result.vertices[i][0],
				result.vertices[i][1],
				roofBuffers.roofAlt + vertAlt,
			);
			colors.push(...roofBuffers.color);
		}

		const facesIndex = [];

		for (let i = 0; i < result.polygons.length; i ++) {
			const positions = result.polygons[i].map(vertexIndex => {
				return [
					result.vertices[vertexIndex][0],
					result.vertices[vertexIndex][1],
				];
			});

			const earcutResult = Earcut(positions.flat());

			for (let j = 0; j < earcutResult.length; j ++) {
				const index = earcutResult[j];
				facesIndex.push(result.polygons[i][index]);
			}
		}

		roofBuffers.bufferFaces = Uint32Array.from(facesIndex);
		roofBuffers.bufferCoord = new Float32Array(verticesPositions);
		roofBuffers.bufferColor = new Uint8Array(colors);

		return roofBuffers;
	}

	#applyElevationToVerticesRoof(_buffers, _centroid) {
		const alt = ElevationStore.get(_centroid[0], _centroid[1]);
		for (let v = 2; v < _buffers.bufferCoord.length; v += 3) {
		_buffers.bufferCoord[v] += alt;
		}
	}

	#convertCoordToPositionRoof(_bufferCoord) {
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
			const vertPos = GLOBE.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			_bufferCoord[bufferVertIndex + 0] = vertPos[0];
			_bufferCoord[bufferVertIndex + 1] = vertPos[1];
			_bufferCoord[bufferVertIndex + 2] = vertPos[2];
			bufferVertIndex += 3;
		}
	}

	#buildWalls(buildingsWallsBuffers) {
		if (!buildingsWallsBuffers) {
			return;
		}
		this.#applyElevationToVertices(buildingsWallsBuffers);
		this.#convertCoordToPosition(buildingsWallsBuffers.bufferCoord);
		const bufferGeometry = CachedGeometry.getGeometry();
		bufferGeometry.setAttribute('position', new BufferAttribute(buildingsWallsBuffers.bufferCoord, 3));
		bufferGeometry.setAttribute('color', new BufferAttribute(buildingsWallsBuffers.bufferColor, 3, true));
		bufferGeometry.setIndex(new BufferAttribute(buildingsWallsBuffers.bufferFaces, 1));
        bufferGeometry.computeVertexNormals();
		this.meshWalls = CachedGeometry.getMesh();
		this.meshWalls.geometry = bufferGeometry;
		this.meshWalls.material = materialWalls;

		this.meshWalls.receiveShadow = true;
		this.meshWalls.castShadow = true;
		Renderer.scene.add(this.meshWalls);
	}

	#applyElevationToVertices(buildingsWallsBuffers) {
		let bufferVertIndex = 0;
		
		for (let b = 0; b < buildingsWallsBuffers.buildingNb; b ++) {
			const center = buildingsWallsBuffers.centroids[b];
			const alt = ElevationStore.get(center[0], center[1]);

			for (let v = 0; v < buildingsWallsBuffers.verticesNbs[b]; v ++) {
				buildingsWallsBuffers.bufferCoord[bufferVertIndex + 2] += alt;
				bufferVertIndex += 3;
			}
		}
	}

	#convertCoordToPosition(_bufferCoord) {
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
			const vertPos = GLOBE.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			_bufferCoord[bufferVertIndex + 0] = vertPos[0];
			_bufferCoord[bufferVertIndex + 1] = vertPos[1];
			_bufferCoord[bufferVertIndex + 2] = vertPos[2];
			bufferVertIndex += 3;
		}
	}

	dispose() {
		this.tile.evt.removeEventListener('DISPOSE', this, this.dispose);
		if (!this.isActive) return false;
		if (!this.dataLoaded){
			BuildingsDatas.store.abort(this.tile.zoom, this.tile.tileX, this.tile.tileY);
		}
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.#onWorkerFinishedBuild);
		if (this.meshWalls != undefined) {
			Renderer.scene.remove(this.meshWalls);
			Renderer.scene.remove(this.meshRoof);
			Renderer.scene.remove(this.meshEntrances);
			CachedGeometry.storeGeometries(this.meshWalls.geometry);
			CachedGeometry.storeMesh(this.meshWalls);
			this.meshWalls = undefined;
		}
		
		if (this.meshRoof) {
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
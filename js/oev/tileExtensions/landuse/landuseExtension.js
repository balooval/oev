import Renderer from '../../renderer.js';
import * as LanduseLoader from './landuseLoader.js';
import Evt from '../../utils/event.js';
import ElevationStore from '../elevation/elevationStore.js';
import GLOBE from '../../globe.js';

const loadersWaiting = [];

function compute(_loader, _datas) {
    loadersWaiting.push(_loader);
    workerParser.postMessage(_datas);
}

function onWorkerMessage(_res) {
    const loader = loadersWaiting.shift();
    loader.datasReady(_res.data);
}

const workerParser = new Worker('js/oev/tileExtensions/landuse/workerLanduseJsonParser.js');
workerParser.onmessage = onWorkerMessage;

const workerBuilderEvent = new Evt();
const workerBuilder = new Worker('js/oev/tileExtensions/landuse/workerLanduseMaker.js');
workerBuilder.onmessage = onWorkerBuilderMessage;

function onWorkerBuilderMessage(_res) {
	workerBuilderEvent.fireEvent('LANDUSE_READY_' + _res.data.tileKey, _res.data.result);
}

export class LanduseExtension {
	constructor(_tile) {
		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.meshWalls = undefined;
		this.meshRoof = undefined;
        this.json = null;
        this.tile = _tile;
        this.tileKey = this.tile.zoom + '_' + this.tile.tileX + '_' + this.tile.tileY;
        this.bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
        };
        this.isActive = this.tile.zoom == 15;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		if (this.dataLoaded) {
            // this.tile.setTexture(this.json);
            return true;
        }
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		LanduseLoader.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onLanduseLoaded(_datas)
		);
    }
    
    onLanduseLoaded(_datas) {
        this.json = _datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        compute(this, {json : this.json});
    }
    
    datasReady(_datas) {
        console.log('datasReady', _datas);
        workerBuilderEvent.addEventListener('LANDUSE_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		workerBuilder.postMessage({
			tileKey : this.tileKey,
			landusesDatas : _datas,  
			bbox : this.bbox, 
			zoom : this.tile.zoom, 
		});
    }

    onWorkerFinishedBuild(_res) {
        workerBuilderEvent.removeEventListener('LANDUSE_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		this.construct(_res);
    }

    construct(_datas) {
		if (_datas.landuses.length == 0) return false;
		if (this.meshWalls != undefined) {
			Renderer.scene.add(this.meshWalls);
			return false;
		}
		this.buildRoof(_datas);
		let bufferVertices = this.applyElevationToVertices(_datas.landuses, _datas.geometryWalls, 'nbVert');
		bufferVertices = this.convertCoordToPosition(bufferVertices);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('color', new THREE.BufferAttribute(_datas.geometryWalls.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_datas.geometryWalls.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.meshWalls = new THREE.Mesh(bufferGeometry, GLOBE.buildingsWallMatBuffer);
		this.meshWalls.receiveShadow = true;
		this.meshWalls.castShadow = true;
		Renderer.scene.add(this.meshWalls);
		Renderer.MUST_RENDER = true;
    }
    
    buildRoof(_datas) {
		let bufferVertices = this.applyElevationToVertices(_datas.landuses, _datas.geometryRoofs, 'nbVertRoof');
		bufferVertices = this.convertCoordToPosition(bufferVertices);
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('color', new THREE.BufferAttribute(_datas.geometryRoofs.bufferColor, 3, true));
		bufferGeometry.setIndex(new THREE.BufferAttribute(_datas.geometryRoofs.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.meshRoof = new THREE.Mesh(bufferGeometry, GLOBE.buildingsRoofMat);
		this.meshRoof.receiveShadow = true;
		this.meshRoof.castShadow = true;
		Renderer.scene.add(this.meshRoof);
	}

	applyElevationToVertices(_landuses, _geometry, _prop) {
		let bufferVertIndex = 0;
		const buffer = new Float32Array(_geometry.bufferCoord);
		for (let b = 0; b < _landuses.length; b ++) {
			const curBuilding = _landuses[b];
			const alt = ElevationStore.get(curBuilding.centroid[0], curBuilding.centroid[1]);
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
	
	onTileDispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		LanduseLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        if (!this.isActive) return false;
        if (this.meshWalls != undefined) {
			Renderer.scene.remove(this.meshWalls);
			Renderer.scene.remove(this.meshRoof);
			this.meshWalls.geometry.dispose();
			this.meshWalls = undefined;
			this.meshRoof.geometry.dispose();
			this.meshRoof = undefined;
		}
        this.json = null;
		this.dataLoaded = false;
		this.dataLoading = false;
		Renderer.MUST_RENDER = true;
	}
	
}
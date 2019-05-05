import Renderer from '../../renderer.js';
import * as LanduseLoader from './landuseLoader.js';
import Evt from '../../utils/event.js';
import ElevationStore from '../elevation/elevationStore.js';
import GLOBE from '../../globe.js';
import * as NET_TEXTURES from '../../net/NetTextures.js';

const loadersWaiting = [];

function parseJson(_loader, _datas) {
    loadersWaiting.push(_loader);
    workerParser.postMessage(_datas);
}

function onWorkerMessage(_res) {
    const loader = loadersWaiting.shift();
    loader.jsonParsed(_res.data);
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
        this.meshTile = undefined;
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
        parseJson(this, {json : this.json});
    }
    
    jsonParsed(_datas) {
        // console.log('jsonParsed', _datas);
        if (_datas.length == 0) return false;
        const texture = this.makeTexture(_datas);
        this.testGeomTexture(texture);
        Renderer.MUST_RENDER = true;
        /*
        workerBuilderEvent.addEventListener('LANDUSE_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		workerBuilder.postMessage({
			tileKey : this.tileKey,
			landusesDatas : _datas,  
			bbox : this.bbox, 
			zoom : this.tile.zoom, 
        });
        */
    }

    testGeomTexture(_texture) {
        const layersNb = 16;
        let curVertId = 0;
        const nbVerticesByLayer = (GLOBE.tilesDefinition + 1) * (GLOBE.tilesDefinition + 1);
        const verticesNb = nbVerticesByLayer * layersNb;
		const bufferVertices = new Float32Array(verticesNb * 3);
        const vertCoords = this.tile.getVerticesPlaneCoords();
        const elevationDatas = vertCoords.map(c => ElevationStore.get(c[0], c[1]));
        for (let layer = 0; layer < layersNb; layer ++) {
            vertCoords.forEach((c, i) => {
                const vertPos = GLOBE.coordToXYZ(
                    c[0], 
                    c[1], 
                    elevationDatas[i] + (2 * layer)
                );
                bufferVertices[curVertId + 0] = vertPos.x;
                bufferVertices[curVertId + 1] = vertPos.y;
                bufferVertices[curVertId + 2] = vertPos.z;
                curVertId += 3;
            });
        }
		const def = GLOBE.tilesDefinition;
		const vertBySide = def + 1;
		let faceId = 0;
		const nbFacesByLayer = (def * def) * 2;
		const nbFaces = nbFacesByLayer * layersNb;
        const bufferFaces = new Uint32Array(nbFaces * 3);
        let verticeOffset = 0;
        for (let layer = 0; layer < layersNb; layer ++) {
            for (let x = 0; x < def; x ++) {
                for (let y = 0; y < def; y ++) {
                    bufferFaces[faceId + 0] = (x * vertBySide) + y + verticeOffset;
                    bufferFaces[faceId + 1] = (x * vertBySide) + y + 1 + verticeOffset;
                    bufferFaces[faceId + 2] = ((x + 1) * vertBySide) + y + 1 + verticeOffset;
                    bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1 + verticeOffset;
                    bufferFaces[faceId + 4] = ((x + 1) * vertBySide) + y + verticeOffset;
                    bufferFaces[faceId + 5] = (x * vertBySide) + y + verticeOffset;
                    faceId += 6;
                }
            }
            verticeOffset += nbVerticesByLayer;
        }
        const bufferUvs = new Float32Array(verticesNb * 2);
        let stepUvX = 0.25 / GLOBE.tilesDefinition;
        // let stepUvX = 1 / GLOBE.tilesDefinition;
        let stepUvY = 1 / GLOBE.tilesDefinition;
        let uvIndex = 0;
        verticeOffset = 0;
        let uvOffsetX = 0;
        let layerByTextureTile = layersNb / 4;
        for (let layer = 0; layer < layersNb; layer ++) {
            for (let x = 0; x < vertBySide; x ++) {
                for (let y = 0; y < vertBySide; y ++) {
                    uvIndex = (x * vertBySide) + y + verticeOffset;
                    bufferUvs[uvIndex * 2 + 0] = (stepUvX * x) + uvOffsetX;
                    bufferUvs[uvIndex * 2 + 1] = 1 - (stepUvY * y);
                }
            }
            verticeOffset += nbVerticesByLayer;
            uvOffsetX = Math.floor(layer / layerByTextureTile) * 0.25;
        }
		const geoBuffer = new THREE.BufferGeometry();
		geoBuffer.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        geoBuffer.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		geoBuffer.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		geoBuffer.computeFaceNormals();
        geoBuffer.computeVertexNormals();
        geoBuffer.attributes.uv.needsUpdate = true;
        const material = new THREE.MeshPhongMaterial({map:_texture, shininess:0.2,side:THREE.DoubleSide, transparent:true, alphaTest:0.2});
        if (this.meshTile !== undefined) {
            GLOBE.removeMeshe(this.meshTile);
            this.meshTile.geometry.dispose();
		}
        this.meshTile = new THREE.Mesh(geoBuffer, material);
        GLOBE.addMeshe(this.meshTile);
		this.meshTile.castShadow = true;
        this.meshTile.receiveShadow = true;
    }
    
    makeTexture(_landuses) {
        const patterns = [
            'shell_grass_1', 
            'shell_grass_2', 
            'shell_grass_3', 
            'shell_grass_4', 
        ];
        const colors = [
            'rgba(255,0,0,0.2)', 
            'rgba(0,255,0,0.2)', 
            'rgba(0,0,255,0.2)', 
            'rgba(255,0,255,0.2)', 
        ];
        const tileSize = 512;
        const canvasWidth = tileSize * patterns.length;
        const canvasHeight = tileSize;
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const context = canvas.getContext('2d');
        const landusesPixels = _landuses.map(l => l.coords).map(coords => {
            return coords.map(pos => {
                return [
                    this.mapValue(pos[0], this.tile.startCoord.x, this.tile.endCoord.x) * tileSize, 
                    this.mapValue(pos[1], this.tile.endCoord.y, this.tile.startCoord.y) * tileSize
                ];
            });
        });
        let tileOffset = canvasWidth / patterns.length;
        patterns.forEach((pattern, p) => {
        // colors.forEach((color, p) => {
            context.fillStyle = context.createPattern(NET_TEXTURES.texture(pattern).image, 'repeat');
            // context.fillStyle = color;
            landusesPixels.forEach(landuse => {
                context.beginPath();
                const start = landuse.shift();
                const test = tileOffset * p;
                context.moveTo(
                    Math.min((tileOffset * (p + 1)), Math.max(0, start[0]) + (tileOffset * p)), 
                    tileSize - start[1]
                );
                landuse.forEach(pos => {
                    context.lineTo(
                        Math.min((tileOffset * (p + 1)), Math.max(0, pos[0]) + (tileOffset * p)), 
                        tileSize - pos[1]
                    );
                })
                context.fill();
            });
            
        });
       const texture = new THREE.Texture(canvas);
       texture.wrapS = THREE.RepeatWrapping;
       texture.wrapT = THREE.RepeatWrapping;
       texture.needsUpdate = true;
       return texture;
    }

    mapValue(_value, _min, _max) {
        const length = Math.abs(_max - _min);
        if (length == 0) return _value;
        return (_value - _min) / length;
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
        if (this.meshTile != undefined) {
            GLOBE.removeMeshe(this.meshTile);
			this.meshTile.geometry.dispose();
			this.meshTile = undefined;
		}
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
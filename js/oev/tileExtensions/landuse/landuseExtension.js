import Renderer from '../../renderer.js';
import * as LanduseLoader from './landuseLoader.js';
import ShellTexture from './landuseShellTexture.js';
import Evt from '../../utils/event.js';
import ElevationStore from '../elevation/elevationStore.js';
import GLOBE from '../../globe.js';

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

export class LanduseExtension {
	constructor(_tile) {
		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.meshTile = undefined;
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


        const bbox = {
            startX : this.tile.startCoord.x, 
            startY : this.tile.endCoord.y, 
            endX : this.tile.endCoord.x, 
            endY : this.tile.startCoord.y, 
        };

        parseJson(this, {
            json : this.json,
            bbox : bbox, 
            definition : ShellTexture.definition(), 
        });
    }
    
    jsonParsed(_datas) {
        if (_datas.length == 0) return false;
        const texture = ShellTexture.drawTexture(_datas, ShellTexture.definition());
        this.buildGeometry(texture);
        Renderer.MUST_RENDER = true;
    }

    buildGeometry(_texture) {
        const layersNb = 16;
        let curVertId = 0;
        const meterBetweenLayers = 1;
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
                    elevationDatas[i] + (meterBetweenLayers * layer)
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
        let stepUvX = 0.5 / GLOBE.tilesDefinition;
        let stepUvY = 0.5 / GLOBE.tilesDefinition;
        let uvIndex = 0;
        verticeOffset = 0;
        let uvOffsetX = 0;
        let uvOffsetY = 0;
        let layerByTextureTile = layersNb / ShellTexture.tilesNb();
        const layersOffset = ShellTexture.tilesOffset();
        for (let layer = 0; layer < layersNb; layer ++) {
            for (let x = 0; x < vertBySide; x ++) {
                for (let y = 0; y < vertBySide; y ++) {
                    uvIndex = (x * vertBySide) + y + verticeOffset;
                    bufferUvs[uvIndex * 2 + 0] = (stepUvX * x) + uvOffsetX;
                    bufferUvs[uvIndex * 2 + 1] = 1 - ((stepUvY * y) + uvOffsetY);
                }
            }
            verticeOffset += nbVerticesByLayer;
            uvOffsetX = layersOffset[Math.floor(layer / layerByTextureTile)][0];
            uvOffsetY = layersOffset[Math.floor(layer / layerByTextureTile)][1];
        }
		const geoBuffer = new THREE.BufferGeometry();
		geoBuffer.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
        geoBuffer.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		geoBuffer.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		geoBuffer.computeFaceNormals();
        geoBuffer.computeVertexNormals();
        geoBuffer.attributes.uv.needsUpdate = true;
        // const material = new THREE.MeshPhongMaterial({map:_texture, shininess:20.0,side:THREE.DoubleSide, transparent:true, alphaTest:0.2});
        const material = new THREE.MeshPhysicalMaterial({map:_texture, roughness:1,metalness:0,side:THREE.DoubleSide, transparent:true, alphaTest:0.2});
        if (this.meshTile !== undefined) {
            GLOBE.removeMeshe(this.meshTile);
            this.meshTile.geometry.dispose();
		}
        this.meshTile = new THREE.Mesh(geoBuffer, material);
        GLOBE.addMeshe(this.meshTile);
        this.meshTile.receiveShadow = true;
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
			this.meshTile.material.map.dispose();
			this.meshTile.material.dispose();
			this.meshTile.geometry.dispose();
			this.meshTile = undefined;
		}
        this.json = null;
		this.dataLoaded = false;
		this.dataLoading = false;
		Renderer.MUST_RENDER = true;
	}
	
}
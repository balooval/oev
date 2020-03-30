import Evt from '../../core/event.js';
import GEO from '../../core/geo.js';
import Renderer from '../../core/renderer.js';
import * as TILE from '../../core/tile.js';
import * as NET_TEXTURES from '../../net/textures.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as THREE from '../../vendor/three.module.js';
import * as TileExtension from '../tileExtension.js';
import * as CoastLoader from './coastLoader.js';

export { setApiUrl } from './coastLoader.js';

export function extensionClass() {
	return CoastExtension;
}

let evtMaterial = new Evt();
let materialReady = false;; 
let oceanTexture; 

function loadTextures() {
    const texturesList = [
        {
            id : 'coastOcean', 
            url : 'coast-ocean.jpg', 
        },
        {
            id : 'coastOceanBump', 
            url : 'coast-ocean_bump.png', 
        },
        {
            id : 'waterNoise', 
            url : 'water-noise.png', 
        },
    ];
    NET_TEXTURES.loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    oceanTexture = NET_TEXTURES.texture('coastOcean').image;
    materialReady = true;
    console.log('onTexturesLoaded');
    evtMaterial.fireEvent('READY');
}

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_COAST', null, onActivateExtension);

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_COAST', null, onActivateExtension);
    console.log('onActivateExtension COAST');
    loadTextures();
}



class CoastExtension {
	constructor(_tile) {
        this.id = 'COAST';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.canvasDiffuse = null;
        this.datas = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
        
        if (!materialReady) {
            evtMaterial.addEventListener('READY', this, this.onTileReady);
        } else {
            this.onTileReady()
        }
	}

	onTileReady() {
        evtMaterial.removeEventListener('READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);

        // if (this.tile.zoom == 10 && (this.tile.tileX != 524 || this.tile.tileY != 374)) {
        //     return false;
        // }

        if (this.tile.zoom < 10) return false;

        if (this.tile.zoom > 10) {
            return this.getParentDatas(10);
        }

        if (!this.canvasDiffuse) {
            this.canvasDiffuse = createCanvas(TILE.mapSize);
        }

		if (this.dataLoaded) {
            this.drawWaterTexture(this.datas);
            return true;
        }

        if (this.dataLoading) return false;
		this.dataLoading = true;
		CoastLoader.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onCoastLoaded(_datas)
		);
    }

    getParentDatas(_zoom) {
        const parentTile = this.tile.getParent(_zoom);
        if (!parentTile) {
            return false;
        }
        this.canvasDiffuse = createCanvas(TILE.mapSize);
        const parentExtensionCoast = parentTile.extensions.get(this.id)
        const parentDatas = parentExtensionCoast.datas;
        if (!parentDatas) return false;
        if (parentDatas[0] == 'LAND') {
            this.datas = parentDatas;
        } else {
            const tilePolygon = [
                [this.tile.startCoord.x, this.tile.endCoord.y], 
                [this.tile.endCoord.x, this.tile.endCoord.y], 
                [this.tile.endCoord.x, this.tile.startCoord.y], 
                [this.tile.startCoord.x, this.tile.startCoord.y], 
            ];
            this.datas = [];
            parentDatas.forEach(polygon => {
                const results = PolygonClipping.intersection([tilePolygon], [polygon]);
                results.forEach(res => {
                    this.datas.push(res[0]);
                });
            });
        }
        this.drawWaterTexture(this.datas);
        return true;
    }
    
    onCoastLoaded(_datas) {
        if (!this.tile) return false;
        this.datas = JSON.parse(_datas);
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        this.drawWaterTexture(this.datas);
    }




    drawWaterTexture(_polygons) {
        if (_polygons[0] == 'LAND') return;
        const canvasPositions = [];
        convertCoordToCanvasPositions(_polygons, canvasPositions, this.tile.bbox);
        const scale = this.tile.zoom - 9;
        const blurCanvas = getBlurDiffuse(canvasPositions, scale);
        const maskCanvas = getMaskCanvas(canvasPositions);
        const finalContext = this.canvasDiffuse.getContext('2d');
        finalContext.drawImage(blurCanvas, 0, 0);
        finalContext.globalCompositeOperation = 'destination-out';
        finalContext.drawImage(maskCanvas, 0, 0);


        const canvasRough = createCanvas(TILE.mapSize);
        const contextRough = canvasRough.getContext('2d');
        contextRough.fillStyle = "#ffffff";
        contextRough.fillRect(0, 0, TILE.mapSize, TILE.mapSize);
        const canvasBump = createCanvas(TILE.mapSize);
        const contextBump = canvasBump.getContext('2d');
        contextBump.drawImage(NET_TEXTURES.texture('coastOceanBump').image, 0, 0);

        contextRough.globalCompositeOperation = 'destination-in';
        contextRough.drawImage(maskCanvas, 0, 0);
        contextBump.globalCompositeOperation = 'destination-out';
        contextBump.drawImage(maskCanvas, 0, 0);

        const texture = new THREE.CanvasTexture(canvasRough);
        this.tile.material.roughnessMap = texture;
        this.tile.material.needsUpdate = true;
        const textureBump = new THREE.CanvasTexture(canvasBump);
        this.tile.material.bumpMap = textureBump;
        this.tile.material.needsUpdate = true;

        this.tile.extensionsMaps.set(this.id, this.canvasDiffuse);
        this.tile.redrawDiffuse();
        Renderer.MUST_RENDER = true;
    }

    onTileDispose() {
		this.dispose();
	}
	
	hide() {

    }
	
	dispose() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.hide();
        if (this.canvasDiffuse) {
            this.tile.extensionsMaps.delete(this.id);
            this.canvasDiffuse = null;
        }
        this.tile.redrawDiffuse();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile.material.needsUpdate = true;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}


function drawCanvasShape(_coords, _context) {
    const start = _coords[0];
    _context.beginPath();
    _context.fillStyle = '#000000';
    _context.moveTo(start[0], start[1]);
    for (let i = 1; i < _coords.length; i ++) {
        _context.lineTo(_coords[i][0], _coords[i][1]);
    }
    _context.globalCompositeOperation = 'destination-out';
    // _context.globalCompositeOperation = 'source-over';
    _context.closePath();
    _context.fill();
}

function createCanvas(_size) {
    const canvas = document.createElement('canvas');
    canvas.width = _size;
    canvas.height = _size;
    return canvas;
}

function convertCoordToCanvasPositions(_coords, _res, _tileBox) {
    for (let s = 0; s < _coords.length; s ++) {
        const positions = GEO.coordToCanvas(_tileBox, TILE.mapSize, _coords[s]);
        _res.push(positions);
    }
}

function tracePolygon(_context, _coordinates, _fillColor = 'rgba(0,0,0,0)') {
    const copyCoords = [..._coordinates];
    const start = copyCoords.shift();
    _context.beginPath();
    _context.moveTo(start[0], start[1]);
    for (let i = 0; i < copyCoords.length; i ++) {
        const coord = copyCoords[i];
        _context.lineTo(coord[0], coord[1]);
    }
    _context.closePath();
    _context.fillStyle = _fillColor;
    _context.fill();
}



function getBlurDiffuse(_polygons, _scale) {
    const canvas = createCanvas(TILE.mapSize);
    const context = canvas.getContext('2d');
    context.fillStyle = '#02587d';
    context.fillRect(0, 0, TILE.mapSize, TILE.mapSize);
    // const offset = new Offset();
    context.filter = 'blur(' + (8 * _scale) + 'px)';
    _polygons.forEach(polygon => {
        // var margined = offset.data(polygon).margin(64);
        // tracePolygon(context, margined[0], '#0c719c');
        tracePolygon(context, polygon, '#0c719c');
    });

    const canvasFoam = createCanvas(TILE.mapSize);
    const contextFoam = canvasFoam.getContext('2d');
    context.filter = 'none';

    contextFoam.filter = 'blur(' + (4 * _scale) + 'px)';
    _polygons.forEach(polygon => {
        // var margined = offset.data(polygon).margin(4);
        // tracePolygon(contextFoam, margined[0], '#9cedff');
        tracePolygon(contextFoam, polygon, '#9cedff');
    });

    contextFoam.filter = 'none';
    contextFoam.globalCompositeOperation = 'destination-out';
    const waterNoise = NET_TEXTURES.texture('waterNoise').image;
    contextFoam.drawImage(waterNoise, 0, 0, 256, 256, 0, 0, TILE.mapSize * _scale, TILE.mapSize * _scale);

    context.drawImage(canvasFoam, 0, 0);
    return canvas;
}

function getMaskCanvas(_polygons) {
    const canvas = createCanvas(TILE.mapSize);
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, TILE.mapSize, TILE.mapSize);
    _polygons.forEach(polygon => tracePolygon(context, polygon, 'rgba(0,0,0,1)'));
    return canvas;
}

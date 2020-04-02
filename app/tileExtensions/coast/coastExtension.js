import Evt from '../../core/event.js';
import GEO from '../../core/geo.js';
import Renderer from '../../core/renderer.js';
import * as TILE from '../../core/tile.js';
import * as NET_TEXTURES from '../../net/textures.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as TileExtension from '../tileExtension.js';
import * as CoastStore from './coastStore.js';

export { setApiUrl } from './coastLoader.js';

export function extensionClass() {
	return CoastExtension;
}

let evtMaterial = new Evt();
let materialReady = false;; 
let oceanTexture; 


const workerEvt = new Evt();
const workerCanvas = new Worker('/app/tileExtensions/coast/workerCoastDrawer.js', {type:'module'});
// const workerCanvas = new Worker('/app/tileExtensions/coast/workerCoastDrawer.js');
workerCanvas.addEventListener('message', evt => {
    workerEvt.fireEvent('COAST_DRAW_' + evt.data.tileKey, evt.data.pixelsDatas);
});


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
        // if (this.tile.zoom > 10) {
        //     return this.getParentDatas(10);
        // }
        if (!this.canvasDiffuse) {
            this.canvasDiffuse = createCanvas(TILE.mapSize);
        }
		if (this.dataLoaded) {
            this.drawWaterTexture(this.datas);
            return true;
        }
        if (this.dataLoading) return false;
        this.dataLoading = true;
        const keyStore = CoastStore.getKey(this.tile);
        CoastStore.evt.addEventListener('LOADED_' + keyStore, this, this.onCoastLoaded);
        CoastStore.getDatas(this.tile);
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
    
    onCoastLoaded(_evt) {
        CoastStore.evt.removeEventListener('LOADED_' + _evt.key, this, this.onCoastLoaded);
        if (!this.tile) return false;
        this.datas = _evt.datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        this.drawWaterTexture(this.datas);
    }




    onWorkerFinished(_pixelsDatas) {
        if (!this.tile) return;
        if (!this.canvasDiffuse) return;
        const imageDatas = new ImageData(_pixelsDatas, 256, 256);
        const finalContext = this.canvasDiffuse.getContext('2d');
        finalContext.putImageData(imageDatas, 0, 0);
        this.tile.extensionsMaps.set(this.id, this.canvasDiffuse);
        this.tile.redrawDiffuse();
        Renderer.MUST_RENDER = true;
    }


    drawWaterTexture(_polygons) {
        if (_polygons[0] == 'LAND') return;
        workerEvt.addEventListener('COAST_DRAW_' + this.tile.key, this, this.onWorkerFinished);
        workerCanvas.postMessage({
            polygons : _polygons, 
            bbox : this.tile.bbox, 
            scale : this.tile.zoom - 9, 
            tileKey : this.tile.key, 
            zoom : this.tile.zoom, 
        });
    }

    onTileDispose() {
		this.dispose();
	}
	
	hide() {

    }
	
	dispose() {
        const keyStore = CoastStore.getKey(this.tile);
        CoastStore.evt.removeEventListener('LOADED_' + keyStore, this, this.onCoastLoaded);
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
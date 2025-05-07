import Evt from '../../core/event.js';
import * as GEO from '../../core/geo.js';
import Renderer from '../../core/renderer.js';
import {MAP_SIZE as TILE_MAP_SIZE} from '../../core/tile.js';
import * as NET_TEXTURES from '../../net/textures.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as THREE from 'three';
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
            url : 'coast-ocean_bump.png ', 
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
            this.canvasDiffuse = createCanvas(TILE_MAP_SIZE);
        }

		if (this.dataLoaded) {
            this.drawWater(this.datas);
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

        let debug = false;
        if (this.tile.parentTile.zoom == 11 && this.tile.parentTile.tileX == 1047 && this.tile.parentTile.tileY == 748) {
            console.log('parentTile', parentTile.tileX, parentTile.tileY);
            debug = true;
        }
        // if (this.tile.zoom == 12 && this.tile.tileX == 2095 && this.tile.tileY == 1496) {
        //     console.log('this.tile.parentTile', this.tile.parentTile.tileX, this.tile.parentTile.tileY);
        //     debug = true;
        // }

        this.canvasDiffuse = createCanvas(TILE_MAP_SIZE);
        const parentExtensionCoast = parentTile.extensions.get(this.id)
        const parentDatas = parentExtensionCoast.datas;


        if (!parentDatas) return false;

        if (parentDatas[0] == 'LAND') {
            this.datas = parentDatas;
        } else {
        
            // const tilePolygon = [
            //     [this.tile.startLargeCoord.x, this.tile.endLargeCoord.y], 
            //     [this.tile.endLargeCoord.x, this.tile.endLargeCoord.y], 
            //     [this.tile.endLargeCoord.x, this.tile.startLargeCoord.y], 
            //     [this.tile.startLargeCoord.x, this.tile.startLargeCoord.y], 
            // ];
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
            // console.log('this.datas', this.datas);
            /*
            this.datas = PolygonClipping.intersection([tilePolygon], parentDatas);
            if (this.datas.length) {
                this.datas = this.datas[0];
                console.log('tilePolygon', tilePolygon);
                console.log('parentDatas', parentDatas);
                console.log('intersection', this.datas);
            } else {
                console.log('NO intersection', tilePolygon, parentDatas);
            }
            */
        }
        

        // setTimeout(() => this.drawWater(this.datas), 2000);
        this.drawWater(this.datas);
        return true;
    }
    
    onCoastLoaded(_datas) {
        if (!this.tile) return false;
        this.datas = JSON.parse(_datas);
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        this.drawWater(this.datas);
    }

    drawWater(_datas) {

            if (_datas[0] == 'LAND') {
                return;
            }

            // console.log('drawWater', this.tile.zoom);

            
            /*
            const context = this.canvas.getContext('2d');
            context.fillStyle = '#ff0000';
            context.fillRect(0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE);

            const canvasPositions = [];
            convertCoordToCanvasPositions(_datas, canvasPositions, this.tile.bbox);
            canvasPositions.forEach(pixelsPos => {
                drawCanvasShape(pixelsPos, context);
            });
            this.tile.extensionsMaps.set(this.id, this.canvas);
            this.tile.redrawDiffuse();
            */




            
            const context = this.canvasDiffuse.getContext('2d');
            context.drawImage(oceanTexture, 0, 0);
            
            const canvasRough = createCanvas(TILE_MAP_SIZE);
            const contextRough = canvasRough.getContext('2d');
            contextRough.fillStyle = "#ffffff";
            contextRough.fillRect(0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE);

            const canvasBump = createCanvas(TILE_MAP_SIZE);
            const contextBump = canvasBump.getContext('2d');
            contextBump.drawImage(NET_TEXTURES.texture('coastOceanBump').image, 0, 0);
            
            const canvasShape = createCanvas(TILE_MAP_SIZE);
            const contextShape = canvasShape.getContext('2d');
            contextShape.fillStyle = "#000000";
            contextShape.fillRect(0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE);

            const canvasPositions = [];
            convertCoordToCanvasPositions(_datas, canvasPositions, this.tile.bbox);
            canvasPositions.forEach(pixelsPos => {
                drawCanvasShape(pixelsPos, contextShape);
            });
            context.globalCompositeOperation = 'destination-in';
            context.drawImage(canvasShape, 0, 0);
            contextRough.globalCompositeOperation = 'destination-out';
            contextRough.drawImage(canvasShape, 0, 0);
            contextBump.globalCompositeOperation = 'destination-in';
            contextBump.drawImage(canvasShape, 0, 0);


            this.tile.extensionsMaps.set(this.id, this.canvasDiffuse);
            this.tile.redrawDiffuse();

            const texture = new THREE.CanvasTexture(canvasRough);
            this.tile.material.roughnessMap = texture;
            this.tile.material.needsUpdate = true;

            const textureBump = new THREE.CanvasTexture(canvasBump);
            this.tile.material.bumpMap = textureBump;
            
            
            this.tile.material.needsUpdate = true;

            Renderer.MUST_RENDER = true;
    }

    onTileDispose() {
		this.dispose();
	}
	
	hide() {
		// this.dataLoading = false;
		// CoastLoader.loader.abort({
        //     z : this.tile.zoom, 
        //     x : this.tile.tileX, 
        //     y : this.tile.tileY
        // });
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
        const positions = GEO.coordToCanvas(_tileBox, TILE_MAP_SIZE, _coords[s]);
      _res.push(positions);
    }
  }
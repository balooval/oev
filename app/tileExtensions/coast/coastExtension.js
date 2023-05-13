import Evt from '../../core/event.js';
import Renderer from '../../core/renderer.js';
import * as TILE from '../../core/tile.js';
import * as NET_TEXTURES from '../../net/textures.js';
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
    evtMaterial.fireEvent('READY');
}

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_COAST', null, onActivateExtension);

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_COAST', null, onActivateExtension);
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
        if (this.tile.zoom < 10) return false;
        if (!this.canvasDiffuse) {
            this.canvasDiffuse = createCanvas(TILE.mapSize);
        }
		if (this.dataLoaded) {
            this.launchTextureGeneration(this.datas);
            return true;
        }
        if (this.dataLoading) return false;
        this.dataLoading = true;
        const keyStore = CoastStore.getKey(this.tile);
        CoastStore.evt.addEventListener('LOADED_' + keyStore, this, this.onCoastLoaded);
        CoastStore.getDatas(this.tile);
    }
    
    onCoastLoaded(_evt) {
        CoastStore.evt.removeEventListener('LOADED_' + _evt.key, this, this.onCoastLoaded);
        if (!this.tile) return false;
        this.datas = _evt.datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        this.launchTextureGeneration(this.datas);
    }

    onWorkerFinished(_pixelsDatas) {
        if (!this.tile) return;
        workerEvt.removeEventListener('COAST_DRAW_' + this.tile.key, this, this.onWorkerFinished);
        if (!this.canvasDiffuse) return;
        const imageDatas = new ImageData(_pixelsDatas, 256, 256);
        const finalContext = this.canvasDiffuse.getContext('2d');
        finalContext.putImageData(imageDatas, 0, 0);
        this.tile.extensionsMaps.set(this.id, this.canvasDiffuse);
        this.tile.redrawDiffuse();
        Renderer.MUST_RENDER = true;
    }

    launchTextureGeneration(_polygons) {
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

function createCanvas(_size) {
    const canvas = document.createElement('canvas');
    canvas.width = _size;
    canvas.height = _size;
    return canvas;
}

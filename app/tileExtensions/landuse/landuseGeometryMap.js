import {MAP_SIZE as TILE_MAP_SIZE} from '../../core/tile.js';
import { texture as TextureLoader } from '../../net/textures.js';
import * as LanduseMaterial from './landuseMaterial.js';

const tilesWaitingWorker = new Map();
const workerCanvasComposer = new Worker('/app/utils/workerCanvasComposer.js', {type: 'module'});

workerCanvasComposer.onerror = (e) => {
    console.log('WORKER ERROR', e);
}

workerCanvasComposer.onmessage = (e) => {
    if (e.data.command !== 'draw') {
        return;
    }
    
    const tile = tilesWaitingWorker.get(e.data.tileKey);
    createLanduseMap(tile, e.data.imagesDatas);
    tilesWaitingWorker.delete(e.data.tileKey);
};

LanduseMaterial.evt.addEventListener('READY', null, () => {
    Promise.all([
        createImageBitmap(TextureLoader('forest').image).then(bitmapData => ['forest', bitmapData]),
        createImageBitmap(TextureLoader('scrub').image).then(bitmapData => ['scrub', bitmapData]),
        createImageBitmap(TextureLoader('ground').image).then(bitmapData => ['ground', bitmapData]),
        createImageBitmap(TextureLoader('grass').image).then(bitmapData => ['grass', bitmapData]),
        createImageBitmap(TextureLoader('road').image).then(bitmapData => ['road', bitmapData]),
        createImageBitmap(TextureLoader('rock').image).then(bitmapData => ['rock', bitmapData]),
    ]).then(result => {
        
        const patterns = result.map(res => {return {type: res[0], image: res[1]}});
        const transferables = result.map(res => res[1]);

        workerCanvasComposer.postMessage(
            {
                command: 'uploadTextures',
                patterns: patterns,
            },
            transferables
        );
        
    });

});

export function initMaterials() {
    
}

export function setDatas(landusesDatas, tile) {

    const keysFilter = [
        '4184_2986_13',
        '8368_5972_14',
    ];
    
    // this.isActive = this.tile.zoom == 13;
    // if (keysFilter.includes(tile.key) === false) {
    //     return;
    // }

    // console.log(landusesDatas);
    

    const tileBbox = tile.bbox;

    tilesWaitingWorker.set(tile.key, tile);
    workerCanvasComposer.postMessage({
        command: 'draw',
        tileKey: tile.key,
        landusesDatas: landusesDatas,
        tileBbox: tileBbox,
    });
}

export function tileRemoved(tileKey, tile) {
    tile.removeExtensionDiffuse('LANDUSE_MAP');
    tilesWaitingWorker.delete(tileKey);
}

export function tileShow(tile) {
    
}

export function tileHide(tile) {

}

export function setLod(tile, lod) {
    
}

function createLanduseMap(tile, textureMaps) {
    if (tile === undefined) {
        return;
    }
    
    if (tile.isReady === false) {
        return;
    }

    createImageBitmap(textureMaps.map, 0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE)
    .then(image => {
        tile.addExtensionDiffuse('LANDUSE_MAP', image);
    });
}
import {
    DataTexture,
    MeshPhysicalMaterial,
    Mesh,
    UVMapping,
    RepeatWrapping,
    LinearFilter,
    RGBAFormat,
    UnsignedByteType,
} from '../../vendor/three.module.js';
import {GLOBE} from '../../core/globe.js';
import {MAP_SIZE as TILE_MAP_SIZE} from '../../core/tile.js';
import Renderer from '../../core/renderer.js';

const meshesByTiles = new Map();
const textureSize = TILE_MAP_SIZE * 2;

const workerCanvasComposer = new SharedWorker('/app/utils/workerCanvasComposer.js', {type: 'module'});
const tilesWaitingWorker = new Map();

workerCanvasComposer.port.onmessage = (e) => {
    console.log('REPONSE');
    
    if (e.data.command !== 'draw') {
        return;
    }
    
    const tile = tilesWaitingWorker.get(e.data.tileKey);
    createLanduseMesh(tile, e.data.imagesDatas);
    tilesWaitingWorker.delete(e.data.tileKey);
};

function createLanduseMesh(tile, textureMaps) {
    /*
    const material = new MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.7,
        transparent: true,
    });

    const geometry = tile.meshe.geometry.clone();
    geometry.translate(0, 5, 0);
    const mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;
    GLOBE.addMeshe(mesh);
    meshesByTiles.set(tile, mesh);

    for (const mapType in textureMaps) {
        const dataTexture = new DataTexture(
            textureMaps[mapType],
            textureSize,
            textureSize,
            RGBAFormat,
            UnsignedByteType,
            UVMapping,
            RepeatWrapping,
            RepeatWrapping,
            LinearFilter,
            LinearFilter,
        );
        dataTexture.needsUpdate = true;
        material[mapType] = dataTexture;
    }

    material.needsUpdate = true;
    Renderer.MUST_RENDER = true;
    */

    createImageBitmap(textureMaps.map, 0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE)
    .then(image => {
        tile.drawOnDiffuseMap('landuse_' + tile.key, image);
    });

    createImageBitmap(textureMaps.normalMap, 0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE)
   .then(image => {
       tile.drawOnNormalMap('landuse_' + tile.key, image);
   });

    // for (const mapType in textureMaps) {
    //     createImageBitmap(textureMaps[mapType], 0, 0, TILE_MAP_SIZE, TILE_MAP_SIZE)
    //     .then(image => {
    //         tile.drawOnDiffuseMap('landuse_' + tile.key, image);
    //     });
    // }
}

export function setDatas(landusesDatas, tile) {
    const tilePolygon = [
        [tile.startCoord.x, tile.endCoord.y], 
        [tile.endCoord.x, tile.endCoord.y], 
        [tile.endCoord.x, tile.startCoord.y], 
        [tile.startCoord.x, tile.startCoord.y], 
    ];

    const tileBbox = tile.bbox;

    tilesWaitingWorker.set(tile.key, tile);
    workerCanvasComposer.port.postMessage({
        command: 'draw',
        tileKey: tile.key,
        landusesDatas: landusesDatas,
        tileBbox: tileBbox,
        tilePolygon: tilePolygon,
    });
}

export function tileRemoved(tileKey, tile) {
    
    tilesWaitingWorker.delete(tileKey);
    tile.clearDiffuseLayer('landuse_' + tileKey);
    tile.clearNormalLayer('landuse_' + tileKey);
    
    const tileMesh = meshesByTiles.get(tile);
    if (!tileMesh) {
        return;
    }

    GLOBE.removeMeshe(tileMesh);
    tileMesh.geometry.dispose();
    if (tileMesh.material.map) {
        tileMesh.material.map.dispose();
    }
    if (tileMesh.material.normalMap) {
        tileMesh.material.normalMap.dispose();
    }
    if (tileMesh.material.roughnessMap) {
        tileMesh.material.roughnessMap.dispose();
    }
    tileMesh.material.dispose();
    meshesByTiles.delete(tile);
}

export function setLod(tile, lod) {
    
}
import {
    CanvasTexture,
    DataTexture,
    DoubleSide,
    MeshPhysicalMaterial,
    Mesh,
    UVMapping,
    RepeatWrapping,
    LinearFilter,
    RGBAFormat,
    UnsignedByteType,
} from '../../vendor/three.module.js';
import GEO from '../../core/geo.js';
import GLOBE from '../../core/globe.js';
import * as TILE from '../../core/tile.js';
import Renderer from '../../core/renderer.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as NET_TEXTURES from '../../net/textures.js';

const rejectedIds = [];
const meshesByTiles = new Map();
const textureSize = TILE.mapSize * 2;
const canvas = createCanvas(textureSize);
const context = canvas.getContext('2d', {willReadFrequently: true});

export function setDatas(landusesDatas, tile) {
    meshesByTiles.set(tile, []);
    
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
    meshesByTiles.get(tile).push(mesh);

    const textureMaps = [
        'map',
        'normalMap',
        'roughnessMap',
    ];

    
    for (const mapType of textureMaps) {
        fillWithEmptyTexture(mapType, context);
        for (let i = 0; i < landusesDatas.length; i ++) {
            const textureImage = NET_TEXTURES.texture(`landuse_${mapType}_${landusesDatas[i].type}`).image;
            // console.log(landusesDatas[i].type);
            buildLanduse(landusesDatas[i], tile, material, context, textureImage);
        }
        material[mapType] = createRawTexture(context);
    }
    material.needsUpdate = true;
    
    Renderer.MUST_RENDER = true;
}

function fillWithEmptyTexture(mapType, context) {
    const map = NET_TEXTURES.texture(`landuse_${mapType}_empty`).image;
    const pattern = context.createPattern(map, 'repeat');
    context.fillStyle = pattern;
    context.beginPath();
    context.fillRect(0, 0, textureSize, textureSize);
    context.closePath();
}

function createRawTexture(context) {
    const imageData = context.getImageData(0, 0, textureSize, textureSize);
    context.clearRect(0, 0, textureSize, textureSize);
    const dataTexture = new DataTexture(
        imageData.data,
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
    return dataTexture;
}

export function tileRemoved(_tileKey, tile) {
    const instancedTile = meshesByTiles.get(tile);
    if (instancedTile) {
        for (const [key, mesh] of instancedTile.entries()) {
            GLOBE.removeMeshe(mesh);
            mesh.geometry.dispose();
            if (mesh.material.map) {
                mesh.material.map.dispose();
                mesh.material.normalMap.dispose();
                mesh.material.roughnessMap.dispose();
            }
            mesh.material.dispose();
            meshesByTiles.delete(tile);
        }
    }
}

export function setLod(tile, lod) {
    
}

function buildLanduse(landuse, tile, material, context, map) {
    if (rejectedIds.includes(landuse.id)) {
        return false;
    }
    
    const tilePolygon = [
        [tile.startCoord.x, tile.endCoord.y], 
        [tile.endCoord.x, tile.endCoord.y], 
        [tile.endCoord.x, tile.startCoord.y], 
        [tile.startCoord.x, tile.startCoord.y], 
    ];

    const polygon = [
        landuse.border,
        ...landuse.holes
    ];

    const multipolygons = PolygonClipping.intersection([tilePolygon], [polygon]);

    if (multipolygons.length === 0) {
        return false;
    }

    for (let i = 0; i < multipolygons.length; i ++) {
        const polygon = multipolygons[i];
        
        const border = polygon.shift().slice(1);
        const holes = polygon.map(hole => hole.slice(1));

        const canvasBorderPositions = convertCoordToCanvasPositions([border], tile.bbox);
        const canvasHolesPositions = convertCoordToCanvasPositions(holes, tile.bbox);

        drawCanvasShape(
            canvasBorderPositions[0],
            canvasHolesPositions,
            context,
            map,
        );
    }
    
    material.needsUpdate = true;

    return true;
}

function drawCanvasShape(coords, holesCoords, context, map) {
    // context.fillStyle = 'rgba(255, 0, 0, 0.5)';
    // const pattern = context.createPattern(NET_TEXTURES.texture('forest-top').image, 'repeat');
    const pattern = context.createPattern(map, 'repeat');
    context.fillStyle = pattern;
    context.beginPath();
    
    drawPolygon(coords, context);
    
    for (let h = 0; h < holesCoords.length; h ++) {
        drawPolygon(holesCoords[h], context);
    }
    
    context.closePath();
    context.fill('evenodd');
}

function drawPolygon(coords, context) {
    const start = coords[0];
    context.moveTo(start[0], start[1]);
    for (let i = 1; i < coords.length; i ++) {
        context.lineTo(coords[i][0], coords[i][1]);
    }
}

function convertCoordToCanvasPositions(coords, tileBox) {
    const res = [];

    for (let i = 0; i < coords.length; i ++) {
        const positions = GEO.coordToCanvas(tileBox, textureSize, coords[i]);
        res.push(positions);
    }

    return res;
}

function createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    // const context = canvas.getContext('2d');
    // context.fillStyle = 'rgba(255, 255, 255, 0)';
    // context.fillRect(0, 0, size, size);
    return canvas;
}
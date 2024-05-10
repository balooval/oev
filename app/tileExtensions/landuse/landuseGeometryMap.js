import {
    CanvasTexture,
    DoubleSide,
    MeshPhysicalMaterial,
    Mesh,
} from '../../vendor/three.module.js';
import GEO from '../../core/geo.js';
import * as LanduseGeometryBuilder from './landuseGeometryBuilder.js';
import GLOBE from '../../core/globe.js';
import * as TILE from '../../core/tile.js';
import * as Poly2Tri from '../../vendor/poly2tri.module.js';
import ElevationStore from '../elevation/elevationStore.js';
import Renderer from '../../core/renderer.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import MATH from '../../core/math.js';

const rejectedIds = [];

const meshesByTiles = new Map();
const canvasByTiles = new Map();

const material = new MeshPhysicalMaterial({
    color: 0xff0000,
    side: DoubleSide,
    vertexColors: false,
});

export function setDatas(landusesDatas, tile) {
    const keysFilter = [
        // '4189_2985_13', // Sommieres
        // '4190_2985_13', // Nages
        // '4191_2985_13', // Nages
        // '4192_2985_13', // Nages
        '4192_2986_13', // Nages
    ];

    if (keysFilter.includes(tile.key) === false) {
        // return;
    }
    
    meshesByTiles.set(tile, []);
    
    const canvas = createCanvas(TILE.mapSize);
    const canvasTexture = new CanvasTexture(canvas);
    const material = new MeshPhysicalMaterial({
        color: 0xffffff,
        map: canvasTexture,
        transparent: true,
    });

    const geometry = tile.meshe.geometry.clone();
    geometry.translate(0, -1, 0);
    const mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;
    GLOBE.addMeshe(mesh);
    meshesByTiles.get(tile).push(mesh);

    for (let i = 0; i < landusesDatas.length; i ++) {
        buildLanduse(landusesDatas[i], tile, material, canvas);
    }
    
    Renderer.MUST_RENDER = true;
}

export function tileRemoved(_tileKey, tile) {
    const instancedTile = meshesByTiles.get(tile);
    if (instancedTile) {
        for (const [key, mesh] of instancedTile.entries()) {
            GLOBE.removeMeshe(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            meshesByTiles.delete(tile);
        }
    }
}

export function setLod(tile, lod) {
    
}

function buildLanduse(landuse, tile, material, canvas) {
    if (rejectedIds.includes(landuse.id)) {
        return false;
    }
    
    if (landuse.id !== 11770235) {
        // return;
    }
    // console.log('OK', landuse.type);

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

    const context = canvas.getContext('2d');

    for (let i = 0; i < multipolygons.length; i ++) {
        const polygon = multipolygons[i];
        
        const border = polygon.shift().slice(1);
        const holes = polygon.map(hole => hole.slice(1));

        const canvasBorderPositions = convertCoordToCanvasPositions([border], tile.bbox);
        const canvasHolesPositions = convertCoordToCanvasPositions(holes, tile.bbox);

        drawCanvasShape(canvasBorderPositions[0], canvasHolesPositions, context);
        material.needsUpdate = true;
    }

    return true;
}

function drawCanvasShape(coords, holesCoords, context) {
    context.fillStyle = 'rgba(255, 0, 0, 0.5)';
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
        const positions = GEO.coordToCanvas(tileBox, TILE.mapSize, coords[i]);
        res.push(positions);
    }

    return res;
}

function createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(255, 255, 255, 0)';
    context.fillRect(0, 0, size, size);
    return canvas;
}
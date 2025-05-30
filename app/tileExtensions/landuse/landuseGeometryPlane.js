import {
    DoubleSide,
    MeshPhysicalMaterial,
    Mesh,
} from 'three';
import * as BufferGeometryUtils from '../../vendor/BufferGeometryUtils.js';
import * as LanduseGeometryBuilder from './landuseGeometryBuilder.js';
import { GLOBE } from '../../core/globe.js';
import { TILES_DEFINITION } from '../../core/tile.js';
import * as Poly2Tri from '../../vendor/poly2tri.module.js';
import { texture as TextureLoader } from '../../net/textures.js';
import * as ElevationStore from '../elevation/elevationStore.js';
import Renderer from '../../core/renderer.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as MATH from '../../core/math.js';

const rejectedIds = [];

const meshesByTiles = new Map();

const material = new MeshPhysicalMaterial({
    // color: 0x7b993d,
    color: 0xffffff,
    side: DoubleSide,
    vertexColors: false,
});



export function initMaterials() {
    material.map = TextureLoader('blender-forest-0');
    material.normalMap = TextureLoader('blender-forest-normal');
}

export function setLod(tile, lod) {

}

export function setDatas(landusesDatas, tile) {
    const keysFilter = [
        '4189_2985_13', // Sommieres
        // '4190_2985_13', // Nages
        // '4191_2985_13', // Nages
        // '4192_2985_13', // Nages
        // '4192_2986_13', // Nages
    ];

    if (keysFilter.includes(tile.key) === false) {
        // return;
    }
    
    meshesByTiles.set(tile, []);

    // const testId = 2;
    // console.log('landusesDatas', landusesDatas[testId].border, landusesDatas[testId].fillPoints);
    // buildLanduse(landusesDatas[testId], tile);


    for (let i = 0; i < landusesDatas.length; i ++) {
        buildLanduse(landusesDatas[i], tile);
        Renderer.MUST_RENDER = true;
    }
}

export function tileShow(tile) {
    const tileMeshes = meshesByTiles.get(tile);

    if (tileMeshes === undefined) {
        return;
    }

    for (const mesh of tileMeshes.values()) {
        GLOBE.addMeshe(mesh);
    }
}

export function tileHide(tile) {
    const tileMeshes = meshesByTiles.get(tile);

    if (tileMeshes === undefined) {
        return;
    }

    

    for (const mesh of tileMeshes.values()) {
        GLOBE.removeMeshe(mesh);
    }
}

export function tileRemoved(_tileKey, tile) {
    const tileMeshes = meshesByTiles.get(tile);
    if (tileMeshes) {
        for (const mesh of tileMeshes.values()) {
            GLOBE.removeMeshe(mesh);
            mesh.geometry.dispose();
            meshesByTiles.delete(tile);
        }
    }
}

function buildLanduse(landuse, tile) {
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

    if (landuse.id === 7318583) {
        // return false;
    }

    const geometries = [];

    for (let i = 0; i < multipolygons.length; i ++) {
        const polygon = multipolygons[i];

        const clippedLanduse = {
            id: landuse.id,
            type: landuse.type,
            tags: landuse.tags,
            fillPoints: landuse.fillPoints, // TODO: virer un des deux
            fillPoints: [],
        };

        clippedLanduse.border = polygon.pop().slice(1);
        clippedLanduse.holes = polygon.map(hole => hole.slice(1));
        const bbox = calcBbox(clippedLanduse.border);
        const grid = coordGrid(tile, bbox, clippedLanduse.border);
        clippedLanduse.fillPoints = grid;

        const trianglesResult = triangulate(clippedLanduse);

        if (trianglesResult === null) {
            return false;
        }

        const elevationsDatas = getElevationsDatas(clippedLanduse);
        const geometry = LanduseGeometryBuilder.buildLanduseGeometry(clippedLanduse, trianglesResult, elevationsDatas, tile);
        geometries.push(geometry);
    }
    
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    const mesh = new Mesh(mergedGeometry, material);
    meshesByTiles.get(tile).push(mesh);
    mesh.receiveShadow = true;
    GLOBE.addMeshe(mesh);

    return true;
}

function triangulate(landuse) {
    let nbPoints = 0;
    const border = new Array(landuse.border.length);
    for (let i = 0; i < landuse.border.length; i ++) {
        border[i] = new Poly2Tri.Point(landuse.border[i][0], landuse.border[i][1], i + nbPoints);
    }
    try {
        const swctx = new Poly2Tri.SweepContext(border);
        nbPoints += landuse.border.length;

        for (let h = 0; h < landuse.holes.length; h ++) {
            const swcHole = landuse.holes[h].map((p, i) => new Poly2Tri.Point(p[0], p[1], i + nbPoints));
            swctx.addHole(swcHole);
            nbPoints += landuse.holes[h].length;
        }

        for (let i = 0; i < landuse.fillPoints.length; i ++) {
            const point = landuse.fillPoints[i];
            swctx.addPoint(new Poly2Tri.Point(point[0], point[1], i + nbPoints));
        }

        nbPoints += landuse.fillPoints.length;
        swctx.triangulate();
        return swctx.getTriangles();
    } catch (error) {
        console.log('Error on landuse', landuse.id, error);
        console.log('_landuse', landuse);
        rejectedIds.push(landuse.id);
        return null;
    }
}

function calcBbox(_border) {
    const lon = _border.map(point => point[0]);
    const lat = _border.map(point => point[1]);
    return {
        minLon : Math.min(...lon), 
        maxLon : Math.max(...lon), 
        minLat : Math.min(...lat), 
        maxLat : Math.max(...lat), 
    }
}

function coordGrid(tile, _bbox, _border) {
    const grid = [];
    const def = TILES_DEFINITION * 1;

    const startCoord = tile.startCoord;
    const endCoord = tile.endCoord;

    const stepCoordX = (endCoord.x - startCoord.x) / def;
    const stepCoordY = (endCoord.y - startCoord.y) / def;

    const minX = Math.max(startCoord.x, _bbox.minLon);
    const maxX = Math.min(endCoord.x, _bbox.maxLon);
    const minY = Math.min(endCoord.y, _bbox.maxLat);
    const maxY = Math.max(startCoord.y, _bbox.minLat);

    const addedCoords = [];

    for (let posX = minX + stepCoordX; posX < maxX; posX += stepCoordX) {
        for (let posY = maxY + stepCoordY; posY > minY; posY += stepCoordY) {
            const coord = [posX, posY];
            const coordKey = posX + '_' + posY;
            if (addedCoords.includes(coordKey)) {
                continue;
            }
            addedCoords.push(coordKey);
            if (MATH.pointIntoPolygon(coord, _border) === false) {
                continue;
            }
            grid.push(coord);
        }
    }

    return grid;
}

function getElevationsDatas(landuse) {
    const elevationsBorder = new Array(landuse.border.length);
    for (let i = 0; i < landuse.border.length; i ++) {
        const point = landuse.border[i];
        elevationsBorder[i] = ElevationStore.get(point[0], point[1]);
    }
    const elevationsHoles = [];
    for (let i = 0; i < landuse.holes.length; i ++) {
        const hole = landuse.holes[i];
        const holeElevations = new Array(hole.length);
        for (let h = 0; h < hole.length; h ++) {
            const point = hole[h];
            holeElevations[h] = ElevationStore.get(point[0], point[1]);
        }
        elevationsHoles.push(holeElevations);
    }
    const elevationsFill = new Array(landuse.fillPoints.length);
    for (let i = 0; i < landuse.fillPoints.length; i ++) {
        const point = landuse.fillPoints[i];
        elevationsFill[i] = ElevationStore.get(point[0], point[1]);
    }
    return {
        border : elevationsBorder, 
        holes : elevationsHoles, 
        fill : elevationsFill, 
    }
}
import {
    DoubleSide,
    MeshPhysicalMaterial,
    Mesh,
} from '../../vendor/three.module.js';
import * as LanduseGeometryBuilder from './landuseGeometryBuilder.js';
import {GLOBE} from '../../core/globe.js';
import * as Poly2Tri from '../../vendor/poly2tri.module.js';
import * as ElevationStore from '../elevation/elevationStore.js';
import Renderer from '../../core/renderer.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as MATH from '../../core/math.js';

const rejectedIds = [];

const meshesByTiles = new Map();

const material = new MeshPhysicalMaterial({
    color: 0xff0000,
    side: DoubleSide,
    vertexColors: false,
});

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

export function tileRemoved(_tileKey, tile) {
    const instancedTile = meshesByTiles.get(tile);
    if (instancedTile) {
        for (const [key, mesh] of instancedTile.entries()) {
            GLOBE.removeMeshe(mesh);
            mesh.geometry.dispose();
            meshesByTiles.delete(tile);
        }
    }
}

export function setLod(tile, lod) {
    
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

    // console.log('tilePolygon', tilePolygon);

    const polygon = [
        landuse.border,
        ...landuse.holes
    ];

    const multipolygons = PolygonClipping.intersection([tilePolygon], [polygon]);
    // console.log('results', results);

    if (multipolygons.length === 0) {
        return false;
    }

    if (landuse.id === 7318583) {
        // console.log(landuse);
        // console.log(multipolygons);
        // return false;
    }

    // console.log('landuse', landuse);

    for (let i = 0; i < multipolygons.length; i ++) {
        const polygon = multipolygons[i];

        const clippedLanduse = {
            id: landuse.id,
            type: landuse.type,
            tags: landuse.tags,
            fillPoints: landuse.fillPoints,
            fillPoints: [],
        };

        clippedLanduse.border = polygon.pop().slice(1);
        clippedLanduse.holes = polygon.map(hole => hole.slice(1));
        // TODO: à remettre
        // const bbox = calcBbox(clippedLanduse.border);
        // const grid = coordGrid(tile, bbox, clippedLanduse.border);
        // clippedLanduse.fillPoints = grid;


        const trianglesResult = triangulate(clippedLanduse);

        if (trianglesResult === null) {
            return false;
        }

        const elevationsDatas = getElevationsDatas(clippedLanduse);
        const geometry = LanduseGeometryBuilder.buildLanduseGeometry(clippedLanduse, trianglesResult, elevationsDatas, tile)
        const mesh = new Mesh(geometry, material);
        mesh.receiveShadow = true;
        GLOBE.addMeshe(mesh);

        meshesByTiles.get(tile).push(mesh);
    }

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
        landuse.holes.forEach(hole => {
            const swcHole = hole.map((p, i) => new Poly2Tri.Point(p[0], p[1], i + nbPoints));
            swctx.addHole(swcHole);
            nbPoints += hole.length;
        });
        // TODO: à remettre
        // for (let i = 0; i < landuse.fillPoints.length; i ++) {
        //     const point = landuse.fillPoints[i];
        //     swctx.addPoint(new Poly2Tri.Point(point[0], point[1], i + nbPoints));
        // }

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
    const def = GLOBE.tilesDefinition * 4;

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
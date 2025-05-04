import {
    BufferAttribute,
    BufferGeometry,
    DoubleSide,
    MeshPhysicalMaterial,
    Mesh,
    CanvasTexture,
} from '../../vendor/three.module.js';
import * as LanduseGeometryBuilder from './landuseGeometryBuilder.js';
import {GLOBE} from '../../core/globe.js';
import * as Poly2Tri from '../../vendor/poly2tri.module.js';
import * as ElevationStore from '../elevation/elevationStore.js';
import Renderer from '../../core/renderer.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as MATH from '../../core/math.js';
import { texture as TextureLoader } from '../../net/textures.js';
import * as GEO from '../../core/geo.js';

const rejectedIds = [];

const meshesByTiles = new Map();

const textureSize = 512;

const material = new MeshPhysicalMaterial({
    color: 0x00FF00,
    side: DoubleSide,
    vertexColors: false,
});

const canvasTextureShell = new OffscreenCanvas(textureSize, textureSize);
const contextTextureShell = canvasTextureShell.getContext('2d', {willReadFrequently: true});

const commonMaterialProps = {color: 0xffffff, side: DoubleSide, roughness: 1, metalness: 0, transparent: true, alphaTest: 0.1};
const layersMaterials = [
    new MeshPhysicalMaterial(commonMaterialProps),
    new MeshPhysicalMaterial(commonMaterialProps),
    new MeshPhysicalMaterial(commonMaterialProps),
    new MeshPhysicalMaterial(commonMaterialProps),
];

export function initMaterials() {
    layersMaterials[0].map = TextureLoader('voronoi-0');
    layersMaterials[1].map = TextureLoader('voronoi-1');
    layersMaterials[2].map = TextureLoader('voronoi-2');
    layersMaterials[3].map = TextureLoader('voronoi-3');
    
    // layersMaterials[0].map = TextureLoader('shell_tree_1');
    // layersMaterials[1].map = TextureLoader('shell_tree_2');
    // layersMaterials[2].map = TextureLoader('shell_tree_3');
    // layersMaterials[3].map = TextureLoader('shell_tree_4');
    
    // layersMaterials[0].normalMap = TextureLoader('shell_tree_normal');
    // layersMaterials[1].normalMap = TextureLoader('shell_tree_normal');
    // layersMaterials[2].normalMap = TextureLoader('shell_tree_normal');
    // layersMaterials[3].normalMap = TextureLoader('shell_tree_normal');
    
}

export function setDatas(landusesDatas, tile) {
    const keysFilter = [
        // '4189_2985_13', // Sommieres
        // '4190_2985_13', // Nages
        // '4191_2985_13', // Nages
        '4192_2985_13', // Nages
        // '4182_2985_13', // Pic saint loup
        // '4192_2986_13', // Nages
    ];

    if (keysFilter.includes(tile.key) === false) {
        // return;
    }

    
    meshesByTiles.set(tile, []);

    buildShell(landusesDatas, tile);
    Renderer.MUST_RENDER = true;


    // for (let i = 0; i < landusesDatas.length; i ++) {
    //     buildLanduse(landusesDatas[i], tile);
    //     Renderer.MUST_RENDER = true;
    // }
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

function buildShell(landusesDatas, tile) {
    const layerCount = 4;

    for (let i = 0; i < layerCount; i ++) {
        const mesh = buildShellLayer(landusesDatas, tile, i);
        meshesByTiles.get(tile).push(mesh);
        GLOBE.addMeshe(mesh);
    }
}

function buildShellLayer(landusesDatas, tile, layer) {
    
    const handledTypes = [
        'forest',
        'scrub',
    ]
    const filteredLandusesDatas = landusesDatas.filter(landuse => handledTypes.includes(landuse.type));

    const canvas = new OffscreenCanvas(textureSize, textureSize);
    const context = canvas.getContext('2d', {willReadFrequently: true});
    const canvasNormal = new OffscreenCanvas(textureSize, textureSize);
    const contextNormal = canvasNormal.getContext('2d', {willReadFrequently: true});
    

    for (let i = 0; i < filteredLandusesDatas.length; i ++) {
        const canvasBorderPositions = GEO.coordToCanvas(tile.bbox, textureSize, filteredLandusesDatas[i].border);
        drawShape(filteredLandusesDatas[i].type, context, contextNormal, canvasBorderPositions, [], layer);
    }

    const material = new MeshPhysicalMaterial({color: 0xffffff, roughness: 1, metalness: 0, transparent: true, alphaTest: 0.1});
    material.map = new CanvasTexture(canvas);
    material.normalMap = new CanvasTexture(canvasNormal);
    
    let curVertId = 0;
    const bufferVertices = new Float32Array(tile.verticesNb * 3);
    const bufferNormals = new Float32Array(tile.verticesNb * 3);
    const vertCoords = tile.getVerticesPlaneCoords();

    const layerSpace = 10 - (tile.zoom - 13) * 3;
    
    for (let i = 0; i < vertCoords.length / 2; i ++) {
        const coordA = vertCoords[i * 2];
        const coordB = vertCoords[i * 2 + 1];
        const alt = ElevationStore.get(coordA, coordB);
        const vertPos = GLOBE.coordToXYZ(
            coordA, 
            coordB, 
            // alt + 50
            alt + 2 + layer * layerSpace
        );
        bufferVertices[curVertId + 0] = vertPos[0];
        bufferVertices[curVertId + 1] = vertPos[1];
        bufferVertices[curVertId + 2] = vertPos[2];
        
        bufferNormals[curVertId + 0] = 0;
        bufferNormals[curVertId + 1] = 1;
        bufferNormals[curVertId + 2] = 0;

        curVertId += 3;
    }

    const def = GLOBE.tilesDefinition;
    const vertBySide = def + 1;
    let faceId = 0;
    const nbFaces = (def * def) * 2;
    const bufferFaces = new Uint32Array(nbFaces * 3);

    for (let x = 0; x < def; x ++) {
        for (let y = 0; y < def; y ++) {
            bufferFaces[faceId + 0] = (x * vertBySide) + y;
            bufferFaces[faceId + 2] = (x * vertBySide) + y + 1;
            bufferFaces[faceId + 1] = ((x + 1) * vertBySide) + y + 1;
            
            bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1;
            bufferFaces[faceId + 5] = ((x + 1) * vertBySide) + y;
            bufferFaces[faceId + 4] = (x * vertBySide) + y;
            faceId += 6;
        }
    }

    const bufferUvs = new Float32Array(tile.verticesNb * 2);
    const uvRepeat = 1;
    let stepUV = uvRepeat / def;
    let uvIndex = 0;

    for (let x = 0; x < vertBySide; x ++) {
        for (let y = 0; y < vertBySide; y ++) {
            uvIndex = (x * vertBySide) + y;
            bufferUvs[uvIndex * 2] = stepUV * x;
            bufferUvs[uvIndex * 2 + 1] = stepUV * y;
        }
    }

    const geoBuffer = new BufferGeometry();
    geoBuffer.setAttribute('position', new BufferAttribute(bufferVertices, 3));
    geoBuffer.setAttribute('normal', new BufferAttribute(bufferNormals, 3));
    geoBuffer.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
    geoBuffer.setIndex(new BufferAttribute(bufferFaces, 1));
    geoBuffer.computeVertexNormals();


    // const mesh = new Mesh(geoBuffer, layersMaterials[layer]);
    const mesh = new Mesh(geoBuffer, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function drawShape(landuseType, context, contextNormal, border, holesCoords, layer) {
    const scale = 0.5;
    contextTextureShell.clearRect(0, 0, textureSize, textureSize);
    
    const textureByType = {
        forest: `voronoi-${layer}`,
        scrub: `blender-scrub-${layer}`,
    }
    
    const textureId = textureByType[landuseType];

    contextTextureShell.drawImage(TextureLoader(textureId).image, 0, 0, 1024, 1024, 0, 0, textureSize * scale, textureSize * scale);
    contextTextureShell.drawImage(TextureLoader(textureId).image, 0, 0, 1024, 1024, 256, 0, textureSize * scale, textureSize * scale);
    contextTextureShell.drawImage(TextureLoader(textureId).image, 0, 0, 1024, 1024, 256, 256, textureSize * scale, textureSize * scale);
    contextTextureShell.drawImage(TextureLoader(textureId).image, 0, 0, 1024, 1024, 0, 256, textureSize * scale, textureSize * scale);
    // contextTextureShell.drawImage(TextureLoader(`shell_tree_${layer + 1}`).image, 0, 0, 1024, 1024, 0, 0, textureSize, textureSize);
    const pattern = context.createPattern(canvasTextureShell, 'repeat');
    context.fillStyle = pattern;

    // const textureNormalId = `voronoi-normal`;
    const textureNormalId = `blender-scrub-normal`;
    contextTextureShell.clearRect(0, 0, textureSize, textureSize);
    contextTextureShell.drawImage(TextureLoader(textureNormalId).image, 0, 0, 1024, 1024, 0, 0, textureSize * scale, textureSize * scale);
    contextTextureShell.drawImage(TextureLoader(textureNormalId).image, 0, 0, 1024, 1024, 256, 0, textureSize * scale, textureSize * scale);
    contextTextureShell.drawImage(TextureLoader(textureNormalId).image, 0, 0, 1024, 1024, 256, 256, textureSize * scale, textureSize * scale);
    contextTextureShell.drawImage(TextureLoader(textureNormalId).image, 0, 0, 1024, 1024, 0, 256, textureSize * scale, textureSize * scale);
    const patternNormal = context.createPattern(canvasTextureShell, 'repeat');
    contextNormal.fillStyle = patternNormal;

    contextNormal.beginPath();
    drawPolygon(contextNormal, border);
    contextNormal.closePath();
    contextNormal.fill();

    context.beginPath();

    drawPolygon(context, border);
    
    // for (let h = 0; h < holesCoords.length; h ++) {
    //     drawPolygon(holesCoords[h]);
    // }
    
    context.closePath();
    context.fill();
}

function drawPolygon(context, coords) {
    const start = coords[0];
    context.moveTo(start[0], start[1]);
    for (let i = 1; i < coords.length; i ++) {
        context.lineTo(coords[i][0], coords[i][1]);
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
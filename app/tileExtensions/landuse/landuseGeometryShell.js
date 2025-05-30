import {
    BufferAttribute,
    BufferGeometry,
    DoubleSide,
    MeshPhysicalMaterial,
    Mesh,
    CanvasTexture,
} from 'three';
import * as LanduseGeometryBuilder from './landuseGeometryBuilder.js';
import {GLOBE} from '../../core/globe.js';
import * as Poly2Tri from '../../vendor/poly2tri.module.js';
import * as ElevationStore from '../elevation/elevationStore.js';
import Renderer from '../../core/renderer.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';
import * as MATH from '../../core/math.js';
import { texture as TextureLoader } from '../../net/textures.js';
import { TILES_DEFINITION, TILES_VERTICES_COUNT } from '../../core/tile.js';
import * as GEO from '../../core/geo.js';

const rejectedIds = [];

const meshesByTiles = new Map();

const textureSize = 512;
const layersCount = 4;

const material = new MeshPhysicalMaterial({
    color: 0x00FF00,
    side: DoubleSide,
    vertexColors: false,
});

const shellBaseGeometry = buildShellBaseGeometry(layersCount);

// const canvasTextureShell = new OffscreenCanvas(textureSize, textureSize);
// const contextTextureShell = canvasTextureShell.getContext('2d', {willReadFrequently: true});


const commonMaterialProps = {color: 0xffffff, side: DoubleSide, roughness: 1, metalness: 0, transparent: true, alphaTest: 0.1};
// const layersMaterials = [
//     new MeshPhysicalMaterial(commonMaterialProps),
//     new MeshPhysicalMaterial(commonMaterialProps),
//     new MeshPhysicalMaterial(commonMaterialProps),
//     new MeshPhysicalMaterial(commonMaterialProps),
// ];

export function initMaterials() {
    
}

export function setLod(tile, lod) {

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
    if (tileMeshes === undefined) {
        return;
    }
    
    for (const mesh of tileMeshes.values()) {
        GLOBE.removeMeshe(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        meshesByTiles.delete(tile);
    }
}

function buildShell(landusesDatas, tile) {

    // for (let i = 0; i < layerCount; i ++) {
        const mesh = buildShellLayer(landusesDatas, tile);
        meshesByTiles.get(tile).push(mesh);
        GLOBE.addMeshe(mesh);
    // }
}

function buildShellLayer(landusesDatas, tile) {
    
    const handledTypes = [
        'forest',
        // 'scrub',
    ]
    const filteredLandusesDatas = landusesDatas.filter(landuse => handledTypes.includes(landuse.type));

    const canvasAlpha = new OffscreenCanvas(textureSize, textureSize);
    const contextAlpha = canvasAlpha.getContext('2d', {willReadFrequently: true});
    const canvasDiffuse = new OffscreenCanvas(2048, 512);
    const contextDiffuse = canvasDiffuse.getContext('2d', {willReadFrequently: true});
    // const canvasNormal = new OffscreenCanvas(textureSize, textureSize);
    // const contextNormal = canvasNormal.getContext('2d', {willReadFrequently: true});

    for (let i = 0; i < filteredLandusesDatas.length; i ++) {
        const canvasBorderPositions = GEO.coordToCanvas(tile.bbox, textureSize, filteredLandusesDatas[i].border);
        drawShape(filteredLandusesDatas[i].type, contextAlpha, canvasBorderPositions, [], 0);
    }

    contextDiffuse.drawImage(canvasAlpha, 0, 0, textureSize, textureSize, 0, 0, textureSize, textureSize);
    contextDiffuse.drawImage(canvasAlpha, 0, 0, textureSize, textureSize, 512, 0, textureSize, textureSize);
    contextDiffuse.drawImage(canvasAlpha, 0, 0, textureSize, textureSize, 1024, 0, textureSize, textureSize);
    contextDiffuse.drawImage(canvasAlpha, 0, 0, textureSize, textureSize, 1536, 0, textureSize, textureSize);

    contextDiffuse.globalCompositeOperation = 'source-in';
    contextDiffuse.drawImage(TextureLoader('blender-forest-shell-full').image, 0, 0);
    
    const material = new MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        map: new CanvasTexture(canvasDiffuse),
        transparent: true,
        alphaTest: 0.1
    });

    material.normalMap = TextureLoader('blender-forest-shell-full-normal');

    const vertCoords = tile.bufferVerticesPlaneCoords;
    const layerSpace = 10 - (tile.zoom - 13) * 3;
    
    const geoBuffer = shellBaseGeometry.clone();
    const verticePositions = geoBuffer.getAttribute('position');
    let curVertId = 0;

    for (let layer = 0; layer < layersCount; layer ++) {
    
        for (let i = 0; i < vertCoords.length / 2; i ++) {
            const coordLon = vertCoords[i * 2];
            const coordBLat = vertCoords[i * 2 + 1];
            const alt = ElevationStore.get(coordLon, coordBLat);
            const vertPos = GLOBE.coordToXYZ(
                coordLon, 
                coordBLat, 
                alt + 2 + layer * layerSpace * 1
            );
            verticePositions.array[curVertId + 0] = vertPos[0];
            verticePositions.array[curVertId + 1] = vertPos[1];
            verticePositions.array[curVertId + 2] = vertPos[2];
            
            curVertId += 3;
        }
    }

    verticePositions.needsUpdate = true;
    geoBuffer.computeVertexNormals();

    const mesh = new Mesh(geoBuffer, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}


function buildShellBaseGeometry(layerCount) {
    let curVertId = 0;
    let faceId = 0;

    const bufferVertices = new Float32Array(TILES_VERTICES_COUNT * 3 * layerCount);
    const bufferNormals = new Float32Array(TILES_VERTICES_COUNT * 3 * layerCount);
    const nbFacesPerLayer = (TILES_DEFINITION * TILES_DEFINITION) * 2;
    const bufferFaces = new Uint32Array(nbFacesPerLayer * 3 * layerCount);
    const bufferUvs = new Float32Array(TILES_VERTICES_COUNT * 2 * layerCount);

    const uvXByLayer = 1 / layerCount;
    const stepUVX = uvXByLayer / TILES_DEFINITION;
    const stepUVY = 1 / TILES_DEFINITION;

    const vertBySide = TILES_DEFINITION + 1;
    const verticesCount = vertBySide * vertBySide;

    for (let layer = 0; layer < layerCount; layer ++) {
    
        for (let i = 0; i < verticesCount / 2; i ++) {
            bufferVertices[curVertId + 0] = 0;
            bufferVertices[curVertId + 1] = 0;
            bufferVertices[curVertId + 2] = 0;
            
            bufferNormals[curVertId + 0] = 0;
            bufferNormals[curVertId + 1] = 1;
            bufferNormals[curVertId + 2] = 0;

            curVertId += 3;
        }

        for (let x = 0; x < TILES_DEFINITION; x ++) {
            for (let y = 0; y < TILES_DEFINITION; y ++) {
                const vertexOffset = (vertBySide * vertBySide) * layer;
                bufferFaces[faceId + 0] = vertexOffset + (x * vertBySide) + y;
                bufferFaces[faceId + 2] = vertexOffset + (x * vertBySide) + y + 1;
                bufferFaces[faceId + 1] = vertexOffset + ((x + 1) * vertBySide) + y + 1;
                
                bufferFaces[faceId + 3] = vertexOffset + ((x + 1) * vertBySide) + y + 1;
                bufferFaces[faceId + 5] = vertexOffset + ((x + 1) * vertBySide) + y;
                bufferFaces[faceId + 4] = vertexOffset + (x * vertBySide) + y;
                faceId += 6;
            }
        }

        const uvMinX = uvXByLayer * layer;
        let uvIndex = 0;

        for (let x = 0; x < vertBySide; x ++) {
            for (let y = 0; y < vertBySide; y ++) {
                const vertexOffset = (vertBySide * vertBySide) * layer;
                uvIndex = vertexOffset + (x * vertBySide) + y;
                bufferUvs[uvIndex * 2] = uvMinX + (stepUVX * x);
                bufferUvs[uvIndex * 2 + 1] = stepUVY * y;
            }
        }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
    geometry.setAttribute('normal', new BufferAttribute(bufferNormals, 3));
    geometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
    geometry.setIndex(new BufferAttribute(bufferFaces, 1));
    geometry.computeVertexNormals();

    return geometry;
}

function drawShape(landuseType, contextAlpha, border, holesCoords, layer) {
    // const textureByType = {
    //     forest: `blender-forest-${layer}`,
    //     scrub: `blender-scrub-${layer}`,
    // }

    // const normalByType = {
    //     forest: `blender-forest-normal`,
    //     scrub: `blender-scrub-normal`,
    // }
    
    // const textureId = textureByType[landuseType];

    // const pattern = context.createPattern(TextureLoader(textureId).image, 'repeat');
    // context.fillStyle = pattern;

    contextAlpha.fillStyle = '0xff0000';

    // const textureNormalId = normalByType[landuseType];
    // const patternNormal = context.createPattern(TextureLoader(textureNormalId).image, 'repeat');
    // contextNormal.fillStyle = patternNormal;

    // contextNormal.beginPath();
    // drawPolygon(contextNormal, border);
    // contextNormal.closePath();
    // contextNormal.fill();

    contextAlpha.beginPath();

    drawPolygon(contextAlpha, border);
    
    // for (let h = 0; h < holesCoords.length; h ++) {
    //     drawPolygon(holesCoords[h]);
    // }
    
    contextAlpha.closePath();
    contextAlpha.fill();
}

function drawPolygon(context, coords) {
    const start = coords[0];
    context.moveTo(start[0], start[1]);
    for (let i = 1; i < coords.length; i ++) {
        context.lineTo(coords[i][0], coords[i][1]);
    }
}
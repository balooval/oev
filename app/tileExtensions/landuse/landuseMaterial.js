import {
    BufferAttribute,
    BufferGeometry,
    Color,
    DoubleSide,
    MeshPhysicalMaterial,
} from '../../vendor/three.module.js';
import Evt from '../../core/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/models.js';
import * as NET_TEXTURES from '../../net/textures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension);

export const evt = new Evt();
export let isReady = false;

export function material(_type) {
    return materials[_type];
}

export function getMaterialForType(type) {
    return instanceMaterial.get(type);
}

export function getGeometryForType(type) {
    return instanceGeometries.get(type);
}


const instanceGeometries = new Map();
const instanceMaterial = new Map();

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension);

    createMaterials()
    .then(() => {
        return loadTextures();
    })
    .then(() => {
        return setMapToMaterials();
    })
    .then(() => {
        return loadModels();
    })
    .then(() => {
        return setModelsToGeometries();
    })
    .then(() => {
        isReady = true;
        evt.fireEvent('READY')
    });
}

function createMaterials() {
    const materialGeneric = new MeshPhysicalMaterial({
        color: 0xffffff,
        side: DoubleSide,
        vertexColors: true,
    });
    
    const materialVigne = new MeshPhysicalMaterial({
        color: 0xffffff,
        side: DoubleSide,
        vertexColors: false,
    });
    
    const materialForest = new MeshPhysicalMaterial({
        color: 0xffffff,
        side: DoubleSide,
        vertexColors: false,
        roughness: 0.5,
    });
    const materialSapin = new MeshPhysicalMaterial({
        color: 0xffffff,
        side: DoubleSide,
        vertexColors: false,
        roughness: 0.6,
    });

    
    instanceMaterial.set('forest', materialForest);
    instanceMaterial.set('sapin', materialSapin);
    instanceMaterial.set('scrub', materialGeneric);
    instanceMaterial.set('vineyard', materialVigne);

    return new Promise((resolve) => {
        resolve();
    });
}

function loadTextures() {
    const texturesList = [
        {
            id: 'tree-forest',
            url: 'tree-forest-flip.png',
        },
        {
            id: 'tree-forest-sapin',
            url: 'tree-forest-sapin.png',
        },
        {
            id: 'vigne',
            url: 'vigne.png',
        },
    ];
    
    return new Promise((resolve) => {
        NET_TEXTURES.loadBatch(texturesList, resolve);
    });
}

function setMapToMaterials() {
    instanceMaterial.get('forest').map = NET_TEXTURES.texture('tree-forest');
    instanceMaterial.get('sapin').map = NET_TEXTURES.texture('tree-forest-sapin');
    instanceMaterial.get('vineyard').map = NET_TEXTURES.texture('vigne');

    return new Promise((resolve) => {
        resolve();
    });
}

function loadModels() {
    const modelsList = [
        {
            id: 'vigne',
            url: 'vigne.glb',
        },
        {
            id: 'tree-forest',
            url: 'tree-forest-color.glb',
        },
        {
            id: 'tree-forest-sapin',
            url: 'tree-forest-sapin.glb',
        },
    ];

    return new Promise((resolve) => {
        NET_MODELS.loadBatch(modelsList, resolve);
    });
}

function setModelsToGeometries() {
    instanceGeometries.set('forest', createInstanceGeometryForest());
    instanceGeometries.set('sapin', createInstanceGeometryForestSapin());
    instanceGeometries.set('scrub', createInstanceGeometryScrub());
    instanceGeometries.set('vineyard', createInstanceGeometryVineyard());

    return new Promise((resolve) => {
        resolve();
    });
}

function createInstanceGeometryForestSapin() {
    const geometry = NET_MODELS.get('tree-forest-sapin').clone();
    const scale = 0.05;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryForest() {
    const geometry = NET_MODELS.get('tree-forest').clone();
    const scale = 0.05;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryScrub() {
    const vertPos = [];
    const vertexColors = [];

    const innerWidth = 0.1;
    const outerWidth = 0.2;
    const innerHeight = -0.1;
    const outerHeight = -0.2;

    const colorBase = new Color('hsl(46, 15%, 33%)');
    const colorTip = new Color('hsl(46, 21%, 51%)');
    const colorGreen = new Color('hsl(100, 30%, 51%)');

    const spikeCount = 6;
    const angleStep = (Math.PI * 2) / spikeCount;

    for (let i = 0; i < spikeCount; i ++) {
        const curAngle = angleStep * i;
        const nextAngle = angleStep * (i + 1);
        const midAngle = angleStep * (i + 0.5);

        vertPos.push(
            0, 0, 0,
            Math.cos(curAngle) * innerWidth, innerHeight, Math.sin(curAngle) * innerWidth,
            Math.cos(nextAngle) * innerWidth, innerHeight, Math.sin(nextAngle) * innerWidth,

            Math.cos(nextAngle) * innerWidth, innerHeight, Math.sin(nextAngle) * innerWidth,
            Math.cos(curAngle) * innerWidth, innerHeight, Math.sin(curAngle) * innerWidth,
            Math.cos(midAngle) * outerWidth, outerHeight, Math.sin(midAngle) * outerWidth,

            Math.cos(nextAngle) * innerWidth, 0, Math.sin(nextAngle) * innerWidth,
            Math.cos(curAngle) * innerWidth, 0, Math.sin(curAngle) * innerWidth,
            Math.cos(midAngle) * outerWidth * 2, innerHeight, Math.sin(midAngle) * outerWidth * 2,
        );

        vertexColors.push(
            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            
            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            colorGreen.r, colorGreen.g, colorGreen.b,

            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            colorTip.r, colorTip.g, colorTip.b,
        );
    }


    const leafGeometry = new BufferGeometry();
    leafGeometry.setAttribute('position', new BufferAttribute(new Float32Array(vertPos), 3));
    leafGeometry.setAttribute('color', new BufferAttribute(new Float32Array(vertexColors), 3));
    leafGeometry.computeBoundingBox();
    leafGeometry.computeBoundingSphere();
    leafGeometry.computeVertexNormals();
    return leafGeometry;
}

function createInstanceGeometryVineyard() {
    const geometry = NET_MODELS.get('vigne').clone();
    const scale = -0.02;
    geometry.scale(scale, scale, scale)
    return geometry;
}
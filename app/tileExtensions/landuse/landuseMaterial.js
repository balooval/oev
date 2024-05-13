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
        {
            id: 'forest-top',
            url: 'forest-top.png',
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
            id: 'vigne-lod5',
            url: 'vigne-lod5.glb',
        },
        {
            id: 'vigne-lod0',
            url: 'vigne-lod0.glb',
        },
        {
            id: 'tree-forest-lod0',
            url: 'tree-forest-lod0.glb',
        },
        {
            id: 'tree-forest-lod5',
            url: 'tree-forest-test.glb',
        },
        {
            id: 'tree-sapin-lod0',
            url: 'tree-sapin-lod0.glb',
        },
        {
            id: 'tree-sapin-lod5',
            url: 'tree-sapin-test.glb',
        },
        {
            id: 'scrub-lod5',
            url: 'scrub-lod5.glb',
        },
        {
            id: 'scrub-lod0',
            url: 'scrub-lod0.glb',
        },
    ];

    return new Promise((resolve) => {
        NET_MODELS.loadBatch(modelsList, resolve);
    });
}

function setModelsToGeometries() {
    instanceGeometries.set('forest', createInstanceGeometryTree(5));
    instanceGeometries.set('forest-0', createInstanceGeometryTree(0));
    instanceGeometries.set('sapin', createInstanceGeometryForestSapin(5));
    instanceGeometries.set('sapin-0', createInstanceGeometryForestSapin(0));
    instanceGeometries.set('scrub', createInstanceGeometryScrub(5));
    instanceGeometries.set('scrub-0', createInstanceGeometryScrub(0));
    instanceGeometries.set('vineyard', createInstanceGeometryVineyard(5));
    instanceGeometries.set('vineyard-0', createInstanceGeometryVineyard(0));

    return new Promise((resolve) => {
        resolve();
    });
}

function createInstanceGeometryTree(lod) {
    const geometry = NET_MODELS.get('tree-forest-lod' + lod).clone();
    const scale = 0.05;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryForestSapin(lod) {
    const geometry = NET_MODELS.get('tree-sapin-lod' + lod).clone();
    const scale = 0.05;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryScrub(lod) {
    const geometry = NET_MODELS.get('scrub-lod' + lod).clone();
    const scale = 0.08;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryVineyard(lod) {
    const geometry = NET_MODELS.get('vigne-lod' + lod).clone();
    const scale = -0.02;
    geometry.scale(scale, scale, scale)
    return geometry;
}

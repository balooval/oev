import {
    DoubleSide,
    MeshPhysicalMaterial,
} from 'three';
import Evt from '../../core/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/models.js';
import { texture as TextureLoader, loadBatch as TextureLoadBatch } from '../../net/textures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension);

export const evt = new Evt();
export let isReady = false;

let workerImagesDatas = [];

export function material(_type) {
    return materials[_type];
}

export function getMaterialForType(type) {
    return instanceMaterial.get(type);
}

export function getGeometryForType(type) {
    return instanceGeometries.get(type);
}

export function getImagesDatasForWorker() {
    return workerImagesDatas;
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
    // .then(() => {
    //     return sendTexturesToWorker();
    // })
    .then(() => {
        isReady = true;
        evt.fireEvent('READY')
    });
}

function sendTexturesToWorker() {
    return new Promise((resolve) => {
        Promise.all([
            createImageBitmap(TextureLoader('landuse_map_empty').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_normalMap_empty').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_roughnessMap_empty').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_map_scrub').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_normalMap_scrub').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_roughnessMap_scrub').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_map_rock').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_normalMap_rock').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_roughnessMap_rock').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_map_residential').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_normalMap_residential').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_roughnessMap_residential').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_map_forest').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_normalMap_forest').image, 0, 0, 512, 512),
            createImageBitmap(TextureLoader('landuse_roughnessMap_forest').image, 0, 0, 512, 512),

        ]).then(imagesDatas => {
            console.log('THEN');
            workerImagesDatas = imagesDatas;
            resolve()
        });
        
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
            id: 'test-normal',
            url: 'landuse/test-normal.jpg',
        },
        {
            id: 'road',
            url: 'landuse/road.png',
        },
        {
            id: 'grass',
            url: 'landuse/grass.png',
        },
        {
            id: 'grass-normal',
            url: 'landuse/grass-normal.png',
        },
        {
            id: 'ground',
            url: 'landuse/ground.png',
        },
        {
            id: 'ground-normal',
            url: 'landuse/ground-normal.png',
        },
        {
            id: 'forest',
            url: 'landuse/forest.png',
        },
        {
            id: 'forest-normal',
            url: 'landuse/forest-normal.png',
        },
        {
            id: 'scrub',
            url: 'landuse/scrub.png',
        },
        {
            id: 'scrub-normal',
            url: 'landuse/scrub-normal.png',
        },
        {
            id: 'rock',
            url: 'landuse/rock.png',
        },
        {
            id: 'rock-normal',
            url: 'landuse/rock-normal.png',
        },
        {
            id: 'sapin-meshy',
            url: 'sapin-meshy-fade.png',
        },
        {
            id: 'tree-meshy',
            url: 'tree-meshy-fade.png',
        },
        {
            id: 'blender-scrub-normal',
            url: 'blender-scrub-normal.png',
        },
        {
            id: 'blender-scrub-0',
            url: 'blender-scrub-0.png',
        },
        {
            id: 'blender-scrub-1',
            url: 'blender-scrub-1.png',
        },
        {
            id: 'blender-scrub-2',
            url: 'blender-scrub-2.png',
        },
        {
            id: 'blender-scrub-3',
            url: 'blender-scrub-3.png',
        },
        {
            id: 'blender-forest-shell-full',
            url: 'blender-forest-shell-full.png',
        },
        {
            id: 'blender-forest-shell-full-normal',
            url: 'blender-forest-shell-full-normal.png',
        },
        {
            id: 'voronoi-normal',
            url: 'voronoi-normal.png',
        },
        {
            id: 'blender-forest-normal',
            url: 'blender-forest-normal.png',
        },
        {
            id: 'blender-forest-0',
            url: 'blender-forest-0.png',
        },
        {
            id: 'blender-forest-1',
            url: 'blender-forest-1.png',
        },
        {
            id: 'blender-forest-2',
            url: 'blender-forest-2.png',
        },
        {
            id: 'blender-forest-3',
            url: 'blender-forest-3.png',
        },
        {
            id: 'shell_tree_normal',
            url: 'shell_tree_normal.png',
        },
        {
            id: 'shell_tree_1',
            url: 'shell_tree_1.png',
        },
        {
            id: 'shell_tree_2',
            url: 'shell_tree_2.png',
        },
        {
            id: 'shell_tree_3',
            url: 'shell_tree_3.png',
        },
        {
            id: 'shell_tree_4',
            url: 'shell_tree_4.png',
        },
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
        TextureLoadBatch(texturesList, resolve);
    });
}

function setMapToMaterials() {
    // instanceMaterial.get('forest').map = TextureLoader('tree-forest-lod5');
    instanceMaterial.get('forest').map = TextureLoader('tree-meshy');
    instanceMaterial.get('forest').map.flipY = false;
    // instanceMaterial.get('forest').map = TextureLoader('tree-forest');
    // instanceMaterial.get('sapin').map = TextureLoader('tree-forest-sapin');
    instanceMaterial.get('sapin').map = TextureLoader('sapin-meshy');
    instanceMaterial.get('sapin').map.flipY = false;
    instanceMaterial.get('vineyard').map = TextureLoader('vigne');

    return new Promise((resolve) => {
        resolve();
    });
}

function loadModels() {
    const modelsList = [
        {
            id: 'tree-forest-lod5',
            url: 'tree-forest-meshy-lod3.glb',
        },
        {
            id: 'tree-forest-lod0',
            url: 'tree-forest-meshy-lod0.glb',
        },
        {
            id: 'vigne-lod5',
            url: 'vigne-lod5.glb',
        },
        {
            id: 'vigne-lod0',
            url: 'vigne-lod0.glb',
        },
        // {
        //     id: 'tree-forest-lod0',
        //     url: 'tree-forest-lod0.glb',
        // },
        // {
        //     id: 'tree-forest-lod5',
        //     url: 'tree-forest-test.glb',
        // },
        {
            id: 'tree-sapin-lod0',
            url: 'tree-sapin-meshy-lod0.glb',
        },
        // {
        //     id: 'tree-sapin-lod0',
        //     url: 'tree-sapin-lod0.glb',
        // },
        {
            id: 'tree-sapin-lod5',
            url: 'tree-sapin-meshy-lod5.glb',
        },
        // {
        //     id: 'tree-sapin-lod5',
        //     url: 'tree-sapin-test.glb',
        // },
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
    const scale = 2;
    geometry.scale(scale, scale, scale);
    geometry.translate(0, 6, 0);
    return geometry;
}

function createInstanceGeometryForestSapin(lod) {
    const geometry = NET_MODELS.get('tree-sapin-lod' + lod).clone();
    const scale = 2;
    geometry.scale(scale, scale, scale);
    geometry.translate(0, 6, 0);
    return geometry;
}

function createInstanceGeometryScrub(lod) {
    const geometry = NET_MODELS.get('scrub-lod' + lod).clone();
    const scale = 2;
    geometry.scale(scale, scale, scale);
    geometry.translate(0, 5, 0);
    return geometry;
}

function createInstanceGeometryVineyard(lod) {
    const geometry = NET_MODELS.get('vigne-lod' + lod).clone();
    const scale = 2;
    geometry.scale(scale, scale, scale)
    return geometry;
}

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
import { texture as TextureLoader, loadBatch as TextureLoadBatch } from '../../net/textures.js';

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

// const workerCanvasComposer = new SharedWorker('/app/utils/workerCanvasComposer.js', {type: 'module'});

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
            
            workerCanvasComposer.port.postMessage(
                {
                    command: 'uploadTextures',
                    textures: {
                        'map_empty': imagesDatas[0],
                        'normalMap_empty': imagesDatas[1],
                        'roughnessMap_empty': imagesDatas[2],

                        'map_scrub': imagesDatas[3],
                        'normalMap_scrub': imagesDatas[4],
                        'roughnessMap_scrub': imagesDatas[5],

                        'map_rock': imagesDatas[6],
                        'normalMap_rock': imagesDatas[7],
                        'roughnessMap_rock': imagesDatas[8],

                        'map_residential': imagesDatas[9],
                        'normalMap_residential': imagesDatas[10],
                        'roughnessMap_residential': imagesDatas[11],

                        'map_forest': imagesDatas[12],
                        'normalMap_forest': imagesDatas[13],
                        'roughnessMap_forest': imagesDatas[14],
                        
                    },
                },
                [
                    imagesDatas[0],
                    imagesDatas[1],
                    imagesDatas[2],
                ]
            );
        
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

        {id: 'landuse_map_empty', url: '/landuse/worn_rock_natural_01_diff_4k.png'},
        {id: 'landuse_normalMap_empty', url: '/landuse/worn_rock_natural_01_nor_gl_4k.png'},
        {id: 'landuse_roughnessMap_empty', url: '/landuse/worn_rock_natural_01_rough_4k.png'},

        // {id: 'landuse_map_forest', url: '/landuse/Hedge_001_BaseColor.jpg'},
        // {id: 'landuse_normalMap_forest', url: '/landuse/Hedge_001_Normal.jpg'},
        // {id: 'landuse_roughnessMap_forest', url: '/landuse/Hedge_001_Roughness.jpg'},
        {id: 'landuse_map_forest', url: '/landuse/aerial_grass_rock_diff_4k.png'},
        {id: 'landuse_normalMap_forest', url: '/landuse/aerial_grass_rock_nor_gl_4k.png'},
        {id: 'landuse_roughnessMap_forest', url: '/landuse/aerial_grass_rock_rough_4k.png'},
        
        {id: 'landuse_map_scrub', url: '/landuse/coast_sand_rocks_02_diff_4k.png'},
        {id: 'landuse_normalMap_scrub', url: '/landuse/coast_sand_rocks_02_nor_gl_4k.png'},
        {id: 'landuse_roughnessMap_scrub', url: '/landuse/coast_sand_rocks_02_rough_4k.png'},
        // {id: 'landuse_map_scrub', url: '/landuse/Pebbles_007_COLOR.jpg'},
        // {id: 'landuse_normalMap_scrub', url: '/landuse/Pebbles_007_NORM.jpg'},
        // {id: 'landuse_roughnessMap_scrub', url: '/landuse/Pebbles_007_ROUGH.jpg'},

        // {id: 'landuse_map_rock', url: '/landuse/Ground_Dirt_009_baseColor.jpg'},
        // {id: 'landuse_normalMap_rock', url: '/landuse/Ground_Dirt_009_normal.jpg'},
        // {id: 'landuse_roughnessMap_rock', url: '/landuse/Ground_Dirt_009_roughness.jpg'},
        {id: 'landuse_map_rock', url: '/landuse/aerial_rocks_04_diff_4k.png'},
        {id: 'landuse_normalMap_rock', url: '/landuse/aerial_rocks_04_nor_gl_4k.png'},
        {id: 'landuse_roughnessMap_rock', url: '/landuse/aerial_rocks_04_rough_4k.png'},

        {id: 'landuse_map_residential', url: '/landuse/ground_grey_diff_4k.png'},
        {id: 'landuse_normalMap_residential', url: '/landuse/ground_grey_nor_gl_4k.png'},
        {id: 'landuse_roughnessMap_residential', url: '/landuse/ground_grey_rough_4k.png'},
        
        
    ];
    
    return new Promise((resolve) => {
        TextureLoadBatch(texturesList, resolve);
    });
}

function setMapToMaterials() {
    instanceMaterial.get('forest').map = TextureLoader('tree-forest');
    instanceMaterial.get('sapin').map = TextureLoader('tree-forest-sapin');
    instanceMaterial.get('vineyard').map = TextureLoader('vigne');

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
    const scale = 2;
    geometry.scale(scale, scale, scale);
    // geometry.rotateX(Math.PI);
    geometry.translate(0, 6, 0);
    return geometry;
}

function createInstanceGeometryForestSapin(lod) {
    const geometry = NET_MODELS.get('tree-sapin-lod' + lod).clone();
    const scale = 2;
    geometry.scale(scale, scale, scale);
    // geometry.rotateX(Math.PI);
    geometry.translate(0, 5, 0);
    return geometry;
}

function createInstanceGeometryScrub(lod) {
    const geometry = NET_MODELS.get('scrub-lod' + lod).clone();
    const scale = 2;
    geometry.scale(scale, scale, scale);
    // geometry.rotateX(Math.PI);
    geometry.translate(0, 5, 0);
    return geometry;
}

function createInstanceGeometryVineyard(lod) {
    const geometry = NET_MODELS.get('vigne-lod' + lod).clone();
    const scale = 2;
    geometry.scale(scale, scale, scale)
    return geometry;
}

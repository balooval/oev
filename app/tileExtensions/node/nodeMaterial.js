import * as THREE from '../../vendor/three.module.js';
import Evt from '../../core/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_TEXTURES from '../../net/textures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateNodes);

const api = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials[_type];
    }, 
};

const materials = {
    bench : null, 
    street_lamp : null, 
    tower : null, 
    tree : null, 
};

function onActivateNodes() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateNodes);
    createMaterials();
    loadTextures();
}

function createMaterials() {
    materials.bench = new THREE.MeshPhysicalMaterial({roughness:0.9,metalness:0, color:0x544d42}), 
    materials.street_lamp = new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0.5, color:0x303030}), 
    materials.tower = new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0, color:0xdddddd, side:THREE.DoubleSide, transparent:true, alphaTest:0.1}), 
    materials.tree = new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xffffff});
}

function loadTextures() {
    const texturesList = [
        {
            id : 'tree_leaves', 
            url : 'tree_leaves.png', 
        }, 
        {
            id : 'pylone', 
            url : 'pylone_diffuse.png', 
        }, 
    ];
    NET_TEXTURES.loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    materials.tree.map = NET_TEXTURES.texture('tree_leaves');
    materials.tower.map = NET_TEXTURES.texture('pylone');
    console.log('Nodes TEXTURES_LOADED');
    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
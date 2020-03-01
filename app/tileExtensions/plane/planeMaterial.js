import * as THREE from '../../vendor/three.module.js';
import Evt from '../../core/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_TEXTURES from '../../net/textures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateNodes);

const api = {
    evt : new Evt(), 
    isReady : false, 

    material : function() {
        return material;
    }, 
};

let material = null;

function onActivateNodes() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateNodes);
    createMaterials();
    loadTextures();
}

function createMaterials() {
    material = new THREE.MeshPhysicalMaterial({color: 0xffffff, metalness:0, roughness:0.3});
}

function loadTextures() {
    const texturesList = [
        {
            id : 'plane', 
            url : 'airbus-diffuse.png', 
        }, 
    ];
    NET_TEXTURES.loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    material.map = NET_TEXTURES.texture('plane');
    console.log('Plane TEXTURES_LOADED');
    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
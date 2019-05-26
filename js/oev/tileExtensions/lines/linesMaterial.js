import Evt from '../../utils/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_TEXTURES from '../../net/NetTextures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension);

const texturesToLoad = [
    ['fence', 'fence.png'], 
    ['wall', 'wall.png'], 
];

const api = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials[_type];
    }, 
};

const materials = {};


function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension);
    createMaterials();
    loadTextures();
}

function createMaterials() {
    materials.fence = new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0.5, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2});
    materials.wall = new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF});
}

function loadTextures() {
    const texturesList = [];
    texturesToLoad.forEach(d => NET_TEXTURES.addToList(texturesList, d[0], d[1]));
    NET_TEXTURES.loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    materials.fence.map = NET_TEXTURES.texture('fence');
    materials.wall.map = NET_TEXTURES.texture('wall');
    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
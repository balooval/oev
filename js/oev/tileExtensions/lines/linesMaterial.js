import Evt from '../../utils/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_TEXTURES from '../../net/textures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension);

const texturesToLoad = [
    ['fence', 'fence.png'], 
    ['wall', 'wall.png'], 
    ['path_texture', 'path_texture.png'], 
    ['vehicle', 'voiture-map.png'], 
];

const api = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials.get(_type);
    }, 

    textureBuffer : function() {
        return textureBuffer;
    }, 
};

const materials = new Map();

let textureBuffer = null;
const canvasTexture = document.createElement('canvas');
canvasTexture.width = 16;
canvasTexture.height = 16;


function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension);
    createMaterials();
    loadTextures();
}

function createMaterials() {
    materials.set('fence', new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0.5, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}));
    materials.set('wall', new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF}));
    materials.set('highway', new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0x0a1918}));
    materials.set('vehicle', new THREE.MeshPhysicalMaterial({roughness:0.2,metalness:0, color: 0xffffff}));
}

function loadTextures() {
    const texturesList = [];
    texturesToLoad.forEach(d => NET_TEXTURES.addToList(texturesList, d[0], d[1]));
    NET_TEXTURES.loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    materials.get('fence').map = NET_TEXTURES.texture('fence');
    materials.get('wall').map = NET_TEXTURES.texture('wall');
    materials.get('vehicle').map = NET_TEXTURES.texture('vehicle');


    const context = canvasTexture.getContext('2d');
    context.drawImage(NET_TEXTURES.texture('path_texture').image, 0, 0);
    textureBuffer = context.getImageData(0, 0, 16, 16).data;


    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
import * as THREE from '../../../libs/three.module.js';
import Evt from '../../utils/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/models.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension);

const modelsToLoad = [
    ['vehicle', 'voiture.json'], 
    // ['vehicle', 'voiture.glb'], 
];

const api = {
    evt : new Evt(), 
    isReady : false, 

    get : function(_model) {
        const geometry = NET_MODELS.get(_model).geometry.clone();
        applyTransformation( geometry);
        return geometry;
    }
};

function applyTransformation(_geometrie) {
    const scaleValue = 0.8;
    const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
    // const rotation = 0;
    _geometrie.scale(scale.x, scale.y, scale.z);
    // _geometrie.rotateY(rotation);
}

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension);
    loadModels();
}

function loadModels() {
    const modelsList = [];
    modelsToLoad.forEach(d => NET_MODELS.addToList(modelsList, d[0], d[1]));
    NET_MODELS.loadBatch(modelsList, onModelsLoaded);
}

function onModelsLoaded() {
    console.log('Lines MODELS LOADED');
    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
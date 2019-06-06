import Evt from '../../utils/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/models.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension);

const modelsToLoad = [
    ['plane', 'airbus.json'], 
];

const api = {
    evt : new Evt(), 
    isReady : false, 

    get : function(_model) {
        const geometry = NET_MODELS.get(_model).geometry.clone();
        applyTransformation(geometry);
        return geometry;
    }, 

};

function applyTransformation(_geometrie) {
    const planeScale = 1;
    const scale = new THREE.Vector3(planeScale, planeScale, planeScale);
    _geometrie.scale(scale.x, scale.y, scale.z);
}

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension);
    loadModels();
}

function loadModels() {
    const modelsList = [];
    modelsToLoad.forEach(d => NET_MODELS.addToList(modelsList, d[0], d[1]));
    NET_MODELS.loadBatch(modelsList, onModelsLoaded);
}

function onModelsLoaded() {
    console.log('Plane MODELS LOADED');
    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
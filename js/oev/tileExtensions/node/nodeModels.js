import Evt from '../../utils/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/NetModels.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateExtension);

const modelsToLoad = [
    ['tower', 'pylone.json'], 
    // ['tree', 'tree.json'], 
    ['tree', 'tree_leaves.json'], 
    ['bench', 'bench.json'], 
    ['street_lamp', 'lamp.json'], 
];

const api = {
    evt : new Evt(), 
    isReady : false, 
};

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateExtension);
    loadModels();
}

function loadModels() {
    const modelsList = [];
    modelsToLoad.forEach(d => NET_MODELS.addToList(modelsList, d[0], d[1]));
    NET_MODELS.loadBatch(modelsList, onModelsLoaded);
}

function onModelsLoaded() {
    console.log('Nodes MODELS LOADED');
    api.isReady = true;
    api.evt.fireEvent('READY')
}

export {api as default};
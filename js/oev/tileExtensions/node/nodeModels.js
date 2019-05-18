import Evt from '../../utils/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/NetModels.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateExtension);

const modelsToLoad = [
    ['tower', 'pylone.json'], 
    ['tree_needles', 'tree_needles.json'], 
    ['tree_leaves', 'tree_leaves.json'], 
    ['bench', 'bench.json'], 
    ['street_lamp', 'lamp.json'], 
];

const api = {
    evt : new Evt(), 
    isReady : false, 

    get : function(_node) {
        let type = _node.type;
        if (type == 'tree') {
            type = getTreeModel(_node.props);
            // console.log('tree', type);
        }
        return NET_MODELS.get(type).geometry.clone();
    }
};

function getTreeModel(_props) {
    // return 'tree_needles';
    // if (!_props.leaf_type) return 'tree_needles';
    // if (_props.leaf_type == 'needleleaved') return 'tree_leaves';
    // return 'tree_needles';

    if (!_props.leaf_type) return 'tree_leaves';
    if (_props.leaf_type == 'needleleaved') return 'tree_needles';
    return 'tree_leaves';
}

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
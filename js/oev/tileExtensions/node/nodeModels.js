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
        const geometry = NET_MODELS.get(type).geometry.clone();
        applyTransformation(_node, geometry);
        return geometry;
    }
};

function getTreeModel(_props) {
    if (_props.diameter_crown) console.log('_props.diameter_crown', _props.diameter_crown);
    if (!_props.leaf_type) return 'tree_leaves';
    if (_props.leaf_type == 'needleleaved') return 'tree_needles';
    return 'tree_leaves';
}

function applyTransformation(_node, _geometrie) {
    const scale = new THREE.Vector3(1, 1, 1);
    if (_node.props.circumference) {
        scale.x = _node.props.circumference;
        scale.z = _node.props.circumference;
    }
    const minHeight = _node.props.min_height || 0;
    if (_node.props.height) {
        scale.y = (_node.props.height - minHeight) / 5;
    }
    _geometrie.scale(scale.x, scale.y, scale.z);
    _geometrie.rotateY(Math.random() * 6);
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
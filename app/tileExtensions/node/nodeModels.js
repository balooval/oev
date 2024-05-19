import Evt from '../../core/event.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_MODELS from '../../net/models.js';

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

    get : function(node) {
        let type = node.type;
        if (type == 'tree') {
            type = getTreeModel(node.props);
        }
        const geometry = NET_MODELS.get(type).geometry.clone();
        applyTransformation(node, geometry);
        return geometry;
    }
};

function getTreeModel(_props) {
    if (_props.diameter_crown) console.log('_props.diameter_crown', _props.diameter_crown);
    if (!_props.leaf_type) return 'tree_leaves';
    if (_props.leaf_type == 'needleleaved') return 'tree_needles';
    return 'tree_leaves';
}

function applyTransformation(_node, geometry) {
    const scale = {
        x: 1,
        y: 1,
        z: 1,
    };
    if (_node.props.circumference && _node.props.circumference > 0) {
        _node.props.circumference = Math.min(_node.props.circumference, 10);
        scale.x = _node.props.circumference / 5;
        scale.z = _node.props.circumference / 5;
    }
    const minHeight = _node.props.min_height || 0;
    if (_node.props.height && _node.props.height > 0) {
        scale.y = (_node.props.height - minHeight) / 5;
    }

    if (scale.x <= 0 || scale.y <= 0 || scale.z <= 0) {
        console.warn('Scale <= 0', _node);
        scale.x = 1;
        scale.y = 1;
        scale.z = 1;
    }
    const factor = 50;
    geometry.scale(scale.x * factor, scale.y * factor, scale.z * factor);
    geometry.rotateX(3.14);
    geometry.rotateY(Math.random() * 6);
    // geometry.translate(0, 10, 0);
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
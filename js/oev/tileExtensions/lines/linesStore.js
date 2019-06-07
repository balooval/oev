import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import OsmReader from '../../utils/osmReader.js';
import LinesMaterial from './linesMaterial.js';
import * as GEO_BUILDER from './linesGeometryBuilder.js';

let knowIds = [];
const tileToLines = new Map();
const storedLines = new Map();
const typedGeometries = new Map();
let schdeduleNb = 0;

const api = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = OsmReader.extractNodes(parsedJson);
        tileToLines.set(_tile.key, []);
        const extractedWays = extractElements(parsedJson, _tile.zoom);
        registerDatas(_tile, extractedWays);
        let lineAdded = 0;
        lineAdded += buildLine(_tile, extractedWays, nodesList);
        if (lineAdded > 0) scheduleDraw();
    }, 

    tileRemoved : function(_tile) {
        if (!tileToLines.get(_tile.key)) return false;
        tileToLines.get(_tile.key)
        .forEach(lineId => {
            if (!storedLines.get('LINE_' + lineId)) return false;
            const stored = storedLines.get('LINE_' + lineId);
            stored.refNb --;
            if (stored.refNb <= 0) {
                forgotLine(lineId);
                deleteLineGeometry(stored.id, stored.type);
                storedLines.delete('LINE_' + lineId);
            }
        });
        tileToLines.delete(_tile.key);
        scheduleDraw();
    }
};

function registerDatas(_tile, _extractedDatas) {
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const way = _extractedDatas[i];
        if (!isLineKnowed(way.id)) continue;
        storedLines.get('LINE_' + way.id).refNb ++;
    }
    tileToLines.get(_tile.key).push(..._extractedDatas.map(line => line.id));
}

function buildLine(_tile, _extractedDatas, _nodesList) {
    let lineAdded = 0;
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const way = _extractedDatas[i];
        if (isLineKnowed(way.id)) continue;
        knowIds.push(way.id);
        const lineBuilded = buildWay(way, _nodesList);
        if (lineBuilded.border.length < 2) return;
        storedLines.set('LINE_' + lineBuilded.id, {
            id : lineBuilded.id, 
            type : lineBuilded.type, 
            refNb : 1
        });
        drawLine(lineBuilded, _tile);
        lineAdded ++;
    }
    return lineAdded;
}


function scheduleDraw() {
    if (schdeduleNb > 0) return false;
    schdeduleNb ++;
    setTimeout(redrawMeshes, 1000);
}

function drawLine(_line, _tile) {
    const lineGeometry = GEO_BUILDER.buildGeometry(_line, _tile)
    if (lineGeometry) saveLineGeometries(_line.id, lineGeometry, _line.type);
}

function redrawMeshes() {
    typedGeometries.forEach((curTypedGeos) => {
        curTypedGeos.mesh.geometry.dispose();
        const datasGeometries = curTypedGeos.list.map(data => data.geometry);
        if (datasGeometries.length == 0) return;
        curTypedGeos.mesh.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
        GLOBE.addMeshe(curTypedGeos.mesh);
    });
    schdeduleNb --;
    Renderer.MUST_RENDER = true;
}

function saveLineGeometries(_id, _geometry, _type) {
    if (!typedGeometries.get(_type)) {
        const meshes = [];
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), LinesMaterial.material(_type));
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        meshes.push(mesh);
        typedGeometries.set(_type, {
            mesh : mesh, 
            list : [], 
        });
    }
    typedGeometries.get(_type).list.push({
        id : _id, 
        geometry : _geometry, 
    });
}

function deleteLineGeometry(_id, _type) {
    const curTypedGeos = typedGeometries.get(_type);
    if (!curTypedGeos) return;
    for (let i = 0; i < curTypedGeos.list.length; i ++) {
        if (curTypedGeos.list[i].id != _id) continue;
        curTypedGeos.list[i].geometry.dispose();
        curTypedGeos.list.splice(i, 1);
        break;
    }
    if (curTypedGeos.list.length == 0) {
        GLOBE.removeMeshe(curTypedGeos.mesh);
    }
}

function buildWay(_way, _nodesList) {
    const wayNodes = [];
    for (let i = 0; i < _way.nodes.length; i ++) {
        wayNodes.push(_nodesList.get('NODE_' + _way.nodes[i]));
    }
    const type = extractType(_way);
    // TODO: si c'est une highway, merger les morceaux contigues et semblables
    return {
        id : _way.id, 
        type : type, 
        props : extractTags(_way.tags, type), 
        border : wayNodes, 
    };
}

function isLineKnowed(_id) {
    return knowIds.includes(_id);
}

function forgotLine(_id) {
    knowIds = knowIds.filter(id => id != _id);
}

function extractElements(_datas, _zoom) {
    return OsmReader.extractElements(_datas, 'way')
    .filter(e => e.tags)
    .filter(e => isTagSupported(e, _zoom));
}

function isTagSupported(_element, _zoom) {
    const type = extractType(_element);
    if (!type) return false;
    if (_zoom != tagsZoom[type]) return false;
	return true;
}

function extractType(_element) {
    let elementType = null;
    supportedTags.forEach(tag => {
        if (!_element.tags[tag.key]) return false;
        tag.values.forEach(value => {
            if (value == '*') {
                elementType = tag.key;
                return;
            }
            if (_element.tags[tag.key] == value) {
                elementType = tag.useKey ? tag.key : value;
                return;
            }
            return;
        })
    })
    if (equalsTags[elementType]) return equalsTags[elementType];
	return elementType;
}

function removeWayDuplicateLimits(_way) {
	if (_way.length < 2) return _way;
	const first = _way[0];
	const last = _way[_way.length-1];
	if (first[0] != last[0] || first[1] != last[1]) return _way;
	_way.pop();
	return _way;
}

function extractTags(_tags, _type) {
    const res = {
        width : 1, 
        height : 2, 
    };
    if (_type == 'wall') {
        res.width = 1;
        res.height = 2;
    }
    if (_type == 'highway') {
        res.width = 4;
        res.height = 0.5;
        const highwayProps = getHighwayTags(_tags.highway);
        highwayProps.forEach((value, prop) => {
            res[prop] = value;
        })
    }
    if (_tags.width) {
        _tags.width = _tags.width.replace('m', '');
        _tags.width = _tags.width.replace(' ', '');
        res.width = parseFloat(_tags.width);
    }
    if (_tags.height) {
        _tags.height = _tags.height.replace('m', '');
        _tags.height = _tags.height.replace(' ', '');
        _tags.height = _tags.height.replace('~', '');
        res.height = parseFloat(_tags.height);
        if (isNaN(res.height)) console.log('res.height', _tags.height);
    }
    return res;
}

function getHighwayTags(_highwayValue) {
    const values = [
        {
            tags : [
                'motorway', 
                'trunk', 
                'motorway_link', 
                'trunk_link', 
            ], 
            width : 10
        }, 
        {
            tags : [
                'primary', 
                'primary_link', 
                'raceway', 
            ], 
            width : 6
        }, 
        {
            tags : [
                'secondary', 
                'secondary_link', 
            ], 
            width : 5
        }, 
        {
            tags : [
                'tertiary', 
                'tertiary_link', 
            ], 
            width : 4
        }, 
        {
            tags : [
                'tertiary', 
                'unclassified', 
                'road', 
            ], 
            width : 4
        }, 
        {
            tags : [
                'residential', 
                'living_street', 
            ], 
            width : 3
        }, 
        {
            tags : [
                'pedestrian', 
                'service', 
            ], 
            width : 2
        }, 
    ];
    return values
    .filter(value => value.tags.includes(_highwayValue))
    .map(value => {
        const res = new Map();
        res.set('width', value.width);
        return res;
    }).pop();
}

const equalsTags = {
    retaining_wall : 'wall', 
    line : 'powerLine', 
};

const tagsZoom = {
    wall : 15, 
    fence : 15, 
    powerLine : 16, 
    highway : 15, 
};

const supportedTags = [
    {
        key : 'barrier', 
        values : [
            'fence', 
            'wall', 
            'retaining_wall', 
        ]
    }, 
    {
        key : 'power', 
        values : [
            'line', 
        ], 
    }, 
    {
        useKey : true, 
        key : 'highway', 
        values : [
            'motorway', 
            'trunk', 
            'primary', 
            'secondary', 
            'tertiary', 
            'unclassified', 
            'residential', 
            'motorway_link', 
            'trunk_link', 
            'primary_link', 
            'secondary_link', 
            'tertiary_link', 
            'living_street', 
            'service', 
            'pedestrian', 
            'raceway', 
            'road', 
        ], 
    }, 
];

export {api as default};
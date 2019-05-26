import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import LinesMaterial from './linesMaterial.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as GEO_BUILDER from './linesGeometryBuilder.js';
import * as NET_TEXTURES from '../../net/NetTextures.js';

let knowIds = [];
const tileToLines = {};
let storedLines = {};
const typedGeometries = {};
let schdeduleNb = 0;

const api = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = extractNodes(parsedJson);
        tileToLines[_tile.key] = [];
        const extractedWays = extractElements(parsedJson, _tile.zoom);
        registerDatas(_tile, extractedWays);
        let lineAdded = 0;
        lineAdded += buildLine(_tile, extractedWays, nodesList);
        // return false;
        if (lineAdded > 0) scheduleDraw();
    }, 

    tileRemoved : function(_tile) {
        if (!tileToLines[_tile.key]) return false;
        tileToLines[_tile.key]
        .forEach(lineId => {
            if (!storedLines['LINE_' + lineId]) return false;
            const stored = storedLines['LINE_' + lineId];
            stored.refNb --;
            if (stored.refNb <= 0) {
                forgotLine(lineId);
                deleteLineGeometry(stored.id, stored.type);
                delete storedLines['LINE_' + lineId];
            }
        });
        delete tileToLines[_tile.key];
        scheduleDraw();
    }
};

function registerDatas(_tile, _extractedDatas) {
    _extractedDatas
    .filter(line => isLineKnowed(line.id))
    .forEach(line => {
        storedLines['LINE_' + line.id].refNb ++;
    });
    tileToLines[_tile.key].push(..._extractedDatas.map(line => line.id));
}

function buildLine(_tile, _extractedDatas, _nodesList) {
    let lineAdded = 0;
    _extractedDatas
    .filter(way => !isLineKnowed(way.id))
    .forEach(lineDatas => {
        knowIds.push(lineDatas.id);
        const lineBuilded = buildWay(lineDatas, _nodesList);
        if (lineBuilded.border.length < 2) return;
        storedLines['LINE_' + lineBuilded.id] = {
            id : lineBuilded.id, 
            type : lineBuilded.type, 
            refNb : 1
        };
        drawLine(lineBuilded, _tile);
        lineAdded ++;
    });
    return lineAdded;
}


function scheduleDraw() {
    if (schdeduleNb > 0) return false;
    schdeduleNb ++;
    setTimeout(redrawMeshes, 1000);
}

function drawLine(_line, _tile) {
    const elevationsDatas = getElevationsDatas(_line);
    const lineGeometry = GEO_BUILDER.buildGeometry(_line, elevationsDatas, _tile)
    saveLineGeometries(_line.id, lineGeometry, _line.type);
}

function redrawMeshes() {
    Object.keys(typedGeometries).forEach(type => {
        const curTypedGeos = typedGeometries[type]; 
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
    if (!typedGeometries[_type]) {
        const meshes = [];
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), LinesMaterial.material(_type));
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        meshes.push(mesh);
        typedGeometries[_type] = {
            mesh : mesh, 
            list : [], 
        };
    }
    typedGeometries[_type].list.push({
        id : _id, 
        geometry : _geometry, 
    });
}

function deleteLineGeometry(_id, _type) {
    const curTypedGeos = typedGeometries[_type]; 
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

function getElevationsDatas(_line) {
    return _line.border.map(point => {
        return ElevationStore.get(point[0], point[1]);
    });
}

function buildWay(_way, _nodesList) {
    let wayNodes = _way.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
    // const border = removeWayDuplicateLimits([...wayNodes]);
    return {
        id : _way.id, 
        type : extractType(_way), 
        // border : border, 
        border : wayNodes, 
    };
}

function extractNodes(_datas) {
    const nodes = {};
    _datas.elements
    .filter(e => e.type == 'node')
	.forEach(node => {
		nodes['NODE_' + node.id] = [
			parseFloat(node.lon), 
			parseFloat(node.lat)
		];
    });
    return nodes;
}

function isLineKnowed(_id) {
    return knowIds.includes(_id);
}

function forgotLine(_id) {
    knowIds = knowIds.filter(id => id != _id);
}

function extractElements(_datas, _zoom) {
    return _datas.elements
	.filter(e => e.type == 'way')
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
            if (_element.tags[tag.key] == value) {
                elementType = value;
                return null;
            }
            return null;
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

const equalsTags = {
    retaining_wall : 'wall', 
    line : 'powerLine', 
};

const tagsZoom = {
    wall : 15, 
    fence : 15, 
    powerLine : 16, 
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
];

export {api as default};
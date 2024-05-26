import {GLOBE} from '../../core/globe.js';
import * as OsmReader from '../../utils/osmReader.js';
import MATH from '../../core/math.js';

const rejectedIds = [];

export function parseDatas(_json, _tile) {
    let res = [];
    const parsedJson = JSON.parse(_json);
    const nodesList = OsmReader.extractNodes(parsedJson);
    const waysList = OsmReader.extractWays(parsedJson);
    const extractedRelations = extractElements(parsedJson, 'relation', _tile.zoom);
    const extractedWays = extractElements(parsedJson, 'way', _tile.zoom);
    res = prepareLanduse(res, _tile, extractedRelations, buildRelation, nodesList, waysList);
    res = prepareLanduse(res, _tile, extractedWays, buildWay, nodesList, waysList);
    return res;
}

function prepareLanduse(res, _tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuseDatas = _extractedDatas[i];
        if (rejectedIds.includes(landuseDatas.id)) {
            console.log('ID rejecte, pass');
            continue;
        }
        
        const landuseBuilded = _buildFunction(_tile, landuseDatas, _nodesList, _waysList);
        if (!landuseBuilded) {
            rejectedIds.push(landuseDatas.id);
            continue;
        }
        if (landuseBuilded.border.length > 10000) {
            console.log('Too big, pass');
            continue;
        }

        res.push(landuseBuilded);
    }

    return res;
}

function buildRelation(tile, _relation, _nodesList, _waysList) {
    // TODO : ne gère pas les relations avec plusieurs outer séparés (par exemple la forêt du Mont Aigoual)
    const innersCoords = [];
    for (let i = 0; i < _relation.members.length; i ++) {
        const member = _relation.members[i];
        if (member.role != 'inner') continue;
        const memberNodesIds = _waysList.get('WAY_' + member.ref).nodes;
        const memberNodes = [];
        for (let j = 0; j < memberNodesIds.length; j ++) {
            memberNodes.push(_nodesList.get('NODE_' + memberNodesIds[j]));
        }
        memberNodes.pop();
        innersCoords.push(memberNodes);
    }
    const wayNodes = [];
    for (let i = 0; i < _relation.members.length; i ++) {
        const member = _relation.members[i];
        if (member.role != 'outer') continue;
        const memberNodesIds = _waysList.get('WAY_' + member.ref).nodes;
        for (let j = 1; j < memberNodesIds.length - 1; j ++) {
            wayNodes.push(_nodesList.get('NODE_' + memberNodesIds[j]));
        }
    }
    if (wayNodes.length > 10000) {
        console.log('wayNodes too long', wayNodes.length);
        return null;
    }
    const border = wayNodes.slice(1);

    const bbox = calcBbox(border);
    const grid = coordGrid(tile, bbox, border);

    const res = {
        id : _relation.id, 
        type : extractType(_relation), 
        tags : _relation.tags, 
        border : border, 
        fillPoints : grid, 
        holes : innersCoords, 
    };
    
    return res;
}

function buildWay(tile, _way, _nodesList) {
    let wayNodes = _way.nodes.map(nodeId => _nodesList.get('NODE_' + nodeId));
    const border = wayNodes.slice(1);
    const bbox = calcBbox(border);
    const grid = coordGrid(tile, bbox, border);
    return {
        id : _way.id, 
        type : extractType(_way), 
        tags : _way.tags, 
        border : border, 
        fillPoints : grid, 
        holes : [], 
    };
}

function extractElements(_datas, _type, _zoom) {
    return OsmReader.extractElements(_datas, _type)
    .filter(e => e.tags)
    .filter(e => isTagSupported(e, _zoom));
}

function calcBbox(_border) {
    const lon = _border.map(point => point[0]);
    const lat = _border.map(point => point[1]);
    return {
        minLon : Math.min(...lon), 
        maxLon : Math.max(...lon), 
        minLat : Math.min(...lat), 
        maxLat : Math.max(...lat), 
    }
}

function coordGrid(tile, _bbox, _border) {
    const grid = [];
    const def = GLOBE.tilesDefinition * 4;

    const startCoord = tile.startCoord;
    const endCoord = tile.endCoord;

    const stepCoordX = (endCoord.x - startCoord.x) / def;
    const stepCoordY = (endCoord.y - startCoord.y) / def;

    const minX = Math.max(startCoord.x, _bbox.minLon);
    const maxX = Math.min(endCoord.x, _bbox.maxLon);
    const minY = Math.min(endCoord.y, _bbox.maxLat);
    const maxY = Math.max(startCoord.y, _bbox.minLat);

    for (let posX = minX; posX < maxX; posX += stepCoordX) {
        for (let posY = maxY; posY > minY; posY += stepCoordY) {
            const coord = [posX, posY];
            if (MATH.pointIntoPolygon(coord, _border) === false) {
                continue;
            }
            grid.push(coord);
        }
    }

    return grid;
}

function isTagSupported(element, zoom) {
    const type = extractType(element);
    if (!type) {
        return false;
    }
    // if (zoom != tagsZoom[type]) {
    if (zoom < tagsZoom[type]) {
        return false;
    }
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
    });
    if (equalsTags[elementType]) return equalsTags[elementType];
	return elementType;
}

const equalsTags = {
    wood: 'forest',
    farmyard: 'grass',
    farmland: 'grass',
    grassland: 'grass',
    orchard: 'grass',
    meadow: 'grass',
    greenfield: 'grass',
    village_green: 'grass',
    bare_rock: 'rock',
    scree: 'rock',
    basin: 'water',
    riverbank: 'water',
};

const tagsZoom = {
    residential: 13,
    forest: 13,
    scrub: 13,
    rock: 13,
    water: 15,
    wetland: 15,
    vineyard: 16,
    grass: 17,
};

const supportedTags = [
    {
        key : 'landuse', 
        values : [
            'forest', 
            'wood', 
            'vineyard', 
            'scrub',
            'residential',
            
            // 'basin', 
            
            // 'grass', 
            // 'farmyard', 
            // 'farmland', 
            // 'grassland', 
            // 'orchard', 
            // 'meadow', 
            // 'greenfield', 
            // 'village_green', 
        ]
    }, 
    {
        key : 'natural', 
        values : [
            'forest', 
            'wood', 
            // 'vineyard', 
            'scrub', 
            'bare_rock', 
            // 'water', 
            // 'wetland', 
            
            'scree', 
            // 'grass', 
            // 'farmyard', 
            // 'farmland', 
            // 'grassland', 
            // 'orchard', 
            // 'meadow', 
            // 'greenfield', 
            // 'village_green', 
        ], 
    }, 
    // {
    //     key : 'waterway', 
    //     values : [
    //         'riverbank', 
    //     ], 
    // }, 
];

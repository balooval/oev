import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import GEO from '../../utils/geo.js';
import OsmReader from '../../utils/osmReader.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as Simplify from '../../../libs/simplify.js';
import * as GEO_BUILDER from './landuseGeometryBuilder.js';
import LanduseMaterial from './landuseMaterial.js';

let knowIds = [];
const tileToLanduses = new Map();
const storedLanduses = new Map();
const typedMeshes = new Map();
let schdeduleNb = 0;
const rejectedIds = [];
const tilesUnderLinks = new Map();

const api = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = OsmReader.extractNodes(parsedJson);
        const waysList = OsmReader.extractWays(parsedJson);
        tileToLanduses.set(_tile.key, []);
        const extractedRelations = extractElements(parsedJson, 'relation', _tile.zoom);
        const extractedWays = extractElements(parsedJson, 'way', _tile.zoom);
        registerDatas(_tile.key, extractedRelations);
        registerDatas(_tile.key, extractedWays);
        let landuseAdded = 0;
        landuseAdded += prepareLanduse(_tile, extractedRelations, buildRelation, nodesList, waysList);
        landuseAdded += prepareLanduse(_tile, extractedWays, buildWay, nodesList, waysList);
        if (landuseAdded > 0) scheduleDraw();
    }, 

    tileRemoved : function(_tileKey) {
        if (!tileToLanduses.get(_tileKey)) return false;
        tileToLanduses.get(_tileKey)
        .forEach(landuseId => {
            const stored = storedLanduses.get(landuseId);
            if (!stored) return false;
            stored.refNb --;
            if (stored.refNb > 0) return;
            forgotLanduse(landuseId);
            deleteLanduseGeometry(stored.id, stored.type);
            storedLanduses.delete(landuseId);
            const zoom = 13;
            const bbox = calcBbox(stored.buildDatas.border);
            const tileA = GEO.coordsToTile(bbox.minLon, bbox.minLat, zoom);
            const tileB = GEO.coordsToTile(bbox.maxLon, bbox.maxLat, zoom);
            for (let x = tileA.x; x <= tileB.x; x ++) {
                for (let y = tileB.y; y <= tileA.y; y ++) {
                    const tile = GLOBE.tileFromXYZ(x, y, zoom);
                    if (!tile) continue;
                    const extension = tile.extensions.get('LANDUSE');
                    if (!extension) continue;
                    extension.removeLanduse(landuseId);
                }
            }
        });
        tileToLanduses.delete(_tileKey);
        scheduleDraw();
    }
};

function registerDatas(_tileKey, _extractedDatas) {
    const curTileLinks = tileToLanduses.get(_tileKey);
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuse = _extractedDatas[i];
        curTileLinks.push(landuse.id);
        if (!isLanduseKnowed(landuse.id)) continue;
        storedLanduses.get(landuse.id).refNb ++;
    }
}

function scheduleDraw() {
    if (schdeduleNb > 0) return false;
    schdeduleNb ++;
    setTimeout(redrawMeshes, 1000);
}

function prepareLanduse(_tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    let landuseAdded = 0;
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuseDatas = _extractedDatas[i];
        if (rejectedIds.includes(landuseDatas.id)) {
            console.log('ID rejecte, pass');
            continue;
        }
        if (isLanduseKnowed(landuseDatas.id)) {
            continue;
        }
        const landuseBuilded = _buildFunction(landuseDatas, _nodesList, _waysList);
        if (!landuseBuilded) {
            rejectedIds.push(landuseDatas.id);
            continue;
        }
        if (landuseBuilded.border.length > 10000) {
            console.log('Too big, pass');
            continue;
        }
        if (!buildLanduse(landuseBuilded, _tile)) {
            continue;
        }
        knowIds.push(landuseDatas.id);
        storedLanduses.set(landuseBuilded.id, {
            id : landuseBuilded.id, 
            type : landuseBuilded.type, 
            refNb : 1, 
            buildDatas : landuseBuilded, 
        });
        landuseAdded ++;
    }
    return landuseAdded;
}

function buildLanduse(_landuse, _tile) {
    const trianglesResult = triangulate(_landuse);
    if (trianglesResult === null) return false;
    const layerInfos = getLayerInfos(_landuse.type);
    const elevationsDatas = getElevationsDatas(_landuse);
    const layersBuffers = GEO_BUILDER.buildLanduseGeometry(_landuse, layerInfos, trianglesResult, elevationsDatas, _tile)
    saveLanduseGeometries(_landuse, layersBuffers);
    return true;
}

function saveLanduseGeometries(_landuse, _geometries) {
    const type = _landuse.type;
    if (!typedMeshes.get(type)) {
        const layerInfos = getLayerInfos(type);
        const meshes = new Array(layerInfos.materialNb);
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = new THREE.Mesh(new THREE.BufferGeometry(), LanduseMaterial.material(type)[l]);
            mesh.receiveShadow = true;
            meshes[l] = mesh;
        }
        typedMeshes.set(type, {
            meshes : meshes, 
            list : [], 
        });
    }
    const layerInfos = getLayerInfos(type);
    if (layerInfos.hideTile) {
        searchTilesUnderLanduse(_landuse);
    }
    typedMeshes.get(type).list.push({
        id : _landuse.id, 
        geometries : _geometries, 
    });
}

function searchTilesUnderLanduse(_landuse) {
    const myLanduse = {
        id : _landuse.id, 
        type : _landuse.type, 
        border : _landuse.border, 
        holes : _landuse.holes, 
    };
    const zoom = 13;
    const bbox = calcBbox(_landuse.border);
    const tileA = GEO.coordsToTile(bbox.minLon, bbox.minLat, zoom);
    const tileB = GEO.coordsToTile(bbox.maxLon, bbox.maxLat, zoom);
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            const tile = GLOBE.tileFromXYZ(x, y, zoom);
            if (!tile) continue;
            const map = new Map();
            map.set(_landuse.id, myLanduse);
            // tile.setLanduses(map);
            const extension = tile.extensions.get('LANDUSE');
            if (!extension) continue;
            extension.setLanduses(map);
        }
    }
}

function redrawMeshes() {
    for (let [type, curTyped] of typedMeshes) {
        const layerInfos = getLayerInfos(type);
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = curTyped.meshes[l];
            GLOBE.removeMeshe(mesh);
            mesh.geometry.dispose();
            const datasGeometries = [];
            for (let g = 0; g < curTyped.list.length; g ++) {
                datasGeometries.push(curTyped.list[g].geometries[l]);
            }
            if (!datasGeometries.length) continue;
            mesh.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
            GLOBE.addMeshe(mesh);
        }
    }
    schdeduleNb --;
    Renderer.MUST_RENDER = true;
}

function deleteLanduseGeometry(_id, _type) {
    const curTypedGeos = typedMeshes.get(_type); 
    for (let i = 0; i < curTypedGeos.list.length; i ++) {
        if (curTypedGeos.list[i].id != _id) continue;
        curTypedGeos.list[i].geometries.forEach(geo => geo.dispose());
        curTypedGeos.list.splice(i, 1);
        break;
    }
    if (curTypedGeos.list.length == 0) {
        curTypedGeos.meshes.forEach(mesh => GLOBE.removeMeshe(mesh));
    }
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

function coordGrid(_bbox, _border) {
    const zoom = 15;
    const tileA = GEO.coordsToTile(_bbox.minLon, _bbox.minLat, zoom);
    const tileB = GEO.coordsToTile(_bbox.maxLon, _bbox.maxLat, zoom);
    const tilesPos = [];
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            tilesPos.push([x, y]);
        }
    }
    const grid = [];
    const def = GLOBE.tilesDefinition;
    for (let i = 0; i < tilesPos.length; i ++) {
        const tilePos = tilesPos[i];
        const startCoord = GEO.tileToCoordsVect(tilePos[0], tilePos[1], zoom);
        const endCoord = GEO.tileToCoordsVect(tilePos[0] + 1, tilePos[1] + 1, zoom);
		const stepCoordX = (endCoord.x - startCoord.x) / def;
		const stepCoordY = (endCoord.y - startCoord.y) / def;
		for (let x = 0; x < def; x ++) {
			for (let y = 0; y < def; y ++) {
                const coord = [
					startCoord.x + (stepCoordX * x), 
					startCoord.y + (stepCoordY * y)
				];
                if (pointIntoPolygon(coord, _border)) grid.push(coord);
			}
		}
    }
    return grid;
}

function simplifyLanduse(_landuse) {
    const factor = 0.00001;
    _landuse.border = simplify(_landuse.border, factor, true);
    _landuse.holes = simplify(_landuse.holes, factor, true);
}

function triangulate(_landuse) {
    let nbPoints = 0;
    const border = new Array(_landuse.border.length);
    for (let i = 0; i < _landuse.border.length; i ++) {
        border[i] = new poly2tri.Point(_landuse.border[i][0], _landuse.border[i][1], i + nbPoints);
    }
    try {
        const swctx = new poly2tri.SweepContext(border);
        nbPoints += _landuse.border.length;
        _landuse.holes.forEach(hole => {
            const swcHole = hole.map((p, i) => new poly2tri.Point(p[0], p[1], i + nbPoints));
            swctx.addHole(swcHole);
            nbPoints += hole.length;
        });
        for (let i = 0; i < _landuse.fillPoints.length; i ++) {
            const point = _landuse.fillPoints[i];
            swctx.addPoint(new poly2tri.Point(point[0], point[1], i + nbPoints));
        }
        nbPoints += _landuse.fillPoints.length;
        swctx.triangulate();
        return swctx.getTriangles();
    } catch (error) {
        console.warn('Error on landuse', _landuse.id, error);
        console.log('_landuse', _landuse);
        rejectedIds.push(_landuse.id);
        return null;
    }
}

function getElevationsDatas(_landuse) {
    const elevationsBorder = new Array(_landuse.border.length);
    for (let i = 0; i < _landuse.border.length; i ++) {
        const point = _landuse.border[i];
        elevationsBorder[i] = ElevationStore.get(point[0], point[1]);
    }
    const elevationsHoles = [];
    for (let i = 0; i < _landuse.holes.length; i ++) {
        const hole = _landuse.holes[i];
        const holeElevations = new Array(hole.length);
        for (let h = 0; h < hole.length; h ++) {
            const point = hole[h];
            holeElevations[h] = ElevationStore.get(point[0], point[1]);
        }
        elevationsHoles.push(holeElevations);
    }
    const elevationsFill = new Array(_landuse.fillPoints.length);
    for (let i = 0; i < _landuse.fillPoints.length; i ++) {
        const point = _landuse.fillPoints[i];
        elevationsFill[i] = ElevationStore.get(point[0], point[1]);
    }
    return {
        border : elevationsBorder, 
        holes : elevationsHoles, 
        fill : elevationsFill, 
    }
}

function buildRelation(_relation, _nodesList, _waysList) {
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
    const grid = coordGrid(bbox, border);
    return {
        id : _relation.id, 
        type : extractType(_relation), 
        border : border, 
        fillPoints : grid, 
        holes : innersCoords, 
    };
}

function buildWay(_way, _nodesList) {
    let wayNodes = _way.nodes.map(nodeId => _nodesList.get('NODE_' + nodeId));
    const border = wayNodes.slice(1);
    const bbox = calcBbox(border);
    const grid = coordGrid(bbox, border);
    return {
        id : _way.id, 
        type : extractType(_way), 
        border : border, 
        fillPoints : grid, 
        holes : [], 
    };
}

function isLanduseKnowed(_id) {
    return knowIds.includes(_id);
}

function forgotLanduse(_landuseId) {
    knowIds = knowIds.filter(id => id != _landuseId);
    const toDelete = [];
    for (let [key, values] of tilesUnderLinks) {
        for (let i = 0; i < values.datas.length; i ++) {
            const datas = values.datas[i];
            if (datas.id != _landuseId) continue;
            values.datas.splice(i, 1);
            break;
        }
        if (values.datas.length) continue;
        toDelete.push(key);
        const tile = GLOBE.tileFromXYZ(values.x, values.y, values.z);
        if (!tile) continue;
        console.log('A');
        const extension = tile.extensions.get('LANDUSE');
        extension.removeLanduse(_landuseId);
    }
    for (let i = 0; i < toDelete.length; i ++) {
        tilesUnderLinks.delete(toDelete[i]);
    }
}

function extractElements(_datas, _type, _zoom) {
    return OsmReader.extractElements(_datas, _type)
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
    });
    if (equalsTags[elementType]) return equalsTags[elementType];
	return elementType;
}

function pointIntoPolygon(point, vs) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

function getLayerInfos(_type) {
    let nbLayers = 16;
    let materialNb = 4;
    let uvFactor = 1;
    let meterBetweenLayers = 1.5;
    let groundOffset = 0;
    let hideTile = false;
    let vertexColor = false;

    if (_type == 'forest') {
        meterBetweenLayers = 1;
        nbLayers = 16;
        materialNb = 4;
        uvFactor = 12;
        vertexColor = true;
        hideTile = true;
    }
    if (_type == 'water') {
        meterBetweenLayers = 0.5;
        uvFactor = 2;
        materialNb = 3;
        nbLayers = 3;
        groundOffset = -1;
        // hideTile = true;
    }
    if (_type == 'wetland') {
        meterBetweenLayers = 0.2;
        uvFactor = 3;
        materialNb = 3;
        nbLayers = 6;
        groundOffset = 0.0;
    }
    if (_type == 'grass') {
        meterBetweenLayers = 0.1;
        uvFactor = 3;
        materialNb = 2;
        nbLayers = 8;
    }
    if (_type == 'scrub') {
        meterBetweenLayers = 0.7;
        groundOffset = 0.2;
        uvFactor = 8;
        materialNb = 2;
        nbLayers = 8;
        vertexColor = true;
        hideTile = true;
    }
    if (_type == 'rock') {
        meterBetweenLayers = 0.6;
        // uvFactor = 2;
        uvFactor = 8;
        materialNb = 1;
        nbLayers = 2;
        groundOffset = 1;
    }
    if (_type == 'vineyard') {
        meterBetweenLayers = 0.4;
        uvFactor = 16;
        materialNb = 4;
        nbLayers = 12;
    }
    return {
        meterBetweenLayers : meterBetweenLayers, 
        uvFactor : uvFactor, 
        nbLayers : nbLayers, 
        groundOffset : groundOffset, 
        hideTile : hideTile, 
        materialNb : materialNb, 
        layersByMap : nbLayers / materialNb, 
        vertexColor : vertexColor, 
    }
}

const equalsTags = {
    wood : 'forest', 
    farmyard : 'grass', 
    farmland : 'grass', 
    grassland : 'grass', 
    orchard : 'grass', 
    meadow : 'grass', 
    greenfield : 'grass', 
    village_green : 'grass', 
    bare_rock : 'rock', 
    scree : 'rock', 
    basin : 'water', 
    riverbank : 'water', 
};

const tagsZoom = {
    forest : 13, 
    scrub : 13, 
    vineyard : 16, 
    grass : 17, 
    rock : 13, 
    water : 15, 
    wetland : 15, 
};

const supportedTags = [
    {
        key : 'landuse', 
        values : [
            'forest', 
            'wood', 
            // 'vineyard', 
            'scrub',
            
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

export {api as default};
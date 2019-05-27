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
const typedGeometries = new Map();
let schdeduleNb = 0;

const api = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = OsmReader.extractNodes(parsedJson);
        const waysList = OsmReader.extractWays(parsedJson);
        tileToLanduses.set(_tile.key, []);
        const extractedRelations = extractElements(parsedJson, 'relation', _tile.zoom);
        const extractedWays = extractElements(parsedJson, 'way', _tile.zoom);
        registerDatas(_tile, extractedRelations);
        registerDatas(_tile, extractedWays);
        let landuseAdded = 0;
        landuseAdded += buildLanduse(_tile, extractedRelations, buildRelation, nodesList, waysList);
        landuseAdded += buildLanduse(_tile, extractedWays, buildWay, nodesList, waysList);
        if (landuseAdded > 0) scheduleDraw();
    }, 

    tileRemoved : function(_tile) {
        if (!tileToLanduses.get(_tile.key)) return false;
        tileToLanduses.get(_tile.key)
        .forEach(landuseId => {
            if (!storedLanduses.get('LANDUSE_' + landuseId)) return false;
            const stored = storedLanduses.get('LANDUSE_' + landuseId);
            stored.refNb --;
            if (stored.refNb <= 0) {
                forgotLanduse(landuseId);
                deleteLanduseGeometry(stored.id, stored.type);
                storedLanduses.delete('LANDUSE_' + landuseId);
            }
        });
        tileToLanduses.delete(_tile.key);
        scheduleDraw();
    }
};

function registerDatas(_tile, _extractedDatas) {
    const curTileLinks = tileToLanduses.get(_tile.key);
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuse = _extractedDatas[i];
        curTileLinks.push(landuse.id);
        if (!isLanduseKnowed(landuse.id)) continue;
        storedLanduses.get('LANDUSE_' + landuse.id).refNb ++;
    }
}

function buildLanduse(_tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    let landuseAdded = 0;
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuseDatas = _extractedDatas[i];
        if (isLanduseKnowed(landuseDatas.id)) continue;
        knowIds.push(landuseDatas.id);
        const landuseBuilded = _buildFunction(landuseDatas, _nodesList, _waysList);
        storedLanduses.set('LANDUSE_' + landuseBuilded.id, {
            id : landuseBuilded.id, 
            type : landuseBuilded.type, 
            refNb : 1
        });
        simplifyLanduse(landuseBuilded);
        drawLanduse(landuseBuilded, _tile);
        landuseAdded ++;
    }
    return landuseAdded;
}


function scheduleDraw() {
    if (schdeduleNb > 0) return false;
    schdeduleNb ++;
    setTimeout(redrawMeshes, 1000);
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

function getLayerInfos(_type) {
    let nbLayers = 16;
    let materialNb = 4;
    let uvFactor = 1;
    let meterBetweenLayers = 1.5;
    let groundOffset = 0;

    if (_type == 'forest') {
        meterBetweenLayers = 1;
        uvFactor = 3;
    }
    if (_type == 'grass') {
        meterBetweenLayers = 0.1;
        uvFactor = 3;
        materialNb = 2;
        nbLayers = 8;
    }
    if (_type == 'scrub') {
        meterBetweenLayers = 0.6;
        uvFactor = 2;
        materialNb = 3;
        nbLayers = 9;
    }
    if (_type == 'rock') {
        meterBetweenLayers = 0.6;
        uvFactor = 2;
        materialNb = 1;
        nbLayers = 1;
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
        materialNb : materialNb, 
        layersByMap : nbLayers / materialNb, 
    }
}

function simplifyLanduse(_landuse) {
    const factor = 0.00001;
    _landuse.border = simplify(_landuse.border, factor, true);
    _landuse.holes = simplify(_landuse.holes, factor, true);
}

function drawLanduse(_landuse, _tile) {
    const trianglesResult = triangulate(_landuse);
    if (trianglesResult === null) return false;
    const layerInfos = getLayerInfos(_landuse.type);
    const elevationsDatas = getElevationsDatas(_landuse);
    const layersBuffers = GEO_BUILDER.buildLanduseGeometry(_landuse, layerInfos, trianglesResult, elevationsDatas, _tile)
    saveLanduseGeometries(_landuse.id, layersBuffers, _landuse.type);
}

function redrawMeshes() {
    typedGeometries.forEach((curTypedGeos, type) => {
        const layerInfos = getLayerInfos(type);
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = curTypedGeos.meshes[l];
            mesh.geometry.dispose();
            const datasGeometries = curTypedGeos.list.map(data => data.geometries[l]);
            if (datasGeometries.length == 0) continue;
            mesh.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
            GLOBE.addMeshe(mesh);
        }
    });
    schdeduleNb --;
    Renderer.MUST_RENDER = true;
}

function saveLanduseGeometries(_id, _geometries, _type) {
    if (!typedGeometries.get(_type)) {
        const layerInfos = getLayerInfos(_type);
        const meshes = [];
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = new THREE.Mesh(new THREE.BufferGeometry(), LanduseMaterial.material(_type)[l]);
            mesh.receiveShadow = true;
            meshes.push(mesh);
        }
        typedGeometries.set(_type, {
            meshes : meshes, 
            list : [], 
        });
    }
    typedGeometries.get(_type).list.push({
        id : _id, 
        geometries : _geometries, 
    });
}

function deleteLanduseGeometry(_id, _type) {
    const curTypedGeos = typedGeometries.get(_type); 
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

function triangulate(_landuse) {
    let nbPoints = 0;
    const border = [];
    for (let i = 0; i < _landuse.border.length; i ++) {
        border.push(new poly2tri.Point(_landuse.border[i][0], _landuse.border[i][1], i + nbPoints));
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
        return null;
    }
}

function getElevationsDatas(_landuse) {

    const elevationsBorder = [];
    for (let i = 0; i < _landuse.border.length; i ++) {
        const point = _landuse.border[i];
        elevationsBorder.push(ElevationStore.get(point[0], point[1]));
    }
    const elevationsHoles = [];
    for (let i = 0; i < _landuse.holes.length; i ++) {
        const hole = _landuse.holes[i];
        const holeElevations = [];
        for (let h = 0; h < hole.length; h ++) {
            const point = hole[i];
            holeElevations.push(ElevationStore.get(point[0], point[1]));
        }
        elevationsHoles.push(holeElevations);
    }
    const elevationsFill = [];
    for (let i = 0; i < _landuse.fillPoints.length; i ++) {
        const point = _landuse.fillPoints[i];
        elevationsFill.push(ElevationStore.get(point[0], point[1]));
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

function forgotLanduse(_id) {
    knowIds = knowIds.filter(id => id != _id);
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
    })
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
};

const tagsZoom = {
    forest : 15, 
    scrub : 15, 
    vineyard : 16, 
    grass : 17, 
    rock : 15, 
};

const supportedTags = [
    {
        key : 'landuse', 
        values : [
            'vineyard', 
            'forest', 
            'scrub', 
            
            'wood', 
            'grass', 
            'farmyard', 
            'farmland', 
            'grassland', 
            'orchard', 
            'meadow', 
            'greenfield', 
            'village_green', 
        ]
    }, 
    {
        key : 'natural', 
        values : [
            'vineyard', 
            'forest', 
            'wood', 
            'scrub', 
            'bare_rock', 
            
            'scree', 
            'grass', 
            'farmyard', 
            'farmland', 
            'grassland', 
            'orchard', 
            'meadow', 
            'greenfield', 
            'village_green', 
        ], 
    }, 
];

export {api as default};
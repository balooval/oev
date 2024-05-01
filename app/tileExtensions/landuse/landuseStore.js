import {
    BufferAttribute,
    BufferGeometry,
    Color,
    DoubleSide,
    InstancedMesh,
    Matrix4,
    Mesh,
    MeshPhysicalMaterial,
    MeshBasicMaterial,
    Quaternion,
    Vector3,
    PlaneGeometry,
} from '../../vendor/three.module.js';
import * as NET_MODELS from '../../net/models.js';
import * as NET_TEXTURES from '../../net/textures.js';
import * as BufferGeometryUtils from '../../vendor/BufferGeometryUtils.module.js';
import * as Poly2Tri from '../../vendor/poly2tri.module.js';
import Renderer from '../../core/renderer.js';
import GLOBE from '../../core/globe.js';
import GEO from '../../core/geo.js';
import OsmReader from '../../utils/osmReader.js';
import ElevationStore from '../elevation/elevationStore.js';
import OEV from '../../app.js';
import MATH from '../../core/math.js';

let knowIds = [];
const tileToLanduses = new Map();
const storedLanduses = new Map();
const typedMeshes = new Map();
let scheduleNb = 0;
const rejectedIds = [];
const tilesUnderLinks = new Map();

const rotationVector = new Vector3(0, 1, 0);
const instanceMeshByTiles = new Map();

const instanceGeometries = new Map();
const instancePlacement = new Map();
instancePlacement.set('forest', placeForest);
instancePlacement.set('sapin', placeForest);
instancePlacement.set('scrub', placeScrub);
instancePlacement.set('vineyard', placeVineyard);

const instanceGeneric = new MeshPhysicalMaterial({
    color: 0xffffff,
    side: DoubleSide,
    vertexColors: true,
});

const instanceMaterialVigne = new MeshPhysicalMaterial({
    color: 0xffffff,
    side: DoubleSide,
    vertexColors: false,
});

const instanceMaterialForest = new MeshPhysicalMaterial({
    color: 0xffffff,
    side: DoubleSide,
    vertexColors: false,
    roughness: 0.5,
});
const instanceMaterialSapin = new MeshPhysicalMaterial({
    color: 0xffffff,
    side: DoubleSide,
    vertexColors: false,
    roughness: 0.6,
});
const instanceMaterial = new Map();
instanceMaterial.set('forest', instanceMaterialForest);
instanceMaterial.set('sapin', instanceMaterialSapin);
instanceMaterial.set('scrub', instanceGeneric);
instanceMaterial.set('vineyard', instanceMaterialVigne);

const api = {
    init: function() {
        instanceGeometries.set('forest', createInstanceGeometryForest());
        instanceGeometries.set('sapin', createInstanceGeometryForestSapin());
        instanceGeometries.set('scrub', createInstanceGeometryScrub());
        instanceGeometries.set('vineyard', createInstanceGeometryVineyard());

        instanceMaterial.get('forest').map = NET_TEXTURES.texture('tree-forest');
        instanceMaterial.get('sapin').map = NET_TEXTURES.texture('tree-forest-sapin');
        instanceMaterial.get('vineyard').map = NET_TEXTURES.texture('vigne');
    },

    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = OsmReader.extractNodes(parsedJson);
        const waysList = OsmReader.extractWays(parsedJson);
        tileToLanduses.set(_tile.key, []);
        const extractedRelations = extractElements(parsedJson, 'relation', _tile.zoom);
        const extractedWays = extractElements(parsedJson, 'way', _tile.zoom);
        prepareLanduse(_tile, extractedRelations, buildRelation, nodesList, waysList);
        prepareLanduse(_tile, extractedWays, buildWay, nodesList, waysList);
    }, 

    tileRemoved : function(_tileKey, tile) {
        const instancedTile = instanceMeshByTiles.get(tile);
        if (instancedTile) {
            for (const [key, instanceMesh] of instancedTile.entries()) {
                GLOBE.removeMeshe(instanceMesh);
                instanceMesh.geometry.dispose();
                instanceMeshByTiles.delete(tile);
            }
        }
    }
};

function prepareLanduse(_tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    const tileFilter = [
        '4188_2983_13',
        '4189_2983_13',
    ];
    // if (tileFilter.includes(_tile.key) === false) { // Vers Primes Combes
    //     return 0;
    // }

    let landuseAdded = 0;
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
        if (!buildLanduse(landuseBuilded, _tile)) {
            console.log('landuseDatas', landuseDatas);
            continue;
        }
        
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
    let type = _landuse.type;
    
    if (type === 'forest') {
        // console.log('_landuse', _landuse.tags);
        if (_landuse.tags.leaf_type === 'needleleaved') {
            // instanceGeometry = instanceGeometries.get('sapin');
            type = 'sapin';
        }
    }
        
    const instanceGeometry = instanceGeometries.get(type);

    if (!instanceGeometry) {
        console.log('type', type);
        return;
    }

    let instancedTile = instanceMeshByTiles.get(_tile);
    
    if (instancedTile === undefined) {
        instanceMeshByTiles.set(_tile, new Map());
    }
    
    let instancedTileMeshes = instanceMeshByTiles.get(_tile);
    let instancedMesh = instancedTileMeshes.get(type);

    if (instancedMesh === undefined) {
        instancedMesh = new InstancedMesh(instanceGeometry, instanceMaterial.get(type), 50000);
        instancedMesh.receiveShadow = true;
		instancedMesh.castShadow = true;
        instancedMesh.count = 0;
        GLOBE.addMeshe(instancedMesh);

        instancedTileMeshes.set(type, instancedMesh);
    }

    const countOffset = instancedMesh.count;
    // instancedMesh.count += _landuse.fillPoints.length;

    const elevationsDatas = getElevationsDatas(_landuse);
    
    const placementFunction = instancePlacement.get(type);
    placementFunction(instancedMesh, countOffset, _landuse, elevationsDatas.fill);

    return true;
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
            if (pointIntoPolygon(coord, _border) === false) {
                continue;
            }
            grid.push(coord);
        }
    }

    return grid;
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
    return {
        id : _relation.id, 
        type : extractType(_relation), 
        tags : _relation.tags, 
        border : border, 
        fillPoints : grid, 
        holes : innersCoords, 
    };
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

function isTagSupported(_element, _zoom) {
    const type = extractType(_element);
    if (!type) return false;
    if (_zoom != tagsZoom[type]) return false;
	return true;
}

function extractType(_element) {
    let elementType = null;
    // console.log('_element.tags', _element.tags); // leaf_type = broadleaved
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
            'vineyard', 
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

function createInstanceGeometryForestSapin() {
    const geometry = NET_MODELS.get('tree-forest-sapin').clone();
    const scale = 0.05;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryForest() {
    const geometry = NET_MODELS.get('tree-forest').clone();
    const scale = 0.05;
    geometry.scale(scale, scale, scale);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.2, 0);
    return geometry;
}

function createInstanceGeometryScrub() {
    const vertPos = [];
    const vertexColors = [];

    const innerWidth = 0.1;
    const outerWidth = 0.2;
    const innerHeight = -0.1;
    const outerHeight = -0.2;

    const colorBase = new Color('hsl(46, 15%, 33%)');
    const colorTip = new Color('hsl(46, 21%, 51%)');
    const colorGreen = new Color('hsl(100, 30%, 51%)');

    const spikeCount = 6;
    const angleStep = (Math.PI * 2) / spikeCount;

    for (let i = 0; i < spikeCount; i ++) {
        const curAngle = angleStep * i;
        const nextAngle = angleStep * (i + 1);
        const midAngle = angleStep * (i + 0.5);

        vertPos.push(
            0, 0, 0,
            Math.cos(curAngle) * innerWidth, innerHeight, Math.sin(curAngle) * innerWidth,
            Math.cos(nextAngle) * innerWidth, innerHeight, Math.sin(nextAngle) * innerWidth,

            Math.cos(nextAngle) * innerWidth, innerHeight, Math.sin(nextAngle) * innerWidth,
            Math.cos(curAngle) * innerWidth, innerHeight, Math.sin(curAngle) * innerWidth,
            Math.cos(midAngle) * outerWidth, outerHeight, Math.sin(midAngle) * outerWidth,

            Math.cos(nextAngle) * innerWidth, 0, Math.sin(nextAngle) * innerWidth,
            Math.cos(curAngle) * innerWidth, 0, Math.sin(curAngle) * innerWidth,
            Math.cos(midAngle) * outerWidth * 2, innerHeight, Math.sin(midAngle) * outerWidth * 2,
        );

        vertexColors.push(
            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            
            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            colorGreen.r, colorGreen.g, colorGreen.b,

            colorBase.r, colorBase.g, colorBase.b,
            colorBase.r, colorBase.g, colorBase.b,
            colorTip.r, colorTip.g, colorTip.b,
        );
    }


    const leafGeometry = new BufferGeometry();
    leafGeometry.setAttribute('position', new BufferAttribute(new Float32Array(vertPos), 3));
    leafGeometry.setAttribute('color', new BufferAttribute(new Float32Array(vertexColors), 3));
    leafGeometry.computeBoundingBox();
    leafGeometry.computeBoundingSphere();
    leafGeometry.computeVertexNormals();
    return leafGeometry;
}

function createInstanceGeometryVineyard() {
    const geometry = NET_MODELS.get('vigne').clone();
    const scale = -0.02;
    geometry.scale(scale, scale, scale)
    return geometry;
}

function placeForest(instancedMesh, countOffset, landuseData, elevationsDatas) {

    const scale = new Vector3(1, 1, 1);
    const quaternion = new Quaternion();
    const matrix = new Matrix4();

    let instanceIndex = countOffset;

    for (let i = 0; i < landuseData.fillPoints.length - 1; i++) {
        for (let j = 0; j < 1; j += 0.5) {
            const point = MATH.lerpPoint(landuseData.fillPoints[i], landuseData.fillPoints[i + 1], j);
            
            const vertPos = GLOBE.coordToXYZ(
                point[0] + Math.random() * 0.0004,
                point[1] + Math.random() * 0.0001,
                elevationsDatas[i],
            );

            const scaleValue = 0.7 + Math.random() * 0.2;
            scale.set(scaleValue, scaleValue, scaleValue);
            
            const angle = Math.random() * 6;
            quaternion.setFromAxisAngle(rotationVector, angle);

            matrix.compose(vertPos, quaternion, scale);
            instancedMesh.setMatrixAt(instanceIndex, matrix);
            instanceIndex ++;
        }
    }
    instancedMesh.count += landuseData.fillPoints.length * 2;
}

function placeScrub(instancedMesh, countOffset, landuseData, elevationsDatas) {
    const scale = new Vector3(1, 1, 1);
    const quaternion = new Quaternion();
    const matrix = new Matrix4();

    for (let i = 0; i < landuseData.fillPoints.length; i++) {
        const vertPos = GLOBE.coordToXYZ(
            landuseData.fillPoints[i][0] + Math.random() * 0.0004,
            landuseData.fillPoints[i][1] + Math.random() * 0.0001,
            elevationsDatas[i],
        );

        const scaleValue = 0.7 + Math.random() * 0.5;
        scale.set(scaleValue, scaleValue, scaleValue);

        const angle = Math.random() * 6;
        quaternion.setFromAxisAngle(rotationVector, angle);

        matrix.compose(vertPos, quaternion, scale);
        instancedMesh.setMatrixAt(countOffset + i, matrix);
    }
    instancedMesh.count += landuseData.fillPoints.length;
    instancedMesh.instanceMatrix.needsUpdate = true;
}

function placeVineyard(instancedMesh, countOffset, landuseData, elevationsDatas) {
    const scale = new Vector3(1, 1, 1);
    const quaternion = new Quaternion();
    const matrix = new Matrix4();
    const angle = Math.random() * 6;
    // const angle = 0;
    const scaleValue = 0.4 + Math.random() * 0.1;
    // const scaleValue = 1;
    let instanceIndex = countOffset;

    for (let i = 0; i < landuseData.fillPoints.length - 1; i++) {
        const point = landuseData.fillPoints[i];
        
        const vertPos = GLOBE.coordToXYZ(
            point[0],
            point[1],
            elevationsDatas[i],
        );

        scale.set(scaleValue, scaleValue, scaleValue);
        
        quaternion.setFromAxisAngle(rotationVector, angle);

        matrix.compose(vertPos, quaternion, scale);
        instancedMesh.setMatrixAt(instanceIndex, matrix);
        instanceIndex ++;
    }
    instancedMesh.count += landuseData.fillPoints.length;
    instancedMesh.instanceMatrix.needsUpdate = true;
}


export {api as default};
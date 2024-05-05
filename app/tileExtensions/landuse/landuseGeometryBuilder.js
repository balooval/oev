import {
    Color,
    InstancedMesh,
    Matrix4,
    Quaternion,
    Vector3,
} from '../../vendor/three.module.js';
import * as LanduseMaterial from './landuseMaterial.js';
import GLOBE from '../../core/globe.js';
import OsmReader from '../../utils/osmReader.js';
import ElevationStore from '../elevation/elevationStore.js';
import MATH from '../../core/math.js';
import Renderer from '../../core/renderer.js';

const rejectedIds = [];

const instancePosition = new Vector3(0, 0, 0);
const instanceScale = new Vector3(1, 1, 1);
const instanceQuaternion = new Quaternion();
const instanceMatrix = new Matrix4();

const rotationVector = new Vector3(0, 1, 0);
const instanceMeshByTiles = new Map();

const instancePlacement = new Map();
instancePlacement.set('forest', placeForest);
instancePlacement.set('sapin', placeForest);
instancePlacement.set('scrub', placeScrub);
instancePlacement.set('vineyard', placeVineyard);

export function setDatas(_json, _tile) {
    const parsedJson = JSON.parse(_json);
    const nodesList = OsmReader.extractNodes(parsedJson);
    const waysList = OsmReader.extractWays(parsedJson);
    const extractedRelations = extractElements(parsedJson, 'relation', _tile.zoom);
    const extractedWays = extractElements(parsedJson, 'way', _tile.zoom);
    prepareLanduse(_tile, extractedRelations, buildRelation, nodesList, waysList);
    prepareLanduse(_tile, extractedWays, buildWay, nodesList, waysList);
}

export function tileRemoved(_tileKey, tile) {
    const instancedTile = instanceMeshByTiles.get(tile);
    if (instancedTile) {
        for (const [key, instanceMesh] of instancedTile.entries()) {
            GLOBE.removeMeshe(instanceMesh);
            instanceMesh.geometry.dispose();
            instanceMeshByTiles.delete(tile);
        }
    }
}

function prepareLanduse(_tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    const tileFilter = [
        '4188_2983_13',
        '4189_2983_13',
    ];
    // if (tileFilter.includes(_tile.key) === false) { // Vers Primes Combes
    //     return 0;
    // }

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
            continue;
        }
    }

    Renderer.MUST_RENDER = true;
}

function buildLanduse(_landuse, tile) {
    let type = _landuse.type;
    
    if (type === 'forest') {
        if (_landuse.tags.leaf_type === 'needleleaved') {
            type = 'sapin';
        }
    }
        
    let instancedMesh = getTileMeshForLanduseType(tile, type);
    if (instancedMesh === null) {
        console.log('unsupported type', type);
        return;
    }
    
    const countOffset = instancedMesh.count;
    const elevationsDatas = getElevationsDatas(_landuse);
    const placementFunction = instancePlacement.get(type);
    placementFunction(instancedMesh, countOffset, _landuse, elevationsDatas);

    return true;
}

function getTileMeshForLanduseType(tile, type) {
    const instanceGeometry = LanduseMaterial.getGeometryForType(type);
    if (!instanceGeometry) {
        return null;
    }

    let instancedTile = instanceMeshByTiles.get(tile);
    
    if (instancedTile === undefined) {
        instanceMeshByTiles.set(tile, new Map());
    }
    
    let instancedTileMeshes = instanceMeshByTiles.get(tile);
    let instancedMesh = instancedTileMeshes.get(type);

    if (instancedMesh === undefined) {
        instancedMesh = new InstancedMesh(instanceGeometry, LanduseMaterial.getMaterialForType(type), 50000);
        instancedMesh.receiveShadow = true;
		instancedMesh.castShadow = true;
        instancedMesh.count = 0;
        GLOBE.addMeshe(instancedMesh);

        instancedTileMeshes.set(type, instancedMesh);
    }

    return instancedMesh;
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

function getElevationsDatas(_landuse) {
    const elevationsFill = new Array(_landuse.fillPoints.length);
    for (let i = 0; i < _landuse.fillPoints.length; i ++) {
        const point = _landuse.fillPoints[i];
        elevationsFill[i] = ElevationStore.get(point[0], point[1]);
    }
    
    return elevationsFill;
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

function placeForest(instancedMesh, countOffset, landuseData, elevationsDatas) {
    const color = new Color(1, 1, 1);

    let instanceIndex = countOffset;

    for (let i = 0; i < landuseData.fillPoints.length - 1; i++) {
        for (let j = 0; j < 1; j += 0.5) {
            const point = MATH.lerpPoint(landuseData.fillPoints[i], landuseData.fillPoints[i + 1], j);
            
            const vertPos = GLOBE.coordToXYZ(
                point[0] + Math.random() * 0.0003,
                point[1],
                elevationsDatas[i],
            );

            instancePosition.set(vertPos[0], vertPos[1], vertPos[2])

            const scaleValue = 0.7 + Math.random() * 0.2;
            instanceScale.set(scaleValue, scaleValue, scaleValue);
            
            const angle = Math.random() * 6;
            instanceQuaternion.setFromAxisAngle(rotationVector, angle);

            instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
            instancedMesh.setMatrixAt(instanceIndex, instanceMatrix);

            color.setHSL(0.2, MATH.random(0.5, 0.8), MATH.random(0.3, 0.7));
            instancedMesh.setColorAt(instanceIndex, color);
            instanceIndex ++;
        }
    }
    instancedMesh.count += landuseData.fillPoints.length * 2;
}

function placeScrub(instancedMesh, countOffset, landuseData, elevationsDatas) {
    for (let i = 0; i < landuseData.fillPoints.length; i++) {
        const vertPos = GLOBE.coordToXYZ(
            landuseData.fillPoints[i][0] + Math.random() * 0.0004,
            landuseData.fillPoints[i][1] + Math.random() * 0.0001,
            elevationsDatas[i],
        );

        instancePosition.set(vertPos[0], vertPos[1], vertPos[2])

        const scaleValue = 0.7 + Math.random() * 0.5;
        instanceScale.set(scaleValue, scaleValue, scaleValue);

        const angle = Math.random() * 6;
        instanceQuaternion.setFromAxisAngle(rotationVector, angle);

        instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
        instancedMesh.setMatrixAt(countOffset + i, instanceMatrix);
    }
    instancedMesh.count += landuseData.fillPoints.length;
    instancedMesh.instanceMatrix.needsUpdate = true;
}

function placeVineyard(instancedMesh, countOffset, landuseData, elevationsDatas) {
    const angle = Math.random() * 6;
    const scaleValue = 0.4 + Math.random() * 0.1;
    let instanceIndex = countOffset;

    for (let i = 0; i < landuseData.fillPoints.length - 1; i++) {
        const point = landuseData.fillPoints[i];
        
        const vertPos = GLOBE.coordToXYZ(
            point[0],
            point[1],
            elevationsDatas[i],
        );

        instancePosition.set(vertPos[0], vertPos[1], vertPos[2])

        instanceScale.set(scaleValue, scaleValue, scaleValue);
        instanceQuaternion.setFromAxisAngle(rotationVector, angle);
        instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
        instancedMesh.setMatrixAt(instanceIndex, instanceMatrix);
        instanceIndex ++;
    }
    instancedMesh.count += landuseData.fillPoints.length;
    instancedMesh.instanceMatrix.needsUpdate = true;
}
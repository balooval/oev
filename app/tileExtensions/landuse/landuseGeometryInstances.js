import {
    Color,
    InstancedMesh,
    Matrix4,
    Quaternion,
    Vector3,
} from 'three';
import * as LanduseMaterial from './landuseMaterial.js';
import {GLOBE} from '../../core/globe.js';
import * as OsmReader from '../../utils/osmReader.js';
import * as ElevationStore from '../elevation/elevationStore.js';
import * as MATH from '../../core/math.js';
import Renderer from '../../core/renderer.js';

const rejectedIds = [];
const MAX_COUNT_BY_INSTANCE = 43000;

let maxInstancedMeshCount = 0;

const instancePosition = new Vector3(0, 0, 0);
const instanceScale = new Vector3(1, 1, 1);
const instanceQuaternion = new Quaternion();
const instanceMatrix = new Matrix4();
const instanceColor = new Color(1, 1, 1);

const rotationVector = new Vector3(0, 1, 0);
const instanceMeshByTiles = new Map();

const instancePlacement = new Map();
instancePlacement.set('forest', placeForest);
instancePlacement.set('sapin', placeForest);
instancePlacement.set('scrub', placeScrub);
instancePlacement.set('vineyard', placeVineyard);

export function initMaterials() {
    
}

export function setDatas(landusesDatas, _tile) {
    for (let i = 0; i < landusesDatas.length; i ++) {
        buildLanduse(landusesDatas[i], _tile);
        Renderer.MUST_RENDER = true;
    }
}

export function tileShow(tile) {
    const instancedTile = instanceMeshByTiles.get(tile);

    if (instancedTile === undefined) {
        return;
    }

    for (const instanceMesh of instancedTile.values()) {
        GLOBE.addMeshe(instanceMesh);
    }
}

export function tileHide(tile) {
    const instancedTile = instanceMeshByTiles.get(tile);

    if (instancedTile === undefined) {
        return;
    }

    for (const instanceMesh of instancedTile.values()) {
        GLOBE.removeMeshe(instanceMesh);
    }
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

export function setLod(tile, lod) {
    const instancedTile = instanceMeshByTiles.get(tile);
    if (!instancedTile) {
        return;
    }
    
    for (const [key, instanceMesh] of instancedTile.entries()) {
        let typeToAsk = key;
        if (lod === 0) {
            typeToAsk = key + '-0';
        }
        instanceMesh.geometry = LanduseMaterial.getGeometryForType(typeToAsk);
    }
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
        instancedMesh = new InstancedMesh(instanceGeometry, LanduseMaterial.getMaterialForType(type), MAX_COUNT_BY_INSTANCE);
        instancedMesh.receiveShadow = true;
		instancedMesh.castShadow = true;
        instancedMesh.count = 0;
        instancedMesh.matrixAutoUpdate = false;
        GLOBE.addMeshe(instancedMesh);

        instancedTileMeshes.set(type, instancedMesh);
    }

    return instancedMesh;
}

function getElevationsDatas(_landuse) {
    const elevationsFill = new Array(_landuse.fillPoints.length);
    for (let i = 0; i < _landuse.fillPoints.length; i ++) {
        const point = _landuse.fillPoints[i];
        elevationsFill[i] = ElevationStore.get(point[0], point[1]);
    }
    
    return elevationsFill;
}

function placeForest(instancedMesh, countOffset, landuseData, elevationsDatas) {
    let instanceIndex = countOffset;
    const instanceByPoint = 1;

    for (let i = 0; i < landuseData.fillPoints.length - 1; i++) {
        for (let j = 0; j < instanceByPoint; j ++) {
            const point = MATH.lerpPoint(landuseData.fillPoints[i], landuseData.fillPoints[i + 1], j);
            const elevation = MATH.lerpFloat(elevationsDatas[i], elevationsDatas[i + 1], j);
            
            const vertPos = GLOBE.coordToXYZ(
                point[0] + Math.random() * 0.0003,
                point[1] + Math.random() * 0.0002,
                elevation,
            );

            instancePosition.set(vertPos[0], vertPos[1], vertPos[2]);

            const scaleValue = 0.7 + Math.random() * 0.2;
            instanceScale.set(scaleValue, scaleValue, scaleValue);
            
            const angle = Math.random() * 6;
            instanceQuaternion.setFromAxisAngle(rotationVector, angle);

            instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
            instancedMesh.setMatrixAt(instanceIndex, instanceMatrix);

            instanceColor.setHSL(0.2, MATH.random(0.5, 0.8), MATH.random(0.3, 0.7));
            instancedMesh.setColorAt(instanceIndex, instanceColor);
            instanceIndex ++;
        }
    }

    instancedMesh.count += landuseData.fillPoints.length * 2;

    maxInstancedMeshCount = Math.max(maxInstancedMeshCount, instancedMesh.count);
}

function placeScrub(instancedMesh, countOffset, landuseData, elevationsDatas) {
    let instanceIndex = countOffset;

    for (let i = 0; i < landuseData.fillPoints.length - 1; i++) {
        for (let j = 0; j < 1; j += 0.5) {
            const point = MATH.lerpPoint(landuseData.fillPoints[i], landuseData.fillPoints[i + 1], j);
            const elevation = MATH.lerpFloat(elevationsDatas[i], elevationsDatas[i + 1], j);
            
            const vertPos = GLOBE.coordToXYZ(
                point[0] + Math.random() * 0.0003,
                point[1],
                elevation,
            );

            instancePosition.set(vertPos[0], vertPos[1], vertPos[2])

            const scaleValue = 0.7 + Math.random() * 0.5;
            instanceScale.set(scaleValue, scaleValue, scaleValue);

            const angle = Math.random() * 6;
            instanceQuaternion.setFromAxisAngle(rotationVector, angle);

            instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
            instancedMesh.setMatrixAt(instanceIndex, instanceMatrix);

            instanceIndex ++
        }
    }
    instancedMesh.count += landuseData.fillPoints.length * 2;
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
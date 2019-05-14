import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import GEO from '../../utils/geo.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as NET_TEXTURES from '../../net/NetTextures.js';
import * as Simplify from '../../../libs/simplify.js';

let knowIds = [];
const tileToLanduses = {};
let storedLanduses = {};
const typedGeometries = {};
let schdeduleNb = 0;

const api = {
    setDatas : function(_json, _tile) {
        initTextures();
        const parsedJson = JSON.parse(_json);
        const nodesList = extractNodes(parsedJson);
        const waysList = extractWays(parsedJson);
        tileToLanduses[_tile.key] = [];
        
        const extractedRelations = extractElements(parsedJson, 'relation');
        const extractedWays = extractElements(parsedJson, 'way');
        registerDatas(_tile, extractedRelations);
        registerDatas(_tile, extractedWays);
        
        let landuseAdded = 0;
        landuseAdded += buildLanduse(_tile, extractedRelations, buildRelation, nodesList, waysList);
        landuseAdded += buildLanduse(_tile, extractedWays, buildWay, nodesList, waysList);
        if (landuseAdded > 0) scheduleDraw();
    }, 

    tileRemoved : function(_tile) {
        if (!tileToLanduses[_tile.key]) return false;
        tileToLanduses[_tile.key]
        .forEach(landuseId => {
            if (!storedLanduses['LANDUSE_' + landuseId]) return false;
            const stored = storedLanduses['LANDUSE_' + landuseId];
            stored.refNb --;
            if (stored.refNb <= 0) {
                forgotLanduse(landuseId);
                deleteLanduseGeometry(stored.id, stored.type);
                delete storedLanduses['LANDUSE_' + landuseId];
            }
        });
        delete tileToLanduses[_tile.key];
        scheduleDraw();
    }
};

function registerDatas(_tile, _extractedDatas) {
    _extractedDatas
    .filter(landuse => isLanduseKnowed(landuse.id))
    .forEach(landuse => {
        storedLanduses['LANDUSE_' + landuse.id].refNb ++;
    });
    tileToLanduses[_tile.key].push(..._extractedDatas.map(landuse => landuse.id));
}

function buildLanduse(_tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    let landuseAdded = 0;
    _extractedDatas
    .filter(way => !isLanduseKnowed(way.id))
    .forEach(landuseDatas => {
        knowIds.push(landuseDatas.id);
        const landuseBuilded = _buildFunction(landuseDatas, _nodesList, _waysList);
        storedLanduses['LANDUSE_' + landuseBuilded.id] = {
            id : landuseBuilded.id, 
            type : landuseBuilded.type, 
            refNb : 1
        };
        simplifyLanduse(landuseBuilded);
        drawLanduse(landuseBuilded, _tile);
        landuseAdded ++;
    });
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
    tilesPos.forEach(tilePos => {
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
    });
    return grid;
}

function getLayerInfos(_type) {
    let nbLayers = 16;
    let materialNb = 4;
    let uvFactor = 1;
    let meterBetweenLayers = 1.5;

    if (_type == 'forest') {
        meterBetweenLayers = 1;
        uvFactor = 3;
    }
    if (_type == 'grass') {
        meterBetweenLayers = 0.4;
        uvFactor = 2;
        materialNb = 2;
        nbLayers = 8;
    }
    if (_type == 'scrub') {
        meterBetweenLayers = 0.8;
        uvFactor = 2;
        materialNb = 3;
        nbLayers = 9;
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
        groundOffset : 1, 
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
    let lastMaterialLayer = 0;
    let layersBuffers = [];
    let curLayerBuffersGeos = [];
    const layerInfos = getLayerInfos(_landuse.type);
    const trianglesResult = triangulate(_landuse);
    if (trianglesResult === null) return false;
    const elevationsDatas = getElevationsDatas(_landuse);

    for (let layer = 0; layer < layerInfos.nbLayers; layer ++) {
        const geometry = new THREE.Geometry();
        const uvDatas = [];
        const layerGroundElevation = layerInfos.groundOffset + (layer * layerInfos.meterBetweenLayers);
        geometry.faceVertexUvs[0] = [];
        _landuse.border.forEach((point, i) => {
            const vertPos = GLOBE.coordToXYZ(
                point[0], 
                point[1], 
                layerGroundElevation + elevationsDatas.border[i]
            );
            geometry.vertices.push(vertPos);
            let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
            let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
            uvDatas.push(new THREE.Vector2(uvX * layerInfos.uvFactor, uvY * layerInfos.uvFactor));
        });
        _landuse.holes.forEach((hole, h) => {
            hole.forEach((point, i) => {
                const vertPos = GLOBE.coordToXYZ(
                    point[0], 
                    point[1], 
                    layerGroundElevation + elevationsDatas.holes[h][i]
                );
                geometry.vertices.push(vertPos);
                let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
                let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
                uvDatas.push(new THREE.Vector2(uvX * layerInfos.uvFactor, uvY * layerInfos.uvFactor));
            });
        });
        _landuse.fillPoints.forEach((point, i) => {
            const vertPos = GLOBE.coordToXYZ(
                point[0], 
                point[1], 
                layerGroundElevation + elevationsDatas.fill[i]
            );
            geometry.vertices.push(vertPos);
            let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
            let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
            uvDatas.push(new THREE.Vector2(uvX * layerInfos.uvFactor, uvY * layerInfos.uvFactor));
        });
        
        trianglesResult.forEach(t => {
            const points = t.getPoints();
            geometry.faceVertexUvs[0].push([
                uvDatas[points[0].id], 
                uvDatas[points[1].id], 
                uvDatas[points[2].id], 
            ]);
            geometry.faces.push(new THREE.Face3(points[0].id, points[1].id, points[2].id));
        });
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        const curLayerMap = Math.floor(layer / layerInfos.layersByMap);
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
            layersBuffers.push(mergedLayersBuffer);
            curLayerBuffersGeos = [];
        }
        const curBufferGeo = new THREE.BufferGeometry().fromGeometry(geometry);
        curLayerBuffersGeos.push(curBufferGeo);
    }
    const mergedLayersBuffer = THREE.BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
    layersBuffers.push(mergedLayersBuffer);
    saveLanduseGeometries(_landuse.id, layersBuffers, _landuse.type);       
}

function redrawMeshes() {
    Object.keys(typedGeometries).forEach(type => {
        const layerInfos = getLayerInfos(type);
        const curTypedGeos = typedGeometries[type]; 
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = curTypedGeos.meshes[l];
            mesh.geometry.dispose();
            const datasGeometries = curTypedGeos.list.map(data => data.geometries[l]);
            if (datasGeometries.length == 0) continue; // TODO: vu le test au dessus c'est débile
            mesh.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
            GLOBE.addMeshe(mesh);
        }
    });
    schdeduleNb --;
    Renderer.MUST_RENDER = true;
}

function saveLanduseGeometries(_id, _geometries, _type) {
    if (!typedGeometries[_type]) {
        const layerInfos = getLayerInfos(_type);
        const meshes = [];
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = new THREE.Mesh(new THREE.BufferGeometry(), materials[_type][l]);
            mesh.receiveShadow = true;
            meshes.push(mesh);
        }
        typedGeometries[_type] = {
            meshes : meshes, 
            list : [], 
        };
    }
    typedGeometries[_type].list.push({
        id : _id, 
        geometries : _geometries, 
    });
}

function deleteLanduseGeometry(_id, _type) {
    const curTypedGeos = typedGeometries[_type]; 
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
    const border = _landuse.border.map((p, i) => new poly2tri.Point(p[0], p[1], i + nbPoints));
    try {
        const swctx = new poly2tri.SweepContext(border);
        nbPoints += _landuse.border.length;
        _landuse.holes.forEach(hole => {
            const swcHole = hole.map((p, i) => new poly2tri.Point(p[0], p[1], i + nbPoints));
            swctx.addHole(swcHole);
            nbPoints += hole.length;
        });
        _landuse.fillPoints.forEach((point, i) => {
            swctx.addPoint(new poly2tri.Point(point[0], point[1], i + nbPoints));
        });
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
    const elevationsBorder = _landuse.border.map(point => {
        return ElevationStore.get(point[0], point[1]);
    });
    const elevationsHoles = _landuse.holes.map(hole => {
        return hole.map(point => {
            return ElevationStore.get(point[0], point[1]);
        })
    });
    const elevationsFill = _landuse.fillPoints.map(point => {
        return ElevationStore.get(point[0], point[1]);
    });
    return {
        border : elevationsBorder, 
        holes : elevationsHoles, 
        fill : elevationsFill, 
    }
}

function buildRelation(_relation, _nodesList, _waysList) {
    const innersCoords = _relation.members
    .filter(member => member.role == 'inner')
    .map(innerMember => {
        return _waysList['WAY_' + innerMember.ref].nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
    })
    .map(innerWay => {
        const cleanWay = [...innerWay];
        cleanWay.pop();
        return cleanWay;
    });
    let wayNodes = [];
    _relation.members.filter(member => member.role == 'outer')
    .forEach(member => {
        const outerWay = _waysList['WAY_' + member.ref];
        const cleanWay = outerWay.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
        cleanWay.pop();
        wayNodes.push(...cleanWay.slice(1));
    });
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
    let wayNodes = _way.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
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

function extractWays(_datas) {
    const ways = {};
    _datas.elements
    .filter(e => e.type == 'way')
	.forEach(way => {
		ways['WAY_' + way.id] = way;
    });
    return ways;
}

function isLanduseKnowed(_id) {
    return knowIds.includes(_id);
}

function forgotLanduse(_id) {
    knowIds = knowIds.filter(id => id != _id);
}

function extractElements(_datas, _type) {
    return _datas.elements
	.filter(e => e.type == _type)
	.filter(way => way.tags)
    .filter(way => isTagSupported(way));
}

function isTagSupported(_element) {
    if (extractType(_element)) return true;
	return false;
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


function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
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

let materialsInit = false;
// const debugWireframe = true;
const debugWireframe = false;
const materials = {
    forest : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.9,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.6}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.7}), 
        new THREE.MeshPhysicalMaterial({roughness:0.7,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.8}), 
    ], 
    scrub : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.9,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
    ], 
    grass : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
    ], 
    vineyard : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
    ], 
};

function initTextures() {
    if (!materialsInit) {
        materials.forest[0].map = NET_TEXTURES.texture('shell_tree_1');
        materials.forest[1].map = NET_TEXTURES.texture('shell_tree_2');
        materials.forest[2].map = NET_TEXTURES.texture('shell_tree_3');
        materials.forest[3].map = NET_TEXTURES.texture('shell_tree_4');

        materials.forest[1].normalMap = NET_TEXTURES.texture('shell_tree_normal');
        materials.forest[2].normalMap = NET_TEXTURES.texture('shell_tree_normal');
        materials.forest[3].normalMap = NET_TEXTURES.texture('shell_tree_normal');
        materials.forest[1].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');
        materials.forest[2].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');
        materials.forest[3].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');

        materials.scrub[0].map = NET_TEXTURES.texture('shell_scrub_1');
        materials.scrub[1].map = NET_TEXTURES.texture('shell_scrub_2');
        materials.scrub[2].map = NET_TEXTURES.texture('shell_scrub_3');

        materials.scrub[1].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
        materials.scrub[2].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
        materials.scrub[1].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
        materials.scrub[2].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');

        materials.vineyard[0].map = NET_TEXTURES.texture('shell_vine_2');
        materials.vineyard[1].map = NET_TEXTURES.texture('shell_vine_2');
        materials.vineyard[2].map = NET_TEXTURES.texture('shell_vine_3');
        materials.vineyard[3].map = NET_TEXTURES.texture('shell_vine_4');

        materials.vineyard[1].normalMap = NET_TEXTURES.texture('shell_vine_normal');
        materials.vineyard[2].normalMap = NET_TEXTURES.texture('shell_vine_normal');
        materials.vineyard[3].normalMap = NET_TEXTURES.texture('shell_vine_normal');
        materials.vineyard[1].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
        materials.vineyard[2].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
        materials.vineyard[3].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
        
        materials.grass[0].map = NET_TEXTURES.texture('shell_grass_1');
        materials.grass[1].map = NET_TEXTURES.texture('shell_grass_2');
        
        materials.grass[1].roughnessMap = NET_TEXTURES.texture('shell_grass_specular');
        materials.grass[1].normalMap = NET_TEXTURES.texture('shell_grass_normal');
        
        

        

        materialsInit = true;
    }
}

export {api as default};
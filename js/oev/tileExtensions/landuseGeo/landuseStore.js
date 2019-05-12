import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import GEO from '../../utils/geo.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as NET_TEXTURES from '../../net/NetTextures.js';

let knowIds = [];
const tileToLanduses = {};
let storedLanduses = {};
const typedGeometries = {};

const debugMaterial = new THREE.MeshPhysicalMaterial({wireframe:true, roughness:1,metalness:0, color:0xff0000, side:THREE.DoubleSide});

let schdeduleNb = 0;


const api = {
    setDatas : function(_json, _tile) {
        initTextures();
        const parsedJson = JSON.parse(_json);
        const nodesList = extractNodes(parsedJson);
        const waysList = extractWays(parsedJson);
        let landuseAdded = false;
        tileToLanduses[_tile.key] = [];
        const extractedRelations = extractElements(parsedJson, 'relation');
        extractedRelations
        .filter(rel => knowLanduse(rel.id))
        .forEach(rel => {
            storedLanduses['LANDUSE_' + rel.id].refNb ++;
        });
        tileToLanduses[_tile.key].push(...extractedRelations.map(rel => rel.id));

        extractedRelations
        .filter(way => !knowLanduse(way.id))
        .forEach(newRel => {
            knowIds.push(newRel.id);
            const relBuilded = buildRelation(newRel, waysList, nodesList);
            storedLanduses['LANDUSE_' + relBuilded.id] = {
                data : relBuilded, 
                refNb : 1
            };
            drawLanduse(relBuilded, _tile);
            landuseAdded = true;
        });

        const extractedWays = extractElements(parsedJson, 'way');
        extractedWays
        .filter(way => knowLanduse(way.id))
        .forEach(way => {
            storedLanduses['LANDUSE_' + way.id].refNb ++;
        });
        tileToLanduses[_tile.key].push(...extractedWays.map(way => way.id));

        extractedWays
        .filter(way => !knowLanduse(way.id))
        .forEach(newWay => {
            knowIds.push(newWay.id);
            const wayBuilded = buildWay(newWay, nodesList);
            storedLanduses['LANDUSE_' + wayBuilded.id] = {
                data : wayBuilded, 
                refNb : 1
            };
            drawLanduse(wayBuilded, _tile);
            landuseAdded = true;
        });

        if (landuseAdded) scheduleDraw();
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
                // clearLanduse(landuseId);
                deleteLanduseGeometry(stored.data.id, stored.data.type);
                delete storedLanduses['LANDUSE_' + landuseId];
            }
        });
        scheduleDraw();
    }
};


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
    const tmp = [];
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            tmp.push([x, y]);
        }
    }
    const grid = [];
    tmp.forEach(tilePos => {
        const startCoord = GEO.tileToCoordsVect(tilePos[0], tilePos[1], zoom);
        const endCoord = GEO.tileToCoordsVect(tilePos[0] + 1, tilePos[1] + 1, zoom);
        const def = GLOBE.tilesDefinition;
		const stepCoordX = (endCoord.x - startCoord.x) / def;
		const stepCoordY = (endCoord.y - startCoord.y) / def;
		for (let x = 0; x < def; x ++) {
			for (let y = 0; y < def; y ++) {
                const coord = [
					startCoord.x + (stepCoordX * x), 
					startCoord.y + (stepCoordY * y)
				];
                if (pointIntoPolygon(coord, _border))
				grid.push(coord);
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
        uvFactor = 32;
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

function drawLanduse(_landuse, _tile) {
    let lastMaterialLayer = 0;
    let layersGeometries = [];
    let curLayerGeometry = new THREE.Geometry();

    const layerInfos = getLayerInfos(_landuse.type);

    const uvAngle = Math.random() * 3.14;
    const uvRatioX = Math.cos(uvAngle);
    const uvRatioY = Math.sin(uvAngle);

    const trianglesResult = triangulate(_landuse);
    if (trianglesResult === null) return false;

    layersGeometries.push(curLayerGeometry);
    const elevationsDatas = getElevationsDatas(_landuse);
    for (let layer = 0; layer < layerInfos.nbLayers; layer ++) {
        const curLayerMap = Math.floor(layer / layerInfos.layersByMap);
        const geometry = new THREE.Geometry();
        const uvDatas = [];
        geometry.faceVertexUvs[0] = [];
        _landuse.border.forEach((point, i) => {
            const vertPos = GLOBE.coordToXYZ(
                point[0], 
                point[1], 
                layerInfos.groundOffset + elevationsDatas.border[i] + layer * layerInfos.meterBetweenLayers
            );
            geometry.vertices.push(vertPos);
            let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
            let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
            uvDatas.push(new THREE.Vector2(uvX * layerInfos.uvFactor, uvY * layerInfos.uvFactor));
            
            // uvX *= layerInfos.uvFactor;
            // uvY *= layerInfos.uvFactor;
            // const tmpX = uvX * uvRatioX - uvY * uvRatioY;
            // const tmpY = uvX * uvRatioX + uvY * uvRatioY;
            // uvDatas.push(new THREE.Vector2(tmpX, tmpY));
        });
        _landuse.holes.forEach((hole, h) => {
            hole.forEach((point, i) => {
                const vertPos = GLOBE.coordToXYZ(
                    point[0], 
                    point[1], 
                    layerInfos.groundOffset + elevationsDatas.holes[h][i] + layer * layerInfos.meterBetweenLayers
                );
                geometry.vertices.push(vertPos);
                let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
                let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
                uvDatas.push(new THREE.Vector2(uvX * layerInfos.uvFactor, uvY * layerInfos.uvFactor));

                // uvX *= layerInfos.uvFactor;
                // uvY *= layerInfos.uvFactor;
                // const tmpX = uvX * uvRatioX - uvY * uvRatioY;
                // const tmpY = uvX * uvRatioX + uvY * uvRatioY;
                // uvDatas.push(new THREE.Vector2(tmpX, tmpY));
            });
        });
        _landuse.fillPoints.forEach((point, i) => {
            const vertPos = GLOBE.coordToXYZ(
                point[0], 
                point[1], 
                layerInfos.groundOffset + elevationsDatas.fill[i] + layer * layerInfos.meterBetweenLayers
            );
            geometry.vertices.push(vertPos);
            let uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
            let uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
            uvDatas.push(new THREE.Vector2(uvX * layerInfos.uvFactor, uvY * layerInfos.uvFactor));

            // uvX *= layerInfos.uvFactor;
            // uvY *= layerInfos.uvFactor;
            // const tmpX = uvX * uvRatioX - uvY * uvRatioY;
            // const tmpY = uvX * uvRatioX + uvY * uvRatioY;
            // uvDatas.push(new THREE.Vector2(tmpX, tmpY));
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
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            curLayerGeometry = new THREE.Geometry();
            layersGeometries.push(curLayerGeometry);
        }
        curLayerGeometry.merge(geometry);
    }
    saveLanduseGeometry(_landuse.id, layersGeometries, _landuse.type);       
}

function redrawMeshes() {
    Object.keys(typedGeometries).forEach(type => {
        const layerInfos = getLayerInfos(type);
        const curTypedGeos = typedGeometries[type]; 
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = curTypedGeos.meshes[l];
            if (mesh.geometry) mesh.geometry.dispose();
            const datasGeometries = curTypedGeos.list.map(data => data.geometries[l]);
            if (datasGeometries.length == 0) continue;
            mesh.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
            mesh.receiveShadow = true;
            GLOBE.addMeshe(mesh);
        }
    });
    schdeduleNb --;
    Renderer.MUST_RENDER = true;
}

function saveLanduseGeometry(_id, _geometries, _type) {
    if (!typedGeometries[_type]) {
        const layerInfos = getLayerInfos(_type);
        const meshes = [];
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            meshes.push(new THREE.Mesh(new THREE.Geometry(), materials[_type][l]));
        }
        typedGeometries[_type] = {
            meshes : meshes, 
            list : [], 
        };
    }
    const buffers = _geometries.map(geo => new THREE.BufferGeometry().fromGeometry(geo));
    typedGeometries[_type].list.push({
        id : _id, 
        geometries : buffers, 
    });
    // console.log('typedGeometries', typedGeometries);
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

function buildRelation(_relation, _waysList, _nodesList) {
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
			// wayNodes.push(...outerWay.nodes.map(nodeId => _nodesList['NODE_' + nodeId]));
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

function knowLanduse(_id) {
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
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:0.7,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
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
        materials.scrub[0].map = NET_TEXTURES.texture('shell_scrub_1');
        materials.scrub[1].map = NET_TEXTURES.texture('shell_scrub_2');
        materials.scrub[2].map = NET_TEXTURES.texture('shell_scrub_3');
        materials.vineyard[0].map = NET_TEXTURES.texture('shell_vine_1');
        materials.vineyard[1].map = NET_TEXTURES.texture('shell_vine_2');
        materials.vineyard[2].map = NET_TEXTURES.texture('shell_vine_3');
        materials.vineyard[3].map = NET_TEXTURES.texture('shell_vine_4');
        materials.grass[0].map = NET_TEXTURES.texture('shell_grass_1');
        materials.grass[1].map = NET_TEXTURES.texture('shell_grass_2');

        materials.grass[1].normalMap = NET_TEXTURES.texture('normal_noise');
        materialsInit = true;
    }
}

export {api as default};
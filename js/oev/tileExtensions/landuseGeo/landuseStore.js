import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import GEO from '../../utils/geo.js';
import ElevationStore from '../elevation/elevationStore.js';

let knowIds = [];
const tileToLanduses = {};
let storedLanduses = {};
let landusesMeshes = {};

const debugMaterial = new THREE.MeshPhysicalMaterial({wireframe:true, roughness:1,metalness:0, color:0xff0000, side:THREE.DoubleSide});


const api = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = extractNodes(parsedJson);
        const waysList = extractWays(parsedJson);

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
        });

        Renderer.MUST_RENDER = true;
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
                clearLanduse(landuseId);
                delete storedLanduses['LANDUSE_' + landuseId];
            }
        });
    }
};



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

    /*
    const lon = _border.map(point => point[0]);
    const lat = _border.map(point => point[1]);

    const toto = {
        minLon : Math.min(...lon), 
        maxLon : Math.max(...lon), 
        minLat : Math.min(...lat), 
        maxLat : Math.max(...lat), 
    }
    return [[
        toto.minLon + (toto.maxLon - toto.minLon) / 2, 
        toto.minLat + (toto.maxLat - toto.minLat) / 2, 
    ]];
*/



    const zoom = 15;
    const tileA = GEO.coordsToTile(_bbox.minLon, _bbox.minLat, zoom);
    const tileB = GEO.coordsToTile(_bbox.maxLon, _bbox.maxLat, zoom);
    
    const tmp = [];
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            tmp.push([x, y]);
        }
    }
    if (tmp.length == 0) {
        console.log('tileA', tileA);
        console.log('tileB', tileB);
        console.log('tmp', tmp);
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




function clearLanduse(_landuseId) {
    const mesh = landusesMeshes['MESH_' + _landuseId];
    if (!mesh) {
        delete landusesMeshes['MESH_' + _landuseId];
        console.warn('MESH', _landuseId, 'unknow');
        return false;
    }
    GLOBE.removeMeshe(mesh);
    mesh.geometry.dispose();
    delete landusesMeshes['MESH_' + _landuseId];
}

function drawLanduse(_landuse, _tile) {
    let meterBetweenLayers = 10;
    let uvFactor = 1;
    let nbLayers = 1;
    let groundOffset = 10;

    const elevationsDatas = getElevationsDatas(_landuse);
    for (let layer = 0; layer < nbLayers; layer ++) {
        var geometry = new THREE.Geometry();
        const uvDatas = [];
        geometry.faceVertexUvs[0] = [];
        _landuse.border.forEach((point, i) => {
            const vertPos = GLOBE.coordToXYZ(
                point[0], 
                point[1], 
                groundOffset + elevationsDatas.border[i] + layer * meterBetweenLayers
            );
            geometry.vertices.push(vertPos);
            const uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
            const uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
            uvDatas.push(new THREE.Vector2(uvX * uvFactor, uvY * uvFactor));
        });
        _landuse.holes.forEach((hole, h) => {
            hole.forEach((point, i) => {
                const vertPos = GLOBE.coordToXYZ(
                    point[0], 
                    point[1], 
                    groundOffset + elevationsDatas.holes[h][i] + layer * meterBetweenLayers
                );
                geometry.vertices.push(vertPos);
                const uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
                const uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
                uvDatas.push(new THREE.Vector2(uvX * uvFactor, uvY * uvFactor));
            });
        });
        _landuse.fillPoints.forEach((point, i) => {
            const vertPos = GLOBE.coordToXYZ(
                point[0], 
                point[1], 
                groundOffset + elevationsDatas.fill[i] + layer * meterBetweenLayers
            );
            geometry.vertices.push(vertPos);
            const uvX = mapValue(point[0], _tile.startCoord.x, _tile.endCoord.x);
            const uvY = mapValue(point[1], _tile.endCoord.y, _tile.startCoord.y);
            uvDatas.push(new THREE.Vector2(uvX * uvFactor, uvY * uvFactor));
        });
        
        const trianglesResult = triangulate(_landuse);
        trianglesResult.forEach(t => {
            const points = t.getPoints();
            geometry.faceVertexUvs[0].push([
                uvDatas[points[0].id], 
                uvDatas[points[1].id], 
                uvDatas[points[2].id], 
            ]);
            geometry.faces.push(new THREE.Face3(points[0].id, points[1].id, points[2].id));
        });
        
        const mesh = new THREE.Mesh(geometry, debugMaterial);
        mesh.receiveShadow = true;
        GLOBE.addMeshe(mesh);
        landusesMeshes['MESH_' + _landuse.id] = mesh;
    }
}

function triangulate(_landuse) {
    let nbPoints = 0;
    const border = _landuse.border.map((p, i) => new poly2tri.Point(p[0], p[1], i + nbPoints));
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
			wayNodes.push(...outerWay.nodes.map(nodeId => _nodesList['NODE_' + nodeId]));
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
    // console.log('border', border);
    // console.log('grid', grid);

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
    .filter(way => isSupported(way));
}


function isSupported(_element) {
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

const supportedTags = [
    {
        key : 'landuse', 
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


export {api as default};
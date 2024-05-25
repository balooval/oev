importScripts('./colors.js');

onmessage = function(_evt) {
	const datas = readJson(_evt.data["json"]);
	postMessage(datas);
}

function readJson(_datas) {
	const json = JSON.parse(_datas);
	const nodesElements = extractNodes(json.elements);
	const entrances = listEntrances(nodesElements);
	const nodesList = new Map();
	let element = null;

	for (let i = 0; i < nodesElements.length; i ++) {
		element = nodesElements[i];
		nodesList.set('NODE_' + element.id, [
			parseFloat(element.lon), 
			parseFloat(element.lat)
		]);
	}

	let buildingsList = [];
	const waysList = extractWays(json);

	// Relations
	for (let i = 0; i < json.elements.length; i ++) {
		const rel = json.elements[i];
		if (rel.type != 'relation') {
			continue;
		}
		if (!rel.tags) {
			continue;
		}
		if (rel.tags['building:parts']) {
			continue;
		}
		
		const outlines = rel.members.filter(member => member.role == 'outline');
		if (outlines.length > 0) {
			console.log('Building outline', rel.id, outlines);
		}

		if (excludedIds.includes(rel.id)) {
			continue;
		}

		const props = cleanTags(rel.tags);
		const holes = rel.members.filter(member => member.role == 'inner');
		let holesNodes = [];
		let holesIndex = [];
		let holesLastId = 0;
		
		// TODO : gérer les trous composés de plusieurs ways (si ça existe)
		for (let j = 0; j < holes.length; j ++) {
			const holeWay = waysList.get('WAY_' + holes[j].ref);
			if (!holeWay) {
				console.warn('Building hole not found');
				continue;
			}
			let curHoleNodes = getWayNodes(holeWay.nodes, nodesList);
			curHoleNodes = removeWayDuplicateLimits(curHoleNodes);
			for (let j = 0; j < curHoleNodes.length; j ++) {
				holesNodes.push(curHoleNodes[j]);
			}
			holesIndex.push(holesLastId);
			holesLastId += curHoleNodes.length;
		}

		const borders = rel.members.filter(member => member.role == 'outer');
		const parts = mergeContinuousWays(borders, waysList, nodesList);

		for (let j = 0; j < parts.length; j ++) {
			const coords = parts[j];
			const wayNodesShort = removeWayDuplicateLimits([...coords]);
			holesIndex = holesIndex.map(h => h + wayNodesShort.length);
			const centroid = getPolygonCentroid(coords);
			let myHole = [];
			let myHoleIndex = [];
			if (polygonContainPolygon(wayNodesShort, holesNodes)) {
				myHole = holesNodes;
				myHoleIndex = holesIndex;
			}
			const buildObj = {
				id : rel.id, 
				props : props,  
				coords : wayNodesShort, 
				holesCoords : myHole, 
				holesIndex : myHoleIndex, 
				centroid : centroid, 
				entrances : [], 
			};
			buildingsList.push(buildObj);
		}
	}

	// Ways
	for (let i = 0; i < json.elements.length; i ++) {
		const way = json.elements[i];
		if (way.type != 'way') {
			continue;
		}
		if (!way.tags) {
			continue;
		}
		if (excludedIds.includes(way.id)) {
			continue;
		}
		if (way.tags['building:parts']) {
			continue;
		}

		const props = cleanTags(way.tags);
		const wayNodes = [];

		for (let i = 0; i < way.nodes.length; i ++) {
			wayNodes.push(nodesList.get('NODE_' + way.nodes[i]));
		}
		const centroid = getPolygonCentroid(wayNodes);
		const wayNodesShort = removeWayDuplicateLimits([...wayNodes]);
		buildingsList.push({
			id : way.id, 
			props : props, 
			coords : wayNodesShort, 
			holesCoords : [], 
			holesIndex : [], 
			centroid : centroid, 
			entrances : getEntrances(entrances, way.nodes, nodesList), 
		});
	}

	nodesList.clear();
	waysList.clear();

	return buildingsList;
}

function extractNodes(_elements) {
	const nodes = [];
	for (let i = 0; i < _elements.length; i ++) {
		const element = _elements[i];
		if (element.type != 'node') continue;
		nodes.push(element);
	}
	return nodes;
}

function getEntrances(_entrances, _wayNodes, _nodesList) {
	const entrances = [];
	let lastCoord;
	let curCoord;
	let lastNodeId = _wayNodes[_wayNodes.length - 1];
	for (let i = 0; i < _wayNodes.length; i ++) {
		const nodeId = _wayNodes[i];
		if (_entrances.includes(nodeId)) {
			lastCoord = _nodesList.get('NODE_' + lastNodeId);
			curCoord = _nodesList.get('NODE_' + nodeId);
			const angle = Math.atan2(lastCoord[1] - curCoord[1], lastCoord[0] - curCoord[0])
			entrances.push({
				coord : curCoord, 
				angle : angle, 
			});
		}
		lastNodeId = _wayNodes[i];
	}
	return entrances;
}

function listEntrances(_nodesElements) {
	const entrances = [];
	for (let i = 0; i < _nodesElements.length; i ++) {
		const element = _nodesElements[i];
		if (!element.tags) continue;
		if (!element.tags.entrance) continue;
		entrances.push(element.id);
	}
	return entrances;
}

function getWayNodes(_nodesIds, _nodesList) {
	const nodesCords = [];
	for (let i = 0; i < _nodesIds.length; i ++) {
		nodesCords.push(_nodesList.get('NODE_' + _nodesIds[i]));
	}
	return nodesCords;
}

function mergeContinuousWays(_outers, _waysList, _nodesList) {
	const res = [];
	const outersLimits = new Array(_outers.length);
	let outerNodes = null;
	for (let i = 0; i < _outers.length; i ++) {
		const outerWay = _waysList.get('WAY_' + _outers[i].ref);
		if (!outerWay) {
			console.warn('Pas trouvé de outerWay');
			return res;
		}
		outerNodes = getWayNodes(outerWay.nodes, _nodesList);
		outersLimits[i] = [
			outerNodes.shift(), 
			outerNodes.pop()
		];
	}
	const differentsBorders = [];
	let curBorderPart = [];
	let lastStart = null;
	let limit = null;
	for (let i = 0; i < outersLimits.length; i ++) {
		limit = outersLimits[i];
		if (lastStart == null) {
			curBorderPart.push(i);
			continue;
		}
		if (lastStart[0] == limit[0][0] && lastStart[1] == limit[0][1]) {
			curBorderPart.push(i);
			continue;
		}
		if (lastStart[0] == limit[1][0] && lastStart[1] == limit[1][1]) {
			curBorderPart.push(i);
			continue;
		}
		if (lastStart[1] == limit[0][0] && lastStart[1] == limit[0][1]) {
			curBorderPart.push(i);
			continue;
		}
		if (lastStart[1] == limit[1][0] && lastStart[1] == limit[1][1]) {
			curBorderPart.push(i);
			continue;
		}
		differentsBorders.push(curBorderPart);
		curBorderPart = [];
	}
	differentsBorders.push(curBorderPart);
	
	let contiguousWays = null;
	let contiguousNodes = null;
	let curOuter = null;
	let outerWay = null;
	let outerNodesB = null;
	for (let i = 0; i < differentsBorders.length; i ++) {
		contiguousNodes = [];
		contiguousWays = differentsBorders[i];
		for (let j = 0; j < contiguousWays.length; j ++) {
			curOuter = _outers[differentsBorders[i][j]];
			outerWay = _waysList.get('WAY_' + curOuter.ref);
			outerNodesB = getWayNodes(outerWay.nodes, _nodesList);
			for (let k = 0; k < outerNodesB.length; k ++) {
				contiguousNodes.push(outerNodesB[k]);
			}
		}
		if (contiguousNodes.length < 3) continue;
		res.push(contiguousNodes);
	}
	return res;
}

function removeWayDuplicateLimits(_way) {
	if (_way.length < 2) return _way;
	const first = _way[0];
	const last = _way[_way.length-1];
	if (first[0] != last[0] || first[1] != last[1]) return _way;
	_way.pop();
	return _way;
}

function extractWays(_datas) {
	const ways = new Map();
	for (let i = 0; i < _datas.elements.length; i ++) {
		const way = _datas.elements[i];
		if (way.type != 'way') continue;
		ways.set('WAY_' + way.id, way);
	}
    return ways;
}

function cleanTags(_tags) {
	const tags = {};
	let floorHeight = 4;
	_tags.height = _tags.height || '-1';
	_tags.height = _tags.height.replace('m', '');
	_tags.height = _tags.height.replace(' ', '');
	_tags['min_height'] = _tags['min_height'] || '0';
	_tags['building:levels'] = _tags['building:levels'] || '1';
	_tags['building:min_level'] = _tags['building:min_level'] || '0';
	tags.roofShape = _tags['roof:shape'] || 'flat';
	
	tags.wallColor = getMaterialColor(_tags['building:material']) || 'white';
	tags.wallColor = _tags['building:facade:colour'] || tags.wallColor;
	tags.wallColor = parseColor(tags.wallColor);

	tags.roofColor = getMaterialColor(_tags['roof:material']) || 'white';
	tags.roofColor = _tags['roof:colour'] || tags.roofColor;
	tags.roofColor = _tags['building:roof:colour'] || tags.roofColor;

	tags.roofColor = parseColor(tags.roofColor);
	tags.wall = _tags.wall || '';

	tags.roofHeight = 0;
	if (_tags['roof:height']) tags.roofHeight = parseInt(_tags['roof:height']);

	let height = parseFloat(_tags.height) - tags.roofHeight;
	let minAlt = parseInt(_tags.min_height);
	let levels = parseInt(_tags['building:levels']);
	if (isNaN(levels)) {
		console.log('NAN levels', _tags['building:levels'])
		levels = 1;
	}

	if (tags.roofHeight == 0) tags.roofHeight = 1;

	let minLevels = parseInt(_tags['building:min_level']);
	if (minLevels > 0 && minAlt == 0) {
		minAlt = minLevels * floorHeight;
	}
	const floorNb = Math.max(1, levels - minLevels);
	if (isNaN(floorNb)) {
		console.log('NAN floorNb', floorNb, levels, minLevels)
	}
	if (height < 0) {
		height = floorNb * floorHeight;
	}
	height -= minAlt;
	floorHeight = height / floorNb;
	if (floorNb < 0) {
		console.log('floorNb', floorNb, levels, minLevels)
	}
	tags.floorsNb = floorNb;
	tags.floorHeight = floorHeight;
	tags.minAlt = minAlt;

	if (height == 0) tags.wall = 'no';
	return tags;
}

function getPolygonCentroid(pts) {
	const first = pts[0];
	const last = pts[pts.length-1];
	if (first[0] != last[0] || first[1] != last[1]) pts.push(first);
	let twicearea = 0;
	let lon = 0;
	let lat = 0;
	const nPts = pts.length;
	for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
		const p1 = pts[i];
		const p2 = pts[j];
		const f = p1[0] * p2[1] - p2[0] * p1[1];
		twicearea += f;          
		lon += (p1[0] + p2[0]) * f;
		lat += (p1[1] + p2[1]) * f;
	}
	f = twicearea * 3;
	return [lon / f, lat / f];
}

function polygonContainPolygon(_polyA, _polyB) {
	const bboxA = {
		minX : Math.min(..._polyA.map(pt => pt[0])), 
		minY : Math.min(..._polyA.map(pt => pt[1])), 
		maxX : Math.max(..._polyA.map(pt => pt[0])), 
		maxY : Math.max(..._polyA.map(pt => pt[1])), 
	};
	const bboxB = {
		minX : Math.min(..._polyB.map(pt => pt[0])), 
		minY : Math.min(..._polyB.map(pt => pt[1])), 
		maxX : Math.max(..._polyB.map(pt => pt[0])), 
		maxY : Math.max(..._polyB.map(pt => pt[1])), 
	}
	if (bboxA.minX > bboxB.minX) return false;
	if (bboxA.minY > bboxB.minY) return false;
	if (bboxA.maxX < bboxB.maxX) return false;
	if (bboxA.maxY < bboxB.maxY) return false;
	return _polyB.every(pt => pointIntoPolygon(pt, _polyA));
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

const excludedIds = [
	23762981, 
	3071549, 
	226413508, 
	446646206, // Burj Khalifa outline
	5013364, // Tour Effeil
	261509934, //Central Park Tower
	261504064, // Steinway Tower
	266010393, // Olympic Tower
	109284807, // International Building
	487519790,
	86121621, // Bank of America Tower
	34633854, // Empire State Building
	264768910, // One Madison
	160963310, // Merchandise Mart Building
	1089873004,
	166839381, // 3 World Trade Center
	713565776, // One World Trade Center
	293052032, // Equitable Building
	279530782, // 28 Liberty
	278039445, // Millennium
	214744070,
	261499924, // 432 Park Avenue
	289852832, // 1214 Fifth Avenue
	162764018, // Lotte New York Palace
	73850655, // Helmsley Building
	160326780, // AT&T
	42496284, // Morgan Stanley Building
	265338408, // One Worldwide Plaza
	259890861,
	265344258, // The Regent
	265355139, // One Columbus Place
	265355141, // South Park Tower
	3071645, // Tour Eqho
	3344870, // Sainte-Chapelle
	201611261, // Cathédrale Notre-Dame de Paris
	1255782, // Maison de la Radio et de la Musique
	123463802, // Ministère de l'Économie, des Finances et du Budget
	70001850, // Église Notre-Dame-de-la-Croix
	272804945, //Cathédrale Saint-Pierre
	75320800, // Université de Montpellier - Faculté de Droit et Science Politique
	273241904, // Le Triangle
	273265525, // Église Sainte-Anne
];
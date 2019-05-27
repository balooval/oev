importScripts('./colors.js');

onmessage = function(_evt) {
	const datas = readJson(_evt.data["json"]);
	postMessage(datas);
}

function readJson(_datas) {
	const json = JSON.parse(_datas);
	const nodesList = new Map();
	for (let i = 0; i < json.elements.length; i ++) {
		const element = json.elements[i];
		if (element.type != 'node') continue;
		nodesList.set('NODE_' + element.id, [
			parseFloat(element.lon), 
			parseFloat(element.lat)
		]);
	}
	let buildingsList = [];
	const waysList = extractWays(json);
	for (let i = 0; i < json.elements.length; i ++) {
		const rel = json.elements[i];
		if (rel.type != 'relation') continue;
		if (!rel.tags) continue;
		if (rel.tags['building:parts']) continue;
		if (excludedIds.includes(rel.id)) continue;
		const props = cleanTags(rel.tags);
		const holes = rel.members.filter(member => member.role == 'inner');
		let holesNodes = [];
		let holesIndex = [];
		let holesLastId = 0;
		// TODO : gérer les trous composés de plusieurs ways (si ça existe)
		for (let j = 0; j < holes.length; j ++) {
			const holeWay = waysList.get('WAY_' + holes[j].ref);
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
			};
			buildingsList.push(buildObj);
		}
	}

	for (let i = 0; i < json.elements.length; i ++) {
		const way = json.elements[i];
		if (way.type != 'way') continue;
		if (!way.tags) continue;
		if (excludedIds.includes(way.id)) continue;
		if (way.tags['building:parts']) continue;
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
		});
	}
	nodesList.clear();
	waysList.clear();
	return buildingsList;
}

function getWayNodes(_nodesIds, _nodesList) {
	const nodesCords = [];
	for (let i = 0; i < _nodesIds.length; i ++) {
		nodesCords.push(_nodesList.get('NODE_' + _nodesIds[i]));
	}
	return nodesCords;
}

function mergeContinuousWays(_outers, _waysList, _nodesList) {
	const outersLimits = [];
	for (let i = 0; i < _outers.length; i ++) {
		const outerWay = _waysList.get('WAY_' + _outers[i].ref);
		const outerNodes = getWayNodes(outerWay.nodes, _nodesList);
		outersLimits.push([
			outerNodes.shift(), 
			outerNodes.pop()
		]);
	}
	const differentsBorders = [];
	let curBorderPart = [];
	let lastStart = null;
	for (let i = 0; i < outersLimits.length; i ++) {
		const limit = outersLimits[i];
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
	const res = [];
	for (let i = 0; i < differentsBorders.length; i ++) {
		const contiguousNodes = [];
		const contiguousWays = differentsBorders[i];
		for (let j = 0; j < contiguousWays.length; j ++) {
			const curOuter = _outers[differentsBorders[i][j]];
			const outerWay = _waysList.get('WAY_' + curOuter.ref);
			const outerNodes = getWayNodes(outerWay.nodes, _nodesList);
			for (let k = 0; k < outerNodes.length; k ++) {
				contiguousNodes.push(outerNodes[k]);
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
	
	const mainColor = _tags['building:colour'] || 'white';
	tags.wallColor = _tags['building:facade:colour'] || mainColor;
	tags.roofColor = _tags['roof:colour'] || mainColor;
	tags.roofColor = _tags['building:roof:colour'] || tags.roofColor;

	tags.wallColor = parseColor(tags.wallColor);
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
];
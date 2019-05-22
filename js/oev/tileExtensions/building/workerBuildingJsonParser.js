importScripts('./colors.js');

onmessage = function(_evt) {
	const datas = readJson(_evt.data["json"]);
	postMessage(datas);
}

function readJson(_datas) {
	const json = JSON.parse(_datas);
	const nodesList = {};
	const jsonNodes = json.elements.filter(e => e.type == 'node');
	jsonNodes.forEach(n => {
		nodesList['NODE_' + n.id] = [
			parseFloat(n.lon), 
			parseFloat(n.lat)
		];
	});
	
	const buildingsList = [];
	
	const waysList = extractWays(json);

	json.elements
	.filter(e => e.type == 'relation')
	.filter(e => e.tags)
	.filter(e => !e.tags['building:parts'])
	// .filter(e => e.id == 3071549)
	.filter(e => !excludedIds.includes(e.id))
	.forEach(rel => {
		if (rel.id == 3071549) console.log('Relation OUTER');
		if (rel.id == 3071552) console.log('Relation PART');
		const props = cleanTags(rel.tags);
		const holes = rel.members.filter(member => member.role == 'inner');
		let holesNodes = [];
		let holesIndex = [];
		let holesLastId = 0;
		holes.forEach(hole => {
			const holeWay = waysList['WAY_' + hole.ref];
			let curHoleNodes = holeWay.nodes.map(nodeId => nodesList['NODE_' + nodeId]);
			curHoleNodes = removeWayDuplicateLimits(curHoleNodes);
			holesNodes.push(...curHoleNodes);
			holesIndex.push(holesLastId);
			holesLastId += curHoleNodes.length / 2;
		});
		const borders = rel.members.filter(member => member.role == 'outer');

		const parts = mergeContinuousWays(borders, waysList, nodesList)

		parts
		.filter(coords => coords.length > 3)
		.forEach(coords => {
			const wayNodesShort = removeWayDuplicateLimits([...coords]);
			holesIndex = holesIndex.map(h => h + wayNodesShort.length);
			const centroid = getPolygonCentroid(coords);
			const buildObj = {
				id : rel.id, 
				props : props, 
				coords : wayNodesShort, 
				holesCoords : holesNodes, 
				holesIndex : holesIndex, 
				centroid : centroid, 
			};
			buildingsList.push(buildObj);
		});
	});


	
	json.elements
	.filter(e => e.type == 'way')
	.filter(e => e.tags)
	.filter(e => !excludedIds.includes(e.id))
	.filter(e => !e.tags['building:parts'])
	.forEach(w => {
		const props = cleanTags(w.tags);
		const wayNodes = w.nodes.map(nodeId => nodesList['NODE_' + nodeId]);
		const centroid = getPolygonCentroid(wayNodes);
		buildingsList.push({
			id : w.id, 
			props : props, 
			coords : wayNodes.slice(0, -1), 
			holesCoords : [], 
			holesIndex : [], 
			centroid : centroid, 
		});
	});
	
	return buildingsList;
}

function mergeContinuousWays(_outers, _waysList, _nodesList) {
	const outersLimits = _outers.map(outer => {
		const outerWay = _waysList['WAY_' + outer.ref];
		let outerNodes = outerWay.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
		return [
			outerNodes.shift(), 
			outerNodes.pop()
		];
	});
	
	const differentsBorders = [];
	let curBorderPart = [];
	let lastStart = null;
	let lastEnd = null;
	outersLimits.forEach((limit, i) => {
		if (lastStart == null) {
			curBorderPart.push(i);
			return;
		}
		if (lastStart[0] == limit[0][0] && lastStart[1] == limit[0][1]) {
			curBorderPart.push(i);
			return;
		}
		if (lastStart[0] == limit[1][0] && lastStart[1] == limit[1][1]) {
			curBorderPart.push(i);
			return;
		}
		if (lastStart[1] == limit[0][0] && lastStart[1] == limit[0][1]) {
			curBorderPart.push(i);
			return;
		}
		if (lastStart[1] == limit[1][0] && lastStart[1] == limit[1][1]) {
			curBorderPart.push(i);
			return;
		}
		differentsBorders.push(curBorderPart);
		curBorderPart = [];
	});
	differentsBorders.push(curBorderPart);
	
	const res = differentsBorders.map(contiguousWays => {
		return contiguousWays.map(outerId => {
			const curOuter = _outers[outerId];
			const outerWay = _waysList['WAY_' + curOuter.ref];
			let outerNodes = outerWay.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
			return outerNodes;
		}).flat();
	});
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
    const ways = {};
    _datas.elements
    .filter(e => e.type == 'way')
	.forEach(way => {
		ways['WAY_' + way.id] = way;
    });
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

	const mainColor = _tags['building:colour'] || 'white';
	tags.wallColor = _tags['building:facade:colour'] || mainColor;
	tags.roofColor = _tags['roof:colour'] || mainColor;
	tags.roofColor = _tags['building:roof:colour'] || tags.roofColor;

	tags.wallColor = parseColor(tags.wallColor);
	tags.roofColor = parseColor(tags.roofColor);
	tags.wall = _tags.wall || '';

	let height = parseFloat(_tags.height);
	let minAlt = parseInt(_tags.min_height);
	let levels = parseInt(_tags['building:levels']);
	let minLevels = parseInt(_tags['building:min_level']);
	if (minLevels > 0 && minAlt == 0) {
		minAlt = minLevels * floorHeight;
	}
	const floorNb = (levels - minLevels);
	if (height < 0) {
		height = floorNb * floorHeight;
	}
	height -= minAlt;
	floorHeight = height / floorNb;
	tags.floorsNb = floorNb;
	tags.floorHeight = floorHeight;
	tags.minAlt = minAlt;
	if (_tags.id == 225694338) {
		console.log('ICI', tags);
	}
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

const excludedIds = [
	23762981, 
	3071549, 
	226413508, 
];
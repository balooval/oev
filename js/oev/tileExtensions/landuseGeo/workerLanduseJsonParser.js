

onmessage = function(_evt) {
	let datas = readJson(_evt.data.json, _evt.data.bbox);
	postMessage(datas);
}

function readJson(_datas, _bbox) {
	const json = JSON.parse(_datas);
	const nodesList = {};
	const jsonNodes = json.elements.filter(e => e.type == 'node');
	jsonNodes.forEach(n => {
		nodesList['NODE_' + n.id] = [
			parseFloat(n.lon), 
			parseFloat(n.lat)
		];
	});
	const landusesList = [];
	const ways = {};
	json.elements
	.filter(e => e.type == 'way')
	.forEach(way => {
		ways['WAY_' + way.id] = way;
	});
	const relations = {};
	json.elements
	.filter(e => e.type == 'relation')
	.forEach(rel => {
		relations['REL_' + rel.id] = rel.members;
	});

	
	json.elements
	.filter(e => e.type == 'relation')
	.forEach(rel => {
		const props = cleanTags(rel.tags);
		if (props.type == 'unsupported') return;
		const innersCoords = rel.members
		.filter(member => member.role == 'inner')
		.map(innerMember => {
			return ways['WAY_' + innerMember.ref].nodes.map(nodeId => nodesList['NODE_' + nodeId])
		});
		const wayNodes = [];
		const outerMembers = rel.members.filter(member => member.role == 'outer');
		outerMembers.forEach(member => {
			const outerWay = ways['WAY_' + member.ref];
			wayNodes.push(...outerWay.nodes.map(nodeId => nodesList['NODE_' + nodeId]));
		});
		// const centroid = getPolygonCentroid(wayNodes);
		// if (!bboxContainCoord(_bbox, centroid)) return;
		const relation = {
			id : rel.id, 
			props : props, 
			coords : wayNodes, 
			holes : innersCoords, 
		};
		landusesList.push(relation);
	});
	
	
	json.elements
	.filter(e => e.type == 'way')
	.filter(way => way.tags)
	.forEach(way => {
		const props = cleanTags(way.tags);
		if (props.type == 'unsupported') return;
		const wayNodes = way.nodes.map(nodeId => nodesList['NODE_' + nodeId]);
		// const centroid = getPolygonCentroid(wayNodes);
		// if (!bboxContainCoord(_bbox, centroid)) return;
		landusesList.push({
			id : way.id, 
			props : props, 
			coords : wayNodes, 
			holes : [], 
		});
	});
	
	return landusesList;
}

function bboxContainCoord(_bbox, _coord) {
	if (_coord[0] < _bbox.minLon) return false;
	if (_coord[0] > _bbox.maxLon) return false;
	if (_coord[1] > _bbox.maxLat) return false;;
	if (_coord[1] < _bbox.minLat) return false;
	return true;
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

function cleanTags(_tags) {
	const tags = {
		type : 'unsupported', 
	};
	if (_tags.landuse) tags.type = _tags.landuse;
	if (_tags.natural) tags.type = _tags.natural;
	const supported = [
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
		
	];

	const equals = {
		wood : 'forest', 
		farmyard : 'grass', 
		farmland : 'grass', 
		grassland : 'grass', 
		orchard : 'grass', 
		meadow : 'grass', 
		greenfield : 'grass', 
		village_green : 'grass', 
	};

	const excluded = [
		'residential', 
		'industrial', 
		'retail', 
		'cemetery', 
		'construction', 
		'quarry', 
		'commercial', 
		'water', 
		'recreation_ground', 
		'railway', 
		'heath', 
		'basin', 
		'allotments', 
		'spring', 
		'unsupported', 
		'cliff', 
		'beach', 
		'allotments', 
		'brownfield', 
		'military', 
		'tree_row', 
		'education', 
		'plant_nursery', 
		'yes', 
		'tourism', 
		'wetland', 
		'reservoir', 
		'coastline', 
		'bare_rock', 
		'greenhouse_horticulture', 
	];

	if (!supported.includes(tags.type)) {
		// if (!excluded.includes(tags.type)) console.log('tags.type', tags.type);
		tags.type = 'unsupported';
	}
	if (equals[tags.type]) tags.type = equals[tags.type];
	return tags;
}

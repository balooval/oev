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
	json.elements
	.filter(e => e.type == 'way')
	.filter(w => !exculdedId.includes(w.id))
	.forEach(w => {
		const props = cleanTags(w.tags);
		const wayNodes = w.nodes.map(nodeId => nodesList['NODE_' + nodeId]);
		const verticesCoord = wayNodes.flat();
		const centroid = getPolygonCentroid(wayNodes);
		buildingsList.push({
			id : w.id, 
			props : props, 
			coords : wayNodes, 
			centroid : centroid, 
		});
	});
	return buildingsList;
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

var exculdedId = [23762981, 
	226413508, 
	19441489, 
	201247295, 
	150335048, 
	309413981, 
	249003371, 
	249003371, 
	112452790, 
	3504257, 
	227662017, 
];
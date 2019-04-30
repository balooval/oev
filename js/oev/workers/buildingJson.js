
onmessage = function(_evt) {
	var result = precomputeBuildings(_evt.data["json"], _evt.data["bbox"]);
	postMessage(result);
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

	tags.mainColour = _tags['building:colour'] || 'white';
	tags.wallColour = _tags['building:facade:colour'] || tags.mainColour;
	tags.roofColour = _tags['roof:colour'] || tags.mainColour;
	tags.roofColour = _tags['building:roof:colour'] || tags.roofColour;
	// tags.roofColour = '#8DF0B8';

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

function precomputeBuildings(_datas, _bbox) {
	const buildingsJson = JSON.parse(_datas);
	const nodes = {};
	for (let i = 0; i < buildingsJson.elements.length; i ++) {
		if (buildingsJson.elements[i].type == 'node') {
			nodes['NODE_' + buildingsJson.elements[i].id] = [
				parseFloat(buildingsJson.elements[i].lon), 
				parseFloat(buildingsJson.elements[i].lat)
			];
		}
	}
	const buildings = [];
	for (let i = 0; i < buildingsJson.elements.length; i ++) {
		if (buildingsJson.elements[i].type == 'way') {
			if (exculdedId.includes(buildingsJson.elements[i].id)) continue;
			const buildTags = buildingsJson.elements[i].tags;
			buildTags.id = buildingsJson.elements[i].id;
			const nodesList = buildingsJson.elements[i].nodes;
			const bufferVertCoords = new Float32Array(nodesList.length * 2);
			const buildVerts = [];
			for (let n = 0; n < buildingsJson.elements[i].nodes.length; n ++) {
				const myNodeId = 'NODE_' + buildingsJson.elements[i].nodes[n];
				buildVerts.push(nodes[myNodeId]);
				bufferVertCoords[n * 2 + 0] = nodes[myNodeId][0];
				bufferVertCoords[n * 2 + 1] = nodes[myNodeId][1];
			}
			buildings.push({
				id : buildingsJson['elements'][i]["id"], 
				centroid : 0, 
				props : cleanTags(buildTags), 
				vertex : buildVerts, 
				bufferVertex : bufferVertCoords, 
			});
		}
	}
	if (_bbox == undefined) {
		return buildings;
	}
	const buildingsToDraw = [];
	for (let b = 0; b < buildings.length; b ++) {
		const centroid = getPolygonCentroid(buildings[b].vertex);
		buildings[b].centroid = centroid;
		if (!bboxContainCoord(_bbox, centroid)) continue;
		delete buildings[b].vertex;
		buildingsToDraw.push(buildings[b]);
	}
	return buildingsToDraw;
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
	let lon=0;
	let lat=0;
	let nPts = pts.length;
	let p1;
	let p2;
	let f;
	for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
		p1 = pts[i];
		p2 = pts[j];
		f = p1[0]*p2[1] - p2[0]*p1[1];
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
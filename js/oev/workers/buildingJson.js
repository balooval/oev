importScripts('./colors.js');

onmessage = function(_evt) {
	const buildings = precomputeBuildings(_evt.data["json"], _evt.data["bbox"]);
	const geometry = prepareBuildingGeometry(buildings);
	postMessage({
		buildings : buildings, 
		geometry : geometry, 
	});
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
	const jsonNodes = buildingsJson.elements.filter(e => e.type == 'node');
	jsonNodes.forEach(n => {
		nodes['NODE_' + n.id] = [
			parseFloat(n.lon), 
			parseFloat(n.lat)
		];
	});
	const buildings = [];
	const jsonWays = buildingsJson.elements.filter(e => e.type == 'way');
	jsonWays
	.filter(w => !exculdedId.includes(w.id))
	.forEach(w => {
		w.tags.id = w.id;
		const buildTags = cleanTags(w.tags);
		const wayNodes = w.nodes.map(nodeId => nodes['NODE_' + nodeId]);
		const verticesCoord = wayNodes.flat();
		const bufferVertCoords = new Float32Array(verticesCoord);
		const centroid = getPolygonCentroid(wayNodes);
		buildings.push({
			id : w.id, 
			centroid : centroid, 
			props : buildTags, 
			bufferVertex : bufferVertCoords, 
			nbVert : 0, 
			nbFaces : 0, 
		});
	});
	if (_bbox == undefined) return buildings;
	return buildings.filter(b => bboxContainCoord(_bbox, b.centroid));
}

function prepareBuildingGeometry(_buildings) {
	let nbVert = 0;
	let nbFaces = 0;
	_buildings.forEach(b => {
		let buildingCoordNb = b.bufferVertex.length / 2;
		b.nbVert = buildingCoordNb * (b.props.floorsNb + 1)
		nbVert += b.nbVert;
		nbFaces += (buildingCoordNb * 2) * b.props.floorsNb;
	});
	const bufferCoord = new Float32Array(nbVert * 3);
	const bufferFaces = new Uint32Array(nbFaces * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	let pastFaceNb = 0;
	const colorVertices = [];
	_buildings.forEach(building => {
		const color = parseColor(building.props.wallColour);
		let buildingCoordNb = building.bufferVertex.length / 2;
		fondationsLat = -10;
		for (let floor = 0; floor < building.props.floorsNb + 1; floor ++) {
			for (let c = 0; c < buildingCoordNb; c ++) {
				colorVertices.push(...color);
				if (floor > 0) {
					const faceTopLeft = buildingCoordNb + c;
					const faceBottomLeft = c;
					let faceBottomRight = c + 1;
					let faceTopRight = faceBottomRight + buildingCoordNb;
					if (faceBottomRight >= buildingCoordNb) {
						faceBottomRight = 0;
						faceTopRight = buildingCoordNb;
					}
					const tmp = (floor - 1) * buildingCoordNb;
					bufferFaces[bufferFaceIndex + 0] = faceTopLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 1] = faceBottomLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 2] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 3] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 4] = faceTopRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 5] = faceTopLeft + pastFaceNb + tmp;
					bufferFaceIndex += 6;
				}
				bufferCoord[bufferVertIndex + 0] = building.bufferVertex[c * 2 + 0];
				bufferCoord[bufferVertIndex + 1] = building.bufferVertex[c * 2 + 1];
				bufferCoord[bufferVertIndex + 2] = fondationsLat + building.props.minAlt + (floor * building.props.floorHeight);
				bufferVertIndex += 3;
			}
			fondationsLat = 0;
		}
		pastFaceNb += buildingCoordNb * (building.props.floorsNb + 1);
	});

	return {
		nbVert : nbVert, 
		nbFaces : nbFaces, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
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
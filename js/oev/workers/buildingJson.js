
onmessage = function(_evt) {
	var result = precomputeBuildings(_evt.data["json"], _evt.data["bbox"]);
	postMessage(result);
}

function cleanTags(_tags) {
	var tags = {};
	var levels = 1;
	var minLevels = 0;
	var minAlt = 0;
	var floorHeight = 4;
	var height = -1;
	if ('height' in _tags) {
		_tags["height"].replace('m', '');
		_tags["height"].replace(' ', '');
		height = parseFloat(_tags["height"]);
	}
	if ('min_height' in _tags) {
		minAlt = parseInt(_tags["min_height"]);
	}
	if ('building:levels' in _tags) {
		levels = parseInt(_tags["building:levels"] );
	}
	if ('building:min_level' in _tags) {
		minLevels = parseInt(_tags["building:min_level"]);
	}
	if (minLevels > 0 && minAlt == 0) {
		minAlt = minLevels * floorHeight;
	}
	var floorNb = (levels - minLevels);
	if (height < 0) {
		height = floorNb * floorHeight;
	}
	height -= minAlt;
	floorHeight = height / floorNb;
	tags['floorsNb'] = floorNb;
	tags['floorHeight'] = floorHeight;
	tags['minAlt'] = minAlt;
	if (_tags['id'] == 225694338) {
		console.log('ICI', tags);
	}
	return tags;
}

// precompute datas from overpass
function precomputeBuildings(_datas, _bbox) {
	var i;
	var b;
	var n;
	var buildTags;
	var buildVerts;
	var myNodeId;
	var centroid;
	var buildingsJson = JSON.parse(_datas);
	var buildings = [];
	var nodes = {};
	for (i = 0; i < buildingsJson.elements.length; i ++) {
		if (buildingsJson.elements[i].type == 'node') {
			nodes['NODE_'+buildingsJson.elements[i].id] = [
				parseFloat(buildingsJson.elements[i].lon), 
				parseFloat(buildingsJson.elements[i].lat)
			];
		}
	}
	for (i = 0; i < buildingsJson['elements'].length; i ++) {
		if (buildingsJson.elements[i].type == 'way') {
			if (exculdedId.indexOf(buildingsJson.elements[i].id) >= 0) {
				continue;
			}
			buildTags = buildingsJson.elements[i].tags;
			buildTags['id'] = buildingsJson.elements[i].id;
			var nodesList = buildingsJson.elements[i].nodes;
			var bufferVertCoords = new Float32Array(nodesList.length * 2);
			buildVerts = [];
			for (n = 0; n < buildingsJson.elements[i].nodes.length; n ++) {
				myNodeId = buildingsJson.elements[i].nodes[n];
				buildVerts.push(nodes['NODE_'+myNodeId]);
				bufferVertCoords[n * 2 + 0] = nodes['NODE_'+myNodeId][0];
				bufferVertCoords[n * 2 + 1] = nodes['NODE_'+myNodeId][1];
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
	} else {
		var buildingsToDraw= [];
		for (b = 0; b < buildings.length; b ++) {
			centroid = getPolygonCentroid(buildings[b].vertex);
			buildings[b].centroid = centroid;
			if (centroid[0] < _bbox.minLon || centroid[0] > _bbox.maxLon || centroid[1] > _bbox.maxLat || centroid[1] < _bbox.minLat) {
				// don't add building
			} else {
				delete buildings[b].vertex;
				buildingsToDraw.push(buildings[b]);
			}
			
		}
		return buildingsToDraw;
	}
}

function getPolygonCentroid(pts) {
	var first = pts[0], last = pts[pts.length-1];
	if (first[0] != last[0] || first[1] != last[1]) pts.push(first);
	var twicearea=0,
	lon=0, lat=0,
	nPts = pts.length,
	p1, p2, f;
	for (var i=0, j=nPts-1 ; i<nPts ; j=i++) {
		p1 = pts[i]; p2 = pts[j];
		f = p1[0]*p2[1] - p2[0]*p1[1];
		twicearea += f;          
		lon += (p1[0] + p2[0]) * f;
		lat += (p1[1] + p2[1]) * f;
	}
	f = twicearea * 3;
	return [lon/f, lat/f];
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
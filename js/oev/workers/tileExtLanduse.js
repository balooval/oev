importScripts('../../utils/geojson-area.js'); 

onmessage = function(e) {
	// console.log('Worker Landuse.onmessage', e.data);
	var tmpId = e.data[0];
	var result = placeNodes(e.data[1][0], e.data[1][1], e.data[1][2]);
	postMessage([tmpId, result]);
}


function placeNodes(_surfaces, _surfBBox, _surfTypes) {
	var nodesPositions = [];
	var meter = 1/100000;
	var coordLon;
	var coordLat;
	var altP;
	var surGeoJson = {
		type : 'Polygon',
		coordinates : null
	};
	// TODO : get elevation
	for (var s = 0; s < _surfaces.length; s ++) {
		var surfWidth = _surfBBox[s][1] - _surfBBox[s][0];
		var surfHeight = _surfBBox[s][3] - _surfBBox[s][2];
		if (_surfTypes[s] == 'vineyard') {
			for (coordLon = _surfBBox[s][0]; coordLon < _surfBBox[s][1]; coordLon += meter * 20) {
				for (coordLat = _surfBBox[s][2]; coordLat < _surfBBox[s][3]; coordLat += meter * 5) {
					if (ptIsInPolygon(_surfaces[s], coordLon, coordLat)) {
						// altP = Oev.Globe.getElevationAtCoords(coordLon, coordLat, true);
						nodesPositions.push(_surfTypes[s], coordLon, coordLat, 0);
					}
				}
			}
		} else if (_surfTypes[s] == 'scrub' || _surfTypes[s] == 'forest') {
			surGeoJson.coordinates = [_surfaces[s]];
			var curArea = Math.round(geojsonArea.geometry(surGeoJson) / 100);
			if (_surfTypes[s] == 'scrub') {
				curArea *= 2;
			}
			nbPartIn = 0;
			while (nbPartIn < curArea) {
				coordLon = _surfBBox[s][0] + (surfWidth * Math.random());
				coordLat = _surfBBox[s][2] + (surfHeight * Math.random());
				if (ptIsInPolygon(_surfaces[s], coordLon, coordLat)) {
					nbPartIn ++;
					// altP = Oev.Globe.getElevationAtCoords(coordLon, coordLat, true);
					nodesPositions.push(_surfTypes[s], coordLon, coordLat, 0);
				}
			}
		}
	}
	return nodesPositions;
}

function ptIsInPolygon(poly, _lon, _lat) {
	for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
((poly[i][1] <= _lat && _lat < poly[j][1]) || (poly[j][1] <= _lat && _lat < poly[i][1]))
&& (_lon < (poly[j][0] - poly[i][0]) * (_lat - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
&& (c = !c);
return c;
}
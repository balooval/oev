onmessage = function( evt ) {
	var result = precomputeBuildings( evt.data["json"], evt.data["bbox"] );
	postMessage( result );
	// close();
}


// precompute datas from overpass
function precomputeBuildings( _datas, _bbox ){
	var i;
	var b;
	var n;
	var buildTags;
	var buildVerts;
	var myNodeId;
	var centroid;
	var buildingsJson = JSON.parse( _datas );
	var buildings = [];
	var nodes = {};
	for (i = 0; i < buildingsJson['elements'].length; i ++) {
		if (buildingsJson['elements'][i]['type'] == 'node') {
			nodes['NODE_'+buildingsJson['elements'][i]['id']] = {'lon' : parseFloat( buildingsJson['elements'][i]['lon'] ), 'lat' : parseFloat( buildingsJson['elements'][i]['lat'])};
		}
	}
	
	for (i = 0; i < buildingsJson['elements'].length; i ++) {
		if (buildingsJson['elements'][i]['type'] == 'way') {
			buildTags = buildingsJson['elements'][i]['tags'];
			buildVerts = [];
			for (n = 0; n < buildingsJson['elements'][i]['nodes'].length; n ++) {
				myNodeId = buildingsJson['elements'][i]['nodes'][n];
				buildVerts.push( nodes['NODE_'+myNodeId] );
			}
			buildings.push({'id' : buildingsJson['elements'][i]["id"], "centroid" : 0, "tags" : buildTags, "vertex" : buildVerts});
		}
	}
	
	if (_bbox == undefined) {
		return buildings;
	}else{
		var buildingsToDraw= [];
		for (b = 0; b < buildings.length; b ++) {
			centroid = getPolygonCentroid( buildings[b]["vertex"] );
			buildings[b]["centroid"] = centroid;
			if (centroid.lon < _bbox["minLon"] || centroid.lon > _bbox["maxLon"] || centroid.lat > _bbox["maxLat"] || centroid.lat < _bbox["minLat"]) {
			} else {
				buildingsToDraw.push(buildings[b]);
			}
		}
		return buildingsToDraw;
	}
}


function getPolygonCentroid( pts ) {
	var first = pts[0], last = pts[pts.length-1];
	if (first.lon != last.lon || first.lat != last.lat) pts.push(first);
	var twicearea=0,
	lon=0, lat=0,
	nPts = pts.length,
	p1, p2, f;
	for ( var i=0, j=nPts-1 ; i<nPts ; j=i++ ) {
		p1 = pts[i]; p2 = pts[j];
		f = p1.lon*p2.lat - p2.lon*p1.lat;
		twicearea += f;          
		lon += ( p1.lon + p2.lon ) * f;
		lat += ( p1.lat + p2.lat ) * f;
	}
	f = twicearea * 3;
	return { lon:lon/f, lat:lat/f };
}
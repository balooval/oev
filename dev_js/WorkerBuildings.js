onmessage = function( evt ) {
	var result = precomputeBuildings( evt.data["json"], evt.data["bbox"] );
	postMessage( result );
	// close();
}


function precomputeBuildings( _datas, _bbox ){
	var buildingsJson = JSON.parse( _datas );
	// precompute datas from overpass
	var buildings = [];
	var nodes = {};
	for( var i = 0; i < buildingsJson['elements'].length; i ++ ){
		if( buildingsJson['elements'][i]['type'] == 'node' ){
			nodes['NODE_'+buildingsJson['elements'][i]['id']] = { 'lon' : parseFloat( buildingsJson['elements'][i]['lon'] ), 'lat' : parseFloat( buildingsJson['elements'][i]['lat'] ) };
		}
	}
	
	for( var i = 0; i < buildingsJson['elements'].length; i ++ ){
		if( buildingsJson['elements'][i]['type'] == 'way' ){
			var buildTags = buildingsJson['elements'][i]['tags'];
			var buildVerts = [];
			for( var n = 0; n < buildingsJson['elements'][i]['nodes'].length; n ++ ){
				var myNodeId = buildingsJson['elements'][i]['nodes'][n];
				buildVerts.push( nodes['NODE_'+myNodeId] );
			}
			buildings.push( { 'id' : buildingsJson['elements'][i]["id"], "centroid" : 0, "tags" : buildTags, "vertex" : buildVerts } );
		}
	}
	
	if( _bbox == undefined ){
		return buildings;
	}else{
		var buildingsToDraw= [];
		var b;
		for( b = 0; b < buildings.length; b ++ ){
			var centroid = getPolygonCentroid( buildings[b]["vertex"] );
			buildings[b]["centroid"] = centroid;
			if( centroid.lon < _bbox["minLon"] || centroid.lon > _bbox["maxLon"] || centroid.lat > _bbox["maxLat"] || centroid.lat < _bbox["minLat"] ){
			}else{
				buildingsToDraw.push( buildings[b] );
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
importScripts('oev/utils.js');
importScripts('libs/three.js');

onmessage = function(_evt) {
	var result = precomputeBuildings(_evt.data["json"], _evt.data["bbox"]);
	postMessage(result);
}

var Test = (function(){
	var nb = 0;
	
	var api = {
		pass : function() {
			nb ++;
			console.log('Worker pass 1', nb);
		}
	};
	return api;
})();


// precompute datas from overpass
function precomputeBuildings(_datas, _bbox) {
	// Test.pass();
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
	for (i = 0; i < buildingsJson['elements'].length; i ++) {
		if (buildingsJson['elements'][i]['type'] == 'node') {
			nodes['NODE_'+buildingsJson['elements'][i]['id']] = {
				'lon' : parseFloat(buildingsJson['elements'][i]['lon']), 
				'lat' : parseFloat(buildingsJson['elements'][i]['lat'])
			};
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
			buildings.push({
				'id' : buildingsJson['elements'][i]["id"], 
				"centroid" : 0, 
				"tags" : buildTags, 
				"vertex" : buildVerts
			});
		}
	}
	if (_bbox == undefined) {
		return buildings;
	} else {
		var buildingsToDraw= [];
		for (b = 0; b < buildings.length; b ++) {
			centroid = Oev.Utils.getPolygonCentroid(buildings[b]["vertex"]);
			buildings[b]["centroid"] = centroid;
			if (centroid.lon < _bbox["minLon"] || centroid.lon > _bbox["maxLon"] || centroid.lat > _bbox["maxLat"] || centroid.lat < _bbox["minLat"]) {
			} else {
				buildingsToDraw.push(buildings[b]);
			}
		}
		return buildingsToDraw;
	}
}
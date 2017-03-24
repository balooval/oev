importScripts('../Earcut.js'); 

onmessage = function( evt ) {
	var result = computeBuildings( JSON.parse( evt.data['JSON'] ) );
	postMessage( { 'RES' : result } );
}


function computeBuildings( _datas ) {
	var buildings = [];
	for( var i = 0; i < _datas.length; i ++ ){
		var geoData = _datas[i];
		if( geoData["type"] == "FeatureCollection" ){
			var features = geoData["features"];
			for( var f = 0; f < features.length; f ++ ){
				var feature = features[f];
				if( feature["properties"]["type"] == "buildingPart" ){
					
					var curWalls = { 'vertexCoords' : [], 'faces' : [], 'uvs' : [] };
					var curRoof = { 'vertexCoords' : [], 'faces' : [] };
					
					var buildingLevels = 1;
					var buildingMinLevel = feature["properties"]["minLevel"];
					if( "levels" in feature["properties"] ){
						buildingLevels = parseInt( feature["properties"]["levels"] );
					}
					var buildingHeight = 3 * buildingLevels; // meters
					if( "minHeight" in feature["properties"] ){
						// console.log( "minHeight : " + feature["properties"]["minHeight"] );
					}
					if( "height" in feature["properties"] ){
						buildingHeight = feature["properties"]["height"];
					}
					if( buildingHeight > 10 && buildingLevels == 1 ){
						buildingLevels = Math.round( buildingHeight / 10 );
					}
					var levelHeight = buildingHeight / buildingLevels;
					var JSONGeom = feature["geometry"];
					var coordinates = JSONGeom["coordinates"];
					var vertexsList = coordinates[0];
					var buildingPerimeter = 0;
					var nbFacesInTexture = 7;
					var texturePrct = 1 / nbFacesInTexture;
					var uvsStarts = [];
					if( buildingHeight > 6 ){
						uvsStarts = [ 0 * texturePrct, 1 * texturePrct, 2 * texturePrct ];
					}else{
						uvsStarts = [ 3 * texturePrct, 4 * texturePrct, 5 * texturePrct, 6 * texturePrct ];
					}
					var texturePart = uvsStarts[Math.floor( Math.random() * uvsStarts.length )];
					var uvVertStart = texturePart;
					var uvVertEnd = texturePart + texturePrct;
					var curBuildNbFaces = 0;
					var curRoofVert = [];
					
					for( var l = buildingMinLevel; l < buildingLevels + 1; l ++ ){
						var buildingPerimeter = 0;
						var curLevel = [];
						for( var v = 0; v < vertexsList.length; v ++ ){
							curLevel.push( vertexsList[v] );
							var vertexCoords = vertexsList[v];
							if( l > buildingMinLevel && v > 0 ){
								var prevVertCoords = vertexsList[v-1];
								var wallLen = Math.sqrt( ( ( vertexCoords[0] - prevVertCoords[0] ) * ( vertexCoords[0] - prevVertCoords[0] ) ) + ( ( vertexCoords[1] - prevVertCoords[1] ) * ( vertexCoords[1] - prevVertCoords[1] ) ) );
								wallLen *= 10000;
								buildingPerimeter += wallLen;
								
								var vertexLevel = l - buildingMinLevel;
								var faceVertexIndexA = ( ( vertexsList.length ) * vertexLevel ) + ( v - 1 ); // before me
								var faceVertexIndexB = ( ( vertexsList.length ) * ( vertexLevel - 1 ) ) + ( v - 1 ); // before down me
								var faceVertexIndexC = ( ( vertexsList.length ) * ( vertexLevel - 1 ) ) + v; // down me
								var faceVertexIndexD = ( ( vertexsList.length ) * vertexLevel ) + v; // me
								var faceVertexIndexE = ( ( vertexsList.length ) * vertexLevel ) + ( v - 1 ); // before me
								var faceVertexIndexF = ( ( vertexsList.length ) * ( vertexLevel - 1 ) ) + v ; // down me
								
								curWalls['faces'].push( [faceVertexIndexA, faceVertexIndexB, faceVertexIndexC ] );
								curWalls['faces'].push( [faceVertexIndexD, faceVertexIndexE, faceVertexIndexF ] );
								
								curBuildNbFaces += 2;
								
								curWalls['uvs'].push( { 'index' : curBuildNbFaces-2, 'values' : [ [buildingPerimeter-wallLen, uvVertEnd], [ buildingPerimeter-wallLen, uvVertStart ], [ buildingPerimeter, uvVertStart ] ] } );
								
								curWalls['uvs'].push( { 'index' : curBuildNbFaces-1, 'values' : [ [buildingPerimeter, uvVertEnd ], [ buildingPerimeter-wallLen, uvVertEnd ], [ buildingPerimeter, uvVertStart ] ] } );
							}
							
							if( l == buildingLevels ){
								curRoof['vertexCoords'].push( [ vertexCoords[0], vertexCoords[1] ] );
								curRoofVert.push( vertexCoords[0], vertexCoords[1] );
							}
						}
						curWalls['vertexCoords'].push( curLevel );
					}
					
					
					var curRoofFaces = earcut( curRoofVert, null, 2 );
					for( var r = 0; r < curRoofFaces.length; r += 3 ){
						curRoof['faces'].push( [ curRoofFaces[r], curRoofFaces[r+1], curRoofFaces[r+2] ] );
					}
					
					buildings.push( { 'buildingMinLevel' : buildingMinLevel, 'buildingLevels' : buildingLevels, 'levelHeight' : levelHeight, 'walls' : curWalls, 'roof' : curRoof } );
				}
			}
		}
	}
	return buildings;
}

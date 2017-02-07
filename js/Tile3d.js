var Tile3d = function ( _tile, _tileX, _tileY, _zoom ) {
	this.tile = _tile;
	this.datasLoaded = false;
	this.meshe = undefined;
	this.roofMeshe = undefined;
	this.zoom = _zoom;
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.onStage = true;
	this.datas = undefined;
	
	
	this.myWorker = new Worker( 'js/utils/WorkerTiles3d.js' );
	var _self = this;
	this.myWorker.onmessage = function(event){
		if( _self.onStage ){
			_self.buildFromWorker( event.data['RES'] );
		}
		};
	this.rawDatas = undefined;
}

Tile3d.prototype.useCache = true;

Tile3d.prototype.load = function() {
	if( !this.datasLoaded ){
		OEV.earth.tilesBuildingsMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.tile.distToCam );
	}else{
		// this.construct();
		this.myWorker.postMessage( {'JSON' : this.rawDatas } );
	}
}


Tile3d.prototype.setDatas = function( _datas ) {
	this.datasLoaded = true;
	this.datas = JSON.parse( _datas );
	this.rawDatas = _datas;
	this.myWorker.postMessage( {'JSON' : this.rawDatas } );
	// this.construct();
}


Tile3d.prototype.buildFromWorker = function( _datas ) {
	var buildingsGeometry = new THREE.Geometry();
	buildingsGeometry.dynamic = false;
	buildingsGeometry.faceVertexUvs[0] = [];
	
	var bigRoofGeometry = new THREE.Geometry();
	bigRoofGeometry.faceVertexUvs[0] = [];
	bigRoofGeometry.dynamic = false;
	
	for( var b = 0; b < _datas.length; b ++ ){
		// curWalls = { 'vertexCoords' : [], 'faces' : [], 'uvs' : [] };
		var curBuildingGeometry = new THREE.Geometry();
		curBuildingGeometry.faceVertexUvs[0] = [];
		var walls = _datas[b]['walls'];
		// var levelHeight = 3;
		var levelHeight = _datas[b]['levelHeight'];
		for( var l = 0; l < walls['vertexCoords'].length; l ++ ){
			var curLevel = walls['vertexCoords'][l];
			for( var v = 0; v < curLevel.length; v ++ ){
				var vertexCoords = curLevel[v];
				var ele = this.tile.interpolateEle( vertexCoords[0], vertexCoords[1], true );
				// var vertexPos = OEV.earth.coordToXYZ( vertexCoords[0], vertexCoords[1], ele + ( ( l + _datas[b]['buildingMinLevel'] ) * levelHeight ) );
				var vertexPos = OEV.earth.coordToXYZ( vertexCoords[0], vertexCoords[1], ele + ( l * levelHeight ) + ( _datas[b]['buildingMinLevel'] * levelHeight ) );
				curBuildingGeometry.vertices.push( vertexPos );	
			}
		}
		
		for( var f = 0; f < walls['faces'].length; f ++ ){
			curBuildingGeometry.faces.push( new THREE.Face3( walls['faces'][f][0], walls['faces'][f][1], walls['faces'][f][2] ) );
		}
		
		for( var u = 0; u < walls['uvs'].length; u ++ ){
			curBuildingGeometry.faceVertexUvs[0][u] = [ new THREE.Vector2( walls['uvs'][u]['values'][0][0], walls['uvs'][u]['values'][0][1] ), new THREE.Vector2( walls['uvs'][u]['values'][1][0], walls['uvs'][u]['values'][1][1] ), new THREE.Vector2( walls['uvs'][u]['values'][2][0], walls['uvs'][u]['values'][2][1] ) ];
		}
		
		
		var curBuildingMeshe = new THREE.Mesh( curBuildingGeometry );
		curBuildingMeshe.updateMatrix();
		buildingsGeometry.merge( curBuildingMeshe.geometry, curBuildingMeshe.matrix );
		
		
		var roof = _datas[b]['roof'];
		var curRoofGeometry = new THREE.Geometry();
		curRoofGeometry.faceVertexUvs[0] = [];
		for( var v = 0; v < roof['vertexCoords'].length; v ++ ){
			var vertexCoords = roof['vertexCoords'][v];
			var ele = this.tile.interpolateEle( vertexCoords[0], vertexCoords[1], true );
			var vertexPos = OEV.earth.coordToXYZ( vertexCoords[0], vertexCoords[1], ele + ( levelHeight * _datas[b]['buildingLevels'] ) );
			curRoofGeometry.vertices.push( vertexPos );	
		}
		for( var rf = 0; rf < roof['faces'].length; rf ++ ){
			var facesIndex = roof['faces'][v];
			curRoofGeometry.faces.push( new THREE.Face3( roof['faces'][rf][0], roof['faces'][rf][1], roof['faces'][rf][2] ) );
		}
		
		var roofM = new THREE.Mesh( curRoofGeometry );
		roofM.updateMatrix();
		
		bigRoofGeometry.merge( roofM.geometry, roofM.matrix );
		
	}
	bigRoofGeometry.computeFaceNormals();
	bigRoofGeometry.mergeVertices()
	bigRoofGeometry.computeVertexNormals();
	
	var buffRoof = new THREE.BufferGeometry();
	buffRoof.fromGeometry( bigRoofGeometry );
	bigRoofGeometry.dispose();
	this.roofMeshe = new THREE.Mesh( buffRoof, OEV.earth.buildingsRoofMat );
	this.tile.meshe.add( this.roofMeshe );
	
	
	buildingsGeometry.computeFaceNormals();
	buildingsGeometry.mergeVertices()
	// buildingsGeometry.computeVertexNormals();
	
	var buffBuild = new THREE.BufferGeometry();
	buffBuild.fromGeometry( buildingsGeometry );
	buildingsGeometry.dispose();
	this.meshe = new THREE.Mesh( buffBuild, OEV.earth.buildingsWallMat );
	this.tile.meshe.add( this.meshe );
	OEV.MUST_RENDER = true;
}


Tile3d.prototype.construct = function() {
	var buildingsGeometry = new THREE.Geometry();
	buildingsGeometry.dynamic = false;
	buildingsGeometry.faceVertexUvs[0] = [];
	var bigRoofGeometry = new THREE.Geometry();
	bigRoofGeometry.faceVertexUvs[0] = [];
	bigRoofGeometry.dynamic = false;
	for( var i = 0; i < this.datas.length; i ++ ){
		var geoData = this.datas[i];
		if( geoData["type"] == "FeatureCollection" ){
			var features = geoData["features"];
			for( var f = 0; f < features.length; f ++ ){
				var feature = features[f];
				if( feature["properties"]["type"] == "buildingPart" ){
					var buildingLevels = 1;
					var buildingMinLevel = feature["properties"]["minLevel"];
					if( "levels" in feature["properties"] ){
						buildingLevels = parseInt( feature["properties"]["levels"] );
					}
					var buildingHeight = 3 * buildingLevels; // meters
					if( "minHeight" in feature["properties"] ){
						// debug( "minHeight : " + feature["properties"]["minHeight"] );
					}
					if( "height" in feature["properties"] ){
						buildingHeight = feature["properties"]["height"];
					}
					if( buildingHeight > 10 && buildingLevels == 1 ){
						buildingLevels = Math.round( buildingHeight / 10 );
					}
					/*
					if( "name" in feature["properties"] ){
						if( feature["properties"]["name"] =="Empire State Building" ){
							console.log( geoData );
						}
					}
					*/
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
					
					var curRoofGeometry = new THREE.Geometry();
					curRoofGeometry.faceVertexUvs[0] = [];
					var curBuildingGeometry = new THREE.Geometry();
					curBuildingGeometry.faceVertexUvs[0] = [];
					for( var l = buildingMinLevel; l < buildingLevels + 1; l ++ ){
						var buildingPerimeter = 0;
						for( var v = 0; v < vertexsList.length; v ++ ){
							var vertexCoords = vertexsList[v];
							var ele = this.tile.interpolateEle( vertexCoords[0], vertexCoords[1], true );
							var vertexPos = OEV.earth.coordToXYZ( vertexCoords[0], vertexCoords[1], ele + ( l * levelHeight ) );
							curBuildingGeometry.vertices.push( vertexPos );
							
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
								curBuildingGeometry.faces.push( new THREE.Face3( faceVertexIndexA, faceVertexIndexB, faceVertexIndexC ) );
								curBuildingGeometry.faces.push( new THREE.Face3( faceVertexIndexD, faceVertexIndexE, faceVertexIndexF ) );
								curBuildNbFaces += 2;
								
								curBuildingGeometry.faceVertexUvs[0][curBuildNbFaces-2] = [ new THREE.Vector2( buildingPerimeter-wallLen, uvVertEnd ), new THREE.Vector2( buildingPerimeter-wallLen, uvVertStart ), new THREE.Vector2( buildingPerimeter, uvVertStart ) ];
								curBuildingGeometry.faceVertexUvs[0][curBuildNbFaces-1] = [ new THREE.Vector2( buildingPerimeter, uvVertEnd ), new THREE.Vector2( buildingPerimeter-wallLen, uvVertEnd ), new THREE.Vector2( buildingPerimeter, uvVertStart ) ];
								
							}
							
							if( l == buildingLevels ){
								curRoofGeometry.vertices.push( vertexPos );
								curRoofVert.push( vertexPos.x, vertexPos.z, vertexPos.y );
							}
						}
					}
					
					var curRoofFaces = earcut( curRoofVert, null, 3 );
					for( var r = 0; r < curRoofFaces.length; r += 3 ){
						var curFace = new THREE.Face3( curRoofFaces[r], curRoofFaces[r+1], curRoofFaces[r+2] );
						curFace.color = new THREE.Color("rgb(255,255,255)");
						curRoofGeometry.faces.push( curFace );
						curRoofGeometry.faceVertexUvs[0][( curRoofGeometry.faces.length - 1 )] = [ new THREE.Vector2( 0, 1 ), new THREE.Vector2( 1, 1 ), new THREE.Vector2( 0, 0 ) ];
						
					}
					
					var roofM = new THREE.Mesh( curRoofGeometry );
					roofM.updateMatrix();
					
					bigRoofGeometry.merge( roofM.geometry, roofM.matrix );
				
				
					
					var curBuildingMeshe = new THREE.Mesh( curBuildingGeometry );
					curBuildingMeshe.updateMatrix();
					
					buildingsGeometry.merge( curBuildingMeshe.geometry, curBuildingMeshe.matrix );
				}
			}
			
		}
		
	}
	buildingsGeometry.computeFaceNormals();
	buildingsGeometry.mergeVertices()
	// buildingsGeometry.computeVertexNormals();
	
	bigRoofGeometry.computeFaceNormals();
	bigRoofGeometry.mergeVertices()
	bigRoofGeometry.computeVertexNormals();
	
	var buffBuild = new THREE.BufferGeometry();
	buffBuild.fromGeometry( buildingsGeometry );
	buildingsGeometry.dispose();
	this.meshe = new THREE.Mesh( buffBuild, OEV.earth.buildingsWallMat );
	
	var buffRoof = new THREE.BufferGeometry();
	buffRoof.fromGeometry( bigRoofGeometry );
	bigRoofGeometry.dispose();
	this.roofMeshe = new THREE.Mesh( buffRoof, OEV.earth.buildingsRoofMat );
	this.tile.meshe.add( this.meshe );
	this.tile.meshe.add( this.roofMeshe );
	
	
	this.meshe.receiveShadow = true;
	this.meshe.castShadow = true;
	this.roofMeshe.receiveShadow = true;
	this.roofMeshe.castShadow = true;
	
	OEV.MUST_RENDER = true;
}


Tile3d.prototype.hide = function( _state ) {
	if( _state && this.onStage == true ){
		this.onStage = false;
		if( this.meshe != undefined ){
			this.tile.meshe.remove( this.meshe );
		}
		if( this.roofMeshe != undefined ){
			this.tile.meshe.remove( this.roofMeshe );
		}
		/*
		if( this.datasLoaded ){
			this.tile.meshe.remove( this.meshe );
			this.tile.meshe.remove( this.roofMeshe );
		}
		*/
	}else if( !_state && this.onStage == false ){
		this.onStage = true;
		if( this.datasLoaded ){
			if( this.meshe != undefined ){
				this.tile.meshe.add( this.meshe );
			}
			if( this.roofMeshe != undefined ){
				this.tile.meshe.add( this.roofMeshe );
			}
			// this.tile.meshe.add( this.meshe );
			// this.tile.meshe.add( this.roofMeshe );
		}else{
			this.load();
		}
	}
}


Tile3d.prototype.dispose = function() {
	this.myWorker.terminate();
	// Tile3d.prototype.tilesByKey[this.zoom+'/'+this.tileX+'/'+this.tileY] = undefined;
	// delete Tile3d.prototype.tilesByKey[this.zoom+'/'+this.tileX+'/'+this.tileY];
	
	if( !this.datasLoaded ){
		OEV.earth.tilesBuildingsMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
	}
	// this.tile.meshe.remove( this.meshe );
	// this.tile.meshe.remove( this.roofMeshe );
	this.hide( true );
	
	if( this.meshe != undefined ){
		this.meshe.geometry.dispose();
		this.meshe.geometry = undefined;
		this.meshe = undefined;
	}
	if( this.roofMeshe != undefined ){
		this.roofMeshe.geometry.dispose();
		this.roofMeshe.geometry = undefined;
		this.roofMeshe = undefined;
	}
}
var TileBuildings = function ( _geoTile, _tileX, _tileY, _zoom ) {
	this.geoTile = _geoTile;
	this.datasLoaded = false;
	this.zoom = _zoom;
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.onStage = true;
	this.datas = undefined;
	this.meshe = undefined;
	// this.roofMeshe = undefined;
	
	this.geometry = undefined;
}


TileBuildings.prototype.makeLabel = function( _text, _coords ) {
	// create a canvas element
	// var canvas1 = document.createElement('canvas');
	
	var tmpCanvas = document.createElement('canvas');
	tmpCanvas.width = 256;
	tmpCanvas.height = 64;
	var context1 = tmpCanvas.getContext('2d');
	context1.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
	context1.font = "30px Arial";
	
	context1.strokeStyle = 'black';
    context1.lineWidth = 2;
	// context1.textAlign="center";
    context1.strokeText( _text, 0, 30, tmpCanvas.width );
    context1.fillStyle = 'white';
	// context1.textAlign="center";
    context1.fillText( _text, 0, 30, tmpCanvas.width );
    
	// canvas contents will be used for a texture
	var texture1 = new THREE.Texture( tmpCanvas ) 
	texture1.needsUpdate = true;
	texture1.magFilter = THREE.NearestFilter;
	texture1.minFilter = THREE.NearestFilter;
	
	var labelMat = new THREE.SpriteMaterial( { map: texture1, color: 0xffffff, fog: false } );
    labelMat.transparent = true;
	
	var labelSprite = new THREE.Sprite( labelMat );
	
	var pos = OEV.earth.coordToXYZ( _coords.lon, _coords.lat, 10 );
	labelSprite.position.x = pos.x;
	labelSprite.position.y = pos.y;
	labelSprite.position.z = pos.z;
		
	OEV.scene.add( labelSprite );
}

TileBuildings.prototype.load = function() {
	if( !this.datasLoaded ){
		OEV.earth.tilesBuildingsMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.geoTile.distToCam );
	}else{
		this.construct();
	}
}


TileBuildings.prototype.setDatas = function( _datas ) {
	this.datasLoaded = true;
	this.datas = _datas;
	// this.filterBBox();
	this.construct();
}



TileBuildings.exculdedId = [23762981, 19441489, 201247295, 150335048, 309413981, 249003371];
TileBuildings.worker = new Worker( DEV+"js/WorkerBuildings.js" );




TileBuildings.prototype.makeRoof = function( _pts, _params, _tags ) {
	var heightOffset = 0;
	var nbGeoVert = this.geometry.vertices.length;
	
	var roofColor = new THREE.Color("rgb(255, 255, 255)");
	if( _params['roofColor'] != '' ){
		if( _params['roofColor'].indexOf( "#" ) == 0 ){
			roofColor = new THREE.Color(""+_params['roofColor']+"");
		}else{
			var color = this.getColorByName( _params['roofColor'] );
			if( color == undefined ){
				if( _params['roofColor'].length == 6 ){
					roofColor = new THREE.Color("#"+_params['roofColor']+"");
				}
			}else{
				roofColor = new THREE.Color("rgb("+color[0]+", "+color[1]+", "+color[2]+")");
			}
		}
	}

	
	if( _params['roofShape'] == 'pyramidal' ){
		if( _params['roofHeight'] == 0 ){
			_params['roofHeight'] = 10;
		}
		var roofVertShape = [];
		for( var i = 0; i < _pts.length; i ++ ){
			roofVertShape.push( [_pts[i]['lon'], _pts[i]['lat']] );
			var ele = this.geoTile.interpolateEle( _pts[i]['lon'], _pts[i]['lat'], true );
			var pos = OEV.earth.coordToXYZ( _pts[i]['lon'], _pts[i]['lat'], ele + _params['height'] );
			this.geometry.vertices.push( pos );
		}
		var centroid = findCentroid( roofVertShape );
		var ele = this.geoTile.interpolateEle( centroid.lon, centroid.lat, true );
		var cenroidPos = OEV.earth.coordToXYZ( centroid.lon, centroid.lat, ele + _params['height'] + _params['roofHeight'] );
		this.geometry.vertices.push( cenroidPos );
		var lastVertId = this.geometry.vertices.length - 1;
		for( var i = 0; i < _pts.length - 1; i ++ ){
			var curFace = new THREE.Face3( 
				nbGeoVert + i,
				nbGeoVert + i + 1, // avant moi
				lastVertId
			);
			curFace.color = roofColor;
			this.geometry.faces.push( curFace );
		}

	}else if( _params['roofShape'] == 'dome' ){
		var roofVertShape = [];
		for( var i = 0; i < _pts.length; i ++ ){
			roofVertShape.push( [_pts[i]['lon'], _pts[i]['lat']] );
		}
		var centroid = findCentroid( roofVertShape );
		var shapeVertDatas = [];
		var cenroidPos = OEV.earth.coordToXYZ( centroid.lon, centroid.lat, _params['height'] );
		var nbSlices = 4;
		var curAngleSlope = 0;
		var slopeStep = ( Math.PI / 2 ) / nbSlices;
		var distMax = 0;
		for( var rv = 0; rv < roofVertShape.length; rv ++ ){
			var shapeVertPos = OEV.earth.coordToXYZ( roofVertShape[rv][0], roofVertShape[rv][1], _params['height'] );
			var shapeVertDist = Math.sqrt( ( shapeVertPos.x - cenroidPos.x ) * ( shapeVertPos.x - cenroidPos.x ) + ( shapeVertPos.z - cenroidPos.z ) * ( shapeVertPos.z - cenroidPos.z ) );
			shapeVertDatas.push( { 'DIST' : shapeVertDist, 'OFFX' : cenroidPos.x - shapeVertPos.x, 'OFFY' : cenroidPos.z - shapeVertPos.z } );
			if( shapeVertDist > distMax ){
				distMax = shapeVertDist;
			}
		}
		var highestPos = cenroidPos.y - distMax;
		heightOffset = OEV.earth.altitudeFromPos( highestPos );
		heightOffset -= _params['height']
		var ele = this.geoTile.interpolateEle( centroid.lon, centroid.lat, true );
		cenroidPos = OEV.earth.coordToXYZ( centroid.lon, centroid.lat, ele + _params['height'] - heightOffset );
		for( var rs = 0; rs < nbSlices; rs ++ ){
			for( var p = 0; p < shapeVertDatas.length; p ++ ){
				var vertexPos = new THREE.Vector3( 
					cenroidPos.x - ( shapeVertDatas[p]['OFFX'] * Math.cos( curAngleSlope ) ), 
					cenroidPos.y - ( Math.sin( curAngleSlope ) * shapeVertDatas[p]['DIST'] ), 
					cenroidPos.z - ( shapeVertDatas[p]['OFFY'] * Math.cos( curAngleSlope ) ) 
				);
				this.geometry.vertices.push( vertexPos );
				if( p > 0 && rs < nbSlices - 1 ){
					var curFaceA = new THREE.Face3( 
						nbGeoVert + ( rs * roofVertShape.length ) + p, // dessous
						nbGeoVert + ( ( rs + 1 ) * roofVertShape.length ) + p, // moi
						nbGeoVert + ( rs * roofVertShape.length ) + ( p - 1 ) ); // dessous avant
					curFaceA.color = roofColor;
					this.geometry.faces.push( curFaceA );
					var curFaceB = new THREE.Face3( 
						nbGeoVert + ( ( rs + 1 ) * roofVertShape.length ) + p, // moi
						nbGeoVert + ( ( rs + 1 ) * roofVertShape.length ) + ( p - 1 ), // avant moi
						nbGeoVert + ( rs * roofVertShape.length ) + ( p - 1 )  // dessous avant
						);
					curFaceB.color = roofColor;
					this.geometry.faces.push( curFaceB );
				}
			}
			curAngleSlope += slopeStep;
		}
		var vertexPos = new THREE.Vector3( 
			cenroidPos.x, 
			cenroidPos.y - distMax, 
			cenroidPos.z 
		);
		this.geometry.vertices.push( vertexPos );
		for( var p = 0; p < shapeVertDatas.length; p ++ ){
			if( p > 0 ){
				var curFaceC = new THREE.Face3( 
					nbGeoVert + ( ( nbSlices - 1 ) * roofVertShape.length ) + p, // dessous
					( this.geometry.vertices.length - 1 ), // moi
					nbGeoVert + ( ( nbSlices - 1 ) * roofVertShape.length ) + ( p - 1 ) ); // dessous avant
				curFaceC.color = roofColor;
				this.geometry.faces.push( curFaceC );
			}
		}
		
		
		
	}else{ // flat
		var roofVert = [];
		for( var i = 0; i < _pts.length; i ++ ){
			var ele = this.geoTile.interpolateEle( _pts[i]['lon'], _pts[i]['lat'], true );
			var pos = OEV.earth.coordToXYZ( _pts[i]['lon'], _pts[i]['lat'], ele + _params['height'] );
			roofVert.push( pos.x, pos.z, pos.y );
			this.geometry.vertices.push( pos );
		}
		var roofFaces = earcut( roofVert, null, 3 );
		for( var r = 0; r < roofFaces.length; r += 3 ){
			var curFace = new THREE.Face3( 
				nbGeoVert + roofFaces[r], 
				nbGeoVert + roofFaces[r+1], 
				nbGeoVert + roofFaces[r+2] 
			);
			curFace.color = roofColor;
			this.geometry.faces.push( curFace );
		}
		
	}
	return { 'heightOffset': heightOffset };
}


TileBuildings.prototype.makeWalls = function( _pts, _params ) {
	var wallColor;
	if( _params['wallsColor'] == '' ){
		wallColor = new THREE.Color("rgb(255, 255, 255)");
	}else if( _params['wallsColor'].indexOf( "#" ) == 0 ){
		wallColor = new THREE.Color(""+_params['wallsColor']+"");
	}else{
		var color = this.getColorByName( _params['wallsColor'] );
		if( color == undefined ){
			if( _params['wallsColor'].length == 6 ){
				wallColor = new THREE.Color("#"+_params['wallsColor']+"");
			}
		}else{
			wallColor = new THREE.Color("rgb("+color[0]+", "+color[1]+", "+color[2]+")");
		}
	}
			
	var vertLonA = undefined;
	var vertLatA = undefined;
	var nbVert = this.geometry.vertices.length;
	for( var curLevel = _params['minLevels']; curLevel < _params['levels']; curLevel ++ ){
		for( var c = 0; c < _pts.length; c ++ ){
			if( vertLonA != undefined ){
				var eleA = this.geoTile.interpolateEle( vertLonA, vertLatA, true );
				var coordsWorldA = OEV.earth.coordToXYZ( vertLonA, vertLatA, eleA + ( curLevel * _params['levelHeight'] ) + _params['minHeight'] );
				this.geometry.vertices.push( coordsWorldA );
				var coordsWorldB = OEV.earth.coordToXYZ( vertLonA, vertLatA, eleA + ( curLevel * _params['levelHeight'] ) + _params['minHeight'] + _params['levelHeight'] );
				this.geometry.vertices.push( coordsWorldB );
				var vertLonC = _pts[c]['lon'];
				var vertLatC = _pts[c]['lat'];
				var eleC = this.geoTile.interpolateEle( vertLonC, vertLatC, true );
				var coordsWorldC = OEV.earth.coordToXYZ( vertLonC, vertLatC, eleC + ( curLevel * _params['levelHeight'] ) + _params['minHeight'] + _params['levelHeight'] );
				this.geometry.vertices.push( coordsWorldC );
				var coordsWorldD = OEV.earth.coordToXYZ( vertLonC, vertLatC, eleC + ( curLevel * _params['levelHeight'] ) + _params['minHeight'] );
				this.geometry.vertices.push( coordsWorldD );
				var wallFaceA = new THREE.Face3( nbVert + 2, nbVert + 1, nbVert + 0 );
				wallFaceA.color = wallColor;
				this.geometry.faces.push( wallFaceA );
				var wallFaceB = new THREE.Face3( nbVert + 0, nbVert + 3, nbVert + 2 );
				this.geometry.faces.push( wallFaceB );
				nbVert += 4;
			}
			vertLonA = _pts[c]['lon'];
			vertLatA = _pts[c]['lat'];
		}
	}
}
TileBuildings.prototype.filterBBox = function() {
	// debug( 'filterBBox ' + this.zoom + ' / ' + this.tileX + ' / ' + this.tileY );
	// debug( '        ' + this.geoTile.zoom + ' / ' + this.geoTile.tileX + ' / ' + this.geoTile.tileY );
	var buildingsToDraw= [];
	
	var startCoord = Oev.Utils.tileToCoords( this.tileX, this.tileY, this.zoom );
	var endCoord = Oev.Utils.tileToCoords( this.tileX + 1, this.tileY + 1, this.zoom );
	
	var bbox = { 
		"minLon" : startCoord.x, 
		"maxLon" : endCoord.x, 
		"minLat" : endCoord.y, 
		"maxLat" : startCoord.y
	};
	var b;
	for( b = 0; b < this.datas.length; b ++ ){
		var centroid = Oev.Utils.getPolygonCentroid( this.datas[b]["vertex"] );
		this.datas[b]["centroid"] = centroid;
		if( centroid.lon < bbox["minLon"] || centroid.lon > bbox["maxLon"] || centroid.lat > bbox["maxLat"] || centroid.lat < bbox["minLat"] ){
			// debug( 'filterBBox OUT ' + this.geoTile.zoom );
		}else{
			buildingsToDraw.push( this.datas[b] );
		}
	}
	this.datas = buildingsToDraw;
}
TileBuildings.prototype.construct = function() {
	if( this.onStage ){
		this.geometry = new THREE.Geometry();
		this.geometry.dynamic = false;

		for( b = 0; b < this.datas.length; b ++ ){
			var curBuilding = this.datas[b];
			
			var buildingParams = {
				'minHeight' : 0, 
				'height' : 3, 
				'minLevels' : 0, 
				'levels' : 1, 
				'levelHeight' : 0, 
				'roofShape' : 'flat', 
				'roofHeight' : 0, 
				'wallsColor' : '', 
				'roofColor' : '' 
			};

			var curName = '';
			var drawBuilding = true;

			
			if( curBuilding['tags'] == undefined ){
				curBuilding['tags'] = {};
			}
			if( "building:part" in curBuilding["tags"] ){
				if( curBuilding["tags"]["building:part"] == "no" ){
					drawBuilding = false;
				}
			}else if( TileBuildings.exculdedId.indexOf( curBuilding["id"] ) >= 0 ){
				// debug( 'Excluded building : ' + curBuilding["id"] );
				drawBuilding = false;
			}
			
			if( "roof:height" in curBuilding["tags"] ){
				buildingParams['roofHeight'] = parseFloat( curBuilding["tags"]['roof:height'] );
			}
			if( "roof:shape" in curBuilding["tags"] ){
				buildingParams['roofShape'] = curBuilding["tags"]["roof:shape"];
			}
			
			if( "roof:colour" in curBuilding["tags"] ){
				buildingParams['roofColor'] = curBuilding["tags"]["roof:colour"];
			}
			
			if( "building:colour" in curBuilding["tags"] ){
				buildingParams['wallsColor'] = curBuilding["tags"]["building:colour"];
			}
			if( "building:facade:colour" in curBuilding["tags"] ){
				buildingParams['wallsColor'] = curBuilding["tags"]["building:facade:colour"];
			}
			
			if( "name" in curBuilding["tags"] ){
				curName = curBuilding["tags"]["name"];
			}
			
			if( "min_height" in curBuilding["tags"] ){
				buildingParams['minHeight'] = parseFloat( curBuilding["tags"]["min_height"] );
			}
			
			if( "building:levels" in curBuilding["tags"] ){
				buildingParams['levels'] = parseInt( curBuilding["tags"]["building:levels"] );
			}
			
			if( "building:min_level" in curBuilding["tags"] ){
				buildingParams['minLevels'] = parseInt( curBuilding["tags"]["building:min_level"] );
				buildingParams['minHeight'] = 0;
			}
			
			if( "height" in curBuilding["tags"] ){
				curBuilding["tags"]["height"].replace("m", "");
				curBuilding["tags"]["height"].replace(" ", "");
				buildingParams['height'] = parseFloat( curBuilding["tags"]["height"] );
			}else{
				buildingParams['height'] = buildingParams['levels'] * 3;
			}
			
			buildingParams['levelHeight'] = ( buildingParams['height'] - buildingParams['minHeight'] ) / buildingParams['levels'];
			
			
			
			/*
			if( drawBuilding ){
				var tmp = [];
				for( var c = 0; c < curBuilding["vertex"].length; c ++ ){
					tmp.push( [ curBuilding["vertex"][c]['lon'], curBuilding["vertex"][c]['lat'] ] );
				}
				drawBuilding = false;
				if( Oev.Math.ptIsInPolygon( tmp, 2.2358933, 48.8925554 ) ){
					drawBuilding = true;
				}
			}
			*/
			
			
			if( drawBuilding ){
				var roofDatas = this.makeRoof( curBuilding["vertex"], buildingParams, curBuilding["tags"] );
				buildingParams['height'] -= roofDatas['heightOffset'];
				buildingParams['levelHeight'] = ( buildingParams['height'] - buildingParams['minHeight'] ) / buildingParams['levels'];
				this.makeWalls( curBuilding["vertex"], buildingParams );
			}
		}
		
		this.geometry.computeFaceNormals();
		this.geometry.computeVertexNormals();
		this.geometry.colorsNeedUpdate = true
		
		this.meshe = new THREE.Mesh( new THREE.BufferGeometry().fromGeometry( this.geometry ), OEV.earth.buildingsWallMat );
		this.geometry.dispose();
		this.geometry = undefined;
		
		this.geoTile.meshe.add( this.meshe );
		this.meshe.receiveShadow = true;
		this.meshe.castShadow = true;
		
		OEV.MUST_RENDER = true;
	}
}

function findCentroid( pts ){
	nPts = pts.length;
    var off = pts[0];
    var twicearea = 0;
    var x = 0;
    var y = 0;
    var p1,p2;
    var f;
    for (var i = 0, j = nPts - 1; i < nPts; j = i++) {
        p1 = pts[i];
        p2 = pts[j];
        f = (p1[1] - off[1]) * (p2[0] - off[0]) - (p2[1] - off[1]) * (p1[0] - off[0]);
        twicearea += f;
        x += (p1[1] + p2[1] - 2 * off[1]) * f;
        y += (p1[0] + p2[0] - 2 * off[0]) * f;
    }
    f = twicearea * 3;
    return {
    lat: x / f + off[1],
    lon: y / f + off[0]
    };
}


TileBuildings.prototype.hide = function( _state ) {
	if( _state && this.onStage == true ){
		this.onStage = false;
		if( this.datasLoaded ){
			if( this.meshe != undefined ){
				this.geoTile.meshe.remove( this.meshe );
			}
		}
	}else if( !_state && this.onStage == false ){
		this.onStage = true;
		if( this.datasLoaded ){
			if( this.meshe != undefined ){
				this.geoTile.meshe.add( this.meshe );
			}
		}else{
			this.load();
		}
	}
}



TileBuildings.prototype.dispose = function() {
	this.hide( true );
	if( !this.datasLoaded ){
		OEV.earth.tilesBuildingsMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
	}
	for( var type in this.partMeshes ){
		if( !this.partMeshes.hasOwnProperty( type ) ) continue;
		if( this.partMeshes[type] != undefined ){
			this.partMeshes[type].geometry.dispose();
			OEV.scene.remove( this.partMeshes[type] );
		}
	}
	if( this.meshe != undefined ){
		this.meshe.geometry.dispose();
		this.meshe = undefined;
	}
}




TileBuildings.prototype.getColorByName = function( _name ) {
	var colorsNames = [
		"alice blue", 
		"aliceblue", 
		"antique white", 
		"antiquewhite", 
		"antiquewhite1", 
		"antiquewhite2", 
		"antiquewhite3", 
		"antiquewhite4", 
		"aqua", 
		"aquamarine", 
		"aquamarine1", 
		"aquamarine2", 
		"aquamarine3", 
		"aquamarine4", 
		"azure", 
		"azure1", 
		"azure2", 
		"azure3", 
		"azure4", 
		"beige", 
		"bisque", 
		"bisque1", 
		"bisque2", 
		"bisque3", 
		"bisque4", 
		"black", 
		"blanched almond", 
		"blanchedalmond", 
		"blue", 
		"blue violet", 
		"blue1", 
		"blue2", 
		"blue3", 
		"blue4", 
		"blueviolet", 
		"brown", 
		"brown1", 
		"brown2", 
		"brown3", 
		"brown4", 
		"burlywood", 
		"burlywood1", 
		"burlywood2", 
		"burlywood3", 
		"burlywood4", 
		"cadet blue", 
		"cadetblue", 
		"cadetblue1", 
		"cadetblue2", 
		"cadetblue3", 
		"cadetblue4", 
		"chartreuse", 
		"chartreuse1", 
		"chartreuse2", 
		"chartreuse3", 
		"chartreuse4", 
		"chocolate", 
		"chocolate1", 
		"chocolate2", 
		"chocolate3", 
		"chocolate4", 
		"coral", 
		"coral1", 
		"coral2", 
		"coral3", 
		"coral4", 
		"cornflower blue", 
		"cornflowerblue", 
		"cornsilk", 
		"cornsilk1", 
		"cornsilk2", 
		"cornsilk3", 
		"cornsilk4", 
		"crimson", 
		"cyan", 
		"cyan1", 
		"cyan2", 
		"cyan3", 
		"cyan4", 
		"dark blue", 
		"dark cyan", 
		"dark goldenrod", 
		"dark gray", 
		"dark green", 
		"dark grey", 
		"dark khaki", 
		"dark magenta", 
		"dark olive green", 
		"dark orange", 
		"dark orchid", 
		"dark red", 
		"dark salmon", 
		"dark sea green", 
		"dark slate blue", 
		"dark slate gray", 
		"dark slate grey", 
		"dark turquoise", 
		"dark violet", 
		"darkblue", 
		"darkcyan", 
		"darkgoldenrod", 
		"darkgoldenrod1", 
		"darkgoldenrod2", 
		"darkgoldenrod3", 
		"darkgoldenrod4", 
		"darkgray", 
		"darkgreen", 
		"darkgrey", 
		"darkkhaki", 
		"darkmagenta", 
		"darkolivegreen", 
		"darkolivegreen1", 
		"darkolivegreen2", 
		"darkolivegreen3", 
		"darkolivegreen4", 
		"darkorange", 
		"darkorange1", 
		"darkorange2", 
		"darkorange3", 
		"darkorange4", 
		"darkorchid", 
		"darkorchid1", 
		"darkorchid2", 
		"darkorchid3", 
		"darkorchid4", 
		"darkred", 
		"darksalmon", 
		"darkseagreen", 
		"darkseagreen1", 
		"darkseagreen2", 
		"darkseagreen3", 
		"darkseagreen4", 
		"darkslateblue", 
		"darkslategray", 
		"darkslategray1", 
		"darkslategray2", 
		"darkslategray3", 
		"darkslategray4", 
		"darkslategrey", 
		"darkturquoise", 
		"darkviolet", 
		"deep pink", 
		"deep sky blue", 
		"deeppink", 
		"deeppink1", 
		"deeppink2", 
		"deeppink3", 
		"deeppink4", 
		"deepskyblue", 
		"deepskyblue1", 
		"deepskyblue2", 
		"deepskyblue3", 
		"deepskyblue4", 
		"dim gray", 
		"dim grey", 
		"dimgray", 
		"dimgrey", 
		"dodger blue", 
		"dodgerblue", 
		"dodgerblue1", 
		"dodgerblue2", 
		"dodgerblue3", 
		"dodgerblue4", 
		"firebrick", 
		"firebrick1", 
		"firebrick2", 
		"firebrick3", 
		"firebrick4", 
		"floral white", 
		"floralwhite", 
		"forest green", 
		"forestgreen", 
		"fuchsia", 
		"gainsboro", 
		"ghost white", 
		"ghostwhite", 
		"gold", 
		"gold1", 
		"gold2", 
		"gold3", 
		"gold4", 
		"goldenrod", 
		"goldenrod1", 
		"goldenrod2", 
		"goldenrod3", 
		"goldenrod4", 
		"gray", 
		"gray0", 
		"gray1", 
		"gray10", 
		"gray100", 
		"gray11", 
		"gray12", 
		"gray13", 
		"gray14", 
		"gray15", 
		"gray16", 
		"gray17", 
		"gray18", 
		"gray19", 
		"gray2", 
		"gray20", 
		"gray21", 
		"gray22", 
		"gray23", 
		"gray24", 
		"gray25", 
		"gray26", 
		"gray27", 
		"gray28", 
		"gray29", 
		"gray3", 
		"gray30", 
		"gray31", 
		"gray32", 
		"gray33", 
		"gray34", 
		"gray35", 
		"gray36", 
		"gray37", 
		"gray38", 
		"gray39", 
		"gray4", 
		"gray40", 
		"gray41", 
		"gray42", 
		"gray43", 
		"gray44", 
		"gray45", 
		"gray46", 
		"gray47", 
		"gray48", 
		"gray49", 
		"gray5", 
		"gray50", 
		"gray51", 
		"gray52", 
		"gray53", 
		"gray54", 
		"gray55", 
		"gray56", 
		"gray57", 
		"gray58", 
		"gray59", 
		"gray6", 
		"gray60", 
		"gray61", 
		"gray62", 
		"gray63", 
		"gray64", 
		"gray65", 
		"gray66", 
		"gray67", 
		"gray68", 
		"gray69", 
		"gray7", 
		"gray70", 
		"gray71", 
		"gray72", 
		"gray73", 
		"gray74", 
		"gray75", 
		"gray76", 
		"gray77", 
		"gray78", 
		"gray79", 
		"gray8", 
		"gray80", 
		"gray81", 
		"gray82", 
		"gray83", 
		"gray84", 
		"gray85", 
		"gray86", 
		"gray87", 
		"gray88", 
		"gray89", 
		"gray9", 
		"gray90", 
		"gray91", 
		"gray92", 
		"gray93", 
		"gray94", 
		"gray95", 
		"gray96", 
		"gray97", 
		"gray98", 
		"gray99", 
		"green", 
		"green yellow", 
		"green1", 
		"green2", 
		"green3", 
		"green4", 
		"greenyellow", 
		"grey", 
		"grey0", 
		"grey1", 
		"grey10", 
		"grey100", 
		"grey11", 
		"grey12", 
		"grey13", 
		"grey14", 
		"grey15", 
		"grey16", 
		"grey17", 
		"grey18", 
		"grey19", 
		"grey2", 
		"grey20", 
		"grey21", 
		"grey22", 
		"grey23", 
		"grey24", 
		"grey25", 
		"grey26", 
		"grey27", 
		"grey28", 
		"grey29", 
		"grey3", 
		"grey30", 
		"grey31", 
		"grey32", 
		"grey33", 
		"grey34", 
		"grey35", 
		"grey36", 
		"grey37", 
		"grey38", 
		"grey39", 
		"grey4", 
		"grey40", 
		"grey41", 
		"grey42", 
		"grey43", 
		"grey44", 
		"grey45", 
		"grey46", 
		"grey47", 
		"grey48", 
		"grey49", 
		"grey5", 
		"grey50", 
		"grey51", 
		"grey52", 
		"grey53", 
		"grey54", 
		"grey55", 
		"grey56", 
		"grey57", 
		"grey58", 
		"grey59", 
		"grey6", 
		"grey60", 
		"grey61", 
		"grey62", 
		"grey63", 
		"grey64", 
		"grey65", 
		"grey66", 
		"grey67", 
		"grey68", 
		"grey69", 
		"grey7", 
		"grey70", 
		"grey71", 
		"grey72", 
		"grey73", 
		"grey74", 
		"grey75", 
		"grey76", 
		"grey77", 
		"grey78", 
		"grey79", 
		"grey8", 
		"grey80", 
		"grey81", 
		"grey82", 
		"grey83", 
		"grey84", 
		"grey85", 
		"grey86", 
		"grey87", 
		"grey88", 
		"grey89", 
		"grey9", 
		"grey90", 
		"grey91", 
		"grey92", 
		"grey93", 
		"grey94", 
		"grey95", 
		"grey96", 
		"grey97", 
		"grey98", 
		"grey99", 
		"honeydew", 
		"honeydew1", 
		"honeydew2", 
		"honeydew3", 
		"honeydew4", 
		"hot pink", 
		"hotpink", 
		"hotpink1", 
		"hotpink2", 
		"hotpink3", 
		"hotpink4", 
		"indian red", 
		"indianred", 
		"indianred1", 
		"indianred2", 
		"indianred3", 
		"indianred4", 
		"indigo", 
		"ivory", 
		"ivory1", 
		"ivory2", 
		"ivory3", 
		"ivory4", 
		"khaki", 
		"khaki1", 
		"khaki2", 
		"khaki3", 
		"khaki4", 
		"lavender", 
		"lavender blush", 
		"lavenderblush", 
		"lavenderblush1", 
		"lavenderblush2", 
		"lavenderblush3", 
		"lavenderblush4", 
		"lawn green", 
		"lawngreen", 
		"lemon chiffon", 
		"lemonchiffon", 
		"lemonchiffon1", 
		"lemonchiffon2", 
		"lemonchiffon3", 
		"lemonchiffon4", 
		"light blue", 
		"light coral", 
		"light cyan", 
		"light goldenrod", 
		"light goldenrod yellow", 
		"light gray", 
		"light green", 
		"light grey", 
		"light pink", 
		"light salmon", 
		"light sea green", 
		"light sky blue", 
		"light slate blue", 
		"light slate gray", 
		"light slate grey", 
		"light steel blue", 
		"light yellow", 
		"lightblue", 
		"lightblue1", 
		"lightblue2", 
		"lightblue3", 
		"lightblue4", 
		"lightcoral", 
		"lightcyan", 
		"lightcyan1", 
		"lightcyan2", 
		"lightcyan3", 
		"lightcyan4", 
		"lightgoldenrod", 
		"lightgoldenrod1", 
		"lightgoldenrod2", 
		"lightgoldenrod3", 
		"lightgoldenrod4", 
		"lightgoldenrodyellow", 
		"lightgray", 
		"lightgreen", 
		"lightgrey", 
		"lightpink", 
		"lightpink1", 
		"lightpink2", 
		"lightpink3", 
		"lightpink4", 
		"lightsalmon", 
		"lightsalmon1", 
		"lightsalmon2", 
		"lightsalmon3", 
		"lightsalmon4", 
		"lightseagreen", 
		"lightskyblue", 
		"lightskyblue1", 
		"lightskyblue2", 
		"lightskyblue3", 
		"lightskyblue4", 
		"lightslateblue", 
		"lightslategray", 
		"lightslategrey", 
		"lightsteelblue", 
		"lightsteelblue1", 
		"lightsteelblue2", 
		"lightsteelblue3", 
		"lightsteelblue4", 
		"lightyellow", 
		"lightyellow1", 
		"lightyellow2", 
		"lightyellow3", 
		"lightyellow4", 
		"lime", 
		"lime green", 
		"limegreen", 
		"linen", 
		"magenta", 
		"magenta1", 
		"magenta2", 
		"magenta3", 
		"magenta4", 
		"maroon", 
		"maroon1", 
		"maroon2", 
		"maroon3", 
		"maroon4", 
		"medium aquamarine", 
		"medium blue", 
		"medium orchid", 
		"medium purple", 
		"medium sea green", 
		"medium slate blue", 
		"medium spring green", 
		"medium turquoise", 
		"medium violet red", 
		"mediumaquamarine", 
		"mediumblue", 
		"mediumorchid", 
		"mediumorchid1", 
		"mediumorchid2", 
		"mediumorchid3", 
		"mediumorchid4", 
		"mediumpurple", 
		"mediumpurple1", 
		"mediumpurple2", 
		"mediumpurple3", 
		"mediumpurple4", 
		"mediumseagreen", 
		"mediumslateblue", 
		"mediumspringgreen", 
		"mediumturquoise", 
		"mediumvioletred", 
		"midnight blue", 
		"midnightblue", 
		"mint cream", 
		"mintcream", 
		"misty rose", 
		"mistyrose", 
		"mistyrose1", 
		"mistyrose2", 
		"mistyrose3", 
		"mistyrose4", 
		"moccasin", 
		"navajo white", 
		"navajowhite", 
		"navajowhite1", 
		"navajowhite2", 
		"navajowhite3", 
		"navajowhite4", 
		"navy", 
		"navy blue", 
		"navyblue", 
		"old lace", 
		"oldlace", 
		"olive", 
		"olive drab", 
		"olivedrab", 
		"olivedrab1", 
		"olivedrab2", 
		"olivedrab3", 
		"olivedrab4", 
		"orange", 
		"orange red", 
		"orange1", 
		"orange2", 
		"orange3", 
		"orange4", 
		"orangered", 
		"orangered1", 
		"orangered2", 
		"orangered3", 
		"orangered4", 
		"orchid", 
		"orchid1", 
		"orchid2", 
		"orchid3", 
		"orchid4", 
		"pale goldenrod", 
		"pale green", 
		"pale turquoise", 
		"pale violet red", 
		"palegoldenrod", 
		"palegreen", 
		"palegreen1", 
		"palegreen2", 
		"palegreen3", 
		"palegreen4", 
		"paleturquoise", 
		"paleturquoise1", 
		"paleturquoise2", 
		"paleturquoise3", 
		"paleturquoise4", 
		"palevioletred", 
		"palevioletred1", 
		"palevioletred2", 
		"palevioletred3", 
		"palevioletred4", 
		"papaya whip", 
		"papayawhip", 
		"peach puff", 
		"peachpuff", 
		"peachpuff1", 
		"peachpuff2", 
		"peachpuff3", 
		"peachpuff4", 
		"peru", 
		"pink", 
		"pink1", 
		"pink2", 
		"pink3", 
		"pink4", 
		"plum", 
		"plum1", 
		"plum2", 
		"plum3", 
		"plum4", 
		"powder blue", 
		"powderblue", 
		"purple", 
		"purple1", 
		"purple2", 
		"purple3", 
		"purple4", 
		"rebecca purple", 
		"rebeccapurple", 
		"red", 
		"red1", 
		"red2", 
		"red3", 
		"red4", 
		"rosy brown", 
		"rosybrown", 
		"rosybrown1", 
		"rosybrown2", 
		"rosybrown3", 
		"rosybrown4", 
		"royal blue", 
		"royalblue", 
		"royalblue1", 
		"royalblue2", 
		"royalblue3", 
		"royalblue4", 
		"saddle brown", 
		"saddlebrown", 
		"salmon", 
		"salmon1", 
		"salmon2", 
		"salmon3", 
		"salmon4", 
		"sandy brown", 
		"sandybrown", 
		"sea green", 
		"seagreen", 
		"seagreen1", 
		"seagreen2", 
		"seagreen3", 
		"seagreen4", 
		"seashell", 
		"seashell1", 
		"seashell2", 
		"seashell3", 
		"seashell4", 
		"sienna", 
		"sienna1", 
		"sienna2", 
		"sienna3", 
		"sienna4", 
		"silver", 
		"sky blue", 
		"skyblue", 
		"skyblue1", 
		"skyblue2", 
		"skyblue3", 
		"skyblue4", 
		"slate blue", 
		"slate gray", 
		"slate grey", 
		"slateblue", 
		"slateblue1", 
		"slateblue2", 
		"slateblue3", 
		"slateblue4", 
		"slategray", 
		"slategray1", 
		"slategray2", 
		"slategray3", 
		"slategray4", 
		"slategrey", 
		"snow", 
		"snow1", 
		"snow2", 
		"snow3", 
		"snow4", 
		"spring green", 
		"springgreen", 
		"springgreen1", 
		"springgreen2", 
		"springgreen3", 
		"springgreen4", 
		"steel blue", 
		"steelblue", 
		"steelblue1", 
		"steelblue2", 
		"steelblue3", 
		"steelblue4", 
		"tan", 
		"tan1", 
		"tan2", 
		"tan3", 
		"tan4", 
		"teal", 
		"thistle", 
		"thistle1", 
		"thistle2", 
		"thistle3", 
		"thistle4", 
		"tomato", 
		"tomato1", 
		"tomato2", 
		"tomato3", 
		"tomato4", 
		"turquoise", 
		"turquoise1", 
		"turquoise2", 
		"turquoise3", 
		"turquoise4", 
		"violet", 
		"violet red", 
		"violetred", 
		"violetred1", 
		"violetred2", 
		"violetred3", 
		"violetred4", 
		"web gray", 
		"web green", 
		"web grey", 
		"web maroon", 
		"web purple", 
		"webgray", 
		"webgreen", 
		"webgrey", 
		"webmaroon", 
		"webpurple", 
		"wheat", 
		"wheat1", 
		"wheat2", 
		"wheat3", 
		"wheat4", 
		"white", 
		"white smoke", 
		"whitesmoke", 
		"x11 gray", 
		"x11 green", 
		"x11 grey", 
		"x11 maroon", 
		"x11 purple", 
		"x11gray", 
		"x11green", 
		"x11grey", 
		"x11maroon", 
		"x11purple", 
		"yellow", 
		"yellow green", 
		"yellow1", 
		"yellow2", 
		"yellow3", 
		"yellow4", 
		"yellowgreen"
	];


	var colorsRGBValues = [
		[240, 248, 255],          /* alice blue */
		[240, 248, 255],         /* AliceBlue */
		[250, 235, 215],         /* antique white */
		[250, 235, 215],         /* AntiqueWhite */
		[255, 239, 219],         /* AntiqueWhite1 */
		[238, 223, 204],         /* AntiqueWhite2 */
		[205, 192, 176],         /* AntiqueWhite3 */
		[139, 131, 120],         /* AntiqueWhite4 */
		[0, 255, 255],          /* aqua */
		[127, 255, 212],        /* aquamarine */
		[127, 255, 212],        /* aquamarine1 */
		[118, 238, 198],        /* aquamarine2 */
		[102, 205, 170],        /* aquamarine3 */
		[69, 139, 116],         /* aquamarine4 */
		[240, 255, 255],        /* azure */
		[240, 255, 255],        /* azure1 */
		[224, 238, 238],        /* azure2 */
		[193, 205, 205],        /* azure3 */
		[131, 139, 139],        /* azure4 */
		[245, 245, 220],        /* beige */
		[255, 228, 196],        /* bisque */
		[255, 228, 196],        /* bisque1 */
		[238, 213, 183],        /* bisque2 */
		[205, 183, 158],        /* bisque3 */
		[139, 125, 107],        /* bisque4 */
		[0, 0, 0],              /* black */
		[255, 235, 205],        /* blanched almond */
		[255, 235, 205],        /* BlanchedAlmond */
		[0, 0, 255],            /* blue */
		[138, 43, 226],         /* blue violet */
		[0, 0, 255],            /* blue1 */
		[0, 0, 238],            /* blue2 */
		[0, 0, 205],            /* blue3 */
		[0, 0, 139],            /* blue4 */
		[138, 43, 226],         /* BlueViolet */
		[165, 42, 42],          /* brown */
		[255, 64, 64],          /* brown1 */
		[238, 59, 59],          /* brown2 */
		[205, 51, 51],          /* brown3 */
		[139, 35, 35],          /* brown4 */
		[222, 184, 135],        /* burlywood */
		[255, 211, 155],        /* burlywood1 */
		[238, 197, 145],        /* burlywood2 */
		[205, 170, 125],        /* burlywood3 */
		[139, 115, 85],         /* burlywood4 */
		[95, 158, 160],         /* cadet blue */
		[95, 158, 160],         /* CadetBlue */
		[152, 245, 255],        /* CadetBlue1 */
		[142, 229, 238],        /* CadetBlue2 */
		[122, 197, 205],        /* CadetBlue3 */
		[83, 134, 139],         /* CadetBlue4 */
		[127, 255, 0],          /* chartreuse */
		[127, 255, 0],          /* chartreuse1 */
		[118, 238, 0],          /* chartreuse2 */
		[102, 205, 0],          /* chartreuse3 */
		[69, 139, 0],           /* chartreuse4 */
		[210, 105, 30],         /* chocolate */
		[255, 127, 36],         /* chocolate1 */
		[238, 118, 33],         /* chocolate2 */
		[205, 102, 29],         /* chocolate3 */
		[139, 69, 19],          /* chocolate4 */
		[255, 127, 80],         /* coral */
		[255, 114, 86],         /* coral1 */
		[238, 106, 80],         /* coral2 */
		[205, 91, 69],          /* coral3 */
		[139, 62, 47],          /* coral4 */
		[100, 149, 237],        /* cornflower blue */
		[100, 149, 237],        /* CornflowerBlue */
		[255, 248, 220],        /* cornsilk */
		[255, 248, 220],        /* cornsilk1 */
		[238, 232, 205],        /* cornsilk2 */
		[205, 200, 177],        /* cornsilk3 */
		[139, 136, 120],        /* cornsilk4 */
		[220, 20, 60],          /* crimson */
		[0, 255, 255],          /* cyan */
		[0, 255, 255],          /* cyan1 */
		[0, 238, 238],          /* cyan2 */
		[0, 205, 205],          /* cyan3 */
		[0, 139, 139],          /* cyan4 */
		[0, 0, 139],            /* dark blue */
		[0, 139, 139],          /* dark cyan */
		[184, 134, 11],         /* dark goldenrod */
		[169, 169, 169],        /* dark gray */
		[0, 100, 0],            /* dark green */
		[169, 169, 169],        /* dark grey */
		[189, 183, 107],        /* dark khaki */
		[139, 0, 139],          /* dark magenta */
		[85, 107, 47],          /* dark olive green */
		[255, 140, 0],          /* dark orange */
		[153, 50, 204],         /* dark orchid */
		[139, 0, 0],            /* dark red */
		[233, 150, 122],        /* dark salmon */
		[143, 188, 143],        /* dark sea green */
		[72, 61, 139],          /* dark slate blue */
		[47, 79, 79],           /* dark slate gray */
		[47, 79, 79],           /* dark slate grey */
		[0, 206, 209],          /* dark turquoise */
		[148, 0, 211],          /* dark violet */
		[0, 0, 139],            /* DarkBlue */
		[0, 139, 139],         /* DarkCyan */
		[184, 134, 11],        /* DarkGoldenrod */
		[255, 185, 15],        /* DarkGoldenrod1 */
		[238, 173, 14],        /* DarkGoldenrod2 */
		[205, 149, 12],        /* DarkGoldenrod3 */
		[139, 101, 8],         /* DarkGoldenrod4 */
		[169, 169, 169],       /* DarkGray */
		[0, 100, 0],           /* DarkGreen */
		[169, 169, 169],       /* DarkGrey */
		[189, 183, 107],       /* DarkKhaki */
		[139, 0, 139],         /* DarkMagenta */
		[85, 107, 47],         /* DarkOliveGreen */
		[202, 255, 112],       /* DarkOliveGreen1 */
		[188, 238, 104],       /* DarkOliveGreen2 */
		[162, 205, 90],        /* DarkOliveGreen3 */
		[110, 139, 61],        /* DarkOliveGreen4 */
		[255, 140, 0],         /* DarkOrange */
		[255, 127, 0],         /* DarkOrange1 */
		[238, 118, 0],         /* DarkOrange2 */
		[205, 102, 0],         /* DarkOrange3 */
		[139, 69, 0],          /* DarkOrange4 */
		[153, 50, 204],        /* DarkOrchid */
		[191, 62, 255],        /* DarkOrchid1 */
		[178, 58, 238],        /* DarkOrchid2 */
		[154, 50, 205],        /* DarkOrchid3 */
		[104, 34, 139],        /* DarkOrchid4 */
		[139, 0, 0],           /* DarkRed */
		[233, 150, 122],       /* DarkSalmon */
		[143, 188, 143],       /* DarkSeaGreen */
		[193, 255, 193],       /* DarkSeaGreen1 */
		[180, 238, 180],       /* DarkSeaGreen2 */
		[155, 205, 155],       /* DarkSeaGreen3 */
		[105, 139, 105],       /* DarkSeaGreen4 */
		[72, 61, 139],         /* DarkSlateBlue */
		[47, 79, 79],          /* DarkSlateGray */
		[151, 255, 255],       /* DarkSlateGray1 */
		[141, 238, 238],       /* DarkSlateGray2 */
		[121, 205, 205],       /* DarkSlateGray3 */
		[82, 139, 139],        /* DarkSlateGray4 */
		[47, 79, 79],          /* DarkSlateGrey */
		[0, 206, 209],         /* DarkTurquoise */
		[148, 0, 211],         /* DarkViolet */
		[255, 20, 147],        /* deep pink */
		[0, 191, 255],         /* deep sky blue */
		[255, 20, 147],        /* DeepPink */
		[255, 20, 147],        /* DeepPink1 */
		[238, 18, 137],        /* DeepPink2 */
		[205, 16, 118],        /* DeepPink3 */
		[139, 10, 80],         /* DeepPink4 */
		[0, 191, 255],         /* DeepSkyBlue */
		[0, 191, 255],         /* DeepSkyBlue1 */
		[0, 178, 238],         /* DeepSkyBlue2 */
		[0, 154, 205],         /* DeepSkyBlue3 */
		[0, 104, 139],         /* DeepSkyBlue4 */
		[105, 105, 105],       /* dim gray */
		[105, 105, 105],       /* dim grey */
		[105, 105, 105],       /* DimGray */
		[105, 105, 105],       /* DimGrey */
		[30, 144, 255],        /* dodger blue */
		[30, 144, 255],        /* DodgerBlue */
		[30, 144, 255],        /* DodgerBlue1 */
		[28, 134, 238],        /* DodgerBlue2 */
		[24, 116, 205],        /* DodgerBlue3 */
		[16, 78, 139],         /* DodgerBlue4 */
		[178, 34, 34],         /* firebrick */
		[255, 48, 48],         /* firebrick1 */
		[238, 44, 44],         /* firebrick2 */
		[205, 38, 38],         /* firebrick3 */
		[139, 26, 26],         /* firebrick4 */
		[255, 250, 240],       /* floral white */
		[255, 250, 240],       /* FloralWhite */
		[34, 139, 34],         /* forest green */
		[34, 139, 34],         /* ForestGreen */
		[255, 0, 255],         /* fuchsia */
		[220, 220, 220],       /* gainsboro */
		[248, 248, 255],       /* ghost white */
		[248, 248, 255],       /* GhostWhite */
		[255, 215, 0],         /* gold */
		[255, 215, 0],         /* gold1 */
		[238, 201, 0],         /* gold2 */
		[205, 173, 0],         /* gold3 */
		[139, 117, 0],         /* gold4 */
		[218, 165, 32],        /* goldenrod */
		[255, 193, 37],        /* goldenrod1 */
		[238, 180, 34],        /* goldenrod2 */
		[205, 155, 29],        /* goldenrod3 */
		[139, 105, 20],        /* goldenrod4 */
		[190, 190, 190],       /* gray */
		[0, 0, 0],             /* gray0 */
		[3, 3, 3],             /* gray1 */
		[26, 26, 26],          /* gray10 */
		[255, 255, 255],       /* gray100 */
		[28, 28, 28],          /* gray11 */
		[31, 31, 31],          /* gray12 */
		[33, 33, 33],          /* gray13 */
		[36, 36, 36],          /* gray14 */
		[38, 38, 38],          /* gray15 */
		[41, 41, 41],          /* gray16 */
		[43, 43, 43],          /* gray17 */
		[46, 46, 46],          /* gray18 */
		[48, 48, 48],          /* gray19 */
		[5, 5, 5],             /* gray2 */
		[51, 51, 51],          /* gray20 */
		[54, 54, 54],          /* gray21 */
		[56, 56, 56],          /* gray22 */
		[59, 59, 59],          /* gray23 */
		[61, 61, 61],          /* gray24 */
		[64, 64, 64],          /* gray25 */
		[66, 66, 66],          /* gray26 */
		[69, 69, 69],          /* gray27 */
		[71, 71, 71],          /* gray28 */
		[74, 74, 74],          /* gray29 */
		[8, 8, 8],             /* gray3 */
		[77, 77, 77],          /* gray30 */
		[79, 79, 79],          /* gray31 */
		[82, 82, 82],          /* gray32 */
		[84, 84, 84],          /* gray33 */
		[87, 87, 87],          /* gray34 */
		[89, 89, 89],          /* gray35 */
		[92, 92, 92],          /* gray36 */
		[94, 94, 94],          /* gray37 */
		[97, 97, 97],          /* gray38 */
		[99, 99, 99],          /* gray39 */
		[10, 10, 10],          /* gray4 */
		[102, 102, 102],       /* gray40 */
		[105, 105, 105],       /* gray41 */
		[107, 107, 107],       /* gray42 */
		[110, 110, 110],       /* gray43 */
		[112, 112, 112],       /* gray44 */
		[115, 115, 115],       /* gray45 */
		[117, 117, 117],       /* gray46 */
		[120, 120, 120],       /* gray47 */
		[122, 122, 122],       /* gray48 */
		[125, 125, 125],       /* gray49 */
		[13, 13, 13],          /* gray5 */
		[127, 127, 127],       /* gray50 */
		[130, 130, 130],       /* gray51 */
		[133, 133, 133],       /* gray52 */
		[135, 135, 135],       /* gray53 */
		[138, 138, 138],       /* gray54 */
		[140, 140, 140],       /* gray55 */
		[143, 143, 143],       /* gray56 */
		[145, 145, 145],       /* gray57 */
		[148, 148, 148],       /* gray58 */
		[150, 150, 150],       /* gray59 */
		[15, 15, 15],          /* gray6 */
		[153, 153, 153],       /* gray60 */
		[156, 156, 156],       /* gray61 */
		[158, 158, 158],       /* gray62 */
		[161, 161, 161],       /* gray63 */
		[163, 163, 163],       /* gray64 */
		[166, 166, 166],       /* gray65 */
		[168, 168, 168],       /* gray66 */
		[171, 171, 171],       /* gray67 */
		[173, 173, 173],       /* gray68 */
		[176, 176, 176],       /* gray69 */
		[18, 18, 18],          /* gray7 */
		[179, 179, 179],       /* gray70 */
		[181, 181, 181],       /* gray71 */
		[184, 184, 184],       /* gray72 */
		[186, 186, 186],       /* gray73 */
		[189, 189, 189],       /* gray74 */
		[191, 191, 191],       /* gray75 */
		[194, 194, 194],       /* gray76 */
		[196, 196, 196],       /* gray77 */
		[199, 199, 199],       /* gray78 */
		[201, 201, 201],       /* gray79 */
		[20, 20, 20],          /* gray8 */
		[204, 204, 204],       /* gray80 */
		[207, 207, 207],       /* gray81 */
		[209, 209, 209],       /* gray82 */
		[212, 212, 212],       /* gray83 */
		[214, 214, 214],       /* gray84 */
		[217, 217, 217],       /* gray85 */
		[219, 219, 219],       /* gray86 */
		[222, 222, 222],       /* gray87 */
		[224, 224, 224],       /* gray88 */
		[227, 227, 227],       /* gray89 */
		[23, 23, 23],          /* gray9 */
		[229, 229, 229],       /* gray90 */
		[232, 232, 232],       /* gray91 */
		[235, 235, 235],       /* gray92 */
		[237, 237, 237],       /* gray93 */
		[240, 240, 240],       /* gray94 */
		[242, 242, 242],       /* gray95 */
		[245, 245, 245],       /* gray96 */
		[247, 247, 247],       /* gray97 */
		[250, 250, 250],       /* gray98 */
		[252, 252, 252],       /* gray99 */
		[0, 255, 0],           /* green */
		[173, 255, 47],        /* green yellow */
		[0, 255, 0],           /* green1 */
		[0, 238, 0],           /* green2 */
		[0, 205, 0],           /* green3 */
		[0, 139, 0],           /* green4 */
		[173, 255, 47],        /* GreenYellow */
		[190, 190, 190],       /* grey */
		[0, 0, 0],             /* grey0 */
		[3, 3, 3],             /* grey1 */
		[26, 26, 26],          /* grey10 */
		[255, 255, 255],       /* grey100 */
		[28, 28, 28],          /* grey11 */
		[31, 31, 31],          /* grey12 */
		[33, 33, 33],          /* grey13 */
		[36, 36, 36],          /* grey14 */
		[38, 38, 38],          /* grey15 */
		[41, 41, 41],          /* grey16 */
		[43, 43, 43],          /* grey17 */
		[46, 46, 46],          /* grey18 */
		[48, 48, 48],          /* grey19 */
		[5, 5, 5],             /* grey2 */
		[51, 51, 51],          /* grey20 */
		[54, 54, 54],          /* grey21 */
		[56, 56, 56],          /* grey22 */
		[59, 59, 59],          /* grey23 */
		[61, 61, 61],          /* grey24 */
		[64, 64, 64],          /* grey25 */
		[66, 66, 66],          /* grey26 */
		[69, 69, 69],          /* grey27 */
		[71, 71, 71],          /* grey28 */
		[74, 74, 74],          /* grey29 */
		[8, 8, 8],             /* grey3 */
		[77, 77, 77],          /* grey30 */
		[79, 79, 79],          /* grey31 */
		[82, 82, 82],          /* grey32 */
		[84, 84, 84],          /* grey33 */
		[87, 87, 87],          /* grey34 */
		[89, 89, 89],          /* grey35 */
		[92, 92, 92],          /* grey36 */
		[94, 94, 94],          /* grey37 */
		[97, 97, 97],          /* grey38 */
		[99, 99, 99],          /* grey39 */
		[10, 10, 10],          /* grey4 */
		[102, 102, 102],       /* grey40 */
		[105, 105, 105],       /* grey41 */
		[107, 107, 107],       /* grey42 */
		[110, 110, 110],       /* grey43 */
		[112, 112, 112],       /* grey44 */
		[115, 115, 115],       /* grey45 */
		[117, 117, 117],       /* grey46 */
		[120, 120, 120],       /* grey47 */
		[122, 122, 122],       /* grey48 */
		[125, 125, 125],       /* grey49 */
		[13, 13, 13],          /* grey5 */
		[127, 127, 127],       /* grey50 */
		[130, 130, 130],       /* grey51 */
		[133, 133, 133],       /* grey52 */
		[135, 135, 135],       /* grey53 */
		[138, 138, 138],       /* grey54 */
		[140, 140, 140],       /* grey55 */
		[143, 143, 143],       /* grey56 */
		[145, 145, 145],       /* grey57 */
		[148, 148, 148],       /* grey58 */
		[150, 150, 150],       /* grey59 */
		[15, 15, 15],          /* grey6 */
		[153, 153, 153],       /* grey60 */
		[156, 156, 156],       /* grey61 */
		[158, 158, 158],       /* grey62 */
		[161, 161, 161],       /* grey63 */
		[163, 163, 163],       /* grey64 */
		[166, 166, 166],       /* grey65 */
		[168, 168, 168],       /* grey66 */
		[171, 171, 171],       /* grey67 */
		[173, 173, 173],       /* grey68 */
		[176, 176, 176],       /* grey69 */
		[18, 18, 18],          /* grey7 */
		[179, 179, 179],       /* grey70 */
		[181, 181, 181],       /* grey71 */
		[184, 184, 184],       /* grey72 */
		[186, 186, 186],       /* grey73 */
		[189, 189, 189],       /* grey74 */
		[191, 191, 191],       /* grey75 */
		[194, 194, 194],       /* grey76 */
		[196, 196, 196],       /* grey77 */
		[199, 199, 199],       /* grey78 */
		[201, 201, 201],       /* grey79 */
		[20, 20, 20],          /* grey8 */
		[204, 204, 204],       /* grey80 */
		[207, 207, 207],       /* grey81 */
		[209, 209, 209],       /* grey82 */
		[212, 212, 212],       /* grey83 */
		[214, 214, 214],       /* grey84 */
		[217, 217, 217],       /* grey85 */
		[219, 219, 219],       /* grey86 */
		[222, 222, 222],       /* grey87 */
		[224, 224, 224],       /* grey88 */
		[227, 227, 227],       /* grey89 */
		[23, 23, 23],          /* grey9 */
		[229, 229, 229],       /* grey90 */
		[232, 232, 232],       /* grey91 */
		[235, 235, 235],       /* grey92 */
		[237, 237, 237],       /* grey93 */
		[240, 240, 240],       /* grey94 */
		[242, 242, 242],       /* grey95 */
		[245, 245, 245],       /* grey96 */
		[247, 247, 247],       /* grey97 */
		[250, 250, 250],       /* grey98 */
		[252, 252, 252],       /* grey99 */
		[240, 255, 240],       /* honeydew */
		[240, 255, 240],       /* honeydew1 */
		[224, 238, 224],       /* honeydew2 */
		[193, 205, 193],       /* honeydew3 */
		[131, 139, 131],       /* honeydew4 */
		[255, 105, 180],       /* hot pink */
		[255, 105, 180],       /* HotPink */
		[255, 110, 180],       /* HotPink1 */
		[238, 106, 167],       /* HotPink2 */
		[205, 96, 144],        /* HotPink3 */
		[139, 58, 98],         /* HotPink4 */
		[205, 92, 92],         /* indian red */
		[205, 92, 92],         /* IndianRed */
		[255, 106, 106],       /* IndianRed1 */
		[238, 99, 99],         /* IndianRed2 */
		[205, 85, 85],         /* IndianRed3 */
		[139, 58, 58],         /* IndianRed4 */
		[75, 0, 130],          /* indigo */
		[255, 255, 240],       /* ivory */
		[255, 255, 240],       /* ivory1 */
		[238, 238, 224],       /* ivory2 */
		[205, 205, 193],       /* ivory3 */
		[139, 139, 131],       /* ivory4 */
		[240, 230, 140],       /* khaki */
		[255, 246, 143],       /* khaki1 */
		[238, 230, 133],       /* khaki2 */
		[205, 198, 115],       /* khaki3 */
		[139, 134, 78],        /* khaki4 */
		[230, 230, 250],       /* lavender */
		[255, 240, 245],       /* lavender blush */
		[255, 240, 245],       /* LavenderBlush */
		[255, 240, 245],       /* LavenderBlush1 */
		[238, 224, 229],       /* LavenderBlush2 */
		[205, 193, 197],       /* LavenderBlush3 */
		[139, 131, 134],       /* LavenderBlush4 */
		[124, 252, 0],         /* lawn green */
		[124, 252, 0],         /* LawnGreen */
		[255, 250, 205],       /* lemon chiffon */
		[255, 250, 205],       /* LemonChiffon */
		[255, 250, 205],       /* LemonChiffon1 */
		[238, 233, 191],       /* LemonChiffon2 */
		[205, 201, 165],       /* LemonChiffon3 */
		[139, 137, 112],       /* LemonChiffon4 */
		[173, 216, 230],       /* light blue */
		[240, 128, 128],       /* light coral */
		[224, 255, 255],       /* light cyan */
		[238, 221, 130],       /* light goldenrod */
		[250, 250, 210],       /* light goldenrod yellow */
		[211, 211, 211],       /* light gray */
		[144, 238, 144],       /* light green */
		[211, 211, 211],       /* light grey */
		[255, 182, 193],       /* light pink */
		[255, 160, 122],       /* light salmon */
		[32, 178, 170],        /* light sea green */
		[135, 206, 250],       /* light sky blue */
		[132, 112, 255],       /* light slate blue */
		[119, 136, 153],       /* light slate gray */
		[119, 136, 153],       /* light slate grey */
		[176, 196, 222],       /* light steel blue */
		[255, 255, 224],       /* light yellow */
		[173, 216, 230],       /* LightBlue */
		[191, 239, 255],       /* LightBlue1 */
		[178, 223, 238],       /* LightBlue2 */
		[154, 192, 205],       /* LightBlue3 */
		[104, 131, 139],       /* LightBlue4 */
		[240, 128, 128],       /* LightCoral */
		[224, 255, 255],       /* LightCyan */
		[224, 255, 255],       /* LightCyan1 */
		[209, 238, 238],       /* LightCyan2 */
		[180, 205, 205],       /* LightCyan3 */
		[122, 139, 139],       /* LightCyan4 */
		[238, 221, 130],       /* LightGoldenrod */
		[255, 236, 139],       /* LightGoldenrod1 */
		[238, 220, 130],       /* LightGoldenrod2 */
		[205, 190, 112],       /* LightGoldenrod3 */
		[139, 129, 76],        /* LightGoldenrod4 */
		[250, 250, 210],       /* LightGoldenrodYellow */
		[211, 211, 211],       /* LightGray */
		[144, 238, 144],       /* LightGreen */
		[211, 211, 211],       /* LightGrey */
		[255, 182, 193],       /* LightPink */
		[255, 174, 185],       /* LightPink1 */
		[238, 162, 173],       /* LightPink2 */
		[205, 140, 149],       /* LightPink3 */
		[139, 95, 101],        /* LightPink4 */
		[255, 160, 122],       /* LightSalmon */
		[255, 160, 122],       /* LightSalmon1 */
		[238, 149, 114],       /* LightSalmon2 */
		[205, 129, 98],        /* LightSalmon3 */
		[139, 87, 66],         /* LightSalmon4 */
		[32, 178, 170],        /* LightSeaGreen */
		[135, 206, 250],       /* LightSkyBlue */
		[176, 226, 255],       /* LightSkyBlue1 */
		[164, 211, 238],       /* LightSkyBlue2 */
		[141, 182, 205],       /* LightSkyBlue3 */
		[96, 123, 139],        /* LightSkyBlue4 */
		[132, 112, 255],       /* LightSlateBlue */
		[119, 136, 153],       /* LightSlateGray */
		[119, 136, 153],       /* LightSlateGrey */
		[176, 196, 222],       /* LightSteelBlue */
		[202, 225, 255],       /* LightSteelBlue1 */
		[188, 210, 238],       /* LightSteelBlue2 */
		[162, 181, 205],       /* LightSteelBlue3 */
		[110, 123, 139],       /* LightSteelBlue4 */
		[255, 255, 224],       /* LightYellow */
		[255, 255, 224],       /* LightYellow1 */
		[238, 238, 209],       /* LightYellow2 */
		[205, 205, 180],       /* LightYellow3 */
		[139, 139, 122],       /* LightYellow4 */
		[0, 255, 0],           /* lime */
		[50, 205, 50],         /* lime green */
		[50, 205, 50],         /* LimeGreen */
		[250, 240, 230],       /* linen */
		[255, 0, 255],         /* magenta */
		[255, 0, 255],         /* magenta1 */
		[238, 0, 238],         /* magenta2 */
		[205, 0, 205],         /* magenta3 */
		[139, 0, 139],         /* magenta4 */
		[176, 48, 96],         /* maroon */
		[255, 52, 179],        /* maroon1 */
		[238, 48, 167],        /* maroon2 */
		[205, 41, 144],        /* maroon3 */
		[139, 28, 98],         /* maroon4 */
		[102, 205, 170],       /* medium aquamarine */
		[0, 0, 205],           /* medium blue */
		[186, 85, 211],        /* medium orchid */
		[147, 112, 219],       /* medium purple */
		[60, 179, 113],        /* medium sea green */
		[123, 104, 238],       /* medium slate blue */
		[0, 250, 154],         /* medium spring green */
		[72, 209, 204],        /* medium turquoise */
		[199, 21, 133],        /* medium violet red */
		[102, 205, 170],       /* MediumAquamarine */
		[0, 0, 205],           /* MediumBlue */
		[186, 85, 211],        /* MediumOrchid */
		[224, 102, 255],       /* MediumOrchid1 */
		[209, 95, 238],        /* MediumOrchid2 */
		[180, 82, 205],        /* MediumOrchid3 */
		[122, 55, 139],        /* MediumOrchid4 */
		[147, 112, 219],       /* MediumPurple */
		[171, 130, 255],       /* MediumPurple1 */
		[159, 121, 238],       /* MediumPurple2 */
		[137, 104, 205],       /* MediumPurple3 */
		[93, 71, 139],         /* MediumPurple4 */
		[60, 179, 113],        /* MediumSeaGreen */
		[123, 104, 238],       /* MediumSlateBlue */
		[0, 250, 154],         /* MediumSpringGreen */
		[72, 209, 204],        /* MediumTurquoise */
		[199, 21, 133],        /* MediumVioletRed */
		[25, 25, 112],         /* midnight blue */
		[25, 25, 112],         /* MidnightBlue */
		[245, 255, 250],       /* mint cream */
		[245, 255, 250],       /* MintCream */
		[255, 228, 225],       /* misty rose */
		[255, 228, 225],       /* MistyRose */
		[255, 228, 225],       /* MistyRose1 */
		[238, 213, 210],       /* MistyRose2 */
		[205, 183, 181],       /* MistyRose3 */
		[139, 125, 123],       /* MistyRose4 */
		[255, 228, 181],       /* moccasin */
		[255, 222, 173],       /* navajo white */
		[255, 222, 173],       /* NavajoWhite */
		[255, 222, 173],       /* NavajoWhite1 */
		[238, 207, 161],       /* NavajoWhite2 */
		[205, 179, 139],       /* NavajoWhite3 */
		[139, 121, 94],        /* NavajoWhite4 */
		[0, 0, 128],           /* navy */
		[0, 0, 128],           /* navy blue */
		[0, 0, 128],           /* NavyBlue */
		[253, 245, 230],       /* old lace */
		[253, 245, 230],       /* OldLace */
		[128, 128, 0],         /* olive */
		[107, 142, 35],        /* olive drab */
		[107, 142, 35],        /* OliveDrab */
		[192, 255, 62],        /* OliveDrab1 */
		[179, 238, 58],        /* OliveDrab2 */
		[154, 205, 50],        /* OliveDrab3 */
		[105, 139, 34],        /* OliveDrab4 */
		[255, 165, 0],         /* orange */
		[255, 69, 0],          /* orange red */
		[255, 165, 0],         /* orange1 */
		[238, 154, 0],         /* orange2 */
		[205, 133, 0],         /* orange3 */
		[139, 90, 0],          /* orange4 */
		[255, 69, 0],          /* OrangeRed */
		[255, 69, 0],          /* OrangeRed1 */
		[238, 64, 0],          /* OrangeRed2 */
		[205, 55, 0],          /* OrangeRed3 */
		[139, 37, 0],          /* OrangeRed4 */
		[218, 112, 214],       /* orchid */
		[255, 131, 250],       /* orchid1 */
		[238, 122, 233],       /* orchid2 */
		[205, 105, 201],       /* orchid3 */
		[139, 71, 137],        /* orchid4 */
		[238, 232, 170],       /* pale goldenrod */
		[152, 251, 152],       /* pale green */
		[175, 238, 238],       /* pale turquoise */
		[219, 112, 147],       /* pale violet red */
		[238, 232, 170],       /* PaleGoldenrod */
		[152, 251, 152],       /* PaleGreen */
		[154, 255, 154],       /* PaleGreen1 */
		[144, 238, 144],       /* PaleGreen2 */
		[124, 205, 124],       /* PaleGreen3 */
		[84, 139, 84],         /* PaleGreen4 */
		[175, 238, 238],       /* PaleTurquoise */
		[187, 255, 255],       /* PaleTurquoise1 */
		[174, 238, 238],       /* PaleTurquoise2 */
		[150, 205, 205],       /* PaleTurquoise3 */
		[102, 139, 139],       /* PaleTurquoise4 */
		[219, 112, 147],       /* PaleVioletRed */
		[255, 130, 171],       /* PaleVioletRed1 */
		[238, 121, 159],       /* PaleVioletRed2 */
		[205, 104, 137],       /* PaleVioletRed3 */
		[139, 71, 93],         /* PaleVioletRed4 */
		[255, 239, 213],       /* papaya whip */
		[255, 239, 213],       /* PapayaWhip */
		[255, 218, 185],       /* peach puff */
		[255, 218, 185],       /* PeachPuff */
		[255, 218, 185],       /* PeachPuff1 */
		[238, 203, 173],       /* PeachPuff2 */
		[205, 175, 149],       /* PeachPuff3 */
		[139, 119, 101],       /* PeachPuff4 */
		[205, 133, 63],        /* peru */
		[255, 192, 203],       /* pink */
		[255, 181, 197],       /* pink1 */
		[238, 169, 184],       /* pink2 */
		[205, 145, 158],       /* pink3 */
		[139, 99, 108],        /* pink4 */
		[221, 160, 221],       /* plum */
		[255, 187, 255],       /* plum1 */
		[238, 174, 238],       /* plum2 */
		[205, 150, 205],       /* plum3 */
		[139, 102, 139],       /* plum4 */
		[176, 224, 230],       /* powder blue */
		[176, 224, 230],       /* PowderBlue */
		[160, 32, 240],        /* purple */
		[155, 48, 255],        /* purple1 */
		[145, 44, 238],        /* purple2 */
		[125, 38, 205],        /* purple3 */
		[85, 26, 139],         /* purple4 */
		[102, 51, 153],        /* rebecca purple */
		[102, 51, 153],        /* RebeccaPurple */
		[255, 0, 0],           /* red */
		[255, 0, 0],           /* red1 */
		[238, 0, 0],           /* red2 */
		[205, 0, 0],           /* red3 */
		[139, 0, 0],           /* red4 */
		[188, 143, 143],       /* rosy brown */
		[188, 143, 143],       /* RosyBrown */
		[255, 193, 193],       /* RosyBrown1 */
		[238, 180, 180],       /* RosyBrown2 */
		[205, 155, 155],       /* RosyBrown3 */
		[139, 105, 105],       /* RosyBrown4 */
		[65, 105, 225],        /* royal blue */
		[65, 105, 225],        /* RoyalBlue */
		[72, 118, 255],        /* RoyalBlue1 */
		[67, 110, 238],        /* RoyalBlue2 */
		[58, 95, 205],         /* RoyalBlue3 */
		[39, 64, 139],         /* RoyalBlue4 */
		[139, 69, 19],         /* saddle brown */
		[139, 69, 19],         /* SaddleBrown */
		[250, 128, 114],       /* salmon */
		[255, 140, 105],       /* salmon1 */
		[238, 130, 98],        /* salmon2 */
		[205, 112, 84],        /* salmon3 */
		[139, 76, 57],         /* salmon4 */
		[244, 164, 96],        /* sandy brown */
		[244, 164, 96],        /* SandyBrown */
		[46, 139, 87],         /* sea green */
		[46, 139, 87],         /* SeaGreen */
		[84, 255, 159],        /* SeaGreen1 */
		[78, 238, 148],        /* SeaGreen2 */
		[67, 205, 128],        /* SeaGreen3 */
		[46, 139, 87],         /* SeaGreen4 */
		[255, 245, 238],       /* seashell */
		[255, 245, 238],       /* seashell1 */
		[238, 229, 222],       /* seashell2 */
		[205, 197, 191],       /* seashell3 */
		[139, 134, 130],       /* seashell4 */
		[160, 82, 45],         /* sienna */
		[255, 130, 71],        /* sienna1 */
		[238, 121, 66],        /* sienna2 */
		[205, 104, 57],        /* sienna3 */
		[139, 71, 38],         /* sienna4 */
		[192, 192, 192],       /* silver */
		[135, 206, 235],       /* sky blue */
		[135, 206, 235],       /* SkyBlue */
		[135, 206, 255],       /* SkyBlue1 */
		[126, 192, 238],       /* SkyBlue2 */
		[108, 166, 205],       /* SkyBlue3 */
		[74, 112, 139],        /* SkyBlue4 */
		[106, 90, 205],        /* slate blue */
		[112, 128, 144],       /* slate gray */
		[112, 128, 144],       /* slate grey */
		[106, 90, 205],        /* SlateBlue */
		[131, 111, 255],       /* SlateBlue1 */
		[122, 103, 238],       /* SlateBlue2 */
		[105, 89, 205],        /* SlateBlue3 */
		[71, 60, 139],         /* SlateBlue4 */
		[112, 128, 144],       /* SlateGray */
		[198, 226, 255],       /* SlateGray1 */
		[185, 211, 238],       /* SlateGray2 */
		[159, 182, 205],       /* SlateGray3 */
		[108, 123, 139],       /* SlateGray4 */
		[112, 128, 144],       /* SlateGrey */
		[255, 250, 250],       /* snow */
		[255, 250, 250],       /* snow1 */
		[238, 233, 233],       /* snow2 */
		[205, 201, 201],       /* snow3 */
		[139, 137, 137],       /* snow4 */
		[0, 255, 127],         /* spring green */
		[0, 255, 127],         /* SpringGreen */
		[0, 255, 127],         /* SpringGreen1 */
		[0, 238, 118],         /* SpringGreen2 */
		[0, 205, 102],         /* SpringGreen3 */
		[0, 139, 69],          /* SpringGreen4 */
		[70, 130, 180],        /* steel blue */
		[70, 130, 180],        /* SteelBlue */
		[99, 184, 255],        /* SteelBlue1 */
		[92, 172, 238],        /* SteelBlue2 */
		[79, 148, 205],        /* SteelBlue3 */
		[54, 100, 139],        /* SteelBlue4 */
		[210, 180, 140],       /* tan */
		[255, 165, 79],        /* tan1 */
		[238, 154, 73],        /* tan2 */
		[205, 133, 63],        /* tan3 */
		[139, 90, 43],         /* tan4 */
		[0, 128, 128],         /* teal */
		[216, 191, 216],       /* thistle */
		[255, 225, 255],       /* thistle1 */
		[238, 210, 238],       /* thistle2 */
		[205, 181, 205],       /* thistle3 */
		[139, 123, 139],       /* thistle4 */
		[255, 99, 71],         /* tomato */
		[255, 99, 71],         /* tomato1 */
		[238, 92, 66],         /* tomato2 */
		[205, 79, 57],         /* tomato3 */
		[139, 54, 38],         /* tomato4 */
		[64, 224, 208],        /* turquoise */
		[0, 245, 255],         /* turquoise1 */
		[0, 229, 238],         /* turquoise2 */
		[0, 197, 205],         /* turquoise3 */
		[0, 134, 139],         /* turquoise4 */
		[238, 130, 238],       /* violet */
		[208, 32, 144],        /* violet red */
		[208, 32, 144],        /* VioletRed */
		[255, 62, 150],        /* VioletRed1 */
		[238, 58, 140],        /* VioletRed2 */
		[205, 50, 120],        /* VioletRed3 */
		[139, 34, 82],         /* VioletRed4 */
		[128, 128, 128],       /* web gray */
		[0, 128, 0],           /* web green */
		[128, 128, 128],       /* web grey */
		[128, 0, 0],           /* web maroon */
		[128, 0, 128],         /* web purple */
		[128, 128, 128],       /* WebGray */
		[0, 128, 0],           /* WebGreen */
		[128, 128, 128],       /* WebGrey */
		[128, 0, 0],           /* WebMaroon */
		[128, 0, 128],         /* WebPurple */
		[245, 222, 179],       /* wheat */
		[255, 231, 186],       /* wheat1 */
		[238, 216, 174],       /* wheat2 */
		[205, 186, 150],       /* wheat3 */
		[139, 126, 102],       /* wheat4 */
		[255, 255, 255],       /* white */
		[245, 245, 245],       /* white smoke */
		[245, 245, 245],       /* WhiteSmoke */
		[190, 190, 190],       /* x11 gray */
		[0, 255, 0],           /* x11 green */
		[190, 190, 190],       /* x11 grey */
		[176, 48, 96],         /* x11 maroon */
		[160, 32, 240],        /* x11 purple */
		[190, 190, 190],       /* X11Gray */
		[0, 255, 0],           /* X11Green */
		[190, 190, 190],       /* X11Grey */
		[176, 48, 96],         /* X11Maroon */
		[160, 32, 240],        /* X11Purple */
		[255, 255, 0],         /* yellow */
		[154, 205, 50],        /* yellow green */
		[255, 255, 0],         /* yellow1 */
		[238, 238, 0],         /* yellow2 */
		[205, 205, 0],         /* yellow3 */
		[139, 139, 0],         /* yellow4 */
		[154, 205, 50]        /* YellowGreen */
	];
	
	var colorId = colorsNames.indexOf( _name.toLowerCase() );
	// debug( _name + " colorId : " + colorId );
	return colorsRGBValues[colorId];
};
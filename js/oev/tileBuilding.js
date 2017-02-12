Oev.Tile.BuildingProcessQueue = (function(){
	var waitingTiles = [];
	
	var api = {
		addWaiting : function(_tile) {
			waitingTiles.push(_tile);
			OEV.addObjToUpdate(api);
		}, 
		
		processNext : function() {
			if (waitingTiles.length == 0) {
				OEV.removeObjToUpdate(api);
				return null;
			}
			return waitingTiles.shift();
		}, 
		
		update : function() {
			var tile = api.processNext();
			if (tile === null) {
				return false;
			}
			tile.construct();
		}, 
	};
	
	return api;
})();

Oev.Tile.Building = function (_tile, _tileX, _tileY, _zoom) {
	this.tile = _tile;
	this.datasLoaded = false;
	this.zoom = _zoom;
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.onStage = true;
	this.datas = undefined;
	this.meshe = undefined;
	this.geometry = undefined;
}

Oev.Tile.Building.exculdedId = [23762981, 19441489, 201247295, 150335048, 309413981, 249003371];

Oev.Tile.Building.prototype = {

	load : function() {
		if (!this.datasLoaded) {
			
			var bbox = { 
				"minLon" : this.tile.startCoord.x, 
				"maxLon" : this.tile.endCoord.x, 
				"minLat" : this.tile.endCoord.y, 
				"maxLat" : this.tile.startCoord.y
			};
			var _self = this;
			OEV.earth.loaderBuilding.getData(
				{
					z : this.zoom, 
					x : this.tileX, 
					y : this.tileY, 
					priority : this.tile.distToCam, 
					bbox : bbox, 
				}, 
				function(_datas) {
					_self.setDatas(_datas);
				}
			);
			
			// OEV.earth.tilesBuildingsMng.getDatas( this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.tile.distToCam );
		} else {
			// this.construct();
			Oev.Tile.BuildingProcessQueue.addWaiting(this);
		}
	}, 

	setDatas : function( _datas ) {
		this.datasLoaded = true;
		this.datas = _datas;
		// this.construct();
		Oev.Tile.BuildingProcessQueue.addWaiting(this);
	}, 
	
	makeRoofPyramidal : function(_pts, _params, _roofColor) {
		var i;
		var nbGeoVert = this.geometry.vertices.length;
		var curFace;
		var elevation;
		if (_params['roofHeight'] == 0) {
			_params['roofHeight'] = 10;
		}
		var roofVertShape = [];
		var pos;
		for (i = 0; i < _pts.length; i ++) {
			roofVertShape.push( [_pts[i]['lon'], _pts[i]['lat']] );
			elevation = this.tile.interpolateEle(_pts[i]['lon'], _pts[i]['lat'], true);
			pos = OEV.earth.coordToXYZ(_pts[i]['lon'], _pts[i]['lat'], elevation + _params['height']);
			this.geometry.vertices.push(pos);
		}
		var centroid = Oev.Math.findCentroid(roofVertShape);
		elevation = this.tile.interpolateEle(centroid.lon, centroid.lat, true);
		var cenroidPos = OEV.earth.coordToXYZ(centroid.lon, centroid.lat, elevation + _params['height'] + _params['roofHeight']);
		this.geometry.vertices.push( cenroidPos );
		var lastVertId = this.geometry.vertices.length - 1;
		for (i = 0; i < _pts.length - 1; i ++) {
			curFace = new THREE.Face3( 
				nbGeoVert + i,
				nbGeoVert + i + 1, // avant moi
				lastVertId
			);
			curFace.color = _roofColor;
			this.geometry.faces.push(curFace);
		}
	}, 
	
	makeRoofDome : function(_pts, _params, _roofColor) {
		var i;
		var nbGeoVert = this.geometry.vertices.length;
		var curFace;
		var elevation;
		var shapeVertDatasLen;
		var roofVertShape = [];
		for (i = 0; i < _pts.length; i ++) {
			roofVertShape.push( [_pts[i]['lon'], _pts[i]['lat']] );
		}
		var centroid = Oev.Math.findCentroid(roofVertShape);
		var shapeVertDatas = [];
		var cenroidPos = OEV.earth.coordToXYZ( centroid.lon, centroid.lat, _params['height'] );
		var nbSlices = 4;
		var curAngleSlope = 0;
		var slopeStep = ( Math.PI / 2 ) / nbSlices;
		var distMax = 0;
		var shapeVertPos;
		var shapeVertDist;
		var roofVertShapeLen = roofVertShape.length;
		var rv;
		for (rv = 0; rv < roofVertShapeLen; rv ++) {
			shapeVertPos = OEV.earth.coordToXYZ( roofVertShape[rv][0], roofVertShape[rv][1], _params['height'] );
			shapeVertDist = Math.sqrt( ( shapeVertPos.x - cenroidPos.x ) * ( shapeVertPos.x - cenroidPos.x ) + ( shapeVertPos.z - cenroidPos.z ) * ( shapeVertPos.z - cenroidPos.z ) );
			shapeVertDatas.push( { 'DIST' : shapeVertDist, 'OFFX' : cenroidPos.x - shapeVertPos.x, 'OFFY' : cenroidPos.z - shapeVertPos.z } );
			if (shapeVertDist > distMax) {
				distMax = shapeVertDist;
			}
		}
		var highestPos = cenroidPos.y - distMax;
		heightOffset = OEV.earth.altitudeFromPos(highestPos);
		heightOffset -= _params['height']
		elevation = this.tile.interpolateEle(centroid.lon, centroid.lat, true);
		cenroidPos = OEV.earth.coordToXYZ(centroid.lon, centroid.lat, elevation + _params['height'] - heightOffset);
		var vertexPos;
		var rs;
		shapeVertDatasLen = shapeVertDatas.length;
		for (rs = 0; rs < nbSlices; rs ++) {
			for (i = 0; i < shapeVertDatasLen; i ++) {
				vertexPos = new THREE.Vector3( 
					cenroidPos.x - (shapeVertDatas[i]['OFFX'] * Math.cos( curAngleSlope )), 
					cenroidPos.y - (Math.sin( curAngleSlope ) * shapeVertDatas[i]['DIST']), 
					cenroidPos.z - (shapeVertDatas[i]['OFFY'] * Math.cos( curAngleSlope )) 
				);
				this.geometry.vertices.push(vertexPos);
				if (i > 0 && rs < nbSlices - 1) {
					curFace = new THREE.Face3( 
						nbGeoVert + ( rs * roofVertShape.length ) + i, // dessous
						nbGeoVert + ( ( rs + 1 ) * roofVertShape.length ) + i, // moi
						nbGeoVert + ( rs * roofVertShape.length ) + ( i - 1 ) ); // dessous avant
					curFace.color = _roofColor;
					this.geometry.faces.push(curFace);
					curFace = new THREE.Face3( 
						nbGeoVert + ( ( rs + 1 ) * roofVertShape.length ) + i, // moi
						nbGeoVert + ( ( rs + 1 ) * roofVertShape.length ) + (i - 1), // avant moi
						nbGeoVert + ( rs * roofVertShape.length ) + (i - 1)  // dessous avant
						);
					curFace.color = _roofColor;
					this.geometry.faces.push(curFace);
				}
			}
			curAngleSlope += slopeStep;
		}
		vertexPos = new THREE.Vector3( 
			cenroidPos.x, 
			cenroidPos.y - distMax, 
			cenroidPos.z 
		);
		this.geometry.vertices.push(vertexPos);
		var curFaceC;
		for (i = 0; i < shapeVertDatasLen; i ++) {
			if (i > 0) {
				curFaceC = new THREE.Face3( 
					nbGeoVert + ( ( nbSlices - 1 ) * roofVertShape.length ) + i, // dessous
					(this.geometry.vertices.length - 1), // moi
					nbGeoVert + ((nbSlices - 1) * roofVertShape.length) + (i - 1)); // dessous avant
				curFaceC.color = _roofColor;
				this.geometry.faces.push(curFaceC);
			}
		}
		return heightOffset;
	}, 
	
	makeRoofFlat : function(_pts, _params, _roofColor) {
		var i;
		var nbGeoVert = this.geometry.vertices.length;
		var curFace;
		var elevation;
		var pos;
		var roofVert = [];
		var ptsLen = _pts.length;
		for (i = 0; i < ptsLen; i ++) {
			elevation = this.tile.interpolateEle( _pts[i]['lon'], _pts[i]['lat'], true );
			pos = OEV.earth.coordToXYZ(_pts[i]['lon'], _pts[i]['lat'], elevation + _params['height']);
			roofVert.push(pos.x, pos.z, pos.y);
			this.geometry.vertices.push(pos);
		}
		var roofFaces = earcut(roofVert, null, 3);
		var roofFacesLen = roofFaces.length;
		for (i = 0; i < roofFacesLen; i += 3) {
			curFace = new THREE.Face3( 
				nbGeoVert + roofFaces[i], 
				nbGeoVert + roofFaces[i+1], 
				nbGeoVert + roofFaces[i+2] 
			);
			curFace.color = _roofColor;
			this.geometry.faces.push(curFace);
		}
	}, 
	
	makeRoof : function(_pts, _params) {
		var i;
		var heightOffset = 0;
		var nbGeoVert = this.geometry.vertices.length;
		var curFace;
		var elevation;
		var roofColor = new THREE.Color("rgb(255, 255, 255)");
		if( _params['roofColor'] != '' ){
			if( _params['roofColor'].indexOf( "#" ) == 0 ){
				roofColor = new THREE.Color(""+_params['roofColor']+"");
			}else{
				var color = Oev.Utils.getColorByName(_params['roofColor']);
				if (color == undefined){
					if( _params['roofColor'].length == 6 ){
						roofColor = new THREE.Color("#"+_params['roofColor']+"");
					}
				}else{
					roofColor = new THREE.Color("rgb("+color[0]+", "+color[1]+", "+color[2]+")");
				}
			}
		}
		if (_params['roofShape'] == 'pyramidal'){
			this.makeRoofPyramidal(_pts, _params, roofColor);
		} else if (_params['roofShape'] == 'dome') {
			heightOffset = this.makeRoofDome(_pts, _params, roofColor);
		} else { // flat
			this.makeRoofFlat(_pts, _params, roofColor);
		}
		return {'heightOffset': heightOffset};
	}, 

	makeWalls : function( _pts, _params ) {
		var c;
		var vertLonA = undefined;
		var vertLatA = undefined;
		var vertLonB;
		var vertLatB;
		var elevation;
		var coordsWorld;
		var wallFace;
		var curLevel;
		var wallColor;
		if (_params['wallsColor'] == '') {
			wallColor = new THREE.Color("rgb(255, 255, 255)");
		} else if (_params['wallsColor'].indexOf( "#" ) == 0) {
			wallColor = new THREE.Color(""+_params['wallsColor']+"");
		} else {
			var color = Oev.Utils.getColorByName( _params['wallsColor'] );
			if( color == undefined ){
				if( _params['wallsColor'].length == 6 ){
					wallColor = new THREE.Color("#"+_params['wallsColor']+"");
				}
			} else {
				wallColor = new THREE.Color("rgb("+color[0]+", "+color[1]+", "+color[2]+")");
			}
		}
		var nbVert = this.geometry.vertices.length;
		for (curLevel = _params['minLevels']; curLevel < _params['levels']; curLevel ++) {
			for (c = 0; c < _pts.length; c ++) {
				if (vertLonA != undefined) {
					elevation = this.tile.interpolateEle(vertLonA, vertLatA, true);
					coordsWorld = OEV.earth.coordToXYZ(vertLonA, vertLatA, elevation + (curLevel * _params['levelHeight']) + _params['minHeight']);
					this.geometry.vertices.push(coordsWorld);
					coordsWorld = OEV.earth.coordToXYZ(vertLonA, vertLatA, elevation + (curLevel * _params['levelHeight']) + _params['minHeight'] + _params['levelHeight']);
					this.geometry.vertices.push(coordsWorld);
					vertLonB = _pts[c]['lon'];
					vertLatB = _pts[c]['lat'];
					elevation = this.tile.interpolateEle(vertLonB, vertLatB, true);
					coordsWorld = OEV.earth.coordToXYZ(vertLonB, vertLatB, elevation + (curLevel * _params['levelHeight']) + _params['minHeight'] + _params['levelHeight']);
					this.geometry.vertices.push(coordsWorld);
					coordsWorld = OEV.earth.coordToXYZ(vertLonB, vertLatB, elevation + (curLevel * _params['levelHeight']) + _params['minHeight'] );
					this.geometry.vertices.push(coordsWorld);
					wallFace = new THREE.Face3(nbVert + 2, nbVert + 1, nbVert + 0);
					wallFace.color = wallColor;
					this.geometry.faces.push(wallFace);
					wallFace = new THREE.Face3(nbVert + 0, nbVert + 3, nbVert + 2);
					this.geometry.faces.push(wallFace);
					nbVert += 4;
				}
				vertLonA = _pts[c]['lon'];
				vertLatA = _pts[c]['lat'];
			}
		}
	}, 

	construct : function() {
		var b;
		if (this.onStage) {
			this.geometry = new THREE.Geometry();
			this.geometry.dynamic = false;
			for (b = 0; b < this.datas.length; b ++) {
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
				if (curBuilding['tags'] == undefined) {
					curBuilding['tags'] = {};
				}
				if ('building:part' in curBuilding['tags']) {
					if( curBuilding["tags"]["building:part"] == "no" ){
						drawBuilding = false;
					}
				} else if (Oev.Tile.Building.exculdedId.indexOf( curBuilding["id"]) >= 0){
					drawBuilding = false;
				}
				if ("roof:height" in curBuilding["tags"]) {
					buildingParams['roofHeight'] = parseFloat( curBuilding["tags"]['roof:height'] );
				}
				if ("roof:shape" in curBuilding["tags"]) {
					buildingParams['roofShape'] = curBuilding["tags"]["roof:shape"];
				}
				if ("roof:colour" in curBuilding["tags"]) {
					buildingParams['roofColor'] = curBuilding["tags"]["roof:colour"];
				}
				if ("building:colour" in curBuilding["tags"]) {
					buildingParams['wallsColor'] = curBuilding["tags"]["building:colour"];
				}
				if ("building:facade:colour" in curBuilding["tags"]) {
					buildingParams['wallsColor'] = curBuilding["tags"]["building:facade:colour"];
				}
				if ("name" in curBuilding["tags"]) {
					curName = curBuilding["tags"]["name"];
				}
				if ("min_height" in curBuilding["tags"]) {
					buildingParams['minHeight'] = parseFloat( curBuilding["tags"]["min_height"] );
				}
				if ("building:levels" in curBuilding["tags"]) {
					buildingParams['levels'] = parseInt( curBuilding["tags"]["building:levels"] );
				}
				if ("building:min_level" in curBuilding["tags"]) {
					buildingParams['minLevels'] = parseInt( curBuilding["tags"]["building:min_level"] );
					buildingParams['minHeight'] = 0;
				}
				if ("height" in curBuilding["tags"]) {
					curBuilding["tags"]["height"].replace("m", "");
					curBuilding["tags"]["height"].replace(" ", "");
					buildingParams['height'] = parseFloat( curBuilding["tags"]["height"] );
				}else{
					buildingParams['height'] = buildingParams['levels'] * 3;
				}
				buildingParams['levelHeight'] = ( buildingParams['height'] - buildingParams['minHeight'] ) / buildingParams['levels'];
				if (drawBuilding) {
					var roofDatas = this.makeRoof(curBuilding["vertex"], buildingParams);
					buildingParams['height'] -= roofDatas['heightOffset'];
					buildingParams['levelHeight'] = ( buildingParams['height'] - buildingParams['minHeight'] ) / buildingParams['levels'];
					this.makeWalls(curBuilding["vertex"], buildingParams);
				}
			}
			this.geometry.computeFaceNormals();
			this.geometry.computeVertexNormals();
			this.geometry.colorsNeedUpdate = true
			this.meshe = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(this.geometry), OEV.earth.buildingsWallMat);
			this.geometry.dispose();
			this.geometry = undefined;
			this.tile.meshe.add( this.meshe );
			this.meshe.receiveShadow = true;
			this.meshe.castShadow = true;
			OEV.MUST_RENDER = true;
		}
	},  

	hide : function( _state ) {
		if (_state && this.onStage == true) {
			this.onStage = false;
			if (this.datasLoaded){
				if (this.meshe != undefined) {
					this.tile.meshe.remove(this.meshe);
				}
			}
			OEV.earth.loaderBuilding.abort({
				z : this.zoom, 
				x : this.tileX, 
				y : this.tileY
			});
		} else if (!_state && this.onStage == false) {
			this.onStage = true;
			if (this.datasLoaded) {
				if (this.meshe != undefined) {
					this.tile.meshe.add(this.meshe);
				}
			} else {
				this.load();
			}
		}
	}, 

	dispose : function() {
		this.hide(true);
		if(!this.datasLoaded){
			OEV.earth.tilesBuildingsMng.removeWaitingList(this.zoom + "/" + this.tileX + "/" + this.tileY);
		}
		for (var type in this.partMeshes) {
			if (!this.partMeshes.hasOwnProperty(type)) continue;
			if(this.partMeshes[type] != undefined) {
				this.partMeshes[type].geometry.dispose();
				OEV.scene.remove(this.partMeshes[type]);
			}
		}
		if (this.meshe != undefined) {
			this.meshe.geometry.dispose();
			this.meshe = undefined;
		}
	}, 
};
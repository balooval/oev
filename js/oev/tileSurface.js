'use strict';

Oev.Tile.Surface = function (_tile, _tileX, _tileY, _zoom) {
	this.tile = _tile;
	this.datasLoaded = false;
	this.zoom = _zoom;
	this.tileX = _tileX;
	this.tileY = _tileY;
	this.onStage = true;
	this.datas = undefined;
	this.partMeshes = {
		'vineyard' : undefined, 
		'forest' : undefined, 
		'scrub' : undefined, 
	};
	
	this.twoSideMesh = undefined;
	this.twoSideGeo = new THREE.Geometry();
}

Oev.Tile.Surface.prototype = {

	useCache : true, 

	load : function() {
		if( !this.datasLoaded ){
			OEV.earth.tilesLandusesMng.getDatas(this, this.zoom+'/'+this.tileX+'/'+this.tileY, this.tileX, this.tileY, this.zoom, this.tile.distToCam);
		}else{
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

	construct : function() {
		if (!this.onStage) {
			return false;
		}
		var partGeom = {
			'vineyard' : undefined, 
			'forest' : undefined, 
			'scrub' : undefined, 
		};
		var surfacesTypes = [];
		var surfaces = [];
		var tileW = this.tile.endCoord.x - this.tile.startCoord.x;
		var tileH = Math.abs(this.tile.endCoord.y - this.tile.startCoord.y);
		for( var i = 0; i < this.datas['elements'].length; i ++ ){
			if( this.datas['elements'][i]['type'] == 'way' ){
				var curSurface = [];
				for( var n = 0; n < this.datas['elements'][i]['nodes'].length; n ++ ){
					var myNodeId = this.datas['elements'][i]['nodes'][n];
					for( var o = 0; o < this.datas['elements'].length; o ++ ){
						if( this.datas['elements'][o]['type'] == 'node' && this.datas['elements'][o]['id'] == myNodeId ){
							curSurface.push( { "lon" : parseFloat( this.datas['elements'][o]['lon'] ), "lat" : parseFloat( this.datas['elements'][o]['lat'] ) } );
						}
					}
				}
				var curType = 'none';
				if ("landuse" in this.datas['elements'][i]['tags']) {
					if (this.datas['elements'][i]['tags']['landuse'] == 'vineyard') {
						curType = 'vineyard';
					} else if (this.datas['elements'][i]['tags']['landuse'] == 'forest') {
						curType = 'forest';
					}
				}else if ("natural" in this.datas['elements'][i]['tags']) {
					if (this.datas['elements'][i]['tags']['natural'] == 'wood') {
						curType = 'forest';
					} else if (this.datas['elements'][i]['tags']['natural'] == 'scrub') {
						curType = 'scrub';
					} else if (this.datas['elements'][i]['tags']['natural'] == 'water') {
						curType = 'water';
					}
				} else if ("waterway" in this.datas['elements'][i]['tags']) {
					if (this.datas['elements'][i]['tags']['waterway'] == 'riverbank') {
						curType = 'water';
					}
				}
				if (curType != 'none') {
					surfaces.push(curSurface);
					surfacesTypes.push(curType);
					if (curType != 'water') {
						partGeom[curType] = new THREE.Geometry();
					}
				}
			}
		}
		var nbVert = 0;
		var bbox = [this.tile.startCoord.x, this.tile.endCoord.y, this.tile.endCoord.x, this.tile.startCoord.y];
		for (var s = 0; s < surfaces.length; s ++) {
			var curPoly = [];
			for (var n = 0; n < surfaces[s].length - 1; n ++) {
				curPoly.push([surfaces[s][n]["lon"], surfaces[s][n]["lat"]]);
			}
			var res = lineclip.polygon(curPoly, bbox);
			if (res.length > 0) {
				res.push(res[0]);
			}
			if (surfacesTypes[s] == 'vineyard') {
				for (var coordLon = this.tile.startCoord.x; coordLon < this.tile.endCoord.x; coordLon += tileW / 40) {
					for (var coordLat = this.tile.endCoord.y; coordLat < this.tile.startCoord.y; coordLat += tileH / 80) {
						if(this.isIn(res, coordLon, coordLat)) {
							var altP = this.tile.interpolateEle(coordLon, coordLat, true);
							var pos = OEV.earth.coordToXYZ(coordLon + ((tileW / 100) * Math.random()), coordLat + ((tileH / 120) * Math.random()), altP + 1 - (Math.random() * 0.5));
							var particle = new THREE.Vector3(pos.x, pos.y, pos.z);
							partGeom[surfacesTypes[s]].vertices.push(particle);
						}
					}
				}
			} else if (surfacesTypes[s] == 'scrub' || surfacesTypes[s] == 'forest') {
				var surGeoJson = {
					"type": "Polygon",
					"coordinates": [res]
				};
				// var curArea = Math.round(geojsonArea.geometry(surGeoJson) / 50);
				var curArea = Math.round(geojsonArea.geometry(surGeoJson) / 100);
				var nbPartIn = 0;
				var coordLon, coordLat;
				while (nbPartIn < curArea) {
					coordLon = this.tile.startCoord.x + (tileW * Math.random());
					coordLat = this.tile.endCoord.y + (tileH * Math.random());
					if (this.isIn( res, coordLon, coordLat)) {
						nbPartIn ++;
						var altP = this.tile.interpolateEle(coordLon, coordLat, true);
						// var pos = OEV.earth.coordToXYZ( coordLon, coordLat, altP + 5 - Math.random() * 2 );
						// var particle = new THREE.Vector3(pos.x, pos.y, pos.z);
						// partGeom[surfacesTypes[s]].vertices.push(particle);
						this.buildTwoSideElmt(coordLon, coordLat, altP);
					}
				}
			}
		}
		var mat;
		for( var type in partGeom ){
			if (!partGeom.hasOwnProperty(type)) continue;
			if (partGeom[type] === undefined) continue;
			if( type == 'vineyard' ){
				mat = OEV.earth.vineyardMat;
			} else if (type == 'scrub') {
				mat = OEV.earth.vineyardMat;
			} else {
				mat = OEV.earth.forestMat;
			}
			this.partMeshes[type] = new THREE.Points(partGeom[type], mat);
			OEV.scene.add(this.partMeshes[type]);
		}
		OEV.MUST_RENDER = true;
		
		this.twoSideMesh = new THREE.Mesh(this.twoSideGeo, OEV.earth.testForestMat);
		this.twoSideMesh.receiveShadow = true;
		this.twoSideMesh.castShadow = true;
		OEV.scene.add(this.twoSideMesh);
	}, 
	
	buildTwoSideElmt : function(_lon, _lat, _alt) {
		_alt -= 0.5;
		var elmtWidth = 0.0001;
		var elmtDepth = 0.0001;
		var elmtHeight = 15 + Math.random() * 5;
		this.buildElmtSide(_lon, _lat, _alt, {width: elmtWidth, depth: 0, height: elmtHeight});
		this.buildElmtSide(_lon, _lat, _alt, {width: 0, depth: elmtDepth, height: elmtHeight});
	}, 
	
	buildElmtSide : function(_lon, _lat, _alt, props) {
		var elmtHeight = 80;
		var vertId = (this.twoSideGeo.faces.length / 2) * 6;
		var nbFaces = this.twoSideGeo.faces.length;
		var posA = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt);
		var posB = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt);
		var posC = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt + props.height);
		var posD = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt + props.height);
		var posE = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt + props.height);
		var posF = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt);
		this.twoSideGeo.vertices.push(posA);
		this.twoSideGeo.vertices.push(posB);
		this.twoSideGeo.vertices.push(posC);
		this.twoSideGeo.vertices.push(posD);
		this.twoSideGeo.vertices.push(posE);
		this.twoSideGeo.vertices.push(posF);
		this.twoSideGeo.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		this.twoSideGeo.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(1, 0), 
			new THREE.Vector2(0, 0), 
			new THREE.Vector2(0, 1)
		];
		this.twoSideGeo.faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		this.twoSideGeo.faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(0, 1), 
			new THREE.Vector2(1, 1), 
			new THREE.Vector2(1, 0)
		];
	},
	
	buildElmtSideOk : function(_lon, _lat, _alt) {
		var elmtwidth = 0.0003;
		var elmtHeight = 50;
		var vertId = (this.twoSideGeo.faces.length / 2) * 6;
		var nbFaces = this.twoSideGeo.faces.length;
		var posA = OEV.earth.coordToXYZ(_lon + elmtwidth, _lat, _alt);
		var posB = OEV.earth.coordToXYZ(_lon - elmtwidth, _lat, _alt);
		var posC = OEV.earth.coordToXYZ(_lon - elmtwidth, _lat, _alt + elmtHeight);
		var posD = OEV.earth.coordToXYZ(_lon - elmtwidth, _lat, _alt + elmtHeight);
		var posE = OEV.earth.coordToXYZ(_lon + elmtwidth, _lat, _alt + elmtHeight);
		var posF = OEV.earth.coordToXYZ(_lon + elmtwidth, _lat, _alt);
		this.twoSideGeo.vertices.push(posA);
		this.twoSideGeo.vertices.push(posB);
		this.twoSideGeo.vertices.push(posC);
		this.twoSideGeo.vertices.push(posD);
		this.twoSideGeo.vertices.push(posE);
		this.twoSideGeo.vertices.push(posF);
		this.twoSideGeo.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		this.twoSideGeo.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(1, 0), 
			new THREE.Vector2(0, 0), 
			new THREE.Vector2(0, 1)
		];
		this.twoSideGeo.faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		this.twoSideGeo.faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(0, 1), 
			new THREE.Vector2(1, 1), 
			new THREE.Vector2(1, 0)
		];
		var elmtwidth = 0.0003;
		var faceAPtA = OEV.earth.coordToXYZ(_lon - elmtwidth / 2, _lat, _alt);
		var faceAPtB = OEV.earth.coordToXYZ(_lon + elmtwidth / 2, _lat, _alt);
		var faceBPtA = OEV.earth.coordToXYZ(_lon, _lat - elmtwidth / 2, _alt);
		var faceBPtB = OEV.earth.coordToXYZ(_lon, _lat + elmtwidth / 2, _alt);
	}, 
	
	isIn : function( _polygon, _lon, _lat ) {
			var angle = 0;
			var ptA;
			var ptB;
			var segNb = _polygon.length - 1;
			for( var i = 0; i < segNb; i++ ){
				ptA = _polygon[i];
				ptB = _polygon[i+1];
				angle += Oev.Math.angle2D( ptA[0]-_lon, ptA[1]-_lat, ptB[0]-_lon, ptB[1]-_lat );
			}
			if( Math.abs( angle ) < Math.PI ){
				return false;
			}
			return true;
	}, 

	hide : function( _state ) {
		if( _state && this.onStage == true ){
			this.onStage = false;
			if( this.datasLoaded ){
				for( var type in this.partMeshes ){
					if( !this.partMeshes.hasOwnProperty( type ) ) continue;
					if( this.partMeshes[type] != undefined ){
						OEV.scene.remove( this.partMeshes[type] );
					}
				}
				if( this.twoSideMesh != undefined ){
					OEV.scene.remove(this.twoSideMesh);
				}
			}
		}else if( !_state && this.onStage == false ){
			this.onStage = true;
			if( this.datasLoaded ){
				for( var type in this.partMeshes ){
					if( !this.partMeshes.hasOwnProperty( type ) ) continue;
					if( this.partMeshes[type] != undefined ){
						OEV.scene.add( this.partMeshes[type] );
					}
				}
				if( this.twoSideMesh != undefined ){
					OEV.scene.add(this.twoSideMesh);
				}
			}else{
				this.load();
			}
		}
	}, 

	dispose : function() {
		this.hide(true);
		if( !this.datasLoaded ){
			OEV.earth.tilesLandusesMng.removeWaitingList( this.zoom + "/" + this.tileX + "/" + this.tileY );
		}
		for( var type in this.partMeshes ){
			if( !this.partMeshes.hasOwnProperty( type ) ) continue;
			if( this.partMeshes[type] != undefined ){
				this.partMeshes[type].geometry.dispose();
				OEV.scene.remove( this.partMeshes[type] );
			}
		}
		this.twoSideGeo.dispose();
	}, 
}
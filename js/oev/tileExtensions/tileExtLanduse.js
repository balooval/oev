Oev.Tile.Extension.LanduseMeshes = (function() {
	var meshZoom = {};
	var geoListZoom = {};
	var geoMergeZoom = {};
	
	var api = {
		addTrees : function(_zoom, _mesh) {
			if (meshZoom[_zoom] === undefined) {
				meshZoom[_zoom] = new THREE.Mesh(new THREE.Geometry(), OEV.earth.testForestMat);
				geoListZoom[_zoom] = [];
				geoMergeZoom[_zoom] = new THREE.Geometry();
				OEV.scene.add(meshZoom[_zoom]);
			}
			var geo = _mesh.geometry;
			_mesh.updateMatrix();
			geoListZoom[_zoom].push(geo);
			meshZoom[_zoom].geometry.merge(geo, _mesh.matrix);
			// geoMergeZoom[_zoom].merge(_geo);
			// meshZoom[_zoom].geometry = geoMergeZoom[_zoom];
			console.log('B', meshZoom[_zoom].geometry.vertices.length);
		}, 
		
		removeTrees : function(_zoom, _mesh) {
			var geo = _mesh.geometry;
			geoListZoom[_zoom].splice(geoListZoom[_zoom].indexOf(geo), 1);
			if (geoListZoom[_zoom].length == 0) {
				OEV.scene.remove(meshZoom[_zoom]);
				return false;
			}
			geoMergeZoom[_zoom] = new THREE.Geometry();
			for (var i = 0; i < geoListZoom[_zoom].length; i ++) {
				geoMergeZoom[_zoom].merge(geoListZoom[_zoom][i]);
			}
			meshZoom[_zoom].geometry = geoMergeZoom[_zoom];
		}, 
	};
	
	return api;
})();

Oev.Tile.Extension.Landuse = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	
	ext.id = 'LANDUSE';
	
	ext.partMeshes = {
		'vineyard' : undefined, 
		'forest' : undefined, 
		'scrub' : undefined, 
	};
	
	ext.twoSideProps = {
		'forest' : {
			width : 0.0001, 
			depth : 0.0001, 
			height : 15, 
		}, 
		'scrub' : {
			width : 0.00003, 
			depth : 0.00003, 
			height : 7, 
		}, 
	};
	ext.twoSideMeshes = {
		'vineyard' : undefined, 
		'forest' : undefined, 
		'scrub' : undefined, 
	};
	ext.twoSideGeos = {
		'vineyard' : new THREE.Geometry(), 
		'forest' : new THREE.Geometry(), 
		'scrub' : new THREE.Geometry(), 
	};
	ext.halfRot = Math.PI / 2;
	
	
	ext.tileReady = function() {
		if (!this.tile.onStage || this.tile.zoom < 15) {
			return false;
		}
		if (!this.dataLoaded) {
			OEV.earth.tilesLandusesMng.getDatas(this, this.tile.zoom+'/'+this.tile.tileX+'/'+this.tile.tileY, this.tile.tileX, this.tile.tileY, this.tile.zoom, this.tile.distToCam);
		}else{
			Oev.Tile.ProcessQueue.addWaiting(this);
		}
	}
	
	ext.setDatas = function(_datas) {
		this.dataLoaded = true;
		this.datas = _datas;
		Oev.Tile.ProcessQueue.addWaiting(this);
	}
	
	ext.construct = function() {
		if (!this.tile.onStage) {
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
						// curType = 'vineyard';
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
				var curArea = Math.round(geojsonArea.geometry(surGeoJson) / 100);
				// var curArea = 10;
				var nbPartIn = 0;
				var coordLon, coordLat;
				while (nbPartIn < curArea) {
					coordLon = this.tile.startCoord.x + (tileW * Math.random());
					coordLat = this.tile.endCoord.y + (tileH * Math.random());
					if (this.isIn( res, coordLon, coordLat)) {
						nbPartIn ++;
						var altP = this.tile.interpolateEle(coordLon, coordLat, true);
						this.buildTwoSideElmt(coordLon, coordLat, altP, surfacesTypes[s]);
					}
				}
			}
		}
		var mat;
		var matTwoSide;
		for( var type in partGeom ){
			if (!partGeom.hasOwnProperty(type)) continue;
			if (partGeom[type] === undefined) continue;
			if( type == 'vineyard' ){
				mat = OEV.earth.vineyardMat;
			} else if (type == 'scrub') {
				mat = OEV.earth.vineyardMat;
				matTwoSide = OEV.earth.testScrubMat;
			} else {
				mat = OEV.earth.forestMat;
				matTwoSide = OEV.earth.testForestMat;
			}
			this.partMeshes[type] = new THREE.Points(partGeom[type], mat);
			OEV.scene.add(this.partMeshes[type]);
			this.twoSideGeos[type].computeFaceNormals();
			this.twoSideGeos[type].computeVertexNormals();
			this.twoSideMeshes[type] = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(this.twoSideGeos[type]), matTwoSide);
			this.twoSideMeshes[type].receiveShadow = true;
			this.twoSideMeshes[type].castShadow = true;
			// if (type == 'forest') {
				// Oev.Tile.Extension.LanduseMeshes.addTrees(this.tile.zoom, this.twoSideMeshes[type]);
			// } else {
				OEV.scene.add(this.twoSideMeshes[type]);
			// }
		}
		OEV.MUST_RENDER = true;
	} 
	
	
	ext.buildTwoSideElmt = function(_lon, _lat, _alt, _type) {
		var angle = Math.random() * 3.14;
		_alt -= 0.5;
		var treeSize = 0.7 + Math.random() * 0.5;
		var elmtWidth = this.twoSideProps[_type].width * treeSize;
		var elmtDepth = this.twoSideProps[_type].depth * treeSize;
		var elmtHeight = this.twoSideProps[_type].height * treeSize;
		
		var elmtWidthRot = elmtWidth * Math.cos(angle);
		var elmtDepthRot = elmtDepth * Math.sin(angle);
		
		var textTile = Math.random() > 0.7 ? 0 : 0.5;
		this.buildElmtSide(_lon, _lat, _alt, {width: elmtWidthRot, depth: elmtDepthRot, height: elmtHeight, type:_type, textTile:textTile});
		
		elmtWidthRot = elmtWidth * Math.cos(angle + Math.PI / 2);
		elmtDepthRot = elmtDepth * Math.sin(angle + Math.PI / 2);
		
		this.buildElmtSide(_lon, _lat, _alt, {width: elmtWidthRot, depth: elmtDepthRot, height: elmtHeight, type:_type, textTile:textTile});
	}
	
	ext.buildElmtSide = function(_lon, _lat, _alt, props) {
		var vertId = (this.twoSideGeos[props.type].faces.length / 2) * 6;
		var nbFaces = this.twoSideGeos[props.type].faces.length;
		var posA = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt);
		var posB = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt);
		var posC = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt + props.height);
		var posD = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt + props.height);
		var posE = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt + props.height);
		var posF = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt);
		this.twoSideGeos[props.type].vertices.push(posA);
		this.twoSideGeos[props.type].vertices.push(posB);
		this.twoSideGeos[props.type].vertices.push(posC);
		this.twoSideGeos[props.type].vertices.push(posD);
		this.twoSideGeos[props.type].vertices.push(posE);
		this.twoSideGeos[props.type].vertices.push(posF);
		this.twoSideGeos[props.type].faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		this.twoSideGeos[props.type].faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(props.textTile + 0.5, 0), 
			new THREE.Vector2(props.textTile, 0), 
			new THREE.Vector2(props.textTile, 1)
		];
		this.twoSideGeos[props.type].faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		this.twoSideGeos[props.type].faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(props.textTile, 1), 
			new THREE.Vector2(props.textTile + 0.5, 1), 
			new THREE.Vector2(props.textTile + 0.5, 0)
		];
	}
	
	ext.isIn = function( _polygon, _lon, _lat ) {
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
	}
	
	ext.show = function() {
		if (this.dataLoaded) {
			for (var type in this.partMeshes) {
				if (this.partMeshes[type] != undefined) {
					OEV.scene.add(this.partMeshes[type]);
				}
				if (this.twoSideMeshes[type] != undefined) {
					// OEV.scene.add(this.twoSideMeshes[type]);
					
					// if (type == 'forest') {
						// Oev.Tile.Extension.LanduseMeshes.addTrees(this.tile.zoom, this.twoSideMeshes[type].geometry);
					// } else {
						OEV.scene.add(this.twoSideMeshes[type]);
					// }
				}
			}
		}else{
			this.tileReady();
		}
	}
	
	ext.hide = function() {
		if (this.dataLoaded) {
			for (var type in this.partMeshes) {
				if (!this.partMeshes.hasOwnProperty(type)) {
					continue;
				}
				if (this.partMeshes[type] != undefined) {
					OEV.scene.remove(this.partMeshes[type]);
				}
				if (this.twoSideMeshes[type] != undefined) {
					// OEV.scene.remove(this.twoSideMeshes[type]);
					
					
					// if (type == 'forest') {
						// Oev.Tile.Extension.LanduseMeshes.removeTrees(this.tile.zoom, this.twoSideMeshes[type]);
					// } else {
						OEV.scene.remove(this.twoSideMeshes[type]);
					// }
					
				}
			}
			OEV.MUST_RENDER = true;
		}
	}
	
	ext.dispose = function() {
		this.hide();
		if( !this.dataLoaded ){
			OEV.earth.tilesLandusesMng.removeWaitingList(this.tile.zoom + "/" + this.tile.tileX + "/" + this.tile.tileY);
		}
		for (var type in this.partMeshes) {
			if (!this.partMeshes.hasOwnProperty(type)) continue;
			if (this.partMeshes[type] != undefined) {
				this.partMeshes[type].geometry.dispose();
				OEV.scene.remove(this.partMeshes[type]);
			}
			if (this.twoSideMeshes[type] != undefined) {
				this.twoSideMeshes[type].geometry.dispose();
			}
		}
	}
	
	ext.onInit(_tile);
	
	return ext;
}
Oev.Tile.Extension.LanduseTexture = (function() {
	var canvas = document.createElement('canvas');
	canvas.width = '256';
	canvas.height = '256';
	var context = canvas.getContext('2d');

	var texturesDiffuse = {
		forest : 'landuse_forest', 
		scrub : 'landuse_scrub', 
		vineyard : 'landuse_vineyard', 
		water : 'water_color', 
	};
	var texturesNormal = {
		forest : 'normal_forest', 
		scrub : 'normal_forest', 
		vineyard : 'normal_vineyard', 
		water : 'waternormals', 
	};

	var api = {
		drawPolygon : function(_image, _polygon, _type, _normal) {
			var textDef = _normal ? texturesNormal : texturesDiffuse;
			context.drawImage(_image, 0, 0);
			context.save();
			context.beginPath();
			context.moveTo(_polygon[0][0], _polygon[0][1]);
			for (var i = 1; i < _polygon.length; i ++) {
				context.lineTo(_polygon[i][0], _polygon[i][1]);
			}
			context.closePath();
			context.clip();
			context.drawImage(OEV.textures[textDef[_type]].image, 0, 0);
			context.restore();
			var image = new Image();
			image.src = canvas.toDataURL();
			return new THREE.Texture(image);
		}
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
		'vineyard' : {
			width : 0.00005, 
			depth : 0.00005, 
			height : 6, 
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
	
	ext.drawTexture = function(_surfPolygon, _type) {
		var coordW = Math.abs(this.tile.endCoord.x - this.tile.startCoord.x);
		var coordH = Math.abs(this.tile.startCoord.y - this.tile.endCoord.y);
		var i;
		var ptNorm;
		var normalisedPoly = [];
		for (i = 0; i < _surfPolygon.length; i ++) {
			ptNorm = [
				Math.abs((((this.tile.endCoord.x - _surfPolygon[i][0]) / coordW) * 256) - 256), 
				((this.tile.startCoord.y - _surfPolygon[i][1]) / coordH) * 256, 
			]
			normalisedPoly.push(ptNorm);
		}
		this.tile.material.map = Oev.Tile.Extension.LanduseTexture.drawPolygon(this.tile.material.map.image, normalisedPoly, _type, false);
		this.tile.material.normalMap = Oev.Tile.Extension.LanduseTexture.drawPolygon(this.tile.material.normalMap.image, normalisedPoly, _type, true);
		this.tile.material.needsUpdate = true;
		this.tile.material.map.needsUpdate = true;
		this.tile.material.normalMap.needsUpdate = true;
	}
	
	ext.construct = function() {
		if (Oev.Tile.Extension['ACTIV_' + ext.id] === false) {
			return false;
		}
		if (!this.tile.onStage) {
			return false;
		}
		var partGeom = {
			vineyard : undefined, 
			forest : undefined, 
			scrub : undefined, 
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
		this.tile.material.normalMap = OEV.textures['normal_flat'];
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
			this.drawTexture(res, surfacesTypes[s]);
			if (surfacesTypes[s] == 'vineyard') {
				for (var coordLon = this.tile.startCoord.x; coordLon < this.tile.endCoord.x; coordLon += tileW / 40) {
					for (var coordLat = this.tile.endCoord.y; coordLat < this.tile.startCoord.y; coordLat += tileH / 80) {
						if(Oev.Math.ptIsInPolygon(res, coordLon, coordLat)) {
							var altP = Oev.Globe.getElevationAtCoords(coordLon, coordLat, true);
							this.buildTwoSideElmt(coordLon + ((tileW / 100) * Math.random()), coordLat + ((tileH / 120) * Math.random()), altP, surfacesTypes[s]);
						}
					}
				}
			} else if (surfacesTypes[s] == 'scrub' || surfacesTypes[s] == 'forest') {
				var surGeoJson = {
					type : "Polygon",
					coordinates : [res]
				};
				var curArea = Math.round(geojsonArea.geometry(surGeoJson) / 100);
				if (surfacesTypes[s] == 'scrub') {
					curArea *= 2;
				}
				// var curArea = 10;
				var nbPartIn = 0;
				var coordLon, coordLat;
				while (nbPartIn < curArea) {
					coordLon = this.tile.startCoord.x + (tileW * Math.random());
					coordLat = this.tile.endCoord.y + (tileH * Math.random());
					if (Oev.Math.ptIsInPolygon( res, coordLon, coordLat)) {
						nbPartIn ++;
						var altP = Oev.Globe.getElevationAtCoords(coordLon, coordLat, true);
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
				matTwoSide = OEV.earth.testVineyardMat;
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
			OEV.scene.add(this.twoSideMeshes[type]);
		}
		OEV.MUST_RENDER = true;
	} 
	
	
	ext.buildTwoSideElmt = function(_lon, _lat, _alt, _type) {
		var angle = Math.random() * 3.14;
		_alt -= 0.5;
		var sizeVar = 0.7 + Math.random() * 0.5;
		var typeProps = this.twoSideProps[_type];
		var elmtWidth = typeProps.width * sizeVar;
		var elmtDepth = typeProps.depth * sizeVar;
		var elmtHeight = typeProps.height * sizeVar;
		var elmtWidthRot = elmtWidth * Math.cos(angle);
		var elmtDepthRot = elmtDepth * Math.sin(angle);
		var textTile = Math.random() > 0.7 ? 0 : 0.5;
		this.buildElmtSide(_lon, _lat, _alt, [elmtWidthRot, elmtDepthRot, elmtHeight, _type, textTile]);
		elmtWidthRot = elmtWidth * Math.cos(angle + ext.halfRot);
		elmtDepthRot = elmtDepth * Math.sin(angle + ext.halfRot);
		this.buildElmtSide(_lon, _lat, _alt, [elmtWidthRot, elmtDepthRot, elmtHeight, _type, textTile]);
	}
	
	ext.buildElmtSide = function(_lon, _lat, _alt, props) {
		var propWidth = props[0];
		var propDepth = props[1];
		var propHeight = props[2];
		var propType = props[3];
		var propTexTile = props[4];
		var vertId = (this.twoSideGeos[propType].faces.length / 2) * 6;
		var nbFaces = this.twoSideGeos[propType].faces.length;
		var posA = OEV.earth.coordToXYZ(_lon + propWidth, _lat + propDepth, _alt);
		this.twoSideGeos[propType].vertices.push(posA);
		var posB = OEV.earth.coordToXYZ(_lon - propWidth, _lat - propDepth, _alt);
		this.twoSideGeos[propType].vertices.push(posB);
		var posC = OEV.earth.coordToXYZ(_lon - propWidth, _lat - propDepth, _alt + propHeight);
		this.twoSideGeos[propType].vertices.push(posC);
		var posD = OEV.earth.coordToXYZ(_lon - propWidth, _lat - propDepth, _alt + propHeight);
		this.twoSideGeos[propType].vertices.push(posD);
		var posE = OEV.earth.coordToXYZ(_lon + propWidth, _lat + propDepth, _alt + propHeight);
		this.twoSideGeos[propType].vertices.push(posE);
		var posF = OEV.earth.coordToXYZ(_lon + propWidth, _lat + propDepth, _alt);
		this.twoSideGeos[propType].vertices.push(posF);
		this.twoSideGeos[propType].faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		this.twoSideGeos[propType].faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(propTexTile + 0.5, 0), 
			new THREE.Vector2(propTexTile, 0), 
			new THREE.Vector2(propTexTile, 1)
		];
		this.twoSideGeos[propType].faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		this.twoSideGeos[propType].faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(propTexTile, 1), 
			new THREE.Vector2(propTexTile + 0.5, 1), 
			new THREE.Vector2(propTexTile + 0.5, 0)
		];
	}
	
	ext.show = function() {
		if (this.dataLoaded) {
			for (var type in this.partMeshes) {
				if (this.partMeshes[type] != undefined) {
					OEV.scene.add(this.partMeshes[type]);
				}
				if (this.twoSideMeshes[type] != undefined) {
					OEV.scene.add(this.twoSideMeshes[type]);
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
					OEV.scene.remove(this.twoSideMeshes[type]);
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
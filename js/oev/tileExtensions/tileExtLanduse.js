Oev.Tile.Extension.Landuse = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	
	var canvasDiffuse = null;
	var canvasNormal = null;
	
	ext.id = 'LANDUSE';
	
	ext.twoSideProps = {
		forest : {
			width : 0.0001, 
			depth : 0.0001, 
			height : 15, 
		}, 
		scrub : {
			width : 0.00003, 
			depth : 0.00003, 
			height : 7, 
		}, 
		vineyard : {
			width : 0.00005, 
			depth : 0.00005, 
			height : 6, 
		}, 
	};
	ext.twoSideMeshes = {
		vineyard : undefined, 
		forest : undefined, 
		scrub : undefined, 
	};
	ext.twoSideGeos = {
		vineyard : new THREE.Geometry(), 
		forest : new THREE.Geometry(), 
		scrub : new THREE.Geometry(), 
	};
	ext.halfRot = Math.PI / 2;
	
	ext.surfacesCoords = [];
	ext.surfacesTypes = [];
	ext.surfacesClipped = [];
	ext.constructStep = 'JSON';
	
	
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
	
	ext.extractFromJson = function() {
		var curSurface;
		var n;
		var o;
		for (i = 0; i < this.datas['elements'].length; i ++) {
			if (this.datas['elements'][i]['type'] == 'way') {
				curSurface = [];
				for (n = 0; n < this.datas['elements'][i]['nodes'].length; n ++) {
					var myNodeId = this.datas['elements'][i]['nodes'][n];
					for (o = 0; o < this.datas['elements'].length; o ++) {
						if (this.datas['elements'][o]['type'] == 'node' && this.datas['elements'][o]['id'] == myNodeId) {
							curSurface.push([
								parseFloat(this.datas['elements'][o]['lon']), 
								parseFloat(this.datas['elements'][o]['lat'])
							]);
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
					this.surfacesCoords.push(curSurface);
					this.surfacesTypes.push(curType);
				}
			}
		}
	}
	
	ext.clipSurface = function() {
		var n;
		var res;
		var curPoly;
		var bbox = [this.tile.startCoord.x, this.tile.endCoord.y, this.tile.endCoord.x, this.tile.startCoord.y];
		for (var s = 0; s < this.surfacesCoords.length; s ++) {
			curPoly = [];
			for (n = 0; n < this.surfacesCoords[s].length - 1; n ++) {
				curPoly.push([this.surfacesCoords[s][n][0], this.surfacesCoords[s][n][1]]);
			}
			res = lineclip.polygon(curPoly, bbox);
			if (res.length > 0) {
				res.push(res[0]);
			}
			this.surfacesClipped.push(res);
		}
	}
	
	ext.buildSurfacesTexture = function() {
		this.tile.material.normalMap = OEV.textures['normal_flat'];
		var coordW = Math.abs(this.tile.endCoord.x - this.tile.startCoord.x);
		var coordH = Math.abs(this.tile.startCoord.y - this.tile.endCoord.y);
		var i;
		var ptNorm;
		var type;
		var normalisedPoly;
		var canvasSize = 256;
		
		var texturesDiffuse = {
			forest : 'landuse_forest', 
			scrub : 'landuse_scrub', 
			vineyard : 'landuse_vineyard', 
			water : 'sea', 
		};
		var texturesNormal = {
			forest : 'normal_forest', 
			scrub : 'normal_scrub', 
			vineyard : 'normal_vineyard', 
			water : 'waternormals', 
		};
		canvasDiffuse = document.createElement('canvas');
		canvasNormal = document.createElement('canvas');
		canvasDiffuse.width = canvasSize;
		canvasDiffuse.height = canvasSize;
		var contextDiffuse = canvasDiffuse.getContext('2d');
		canvasNormal.width = canvasSize;
		canvasNormal.height = canvasSize;
		var contextNormal = canvasNormal.getContext('2d');
		contextDiffuse.drawImage(this.tile.material.map.image, 0, 0);
		contextNormal.drawImage(this.tile.material.normalMap.image, 0, 0);
		for (var  s = 0; s < this.surfacesClipped.length; s ++) {
			type = this.surfacesTypes[s];
			normalisedPoly = [];
			for (i = 0; i < this.surfacesClipped[s].length; i ++) {
				ptNorm = [
					Math.round(Math.abs((((this.tile.endCoord.x - this.surfacesClipped[s][i][0]) / coordW) * canvasSize) - canvasSize)), 
					Math.round(((this.tile.startCoord.y - this.surfacesClipped[s][i][1]) / coordH) * canvasSize), 
				]
				normalisedPoly.push(ptNorm);
			}
			contextDiffuse.save();
			contextDiffuse.beginPath();
			contextDiffuse.moveTo(normalisedPoly[0][0], normalisedPoly[0][1]);
			for (i = 1; i < normalisedPoly.length; i ++) {
				contextDiffuse.lineTo(normalisedPoly[i][0], normalisedPoly[i][1]);
			}
			contextDiffuse.closePath();
			contextDiffuse.clip();
			contextDiffuse.drawImage(OEV.textures[texturesDiffuse[type]].image, 0, 0);
			contextDiffuse.restore();
			contextNormal.save();
			contextNormal.beginPath();
			contextNormal.moveTo(normalisedPoly[0][0], normalisedPoly[0][1]);
			for (i = 1; i < normalisedPoly.length; i ++) {
				contextNormal.lineTo(normalisedPoly[i][0], normalisedPoly[i][1]);
			}
			contextNormal.closePath();
			contextNormal.clip();
			contextNormal.drawImage(OEV.textures[texturesNormal[type]].image, 0, 0);
			contextNormal.restore();
		}
		this.tile.material.map = new THREE.Texture(canvasDiffuse)
		this.tile.material.normalMap = new THREE.Texture(canvasNormal)
		this.tile.material.needsUpdate = true;
		this.tile.material.map.needsUpdate = true;
		this.tile.material.normalMap.needsUpdate = true;
	}
	
	ext.buildSurfacesGeometry = function() {
		var altP;
		var nbPartIn;
		var coordLon;
		var coordLat;
		var tileW = this.tile.endCoord.x - this.tile.startCoord.x;
		var tileH = Math.abs(this.tile.endCoord.y - this.tile.startCoord.y);
		var surGeoJson = {
			type : 'Polygon',
			coordinates : null
		};
		
		var surfBBox = [];
		for (var s = 0; s < this.surfacesClipped.length; s ++) {
			var curBBox = [
				999999, // start.x
				-999999, //end.x
				999999, // end.y
				-999999, // start.y
			];
			for (var p = 0; p < this.surfacesClipped[s].length; p ++) {
				curBBox[0] = Math.min(this.surfacesClipped[s][p][0], curBBox[0]);
				curBBox[1] = Math.max(this.surfacesClipped[s][p][0], curBBox[1]);
				curBBox[2] = Math.min(this.surfacesClipped[s][p][1], curBBox[2]);
				curBBox[3] = Math.max(this.surfacesClipped[s][p][1], curBBox[3]);
			}
			surfBBox.push(curBBox);
		}
		
		var meter = 1/100000;
		for (var s = 0; s < this.surfacesClipped.length; s ++) {
			var surfWidth = surfBBox[s][1] - surfBBox[s][0];
			var surfHeight = surfBBox[s][3] - surfBBox[s][2];
			if (this.surfacesTypes[s] == 'vineyard') {
				for (coordLon = surfBBox[s][0]; coordLon < surfBBox[s][1]; coordLon += meter * 20) {
					for (coordLat = surfBBox[s][2]; coordLat < surfBBox[s][3]; coordLat += meter * 5) {
						if(Oev.Math.ptIsInPolygon(this.surfacesClipped[s], coordLon, coordLat)) {
							altP = Oev.Globe.getElevationAtCoords(coordLon, coordLat, true);
							this.buildTwoSideElmt(coordLon, coordLat, altP, this.surfacesTypes[s]);
						}
					}
				}
			} else if (this.surfacesTypes[s] == 'scrub' || this.surfacesTypes[s] == 'forest') {
				surGeoJson.coordinates = [this.surfacesClipped[s]];
				var curArea = Math.round(geojsonArea.geometry(surGeoJson) / 100);
				if (this.surfacesTypes[s] == 'scrub') {
					curArea *= 2;
				}
				nbPartIn = 0;
				var tests = 0;
				while (nbPartIn < curArea) {
					tests ++;
					if (tests > 100000) {
						console.warn('Exit while loop');
						break;
					}
					coordLon = surfBBox[s][0] + (surfWidth * Math.random());
					coordLat = surfBBox[s][2] + (surfHeight * Math.random());
					if (Oev.Math.ptIsInPolygon(this.surfacesClipped[s], coordLon, coordLat)) {
						nbPartIn ++;
						altP = Oev.Globe.getElevationAtCoords(coordLon, coordLat, true);
						this.buildTwoSideElmt(coordLon, coordLat, altP, this.surfacesTypes[s]);
					}
				}
			}
		}
	}
	
	ext.buildSurfacesMesh = function() {
		var mat;
		var matTwoSide;
		// Create mesh
		for (var type in this.twoSideGeos) {
			if (type == 'vineyard') {
				mat = OEV.earth.vineyardMat;
				matTwoSide = OEV.earth.testVineyardMat;
			} else if (type == 'scrub') {
				mat = OEV.earth.vineyardMat;
				matTwoSide = OEV.earth.testScrubMat;
			} else {
				mat = OEV.earth.forestMat;
				matTwoSide = OEV.earth.testForestMat;
			}
			this.twoSideGeos[type].computeFaceNormals();
			this.twoSideGeos[type].computeVertexNormals();
			this.twoSideMeshes[type] = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(this.twoSideGeos[type]), matTwoSide);
			this.twoSideMeshes[type].receiveShadow = true;
			this.twoSideMeshes[type].castShadow = true;
			OEV.scene.add(this.twoSideMeshes[type]);
		}
	}
	
	ext.construct = function() {
		if (Oev.Tile.Extension['ACTIV_' + ext.id] === false) {
			return false;
		}
		if (!this.tile.onStage) {
			return false;
		}
		if (this.constructStep == 'JSON') {
			this.extractFromJson();
			this.constructStep = 'CLIP';
		} else if (this.constructStep == 'CLIP') {
			this.clipSurface();
			this.constructStep = 'TEXTURE';
		} else if (this.constructStep == 'TEXTURE') {
			this.buildSurfacesTexture();
			this.constructStep = 'GEOMETRY';
		} else if (this.constructStep == 'GEOMETRY') {
			this.buildSurfacesGeometry();
			this.constructStep = 'MESH';
		} else if (this.constructStep == 'MESH') {
			this.buildSurfacesMesh();
			this.constructStep = 'NONE';
		} 
		if (this.constructStep == 'NONE') {
			ext.surfacesCoords = [];
			ext.surfacesTypes = [];
			ext.surfacesClipped = [];
			
			OEV.MUST_RENDER = true;
		} else {
			Oev.Tile.ProcessQueue.addWaiting(this);
		}
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
			for (var type in this.twoSideMeshes) {
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
			for (var type in this.twoSideMeshes) {
				if (this.twoSideMeshes[type] != undefined) {
					OEV.scene.remove(this.twoSideMeshes[type]);
				}
			}
			this.tile.material.normalMap = null;
			this.tile.material.needsUpdate = true;
			this.tile.loadImage();
			OEV.MUST_RENDER = true;
		}
	}
	
	ext.dispose = function() {
		this.hide();
		if( !this.dataLoaded ){
			OEV.earth.tilesLandusesMng.removeWaitingList(this.tile.zoom + "/" + this.tile.tileX + "/" + this.tile.tileY);
		}
		for (var type in this.twoSideMeshes) {
			if (this.twoSideMeshes[type] != undefined) {
				this.twoSideMeshes[type].geometry.dispose();
			}
		}
		if (canvasDiffuse !== null) {
			canvasDiffuse.getContext('2d').clearRect(0, 0, canvasDiffuse.width, canvasDiffuse.height);
			canvasDiffuse = null;
		}
		if (canvasNormal !== null) {
			canvasNormal.getContext('2d').clearRect(0, 0, canvasNormal.width, canvasNormal.height);
			canvasNormal = null;
		}
	}
	
	ext.onInit(_tile);
	
	return ext;
}
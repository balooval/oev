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
			width : 0.00006, 
			depth : 0.00006, 
			height : 7, 
		}, 
		vineyard : {
			width : 0.00005, 
			depth : 0.00005, 
			height : 6, 
		}, 
	};
	
	ext.bufferMesh;
	ext.bufferGeometry = new THREE.BufferGeometry();
	ext.nodesPositions = [];
	
	
	ext.allTypesGeo = new THREE.Geometry();
	ext.allTypesMesh = undefined;
	
	
	ext.twoSideUvs = {
		vineyard : 0.5, 
		forest : 0.75, 
		scrub : 0.25, 
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
	
	ext.searchNodesPositions = function() {
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
							// this.buildTwoSideElmt(coordLon, coordLat, altP, this.surfacesTypes[s]);
							this.nodesPositions.push(this.surfacesTypes[s], coordLon, coordLat, altP);
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
						// this.buildTwoSideElmt(coordLon, coordLat, altP, this.surfacesTypes[s]);
						this.nodesPositions.push(this.surfacesTypes[s], coordLon, coordLat, altP);
					}
				}
			}
		}
	}
	
	ext.buildNodesGeometry = function() {
		var nodesNb = this.nodesPositions.length / 4;
		var bufferVertices = new Float32Array(nodesNb * 36);
		var bufferFaces = new Uint32Array(nodesNb * 12);
		var bufferUvs = new Float32Array(nodesNb * 24);
		
		var vertPos;
		var angle;
		var sizeVar;
		var typeProps;
		var elmtWidth;
		var elmtDepth;
		var elmtHeight;
		var elmtWidthRot;
		var elmtDepthRot;
		var textTile;
		var textTile;
		var lon;
		var lat;
		var alt;
		
		var curVertId = 0;
		var faceVertId = 0;
		var faceUvId = 0;
		
		for (var i = 0; i < nodesNb * 4; i += 4) {
			/*
			this.buildTwoSideElmt(
				this.nodesPositions[i+1], 
				this.nodesPositions[i+2], 
				this.nodesPositions[i+3], 
				this.nodesPositions[i]
			);
			*/
			
			angle = Math.random() * 3.14;
			sizeVar = 0.7 + Math.random() * 0.5;
			typeProps = this.twoSideProps[this.nodesPositions[i]];
			elmtWidth = typeProps.width * sizeVar;
			elmtDepth = typeProps.depth * sizeVar;
			elmtHeight = typeProps.height * sizeVar;
			elmtWidthRot = elmtWidth * Math.cos(angle);
			elmtDepthRot = elmtDepth * Math.sin(angle);
			textTile = Math.random() > 0.7 ? 0 : 0.5;
			lon = this.nodesPositions[i+1];
			lat = this.nodesPositions[i+2];
			alt = this.nodesPositions[i+3] - 0.5;
			
			var tileVariation = Math.random() > 0.5 ? 0 : 0.5;
			var tileType = ext.twoSideUvs[this.nodesPositions[i]];
			
			bufferUvs[faceUvId + 4] = tileVariation;
			bufferUvs[faceUvId + 5] = tileType + 0.25;
			bufferUvs[faceUvId + 2] = tileVariation;
			bufferUvs[faceUvId + 3] = tileType;
			bufferUvs[faceUvId + 0] = tileVariation + 0.5;
			bufferUvs[faceUvId + 1] = tileType;
			bufferUvs[faceUvId + 10] = tileVariation + 0.5;
			bufferUvs[faceUvId + 11] = tileType;
			bufferUvs[faceUvId + 8] = tileVariation + 0.5;
			bufferUvs[faceUvId + 9] = tileType + 0.25;
			bufferUvs[faceUvId + 6] = tileVariation;
			bufferUvs[faceUvId + 7] = tileType + 0.25;
			faceUvId += 12;
			bufferUvs[faceUvId + 4] = tileVariation;
			bufferUvs[faceUvId + 5] = tileType + 0.25;
			bufferUvs[faceUvId + 2] = tileVariation;
			bufferUvs[faceUvId + 3] = tileType;
			bufferUvs[faceUvId + 0] = tileVariation + 0.5;
			bufferUvs[faceUvId + 1] = tileType;
			bufferUvs[faceUvId + 10] = tileVariation + 0.5;
			bufferUvs[faceUvId + 11] = tileType;
			bufferUvs[faceUvId + 8] = tileVariation + 0.5;
			bufferUvs[faceUvId + 9] = tileType + 0.25;
			bufferUvs[faceUvId + 6] = tileVariation;
			bufferUvs[faceUvId + 7] = tileType + 0.25;
			faceUvId += 12;
			
			bufferFaces[faceVertId + 0] = faceVertId + 2;
			bufferFaces[faceVertId + 1] = faceVertId + 1;
			bufferFaces[faceVertId + 2] = faceVertId + 0;
			bufferFaces[faceVertId + 3] = faceVertId + 5;
			bufferFaces[faceVertId + 4] = faceVertId + 4;
			bufferFaces[faceVertId + 5] = faceVertId + 3;
			faceVertId += 6;
			bufferFaces[faceVertId + 0] = faceVertId + 2;
			bufferFaces[faceVertId + 1] = faceVertId + 1;
			bufferFaces[faceVertId + 2] = faceVertId + 0;
			bufferFaces[faceVertId + 3] = faceVertId + 5;
			bufferFaces[faceVertId + 4] = faceVertId + 4;
			bufferFaces[faceVertId + 5] = faceVertId + 3;
			faceVertId += 6;
			
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt + elmtHeight);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt + elmtHeight);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt + elmtHeight);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			
			elmtWidthRot = elmtWidth * Math.cos(angle + ext.halfRot);
			elmtDepthRot = elmtDepth * Math.sin(angle + ext.halfRot);
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt + elmtHeight);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt + elmtHeight);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt + elmtHeight);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt);
			bufferVertices[curVertId] = vertPos.x;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.y;
			curVertId ++;
			bufferVertices[curVertId] = vertPos.z;
			curVertId ++;
		}
		this.nodesPositions = [];
		this.bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		this.bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		this.bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		
		this.bufferGeometry.computeFaceNormals();
        this.bufferGeometry.computeVertexNormals();
		
		this.bufferMesh = new THREE.Mesh(this.bufferGeometry, new THREE.MeshLambertMaterial( { color: 0xffffff, map: OEV.textures['landuse_sprites'], side : THREE.DoubleSide, transparent:true}));
		// this.bufferMesh = new THREE.Mesh(this.bufferGeometry, OEV.landuseSpritesMat);
		this.bufferMesh.receiveShadow = true;
		this.bufferMesh.castShadow = true;
		OEV.scene.add(this.bufferMesh);
	}
	
	ext.buildSurfacesMesh = function() {
		var mat;
		var matTwoSide;
		matTwoSide = OEV.earth.landuseSpritesMat;
		this.allTypesGeo.computeFaceNormals();
		this.allTypesGeo.computeVertexNormals();
		this.allTypesMesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(this.allTypesGeo), matTwoSide);
		this.allTypesMesh.receiveShadow = true;
		this.allTypesMesh.castShadow = true;
		OEV.scene.add(this.allTypesMesh);
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
			this.constructStep = 'POSITIONS';
		} else if (this.constructStep == 'POSITIONS') {
			this.searchNodesPositions();
			this.constructStep = 'GEOMETRY';
		} else if (this.constructStep == 'GEOMETRY') {
			this.buildNodesGeometry();
			this.constructStep = 'MESH';
		} else if (this.constructStep == 'MESH') {
			// this.buildSurfacesMesh();
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
		var vertId = (this.allTypesGeo.faces.length / 2) * 6;
		var nbFaces = this.allTypesGeo.faces.length;
		var posA = OEV.earth.coordToXYZ(_lon + propWidth, _lat + propDepth, _alt);
		this.allTypesGeo.vertices.push(posA);
		var posB = OEV.earth.coordToXYZ(_lon - propWidth, _lat - propDepth, _alt);
		this.allTypesGeo.vertices.push(posB);
		var posC = OEV.earth.coordToXYZ(_lon - propWidth, _lat - propDepth, _alt + propHeight);
		this.allTypesGeo.vertices.push(posC);
		var posD = OEV.earth.coordToXYZ(_lon - propWidth, _lat - propDepth, _alt + propHeight);
		this.allTypesGeo.vertices.push(posD);
		var posE = OEV.earth.coordToXYZ(_lon + propWidth, _lat + propDepth, _alt + propHeight);
		this.allTypesGeo.vertices.push(posE);
		var posF = OEV.earth.coordToXYZ(_lon + propWidth, _lat + propDepth, _alt);
		this.allTypesGeo.vertices.push(posF);
		this.allTypesGeo.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		this.allTypesGeo.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(propTexTile + 0.5, ext.twoSideUvs[propType]), 
			new THREE.Vector2(propTexTile, ext.twoSideUvs[propType]), 
			new THREE.Vector2(propTexTile, ext.twoSideUvs[propType] + 0.25)
		];
		this.allTypesGeo.faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		this.allTypesGeo.faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(propTexTile, ext.twoSideUvs[propType] + 0.25), 
			new THREE.Vector2(propTexTile + 0.5, ext.twoSideUvs[propType] + 0.25), 
			new THREE.Vector2(propTexTile + 0.5, ext.twoSideUvs[propType])
		];
	}
	
	ext.show = function() {
		if (this.dataLoaded) {
			if (this.allTypesMesh != undefined) {
				OEV.scene.add(this.allTypesMesh);
			}
			if (this.bufferMesh != undefined) {
				OEV.scene.add(this.bufferMesh);
			}
		}else{
			this.tileReady();
		}
	}
	
	ext.hide = function() {
		if (this.dataLoaded) {
			if (this.allTypesMesh != undefined) {
				OEV.scene.remove(this.allTypesMesh);
			}
			if (this.bufferMesh != undefined) {
				OEV.scene.remove(this.bufferMesh);
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
		if (this.bufferMesh != undefined) {
			this.bufferMesh.geometry.dispose();
			this.bufferMesh = undefined;
		}
		if (this.allTypesMesh != undefined) {
			this.allTypesMesh.geometry.dispose();
			this.allTypesMesh = undefined;
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
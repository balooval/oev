import Renderer from '../renderer.js';
import * as NET_TEXTURES from './net/NetTextures.js';

Oev.Tile.Extension.LanduseWorker = (function() {
	var worker = new Worker('js/oev/workers/tileExtLanduse.js');
	
	var api = {
		evt : null, 
		
		init : function() {
			api.evt = new Oev.Utils.Evt();
		}, 
		
		compute : function(_extId, _datas) {
			worker.postMessage([_extId, _datas]);
		}, 
		
		onWorkerMessage : function(_res) {
			api.evt.fireEvent('WORKER_RESPONSE_' + _res.data[0], _res.data[1]);
		}, 
	};
	
	worker.onmessage = api.onWorkerMessage;
	
	return api;
})();


Oev.Tile.Extension.LanduseRoot = {};
var tmpId = 0;


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
			// uv : 0.75, 
			uv : 0.0, 
			mapDiffuse : 'landuse_forest', 
			mapNormal : 'normal_forest', 
		}, 
		scrub : {
			width : 0.00006, 
			depth : 0.00006, 
			height : 7, 
			uv : 0.25, 
			mapDiffuse : 'landuse_scrub', 
			mapNormal : 'normal_scrub', 
		}, 
		vineyard : {
			width : 0.00005, 
			depth : 0.00005, 
			height : 6, 
			uv : 0.5, 
			mapDiffuse : 'landuse_vineyard', 
			mapNormal : 'normal_vineyard', 
		}, 
		
		grass : {
			width : 0.00030, 
			depth : 0.00010, 
			height : 15, 
			uv : 0.25, 
			mapDiffuse : 'landuse_forest', 
			mapNormal : 'normal_flat', 
		}, 
		water : {
			mapDiffuse : 'sea', 
			mapNormal : 'waternormals', 
		}, 
	};
	
	ext.bufferMesh;
	ext.nodesPositions = [];
	
	ext.halfRot = Math.PI / 2;
	ext.surfacesCoords = [];
	ext.surfacesTypes = [];
	ext.surfacesClipped = [];
	ext.constructStep = 'JSON';
	
	ext.tileIndex;
	ext.myRoot;
	ext.childrens;
	ext.tmpId = 0;
	
	ext.tileReady = function() {
		if (this.tile.zoom < 15) {
			return false;
		}
		this.tmpId = tmpId;
		tmpId ++;
		this.tileIndex = Oev.Geo.coordsToTile(this.tile.middleCoord.x, this.tile.middleCoord.y, 15);
		if (this.tile.zoom == 15) {
			Oev.Tile.Extension.LanduseRoot[this.tileIndex.x + '_' + this.tileIndex.y] = this;
			this.childrens = [];
			if (!this.dataLoaded) {
				OEV.earth.tilesLandusesMng.getDatas(this, this.tile.zoom+'/'+this.tile.tileX+'/'+this.tile.tileY, this.tile.tileX, this.tile.tileY, this.tile.zoom, this.tile.distToCam);
			}else{
				Oev.Tile.ProcessQueue.addWaiting(this);
			}
			
		} else if (this.tile.onStage) {
			this.myRoot = Oev.Tile.Extension.LanduseRoot[this.tileIndex.x + '_' + this.tileIndex.y];
			this.myRoot.askForDatas(this);
		}
	}
	
	ext.askForDatas = function(_childExt) {
		if (ext.dataLoaded) {
			_childExt.setDatas(ext.datas);
			return true;
		}
		ext.childrens.push(_childExt);
		return false;
	}
	
	ext.setDatas = function(_datas) {
		if (this.tile.zoom == 15) {
			for (var i = 0; i < this.childrens.length; i ++) {
				this.childrens.setDatas(_datas);
			}
			this.childrens = [];
		}
		this.dataLoaded = true;
		this.datas = _datas;
		Oev.Tile.ProcessQueue.addWaiting(this);
	}
	
	ext.extractFromJson = function() {
		var curSurface;
		var n;
		var o;
		var myNodeId;
		var curType;
		for (i = 0; i < this.datas['elements'].length; i ++) {
			if (this.datas['elements'][i]['type'] == 'way') {
				curSurface = [];
				for (n = 0; n < this.datas['elements'][i]['nodes'].length; n ++) {
					myNodeId = this.datas['elements'][i]['nodes'][n];
					for (o = 0; o < this.datas['elements'].length; o ++) {
						if (this.datas['elements'][o]['type'] == 'node' && this.datas['elements'][o]['id'] == myNodeId) {
							curSurface.push([
								parseFloat(this.datas['elements'][o]['lon']), 
								parseFloat(this.datas['elements'][o]['lat'])
							]);
						}
					}
				}
				curType = 'none';
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
					// this.surfacesTypes.push('grass');
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
				this.surfacesClipped.push(res);
			}
		}
	}
	
	ext.buildSurfacesTexture = function() {
		this.tile.material.normalMap = NET_TEXTURES.texture('normal_flat');
		var coordW = Math.abs(this.tile.endCoord.x - this.tile.startCoord.x);
		var coordH = Math.abs(this.tile.startCoord.y - this.tile.endCoord.y);
		var i;
		var ptNorm;
		var type;
		var normalisedPoly;
		var canvasSize = 256;
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
			if (this.surfacesClipped[s].length == 0) {
				console.log('vide, passe');
				continue;
			}
			type = this.surfacesTypes[s];
			normalisedPoly = [];
			for (i = 0; i < this.surfacesClipped[s].length; i ++) {
				ptNorm = [
					Math.round(Math.abs((((this.tile.endCoord.x - this.surfacesClipped[s][i][0]) / coordW) * canvasSize) - canvasSize)), 
					Math.round(((this.tile.startCoord.y - this.surfacesClipped[s][i][1]) / coordH) * canvasSize), 
				];
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
			contextDiffuse.drawImage(NET_TEXTURES.texture(this.twoSideProps[type].mapDiffuse).image, 0, 0);
			contextDiffuse.restore();
			contextNormal.save();
			contextNormal.beginPath();
			contextNormal.moveTo(normalisedPoly[0][0], normalisedPoly[0][1]);
			for (i = 1; i < normalisedPoly.length; i ++) {
				contextNormal.lineTo(normalisedPoly[i][0], normalisedPoly[i][1]);
			}
			contextNormal.closePath();
			contextNormal.clip();
			contextNormal.drawImage(NET_TEXTURES.texture(this.twoSideProps[type].mapNormal).image, 0, 0);
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
		Oev.Tile.Extension.LanduseWorker.evt.addEventListener('WORKER_RESPONSE_' + this.tmpId, this, this.onWorkerResponse);
		Oev.Tile.Extension.LanduseWorker.compute(this.tmpId, [this.surfacesClipped, surfBBox, this.surfacesTypes]);
	}
	
	ext.onWorkerResponse = function(_res) {
		Oev.Tile.Extension.LanduseWorker.evt.removeEventListener('WORKER_RESPONSE_' + this.tmpId, this, this.onWorkerResponse);
		ext.nodesPositions = _res;
		ext.constructStep = 'GEOMETRY';
		ext.construct();
	}
	
	
	ext.buildGrass = function() {
		var nodesNb = this.nodesPositions.length / 4;
		var bufferVertices = new Float32Array(nodesNb * 12);
		var bufferFaces = new Uint32Array(nodesNb * 6);
		var bufferUvs = new Float32Array(nodesNb * 8);
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
		var tileVariation;
		var faceVertIndex = 0;
		
		for (var i = 0; i < nodesNb * 4; i += 4) {
			angle = Math.random() * 3.14;
			// angle = 0;
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
			alt = this.tile.getElevation(lon, lat) - 0.5;
			// tileVariation = Math.random() > 0.5 ? 0 : 0.5;
			bufferUvs[faceUvId + 0] = 0;
			bufferUvs[faceUvId + 1] = 0;
			bufferUvs[faceUvId + 2] = 2;
			bufferUvs[faceUvId + 3] = 0;
			bufferUvs[faceUvId + 4] = 2;
			bufferUvs[faceUvId + 5] = 1;
			bufferUvs[faceUvId + 6] = 0;
			bufferUvs[faceUvId + 7] = 1;
			faceUvId += 8;
			
			
			bufferFaces[faceVertId + 0] = faceVertIndex + 0;
			bufferFaces[faceVertId + 1] = faceVertIndex + 1;
			bufferFaces[faceVertId + 2] = faceVertIndex + 2;
			bufferFaces[faceVertId + 3] = faceVertIndex + 2;
			bufferFaces[faceVertId + 4] = faceVertIndex + 3;
			bufferFaces[faceVertId + 5] = faceVertIndex + 0;
			faceVertId += 6;
			faceVertIndex += 4;
			
			vertPos = OEV.earth.coordToXYZ(lon - elmtWidthRot, lat - elmtDepthRot, alt);
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
			
			vertPos = OEV.earth.coordToXYZ(lon + elmtWidthRot, lat + elmtDepthRot, alt + elmtHeight);
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
		}
		this.nodesPositions = [];
		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.bufferMesh = new THREE.Mesh(bufferGeometry, Oev.Globe.grassMat);
		this.bufferMesh.receiveShadow = true;
		this.bufferMesh.castShadow = true;
		Renderer.scene.add(this.bufferMesh);
	}
	
	ext.buildNodesGeometry = function() {
		var nodesNb = this.nodesPositions.length / 4;
		var bufferVertices = new Float32Array(nodesNb * 36);
		var bufferFaces = new Uint32Array(nodesNb * 12);
		var bufferUvs = new Float32Array(nodesNb * 24);
		var bufferNormals = new Float32Array(nodesNb * 12 * 3);
		var normalsIndex = 0;
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
		var tileVariation;
		
		for (var i = 0; i < nodesNb * 4; i += 4) {
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
			alt = this.tile.getElevation(lon, lat) - 0.5;
			tileVariation = Math.random() > 0.5 ? 0 : 0.5;
			bufferUvs[faceUvId + 4] = tileVariation;
			bufferUvs[faceUvId + 5] = typeProps.uv + 0.25;
			bufferUvs[faceUvId + 2] = tileVariation;
			bufferUvs[faceUvId + 3] = typeProps.uv;
			bufferUvs[faceUvId + 0] = tileVariation + 0.5;
			bufferUvs[faceUvId + 1] = typeProps.uv;
			bufferUvs[faceUvId + 10] = tileVariation + 0.5;
			bufferUvs[faceUvId + 11] = typeProps.uv;
			bufferUvs[faceUvId + 8] = tileVariation + 0.5;
			bufferUvs[faceUvId + 9] = typeProps.uv + 0.25;
			bufferUvs[faceUvId + 6] = tileVariation;
			bufferUvs[faceUvId + 7] = typeProps.uv + 0.25;
			faceUvId += 12;
			bufferUvs[faceUvId + 4] = tileVariation;
			bufferUvs[faceUvId + 5] = typeProps.uv + 0.25;
			bufferUvs[faceUvId + 2] = tileVariation;
			bufferUvs[faceUvId + 3] = typeProps.uv;
			bufferUvs[faceUvId + 0] = tileVariation + 0.5;
			bufferUvs[faceUvId + 1] = typeProps.uv;
			bufferUvs[faceUvId + 10] = tileVariation + 0.5;
			bufferUvs[faceUvId + 11] = typeProps.uv;
			bufferUvs[faceUvId + 8] = tileVariation + 0.5;
			bufferUvs[faceUvId + 9] = typeProps.uv + 0.25;
			bufferUvs[faceUvId + 6] = tileVariation;
			bufferUvs[faceUvId + 7] = typeProps.uv + 0.25;
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
			
			
			bufferNormals[normalsIndex + 0] = 0;
			bufferNormals[normalsIndex + 1] = 1;
			bufferNormals[normalsIndex + 2] = 0;
			normalsIndex += 3;
			bufferNormals[normalsIndex + 0] = 0;
			bufferNormals[normalsIndex + 1] = 1;
			bufferNormals[normalsIndex + 2] = 0;
			normalsIndex += 3;
			bufferNormals[normalsIndex + 0] = 0;
			bufferNormals[normalsIndex + 1] = 1;
			bufferNormals[normalsIndex + 2] = 0;
			normalsIndex += 3;
			bufferNormals[normalsIndex + 0] = 0;
			bufferNormals[normalsIndex + 1] = 1;
			bufferNormals[normalsIndex + 2] = 0;
			normalsIndex += 3;
			
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
		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(bufferNormals, 3));
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		// bufferGeometry.computeFaceNormals();
        // bufferGeometry.computeVertexNormals();
		this.bufferMesh = new THREE.Mesh(bufferGeometry, Oev.Globe.landuseSpritesMat);
		// this.bufferMesh.receiveShadow = true;
		// this.bufferMesh.castShadow = true;
		Renderer.scene.add(this.bufferMesh);
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
			this.constructStep = 'WAITING';
			this.searchNodesPositions();
		} else if (this.constructStep == 'GEOMETRY') {
			this.buildNodesGeometry();
			// this.buildGrass();
			this.constructStep = 'NONE';
		} 
		if (this.constructStep == 'NONE') {
			ext.surfacesCoords = [];
			ext.surfacesTypes = [];
			ext.surfacesClipped = [];
			Renderer.MUST_RENDER = true;
		} else if (this.constructStep != 'WAITING') {
			Oev.Tile.ProcessQueue.addWaiting(this);
		}
	} 
	
	ext.show = function() {
		if (this.dataLoaded) {
			if (this.bufferMesh != undefined) {
				Renderer.scene.add(this.bufferMesh);
			}
		}else{
			this.tileReady();
		}
	}
	
	ext.hide = function() {
		if (this.dataLoaded) {
			if (this.bufferMesh != undefined) {
				Renderer.scene.remove(this.bufferMesh);
			}
			this.tile.material.normalMap = null;
			this.tile.material.needsUpdate = true;
			this.tile.loadImage();
			Renderer.MUST_RENDER = true;
		}
	}
	
	ext.dispose = function() {
		this.hide();
		if (!this.dataLoaded) {
			OEV.earth.tilesLandusesMng.removeWaitingList(this.tile.zoom + "/" + this.tile.tileX + "/" + this.tile.tileY);
		}
		if (this.bufferMesh != undefined) {
			this.bufferMesh.geometry.dispose();
			this.bufferMesh = undefined;
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
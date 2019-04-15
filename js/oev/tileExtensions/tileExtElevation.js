import * as TileExtension from './tileExtension.js';
import * as NET_TEXTURES from '../net/NetTextures.js';


// export class Elevation extends TileExtension.DefaultExt{
export class Elevation {
	constructor(_tile) {
		// super();a
		this.loaderEle = OEV.earth.loaderEle;
		this.id = 'ELEVATION';
		this.elevationBuffer = new Uint16Array((32 * 32) / 4);
		this.mesheBorder = undefined;
		this.materialBorder = new THREE.MeshPhongMaterial({color: 0xA0A0A0, shininess: 0, map: NET_TEXTURES.texture("checker")});
		this.onInit(_tile);
	}
	
	init() {
		this.tile.getElevation = this.getElevation;
		this.tile._getVerticeElevation = this._getVerticeElevation;
		this.tile.interpolateEle = this.interpolateEle;
	}
	
	tileReady() {
		if (this.dataLoaded) {
			return false;
		}
		this.loaderEle.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			function(_datas) {
				this._onElevationLoaded(_datas.slice(0));
			}
		);
	}
	
	showfunction() {
		if (this.datasLoaded) {
			return false;
		}
		this.tileReady();
	}
	
	hide() {
		this.loaderEle.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}
	
	_onElevationLoaded(_datas) {
		if (!TileExtension.Params.actives['ACTIV_' + this.id]) {
			return false;
		}
		this.dataLoaded = true;
		this.elevationBuffer = _datas;
		this.applyElevationToGeometry();
	}
	
	applyElevationToGeometry() {
		this.tile.makeFaceBuffer();
		return false;
		if (!this.dataLoaded) {
			return false;
		}
		var x, y;
		var index = 0;
		var nbVertX = Oev.Globe.tilesDefinition + 1;
		var nbVertY = Oev.Globe.tilesDefinition + 1;
		var verticePosition;
		var stepCoord = new THREE.Vector2((this.tile.endCoord.x - this.tile.startCoord.x) / Oev.Globe.tilesDefinition, (this.tile.endCoord.y - this.tile.startCoord.y) / Oev.Globe.tilesDefinition);
		for (x = 0; x < nbVertX; x ++) {
			for (y = 0; y < nbVertY; y ++) {
				var ele = this.elevationBuffer[index];
				verticePosition = Oev.Globe.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * x), this.tile.startCoord.y + (stepCoord.y * y), ele);
				this.tile.meshe.geometry.vertices[index].x = verticePosition.x;
				this.tile.meshe.geometry.vertices[index].y = verticePosition.y;
				this.tile.meshe.geometry.vertices[index].z = verticePosition.z;
				index ++;
			}
		}
		this.makeBorders();
		this.tile.meshe.geometry.verticesNeedUpdate = true;
		this.tile.meshe.geometry.uvsNeedUpdate = true;
		this.tile.meshe.geometry.computeFaceNormals();
		this.tile.meshe.geometry.mergeVertices()
		this.tile.meshe.geometry.computeVertexNormals();
		OEV.MUST_RENDER = true;
	} 
	
	makeBorders() {
		return false;
		var b;
		var x;
		var y;
		var vect;
		var vertEle;
		if (!Oev.Globe.eleActiv) {
			return false;
		}
		if (this.mesheBorder != undefined) {
			this.tile.meshe.remove(this.mesheBorder);
			this.mesheBorder.geometry.dispose();
			this.mesheBorder = undefined;
		}
		var stepUV = 1 / Oev.Globe.tilesDefinition;
		var stepCoord = new THREE.Vector2((this.tile.endCoord.x - this.tile.startCoord.x) / Oev.Globe.tilesDefinition, (this.tile.endCoord.y - this.tile.startCoord.y) / Oev.Globe.tilesDefinition);
		var geoBorders = new THREE.Geometry();
		geoBorders.dynamic = false;
		geoBorders.faceVertexUvs[0] = [];
		var vertBorder = [];
		var vertUvs = [];
		var vEId;
		for (x = 0; x < (Oev.Globe.tilesDefinition + 1); x ++) {
			vertUvs.push(new THREE.Vector2(x * stepUV, 0));
			vertUvs.push(new THREE.Vector2(x * stepUV, 0));
			vEId = x * (Oev.Globe.tilesDefinition + 1);
			vertEle = this.elevationBuffer[vEId];
			vect = Oev.Globe.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * x), this.tile.startCoord.y, vertEle);
			vertBorder.push(vect);
			vect = Oev.Globe.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * x), this.tile.startCoord.y, 0);
			vertBorder.push(vect);
		}
		for (y = 1; y < Oev.Globe.tilesDefinition + 1; y ++) {
			vertUvs.push(new THREE.Vector2(0, y * stepUV));
			vertUvs.push(new THREE.Vector2(0, y * stepUV));
			vEId = y + (Oev.Globe.tilesDefinition) * (Oev.Globe.tilesDefinition + 1);
			vertEle = this.elevationBuffer[vEId];
			vect = Oev.Globe.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * Oev.Globe.tilesDefinition), this.tile.startCoord.y + (stepCoord.y * y), vertEle);
			vertBorder.push(vect);
			vect = Oev.Globe.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * Oev.Globe.tilesDefinition), this.tile.startCoord.y + (stepCoord.y * y), 0);
			vertBorder.push(vect);
		}
		for (x = 1; x < (Oev.Globe.tilesDefinition + 1); x ++) {
			vertUvs.push(new THREE.Vector2(1 - (x * stepUV), 0));
			vertUvs.push(new THREE.Vector2(1 - (x * stepUV), 0));
			vEId = (Oev.Globe.tilesDefinition + 0) + ((Oev.Globe.tilesDefinition + 0) - x) * (Oev.Globe.tilesDefinition + 1);
			vertEle = this.elevationBuffer[vEId];
			vect = Oev.Globe.coordToXYZ(this.tile.endCoord.x - (stepCoord.x * x), this.tile.endCoord.y, vertEle);
			vertBorder.push(vect);
			vect = Oev.Globe.coordToXYZ(this.tile.endCoord.x - (stepCoord.x * x), this.tile.endCoord.y, 0);
			vertBorder.push(vect);
		}
		for (y = 1; y < (Oev.Globe.tilesDefinition + 1); y ++) {
			vertUvs.push(new THREE.Vector2(1, 1 - (y * stepUV)));
			vertUvs.push(new THREE.Vector2(1, 1 - (y * stepUV)));
			vEId = ((Oev.Globe.tilesDefinition + 0) - y) + (0);
			vertEle = this.elevationBuffer[vEId];
			vect = Oev.Globe.coordToXYZ(this.tile.startCoord.x, this.tile.endCoord.y - (stepCoord.y * y), vertEle);
			vertBorder.push(vect);
			vect = Oev.Globe.coordToXYZ(this.tile.startCoord.x, this.tile.endCoord.y - (stepCoord.y * y), 0);
			vertBorder.push(vect);
		}
		for (b = 0; b < vertBorder.length; b ++) {
			geoBorders.vertices.push(vertBorder[b]);
		}
		for (b = 0; b < vertBorder.length - 2; b += 2) {
			geoBorders.faces.push(new THREE.Face3(b + 2, b + 1, b + 0));
			geoBorders.faceVertexUvs[0][(geoBorders.faces.length - 1)] = [ vertUvs[b+2], vertUvs[b+1], vertUvs[b+0] ];
			geoBorders.faces.push(new THREE.Face3(b + 1, b + 2, b + 3));
			geoBorders.faceVertexUvs[0][(geoBorders.faces.length - 1)] = [ vertUvs[b+1], vertUvs[b+2], vertUvs[b+3] ];
		}
		geoBorders.uvsNeedUpdate = true;
		geoBorders.computeFaceNormals();
		geoBorders.mergeVertices()
		geoBorders.computeVertexNormals();
		this.materialBorder.map = this.tile.material.map;
		this.mesheBorder = new THREE.Mesh(geoBorders, this.materialBorder);
		this.mesheBorder.matrixAutoUpdate = false;
		this.tile.meshe.add(this.mesheBorder);
	}
	
	getElevation(_lon, _lat) {
		if (Oev.Tile.Extension['ACTIV_' + this.id] === false) {
			return 0;
		}
		if (_lon < this.startCoord.x || _lon > this.endCoord.x) {
			return -9999;
		}
		if (_lat > this.startCoord.y || _lat < this.endCoord.y) {
			return -9999;
		}
		if (this.childTiles.length == 0) {
			return this.interpolateEle(_lon, _lat);
		}
		for (var i = 0; i < this.childTiles.length; i ++) {
			var childEle = this.childTiles[i].getElevation(_lon, _lat);
			if (childEle > -9999) {
				return childEle;
			}
		}
		return -9999;
	}
	
	_getVerticeElevation(_vertIndex, _lon, _lat) {
		if (Oev.Tile.Extension['ACTIV_' + this.id] === false) {
			return 0;
		}
		if (this.dataLoaded === true) {
			return this.elevationBuffer[_vertIndex];
		}
		if (this.parentTile != undefined) {
			return this.parentTile.interpolateEle(_lon, _lat);
		}
	}
	
	interpolateEle(_lon, _lat) {
		var gapLeft = this.endCoord.x - this.startCoord.x;
		var distFromLeft = _lon - this.startCoord.x;
		var prctLeft = distFromLeft / gapLeft;
		var gapTop = this.endCoord.y - this.startCoord.y;
		var distFromTop = _lat - this.startCoord.y;
		var prctTop = distFromTop / gapTop;
		if (prctLeft < 0 || prctLeft > 1 || prctTop < 0 || prctTop > 1) {
			return -9999;
		}
		if (this.dataLoaded === false) {
			if (this.parentTile === undefined) {
				return 0;
			}
			return this.parentTile.interpolateEle(_lon, _lat);
		}
		if (prctLeft == 1) {
			var vertLeftTopIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft) - 1;
		}else{
			var vertLeftTopIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft);
		}
		if (prctTop == 1) {
			var vertLeftTopIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop) - 1;
		}else{
			var vertLeftTopIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop);
		}
		var vertLeftTopId = vertLeftTopIdY + (vertLeftTopIdX * (Oev.Globe.tilesDefinition + 1));
		if (prctLeft == 1) {
			var vertRightTopIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft);
		}else{
			var vertRightTopIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft) + 1;
		}
		if (prctTop == 1) {
			var vertRightTopIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop) - 1;
		}else{
			var vertRightTopIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop);
		}
		var vertRightTopId = vertRightTopIdY + (vertRightTopIdX * (Oev.Globe.tilesDefinition + 1));
		if (prctLeft == 1) {
			var vertLeftBottomIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft) - 1;
		}else{
			var vertLeftBottomIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft);
		}
		if (prctTop == 1) {
			var vertLeftBottomIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop);
		}else{
			var vertLeftBottomIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop) + 1;
		}
		var vertLeftBottomId = vertLeftBottomIdY + (vertLeftBottomIdX * (Oev.Globe.tilesDefinition + 1));
		
		if (prctLeft == 1) {
			var vertRightBottomIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft);
		}else{
			var vertRightBottomIdX = Math.floor(Oev.Globe.tilesDefinition * prctLeft) + 1;
		}
		if (prctTop == 1) {
			var vertRightBottomIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop);
		}else{
			var vertRightBottomIdY = Math.floor(Oev.Globe.tilesDefinition * prctTop) + 1;
		}
		var vertRightBottomId = vertRightBottomIdY + (vertRightBottomIdX * (Oev.Globe.tilesDefinition + 1));
		if (vertLeftTopId > this.elevationBuffer.length - 1) {
			console.log("Overflow A " + vertLeftTopId + " / " + this.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		if (vertRightTopId > this.elevationBuffer.length - 1) {
			console.log("Overflow B " + vertRightTopId + " / " + this.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		if (vertLeftBottomId > this.elevationBuffer.length - 1) {
			console.log("Overflow C " + vertLeftBottomId + " / " + this.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		if (vertRightBottomId > this.elevationBuffer.length - 1) {
			console.log("Overflow D " + vertRightBottomId + " / " + this.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		var ampEleTop = this.elevationBuffer[vertRightTopId] - this.elevationBuffer[vertLeftTopId];
		var ampEleBottom = this.elevationBuffer[vertRightBottomId] - this.elevationBuffer[vertLeftBottomId];
		var ampEleLeft = this.elevationBuffer[vertLeftBottomId] - this.elevationBuffer[vertLeftTopId];
		var ampEleRight = this.elevationBuffer[vertRightBottomId] - this.elevationBuffer[vertRightTopId];
		var gapVertLeft = this.vertCoords[vertRightTopId].x - this.vertCoords[vertLeftTopId].x;
		var distFromVertLeft = _lon - this.vertCoords[vertLeftTopId].x;
		var prctVertLeft = distFromVertLeft / gapVertLeft;
		var gapVertTop = this.vertCoords[vertLeftBottomId].y - this.vertCoords[vertLeftTopId].y;
		var distFromVertTop = _lat - this.vertCoords[vertLeftTopId].y;
		var prctVertTop = distFromVertTop / gapVertTop;
		var eleInterpolTop = this.elevationBuffer[vertLeftTopId] + (ampEleTop * prctVertLeft);
		var eleInterpolBottom = this.elevationBuffer[vertLeftBottomId] + (ampEleTop * prctVertLeft);
		var amplVert = eleInterpolBottom - eleInterpolTop;
		var eleInterpolFinal = eleInterpolTop + (amplVert * prctVertTop);
		if (isNaN(eleInterpolFinal)) {
			console.log("NaN eleInterpolFinal : " + vertLeftTopId + " / " + vertRightTopId + " / " + vertLeftBottomId + " / " + vertRightBottomId);
		}
		return eleInterpolFinal;
	}
	
	dispose() {
		this.resetElevation();
		this.applyElevationToGeometry();
		this.dataLoaded = false;
		if (this.mesheBorder != undefined) {
			this.tile.meshe.remove(this.mesheBorder);
			this.mesheBorder.geometry.dispose();
			this.mesheBorder = undefined;
		}
		this.materialBorder.dispose();
		// this.materialBorder = null;
		this.elevationBuffer = null;
		OEV.MUST_RENDER = true;
	}
	
	resetElevation() {
		for (var i = 0; i < this.elevationBuffer.length; i ++) {
			this.elevationBuffer[i] = 0;
		}
	}
	
}

// export {Elevation as default}
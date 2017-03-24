Oev.Tile.Extension.Elevation = function(_tile) {
	'use strict';

	var ext = Object.create(Oev.Tile.Extension);
	var loaderEle = OEV.earth.loaderEle;
	
	ext.id = 'ELEVATION';
	ext.elevationBuffer = new Uint16Array((32 * 32) / 4);
	ext.mesheBorder = undefined;
	ext.materialBorder = new THREE.MeshBasicMaterial({color: 0xffffff,map: OEV.textures["checker"]});
	
	ext.init = function() {
		this.tile.getElevation = ext.getElevation;
		this.tile._getVerticeElevation = ext._getVerticeElevation;
		this.tile.interpolateEle = ext.interpolateEle;
	}
	
	ext.loadDatas = function() {
		loaderEle.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			function(_datas) {
				ext._onElevationLoaded(_datas.slice(0));
			}
		);
	}
	
	ext.show = function() {
		if (this.datasLoaded) {
			return false;
		}
		this.loadDatas();
	}
	
	ext.hide = function() {
		loaderEle.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}
	
	ext._onElevationLoaded = function(_datas) {
		if (!Oev.Tile.Extension['ACTIV_' + this.id]) {
			return false;
		}
		this.dataLoaded = true;
		this.elevationBuffer = _datas;
		this.applyElevationToGeometry();
	}
	
	
	ext.applyElevationToGeometry = function() {
		if (!this.dataLoaded) {
			// console.warn('A', this.tile.zoom, this.tile.isReady);
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
				// this.tile.vertCoords[index].z = ele;
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
	
	ext.makeBorders = function() {
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
	
	ext.getElevation = function(_lon, _lat) {
		if (Oev.Tile.Extension['ACTIV_' + ext.id] === false) {
			return 0;
		}
		if (ext.tile.childTiles.length == 0) {
			return ext.tile.interpolateEle(_lon, _lat);
		}
		for (var i = 0; i < ext.tile.childTiles.length; i ++) {
			var childEle = ext.tile.childTiles[i].getElevation(_lon, _lat);
			if (childEle > -9999) {
				return childEle;
			}
		}
		return -9999;
	}
	
	ext._getVerticeElevation = function(_vertIndex, _lon, _lat) {
		if (Oev.Tile.Extension['ACTIV_' + ext.id] === false) {
			return 0;
		}
		if (ext.dataLoaded === true) {
			return ext.elevationBuffer[_vertIndex];
		}
		if (ext.tile.parentTile != undefined) {
			return ext.tile.parentTile.interpolateEle(_lon, _lat);
		}
	}
	
	ext.interpolateEle = function(_lon, _lat) {
		if (ext.dataLoaded === false) {
			if (ext.tile.parentTile != undefined) {
				return ext.tile.parentTile.interpolateEle(_lon, _lat);
			}
			return 0;
		}
		var gapLeft = ext.tile.endCoord.x - ext.tile.startCoord.x;
		var distFromLeft = _lon - ext.tile.startCoord.x;
		var prctLeft = distFromLeft / gapLeft;
		var gapTop = ext.tile.endCoord.y - ext.tile.startCoord.y;
		var distFromTop = _lat - ext.tile.startCoord.y;
		var prctTop = distFromTop / gapTop;
		if (prctLeft < 0 || prctLeft > 1 || prctTop < 0 || prctTop > 1) {
			return -9999;
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
		if (vertLeftTopId > ext.elevationBuffer.length - 1) {
			console.log("Overflow A " + vertLeftTopId + " / " + ext.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		if (vertRightTopId > ext.elevationBuffer.length - 1) {
			console.log("Overflow B " + vertRightTopId + " / " + ext.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		if (vertLeftBottomId > ext.elevationBuffer.length - 1) {
			console.log("Overflow C " + vertLeftBottomId + " / " + ext.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		if (vertRightBottomId > ext.elevationBuffer.length - 1) {
			console.log("Overflow D " + vertRightBottomId + " / " + ext.elevationBuffer.length);
			console.log("prctLeft : " + prctLeft + " / prctTop : " + prctTop);
		}
		var ampEleTop = ext.elevationBuffer[vertRightTopId] - ext.elevationBuffer[vertLeftTopId];
		var ampEleBottom = ext.elevationBuffer[vertRightBottomId] - ext.elevationBuffer[vertLeftBottomId];
		var ampEleLeft = ext.elevationBuffer[vertLeftBottomId] - ext.elevationBuffer[vertLeftTopId];
		var ampEleRight = ext.elevationBuffer[vertRightBottomId] - ext.elevationBuffer[vertRightTopId];
		var gapVertLeft = ext.tile.vertCoords[vertRightTopId].x - ext.tile.vertCoords[vertLeftTopId].x;
		var distFromVertLeft = _lon - ext.tile.vertCoords[vertLeftTopId].x;
		var prctVertLeft = distFromVertLeft / gapVertLeft;
		var gapVertTop = ext.tile.vertCoords[vertLeftBottomId].y - ext.tile.vertCoords[vertLeftTopId].y;
		var distFromVertTop = _lat - ext.tile.vertCoords[vertLeftTopId].y;
		var prctVertTop = distFromVertTop / gapVertTop;
		var eleInterpolTop = ext.elevationBuffer[vertLeftTopId] + (ampEleTop * prctVertLeft);
		var eleInterpolBottom = ext.elevationBuffer[vertLeftBottomId] + (ampEleTop * prctVertLeft);
		var amplVert = eleInterpolBottom - eleInterpolTop;
		var eleInterpolFinal = eleInterpolTop + (amplVert * prctVertTop);
		if (isNaN(eleInterpolFinal)) {
			console.log("NaN eleInterpolFinal : " + vertLeftTopId + " / " + vertRightTopId + " / " + vertLeftBottomId + " / " + vertRightBottomId);
		}
		return eleInterpolFinal;
	}
	
	ext.dispose = function() {
		this.resetElevation();
		this.applyElevationToGeometry();
		this.dataLoaded = false;
		if (this.mesheBorder != undefined) {
			this.tile.meshe.remove(this.mesheBorder);
			this.mesheBorder.geometry.dispose();
			this.mesheBorder = undefined;
			this.materialBorder.dispose();
		}
		OEV.MUST_RENDER = true;
	}
	
	ext.resetElevation = function() {
		for (var i = 0; i < this.elevationBuffer.length; i ++) {
			this.elevationBuffer[i] = 0;
		}
	}
	
	ext.onInit(_tile);
	
	return ext;
}
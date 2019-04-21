import * as TileExtension from './tileExtension.js';
import * as NET_TEXTURES from '../net/NetTextures.js';
import GLOBE from '../globe.js';

export class Elevation {
	constructor(_tile) {
		this.id = 'ELEVATION';
		this.dataLoaded = false;
		this.elevationBuffer = new Uint16Array((32 * 32) / 4);
		this.mesheBorder = undefined;
		this.materialBorder = new THREE.MeshPhongMaterial({color: 0xA0A0A0, shininess: 0, map: NET_TEXTURES.texture("checker")});
		this.tile = _tile;
		if (TileExtension.Params.actives['ACTIV_' + this.id] === undefined) {
			TileExtension.Params.actives['ACTIV_' + this.id] = false;
		}
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		if (TileExtension.Params.actives['ACTIV_' + this.id]) {
			this.onActivate();
		}
	}

	onActivate() {
		TileExtension.Params.actives['ACTIV_' + this.id] = true;
		this.dataLoaded = false;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) {
			this.onTileReady();
		}
	}

	onDesactivate() {
		TileExtension.Params.actives['ACTIV_' + this.id] = false;
		this.hide();
		this.desactivate();
	}

	onTileReady(_evt) {
		this.tileReady();
	}
	
	onTileDispose() {
		if (TileExtension.Params.actives['ACTIV_' + this.id] === true) {
			this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
			this.tile.evt.removeEventListener('HIDE', this, this.hide);
		}
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.dispose();
	}
	
	tileReady() {
		if (this.dataLoaded) return false;
		// if (this.tile.zoom < 12) return false;
		OEV.earth.loaderEle.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this._onElevationLoaded(_datas.slice(0))
		);
	}
	
	hide() {
		OEV.earth.loaderEle.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}
	
	_onElevationLoaded(_datas) {
		if (!this.tile.isReady) return false;
		if (!TileExtension.Params.actives['ACTIV_' + this.id]) return false;
		this.dataLoaded = true;
		this.elevationBuffer = _datas;
		this.applyElevationToGeometry();
	}
	
	applyElevationToGeometry() {
		if (!this.dataLoaded) return false;
		let curVertId = 0;
		const verticePositions = this.tile.meshe.geometry.getAttribute('position');
		const vertCoords = this.tile.getVerticesPlaneCoords();
		vertCoords.forEach((c, i) => {
			const vertPos = GLOBE.coordToXYZ(c[0], c[1], this.elevationBuffer[i]);
			verticePositions.array[curVertId + 0] = vertPos.x;
			verticePositions.array[curVertId + 1] = vertPos.y;
			verticePositions.array[curVertId + 2] = vertPos.z;
			curVertId += 3;
		});
		verticePositions.needsUpdate = true;
		this.tile.meshe.geometry.verticesNeedUpdate = true;
		this.tile.meshe.geometry.uvsNeedUpdate = true;
		this.tile.meshe.geometry.computeFaceNormals();
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
		if (!GLOBE.eleActiv) {
			return false;
		}
		if (this.mesheBorder != undefined) {
			this.tile.meshe.remove(this.mesheBorder);
			this.mesheBorder.geometry.dispose();
			this.mesheBorder = undefined;
		}
		var stepUV = 1 / GLOBE.tilesDefinition;
		var stepCoord = new THREE.Vector2((this.tile.endCoord.x - this.tile.startCoord.x) / GLOBE.tilesDefinition, (this.tile.endCoord.y - this.tile.startCoord.y) / GLOBE.tilesDefinition);
		var geoBorders = new THREE.Geometry();
		geoBorders.dynamic = false;
		geoBorders.faceVertexUvs[0] = [];
		var vertBorder = [];
		var vertUvs = [];
		var vEId;
		for (x = 0; x < (GLOBE.tilesDefinition + 1); x ++) {
			vertUvs.push(new THREE.Vector2(x * stepUV, 0));
			vertUvs.push(new THREE.Vector2(x * stepUV, 0));
			vEId = x * (GLOBE.tilesDefinition + 1);
			vertEle = this.elevationBuffer[vEId];
			vect = GLOBE.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * x), this.tile.startCoord.y, vertEle);
			vertBorder.push(vect);
			vect = GLOBE.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * x), this.tile.startCoord.y, 0);
			vertBorder.push(vect);
		}
		for (y = 1; y < GLOBE.tilesDefinition + 1; y ++) {
			vertUvs.push(new THREE.Vector2(0, y * stepUV));
			vertUvs.push(new THREE.Vector2(0, y * stepUV));
			vEId = y + (GLOBE.tilesDefinition) * (GLOBE.tilesDefinition + 1);
			vertEle = this.elevationBuffer[vEId];
			vect = GLOBE.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * GLOBE.tilesDefinition), this.tile.startCoord.y + (stepCoord.y * y), vertEle);
			vertBorder.push(vect);
			vect = GLOBE.coordToXYZ(this.tile.startCoord.x + (stepCoord.x * GLOBE.tilesDefinition), this.tile.startCoord.y + (stepCoord.y * y), 0);
			vertBorder.push(vect);
		}
		for (x = 1; x < (GLOBE.tilesDefinition + 1); x ++) {
			vertUvs.push(new THREE.Vector2(1 - (x * stepUV), 0));
			vertUvs.push(new THREE.Vector2(1 - (x * stepUV), 0));
			vEId = (GLOBE.tilesDefinition + 0) + ((GLOBE.tilesDefinition + 0) - x) * (GLOBE.tilesDefinition + 1);
			vertEle = this.elevationBuffer[vEId];
			vect = GLOBE.coordToXYZ(this.tile.endCoord.x - (stepCoord.x * x), this.tile.endCoord.y, vertEle);
			vertBorder.push(vect);
			vect = GLOBE.coordToXYZ(this.tile.endCoord.x - (stepCoord.x * x), this.tile.endCoord.y, 0);
			vertBorder.push(vect);
		}
		for (y = 1; y < (GLOBE.tilesDefinition + 1); y ++) {
			vertUvs.push(new THREE.Vector2(1, 1 - (y * stepUV)));
			vertUvs.push(new THREE.Vector2(1, 1 - (y * stepUV)));
			vEId = ((GLOBE.tilesDefinition + 0) - y) + (0);
			vertEle = this.elevationBuffer[vEId];
			vect = GLOBE.coordToXYZ(this.tile.startCoord.x, this.tile.endCoord.y - (stepCoord.y * y), vertEle);
			vertBorder.push(vect);
			vect = GLOBE.coordToXYZ(this.tile.startCoord.x, this.tile.endCoord.y - (stepCoord.y * y), 0);
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
			if (this.parentTile === null) {
				return 0;
			}
			return this.parentTile.interpolateEle(_lon, _lat);
		}
		if (prctLeft == 1) {
			var vertLeftTopIdX = Math.floor(GLOBE.tilesDefinition * prctLeft) - 1;
		}else{
			var vertLeftTopIdX = Math.floor(GLOBE.tilesDefinition * prctLeft);
		}
		if (prctTop == 1) {
			var vertLeftTopIdY = Math.floor(GLOBE.tilesDefinition * prctTop) - 1;
		}else{
			var vertLeftTopIdY = Math.floor(GLOBE.tilesDefinition * prctTop);
		}
		var vertLeftTopId = vertLeftTopIdY + (vertLeftTopIdX * (GLOBE.tilesDefinition + 1));
		if (prctLeft == 1) {
			var vertRightTopIdX = Math.floor(GLOBE.tilesDefinition * prctLeft);
		}else{
			var vertRightTopIdX = Math.floor(GLOBE.tilesDefinition * prctLeft) + 1;
		}
		if (prctTop == 1) {
			var vertRightTopIdY = Math.floor(GLOBE.tilesDefinition * prctTop) - 1;
		}else{
			var vertRightTopIdY = Math.floor(GLOBE.tilesDefinition * prctTop);
		}
		var vertRightTopId = vertRightTopIdY + (vertRightTopIdX * (GLOBE.tilesDefinition + 1));
		if (prctLeft == 1) {
			var vertLeftBottomIdX = Math.floor(GLOBE.tilesDefinition * prctLeft) - 1;
		}else{
			var vertLeftBottomIdX = Math.floor(GLOBE.tilesDefinition * prctLeft);
		}
		if (prctTop == 1) {
			var vertLeftBottomIdY = Math.floor(GLOBE.tilesDefinition * prctTop);
		}else{
			var vertLeftBottomIdY = Math.floor(GLOBE.tilesDefinition * prctTop) + 1;
		}
		var vertLeftBottomId = vertLeftBottomIdY + (vertLeftBottomIdX * (GLOBE.tilesDefinition + 1));
		
		if (prctLeft == 1) {
			var vertRightBottomIdX = Math.floor(GLOBE.tilesDefinition * prctLeft);
		}else{
			var vertRightBottomIdX = Math.floor(GLOBE.tilesDefinition * prctLeft) + 1;
		}
		if (prctTop == 1) {
			var vertRightBottomIdY = Math.floor(GLOBE.tilesDefinition * prctTop);
		}else{
			var vertRightBottomIdY = Math.floor(GLOBE.tilesDefinition * prctTop) + 1;
		}
		var vertRightBottomId = vertRightBottomIdY + (vertRightBottomIdX * (GLOBE.tilesDefinition + 1));
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
		this.dataLoaded = false;
		if (this.mesheBorder != undefined) {
			this.tile.meshe.remove(this.mesheBorder);
			this.mesheBorder.geometry.dispose();
			this.mesheBorder = undefined;
		}
		this.materialBorder.dispose();
		this.elevationBuffer = null;
		OEV.MUST_RENDER = true;
	}
	
}
import Renderer from './renderer.js';
import Evt from './utils/event.js';
import GEO from './utils/geo.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import {loader as MapLoader} from './tileExtensions/map/mapLoader.js';
import GLOBE from './globe.js';
import {texture as Texture} from './net/textures.js';

class Tile {
		
	constructor(_tileX, _tileY, _zoom) {
		this.evt = new Evt();
		this.isReady = false;
		this.onStage = true;
		this.parentTile = null;
		this.parentOffset = new THREE.Vector2(0, 0);
		this.tileX = _tileX;
		this.tileY = _tileY;
		this.zoom = _zoom;
		this.childTiles = [];
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.meshe = undefined;
		this.key = this.tileX + '_' + this.tileY + '_' + this.zoom;
		this.verticesNb = (GLOBE.tilesDefinition + 1) * (GLOBE.tilesDefinition + 1);
		this.startCoord = GEO.tileToCoordsVect(this.tileX, this.tileY, this.zoom);
		this.endCoord = GEO.tileToCoordsVect(this.tileX + 1, this.tileY + 1, this.zoom);
		this.startLargeCoord = GEO.tileToCoordsVect(this.tileX - 1, this.tileY - 1, this.zoom);
		this.endLargeCoord = GEO.tileToCoordsVect(this.tileX + 2, this.tileY + 2, this.zoom);
		this.startMidCoord = GEO.tileToCoordsVect(this.tileX - 0.5, this.tileY - 0.5, this.zoom);
		this.endMidCoord = GEO.tileToCoordsVect(this.tileX + 1.5, this.tileY + 1.5, this.zoom);
		this.middleCoord = new THREE.Vector2((this.startCoord.x + this.endCoord.x) / 2, (this.startCoord.y + this.endCoord.y) / 2);
		this.distToCam = ((GLOBE.coordDetails.x - this.middleCoord.x) * (GLOBE.coordDetails.x - this.middleCoord.x) + (GLOBE.coordDetails.y - this.middleCoord.y) * (GLOBE.coordDetails.y - this.middleCoord.y));


		this.alphaShapes = [];

		this.alphaMap = this.createAlphaMap();
		this.material = new THREE.MeshPhysicalMaterial({alphaTest:0.2,alphaMap:this.alphaMap,transparent:true,color: 0xA0A0A0, roughness:1,metalness:0, map: Texture('checker')});
		// this.material = new THREE.MeshPhysicalMaterial({alphaTest:0.99,alphaMap:this.alphaMap,color: 0xA0A0A0, roughness:1,metalness:0, map: Texture('checker')});
		this.extensions = [];
		TileExtension.listActives().forEach(p => this.addExtension(p));
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', this, this.onExtensionDisabled);
	}



	createAlphaMap() {
		const canvas = document.createElement('canvas');
		const canvasSize = 256;
		canvas.width = canvasSize;
		canvas.height = canvasSize;
		const context = canvas.getContext('2d');
		context.beginPath();
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, canvasSize, canvasSize);
		const alphaTexture = new THREE.Texture(canvas);
		alphaTexture.needsUpdate = true;
		return alphaTexture;
	}

	drawToAlphaMap(_shapes) {
		this.alphaShapes.push(..._shapes);
		for (let s = 0; s < _shapes.length; s ++) {
			const shape = _shapes[s];
			if (!shape.border.length) continue;
			const canvasSize = this.alphaMap.image.width;
			const context = this.alphaMap.image.getContext('2d');
			context.beginPath();
			// TODO: crop le bord avec le cadre de la tile
			// context.lineWidth = 7;
			// context.strokeStyle = '#ffffff';
			this.drawCanvasShape(shape.border, context, canvasSize);
			// context.stroke();
			context.lineWidth = 1;
			for (let i = 0; i < shape.holes.length; i ++) {
				this.drawCanvasShape(shape.holes[i], context, canvasSize);
			}
			context.fill('evenodd');
		}
		this.alphaMap.needsUpdate = true;
		Renderer.MUST_RENDER = true;
	}

	drawCanvasShape(_coords, _context, _size) {
		const points = new Array(_coords.length);
		for (let i = 0; i < _coords.length; i ++) {
			const coord = _coords[i];
			const point = [
				mapValue(coord[0], this.startCoord.x, this.endCoord.x) * _size, 
				_size - mapValue(coord[1], this.endCoord.y, this.startCoord.y) * _size, 
			];
			points[i] = point;
		}
		const start = points.shift();
		_context.fillStyle = '#000000';
		_context.moveTo(start[0], start[1]);
		for (let i = 0; i < points.length; i ++) {
			_context.lineTo(points[i][0], points[i][1]);
		}
		_context.closePath();
		// TODO: appliquer aux enfants ..?
	}




	
	onExtensionActivation(_extensionId) {
		this.addExtension(_extensionId);
	}

	onExtensionDisabled(_extensionId) {
		this.removeExtension(_extensionId);
	}
	
	addExtension(_extensionId) {
		if (this.ownExtension(_extensionId)) return false;
		const ext = new TileExtension.extensions[_extensionId](this);
		this.extensions.push(ext);
		this.childTiles.forEach(t => t.addExtension(_extensionId));
		return true;
	}
	
	ownExtension(_id) {
		return this.extensions.filter(e => e.id == _id).length;
	}
	
	removeExtension(_id) {
		const extensionsToRemove = this.extensions.filter(e => e.id == _id);
		extensionsToRemove.forEach(e => e.dispose());
		this.extensions = this.extensions.filter(e => e.id != _id);
		this.childTiles.forEach(t => t.removeExtension(_id));
	}

	nearestTextures() {
		if (this.textureLoaded) return null;
		const defaultDatas = {
			map : Texture("checker"), 
			uvReduc : 1, 
			offsetX : 0, 
			offsetY : 0, 
		};
		if (!this.parentTile) return defaultDatas;
		let curParent = this.parentTile;
		let uvReduc = 0.5;
		let curOffsetX = this.parentOffset.x * 0.5;
		let curOffsetY = this.parentOffset.y * 0.5;
		while (curParent && !curParent.textureLoaded) {
			uvReduc *= 0.5;
			curOffsetX = curParent.parentOffset.x * 0.5 + (curOffsetX * 0.5);
			curOffsetY = curParent.parentOffset.y * 0.5 + (curOffsetY * 0.5);
			curParent = curParent.parentTile;
		}
		if (!curParent) return defaultDatas;
		return {
			map : curParent.material.map, 
			uvReduc : uvReduc, 
			offsetX : curOffsetX, 
			offsetY : curOffsetY, 
		};
	}

	applyTexture(_textureDatas) {
		if (_textureDatas === null) return false;
		if (this.meshe === undefined) return false;
		const vertBySide = GLOBE.tilesDefinition + 1;
		const bufferUvs = new Float32Array(this.verticesNb * 2);
		let stepUV = _textureDatas.uvReduc / GLOBE.tilesDefinition;
		let uvIndex = 0;
		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				uvIndex = (x * vertBySide) + y;
				bufferUvs[uvIndex * 2] = _textureDatas.offsetX + (stepUV * x);
				bufferUvs[uvIndex * 2 + 1] = 1 - (stepUV * y) - _textureDatas.offsetY;
			}
		}
		this.material.map = _textureDatas.map;
		this.meshe.geometry.addAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
		this.meshe.geometry.attributes.uv.needsUpdate = true;
	}

	getVerticesPlaneCoords() {
		const def = GLOBE.tilesDefinition;
		const vertBySide = def + 1;
		const vertNb = vertBySide * vertBySide;
		const bufferCoords = new Float32Array(vertNb * 2);
		let coordId = 0;
		const stepCoordX = (this.endCoord.x - this.startCoord.x) / def;
		const stepCoordY = (this.endCoord.y - this.startCoord.y) / def;
		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				bufferCoords[coordId + 0] = this.startCoord.x + (stepCoordX * x);
				bufferCoords[coordId + 1] = this.startCoord.y + (stepCoordY * y);
				coordId += 2;

			}
		}
		return bufferCoords;
	}

	buildGeometry() {
		let curVertId = 0;
		const bufferVertices = new Float32Array(this.verticesNb * 3);
		const vertCoords = this.getVerticesPlaneCoords();
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			const vertPos = GLOBE.coordToXYZ(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				0
			);
			bufferVertices[curVertId + 0] = vertPos.x;
			bufferVertices[curVertId + 1] = vertPos.y;
			bufferVertices[curVertId + 2] = vertPos.z;
			curVertId += 3;
		}

		const def = GLOBE.tilesDefinition;
		const vertBySide = def + 1;
		let faceId = 0;
		const nbFaces = (def * def) * 2;
		const bufferFaces = new Uint32Array(nbFaces * 3);
		for (let x = 0; x < def; x ++) {
			for (let y = 0; y < def; y ++) {
				bufferFaces[faceId + 0] = (x * vertBySide) + y;
				bufferFaces[faceId + 1] = (x * vertBySide) + y + 1;
				bufferFaces[faceId + 2] = ((x + 1) * vertBySide) + y + 1;
				bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1;
				bufferFaces[faceId + 4] = ((x + 1) * vertBySide) + y;
				bufferFaces[faceId + 5] = (x * vertBySide) + y;
				faceId += 6;
			}
		}
		const geoBuffer = new THREE.BufferGeometry();
		geoBuffer.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		geoBuffer.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		geoBuffer.computeFaceNormals();
		geoBuffer.computeVertexNormals();
		if (this.meshe !== undefined) {
			GLOBE.removeMeshe(this.meshe);
			this.meshe.geometry.dispose();
		}
		this.meshe = new THREE.Mesh(geoBuffer, this.material);
		if (this.onStage) {
			GLOBE.addMeshe(this.meshe);
		}
		this.meshe.castShadow = true;
		this.meshe.receiveShadow = true;
		let parentTexture = this.nearestTextures();
		this.applyTexture(parentTexture);
		this.isReady = true;
		this.evt.fireEvent('TILE_READY');
	}

	updateVertex() {
		GLOBE.removeMeshe(this.meshe);
		this.meshe.geometry.dispose();
		this.buildGeometry();
		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].updateVertex();
		}
		Renderer.MUST_RENDER = true;
	}

	searchTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom > _zoom) return false;
		if (this.isTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		for (let i = 0; i < this.childTiles.length; i ++) {
			const res = this.childTiles[i].searchTileAtXYZ(_tileX, _tileY, _zoom);
			if (res) return res;
		}
		if (this.containTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		return false;
	}
	
	containTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom >= _zoom) return false;
		const zoomDiff = _zoom - this.zoom;
		const zoomX = this.tileX * Math.pow(2, zoomDiff);
		const zoomY = this.tileY * Math.pow(2, zoomDiff);
		if (_tileX < zoomX) return false;
		if (_tileY < zoomY) return false;
		if (_tileX > zoomX + 1) return false;
		if (_tileY > zoomY + 1) return false;
		return true;
	}

	isTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom != _zoom) return false;
		if (this.tileX != _tileX) return false;
		if (this.tileY != _tileY) return false;
		return true;
	}

	show() {
		if (this.onStage) return false;
		this.onStage = true;
		GLOBE.addMeshe(this.meshe);
		this.evt.fireEvent('SHOW');
	}
	
	hide() {
		if (!this.onStage) return false;
		this.onStage = false;
		GLOBE.removeMeshe(this.meshe);
		if (!this.textureLoaded) {
			MapLoader.abort({
				z : this.zoom, 
				x : this.tileX, 
				y : this.tileY
			});
		}
		this.evt.fireEvent('HIDE');
	}

	createChilds(_coords) {
		if (this.childTiles.length > 0) return false;
		this.addChild(_coords, 0, 0);
		this.addChild(_coords, 0, 1);
		this.addChild(_coords, 1, 0);
		this.addChild(_coords, 1, 1);
	}
		
	addChild(_coords, _offsetX, _offsetY) {
		const newTile = new Tile(this.tileX * 2 + _offsetX, this.tileY * 2 + _offsetY, this.zoom + 1);
		newTile.parentTile = this;
		newTile.parentOffset = new THREE.Vector2(_offsetX, _offsetY);
		newTile.buildGeometry();
		newTile.drawToAlphaMap(this.alphaShapes);
		this.childTiles.push(newTile);
	}

	clearChildrens() {
		if (this.childTiles.length == 0) return false;
		this.childTiles.forEach(t => t.dispose());
		this.childTiles = [];
	}

	updateDetails(_coords) {
		if (this.checkCameraHover(_coords, GLOBE.tilesDetailsMarge)) {
			if (this.zoom < Math.floor(GLOBE.CUR_ZOOM)) {
				this.createChilds(_coords);
				this.childTiles.forEach(t => t.updateDetails(_coords));
				this.hide();
			}else{
				this.clearChildrens();
				this.show();
			}
		}else{
			this.clearChildrens();
			if( this.zoom + 5 < GLOBE.CUR_ZOOM ){
				this.hide();
			}else{
				this.show();	
			}
		}
	}
	
	getCurTile(_coords) {
		if (this.checkCameraHover(_coords, 1) === false) return false;
		if (this.childTiles.length == 0) return this;
		const childs = this.childTiles
			.map(t => t.getCurTile(_coords))
			.filter(res => res);
		return childs.pop();
	}

	checkCameraHover(_coords, _marge) {
		const startLimit = GEO.tileToCoords(this.tileX - (_marge - 1), this.tileY - (_marge - 1), this.zoom);
		const endLimit = GEO.tileToCoords(this.tileX + _marge, this.tileY + _marge, this.zoom);
		if (startLimit[0] > _coords.x) return false;
		if (endLimit[0] < _coords.x) return false;
		if (startLimit[1] < _coords.y) return false;
		if (endLimit[1] > _coords.y) return false;
		return true;
	}

	setTexture(_texture) {
		this.textureLoaded = true;
		this.remoteTex = _texture;
		this.applyTexture({
			map : this.remoteTex, 
			uvReduc : 1, 
			offsetX : 0, 
			offsetY : 0, 
		});
		Renderer.MUST_RENDER = true;this.evt.fireEvent('TEXTURE_LOADED');
	}

	unsetTexture() {
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.material.map = Texture('checker');
	}

	dispose() {
		TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
		this.clearChildrens();
		this.hide();
		if (this.meshe != undefined) {
			this.meshe.geometry.dispose();
			this.material.map.dispose();
			this.material.dispose();
		}
		if (this.textureLoaded) {
			this.remoteTex.dispose();
		}
		this.alphaShapes.length = 0;
		this.extensions = [];
		this.isReady = false;
		this.evt.fireEvent('DISPOSE');
	}
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}

export {Tile as default};
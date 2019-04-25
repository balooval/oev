import Evt from './event.js';
import * as GEO from './geo.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import GLOBE from './globe.js';
import * as NET_TEXTURES from './net/NetTextures.js';

let minX = 999999999;
let maxX = -999999999;
let minY = 999999999;
let maxY = -999999999;

export function setMinMax(_minX, _minY, _maxX, _maxY) {
	minX = _minX;
	minY = _minX;
	maxX = _maxX;
	maxY = _maxY;
}

export class Basic {
		
	constructor(_tileX, _tileY, _zoom) {
		this.evt = new Evt();
		this.isReady = false;
		this.onStage = true;
		this.parentTile = null;
		this.parentOffset = new THREE.Vector2( 0, 0 );
		this.tileX = _tileX;
		this.tileY = _tileY;
		this.zoom = _zoom;
		this.childTiles = [];
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.meshe = undefined;
		this.verticesNb = (GLOBE.tilesDefinition + 1) * (GLOBE.tilesDefinition + 1);
		this.startCoord = GEO.tileToCoordsVect(this.tileX, this.tileY, this.zoom);
		this.endCoord = GEO.tileToCoordsVect(this.tileX + 1, this.tileY + 1, this.zoom);
		this.startLargeCoord = GEO.tileToCoordsVect(this.tileX - 1, this.tileY - 1, this.zoom);
		this.endLargeCoord = GEO.tileToCoordsVect(this.tileX + 2, this.tileY + 2, this.zoom);
		this.startMidCoord = GEO.tileToCoordsVect(this.tileX - 0.5, this.tileY - 0.5, this.zoom);
		this.endMidCoord = GEO.tileToCoordsVect(this.tileX + 1.5, this.tileY + 1.5, this.zoom);
		this.middleCoord = new THREE.Vector2((this.startCoord.x + this.endCoord.x) / 2, (this.startCoord.y + this.endCoord.y) / 2);
		this.distToCam = ((GLOBE.coordDetails.x - this.middleCoord.x) * (GLOBE.coordDetails.x - this.middleCoord.x) + (GLOBE.coordDetails.y - this.middleCoord.y) * (GLOBE.coordDetails.y - this.middleCoord.y));
		this.material = new THREE.MeshPhongMaterial({color: 0xA0A0A0, wireframe:false, shininess: 0, map: NET_TEXTURES.texture("checker")});
		this.extensions = [];
		TileExtension.Params.activated.forEach(p => this.addExtension(p));
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
	}
	
	onExtensionActivation(_extensionId) {
		this.addExtension(_extensionId);
	}
	
	addExtension(_extensionId) {
		if (this.ownExtension(_extensionId)) return false;
		const ext = new GLOBE.tileExtensions[_extensionId](this);
		this.extensions.push(ext);
		this.childTiles.forEach(t => t.addExtension(_extensionId));
		return true;
	}
	
	ownExtension(_id) {
		return this.extensions.filter(e => e.id == _id).length;
	}
	
	removeExtension(_id) {
		this.extensions = this.extensions.filter(e => e.id != _id);
		this.childTiles.forEach(t => t.removeExtension(_id));
	}

	nearestTextures() {
		if (this.textureLoaded) return null;
		const defaultDatas = {
			map : NET_TEXTURES.texture("checker"), 
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
		const coords = [];
		const def = GLOBE.tilesDefinition;
		const vertBySide = def + 1;
		let curVertId = 0;
		const stepCoordX = (this.endCoord.x - this.startCoord.x) / def;
		const stepCoordY = (this.endCoord.y - this.startCoord.y) / def;
		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				coords.push([
					this.startCoord.x + (stepCoordX * x), 
					this.startCoord.y + (stepCoordY * y)
				]);
			}
		}
		return coords;
	}

	buildGeometry() {
		let curVertId = 0;
		const bufferVertices = new Float32Array(this.verticesNb * 3);
		const vertCoords = this.getVerticesPlaneCoords();
		vertCoords.forEach(c => {
			const vertPos = GLOBE.coordToXYZ(c[0], c[1], 0);
			bufferVertices[curVertId + 0] = vertPos.x;
			bufferVertices[curVertId + 1] = vertPos.y;
			bufferVertices[curVertId + 2] = vertPos.z;
			curVertId += 3;
		});
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
		this.loadImage();
		this.isReady = true;
		this.evt.fireEvent('TILE_READY');
	}

	updateVertex() {
		GLOBE.removeMeshe(this.meshe);
		this.meshe.geometry.dispose();
		this.buildGeometry();
		this.childTiles.forEach(t => t.updateVertex());
		OEV.MUST_RENDER = true;
	}

	show() {
		if (this.onStage) return false;
		this.onStage = true;
		GLOBE.addMeshe(this.meshe);
		this.loadImage();
		this.evt.fireEvent('SHOW');
	}
	
	hide() {
		if (!this.onStage) return false;
		this.onStage = false;
		GLOBE.removeMeshe(this.meshe);
		if (!this.textureLoaded) {
			GLOBE.loaderTile2D.abort({
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
		const newTile = new Basic(this.tileX * 2 + _offsetX, this.tileY * 2 + _offsetY, this.zoom + 1);
		newTile.parentTile = this;
		newTile.parentOffset = new THREE.Vector2(_offsetX, _offsetY);
		newTile.buildGeometry();
		this.childTiles.push(newTile);
	}

	clearChildrens() {
		if( this.childTiles.length == 0 ) return false;
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
		if (this.onStage) {
			const pos = GLOBE.coordToXYZ(this.middleCoord.x, this.middleCoord.y, 0);
			minX = Math.min(pos.x, minX);
			maxX = Math.max(pos.x, maxX);
			minY = Math.min(pos.z, minY);
			maxY = Math.max(pos.z, maxY);
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

	reloadTexture() {
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.childTiles.forEach(t => t.reloadTexture());
		this.loadImage();
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
		OEV.MUST_RENDER = true;this.evt.fireEvent('TEXTURE_LOADED');
	}

	loadImage() {
		if(this.textureLoaded) {
			this.setTexture(this.remoteTex);
			return true;
		}
		GLOBE.loaderTile2D.getData(
			{
				z : this.zoom, 
				x : this.tileX, 
				y : this.tileY, 
				priority : this.distToCam
			}, 
			_texture => this.setTexture(_texture)
		);
		return false;
	}

	update() {
		this.material.uniforms.time.value = ( OEV.globalTime - 1456688420000 ) / 10;
		this.material.uniforms.time.value.needsUpdate = true;
		OEV.MUST_RENDER = true;
	}
	
	getElevation(_lon, _lat) {
		return 0;
	}

	interpolateEle(_lon, _lat, _debug) {
		return 0;
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
		if (this.mustUpdate) {
			OEV.removeObjToUpdate( this );
		}
		this.extensions = [];
		this.isReady = false;
		this.evt.fireEvent('DISPOSE');
	}
}
	

export const TileProcessQueue = (function(){
	var waitingsObj = [];
	
	var api = {
		addWaiting : function(_caller) {
			waitingsObj.push(_caller);
			OEV.addObjToUpdate(api);
			Oev.Ui.setQueueNb(waitingsObj.length);
		}, 
		
		processNext : function() {
			if (waitingsObj.length == 0) {
				OEV.removeObjToUpdate(api);
				Oev.Ui.setQueueNb('0');
				return null;
			}
			return waitingsObj.shift();
		}, 
		
		update : function() {
			var caller = api.processNext();
			if (caller === null) {
				return false;
			}
			caller.construct();
		}, 
	};
	
	return api;
})();
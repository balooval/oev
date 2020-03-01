import * as THREE from '../vendor/three.module.js';
import Renderer from './renderer.js';
import GLOBE from './globe.js';
import Evt from './event.js';
import GEO from './geo.js';
import * as TileExtension from '../tileExtensions/tileExtension.js';
import {loader as MapLoader} from '../tileExtensions/map/mapLoader.js';
import {texture as Texture} from '../net/textures.js';

export const mapSize = 256;

export class TileBasic {
		
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
		this.bbox = [
			this.startCoord.x, // min X
			this.endCoord.x, // max X
			this.endCoord.y, // min Y
			this.startCoord.y, // max Y
		  ];

		this.distToCam = ((GLOBE.coordDetails.x - this.middleCoord.x) * (GLOBE.coordDetails.x - this.middleCoord.x) + (GLOBE.coordDetails.y - this.middleCoord.y) * (GLOBE.coordDetails.y - this.middleCoord.y));
        
        this.extensionsMaps = new Map();
		this.composeMap = this.createCanvas();
		this.composeContext = this.composeMap.getContext('2d');
		this.diffuseTexture = new THREE.Texture(this.composeMap);
		this.diffuseTexture.needsUpdate = true;
		this.diffuseMap = null;

		this.material = new THREE.MeshPhysicalMaterial({color: 0xA0A0A0, roughness:1,metalness:0, map: this.diffuseTexture});
		// this.material = new THREE.MeshPhysicalMaterial({alphaTest:0.2,alphaMap:this.alphaMap,transparent:true,color: 0xA0A0A0, roughness:1,metalness:0, map: Texture('checker')});

		this.extensions = new Map();
		TileExtension.listActives().forEach(p => this.addExtension(p));
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE', this, this.onExtensionDisabled);
    }
    
    redrawDiffuse() {
        this.composeContext.clearRect(0, 0, mapSize, mapSize);
		this.composeContext.drawImage(this.diffuseMap, 0, 0, 256, 256, 0, 0, mapSize, mapSize);
        this.extensionsMaps.forEach(map => {
            this.composeContext.drawImage(map, 0, 0);
        });
        this.diffuseTexture.needsUpdate = true
        Renderer.MUST_RENDER = true;
    }

	createCanvas() {
		const canvas = document.createElement('canvas');
		canvas.width = mapSize;
		canvas.height = mapSize;
		return canvas;
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
		this.extensions.set(_extensionId, ext);
		this.childTiles.forEach(t => t.addExtension(_extensionId));
		return true;
	}
	
	ownExtension(_id) {
        return this.extensions.has(_id);
	}
	
	removeExtension(_id) {
        const extension = this.extensions.get(_id);
        if (extension) {
            extension.dispose();
            this.extensions.delete(_id);
        }
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
		
		this.meshe.geometry.setAttribute('uv', new THREE.BufferAttribute(bufferUvs, 2));
        this.meshe.geometry.attributes.uv.needsUpdate = true;
        
        this.diffuseMap = _textureDatas.map.image;
        this.evt.fireEvent('TEXTURE_CHANGED');
        this.redrawDiffuse();
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
		geoBuffer.setAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
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
		if (this.zoom > _zoom) {
			return false;
		}
		if (this.isTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		// if (this.zoom == 13 && this.containTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		for (let i = 0; i < this.childTiles.length; i ++) {
			const res = this.childTiles[i].searchTileAtXYZ(_tileX, _tileY, _zoom);
			if (res) return res;
		}
		if (this.containTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		return false;
	}
	
	containTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom >= _zoom) {
			return false;
		}
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
        this.evt.fireEvent('ADD_CHILDRENS');
	}
		
	addChild(_coords, _offsetX, _offsetY) {
		const newTile = new TileBasic(this.tileX * 2 + _offsetX, this.tileY * 2 + _offsetY, this.zoom + 1);
		newTile.parentTile = this;
		newTile.parentOffset = new THREE.Vector2(_offsetX, _offsetY);
		newTile.buildGeometry();
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
				for (let c = 0; c < this.childTiles.length; c ++) {
					this.childTiles[c].updateDetails(_coords);
				}
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
        Renderer.MUST_RENDER = true;
        this.evt.fireEvent('TEXTURE_LOADED');
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
		this.extensions.clear();
        this.extensionsMaps.clear();
		this.isReady = false;
		this.evt.fireEvent('DISPOSE');
	}
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}
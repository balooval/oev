import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import * as LanduseLoader from './landuseLoader.js';
import ElevationStore from '../elevation/elevationStore.js';
import * as NET_TEXTURES from '../../net/NetTextures.js';
import ShellTexture from './landuseShellTexture.js';
import Evt from '../../utils/event.js';

const loadersWaiting = [];

function parseJson(_loader, _datas) {
    loadersWaiting.push(_loader);
    workerParser.postMessage(_datas);
}

function onWorkerMessage(_res) {
    const loader = loadersWaiting.shift();
    loader.jsonParsed(_res.data);
}

const workerParser = new Worker('js/oev/tileExtensions/landuseGeo/workerLanduseJsonParser.js');
workerParser.onmessage = onWorkerMessage;


const drawEvt = new Evt();

let landusesDrawed = [];

function setLanduseDrawed(_id) {
    landusesDrawed.push(_id);
}

function unsetLanduseDrawed(_id) {
    landusesDrawed = landusesDrawed.filter(id => id != _id);
}

function isLanduseDrawed(_id) {
    return landusesDrawed.includes(_id);
}

// const debugWireframe = true;
const debugWireframe = false;
const materials = {
    forest : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.9,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.6}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.7}), 
        new THREE.MeshPhysicalMaterial({roughness:0.7,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.8}), 
    ], 
    scrub : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
    ], 
    grass : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:0.7,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
    ], 
    vineyard : [
        new THREE.MeshPhysicalMaterial({wireframe:debugWireframe, roughness:1,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
        new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:THREE.DoubleSide, transparent:true, alphaTest:0.2}), 
    ], 
};

let materialsInit = false;


export default class LanduseExtension {
	constructor(_tile) {

        if (!materialsInit) {
            materials.forest[0].map = NET_TEXTURES.texture('shell_tree_1');
            materials.forest[1].map = NET_TEXTURES.texture('shell_tree_2');
            materials.forest[2].map = NET_TEXTURES.texture('shell_tree_3');
            materials.forest[3].map = NET_TEXTURES.texture('shell_tree_4');
            materials.scrub[0].map = NET_TEXTURES.texture('shell_scrub_1');
            materials.scrub[1].map = NET_TEXTURES.texture('shell_scrub_2');
            materials.vineyard[0].map = NET_TEXTURES.texture('shell_vine_1');
            materials.vineyard[1].map = NET_TEXTURES.texture('shell_vine_2');
            materials.vineyard[2].map = NET_TEXTURES.texture('shell_vine_3');
            materials.vineyard[3].map = NET_TEXTURES.texture('shell_vine_4');
            materials.grass[0].map = NET_TEXTURES.texture('shell_grass_1');
            materials.grass[1].map = NET_TEXTURES.texture('shell_grass_2');
            materialsInit = true;
        }

		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.meshTile = undefined;
        this.landuses = null;
        this.drawedLanduses = [];
        this.listenLanduses = [];

        this.meshLanduses = [];
        this.geometrysByType = {};

        this.tile = _tile;
        this.tileKey = this.tile.zoom + '_' + this.tile.tileX + '_' + this.tile.tileY;
        this.bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
        };
        this.isActive = this.tile.zoom == 15;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		LanduseLoader.loader.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onLanduseLoaded(_datas)
		);
    }
    
    onLanduseLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        const bbox = {
            minLon : this.tile.startCoord.x, 
            minLat : this.tile.endCoord.y, 
            maxLon : this.tile.endCoord.x, 
            maxLat : this.tile.startCoord.y, 
        };
        parseJson(this, {
            json : _datas,
            bbox : bbox, 
            definition : ShellTexture.definition(), 
        });
    }

    jsonParsed(_datas) {
        if (_datas.length == 0) return false;
        if (!this.tile) return false;
        this.landuses = _datas;
        this.landuses
        .map(landuse => landuse.id)
        .filter(id => isLanduseDrawed(id))
        .forEach(id => {
            this.listenLanduses.push(id);
            drawEvt.addEventListener('UNDRAW_' + id, this, this.onLanduseUndrawed);
        });
        this.landuses
        .filter(landuse => !isLanduseDrawed(landuse.id))
        .forEach(landuse => {
            this.buildGeometry(landuse);
        });
        this.mergeMeshes();
        Renderer.MUST_RENDER = true;
    }

    onLanduseUndrawed(_landuseId) {
        if (isLanduseDrawed(_landuseId)) return false;
        drawEvt.removeEventListener('UNDRAW_' + _landuseId, this, this.onLanduseUndrawed);
        this.destroyMeshes();
        this.drawedLanduses.push(_landuseId);
        this.landuses
        .filter(landuse => this.drawedLanduses.includes(landuse.id))
        .forEach(landuse => {
            this.buildGeometry(landuse);
        });
        this.mergeMeshes();
        
    }

    triangulate(_preparedDatas) {
        let nbPoints = 0;
        const border = _preparedDatas.borders.map((p, i) => new poly2tri.Point(p[0], p[1], i + nbPoints));
        const swctx = new poly2tri.SweepContext(border);
        nbPoints += _preparedDatas.borders.length;

        _preparedDatas.holes.forEach(hole => {
            const swcHole = hole.map((p, i) => new poly2tri.Point(p[0], p[1], i + nbPoints));
            swctx.addHole(swcHole);
            nbPoints += hole.length;
        });
        
        _preparedDatas.fill.forEach((point, i) => {
            swctx.addPoint(new poly2tri.Point(point[0], point[1], i + nbPoints));
        });
        nbPoints += _preparedDatas.fill.length;
        
        swctx.triangulate();
        return swctx.getTriangles();
    }

	buildGeometry(_landuse) {
        setLanduseDrawed(_landuse.id);
        if (!this.drawedLanduses.includes(_landuse.id)) this.drawedLanduses.push(_landuse.id);
        let prepared = this.preparePoints(_landuse);
        prepared = this.getElevations(prepared);
        const trianglesResult = this.triangulate(prepared);
        let meterBetweenLayers = 1.5;
        let uvFactor = 1;
        let materialNb = 4;
        let nbLayers = 16;
        if (prepared.type == 'forest') {
            meterBetweenLayers = 1;
            uvFactor = 3;
        }
        if (prepared.type == 'grass') {
            meterBetweenLayers = 0.4;
            uvFactor = 2;
            materialNb = 2;
            nbLayers = 8;
        }
        if (prepared.type == 'scrub') {
            meterBetweenLayers = 1;
            uvFactor = 1;
            materialNb = 2;
            nbLayers = 8;
        }
        if (prepared.type == 'vineyard') {
            meterBetweenLayers = 0.4;
            uvFactor = 32;
            materialNb = 4;
            nbLayers = 12;
        }

        const groundOffset = 0;
        // const groundOffset = 10;
        // materialNb = 1;
        // nbLayers = 1;

        const mapByLayer = nbLayers / materialNb;

        for (let layer = 0; layer < nbLayers; layer ++) {
            const curLayerMap = Math.floor(layer / mapByLayer);
            var geometry = new THREE.Geometry();
            const uvDatas = [];
            geometry.faceVertexUvs[0] = [];
            prepared.borders.forEach((point, i) => {
                const vertPos = GLOBE.coordToXYZ(
                    point[0], 
                    point[1], 
                    groundOffset + prepared.elevationsBorder[i] + layer * meterBetweenLayers
                );
                geometry.vertices.push(vertPos);
                const uvX = mapValue(point[0], this.tile.startCoord.x, this.tile.endCoord.x);
                const uvY = mapValue(point[1], this.tile.endCoord.y, this.tile.startCoord.y);
                uvDatas.push(new THREE.Vector2(uvX * uvFactor, uvY * uvFactor));
            });

            prepared.holes.forEach((hole, h) => {
                hole.forEach((point, i) => {
                    const vertPos = GLOBE.coordToXYZ(
                        point[0], 
                        point[1], 
                        groundOffset + prepared.elevationsHoles[h][i] + layer * meterBetweenLayers
                    );
                    geometry.vertices.push(vertPos);
                    const uvX = mapValue(point[0], this.tile.startCoord.x, this.tile.endCoord.x);
                    const uvY = mapValue(point[1], this.tile.endCoord.y, this.tile.startCoord.y);
                    uvDatas.push(new THREE.Vector2(uvX * uvFactor, uvY * uvFactor));
                });
            });
            
            prepared.fill.forEach((point, i) => {
                const vertPos = GLOBE.coordToXYZ(
                    point[0], 
                    point[1], 
                    groundOffset + prepared.elevationsFill[i] + layer * meterBetweenLayers
                );
                geometry.vertices.push(vertPos);
                const uvX = mapValue(point[0], this.tile.startCoord.x, this.tile.endCoord.x);
                const uvY = mapValue(point[1], this.tile.endCoord.y, this.tile.startCoord.y);
                uvDatas.push(new THREE.Vector2(uvX * uvFactor, uvY * uvFactor));
            });
            
            trianglesResult.forEach(t => {
                const points = t.getPoints();
                geometry.faceVertexUvs[0].push([
                    uvDatas[points[0].id], 
                    uvDatas[points[1].id], 
                    uvDatas[points[2].id], 
                ]);
                geometry.faces.push(new THREE.Face3(points[0].id, points[1].id, points[2].id));
            });
            if (!this.geometrysByType[_landuse.props.type]) {
                this.geometrysByType[_landuse.props.type] = [];
                for (let l = 0; l < materialNb; l ++) {
                    this.geometrysByType[_landuse.props.type].push([]);
                }
            }
            this.geometrysByType[_landuse.props.type][curLayerMap].push(geometry);
        }
    }

    preparePoints(_landuse) {
        // const coordsFill = this.calcFillPoints(_landuse.coords);
        return {
            type : _landuse.props.type, 
            borders : _landuse.coords, 
            holes : _landuse.holes, 
            // fill : coordsFill, 
            fill : [], 
        }
    }

    calcFillPoints(_coordsBorders) {
        const bbox = {
            minLon : 9999, 
            minLat : 9999, 
            maxLon : -9999, 
            maxLat : -9999, 
        };
        _coordsBorders.forEach(point => {
            bbox.minLon = Math.min(bbox.minLon, point[0]);
            bbox.minLat = Math.min(bbox.minLat, point[1]);
            bbox.maxLon = Math.max(bbox.maxLon, point[0]);
            bbox.maxLat = Math.max(bbox.maxLat, point[1]);
        });
        const stepLon = Math.abs(this.tile.startCoord.x - this.tile.endCoord.x) / GLOBE.tilesDefinition;
        const bboxWidth = bbox.maxLon - bbox.minLon;
        const bboxHeight = bbox.maxLat - bbox.minLat;
        const nbCols = Math.floor(bboxWidth / stepLon) + 1;
        const nbRows = Math.floor(bboxHeight / stepLon) + 1;
        const gridPoints = [];
        for (let x = 0; x < nbCols; x ++) {
            for (let y = 0; y < nbRows; y ++) {
                gridPoints.push([
                    bbox.minLon + (x * stepLon), 
                    bbox.minLat + (y * stepLon), 
                ]);
            }
        }
        const coordsFill = gridPoints.filter(point => pointIntoPolygon(point, _coordsBorders));
        return coordsFill;
    }

    getElevations(_preparedDatas) {
        const elevationsBorder = _preparedDatas.borders.map(point => {
            return ElevationStore.get(point[0], point[1]);
        });
        const elevationsHoles = _preparedDatas.holes.map(hole => {
            return hole.map(point => {
                return ElevationStore.get(point[0], point[1]);
            })
        });
        const elevationsFill = _preparedDatas.fill.map(point => {
            return ElevationStore.get(point[0], point[1]);
        });
        _preparedDatas.elevationsBorder = elevationsBorder;
        _preparedDatas.elevationsHoles = elevationsHoles;
        _preparedDatas.elevationsFill = elevationsFill;
        return _preparedDatas;
    }

    mergeMeshes() {
        Object.keys(this.geometrysByType).forEach(type => {
            let textureType = type;
            if (textureType == 'wood') textureType = 'forest';
            this.geometrysByType[type].forEach((layerMap, l) => {
                const typeGeometry = new THREE.Geometry();
                if (!materials[textureType][l]) return;
                layerMap.forEach(geometry => {
                    typeGeometry.merge(geometry);
                    geometry.dispose();
                });
                const mesh = new THREE.Mesh(typeGeometry, materials[textureType][l]);
                GLOBE.addMeshe(mesh);
                mesh.receiveShadow = true;
                this.meshLanduses.push(mesh);
            });
        })
        this.geometrysByType = {};
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		LanduseLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }

    destroyMeshes() {
        this.meshLanduses.forEach(mesh => {
            GLOBE.removeMeshe(mesh);
			mesh.material.dispose();
            mesh.geometry.dispose();
        });
        this.meshLanduses = [];
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        if (!this.isActive) return false;
        this.hide();
        this.destroyMeshes();
        this.drawedLanduses.forEach(id => {
            unsetLanduseDrawed(id);
            drawEvt.fireEvent('UNDRAW_' + id, id);
        });
        this.drawedLanduses = [];
        this.listenLanduses.forEach(id => {
            drawEvt.removeEventListener('UNDRAW_' + id, this, this.onLanduseUndrawed);
        })
        this.landuses = null;
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}

function pointIntoPolygon(point, vs) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

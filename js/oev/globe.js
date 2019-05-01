import Evt from './event.js';
import DatasMng from './datasMng.js';
import * as DataLoader from './dataLoader.js';
import * as TileExtension from './tileExtensions/tileExtension.js';
import SKY from './sky.js';
import * as TILE from './tile.js';
import * as GEO from './geo.js';
import MATH from './math.js';
import * as NET_TEXTURES from './net/NetTextures.js';
import ElevationDatas from './globeElevation.js';

let curLodOrigine = new THREE.Vector3(0, 0, 0);
let curTile = new THREE.Vector2(0, 0, 0);
let coastDatas = null;
const coastPxlRatio = 2048 / (20037508 * 2);
const eleFactor = 1;

const api = {
	evt : null, 
	tilesBase : [], 
	CUR_ZOOM : 14, 
	LOD_PLANET : 0, 
	LOD_CITY : 10, 
	LOD_STREET : 19, 
	curLOD : 0, 
	tilesDetailsMarge : 2, 
	loaderTile2D : null, 
	loaderEle : null, 
	coordDetails : new THREE.Vector2( 0, 0 ), 
	tileExtensions : {}, 
	radius : 10000, 
	meter : 1, 
	eleActiv : false, 
	loadLanduse : false, 
	loadNodes : false, 
	tilesProvider : "tileOsm", 
	globalScale : 1, 
	providersLoadManager : null, 
	nodesLoadManager : null, 
	tilesBuildingsMng : null,
	tilesWeatherMng : null,
	tilesLandusesMng : null,
	vineyardMat : undefined, 
	forestMat : undefined, 
	loaderBuilding : null, 
	loaderNormal : null, 
	loaderPlane : null, 
	meshe : null, 
	tilesDefinition : 16, 
	grassMat : undefined, 
	modelsMesheMat : {
		"TREE":new THREE.MeshPhongMaterial({color: 0xa0a0a0, shininess: 0}), 
		"LAMP":new THREE.MeshLambertMaterial({color: 0x103c4f }), 
		"HYDRANT":new THREE.MeshLambertMaterial({color: 0x9f0101 }), 
		"CAPITELLE":new THREE.MeshLambertMaterial({color: 0xFF0000 }), 
		"default" : new THREE.MeshLambertMaterial({color: 0xFF0000 }), 
		"fountain" : new THREE.MeshLambertMaterial({color: 0xefeed9 }), 
		"statue" : new THREE.MeshLambertMaterial({color: 0xefeed9 }), 
		"poubelle" : new THREE.MeshLambertMaterial({color: 0x9fc091 }), 
		'recycling' : new THREE.MeshLambertMaterial({color: 0x546e10 }), 
		'pylone' : new THREE.MeshPhongMaterial({color: 0x909090, transparent:true})
	}, 
	
	init : function() {
		api.evt = new Evt();
		api.meshe = new THREE.Mesh(new THREE.Geometry());
		// api.providersLoadManager = new DatasMng("OBJECTS");
		// api.nodesLoadManager = new DatasMng('NODES');
		api.coordToXYZ = api.coordToXYZPlane;
		api.meter = api.radius / 40075017.0;
		DataLoader.Params.Elevation.definition = api.tilesDefinition;
		api.loaderTile2D = new DataLoader.Proxy('TILE2D');
		
		api.loaderEle = new DataLoader.Proxy('ELE');
		api.loaderBuilding = new DataLoader.Proxy('BUILDINGS');
		api.loaderNormal = new DataLoader.Proxy('NORMAL');
		api.loaderPlane = new DataLoader.Proxy('PLANE');
		api.loaderOverpassCache = new DataLoader.Proxy('OVERPASS_CACHE');
		
		// api.tileExtensions['NORMAL'] = Oev.Tile.Extension.Normal;
		// api.tileExtensions['PLANE'] = Oev.Tile.Extension.Planes;
		api.tileExtensions['ELEVATION'] = TileExtension.Elevation;
		// api.tileExtensions['OVERPASS'] = Oev.Tile.Extension.Overpass;
		// api.tileExtensions['LANDUSE'] = Oev.Tile.Extension.Landuse;
		api.tileExtensions['BUILDING'] = TileExtension.BuildingExtension;
		// api.tileExtensions['LIFE'] = Oev.Tile.Extension.Life;
		// api.tileExtensions['DUMMY'] = Oev.Tile.Extension.Dummy;
		
		api.setProjection( "PLANE" );
		api.tilesBuildingsMng = new DatasMng( "BUILDINGS" );
		api.tilesWeatherMng = new DatasMng( "WEATHER" );
		api.tilesLandusesMng = new DatasMng( "SURFACE" );
		api.buildingsWallMatBuffer = new THREE.MeshPhongMaterial({shininess: 0, color: 0xeeeeee, side: THREE.DoubleSide, vertexColors: THREE.FaceColors});
		api.buildingsWallMat = new THREE.MeshPhongMaterial({shininess: 0, color: 0xa0a0a0, side: THREE.DoubleSide, vertexColors: THREE.FaceColors});
		api.buildingsRoofMat = new THREE.MeshPhongMaterial({shininess: 0, color: 0xCCCCCC, side: THREE.DoubleSide, vertexColors: THREE.VertexColors });
		api.testForestMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xA0A0A0, side: THREE.DoubleSide});
		api.testForestMat.alphaTest = 0.1;
		api.landuseSpritesMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xffffff, side: THREE.DoubleSide});
		api.landuseSpritesMat.alphaTest = 0.1;
		api.testScrubMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xA0A0A0, side: THREE.DoubleSide});
		api.testScrubMat.alphaTest = 0.1;
		api.testVineyardMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xA0A0A0, side: THREE.DoubleSide});
		api.testVineyardMat.alphaTest = 0.1;
		api.forestMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: api.meter * 2000});
		api.forestMat.alphaTest = 0.4;
		api.forestMat.transparent = true;
		api.vineyardMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: api.meter * 1000});
		api.vineyardMat.alphaTest = 0.4;
		api.vineyardMat.transparent = true;
		// api.grassMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: api.meter * 2000});
		api.grassMat = new THREE.MeshLambertMaterial({transparent: true, color: 0xe0e0e0, side: THREE.DoubleSide});
		api.grassMat.alphaTest = 0.9;
		// api.grassMat.opacity = 0.99;
		OEV.evt.addEventListener('APP_START', api, api.onAppStart);
	}, 
	
	onAppStart : function() {
		api.modelsMesheMat['pylone'].map = NET_TEXTURES.texture('pylone');
		api.modelsMesheMat['pylone'].needsUpdate = true;
		// api.modelsMesheMat['TREE'].map = NET_TEXTURES.texture('tree_procedural');
		api.modelsMesheMat['TREE'].map = NET_TEXTURES.texture('tree_top');
		api.modelsMesheMat['TREE'].alphaTest = 0.9;
		api.modelsMesheMat['TREE'].side = THREE.DoubleSide;
		api.modelsMesheMat['TREE'].needsUpdate = true;
		api.testForestMat.map = NET_TEXTURES.texture('tree_side');
		api.testForestMat.needsUpdate = true;
		api.landuseSpritesMat.map = NET_TEXTURES.texture('landuse_sprites');
		api.landuseSpritesMat.needsUpdate = true;
		api.testScrubMat.map = NET_TEXTURES.texture('scrub');
		api.testScrubMat.needsUpdate = true;
		api.testVineyardMat.map = NET_TEXTURES.texture('vineyard');
		api.testVineyardMat.needsUpdate = true;
		api.forestMat.map = NET_TEXTURES.texture('scrub');
		api.forestMat.needsUpdate = true;
		api.vineyardMat.map = NET_TEXTURES.texture('vineyard');
		api.vineyardMat.needsUpdate = true;
		api.grassMat.map = NET_TEXTURES.texture('grass');
		api.grassMat.needsUpdate = true;
		loadCoastline();
		api.construct();
	}, 
	
	construct : function() {
		const zoomBase = 4;
		const nbTiles = Math.pow(2, zoomBase);
		for (let curTileY = 0; curTileY < nbTiles + 1; curTileY ++) {
			if (curTileY > 0) {
				for (let curTileX = 0; curTileX < nbTiles + 1; curTileX ++) {
					if (curTileX > 0) {
						const tile = new TILE.Basic(curTileX - 1, curTileY - 1, zoomBase);
						api.tilesBase.push(tile);
						tile.buildGeometry();
					}
				}
			}
		}
		api.matWayPoints = new THREE.SpriteMaterial({map:NET_TEXTURES.texture('waypoint'), color:0xffffff, fog:false});
	}, 

	isCoordOnGround : function(_lon, _lat, _marge = 0) {
		if (coastDatas === null) return false;
		const mercX = GEO.mercatorLonToX(_lon);
		const mercY = GEO.mercatorLatToY(_lat);
		const pxlX = Math.round(mercX * coastPxlRatio) + 1024;
		const pxlY = Math.round(mercY * coastPxlRatio) + 1024;
		pxlY = Math.abs(2048 - pxlY);
		let bufferIndex;
		for (let i = 0; i < _marge * 2; i ++) {
			for (let j = 0; j < _marge * 2; j ++) {
				bufferIndex = ((pxlX - _marge + i) * 2048 + (pxlY - _marge + j));
				if (coastDatas[bufferIndex] == 1) {
					return 1;
				}
			}
		}
		bufferIndex = (pxlX * 2048 + pxlY);
		return coastDatas[bufferIndex];
	}, 

	_onCoastLineLoaded : function(_img) {
		const imgW = 2048;
		const imgH = 2048;
		const canvas = document.createElement('canvas');
		canvas.width = imgW;
		canvas.height = imgH;
		const context = canvas.getContext('2d');
		context.drawImage(_img, 0, 0, imgW, imgH);
		const img = context.getImageData(0, 0, imgW, imgH); 
		const imageData = context.getImageData(0, 0, imgW, imgH);
		const data = imageData.data;
		coastDatas = new Int8Array(data.length / 4);
		let x, y;
		let index;
		let red;
		let isGround;
		let bufferIndex = 0;
		for (x = 0; x < imgW; ++x) {
			for (y = 0; y < imgH; ++y) {
				index = (y * imgW + x) * 4;
				red = data[index];
				isGround = 0;
				if (red > 0) {
					isGround = 1;
				}
				coastDatas[bufferIndex] = isGround;
				bufferIndex ++;
			}
		}
		console.log('Coastline parsed');
	}, 

	addMeshe : function(_meshe) {
		api.meshe.add(_meshe);
	}, 

	removeMeshe : function(_meshe) {
		api.meshe.remove(_meshe);
	}, 

	updateTilesModelProvider : function( _added, _name ) {
		api.tilesBase.forEach(t => t.updateDatasProviders(_added, _name));
	}, 

	setTilesProvider : function( _provider ) {
		if (api.tilesProvider != _provider) {
			api.loaderTile2D.clear();
			api.tilesBase.forEach(t => t.reloadTexture());
		}
		api.tilesProvider = _provider;
	}, 

	activLanduse : function(_state) {
		if (_state && !api.loadLanduse) {
			api.loadLanduse = true;
		}else if( !_state && api.loadLanduse ){
			api.loadLanduse = false;
		}
		api.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
	}, 

	activNodes : function( _state ) {
		if (_state && !api.loadNodes) {
			api.loadNodes = true;
		}else if( !_state && api.loadNodes ){
			api.loadNodes = false;
		}
		api.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
	}, 

	activElevation : function( _state ) {
		if (_state && !api.eleActiv) {
			api.eleActiv = true;
		} else if (!_state && api.eleActiv) {
			api.eleActiv = false;
		}
		api.evt.fireEvent( "DATAS_TO_LOAD_CHANGED" );
	}, 

	update : function() {
		
	},  

	updateLOD : function() {
		api.tilesBase.forEach(t => t.updateVertex());
		OEV.waypoints.forEach(w => w.updatePos());
	}, 

	updateZoom : function(_value){
		if (api.CUR_ZOOM == _value) return false;
		api.CUR_ZOOM = _value;
		api.checkLOD();
	}, 

	switchProjection : function(){
		if (api.projection == "SPHERE") {
			api.setProjection("PLANE");
		} else if (api.projection == "PLANE") {
			api.setProjection( "SPHERE" );
		}
	}, 

	setProjection : function(_mode) {
		console.log('setProjection', _mode);
		if (_mode == "PLANE") {
			SKY.activSky(true);
			api.coordToXYZ = api.coordToXYZPlane;
			OEV.camera.up.set(0, 0, 1);
		} else if (_mode == "SPHERE") {
			SKY.activSky(false);
			api.coordToXYZ = api.coordToXYZSphere;
			OEV.camera.up.set(0, 1, 0);
		}
		api.projection = _mode;
		api.tilesBase.forEach(t => t.updateVertex());
	}, 

	coordToXYZPlane : function(_lon, _lat, _elevation) {
		const pos = new THREE.Vector3(0, 0, 0);
		pos.x = api.radius * (_lon / 60);
		pos.y = api.posFromAltitude(_elevation);
		const tmpZ = Math.log(Math.tan((90 + _lat) * Math.PI / 360.0)) / (Math.PI / 180.0);
		pos.z = (tmpZ * (2 * Math.PI * api.radius / 2.0) / 180.0);
		pos.x *= api.globalScale;
		pos.y *= 10;
		pos.z *= api.globalScale;
		pos.x -= curLodOrigine.x;
		pos.z -= curLodOrigine.z;
		return pos;
	}, 

	coordToXYZSphere : function(lon, lat, _elevation) {
		_elevation *= api.meter;
		_elevation += api.radius;
		const pos = new THREE.Vector3(0, 0, 0);
		const radY = MATH.radians((lon - 180) * -1);
		const radX = MATH.radians(lat * -1);
		// console.log('coordToXYZSphere', MATH.radians(lat * -1), MATH.radians((lon - 180) * -1));
		pos.x = Math.cos(radY) * ((_elevation) * Math.cos(radX));
		pos.y = Math.sin(radX) * _elevation * -1;
		pos.z = Math.sin(radY) * (_elevation * Math.cos(radX));
		if (api.curLOD == api.LOD_CITY) {
			pos.x -= curLodOrigine.x;
			pos.y -= curLodOrigine.y;
			pos.z -= curLodOrigine.z;
			pos.x *= api.globalScale;
			pos.y *= api.globalScale;
			pos.z *= api.globalScale;
		}
		return pos;
	}, 

	posFromAltitude : function(_altitude) {
		return 0 - (_altitude * (api.meter * eleFactor));
	}, 

	altitudeFromPos : function(_pos) {
		return ((_pos / api.globalScale) / (api.meter * eleFactor)) * -1;
	}, 

	coordFromPos : function( _x, _y ) {
		const pxlStart = api.coordToXYZ( -180, 85.0511, 0 );
		const pxlEnd = api.coordToXYZ( 180, -85.0511, 0 );
		const pxlWidth = Math.abs( pxlEnd.x - pxlStart.x );
		const pxlHeight = Math.abs( pxlEnd.z - pxlStart.z ) / 2;
		const prctW = ( _x - pxlStart.x ) / pxlWidth;
		const prctH = ( ( _y - pxlEnd.z ) / pxlHeight ) - 1;
		const coordX = -180 + ( prctW * 360 );
		let coordY = ( prctH * 180 );
		coordY = 180 / Math.PI * (2 * Math.atan( Math.exp( coordY * Math.PI / 180.0)) - Math.PI / 2.0);
		const ele = api.getElevationAtCoords(coordX, coordY, true);
		return new THREE.Vector3( coordX, coordY, ele );
	}, 

	checkLOD : function(){
		if (api.CUR_ZOOM >= api.LOD_STREET) {
			if (api.curLOD != api.LOD_STREET) {
				console.log("SET TO LOD_STREET");
				api.globalScale = 100;
				api._updateMeter();
				curLodOrigine = api.coordToXYZ(api.coordDetails.x, api.coordDetails.y, 0);
				console.log('curLodOrigine', curLodOrigine);
				api.curLOD = api.LOD_STREET;
				api.updateLOD();
				api.setProjection("PLANE");
				OEV.camera.far = api.radius * api.globalScale;
				OEV.camera.near = (api.radius * api.globalScale) / 10000000;
				OEV.camera.updateProjectionMatrix();
				SKY.initSunPos();
				if (OEV.scene.fog) {
					OEV.scene.fog.near = api.radius * (0.01 * api.globalScale);
					OEV.scene.fog.far = api.radius * (0.9 * api.globalScale);
				}
				SKY.updateCloudsPos();
				api.evt.fireEvent("LOD_CHANGED");
			}
		} else if (api.CUR_ZOOM >= api.LOD_CITY) {
			if (api.curLOD != api.LOD_CITY) {
				console.log("SET TO LOD_CITY");
				api.globalScale = 10;
				api._updateMeter();
				curLodOrigine = api.coordToXYZ(api.coordDetails.x, api.coordDetails.y, 0);
				api.curLOD = api.LOD_CITY;
				api.updateLOD();
				api.setProjection("PLANE");
				OEV.camera.far = api.radius * api.globalScale;
				OEV.camera.near = (api.radius * api.globalScale ) / 1000000;
				OEV.camera.updateProjectionMatrix();
				SKY.initSunPos();
				if (OEV.scene.fog) {
					OEV.scene.fog.near = api.radius * ( 0.01 * api.globalScale );
					OEV.scene.fog.far = api.radius * ( 0.9 * api.globalScale );
				}
				SKY.updateCloudsPos();
				api.evt.fireEvent( "LOD_CHANGED" );
			}
		} else if (api.CUR_ZOOM >= api.LOD_PLANET) {
			if (api.curLOD != api.LOD_PLANET) {
				console.log("SET TO LOD_PLANET");
				curLodOrigine = new THREE.Vector3( 0, 0, 0 );
				api.globalScale = 1;
				api._updateMeter();
				api.curLOD = api.LOD_PLANET;
				api.setProjection("SPHERE");
				api.updateLOD();
				OEV.camera.far = (api.radius * 2 ) * api.globalScale;
				OEV.camera.near = (api.radius * api.globalScale) / 1000000;
				OEV.camera.updateProjectionMatrix();
				SKY.initSunPos();
				if (OEV.scene.fog) {
					OEV.scene.fog.near = api.radius * (0.01 * api.globalScale);
					OEV.scene.fog.far = api.radius * (0.9 * api.globalScale);
				}
				SKY.updateCloudsPos();
				api.evt.fireEvent("LOD_CHANGED");
			}
		}
	}, 
	
	_updateMeter : function() {
		api.meter = (api.radius / 40075017.0) * api.globalScale;
	}, 

	getElevationAtCoords : function(_lon, _lat, _inMeters = false) {
		let ele = ElevationDatas.get(_lon, _lat) || 0;
		if (!_inMeters) ele *= (api.meter * eleFactor);
		return ele;
	}, 
	
	getCurTile : function() {
		return api.tilesBase.map(t => {
			return t.getCurTile(api.coordDetails)
		}).filter(res => res).pop();
	}, 
	
	onCurTileChange : function(_newTile){
		TILE.setMinMax(999999999, 999999999, -999999999, -999999999);
		curTile = _newTile;
		api.tilesBase.forEach(t => t.updateDetails(api.coordDetails));
		api.evt.fireEvent('CURTILE_CHANGED', curTile);
	}, 

	updateCurTile : function(_coordX, _coordY) {
		api.coordDetails.x = _coordX;
		api.coordDetails.y = _coordY;
		const newTile = GEO.coordsToTile(api.coordDetails.x, api.coordDetails.y, api.CUR_ZOOM);
		if (newTile.x != curTile.x || newTile.y != curTile.y || newTile.z != curTile.z) {
			api.onCurTileChange(newTile);
		}
		curTile = newTile;
	}, 

	zoomFromAltitude : function( _altitude ) { // _altitude : meters units
		return GEO.zoomFromAltitude(_altitude, api.radius, api.globalScale);
	}, 

	zoomFromAltitudeTest : function( _altitude ) { // _altitude : meters units
		const nbTilesToDraw = 4;
		const tileMeterWidth = _altitude / nbTilesToDraw;
		let z = 1;
		let meterByPixel = 78 * 256;
		while( meterByPixel > tileMeterWidth ){
			z ++;
			meterByPixel /= 2;
		}
		return Math.min( Math.max( z + 6 ), 19 );
	}, 

	altitude : function( _zoomlevel ) { // return altitude in opengl unit
		return GEO.getAltitude(_zoomlevel, api.radius);
	}, 
};

function loadCoastline() {
	const imgCoast = new Image();
	imgCoast.onload = function() {
		api._onCoastLineLoaded(this);
	};
	imgCoast.src = 'libs/remoteImg.php?coastLine';
}

export { api as default}

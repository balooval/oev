/*
https://opensky-network.org/api/states/all

{"time":1488456240,"states":

[
	[
		"4066ba", // icao24
		"", // callsign
		"United Kingdom", // origin_country 	
		1488456232, // time_position
		1488456232, // time_velocity
		-0.8793, // longitude
		51.6229, // latitude
		9441.18, // altitude
		false, // on_ground
		229.44, // velocity
		143.39, // heading
		0, // vertical_rate
		null // sensors
	]
*/

'use strict';

Oev.Tile.Extension.PlanesWatcher = (function() {
	var timeoutId = -1;
	var updateDelay = 10000;
	var loaderPlane = null;
	var planesStates = null;
	var planesPartitions = [];
	var partsUpdates = [];
	var planesPartitionIndex = {};
	var partsWhoHadSomePlane = {};
	
	var test = [];
	test.push([
		[
			'toto', 
			0, 
			0, 
			0, 
			0, 
			1.5, 
			45.5, 
			0, 
			0, 
			0, 
			0
		]
	]);
	test.push([
		[
			'toto', 
			0, 
			0, 
			0, 
			0, 
			2.5, 
			45.5, 
			0, 
			0, 
			0, 
			0
		], 
		[
			'bibi', 
			0, 
			0, 
			0, 
			0, 
			4.5, 
			45.5, 
			0, 
			0, 
			0, 
			0
		]
	]);
	test.push([
		[
			'toto', 
			0, 
			0, 
			0, 
			0, 
			2.5, 
			45.5, 
			0, 
			0, 
			0, 
			0
		], 
		[
			'bibi', 
			0, 
			0, 
			0, 
			0, 
			4.5, 
			45.5,
			0, 
			0, 
			0, 
			0
		]
	]);
	
	var api = {
		evt : new Oev.Utils.Evt(), 
		
		stateInfosIndex : {
			id : 0, 
			timePosition : 3, 
			timeVelocity : 4, 
			lon : 5, 
			lat : 6, 
			altitude : 7, 
			onGround : 8, 
			velocity : 9, 
			heading : 10, 
		}, 
		
		test : function() {
			if (test.length == 0) {
				console.warn('no more data to test');
				return false;
			}
			planesStates = test.shift();
			sortStates();
		}, 
		
		_init : function() {
			console.warn('PlanesWatcher._init');
			// api.evt = new Oev.Utils.Evt();
			// buildPlanesPartition();
			loaderPlane = OEV.earth.loaderPlane;
			api.updatePlanes();
		}, 
		
		updatePlanes : function() {
			console.log('updatePlanes');
			loaderPlane.clear();
			loaderPlane.getData(
				{
					z : 8, 
					x : 8, 
					y : 8, 
					priority : 0
				}, 
				function(_states) {
					api.onPlanesLoaded(_states);
				}
			);
		}, 
		
		onPlanesLoaded : function(_states) {
			console.log('onPlanesLoaded');
			planesStates = _states;
			sortStates();
			timeoutId = setTimeout(api.updatePlanes, updateDelay);
		}, 
		
		getPlanesListAtCoord : function(_lon, _lat) {
			var index = api.getPartIndexFromCoord(_lon, _lat);
			return planesPartitions[index.i][index.j];
		}, 
		
		getPartIndexFromCoord : function(_lon, _lat) {
			var lonIndex = Math.floor(_lon) + 180;
			var latIndex = Math.floor(_lat) + 90;
			return {i:lonIndex, j:latIndex};
		}, 
		
	};
	
	function sortStates() {
		var i;
		partsUpdates = [];
		for (var concatIndex in partsWhoHadSomePlane) {
			partsWhoHadSomePlane[concatIndex] = false;
		}
		var len = planesStates.length;
		// len = Math.min(10, len);
		for (i = 0; i < len; i ++) {
			calcPlanePart(planesStates[i]);
		}
		clearVoidParts();
		// checkPartsBecomedVoid();
		fireEvents();
		// console.log('partsUpdates', partsUpdates);
	}
	
	function fireEvents() {
		for (var i = 0; i < partsUpdates.length; i ++) {
			var tmp = partsUpdates[i].split('_');
			tmp[0] -= 180;
			tmp[1] -= 90;
			// console.log('fireEvent', 'PLANE_NEW_' + partsUpdates[i], tmp);
			api.evt.fireEvent('PLANE_NEW_' + partsUpdates[i]);
		}
		checkPartsBecomedVoid();
	}
	
	function checkPartsBecomedVoid() {
		for (var concatIndex in partsWhoHadSomePlane) {
			if (partsWhoHadSomePlane[concatIndex] === false) {
				// console.log('fireEvent', 'PLANE_VOID_' + concatIndex);
				api.evt.fireEvent('PLANE_VOID_' + concatIndex);
				delete partsWhoHadSomePlane[concatIndex];
			} else {
				api.evt.fireEvent('PLANE_POS_UPDATE_' + concatIndex);
			}
		}
	}
	
	function calcPlanePart(_plane) {
		var index = api.getPartIndexFromCoord(_plane[api.stateInfosIndex.lon], _plane[api.stateInfosIndex.lat]);
		var concatIndex = index.i + '_' + index.j;
		var curPlaneId = _plane[api.stateInfosIndex.id];
		if (planesPartitionIndex[curPlaneId] === undefined) { // new plane
			// console.log('Plane', curPlaneId, 'is NEW', 'into', concatIndex);
			partitionHasNewPlane(concatIndex);
		} else if (planesPartitionIndex[curPlaneId] != concatIndex) { // knowed plane but changes index
			// console.log('Plane', curPlaneId, 'changed index : from', planesPartitionIndex[curPlaneId], 'to', concatIndex);
			partitionHasNewPlane(concatIndex);
			planesPartitionIndex[curPlaneId] = undefined;
		}
		// console.log('concatIndex', concatIndex);
		partsWhoHadSomePlane[concatIndex] = true;
		planesPartitionIndex[curPlaneId] = concatIndex;
		planesPartitions[index.i][index.j].push(_plane);
	}
	
	function clearVoidParts() {
		for (var concatIndex in partsWhoHadSomePlane) {
			if (partsWhoHadSomePlane[concatIndex] === true) {
				return false;
			}
			var index = concatIndex.split('_');
			planesPartitions[index[0]][index[1]] = [];
		}
	}
	
	function partitionHasNewPlane(_partIndex) {
		if (partsUpdates.indexOf(_partIndex) >= 0) {
			return false;
		}
		partsUpdates.push(_partIndex);
	}
	
	function buildPlanesPartition() {
		var latCell;
		for (var lon = -180; lon < 180; lon ++) {
			latCell = [];
			for (var lat = -90; lat < 90; lat ++) {
				latCell.push([]);
			}
			planesPartitions.push(latCell);
		}
	}
	
	OEV.evt.addEventListener('APP_START', api, api._init);
	buildPlanesPartition();
	
	return api;
})();

Oev.Tile.Extension.Planes = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	var loaderPlane = OEV.earth.loaderPlane;
	var myTileIndex;
	var mesh = null;
	
	var meshes = {};
	
	ext.loadDatas = function() {
		if (this.tile.zoom == 8) {
			// console.log('Ok Plane load', this.tile.startCoord.x, this.tile.startCoord.y);
			myTileIndex = Oev.Tile.Extension.PlanesWatcher.getPartIndexFromCoord(this.tile.startCoord.x, this.tile.startCoord.y);
			myTileIndex = myTileIndex.i + '_' + myTileIndex.j;
			Oev.Tile.Extension.PlanesWatcher.evt.addEventListener('PLANE_NEW_' + myTileIndex, ext, ext.onPlaneAdded);
			Oev.Tile.Extension.PlanesWatcher.evt.addEventListener('PLANE_VOID_' + myTileIndex, ext, ext.onPlaneVoid);
			Oev.Tile.Extension.PlanesWatcher.evt.addEventListener('PLANE_POS_UPDATE_' + myTileIndex, ext, ext.onPlaneUpdatePos);
			// console.log('addEventListener', 'PLANE_NEW_' + myTileIndex);
			// console.log('addEventListener', 'PLANE_VOID_' + myTileIndex);
			
			mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshPhongMaterial({color:0xff0000}));
			var pos = OEV.earth.coordToXYZ(this.tile.middleCoord.x, this.tile.middleCoord.y, 100);
			mesh.position.x = pos.x;
			mesh.position.y = pos.y;
			mesh.position.z = pos.z;
		}
	}
	
	ext.onPlaneAdded = function() {
		
	}
	
	ext.onPlaneUpdatePos = function() {
		console.log('Oev.Tile.Extension.Planes.onPlaneUpdatePos', this.tile.startCoord.x, this.tile.startCoord.y);
		OEV.earth.addMeshe(mesh);
		var planeList = Oev.Tile.Extension.PlanesWatcher.getPlanesListAtCoord(this.tile.startCoord.x, this.tile.startCoord.y);
		console.log('planeList', planeList);
		var stateInfosIndex = Oev.Tile.Extension.PlanesWatcher.stateInfosIndex;
		var pos = OEV.earth.coordToXYZ(planeList[0][stateInfosIndex.lon], planeList[0][stateInfosIndex.lat], 600);
		mesh.position.x = pos.x;
		mesh.position.y = pos.y;
		mesh.position.z = pos.z;
		OEV.MUST_RENDER = true;
	}
	
	ext.onPlaneVoid = function() {
		console.log('Oev.Tile.Extension.Planes.onPlaneVoid', this.tile.startCoord.x, this.tile.startCoord.y);
		OEV.earth.removeMeshe(mesh);
		OEV.MUST_RENDER = true;
		
		for (var planeId in meshes) {
			OEV.earth.removeMeshe(meshes[planeId]);
		}
	}
	
	ext.dispose = function() {
		Oev.Tile.Extension.PlanesWatcher.evt.removeEventListener('PLANE_NEW_' + myTileIndex, ext, ext.onPlaneAdded);
		Oev.Tile.Extension.PlanesWatcher.evt.removeEventListener('PLANE_VOID_' + myTileIndex, ext, ext.onPlaneVoid);
		Oev.Tile.Extension.PlanesWatcher.evt.removeEventListener('PLANE_POS_UPDATE_' + myTileIndex, ext, ext.onPlaneUpdatePos);
		OEV.earth.removeMeshe(mesh);
	}
	
	
	
	ext.init(_tile);
	
	return ext;
}
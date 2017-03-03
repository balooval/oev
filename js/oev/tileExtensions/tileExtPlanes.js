'use strict';

Oev.Tile.Extension.PlanesWatcher = (function() {
	var timeoutId = -1;
	var updateDelay = 6000;
	var loaderPlane = null;
	var planesStates = null;
	var planesPartitions = [];
	var partsUpdates = [];
	var planesPartitionIndex = {};
	var partsWhoHadSomePlane = {};

	var api = {
		evt : new Oev.Utils.Evt(), 
		planeGeo : null, 
		
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
			verticalRate : 10, 
		}, 
		
		_init : function() {
			console.warn('PlanesWatcher._init');
			
			api.planeMat = new THREE.MeshLambertMaterial({ color: 0xD0D0E0 });
			api.planeGeo = OEV.modelsLib["plane"].geometry.clone();
			console.log('planeGeo', api.planeGeo);
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
	
	
	
	
	/*
	function sortStates() {
		var i;
		var key;
		var lastPlanesList = planesList.slice(0);
		planesList = {};
		var curPlane;
		var len = planesStates.length;
		for (i = 0; i < len; i ++) {
			curPlane = planesStates[i];
			var curPlaneId = curPlane[api.stateInfosIndex.id];
			var index = api.getPartIndexFromCoord(curPlane[api.stateInfosIndex.lon], curPlane[api.stateInfosIndex.lat]);
			var concatIndex = index.i + '_' + index.j;
			if (planesList[concatIndex] === undefined) {
				planesList[concatIndex] = [];
			}
			planesList[concatIndex].push(curPlane);
		}
		var indexVoid = [];
		for (key in lastPlanesList) {
			if (planesList[key] === undefined) {
				indexVoid.push(key);
			}
		}
		for (i = 0; i < indexVoid.length; i ++) {
			api.evt.fireEvent('PLANE_VOID_' + indexVoid[i]);
1		}
		for (key in planesList) {
			api.evt.fireEvent('PLANE_POS_UPDATE_' + key);
		}
	}
	*/
	
	
	function sortStates() {
		var i;
		buildPlanesPartition();
		partsUpdates = [];
		for (var concatIndex in partsWhoHadSomePlane) {
			partsWhoHadSomePlane[concatIndex] = false;
		}
		var len = planesStates.length;
		for (i = 0; i < len; i ++) {
			calcPlanePart(planesStates[i]);
		}
		fireEvents();
	}
	
	function fireEvents() {
		for (var i = 0; i < partsUpdates.length; i ++) {
			var tmp = partsUpdates[i].split('_');
			tmp[0] -= 180;
			tmp[1] -= 90;
			api.evt.fireEvent('PLANE_NEW_' + partsUpdates[i]);
		}
		checkPartsBecomedVoid();
	}
	
	function checkPartsBecomedVoid() {
		for (var concatIndex in partsWhoHadSomePlane) {
			if (partsWhoHadSomePlane[concatIndex] === false) {
				api.evt.fireEvent('PLANE_VOID_' + concatIndex);
				delete partsWhoHadSomePlane[concatIndex];
			} else {
				var tmp = concatIndex.split('_');
				api.evt.fireEvent('PLANE_POS_UPDATE_' + concatIndex, planesPartitions[tmp[0]][tmp[1]]);
			}
		}
	}
	
	function calcPlanePart(_plane) {
		var index = api.getPartIndexFromCoord(_plane[api.stateInfosIndex.lon], _plane[api.stateInfosIndex.lat]);
		var concatIndex = index.i + '_' + index.j;
		var curPlaneId = _plane[api.stateInfosIndex.id];
		if (planesPartitionIndex[curPlaneId] === undefined) { // new plane
			partitionHasNewPlane(concatIndex);
		} else if (planesPartitionIndex[curPlaneId] != concatIndex) { // knowed plane but changes index
			partitionHasNewPlane(concatIndex);
			planesPartitionIndex[curPlaneId] = undefined;
		}
		planesPartitions[index.i][index.j].push(_plane);
		partsWhoHadSomePlane[concatIndex] = true;
		planesPartitionIndex[curPlaneId] = concatIndex;
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
		planesPartitions = [];
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
	// var mesh = null;
	
	var planes = {};
	
	ext.loadDatas = function() {
		if (this.tile.zoom == 8) {
			myTileIndex = Oev.Tile.Extension.PlanesWatcher.getPartIndexFromCoord(this.tile.startCoord.x, this.tile.startCoord.y);
			myTileIndex = myTileIndex.i + '_' + myTileIndex.j;
			Oev.Tile.Extension.PlanesWatcher.evt.addEventListener('PLANE_VOID_' + myTileIndex, ext, ext.onPlaneVoid);
			Oev.Tile.Extension.PlanesWatcher.evt.addEventListener('PLANE_POS_UPDATE_' + myTileIndex, ext, ext.onPlaneUpdatePos);
		}
	}
	
	ext.onPlaneUpdatePos = function(_planes) {
		var stateInfosIndex = Oev.Tile.Extension.PlanesWatcher.stateInfosIndex;
		var existingPlanes = {};
		for (var planeId in planes) {
			existingPlanes[planeId] = planes[planeId];
		}
		planes = {};
		for (var i = 0; i < _planes.length; i ++) {
			var curPlaneId = _planes[i][stateInfosIndex.id];
			if (existingPlanes[curPlaneId] !== undefined) { // update
				planes[curPlaneId] = existingPlanes[curPlaneId];
			} else { // new
				var planeMesh = new THREE.Mesh(new THREE.Geometry().fromBufferGeometry(Oev.Tile.Extension.PlanesWatcher.planeGeo), Oev.Tile.Extension.PlanesWatcher.planeMat);
				planeMesh.scale.x = 1;
				planeMesh.scale.y = 1;
				planeMesh.scale.z = 1;
				planeMesh.rotation.x = Math.PI;
				planeMesh.rotation.y = Oev.Math.radians(_planes[i][stateInfosIndex.heading] - 0);
				planes[curPlaneId] = {
					mesh : planeMesh, 
				}
				OEV.earth.addMeshe(planes[curPlaneId].mesh);
			}
			var pos = OEV.earth.coordToXYZ(_planes[i][stateInfosIndex.lon], _planes[i][stateInfosIndex.lat], _planes[i][stateInfosIndex.altitude]);
			planes[curPlaneId].mesh.position.x = pos.x;
			planes[curPlaneId].mesh.position.y = pos.y;
			planes[curPlaneId].mesh.position.z = pos.z;
			planes[curPlaneId].mesh.rotation.y = Oev.Math.radians(_planes[i][stateInfosIndex.heading] + 90);
			existingPlanes[curPlaneId] = undefined;
			delete existingPlanes[curPlaneId];
		}
		for (var planeId in existingPlanes) {
			OEV.earth.removeMeshe(existingPlanes[planeId].mesh);
		}
		existingPlanes = {};
		OEV.MUST_RENDER = true;
	}
	
	ext.onPlaneVoid = function() {
		OEV.MUST_RENDER = true;
		for (var planeId in planes) {
			OEV.earth.removeMeshe(planes[planeId].mesh);
			delete planes[planeId];
		}
	}
	
	ext.dispose = function() {
		ext.onPlaneVoid();
		Oev.Tile.Extension.PlanesWatcher.evt.removeEventListener('PLANE_VOID_' + myTileIndex, ext, ext.onPlaneVoid);
		Oev.Tile.Extension.PlanesWatcher.evt.removeEventListener('PLANE_POS_UPDATE_' + myTileIndex, ext, ext.onPlaneUpdatePos);
	}
	
	ext.init(_tile);
	
	return ext;
}
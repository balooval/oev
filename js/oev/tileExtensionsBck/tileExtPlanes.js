'use strict';

Oev.Tile.Extension.PlanesWatcher = (function() {
	var isLaunched = false;
	var timeoutId = -1;
	var updateDelay = 6000;
	var loaderPlane = null;
	var planesStates = null;
	var planesList = {};
	
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
		
		init : function() {
			if (isLaunched) {
				return false;
			}
			isLaunched = true;
			console.warn('PlanesWatcher.init');
			api.planeMat = new THREE.MeshLambertMaterial({ color: 0xD0D0E0 });
			api.planeGeo = OEV.modelsLib["plane"].geometry.clone();
			loaderPlane = OEV.earth.loaderPlane;
			api.updatePlanes();
		}, 
		
		stop : function() {
			if (!isLaunched) {
				return false;
			}
			isLaunched = false;
			console.warn('PlanesWatcher.stop');
			clearTimeout(timeoutId);
			timeoutId = -1;
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
		
		getPartIndexFromCoord : function(_lon, _lat) {
			var lonIndex = Math.floor(_lon) + 180;
			var latIndex = Math.floor(_lat) + 90;
			return {i:lonIndex, j:latIndex};
		}, 
		
	};
	
	
	function sortStates() {
		var i;
		var key;
		var lastPlanesList = []
		for (key in planesList) {
			lastPlanesList.push(key);
		}
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
		for (i = 0; i < lastPlanesList.length; i ++) {
			var index = lastPlanesList[i]
			if (planesList[index] === undefined) {
				indexVoid.push(index);
			}
		}
		for (i = 0; i < indexVoid.length; i ++) {
			// console.warn('PLANE_VOID_' + indexVoid[i]);
			api.evt.fireEvent('PLANE_VOID_' + indexVoid[i]);
1		}
		for (key in planesList) {
			// console.log('PLANE_POS_UPDATE_' + key);
			api.evt.fireEvent('PLANE_POS_UPDATE_' + key, planesList[key]);
		}
	}
	
	
	return api;
})();

Oev.Tile.Extension.Planes = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	
	ext.id = 'PLANE';
	
	var myTileIndex;
	// var mesh = null;
	
	var planes = {};
	
	ext.activate = function() {
		Oev.Tile.Extension.PlanesWatcher.init();
	}
	
	ext.desactivate = function() {
		Oev.Tile.Extension.PlanesWatcher.stop();
		// ext.onPlaneVoid();
		ext.dispose();
	}
	
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
				// var planeScale = 0.15;
				var planeScale = 10;
				planeMesh.scale.x = planeScale;
				planeMesh.scale.y = planeScale;
				planeMesh.scale.z = planeScale;
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
		// console.warn('onPlaneVoid');
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
	
	ext.onInit(_tile);
	
	return ext;
}
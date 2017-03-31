'use strict';

Oev.Tile.Extension.Overpass = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	
	ext.id = 'OVERPASS';
	
	var meshNodes;
	// var nodesType = 'pylone';
	var nodesType = 'tree';
	// var nodesType = 'eolienne';
	
	ext.nodesList = [];
	
	ext.nodesMesh = null;
	
	ext.tileReady = function() {
		if (!this.tile.onStage || this.tile.zoom < 15) {
			return false;
		}
		// var meshBuilder = new Oev.Tile.Extension.NodeGeoLib('eolienne', new THREE.MeshPhongMaterial({color:0x909090}));
		// var meshBuilder = new Oev.Tile.Extension.NodeGeoLib('pylone', Oev.Globe.modelsMesheMat['pylone']);
		var meshBuilder = new Oev.Tile.Extension.NodeGeoTree(Oev.Globe.modelsMesheMat['TREE']);
		ext.nodesMesh = new Oev.Tile.Extension.Node(
			this.tile, 
			{
				// power : 'tower'
				natural : 'tree'
				// power : 'generator', 
				// 'generator:source' : 'wind'
			}, 
			meshBuilder
		);
		
		OEV.earth.loaderOverpassCache.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				keyOpt : nodesType, 
				nodeType : nodesType, 
				priority : this.tile.distToCam
			}, 
			function(_datas) {
				ext.onCachedDatasLoaded(_datas);
			}
		);
	}
	
	ext.show = function() {
		if (meshNodes !== undefined) {
			Oev.Globe.addMeshe(meshNodes);
		}
		if (ext.dataLoaded === false) {
			ext.tileReady();
		}
	}
	
	ext.hide = function() {
		Oev.Net.OverpassProxy.abort(this.tile, nodesType);
		OEV.earth.loaderOverpassCache.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
		if (meshNodes !== undefined) {
			Oev.Globe.removeMeshe(meshNodes);
		}
		OEV.MUST_RENDER = true;
	}
	
	ext.onCachedDatasLoaded = function(_cachedNodesList) {
		_cachedNodesList = JSON.parse(_cachedNodesList);
		if (_cachedNodesList.success === true) {
			ext.parseDatas(_cachedNodesList.result);
		} else if (Oev.Tile.Extension['ACTIV_' + this.id] === true) {
			Oev.Net.OverpassProxy.load(this.tile, ext.onDatasLoaded, nodesType);
		}
	}
	
	ext.onDatasLoaded = function(_nodesList) {
		console.log('Data not cached, saving ...', this.tile.zoom);//, this.tile.tileX, this.tile.tileY);
		Oev.Net.OverpassProxy.send(this.tile, _nodesList, nodesType);
		ext.parseDatas(_nodesList);
	}
	
	ext.construct = function() {
		if (Oev.Tile.Extension['ACTIV_' + this.id] === false || this.isInstancied === false) {
			return false;
		}
		var nb = Math.min(100, ext.nodesList.length);
		// var nb = ext.nodesList.length;
		// console.log('construct', ext.nodesList.length);
		for (var i = 0; i < nb; i ++) {
			var nextNode = ext.nodesList.shift();
			if (ext.nodesMesh.isHandlingTag(nextNode.tags)) {
				ext.nodesMesh.addNode(nextNode);
			} else {
				console.log('not handling');
			}
		}
		if (ext.nodesList.length > 0) {
			Oev.Tile.ProcessQueue.addWaiting(ext);
			return false;
		}
		meshNodes = ext.nodesMesh.getMesh();
		if (meshNodes !== undefined) {
			meshNodes.castShadow = true;
			meshNodes.receiveShadow = true;
			Oev.Globe.addMeshe(meshNodes);
		}
		OEV.MUST_RENDER = true;
	}, 
	
	ext.parseDatas = function(_nodesList) {
		ext.dataLoaded = true;
		if (Oev.Tile.Extension['ACTIV_' + this.id] === false || this.isInstancied === false) {
			return false;
		}
		ext.nodesList = _nodesList;
		if (ext.nodesList.length == 0) {
			return false;
		}
		Oev.Tile.ProcessQueue.addWaiting(ext);
		/*
		for (var i = 0; i < _nodesList.length; i ++) {
			if (ext.nodesMesh.isHandlingTag(_nodesList[i].tags)) {
				ext.nodesMesh.addNode(_nodesList[i]);
			}			
		}
		meshNodes = ext.nodesMesh.getMesh();
		if (meshNodes !== undefined) {
			meshNodes.castShadow = true;
			meshNodes.receiveShadow = true;
			Oev.Globe.addMeshe(meshNodes);
		}
		OEV.MUST_RENDER = true;
		*/
	}
	
	ext.desactivate = function() {
		this.hide();
		if (ext.nodesMesh !== null) {
			ext.nodesMesh.desactivate();
		}
	}
	
	ext.dispose = function() {
		this.hide();
		if (meshNodes !== undefined) {
			meshNodes.geometry.dispose();
			// meshNodes.material.dispose();
		}
		if (ext.nodesMesh !== null) {
			ext.nodesMesh.dispose();
		}
	}
	
	ext.onInit(_tile);
	
	return ext;
}
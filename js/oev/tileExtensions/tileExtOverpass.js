'use strict';

Oev.Tile.Extension.Overpass = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	
	ext.id = 'OVERPASS';
	
	var meshPylones;
	
	ext.nodesMesh = null;
	
	ext.tileReady = function() {
		if (!this.tile.onStage || this.tile.zoom < 15) {
			return false;
		}
		
		ext.nodesMesh = new Oev.Tile.Extension.Node(
			this.tile, 
			{
				power : 'tower'
			}, 
			'pylone', 
			'pylone' 
		);
		
		OEV.earth.loaderOverpass.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				keyOpt : 'pylone', 
				priority : this.tile.distToCam
			}, 
			function(_datas) {
				ext.onCachedDatasLoaded(_datas);
			}
		);
	}
	
	ext.show = function() {
		if (meshPylones !== undefined) {
			Oev.Globe.addMeshe(meshPylones);
		}
		if (ext.dataLoaded === false) {
			ext.tileReady();
		}
	}
	
	ext.hide = function() {
		OEV.earth.loaderOverpass.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
		if (meshPylones !== undefined) {
			Oev.Globe.removeMeshe(meshPylones);
		}
		OEV.MUST_RENDER = true;
	}
	
	ext.onCachedDatasLoaded = function(_cachedNodesList) {
		_cachedNodesList = JSON.parse(_cachedNodesList);
		if (_cachedNodesList.success === true) {
			ext.parseDatas(_cachedNodesList.result);
		} else if (Oev.Tile.Extension['ACTIV_' + this.id] === true) {
			Oev.Net.Overpass.load(this.tile, ext.onDatasLoaded);
		}
	}
	
	ext.onDatasLoaded = function(_nodesList) {
		console.log('Data not cached, saving ...', this.tile.zoom, this.tile.tileX, this.tile.tileY);
		Oev.Net.Overpass.send(this.tile, _nodesList);
		ext.parseDatas(_nodesList);
	}
	
	ext.parseDatas = function(_nodesList) {
		ext.dataLoaded = true;
		if (Oev.Tile.Extension['ACTIV_' + this.id] === false || this.isInstancied === false) {
			return false;
		}
		for (var i = 0; i < _nodesList.length; i ++) {
			if (ext.nodesMesh.isHandlingTag(_nodesList[i].tags)) {
				ext.nodesMesh.addNode(_nodesList[i]);
			}			
		}
		
		meshPylones = ext.nodesMesh.getMesh();
		if (meshPylones !== undefined) {
			meshPylones.castShadow = true;
			meshPylones.receiveShadow = true;
			Oev.Globe.addMeshe(meshPylones);
		}
		OEV.MUST_RENDER = true;
	}
	
	ext.desactivate = function() {
		this.hide();
		if (ext.nodesMesh !== null) {
			ext.nodesMesh.desactivate();
		}
	}
	
	ext.dispose = function() {
		this.hide();
		if (meshPylones !== undefined) {
			meshPylones.geometry.dispose();
			meshPylones.material.dispose();
		}
		if (ext.nodesMesh !== null) {
			ext.nodesMesh.dispose();
		}
	}
	
	ext.onInit(_tile);
	
	return ext;
}
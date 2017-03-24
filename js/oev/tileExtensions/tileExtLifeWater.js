Oev.Tile.Extension.LifeWater = function(_tile) {
	'use strict';

	var myWhales = [];
	var water;
	var mirrorMesh;
	
	var ext = Object.create(Oev.Tile.Extension);
	ext.id = 'LIFE';
	
	ext.init = function() {
		
	}
	
	ext.tileReady = function() {
		if (this.tile.zoom > 10) {
			this.tile.material.envMap = OEV.textures['skydome'];
			// this.tile.material.map = OEV.textures['sea'];
			this.tile.material.normalMap = OEV.textures['waternormals'];
			this.tile.material.displacementMap = OEV.textures['waternormals'];
			this.tile.material.displacementScale = 10;
			// this.tile.material.map = OEV.textures['water_color'];
			ext.tile.material.map.needsUpdate = true;
			// ext.tile.setTexture = function() {};
			OEV.addObjToUpdate(this);
		}
		if (this.tile.zoom == 14) {
			// this.tile.material.shininess = 50;
			// this.tile.material.opacity = 0.8;
			// this.tile.material.transparent = true;
			// this.tile.material.normalMap = OEV.textures['waternormals'];
			// this.tile.material.needsUpdate = true;
			/*
			var light = new THREE.PointLight(0xffffff, 1, 1000);
			light.position.z = 50;
			light.position.y = 50;
			light.position.x = 0;
			Oev.Globe.addMeshe(light);
			*/
			
			// console.log(this.tile.material);
			if (Math.random() > 0.7) {
				var nb = Math.round(Math.random() * 4);
				for (var i = 0; i < nb; i ++) {
					myWhales.push(new Oev.Tile.Extension.Whale(this.tile));
				}
			}
			
		}
	}

	
	ext.update = function() {
		// ext.tile.material.map = OEV.textures['sea'];
		// ext.tile.material.map.wrapS = THREE.RepeatWrapping;
		// ext.tile.material.map.wrapT = THREE.RepeatWrapping;
		// ext.tile.material.map.repeat.y = 1;
		ext.tile.material.map.offset.y += 0.0001;
		// ext.tile.material.map.needsUpdate = true;
		OEV.MUST_RENDER = true;
		// ext.tile.material.normalMap.offset.x += 0.01;
		// ext.tile.material.normalMap.needsUpdate = true;
	}
	
	ext.desactivate = function() {
		this.dispose();
	}
	
	ext.dispose = function() {
		if (this.isInstancied === false) {
			return false;
		}
		if (this.tile.zoom > 10) {
			OEV.removeObjToUpdate(this);
		}
		// this.tile.material.envMap = null;
		if (this.tile.zoom == 14) {
			// this.tile.material.shininess = 0;
			// this.tile.material.normalMap = null;
			
			// this.tile.material.opacity = 1;
			// this.tile.material.transparent = false;
			// this.tile.material.needsUpdate = true;
		}
		for (var i = 0; i < myWhales.length; i ++) {
			myWhales[i].dispose();
		}
		myWhales = [];
	}
	
	
	ext.onInit(_tile);
	
	return ext;
}
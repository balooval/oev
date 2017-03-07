Oev.Tile.Extension.LifeWater = function(_tile) {
	'use strict';

	var whaleMesh = null;
	var tweenWhaleX;
	var tweenWhaleY;
	var tweenWhaleZ;
	var tweenWhaleRot;
	var lastWhaleDestCoord;
	
	var ext = Object.create(Oev.Tile.Extension);
	ext.id = 'LIFE';
	
	ext.init = function() {
		
	}
	
	ext.aba = 'COUCOU';
	
	ext.tileReady = function() {
		if (this.tile.zoom == 14) {
			whaleMesh = Oev.Tile.Extension.Life.getMeshLife();
			var whaleCoord = Oev.Globe.coordToXYZ(this.tile.middleCoord.x, this.tile.middleCoord.y, 0);
			whaleMesh.position.x = whaleCoord.x;
			whaleMesh.position.y = whaleCoord.y;
			whaleMesh.position.z = whaleCoord.z;
			// whaleMesh.rotation.x = Math.PI;
			whaleMesh.rotation.z = Math.PI;
			whaleMesh.castShadow = true;
			whaleMesh.receiveShadow = true;
			Oev.Globe.addMeshe(whaleMesh);
			
			tweenWhaleX = new Oev.Animation.TweenValue(whaleMesh.position.x);
			tweenWhaleY = new Oev.Animation.TweenValue(whaleMesh.position.y);
			tweenWhaleZ = new Oev.Animation.TweenValue(whaleMesh.position.z);
			tweenWhaleRot = new Oev.Animation.TweenValue(0);
			
			tweenWhaleX.evt.addEventListener('END', this, this.onWHaleReachDest);
			
			lastWhaleDestCoord = new THREE.Vector2(0, 0);			
			// var whalePosDest = Oev.Globe.coordToXYZ(this.tile.startCoord.x, this.tile.startCoord.y, 0);
			// tweenWhaleX.setTargetValue(whalePosDest.x, 5000);
			// tweenWhaleY.setTargetValue(whalePosDest.y, 5000);
			// tweenWhaleZ.setTargetValue(whalePosDest.z, 5000);
			this.getWhaleDest();
			
			OEV.addObjToUpdate(this);
			
			OEV.MUST_RENDER = true;
		}
	}
	
	ext.getWhaleDest = function() {
		var destCoord = new THREE.Vector3();
		destCoord.x = this.tile.startCoord.x + (this.tile.endCoord.x - this.tile.startCoord.x) * Math.random();
		destCoord.y = this.tile.startCoord.y + (this.tile.endCoord.y - this.tile.startCoord.y) * Math.random();
		destCoord.z = Math.random() * 80 - 80;
		// destCoord.z = 20;
		var whalePosDest = Oev.Globe.coordToXYZ(destCoord.x, destCoord.y, destCoord.z);
		
		var speed = 3000 + Math.random() * 10000;
		
		tweenWhaleX.setTargetValue(whalePosDest.x, speed);
		tweenWhaleY.setTargetValue(whalePosDest.y, speed);
		tweenWhaleZ.setTargetValue(whalePosDest.z, speed);
		
		var angle = Math.atan2(lastWhaleDestCoord.y - destCoord.y, lastWhaleDestCoord.x - destCoord.x);
		tweenWhaleRot.setTargetValue(angle - Math.PI * 2, 1000);
		
		lastWhaleDestCoord.x = destCoord.x;
		lastWhaleDestCoord.y = destCoord.y;
		
		return whalePosDest;
	}
	
	ext.onWHaleReachDest = function() {
		this.getWhaleDest();
	}
	
	ext.update = function() {
		
		var d = new Date();
		var curTime = d.getTime();
		whaleMesh.position.x = tweenWhaleX.getValueAtTime(curTime);
		whaleMesh.position.y = tweenWhaleY.getValueAtTime(curTime);
		whaleMesh.position.z = tweenWhaleZ.getValueAtTime(curTime);
		whaleMesh.rotation.y = tweenWhaleRot.getValueAtTime(curTime);
		
		OEV.MUST_RENDER = true;
	}
	
	ext.show = function() {
		
	}
	
	ext.hide = function() {
		
	}
	
	ext.dispose = function() {
		if (whaleMesh !== null) {
			Oev.Globe.removeMeshe(whaleMesh);
			whaleMesh.geometry.dispose();
			whaleMesh = null;
			OEV.removeObjToUpdate(this);
		}
	}
	
	
	ext.onInit(_tile);
	
	return ext;
}
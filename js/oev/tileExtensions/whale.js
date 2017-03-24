Oev.Tile.Extension.WhaleRot = 0;

Oev.Tile.Extension.Whale = function(_tile) {
	'use strict';
	this.tile = _tile;
	this.tweenWhaleX;
	this.tweenWhaleY;
	this.tweenWhaleZ;
	this.tweenWhaleRot;
	this.lastDestCoord;
	this.whaleMesh = Oev.Tile.Extension.Life.getMeshLife();
	this.speed = 3000 + Math.random() * 10000;
	var whaleCoord = Oev.Globe.coordToXYZ(this.tile.middleCoord.x, this.tile.middleCoord.y, 0);
	this.whaleMesh.position.x = whaleCoord.x;
	this.whaleMesh.position.y = whaleCoord.y;
	this.whaleMesh.position.z = whaleCoord.z;
	this.whaleMesh.rotation.z = Math.PI;
	this.whaleMesh.castShadow = true;
	this.whaleMesh.receiveShadow = true;
	Oev.Globe.addMeshe(this.whaleMesh);
	this.tweenWhaleX = new Oev.Animation.TweenValue(this.whaleMesh.position.x);
	this.tweenWhaleY = new Oev.Animation.TweenValue(this.whaleMesh.position.y);
	this.tweenWhaleZ = new Oev.Animation.TweenValue(this.whaleMesh.position.z);
	this.tweenWhaleRot = new Oev.Animation.TweenValue(0);
	this.tweenWhaleX.evt.addEventListener('END', this, this.onReachDest);
	this.lastDestCoord = new THREE.Vector2(0, 0);			
	this.getNextDest();
	OEV.addObjToUpdate(this);
	OEV.MUST_RENDER = true;
}
	
Oev.Tile.Extension.Whale.prototype.getNextDest = function() {
	var destCoord = new THREE.Vector3();
	destCoord.x = this.tile.startCoord.x + (this.tile.endCoord.x - this.tile.startCoord.x) * Math.random();
	destCoord.y = this.tile.startCoord.y + (this.tile.endCoord.y - this.tile.startCoord.y) * Math.random();
	destCoord.z = Math.random() * 80 - 80;
	var posDest = Oev.Globe.coordToXYZ(destCoord.x, destCoord.y, destCoord.z);
	this.tweenWhaleX.setTargetValue(posDest.x, this.speed);
	this.tweenWhaleY.setTargetValue(posDest.y, this.speed);
	this.tweenWhaleZ.setTargetValue(posDest.z, this.speed);
	var angle = Math.atan2(this.lastDestCoord.y - destCoord.y, this.lastDestCoord.x - destCoord.x);
	this.tweenWhaleRot.setTargetValue(angle - Math.PI * 2, 1000);
	this.lastDestCoord.x = destCoord.x;
	this.lastDestCoord.y = destCoord.y;
}

Oev.Tile.Extension.Whale.prototype.onReachDest = function() {
	this.getNextDest();
}

Oev.Tile.Extension.Whale.prototype.update = function() {
	var d = new Date();
	var curTime = d.getTime();
	this.whaleMesh.position.x = this.tweenWhaleX.getValueAtTime(curTime);
	this.whaleMesh.position.y = this.tweenWhaleY.getValueAtTime(curTime);
	this.whaleMesh.position.z = this.tweenWhaleZ.getValueAtTime(curTime);
	// this.whaleMesh.rotation.y = this.tweenWhaleRot.getValueAtTime(curTime);
	
	
	this.whaleMesh.rotation.y = Oev.Tile.Extension.WhaleRot;
	
	OEV.MUST_RENDER = true;
}

Oev.Tile.Extension.Whale.prototype.show = function() {
	
}

Oev.Tile.Extension.Whale.prototype.hide = function() {
	
}

Oev.Tile.Extension.Whale.prototype.dispose = function() {
	if (this.whaleMesh !== null) {
		this.tile.material.shininess = 0;
		this.tile.material.normalMap = null;
		this.tile.material.opacity = 1;
		this.tile.material.transparent = false;
		this.tile.material.needsUpdate = true;
		Oev.Globe.removeMeshe(this.whaleMesh);
		this.whaleMesh.geometry.dispose();
		this.whaleMesh = null;
		OEV.removeObjToUpdate(this);
	}
}

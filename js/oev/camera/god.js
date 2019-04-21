import * as Animation from '../animation.js';
import Evt from '../event.js';
import * as INPUT from '../input/input.js';
import * as GEO from '../geo.js';
import SKY from '../sky.js';
import MATH from '../math.js';

export class CamCtrlGod {
	constructor() {
		this.camera = undefined;
		this.planet = undefined;
		this.pointer = undefined;
		this.mouseLastPos = [0, 0];
		this.zoomCur = 14;
		this.coordLookat = new THREE.Vector3(4.1862, 43.7682, 0);
		this.zoomDest = this.zoomCur;
		this.coordCam = new THREE.Vector3(this.coordLookat.x, this.coordLookat.y, 0);
		this.camRotation = [Math.PI, 0.2];
		this.dragging = false;
		this.rotating = false;
		this.coordOnGround = new THREE.Vector2(0, 0);
		this.tweens = {
			zoom : new Animation.TweenValue(this.zoomCur), 
			lon : new Animation.TweenValue(this.coordLookat.x), 
			lat : new Animation.TweenValue(this.coordLookat.y), 
		};
		this.clicPointer = undefined;
		this.debugPointer = undefined;
		this.evt = new Evt();
		INPUT.Mouse.evt.addEventListener('MOUSE_WHEEL', this, this.onMouseWheel);
		INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', this, this.onMouseDownLeft);
		INPUT.Mouse.evt.addEventListener('MOUSE_RIGHT_DOWN', this, this.onMouseDownRight);
		INPUT.Mouse.evt.addEventListener('MOUSE_LEFT_UP', this, this.onMouseUpLeft);
		INPUT.Mouse.evt.addEventListener('MOUSE_RIGHT_UP', this, this.onMouseUpRight);
		this.MUST_UPDATE = false;
		OEV.evt.addEventListener('APP_START', this, this.onAppStart);
	}

	init(_cam, _planet) {
		this.camera = _cam;
		this.planet = _planet;
	}

	onAppStart() {
		this.camera.up.set(0, -1, 0);
		this.pointer = new THREE.Mesh(new THREE.SphereGeometry(this.planet.meter * 200, 16, 7), new THREE.MeshBasicMaterial({color: 0x00ff00}));
		OEV.scene.add(this.pointer);
		this.clicPointer = new THREE.Mesh(new THREE.SphereGeometry(this.planet.meter * 150, 16, 7), new THREE.MeshBasicMaterial({color: 0x0000ff}));
		OEV.scene.add(this.clicPointer);
		this.debugPointer = new THREE.Mesh(new THREE.SphereGeometry(this.planet.meter * 150, 16, 7), new THREE.MeshBasicMaterial({color: 0xfffc00}));
		OEV.scene.add(this.debugPointer);
		if (location.hash != '') {
			var urlParamsLoc = location.hash.substr(location.hash.search('=') + 1).split('/');
			this.zoomCur = parseFloat(urlParamsLoc[0]);
			this.zoomDest = this.zoomCur;
			this.tweens.zoom.value = this.zoomCur;
			this.setLookAt(parseFloat(urlParamsLoc[1]), parseFloat(urlParamsLoc[2]));
			this.tweens.lon.value = this.coordLookat.x;
			this.tweens.lat.value = this.coordLookat.y;
			this.planet.updateCurTile(this.coordLookat.x, this.coordLookat.y);
			this.planet.updateZoom(this.zoomCur);
			this.MUST_UPDATE = true;
		}
		this.updateCamera();
	}

	setZoomDest(_zoom, _duration) {
		this.zoomDest = Math.min(Math.max(_zoom, 4), 19);
		if (this.zoomDest == this.zoomCur) return false;
		this.tweens.zoom.setTargetValue(this.zoomDest, _duration);
	}

	update() {
		if (this.dragging) this.drag();
		if (this.rotating) this.rotate();
		if (this.tweens.zoom.running) this.zoom();
		this.checkDestination();
		if (this.MUST_UPDATE) {
			this.updateCamera();
			this.MUST_UPDATE = false;
		}
		this.mouseLastPos[0] = INPUT.Mouse.curMouseX;
		this.mouseLastPos[1] = INPUT.Mouse.curMouseY;
	}

	setDestination( _lon, _lat, _duration ) {
		if (_duration == undefined) {
			var distance = GEO.coordDistance(this.coordLookat.x, this.coordLookat.y, _lon, _lat);
			_duration = Math.min(5000, distance / 10);
		}	
		this.tweens.lon.value = this.coordLookat.x;
		this.tweens.lat.value = this.coordLookat.y;
		this.tweens.lon.setTargetValue(_lon, _duration);
		this.tweens.lat.setTargetValue(_lat, _duration);
		this.tweens.lon.evt.removeEventListener('END', this, this.onDestReach);
		this.tweens.lon.evt.addEventListener('END', this, this.onDestReach);
	}

	onDestReach() {
		this.tweens.lon.evt.removeEventListener('END', this, this.onDestReach);
		this.evt.fireEvent('DEST_REACH');
	}

	checkDestination() {
		if (!this.tweens.lon.running) return false;
		const d = new Date();
		const curTime = d.getTime();
		this.coordLookat.x = this.tweens.lon.getValueAtTime( curTime );
		this.coordLookat.y = this.tweens.lat.getValueAtTime( curTime );
		this.MUST_UPDATE = true;
	}

	zoom() {
		const d = new Date();
		this.setCurZoom( this.tweens.zoom.getValueAtTime( d.getTime() ) );
	}

	setCurZoom( _value ) {
		this.zoomCur = _value;
		this.planet.updateZoom(this.zoomCur);
		const wpScale = (this.coordCam.z / this.planet.radius) * 1000;
		OEV.waypoints.forEach(w => w.resize(wpScale));
		this.MUST_UPDATE = true;
	}

	drag() {
		const depX = (INPUT.Mouse.curMouseX - this.mouseLastPos[0]) / Math.pow(2.0, this.zoomCur);
		const depY = (INPUT.Mouse.curMouseY - this.mouseLastPos[1]) / Math.pow(2.0, this.zoomCur);
		const finalLon = this.coordLookat.x + (depX * Math.cos(this.camRotation[0]) - depY * Math.sin(this.camRotation[0]));
		const finalLat = this.coordLookat.y - (depY * Math.cos(this.camRotation[0]) + depX * Math.sin(this.camRotation[0]));
		this.setLookAt(finalLon, finalLat);
	}

	setLookAt(_lon, _lat) {
		this.coordLookat.x = _lon;
		this.coordLookat.y = _lat;
		if (this.coordLookat.x > 180 ){
			this.coordLookat.x = this.coordLookat.x - 360;
		} else if (this.coordLookat.x < -180) {
			this.coordLookat.x = this.coordLookat.x + 360;
		}
		this.coordLookat.y = Math.min(Math.max(this.coordLookat.y, -85), 85);
		this.MUST_UPDATE = true;
	}

	rotate() {
		var depX = (INPUT.Mouse.curMouseX - this.mouseLastPos[0]) / 100.0;
		var depY = (INPUT.Mouse.curMouseY - this.mouseLastPos[1]) / 100.0;
		this.camRotation[0] += depX;
		this.camRotation[1] += depY;
		if (this.camRotation[0] > Math.PI) {
			this.camRotation[0] = 0 - this.camRotation[0];
		}else if (this.camRotation[0] < -Math.PI) {
			this.camRotation[0] = this.camRotation[0] + (Math.PI * 2);
		}
		this.camRotation[1] = Math.min(Math.max(this.camRotation[1], 0.05), (Math.PI / 2) - 0.05);
		this.evt.fireEvent('ON_ROTATE', this.camRotation[0]);
		this.MUST_UPDATE = true;
	}

	updateHistory() {
		const urlLon = Math.round(this.coordLookat.x * 10000) / 10000;
		const urlLat = Math.round(this.coordLookat.y * 10000) / 10000;
		const urlZoom = Math.round(this.zoomDest * 10000) / 10000;
		history.replaceState('toto', "Title", "#location="+urlZoom+"/"+urlLon+"/"+urlLat);
	}

	updateCamera() {
		this.updateHistory();
		this.coordLookat.z = this.planet.getElevationAtCoords(this.coordLookat.x, this.coordLookat.y, true);
		const posLookat = this.planet.coordToXYZ(this.coordLookat.x, this.coordLookat.y, this.coordLookat.z);
		this.coordCam.z = this.planet.altitude(this.zoomCur);
		this.planet.zoomFromAltitudeTest(this.coordCam.z);
		let posCam;
		if (this.planet.projection == "SPHERE") {
			posCam = this.updateOnSphere();
		}else{
			posCam = this.updateOnPlane(posLookat);
		}
		this.camera.position.x = posCam[0];
		this.camera.position.y = posCam[1];
		this.camera.position.z = posCam[2];
		const tmpCoords = this.planet.coordFromPos(posCam[0], posCam[2]);
		this.coordCam.x = tmpCoords.x;
		this.coordCam.y = tmpCoords.y;
		this.camera.lookAt(posLookat);
		this.planet.updateCurTile(this.coordLookat.x, this.coordLookat.y);
		this.planet.zoomDetails = this.zoomCur;
		this.planet.checkLOD();
		const wpScale = (this.coordCam.z / this.planet.radius) * 500;
		this.pointer.scale.x = wpScale;
		this.pointer.scale.y = wpScale;
		this.pointer.scale.z = wpScale;
		this.pointer.position.x = posLookat.x;
		this.pointer.position.y = posLookat.y;
		this.pointer.position.z = posLookat.z;
		this.debugPointer.scale.x = wpScale;
		this.debugPointer.scale.y = wpScale;
		this.debugPointer.scale.z = wpScale;
		OEV.MUST_RENDER = true;
		this.evt.fireEvent('CAM_UPDATED');
		SKY.updateCameraLookat(posLookat);
		SKY.globalScale = this.planet.globalScale;
		SKY.updateSun();
	}

	updateOnSphere() {
		const radLon = MATH.radians(this.coordLookat.x);
		const radLat = MATH.radians(this.coordLookat.y);
		const matGlob = new THREE.Matrix4();
		const matZ = new THREE.Matrix4();
		const matY = new THREE.Matrix4();
		const matX = new THREE.Matrix4();
		matX.makeRotationX(0);
		matY.makeRotationY(radLon);
		matZ.makeRotationZ(radLat);
		matGlob.multiplyMatrices(matY, matZ);
		matGlob.multiply(matX);
		const tmpG = new THREE.Vector3(this.planet.radius / this.planet.globalScale, 0, 0);
		tmpG.applyMatrix4(matGlob);
		// rotation locale
		const matLocX = new THREE.Matrix4();
		const matLocY = new THREE.Matrix4();
		const matLocZ = new THREE.Matrix4();
		matLocX.makeRotationX(this.camRotation[0] * -1);
		matLocY.makeRotationY(0);
		matLocZ.makeRotationZ(this.camRotation[1] * 1);
		matGlob.multiply(matLocX);
		matGlob.multiply(matLocZ);
		const tmpL = new THREE.Vector3(this.coordCam.z / this.planet.globalScale, 0, 0);
		tmpL.applyMatrix4(matGlob);
		tmpG.x += tmpL.x;
		tmpG.y += tmpL.y;
		tmpG.z += tmpL.z;
		const posCamX = -tmpG.x;
		const posCamY = tmpG.y;
		const posCamZ = -tmpG.z;
		this.camera.up.set(-Math.cos(radLat * -1) * Math.cos(radLon), -Math.sin(radLat * -1), Math.cos(radLat * -1) * Math.sin(radLon));
		return [
			posCamX, 
			posCamY, 
			posCamZ
		];
	}

	updateOnPlane(_posLookat) {
		this.camera.up.set(0, -1, 0);
		this.coordCam.z *= this.planet.globalScale;
		const orbitRadius = Math.sin(this.camRotation[1]) * this.coordCam.z;
		return [
			_posLookat.x + Math.sin(this.camRotation[0]) * orbitRadius, 
			_posLookat.y - Math.cos(this.camRotation[1]) * (this.coordCam.z), 
			_posLookat.z + Math.cos(this.camRotation[0]) * orbitRadius, 
		];
	}

	onMouseWheel(_delta) {
		this.setZoomDest(this.zoomDest + _delta, 200);
	}

	onMouseDownLeft() {
		this.coordOnGround = OEV.checkMouseWorldPos();
		if (this.coordOnGround != undefined) {
			const wpScale = (this.coordCam.z / this.planet.radius) * 500;
			this.clicPointer.scale.x = wpScale;
			this.clicPointer.scale.y = wpScale;
			this.clicPointer.scale.z = wpScale;
			const pos = this.planet.coordToXYZ(this.coordOnGround.x, this.coordOnGround.y, this.coordOnGround.z);
			this.clicPointer.position.x = pos.x;
			this.clicPointer.position.y = pos.y;
			this.clicPointer.position.z = pos.z;
			this.dragging = true;
		}
	}

	onMouseUpLeft() {
		this.dragging = false;
		this.evt.fireEvent('STOP_DRAG');
	}

	onMouseDownRight() {
		this.rotating = true;
	}

	onMouseUpRight() {
		this.rotating = false;
	}
}
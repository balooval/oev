import {
	CircleGeometry,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	Quaternion,
	SphereGeometry,
	Vector2,
	Vector3,
} from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import * as Animation from '../utils/animation.js';
import Evt from '../core/event.js';
import {Mouse} from '../input/input.js';
import GEO from '../core/geo.js';
import MATH from '../core/math.js';
import {evt as DataLoaderEvent} from '../tileExtensions/dataLoader.js';
import * as GlMatrix from "../vendor/gl-matrix/vec3.js";


export class CameraGod {
	constructor(_camera, _startPosition = null) {
		this.startPosition = _startPosition;
		this.camera = _camera;
		this.globe = undefined;
		this.pointer = undefined;
		this.mouseLastPos = [0, 0];
		this.zoomCur = _startPosition.z;
		this.viewDirection = new Vector2(0, -1);
		this.coordLookat = new Vector3(_startPosition.x, _startPosition.y, 0);
		this.lookAtVector = new Vector3(0, 0, 0);
		this.zoomDest = this.zoomCur;
		this.cameraCoord = new Vector3(this.coordLookat.x, this.coordLookat.y, 0);
		this.camRotation = [0, 0.2];
		this.dragging = false;
		this.rotating = false;
		this.coordOnGround = new Vector2(0, 0);
		this.tweens = {
			zoom : new Animation.TweenValue(this.zoomCur), 
			lon : new Animation.TweenValue(this.coordLookat.x), 
			lat : new Animation.TweenValue(this.coordLookat.y), 
		};
		this.clicPointer = undefined;
		this.evt = new Evt();
		Mouse.evt.addEventListener('MOUSE_WHEEL', this, this.onMouseWheel);
		Mouse.evt.addEventListener('MOUSE_LEFT_DOWN', this, this.onMouseDownLeft);
		Mouse.evt.addEventListener('MOUSE_RIGHT_DOWN', this, this.onMouseDownRight);
		Mouse.evt.addEventListener('MOUSE_LEFT_UP', this, this.onMouseUpLeft);
		Mouse.evt.addEventListener('MOUSE_RIGHT_UP', this, this.onMouseUpRight);
		DataLoaderEvent.addEventListener('ALL_LOADER_IDLE', this, this.onAllRessourcesLoaded);
		this.MUST_UPDATE = false;

		this.updateData = {};
		this.detailMarginTimeoutId = undefined;
		this.maxDetailMargin = 4;

		this.containerRotationLon = new Object3D();
		this.containerRotationLat = new Object3D();
		this.containerRotationLon.add(this.containerRotationLat);
		Renderer.scene.add(this.containerRotationLon);
		Renderer.scene.add(this.camera);
		
		this.containerLocalRotationY = new Object3D();
		this.containerLocalRotationX = new Object3D();
		this.containerLocalRotationY.add(this.containerLocalRotationX);
		this.containerRotationLat.add(this.containerLocalRotationY);

		this.finalCameraPositionObject = new Object3D();
		this.containerLocalRotationX.add(this.finalCameraPositionObject);

		this.localRotationAxisY = new Vector3(0, 0, 1);
		this.localRotationAxisX = new Vector3(1, 0, 0);
		this.globalRotationAxisLon = new Vector3(0, 1, 0);
		this.globalRotationAxisLat = new Vector3(-1, 0, 0);
	}

	init(globe) {
		this.globe = globe;
	}

	start() {

		this.camera.up.set(0, -1, 0);
		this.pointer = new Mesh(new SphereGeometry(this.globe.webglUnitsByMeter * 200, 16, 7), new MeshBasicMaterial({color: 0x808080}));
		this.pointer.visible = false;
		Renderer.scene.add(this.pointer);
		this.clicPointer = new Mesh(new SphereGeometry(this.globe.webglUnitsByMeter * 150, 16, 7), new MeshBasicMaterial({color: 0x0000ff}));
		// Renderer.scene.add(this.clicPointer);
		
		if (this.startPosition) {
			this.zoomDest = this.zoomCur;
			this.tweens.zoom.value = this.zoomCur;
			this.setLookAt(this.startPosition.x, this.startPosition.y);
			this.tweens.lon.value = this.coordLookat.x;
			this.tweens.lat.value = this.coordLookat.y;
			this.globe.updateCurrentTile(this.coordLookat.x, this.coordLookat.y);
			this.globe.updateZoom(this.zoomCur);
			this.MUST_UPDATE = true;
		}

		this.updateCamera();
		this.evt.fireEvent('READY');
	}

	setZoomDest(_zoom, _duration) {
		this.zoomDest = Math.min(Math.max(_zoom, 4), 18.999);
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
		this.mouseLastPos[0] = Mouse.curMouseX;
		this.mouseLastPos[1] = Mouse.curMouseY;
	}

	setDestination( _lon, _lat, _zoom, _duration) {
		if (_duration == undefined) {
			const distance = GEO.metersBetweenCoords(this.coordLookat.x, this.coordLookat.y, _lon, _lat);
			_duration = Math.min(5000, distance / 10);
		}
		this.tweens.lon.value = this.coordLookat.x;
		this.tweens.lat.value = this.coordLookat.y;
		this.tweens.lon.setTargetValue(_lon, _duration);
		this.tweens.lat.setTargetValue(_lat, _duration);
		this.tweens.lon.evt.removeEventListener('END', this, this.onDestReach);
		this.tweens.lon.evt.addEventListener('END', this, this.onDestReach);
		this.setZoomDest(_zoom, _duration);
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

	zoomIn() {
		this.setZoomDest(Math.ceil(this.zoomCur + 0.1), 200);
	}
	
	zoomOut() {
		this.setZoomDest(Math.floor(this.zoomCur - 0.1), 200);
	}

	zoom() {
		const d = new Date();
		this.setCurZoom( this.tweens.zoom.getValueAtTime( d.getTime() ) );
	}

	setCurZoom(_value) {
		this.zoomCur = _value;
		this.globe.updateZoom(this.zoomCur);
		this.MUST_UPDATE = true;
	}

	drag() {
		const depX = (Mouse.curMouseX - this.mouseLastPos[0]) / Math.pow(2.0, this.zoomCur);
		const depY = (Mouse.curMouseY - this.mouseLastPos[1]) / Math.pow(2.0, this.zoomCur);
		const finalLon = this.coordLookat.x - (depX * Math.cos(this.camRotation[0]) + depY * Math.sin(this.camRotation[0]));
		const finalLat = this.coordLookat.y + (depY * Math.cos(this.camRotation[0]) - depX * Math.sin(this.camRotation[0]));
		this.setLookAt(finalLon, finalLat);
	}

	setLookAt(lon, lat) {
		this.coordLookat.x = lon;
		this.coordLookat.y = lat;
		if (this.coordLookat.x > 180 ){
			this.coordLookat.x = this.coordLookat.x - 360;
		} else if (this.coordLookat.x < -180) {
			this.coordLookat.x = this.coordLookat.x + 360;
		}
		this.coordLookat.y = Math.min(Math.max(this.coordLookat.y, -85), 85);
		this.MUST_UPDATE = true;
	}

	rotate() {
		var depX = (Mouse.curMouseX - this.mouseLastPos[0]) / 100.0;
		var depY = (Mouse.curMouseY - this.mouseLastPos[1]) / 100.0;
		this.camRotation[0] -= depX;
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

	updateCamera() {
		this.coordLookat.z = this.globe.getElevationMetersAtCoords(this.coordLookat.x, this.coordLookat.y);
		const posLookat = this.globe.coordToXYZ(this.coordLookat.x, this.coordLookat.y, this.coordLookat.z);
		this.cameraCoord.z = this.globe.getElevationUnitsForZoom(this.zoomCur);
		let posCam;
		if (this.globe.projection == "SPHERE") {
			posCam = this.updateOnSphere();
		}else{
			posCam = this.updateOnPlane(posLookat);
		}
		this.camera.position.x = posCam[0];
		this.camera.position.y = posCam[1];
		this.camera.position.z = posCam[2];
		const tmpCoords = this.globe.webglUnitsToCoord(posCam[0], posCam[1], posCam[2]);
		this.cameraCoord.x = tmpCoords[0];
		this.cameraCoord.y = tmpCoords[1];
		this.lookAtVector.x = posLookat[0];
		this.lookAtVector.y = posLookat[1];
		this.lookAtVector.z = posLookat[2];
		this.camera.lookAt(this.lookAtVector);
		this.globe.zoomDetails = this.zoomCur;
		
		const pointerScale = this.cameraCoord.z / 10;
		this.pointer.scale.x = pointerScale;
		this.pointer.scale.y = pointerScale;
		this.pointer.scale.z = pointerScale;
		this.pointer.position.x = posLookat[0];
		this.pointer.position.y = posLookat[1];
		this.pointer.position.z = posLookat[2];
		this.clicPointer.scale.x = pointerScale;
		this.clicPointer.scale.y = pointerScale;
		this.clicPointer.scale.z = pointerScale;
		
		this.viewDirection.subVectors(
			new Vector2(this.coordLookat.x, this.coordLookat.y),
			new Vector2(this.cameraCoord.x, this.cameraCoord.y)
		).normalize();
		
		this.#updateFogScale();

		Renderer.MUST_RENDER = true;

		this.updateData = {
			detailMargin: 2,
			zoom: this.zoomCur,
			posCamera : posCam,
			posLookat : posLookat,
			viewDirection: this.viewDirection,
			coordLookat: this.coordLookat,
			coordCam: this.cameraCoord,
			coord : {
				lon : Math.round(this.coordLookat.x * 10000) / 10000, 
				lat : Math.round(this.coordLookat.y * 10000) / 10000, 
				zoom : Math.round(this.zoomDest * 10000) / 10000,
			},
			position: {
				lon : Math.round(this.cameraCoord.x * 10000) / 10000, 
				lat : Math.round(this.cameraCoord.y * 10000) / 10000, 
				zoom : Math.round(this.zoomDest * 10000) / 10000,
			}
		};

		this.evt.fireEvent('CAM_UPDATED', this.updateData);
	}

	onAllRessourcesLoaded() {
		clearTimeout(this.detailMarginTimeoutId);
		this.detailMarginTimeoutId = setTimeout(() => this.#onAddDetailMargin(), 1000);
	}

	#onAddDetailMargin() {
		if (this.updateData.detailMargin >= this.maxDetailMargin) {
			return;
		}

		this.updateData.detailMargin = Math.min(this.maxDetailMargin, this.updateData.detailMargin + 1);
		console.log('detailMargin', this.updateData.detailMargin);
		this.evt.fireEvent('CAM_UPDATED', this.updateData);
	}

	#updateFogScale() {
		if (!Renderer.scene.fog) {
			return;
		}
		
		Renderer.scene.fog.near = this.globe.webglUnitsByMeter * 10000;
		Renderer.scene.fog.far = this.globe.webglUnitsByMeter * 100000;
	}

	updateOnSphere() {
		const radLon = MATH.radians(this.coordLookat.x);
		const radLat = MATH.radians(this.coordLookat.y);

		this.containerLocalRotationY.setRotationFromAxisAngle(
			this.localRotationAxisY,
			this.camRotation[0],
		);

		this.containerLocalRotationX.setRotationFromAxisAngle(
			this.localRotationAxisX,
			this.camRotation[1],
		);
		
		this.containerRotationLon.setRotationFromAxisAngle(
			this.globalRotationAxisLon,
			radLon,
		);

		this.containerRotationLat.setRotationFromAxisAngle(
			this.globalRotationAxisLat,
			radLat,
		);

		this.containerLocalRotationY.position.z = this.globe.radius;
		this.finalCameraPositionObject.position.z = this.cameraCoord.z;

		const cameraWebglPosition = new Vector3();
		this.finalCameraPositionObject.getWorldPosition(cameraWebglPosition);

		this.camera.up.set(
			Math.sin(radLon) * Math.cos(radLat),
			Math.sin(radLat),
			Math.cos(radLon) * Math.cos(radLat),
		);

		return [
			cameraWebglPosition.x,
			cameraWebglPosition.y,
			cameraWebglPosition.z,
		];
	}

	updateOnPlane(_posLookat) {
		this.camera.up.set(0, 1, 0);
		this.cameraCoord.z *= this.globe.globalScale;
		const orbitRadius = Math.sin(this.camRotation[1]) * this.cameraCoord.z;
		return [
			_posLookat[0] + Math.sin(this.camRotation[0]) * orbitRadius, 
			_posLookat[1] + Math.cos(this.camRotation[1]) * (this.cameraCoord.z), 
			_posLookat[2] + Math.cos(this.camRotation[0]) * orbitRadius, 
		];
	}

	onMouseWheel(_delta) {
		this.setZoomDest(this.zoomDest + _delta, 200);
	}

	onMouseDownLeft() {
		this.coordOnGround = this.globe.screenToSurfacePosition(Mouse.curMouseX, Mouse.curMouseY);
		
		if (!this.coordOnGround) {
			return;
		}

		this.clicPointer.position.x = this.coordOnGround.x;
		this.clicPointer.position.y = this.coordOnGround.y;
		this.clicPointer.position.z = this.coordOnGround.z;
		this.dragging = true;
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
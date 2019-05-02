import Evt from './utils/event.js';
import * as NET_TEXTURES from './net/NetTextures.js';
import * as SHADER from './shader.js';

let lightAmbiant = undefined;
let sunRotation = -1.5;
let particleSystem = undefined;
let pMaterial = undefined;
let colorsGradient = undefined;
let fogActive = true;
let stars = null;
let starsMat = null;
let destTime = 0;
const destTimeSpeed = 0.01;
const rainEnabled = false;
const weatherEnabled = false;
let lightSun;
let materialCloudNew;
let skyMeshNew = null;
let sunMeshNew = null;
let skyParamsNew = {
	sunPosition : new THREE.Vector3(0, 0, 0), 
	sunInclinaison : 0, 
	skyRadius : 100, 
	skyTransmission : 0.5, 
	sunAzimuth : 0, 
	sunLuminosity : 0.2, 
};

function createCloudNew() {
	const parametersSun = {
		vertexShader: SHADER.get('vert_cloud'), 
		fragmentShader: SHADER.get('frag_cloud'),
		uniforms: {
			map : { type: "t", value: NET_TEXTURES.texture('cloud')}, 
			normalizedTime : {value : 0.5}, 
		}, 
		side: THREE.DoubleSide, 
		transparent: true, 
		depthWrite: false, 
	};
	materialCloudNew = new THREE.ShaderMaterial(parametersSun);
	const cloudsMesh = new THREE.Mesh(new THREE.Geometry(), materialCloudNew);
	const groupPos = new THREE.Vector3();
	const groupsDispertion = 5000;
	const doublePi = Math.PI * 2;
	for (var c = 0; c < 30; c ++) {
		if (c % 5 == 0) {
			groupPos.x = Math.random() * groupsDispertion - groupsDispertion / 2;
			groupPos.y = (Math.random() * groupsDispertion / 10 + groupsDispertion / 20) * -1;
			groupPos.z = Math.random() * groupsDispertion - groupsDispertion / 2;
		}
		let tileOffset;
		let faceRotX;
		let faceRotY;
		const faceWidth = 10;
		const faceHeight = 10;
		const geoFinal = new THREE.Geometry();
		for (let i = 0; i < 8; i ++) {
			const geo = new THREE.Geometry();
			tileOffset = Math.random() > 0.5 ? 0.5 : 0;
			faceRotX = (Math.random() * doublePi) - Math.PI;
			faceRotY = (Math.random() * doublePi) - Math.PI;
			geo.vertices.push(new THREE.Vector3(
				-1 * faceWidth, 
				1 * faceHeight,  
				0
			));
			geo.vertices.push(new THREE.Vector3(
				-1 * faceWidth, 
				-1 * faceHeight, 
				0
			));
			geo.vertices.push(new THREE.Vector3(
				1 * faceWidth, 
				-1 * faceHeight,  
				0
			));
			geo.vertices.push(new THREE.Vector3(
				1 * faceWidth, 
				1 * faceHeight,  
				0
			));
			geo.faces.push(new THREE.Face3(0, 2, 1));
			geo.faces.push(new THREE.Face3(0, 3, 2));
			geo.faceVertexUvs[0][0] = [
				new THREE.Vector2(tileOffset, 0),
				new THREE.Vector2(tileOffset + 0.5, 1),
				new THREE.Vector2(tileOffset, 1)
			];
			geo.faceVertexUvs[0][1] = [
				new THREE.Vector2(tileOffset, 0),
				new THREE.Vector2(tileOffset + 0.5, 0),
				new THREE.Vector2(tileOffset + 0.5, 1)
			];
			const tmpMesh = new THREE.Mesh(geo);
			tmpMesh.rotation.x = faceRotX;
			tmpMesh.rotation.y = faceRotY;
			geoFinal.mergeMesh(tmpMesh);
		}
		geoFinal.computeFaceNormals();
		geoFinal.computeVertexNormals();
		geoFinal.uvsNeedUpdate = true;
		geoFinal.verticesNeedUpdate = true;
		const curCloudMesh = new THREE.Mesh(geoFinal);
		const dispertion = 500;
		curCloudMesh.position.x = groupPos.x + (Math.random() * dispertion - dispertion / 2);
		curCloudMesh.position.y = groupPos.y + ((Math.random() * dispertion / 10 + dispertion / 20) * -1);
		curCloudMesh.position.z = groupPos.z + (Math.random() * dispertion - dispertion / 2);
		const curScale = 4 + (Math.random() * 40);
		curCloudMesh.scale.x = curScale * 2;
		curCloudMesh.scale.y = curScale;
		curCloudMesh.scale.z = curScale;
		cloudsMesh.geometry.mergeMesh(curCloudMesh);
	}
	OEV.scene.add(cloudsMesh);
}

function removeSkyNew() {
	OEV.scene.add(skyMeshNew);
	OEV.scene.add(sunMeshNew);
	skyMeshNew.geometry.dispose();
	skyMeshNew.material.dispose();
	sunMeshNew.geometry.dispose();
	sunMeshNew.material.dispose();
	skyMeshNew = null;
	sunMeshNew = null;
}

function createSkyNew(_skyRadius) {
	if (skyMeshNew !== null) return false;
	createCloudNew();
	skyParamsNew.skyRadius = _skyRadius * 0.9;
	// Sky
	const uniformsSky = {
		skyRadius : {value : _skyRadius}, 
		sunPos : {value : new THREE.Vector3(0,0,0)}, 
		sunLuminosity : {value : skyParamsNew.sunLuminosity}, 
	};
	const parametersSky = {
		
		vertexShader: SHADER.get('vert_sky'),
		fragmentShader: SHADER.get('frag_sky'),
		uniforms: uniformsSky, 
		side: THREE.DoubleSide, 
	};
	const materialSky = new THREE.ShaderMaterial(parametersSky);
	skyMeshNew = new THREE.Mesh(new THREE.SphereGeometry(_skyRadius, 16, 16 ), materialSky);
	OEV.scene.add(skyMeshNew);
	// Sun
	const sunRadius = _skyRadius / 20;
	const vertexShaderSun = SHADER.get('vert_sun');
	const fragmentShaderSun = SHADER.get('frag_sun');
	const uniformsSun = {
		sunElevation : {value : 0.5}, 
		myModelViewMatrixInverse : {value: new THREE.Matrix4()}, 
	};
	const parametersSun = {
		fragmentShader: fragmentShaderSun,
		vertexShader: vertexShaderSun,
		uniforms: uniformsSun, 
		transparent: true, 
	};
	const materialSun = new THREE.ShaderMaterial(parametersSun);
	sunMeshNew = new THREE.Mesh(new THREE.SphereGeometry(sunRadius, 16, 16 ), materialSun);
	OEV.scene.add(sunMeshNew);
}


function updateSkyNew() {
	if (skyMeshNew === null) return false;
	skyParamsNew.sunAzimuth = (api.normalizedTime * -2) + 1;
	skyParamsNew.sunInclinaison = Math.cos(api.normalizedTime * Math.PI * 2);
	let dayLightTime = Math.sin((api.normalizedTime) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	skyParamsNew.sunLuminosity = dayLightTime;
	skyParamsNew.skyTransmission = Math.max((1 - dayLightTime) * 2, 0.4);
	skyParamsNew.sunPosition.x = Math.sin(skyParamsNew.sunAzimuth * Math.PI * 1) * (skyParamsNew.skyRadius * Math.cos(skyParamsNew.sunInclinaison * Math.PI * 0.5));
	skyParamsNew.sunPosition.y = Math.sin(skyParamsNew.sunInclinaison * Math.PI * 0.5) * skyParamsNew.skyRadius;
	skyParamsNew.sunPosition.z = 0 - Math.cos(skyParamsNew.sunAzimuth * Math.PI * 1) * (skyParamsNew.skyRadius * Math.cos(skyParamsNew.sunInclinaison * Math.PI * 0.5));
	updateSkyPosition();
	const transmission = new THREE.Vector3();
	transmission.x = skyParamsNew.sunPosition.x * skyParamsNew.skyTransmission;
	transmission.y = skyParamsNew.sunPosition.y * skyParamsNew.skyTransmission;
	transmission.z = skyParamsNew.sunPosition.z * skyParamsNew.skyTransmission;
	skyMeshNew.material.uniforms.sunPos.value = transmission;
	skyMeshNew.material.uniforms.sunLuminosity.value = skyParamsNew.sunLuminosity;
	sunMeshNew.material.uniforms.sunElevation.value = Math.abs(skyParamsNew.sunInclinaison);
	materialCloudNew.uniforms.normalizedTime.value = api.normalizedTime;
}

const api = {
	evt : new Evt(), 
	cloudsActiv : true, 
	globalScale : 1, 
	normalizedTime : 0.5, 
	posCenter : new THREE.Vector3( 0, 0, 0 ), 
	
	getLight : function() {
		return lightSun;
	}, 
	init : function() {
		OEV.evt.addEventListener('APP_START', api, api.onAppStart);
	}, 
	
	onAppStart : function() {
		destTime = api.normalizedTime;
		if( fogActive ){
			OEV.scene.fog = new THREE.Fog(0xc5d3ea, OEV.earth.radius , OEV.earth.radius * 2);
		}
		colorsGradient = getImageData(NET_TEXTURES.texture('sky_gradient').image);	
		lightSun = new THREE.DirectionalLight(0xffffff, 1);
		OEV.scene.add(lightSun);
		lightAmbiant = new THREE.AmbientLight(0x25282d);
		OEV.scene.add(lightAmbiant);
		if (OEV.shadowsEnabled) {
			lightSun.castShadow = true;
			updateShadow();
		}
		api.initSunPos();
		if(api.cloudsActiv){
			api.makeClouds();
		}
		api.makeStars();
		OEV.earth.evt.addEventListener( 'CURTILE_CHANGED', api, api.onCurTileChanged );
		OEV.earth.evt.addEventListener( 'LOD_CHANGED', api, api.onLodChanged );
		api.onLodChanged();
		api.setSunTime(0.5);
	}, 
	
	update : function() {
		if (destTime != api.normalizedTime) {
			var delta = destTime - api.normalizedTime;
			if (delta > 0) {
				api.normalizedTime += destTimeSpeed;
				api.normalizedTime = Math.min(destTime, api.normalizedTime);
			} else {
				api.normalizedTime -= destTimeSpeed;
				api.normalizedTime = Math.max(destTime, api.normalizedTime);
			}
			api.updateSun();
			if (destTime == api.normalizedTime) {
				console.log( "sunTime END" );
				OEV.earth.walkRecorder.endCmdStep( "sunTime" );
			}
		}
		updateStarsPos();
	}, 
	
	
	initSunPos : function() {
		var sunPos = OEV.earth.coordToXYZ(0, 0, OEV.earth.radius);
	},
	
	
	testLuminosity : function(_value) {
		skyMeshNew.material.uniforms.sunLuminosity.value = _value;
		console.log('skyParamsNew.sunLuminosity', _value);
		OEV.MUST_RENDER = true;
	}, 

	setSunTime : function(_time) {
		api.normalizedTime = _time;
		destTime = api.normalizedTime;
		api.updateSun();
		updateSkyNew();
	}, 	

	updateSun : function() {
		lightSun.target = OEV.camCtrl.pointer;
		sunRotation = 2.0 + (api.normalizedTime * 5);
		var gradientValue = Math.round((Math.min(Math.max(api.normalizedTime, 0), 1)) * 127);
		var rampColorSky = getPixel(colorsGradient, 1, gradientValue);
		var rampColorClouds = getPixel(colorsGradient, 32, gradientValue);
		var rampColorLight = getPixel(colorsGradient, 60, gradientValue);
		var rampColorFog = getPixel(colorsGradient, 1, gradientValue);
		if (rainEnabled){
			var grey = Math.round( ( rampColorSky.r + rampColorSky.g + rampColorSky.b ) / 3 );
			rampColorSky.r = grey;
			rampColorSky.g = grey;
			rampColorSky.b = grey;
			grey = Math.round( ( rampColorFog.r + rampColorFog.g + rampColorFog.b ) / 3 );
			rampColorFog.r = grey;
			rampColorFog.g = grey;
			rampColorFog.b = grey;
			grey = Math.round( ( rampColorLight.r + rampColorLight.g + rampColorLight.b ) / 3 );
			rampColorLight.r = grey;
			rampColorLight.g = grey;
			rampColorLight.b = grey;
		}
		var cos = Math.abs(Math.cos((sunRotation / 2) - 0.75)); 
		starsMat.opacity = cos;
		var sunCol = new THREE.Color("rgb("+rampColorLight.r+","+rampColorLight.g+","+rampColorLight.b+")");
		lightSun.color = sunCol;
		if (api.cloudsActiv){
			pMaterial.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		}
		OEV.earth.forestMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		OEV.earth.vineyardMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		OEV.earth.grassMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		lightAmbiant.color.r = rampColorLight.r / 400;
		lightAmbiant.color.g = rampColorLight.g / 400;
		lightAmbiant.color.b = rampColorLight.b / 400;
		if (fogActive) {
			OEV.scene.fog.color = new THREE.Color("rgb("+rampColorFog.r+","+rampColorFog.g+","+rampColorFog.b+")");
		}
		OEV.MUST_RENDER = true;
		api.evt.fireEvent("SUN_CHANGED");
	},
	
	activSky : function(_state) {
		if (OEV.appStarted === false) return false;
		if (_state) {
			createSkyNew(OEV.earth.radius * 0.7);
			api.setSunTime(0.5);
			updateSkyNew();
		} else {
			removeSkyNew();
		}
	}, 
	
	clearClouds : function() {
		if (particleSystem != undefined) {
			particleSystem.geometry.dispose();
			OEV.scene.remove(particleSystem);
			particleSystem = undefined;
		}
		api.cloudsActiv = false;
		OEV.MUST_RENDER = true;
	}, 
	
	updateCloudsPos : function() {
		if (particleSystem != undefined){
			particleSystem.position.x = api.posCenter.x;
			particleSystem.position.y = api.posCenter.y;
			particleSystem.position.z = api.posCenter.z;
			particleSystem.scale.x = OEV.earth.globalScale;
			particleSystem.scale.y = OEV.earth.globalScale;
			particleSystem.scale.z = OEV.earth.globalScale;
			pMaterial.size = 800 * OEV.earth.globalScale;
		}
		stars.position.x = api.posCenter.x;
		stars.position.y = api.posCenter.y;
		stars.position.z = api.posCenter.z;
		stars.scale.x = OEV.earth.globalScale;
		stars.scale.y = OEV.earth.globalScale;
		stars.scale.z = OEV.earth.globalScale;
		starsMat.size = 30 * OEV.earth.globalScale;
	}, 

	makeClouds : function() {
		api.cloudsActiv = true;
		var ptDist = OEV.earth.radius * 0.8;
		var particleCount = 1000;
		var particles = new THREE.Geometry();
		if (pMaterial == undefined){
			pMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 800, map: NET_TEXTURES.texture('cloud')});
			pMaterial.alphaTest = 0.4;
			pMaterial.transparent = true;
		}
		var pos = new THREE.Vector3( 0, 0, 0 );
		var distToCenter;
		var groupAngX;
		var groupPos;
		var ptPos = new THREE.Vector3( 0, 0, 0 );
		var nbInGroup = 0;
		var groupHeight;
		var ptByGroup = 200;
		for (var p = 0; p < particleCount; p++) {
			if( nbInGroup % ptByGroup == 0 ){
				ptByGroup = Math.round( 50 + ( 300 * Math.random() ) );
				distToCenter = ( OEV.earth.radius * 0.1 ) + ( ( OEV.earth.radius * 0.6 ) * Math.random() );
				groupAngX = Math.random() * 6.28;
				groupPos = new THREE.Vector3( Math.cos( groupAngX ) * distToCenter, 0 - ( ( OEV.earth.radius * 0.8 ) - distToCenter ) * 0.2, Math.sin( groupAngX ) * distToCenter );
				groupHeight = ( Math.random() * 0.6 ) + 0.1;
			}
			var ptAngX = Math.random() * 6.28;
			var ptDist = ( Math.random() * ( OEV.earth.meter * 1000000 ) ) + ( OEV.earth.meter * 10000 );
			ptPos.x = Math.cos( ptAngX ) * ( ptDist * Math.random() );
			if( Math.random() < 0.5 ){
				ptPos.y = ( ( OEV.earth.meter * 1000000 ) - ptDist ) * ( groupHeight * Math.random() );
			}else{
				ptPos.y = 0 - ( ( OEV.earth.meter * 1000000 ) - ptDist ) * ( groupHeight * Math.random() );
			}
			ptPos.z = Math.sin( ptAngX ) * ( ptDist * Math.random() );
			nbInGroup ++;
			var pX = pos.x + groupPos.x + ptPos.x;
			var pY = pos.y + groupPos.y + ptPos.y;
			var pZ = pos.z + groupPos.z + ptPos.z;
			var particle = new THREE.Vector3( pX, pY, pZ );
			particles.vertices.push( particle );
		}
		particleSystem = new THREE.Points(particles, pMaterial);
		particleSystem.position.x = api.posCenter.x;
		particleSystem.position.y = api.posCenter.y;
		particleSystem.position.z = api.posCenter.z;
		OEV.scene.add(particleSystem);
		OEV.MUST_RENDER = true;
	},
	
	makeStars : function() {
		var starsGeom = new THREE.Geometry();
		var angleH = 0;
		var angleV = 0;
		var dist = OEV.earth.radius * 0.75;
		var grounpNb = 20;
		var nbStars = 0;
		for( var i = 0; i < 200; i++ ){
			if( nbStars % grounpNb == 0 ){
				angleH = Math.random() * Math.PI;
				angleV = Math.random() * 3;
				angleV -= Math.PI / 2;
				grounpNb = 10 + Math.round( Math.random() * 15 );
			}
			var myDist = dist;
			var myAngleH = angleH + ( ( Math.random() * 1.2 ) - 0.6 );
			var myAngleV = angleV + ( ( Math.random() * 1.2 ) - 0.6 );
			var orbitRadius = Math.sin( myAngleV ) * myDist;
			var posX = Math.sin( myAngleH ) * orbitRadius;
			var posY = 0 - Math.cos( myAngleV ) * myDist;
			var posZ = Math.cos( myAngleH ) * orbitRadius;
			starsGeom.vertices.push( new THREE.Vector3( posX, posY, posZ ) );
			nbStars ++;
		}
		starsMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 30, transparent: true, fog: false });
		stars = new THREE.Points( starsGeom, starsMat );
		stars.position.x = api.posCenter.x;
		stars.position.y = api.posCenter.y;
		stars.position.z = api.posCenter.z;
		OEV.scene.add( stars );
	}, 
	
	loadWeather : function(_zoom, _tileX, _tileY) {
		OEV.earth.tilesWeatherMng.getDatas(api, _zoom+'/'+_tileX+'/'+_tileY, _tileX, _tileY, _zoom, 0);
	},
	
	onCurTileChanged : function() {
		if (weatherEnabled) {
			if( OEV.earth.CUR_ZOOM >= 11 ){
				var newTile = Oev.Geo.coordsToTile(OEV.earth.coordDetails.x, OEV.earth.coordDetails.y, 11);
				loadWeather(11, newTile.x, newTile.y);
			}
		}
	}, 
	
	onLodChanged : function() {
		/*
		if (OEV.earth.curLOD == OEV.earth.LOD_CITY) {
			snowEmiter = new RainEmiter(api);
		}else if (snowEmiter != undefined) {
			snowEmiter.dispose();
			snowEmiter = undefined;
		}
		*/
		// updateShadow();
	}, 
	
	updateCameraLookat : function(_pos) {
		api.posCenter.x = _pos.x;
		api.posCenter.y = _pos.y;
		api.posCenter.z = _pos.z;
		updateSkyPosition();
	}
};

function updateShadow() {
	var factor = 0.002;
	lightSun.shadow.camera.far = OEV.earth.radius * OEV.earth.globalScale;
	lightSun.shadow.camera.near = 1;
	lightSun.shadow.mapSize.width = 2048;
	lightSun.shadow.mapSize.height = 2048;
	
	lightSun.shadow.camera.left = lightSun.shadow.camera.far * factor * -1;
	lightSun.shadow.camera.right = lightSun.shadow.camera.far * factor;
	lightSun.shadow.camera.top = lightSun.shadow.camera.far * factor;
	lightSun.shadow.camera.bottom = lightSun.shadow.camera.far * factor * -1;
}


function updateStarsPos() {
	stars.position.x = api.posCenter.x;
	stars.position.y = api.posCenter.y;
	stars.position.z = api.posCenter.z;
}

function updateSkyPosition() {
	if (skyMeshNew === null) {
		return false;
	}
	skyMeshNew.position.x = api.posCenter.x;
	skyMeshNew.position.y = api.posCenter.y;
	skyMeshNew.position.z = api.posCenter.z;
	sunMeshNew.position.x = skyParamsNew.sunPosition.x + api.posCenter.x;
	sunMeshNew.position.y = skyParamsNew.sunPosition.y + api.posCenter.y;
	sunMeshNew.position.z = skyParamsNew.sunPosition.z + api.posCenter.y;
	lightSun.position.x = sunMeshNew.position.x;
	lightSun.position.y = sunMeshNew.position.y;
	lightSun.position.z = sunMeshNew.position.z;
}


function getImageData(image) {
	var canvas = document.createElement( 'canvas' );
	canvas.width = image.width;
	canvas.height = image.height;
	var context = canvas.getContext( '2d' );
	context.drawImage( image, 0, 0 );
	return context.getImageData( 0, 0, image.width, image.height );
}

function getPixel(imagedata, x, y) {
	var position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
	return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
}
	
export { api as default}


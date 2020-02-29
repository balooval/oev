import { Vector2, Scene, PerspectiveCamera, WebGLRenderer, PCFSoftShadowMap, Raycaster, RepeatWrapping, TextureLoader, ShaderMaterial, Mesh, Geometry, Vector3, Face3, DoubleSide, DirectionalLight, AmbientLight, Matrix4, SphereGeometry, Color, Fog, Texture, MeshPhysicalMaterial, BufferAttribute, BufferGeometry, SpriteMaterial, Sprite, Interpolant, DefaultLoadingManager, LoaderUtils, FileLoader, SpotLight, PointLight, MeshBasicMaterial, ShaderLib, UniformsUtils, InterleavedBuffer, InterleavedBufferAttribute, Loader as Loader$1, LinearFilter, LinearMipMapLinearFilter, RGBFormat, PointsMaterial, Material, LineBasicMaterial, VertexColors, MeshStandardMaterial, sRGBEncoding, SkinnedMesh, TriangleStripDrawMode, TriangleFanDrawMode, LineSegments, Line, LineLoop, Points, Group, Math as Math$1, OrthographicCamera, InterpolateLinear, AnimationClip, Bone, Object3D, PropertyBinding, Skeleton, NearestFilter, NearestMipMapNearestFilter, LinearMipMapNearestFilter, NearestMipMapLinearFilter, ClampToEdgeWrapping, MirroredRepeatWrapping, InterpolateDiscrete, RGBAFormat, FrontSide, VectorKeyframeTrack, QuaternionKeyframeTrack, NumberKeyframeTrack, ObjectLoader, MeshPhongMaterial, Clock } from './libs/three.module.js';
import { BufferGeometryUtils } from './libs/BufferGeometryUtils-module.js';
import PolygonClipping from './libs/polygon-clipping.esm.js';

class Evt {

	constructor() {
		this.events = new Map();
		this.listeners = new Map();
	}

	addEventListener(_evtName, _listener, _callback) {
		if (!this.events.has(_evtName)) {
			this.events.set(_evtName, []);
			this.listeners.set(_evtName, []);
		}
		this.events.get(_evtName).push(_callback);
		this.listeners.get(_evtName).push(_listener);
	}

	removeEventListener(_evtName, _listener, _callback) {
		var index = -1;
		if (!this.events.has(_evtName)) return false;
		const listeners = this.listeners.get(_evtName);
		const events = this.events.get(_evtName);
		for (let i = 0; i < listeners.length; i ++) {
			if (listeners[i] == _listener && events[i] == _callback) {
				index = i;
				break;
			}
		}
		if (index < 0){
			// console.error('removeEventListener "' + _evtName + '" NOT found');
			return false;
		}
		this.events.get(_evtName).splice(index, 1);
		listeners.splice(index, 1);
	}

	fireEvent(_evtName, _args = []) {
		if (!this.events.has(_evtName)) return false;
		var evs = this.events.get(_evtName).slice(0);
		var lst = this.listeners.get(_evtName).slice(0);
		var listenerNb = evs.length;
		for (let i = 0; i < listenerNb; i++) {
			evs[i].call(lst[i], _args);
		}
	}
}

let webGlRenderer = undefined;
let sceneWidth = 0;
let sceneHeight = 0;
let containerOffset;
let raycaster;

const api = {
    scene : undefined, 
    camera : undefined, 
    MUST_RENDER : true, 
    shadowsEnabled : true, 
    
    init : function(_htmlContainer) {
        const elmtHtmlContainer = document.getElementById(_htmlContainer);
        containerOffset = new Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
        const parentElmt = elmtHtmlContainer.parentNode;
        const intElemClientWidth = elmtHtmlContainer.clientWidth;
        const intElemClientHeight = parentElmt.clientHeight;
        sceneWidth = Math.min(intElemClientWidth, 13000);
        sceneHeight = Math.min(intElemClientHeight, 10000);
        api.scene = new Scene();
        api.camera = new PerspectiveCamera(90, sceneWidth / sceneHeight, 0.1, 20000);

        var canvas = document.createElement( 'canvas' );
        var context = canvas.getContext('webgl2');
        webGlRenderer = new WebGLRenderer({
            canvas: canvas, context: context, 
            alpha: true, 
            clearAlpha: 1, 
            antialias: true, 
        });
        webGlRenderer.setSize(sceneWidth, sceneHeight);
        elmtHtmlContainer.appendChild(webGlRenderer.domElement);
        api.camera.position.x = 0;
        api.camera.position.y = 0;
        api.camera.position.z = 500;	
        webGlRenderer.setClearColor(0x101020, 1);
        webGlRenderer.shadowMap.enabled = true;
        webGlRenderer.shadowMap.type = PCFSoftShadowMap;
        raycaster = new Raycaster();
    },  

    domContainer : function() {
        return webGlRenderer.domElement;
    }, 

    sceneSize : function() {
        return [sceneWidth, sceneHeight];
    }, 

    render : function() {
        if (api.MUST_RENDER) {
            webGlRenderer.render(api.scene, api.camera);
            api.MUST_RENDER = false;
        }
    }, 

    checkMouseWorldPos : function(_x, _y, _object) {
		const mX = ((_x - containerOffset.x) / sceneWidth) * 2 - 1;
		const mY = -((_y - containerOffset.y) / sceneHeight) * 2 + 1;
		raycaster.near = api.camera.near;
		raycaster.far = api.camera.far;
		raycaster.setFromCamera(new Vector2(mX, mY), api.camera);
		const intersects = raycaster.intersectObjects(_object.children);
		let coord = undefined;
		intersects.forEach(i => coord = i.point);
		return coord;
	}, 
};

window.debug = () => console.log(webGlRenderer.info);

const api$1 = {
	curMouseX : 0, 
	curMouseY : 0, 
	mouseBtnLeftState : false, 
	mouseBtnMiddleState : false, 
	mouseBtnRightState : false, 
	evt : new Evt(), 
	
	init : function() {
		document.onmousemove = api$1.onMouseMove;
		const domContainer = api.domContainer();
		domContainer.addEventListener('mousewheel', api$1.onMouseWheel, {passive: true});
		domContainer.addEventListener('mousedown',api$1.onMouseDown,false);
		domContainer.addEventListener('mouseup',api$1.onMouseUp,true);
		domContainer.addEventListener('contextmenu', e => e.preventDefault(), true);
	}, 
	
	onMouseDown : function(_evt) {
		switch (_evt.button) {
			case 0:
				api$1.mouseBtnLeftState = true;
				onMouseLeftDown();
			break;
			case 1:
				api$1.mouseBtnMiddleState = true;
			break;
			case 2:
				api$1.mouseBtnRightState = true;
				onMouseRightDown();
			break;
		}
	}, 
	
	onMouseUp : function(_evt) {
		switch ( _evt.button) {
			case 0:
				api$1.mouseBtnLeftState = false;
				onMouseLeftUp();
			break;
			case 1:
				api$1.mouseBtnMiddleState = false;
			break;
			case 2:
				api$1.mouseBtnRightState = false;
				onMouseRightUp();
			break;
		}
	}, 
	
	onMouseMove : function(_evt) {
		api$1.curMouseX = _evt.clientX;
		api$1.curMouseY = _evt.clientY;
	}, 
	
	onMouseWheel : function(_evt) {
		var delta = _evt.wheelDelta / 360;
		api$1.evt.fireEvent('MOUSE_WHEEL', delta);
	}, 
};


function onMouseLeftDown() {
	api$1.evt.fireEvent('MOUSE_LEFT_DOWN');
}
function onMouseRightDown() {
	api$1.evt.fireEvent('MOUSE_RIGHT_DOWN');
}

function onMouseLeftUp() {
	api$1.evt.fireEvent('MOUSE_LEFT_UP');
}
function onMouseRightUp() {
	api$1.evt.fireEvent('MOUSE_RIGHT_UP');
}

let lastKeyDown = -1;
let lastKeyUp = -1;

const api$2 ={
	evt : new Evt(), 

	init : function() {
		document.addEventListener('keydown', api$2.onKeyDown);
		document.addEventListener('keyup', api$2.onKeyUp);
	}, 
	
	onKeyDown : function(event) {
		var key = event.keyCode;
		// var keychar = String.fromCharCode(key);
		// console.log('onKeyDown' + key + ' / ' + keychar);
		if (lastKeyDown != key ){
			lastKeyUp = -1;
			lastKeyDown = key;
			api$2.evt.fireEvent('ON_KEY_DOWN');
		}
	}, 
			
	onKeyUp : function(evt) {
		var key = evt.keyCode;
		if (lastKeyUp != key) {
			lastKeyDown = -1;
			lastKeyUp = key;
			api$2.evt.fireEvent('ON_KEY_UP');
		}
	}, 
};

function init() {
	api$1.init();
	api$2.init();
}

let activesExtensions = [];
const extensions = {};

const evt = new Evt();

function listActives() {
	return activesExtensions;
}

function register(_id, _extension) {
	extensions[_id] = _extension;
}

function activate(_extensionId) {
	activesExtensions.push(_extensionId);
	evt.fireEvent('TILE_EXTENSION_ACTIVATE', _extensionId);
	evt.fireEvent('TILE_EXTENSION_ACTIVATE_' + _extensionId);
}

function desactivate(_extensionId) {
	activesExtensions = activesExtensions.filter(extId => extId != _extensionId);
	evt.fireEvent('TILE_EXTENSION_DESACTIVATE', _extensionId);
	evt.fireEvent('TILE_EXTENSION_DESACTIVATE_' + _extensionId);
}

let waiting = [];
const loaded = {};
let loading = false;
let callback;

function get(_name) {
	return loaded[_name];
}

function loadList(_shadersNames, _callback) {
	callback = _callback;
	_shadersNames.forEach(n => load(n));
}

function load(_shaderName) {
	waiting.push('vert_' + _shaderName);
	waiting.push('frag_' + _shaderName);
	loadNext();
}

function loadNext() {
	if (loading) return false;
	const fileName = waiting.pop();
	if (!fileName) {
		callback();
		return false;
	}
	loadFile(fileName);
}

function onFileLoaded(_name, _content) {
	loading = false;
	waiting = waiting.filter(f => f != _name);
	loaded[_name] = _content;
	loadNext();
}

function loadFile(_name) {
	loading = true;
	fetch('assets/shaders/' + _name + '.glsl')
	.then(function(response) {
		return response.text();
	})
	.then(function(_glsl) {
		onFileLoaded(_name, _glsl);
	}).catch(function(error) {console.log('Fetch error :', error);});
}

const batchs = [];
const textLoaded = {};
let textureLoader = null;
let curBatch = null;
let serveurUrl;

function init$1(_serveurUrl) {
	serveurUrl = _serveurUrl;
	textureLoader = new TextureLoader();
}

function texture(_name) {
	return textLoaded[_name];
} 

function addToList(_list, _id, _url) {
	_list.push({id:_id, url:_url});
}

function loadFile$1(_id, _url, _callback) {
	loadBatch([{id:_id, url:_url}], _callback);
}

function loadBatch(_list, _callback) {
	// TODO: si ressource déjà chargée appeler la callback de suite
	const batch = {
		callback : _callback, 
		list : _list, 
	};
	batchs.push(batch);
	if (curBatch === null) loadNextBatch();
}

function loadNextBatch() {
	if (batchs.length == 0) {
		curBatch = null;
		return false;
	}
	curBatch = batchs.shift();
	loadNextTexture();
}

function loadNextTexture() {
	const nextText = curBatch.list.shift();
	textureLoader.load(
		serveurUrl + '/' + nextText.url, 
		t => {
			textLoaded[nextText.id] = t;
			textLoaded[nextText.id].wrapS = textLoaded[nextText.id].wrapT = RepeatWrapping;
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextTexture();
			}
		}, 
		xhr => {},
		xhr => console.warn('NetTextures error for loading', nextText.url)
	);
}

let meshClouds = null;
let materialClouds = null;

const api$3 = {
	create : function() {
		loadFile$1('cloud', 'cloud.png', createMesh);
	}, 

	setTime : function(_time) {
		if (!materialClouds) return false;
		materialClouds.uniforms.normalizedTime.value = _time;
	}
};

function createMesh() {
	const shaderParams = {
		vertexShader: get('vert_cloud'), 
		fragmentShader: get('frag_cloud'),
		uniforms: {
			map : {type: "t", value: texture('cloud')}, 
			normalizedTime : {value : 0.5}, 
		}, 
		side: DoubleSide, 
		transparent: true, 
		depthWrite: false, 
	};
	materialClouds = new ShaderMaterial(shaderParams);
	meshClouds = new Mesh(new Geometry(), materialClouds);
	const groupPos = new Vector3();
	const groupsDispertion = 5000;
	const doublePi = Math.PI * 2;
	for (let c = 0; c < 30; c ++) {
		if (c % 5 == 0) {
			groupPos.x = Math.random() * groupsDispertion - groupsDispertion / 2;
			groupPos.y = (Math.random() * groupsDispertion / 10 + groupsDispertion / 20) * -1;
			groupPos.z = Math.random() * groupsDispertion - groupsDispertion / 2;
		}
		const faceWidth = 10;
		const faceHeight = 10;
		const geoFinal = new Geometry();
		for (let i = 0; i < 8; i ++) {
			const geo = new Geometry();
			const tileOffset = Math.random() > 0.5 ? 0.5 : 0;
			const faceRotX = (Math.random() * doublePi) - Math.PI;
			const faceRotY = (Math.random() * doublePi) - Math.PI;
			geo.vertices.push(new Vector3(
				-1 * faceWidth, 
				1 * faceHeight,  
				0
			));
			geo.vertices.push(new Vector3(
				-1 * faceWidth, 
				-1 * faceHeight, 
				0
			));
			geo.vertices.push(new Vector3(
				1 * faceWidth, 
				-1 * faceHeight,  
				0
			));
			geo.vertices.push(new Vector3(
				1 * faceWidth, 
				1 * faceHeight,  
				0
			));
			geo.faces.push(new Face3(0, 2, 1));
			geo.faces.push(new Face3(0, 3, 2));
			geo.faceVertexUvs[0][0] = [
				new Vector2(tileOffset, 0),
				new Vector2(tileOffset + 0.5, 1),
				new Vector2(tileOffset, 1)
			];
			geo.faceVertexUvs[0][1] = [
				new Vector2(tileOffset, 0),
				new Vector2(tileOffset + 0.5, 0),
				new Vector2(tileOffset + 0.5, 1)
			];
			const tmpMesh = new Mesh(geo);
			tmpMesh.rotation.x = faceRotX;
			tmpMesh.rotation.y = faceRotY;
			geoFinal.mergeMesh(tmpMesh);
		}
		geoFinal.computeFaceNormals();
		geoFinal.computeVertexNormals();
		geoFinal.uvsNeedUpdate = true;
		geoFinal.verticesNeedUpdate = true;
		const curCloudMesh = new Mesh(geoFinal);
		const dispertion = 500;
		curCloudMesh.position.x = groupPos.x + (Math.random() * dispertion - dispertion / 2);
		curCloudMesh.position.y = groupPos.y + ((Math.random() * dispertion / 10 + dispertion / 20) * -1);
		curCloudMesh.position.z = groupPos.z + (Math.random() * dispertion - dispertion / 2);
		const curScale = 4 + (Math.random() * 40);
		curCloudMesh.scale.x = curScale * 2;
		curCloudMesh.scale.y = curScale;
		curCloudMesh.scale.z = curScale;
		meshClouds.geometry.mergeMesh(curCloudMesh);
	}
	api.scene.add(meshClouds);
}

let lightAmbiant = undefined;
let colorsGradient = undefined;
let lightSun;
let orbitRadius = 0;
let meshSun = null;
const posCenter = new Vector3(0, 0, 0);
const sunParams = {
	position : new Vector3(0, 0, 0), 
	inclinaison : 0, 
	azimuth : 0, 
	luminosity : 0.2, 
};

const api$4 = {
	
	init : function() {
		colorsGradient = getImageData(texture('sky_gradient').image);	
		lightSun = new DirectionalLight(0xffffff, 1);
		api.scene.add(lightSun);
		lightAmbiant = new AmbientLight(0x25282d);
		api.scene.add(lightAmbiant);
		api$a.evt.addEventListener('ZOOM_CHANGE', null, onZoomChanged);
		lightSun.castShadow = true;
		updateShadow(4);
	}, 
	
	activate : function(_state) {
		if (_state) {
			createSun(api$a.radius * 0.7);
			api$4.setTime(0.5);
		} else {
			removeSun();
		}
	}, 

	setTime : function(_time) {
		updateSunColor(_time);
		updateSunPosition();
		return sunParams;
	}, 	
	
	setPosition : function(_pos) {
		posCenter.x = _pos.x;
		posCenter.y = _pos.y;
		posCenter.z = _pos.z;
		updateSunPosition();
	}
};

function onZoomChanged(_zoom) {
	updateShadow(_zoom);
}

function createSun(_skyRadius) {
	if (meshSun) return false;
	orbitRadius = _skyRadius * 0.9;
	const sunRadius = _skyRadius / 40;
	const uniformsSun = {
		sunElevation : {value : 0.5}, 
		myModelViewMatrixInverse : {value: new Matrix4()}, 
	};
	const parametersSun = {
		fragmentShader: get('frag_sun'),
		vertexShader: get('vert_sun'),
		uniforms: uniformsSun, 
		transparent: true, 
	};
	const materialSun = new ShaderMaterial(parametersSun);
	// const geoSun = new THREE.PlaneGeometry(sunRadius, sunRadius, 4);
	const geoSun = new SphereGeometry(sunRadius, 16, 16);
	meshSun = new Mesh(geoSun, materialSun);
	api.scene.add(meshSun);
}

function updateSunColor(_time) {
	if (meshSun === null) return false;
	sunParams.azimuth = (_time * -2) + 1;
	sunParams.inclinaison = Math.cos(_time * Math.PI * 2);
	let dayLightTime = Math.sin((_time) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	sunParams.luminosity = dayLightTime;
	meshSun.material.uniforms.sunElevation.value = Math.abs(sunParams.inclinaison);
	var gradientValue = Math.round((Math.min(Math.max(_time, 0), 1)) * 127);
	var rampColorLight = getPixel(colorsGradient, 60, gradientValue);
	var sunCol = new Color('rgb(' + rampColorLight.r + ',' + rampColorLight.g + ',' + rampColorLight.b + ')');
	lightSun.color = sunCol;
	lightAmbiant.color.r = rampColorLight.r / 400;
	lightAmbiant.color.g = rampColorLight.g / 400;
	lightAmbiant.color.b = rampColorLight.b / 400;
	api.MUST_RENDER = true;
}

function updateShadow(_zoom) {
	// const factor = 0.002;
	const factor = (20 - _zoom) / 50000;
	lightSun.shadow.camera.far = api$a.radius * api$a.globalScale;
	lightSun.shadow.camera.near = 1;
	lightSun.shadow.mapSize.width = 2048;
	lightSun.shadow.mapSize.height = 2048;
	lightSun.shadow.camera.left = lightSun.shadow.camera.far * factor * -1;
	lightSun.shadow.camera.right = lightSun.shadow.camera.far * factor;
	lightSun.shadow.camera.top = lightSun.shadow.camera.far * factor;
	lightSun.shadow.camera.bottom = lightSun.shadow.camera.far * factor * -1;
	lightSun.shadow.camera.updateProjectionMatrix();
	api.MUST_RENDER = true;
}

function updateSunPosition() {
	if (!meshSun) return false;
	sunParams.position.x = Math.sin(sunParams.azimuth * Math.PI * 1) * (orbitRadius * Math.cos(sunParams.inclinaison * Math.PI * 0.5));
	sunParams.position.y = Math.sin(sunParams.inclinaison * Math.PI * 0.5) * orbitRadius;
	sunParams.position.z = 0 - Math.cos(sunParams.azimuth * Math.PI * 1) * (orbitRadius * Math.cos(sunParams.inclinaison * Math.PI * 0.5));
	meshSun.position.x = sunParams.position.x + posCenter.x;
	meshSun.position.y = sunParams.position.y + posCenter.y;
	meshSun.position.z = sunParams.position.z + posCenter.y;
	lightSun.position.x = meshSun.position.x;
	lightSun.position.y = meshSun.position.y;
	lightSun.position.z = meshSun.position.z;
	lightSun.target = api$a.cameraControler.pointer;
	api.MUST_RENDER = true;
}

function removeSun() {
	api.scene.remove(meshSun);
	meshSun.geometry.dispose();
	meshSun.material.dispose();
	meshSun = null;
}

function getImageData(image) {
	var canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	var context = canvas.getContext( '2d' );
	context.drawImage( image, 0, 0 );
	return context.getImageData(0, 0, image.width, image.height);
}

function getPixel(imagedata, x, y) {
	const position = (x + imagedata.width * y) * 4;
	const data = imagedata.data;
	return {
		r: data[position + 0], 
		g: data[position + 1], 
		b: data[position + 2], 
		a: data[position + 3]
	};
}

window.toto = function(_val) {
	lightSun.shadow.radius = _val;
	api.MUST_RENDER = true;
};

let meshSky = null;
let skyParams = {
	radius : 100, 
	transmission : 0.5, 
};

const api$5 = {
	
	activate : function(_state) {
		if (_state) {
			createSky(api$a.radius * 0.7);
		} else {
			removeSky();
		}
    }, 
    
    setTime : function(_time, _sunParams) {
		updateSkyColor(_time, _sunParams);
	}, 	
	
	setPosition : function(_position) {
		updateSkyPosition(_position);
	}
};

function createSky(_skyRadius) {
	if (meshSky !== null) return false;
	skyParams.radius = _skyRadius * 0.9;
	const uniformsSky = {
		skyRadius : {value : _skyRadius}, 
		sunPos : {value : new Vector3(0,0,0)}, 
		sunLuminosity : {value : 0.5}, 
	};
	const parametersSky = {
		vertexShader: get('vert_sky'),
		fragmentShader: get('frag_sky'),
		uniforms: uniformsSky, 
		side: DoubleSide, 
	};
	const materialSky = new ShaderMaterial(parametersSky);
	meshSky = new Mesh(new SphereGeometry(_skyRadius, 32, 32), materialSky);
	api.scene.add(meshSky);
}

function updateSkyColor(_time, _sunParams) {
	if (meshSky === null) return false;
	let dayLightTime = Math.sin((_time) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	skyParams.transmission = Math.max((1 - dayLightTime) * 2, 0.4);
	const transmission = new Vector3();
	transmission.x = _sunParams.position.x * skyParams.transmission;
	transmission.y = _sunParams.position.y * skyParams.transmission;
	transmission.z = _sunParams.position.z * skyParams.transmission;
	meshSky.material.uniforms.sunPos.value = transmission;
	meshSky.material.uniforms.sunLuminosity.value = _sunParams.luminosity;
}

function updateSkyPosition(_position) {
	if (meshSky === null) return false;
	meshSky.position.x = _position.x;
	meshSky.position.y = _position.y;
	meshSky.position.z = _position.z;
	api.MUST_RENDER = true;
}

function removeSky() {
	api.scene.remove(meshSky);
	meshSky.geometry.dispose();
	meshSky.material.dispose();
	meshSky = null;
}

const posCenter$1 = new Vector3(0, 0, 0);

const api$6 = {
	
	init : function() {
		api$a.evt.addEventListener('TIME_CHANGED', api$6, api$6.onTimeChanged);
		api$a.cameraControler.evt.addEventListener('CAM_UPDATED', api$6, api$6.onCameraUpdated);
		{
			// Renderer.scene.fog = new THREE.Fog(0x91b8fb, 200, 500);
			api.scene.fog = new Fog(0x86aaff, 500, 2000);
		}
		api$4.init();
		api$a.evt.addEventListener('LOD_CHANGED', api$6, api$6.onLodChanged);
		api$6.onLodChanged();
		api$6.onTimeChanged(0.5);
	}, 
	
	activate : function(_state) {
		api$4.activate(_state);
		api$5.activate(_state);
		if (_state) {
			api$3.create();
			api$6.onTimeChanged(0.5);
		}
	}, 

	onTimeChanged : function(_time) {
		const sunParams = api$4.setTime(_time);
		api$5.setTime(_time, sunParams);
		api$3.setTime(_time);
	}, 	
	
	onCameraUpdated : function(_datas) {
		posCenter$1.x = _datas.posLookat.x;
		posCenter$1.y = _datas.posLookat.y;
		posCenter$1.z = _datas.posLookat.z;
		api$5.setPosition(posCenter$1);
		api$4.setPosition(posCenter$1);
	}, 

	onLodChanged : function() {

	}, 
};

const api$7 = {

	radians : function(_degres){
		return Math.PI * _degres / 180;
	}, 

	degree : function(radians){
		return 180 * radians / Math.PI;
	}, 

	isClosedPath(_polygon) {
		const first = _polygon[0];
		const last = _polygon[_polygon.length - 1];
		if (first[0] != last[0]) return false;
		if (first[1] != last[1]) return false;
		return true;
	}, 

	fixPolygonDirection : function(_polygon, _counterClockwise = false) {
		if (!_polygon.length) return _polygon;
		let curve = 0;
		const pointsNb = _polygon.length;
		for (let p = 1; p < pointsNb; p ++) {
			const prevPoint = _polygon[p - 1];
			const curPoint = _polygon[p];
			curve += (curPoint[0] - prevPoint[0]) * (curPoint[1] + prevPoint[1]);
		}
		const prevPoint = _polygon[pointsNb - 1];
		const curPoint = _polygon[0];
		curve += (curPoint[0] - prevPoint[0]) * (curPoint[1] + prevPoint[1]);
		
		if (!_counterClockwise && curve > 0) _polygon.reverse();
		if (_counterClockwise && curve < 0) _polygon.reverse();
		// if (curve > 0) _polygon.reverse();
		return _polygon;
	}, 
		
	angle2D : function(x1, y1, x2, y2) {
		var dtheta,theta1,theta2;
		theta1 = Math.atan2( y1, x1 );
		theta2 = Math.atan2( y2, x2 );
		dtheta = theta2 - theta1;
		while( dtheta > Math.PI ){
			dtheta -= ( Math.PI * 2 );
		}
		while( dtheta < -Math.PI ){
			dtheta += ( Math.PI * 2 );
		}
		return dtheta;
	}, 
	
	ptIsInPolygon : function(poly, _lon, _lat) {
		for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
	((poly[i][1] <= _lat && _lat < poly[j][1]) || (poly[j][1] <= _lat && _lat < poly[i][1]))
	&& (_lon < (poly[j][0] - poly[i][0]) * (_lat - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
	&& (c = !c);
	return c;
	}, 

	ptIsInPolygonOk : function(_polygon, _lon, _lat) {
		var angle = 0;
		var ptA;
		var ptB;
		var segNb = _polygon.length - 1;
		for( var i = 0; i < segNb; i++ ){
			ptA = _polygon[i];
			ptB = _polygon[i+1];
			angle += api$7.angle2D( ptA[0]-_lon, ptA[1]-_lat, ptB[0]-_lon, ptB[1]-_lat );
		}
		if( Math.abs( angle ) < Math.PI ){
			return false;
		}
		return true;
	}, 
	
	findCentroid : function (pts){
		var nPts = pts.length;
		var off = pts[0];
		var twicearea = 0;
		var x = 0;
		var y = 0;
		var p1,p2;
		var i;
		var j;
		var f;
		for (i = 0, j = nPts - 1; i < nPts; j = i++) {
			p1 = pts[i];
			p2 = pts[j];
			f = (p1[1] - off[1]) * (p2[0] - off[0]) - (p2[1] - off[1]) * (p1[0] - off[0]);
			twicearea += f;
			x += (p1[1] + p2[1] - 2 * off[1]) * f;
			y += (p1[0] + p2[0] - 2 * off[0]) * f;
		}
		f = twicearea * 3;
		return {
			lat: x / f + off[1],
			lon: y / f + off[0]
		};
	},

	mapValue : function(_value, _min, _max) {
		const length = Math.abs(_max - _min);
		if (length == 0) return _value;
		return (_value - _min) / length;
	}, 

};

const api$8 = {
	projection : 'PLANE', 

	coordToCanvas : function(_box, _canvasSize, _coords) {
		const points = new Array(_coords.length);
		for (let i = 0; i < _coords.length; i ++) {
			const coord = _coords[i];
			const point = [
                api$7.mapValue(coord[0], _box[0], _box[1]) * _canvasSize, 
                _canvasSize - api$7.mapValue(coord[1], _box[2], _box[3]) * _canvasSize, 
			];
			points[i] = point;
		}
		return points;
	}, 

	tileToCoords : function(_tile_x, _tile_y, _zoom) {
		const p = [];
		const n = Math.PI - ((2.0 * Math.PI * _tile_y) / Math.pow(2.0, _zoom));
		p[0] = ((_tile_x / Math.pow(2.0, _zoom) * 360.0) - 180.0);
		p[1]= (180.0 / Math.PI * Math.atan(Math.sinh(n)));
		return p;
	}, 

	tileToCoordsVect : function(_tile_x, _tile_y, _zoom){
		const res = api$8.tileToCoords(_tile_x, _tile_y, _zoom);
		return new Vector2(res[0], res[1]);
	}, 

	coordDistance : function(_startLon, _startLat, _endLon, _endLat){
		const R = 6371000; // metres
		const sigma1 = api$7.radians( _startLat );
		const sigma2 = api$7.radians( _endLat );
		const deltaSigma = api$7.radians( _endLat-_startLat );
		const deltaTruc = api$7.radians( _endLon - _startLon );
		const a = Math.sin(deltaSigma / 2) * Math.sin(deltaSigma / 2) +
				Math.cos(sigma1) * Math.cos(sigma2) *
				Math.sin(deltaTruc / 2) * Math.sin(deltaTruc / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distance = R * c;
		return distance;
	}, 

	coordsToTile : function(_lon, _lat, _zoom) {
		_zoom = Math.floor(_zoom);
		const tile = new Vector3();
		tile.x = Math.floor( (_lon + 180) / 360 * Math.pow( 2, _zoom));
		tile.y = Math.floor((1 - Math.log(Math.tan(_lat * Math.PI / 180) + 1 / Math.cos(_lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow( 2, _zoom));
		tile.z = _zoom;
		return tile;
	}, 

	// Return altitude in opengl unit
	getAltitude : function(_zoomlevel, _radius) {
		if (api$8.projection == "SPHERE") {
			const C = (Math.PI * 2) * _radius;
			return (C * Math.cos(0) / Math.pow(2, _zoomlevel));
		}
		if (api$8.projection == "PLANE") {
			return ((_radius * Math.PI * 2) / Math.pow(2, _zoomlevel));
		}
	}, 
		
	mercatorLonToX : function(_lon) {
		const r_major = 6378137.000;
		return r_major * api$7.radians(_lon);
	}, 

	mercatorLatToY : function(_lat) {
		_lat = Math.max(-89.5, Math.min(89.5, _lat));
		const r_major = 6378137.000;
		const r_minor = 6356752.3142;
		const temp = r_minor / r_major;
		const es = 1.0 - (temp * temp);
		const eccent = Math.sqrt(es);
		const phi = api$7.radians(_lat);
		const sinphi = Math.sin(phi);
		let con = eccent * sinphi;
		const com = 0.5 * eccent;
		con = Math.pow((1.0 - con) / (1.0 + con), com);
		const ts = Math.tan(0.5 * (Math.PI*0.5 - phi)) / con;
		const y = 0 - r_major * Math.log(ts);
		return y;
	}, 
};

const registeredLoaders = {};
const loadersParams = {};
let evt$1;

function init$2() {
	evt$1 = new Evt();
}

function onRessourceLoaded(_type, _nb) {
	evt$1.fireEvent('DATA_LOADED', {type:_type, nb:_nb});
}

function registerLoader(_type, _class, _params) {
	registeredLoaders[_type] = _class;
	loadersParams[_type] = _params;
}

class Loader {
	constructor(_type) {
		this._type = _type;
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this.clientsWaiting = [];
		this.loaderParams = loadersParams[_type];
		this._loaders = this._initLoaders(this.loaderParams.nbLoaders);
		evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this._type, this, this.clear);
	}

	_initLoaders(_nb) {
		const loaders = [];
		for (let i = 0; i < _nb; i ++) {
			const loader = new registeredLoaders[this._type]((_datas, _params) => this.onDataLoaded(_datas, _params));
			loaders.push(loader);
		}
		return loaders;
	}

	getData(_params, _callback) {
		_params.priority = _params.priority || 1;
		_params.key = this._genKey(_params);
		_params.callback = _callback;
		if (this._sendCachedData(_params) === true) return true;
		if (this._isWaiting(_params.key) || this._isLoading(_params.key)) {
			this.clientsWaiting.push(_params);
			return false;
		}		this._addSorted(_params);
		this._checkForNextLoad();
	}
	
	_genKey(_params) {
		_params.keyOpt = _params.keyOpt || '';
		return _params.z + '-' + _params.x + '-' + _params.y + '-' + _params.keyOpt;
	}
	
	onDataLoaded(_data, _params) {
		onRessourceLoaded(this._type, this._datasWaiting.length);
		if (_data === null) {
			console.warn('Error loading ressource');
			return false;
		}
		this._datasLoading = this._datasLoading.filter(l => l.key != _params.key);
		_params.callback(_data);
		this.clientsWaiting.filter(c => c.key == _params.key).forEach(c => c.callback(_data));
		this.clientsWaiting = this.clientsWaiting.filter(c => c.key != _params.key);
		if (this.loaderParams.useCache) this._datasLoaded[_params.key] = _data;
		if (!this.loaderParams.delay) {
			this._checkForNextLoad();
		} else {
			setTimeout(() => this._checkForNextLoad(), this.loaderParams.delay);
		}
	}
	
	_addSorted(_params) {
		_params.priority /= _params.z;
		for (let i = 0; i < this._datasWaiting.length; i ++) {
			if (_params.priority < this._datasWaiting[i].priority) {
				this._datasWaiting.splice(i, 0, _params);
				return true;
			}
		}
		this._datasWaiting.push(_params);
		return false;
	}
	
	_sendCachedData(_params) {
		if (!this._datasLoaded[_params.key]) return false;
		_params.callback(this._datasLoaded[_params.key]);
		return true;
	}
	
	abort(_params) {
		if (_params.key === undefined) _params.key = this._genKey(_params);
		this._datasWaiting = this._datasWaiting.filter(w => w.key != _params.key);
		this.clientsWaiting = this.clientsWaiting.filter(c => c.key != _params.key);
	}
	
	clear() {
		this._datasLoaded = {};
		this._datasWaiting = [];
		this._datasLoading = [];
		this.clientsWaiting = [];
	}
	
	_checkForNextLoad() {
		if (this._datasLoading.length >= this.loaderParams.nbLoaders) return false;
		this._loadNext();
		return true;
	}
	
	_loadNext() {
		if (this._datasWaiting.length == 0) return false;
		var freeLoader = this._getAvailableLoader();
		if (!freeLoader) return false;
		const currentLoadingParams = this._datasWaiting.shift();
		this._datasLoading.push(currentLoadingParams);
		freeLoader.load(currentLoadingParams);
	}
	
	_getAvailableLoader() {
		return this._loaders.filter(l => !l.isLoading).pop();
	}
	
	_isWaiting(_key) {
		return this._datasWaiting.some(w => w.key == _key);
	}
	
	_isLoading(_key) {
		return this._datasLoading.some(w => w.key == _key);
	}
}

const PARAMS = {
	nbLoaders : 4, 
	useCache : false, 
};

let API_URL = '';

function setApiUrl(_url) {
	API_URL = _url;
}

class LoaderTile2D {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.textureLoader = new TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.textureLoader.load(API_URL + '&z='+this.params.z+'&x='+this.params.x+'&y='+this.params.y, 
			_texture => loader.onDataLoadSuccess(_texture), 
			xhr => {},
			xhr => loader.onDataLoadError()
		);
	}
	
	onDataLoadSuccess(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}
	
	onDataLoadError() {
		this.isLoading = false;
		console.warn( 'LoaderTile2D error', this.params);
		this.callback(null);
	}
}

registerLoader('TILE2D', LoaderTile2D, PARAMS);
const loader = new Loader('TILE2D');

const mapSize = 256;

class TileBasic {
		
	constructor(_tileX, _tileY, _zoom) {
		this.evt = new Evt();
		this.isReady = false;
		this.onStage = true;
		this.parentTile = null;
		this.parentOffset = new Vector2(0, 0);
		this.tileX = _tileX;
		this.tileY = _tileY;
		this.zoom = _zoom;
		this.childTiles = [];
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.meshe = undefined;
		this.key = this.tileX + '_' + this.tileY + '_' + this.zoom;
		this.verticesNb = (api$a.tilesDefinition + 1) * (api$a.tilesDefinition + 1);
		this.startCoord = api$8.tileToCoordsVect(this.tileX, this.tileY, this.zoom);
		this.endCoord = api$8.tileToCoordsVect(this.tileX + 1, this.tileY + 1, this.zoom);
		this.startLargeCoord = api$8.tileToCoordsVect(this.tileX - 1, this.tileY - 1, this.zoom);
		this.endLargeCoord = api$8.tileToCoordsVect(this.tileX + 2, this.tileY + 2, this.zoom);
		this.startMidCoord = api$8.tileToCoordsVect(this.tileX - 0.5, this.tileY - 0.5, this.zoom);
		this.endMidCoord = api$8.tileToCoordsVect(this.tileX + 1.5, this.tileY + 1.5, this.zoom);
		this.middleCoord = new Vector2((this.startCoord.x + this.endCoord.x) / 2, (this.startCoord.y + this.endCoord.y) / 2);
		this.bbox = [
			this.startCoord.x, // min X
			this.endCoord.x, // max X
			this.endCoord.y, // min Y
			this.startCoord.y, // max Y
		  ];

		this.distToCam = ((api$a.coordDetails.x - this.middleCoord.x) * (api$a.coordDetails.x - this.middleCoord.x) + (api$a.coordDetails.y - this.middleCoord.y) * (api$a.coordDetails.y - this.middleCoord.y));
        
        this.extensionsMaps = new Map();
		this.composeMap = this.createCanvas();
		this.composeContext = this.composeMap.getContext('2d');
		this.diffuseTexture = new Texture(this.composeMap);
		this.diffuseTexture.needsUpdate = true;
		this.diffuseMap = null;

		this.material = new MeshPhysicalMaterial({color: 0xA0A0A0, roughness:1,metalness:0, map: this.diffuseTexture});
		// this.material = new THREE.MeshPhysicalMaterial({alphaTest:0.2,alphaMap:this.alphaMap,transparent:true,color: 0xA0A0A0, roughness:1,metalness:0, map: Texture('checker')});

		this.extensions = new Map();
		listActives().forEach(p => this.addExtension(p));
		evt.addEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
		evt.addEventListener('TILE_EXTENSION_DESACTIVATE', this, this.onExtensionDisabled);
    }
    
    redrawDiffuse() {
        this.composeContext.clearRect(0, 0, mapSize, mapSize);
		this.composeContext.drawImage(this.diffuseMap, 0, 0, 256, 256, 0, 0, mapSize, mapSize);
        this.extensionsMaps.forEach(map => {
            this.composeContext.drawImage(map, 0, 0);
        });
        this.diffuseTexture.needsUpdate = true;
        api.MUST_RENDER = true;
    }

	createCanvas() {
		const canvas = document.createElement('canvas');
		canvas.width = mapSize;
		canvas.height = mapSize;
		return canvas;
	}
	
	onExtensionActivation(_extensionId) {
		this.addExtension(_extensionId);
	}

	onExtensionDisabled(_extensionId) {
		this.removeExtension(_extensionId);
	}
	
	addExtension(_extensionId) {
		if (this.ownExtension(_extensionId)) return false;
		const ext = new extensions[_extensionId](this);
		this.extensions.set(_extensionId, ext);
		this.childTiles.forEach(t => t.addExtension(_extensionId));
		return true;
	}
	
	ownExtension(_id) {
        return this.extensions.has(_id);
	}
	
	removeExtension(_id) {
        const extension = this.extensions.get(_id);
        if (extension) {
            extension.dispose();
            this.extensions.delete(_id);
        }
		this.childTiles.forEach(t => t.removeExtension(_id));
	}

	nearestTextures() {
		if (this.textureLoaded) return null;
		const defaultDatas = {
			map : texture("checker"), 
			uvReduc : 1, 
			offsetX : 0, 
			offsetY : 0, 
		};
		if (!this.parentTile) return defaultDatas;
		let curParent = this.parentTile;
		let uvReduc = 0.5;
		let curOffsetX = this.parentOffset.x * 0.5;
		let curOffsetY = this.parentOffset.y * 0.5;
		while (curParent && !curParent.textureLoaded) {
			uvReduc *= 0.5;
			curOffsetX = curParent.parentOffset.x * 0.5 + (curOffsetX * 0.5);
			curOffsetY = curParent.parentOffset.y * 0.5 + (curOffsetY * 0.5);
			curParent = curParent.parentTile;
		}
		if (!curParent) return defaultDatas;
		return {
			map : curParent.material.map, 
			uvReduc : uvReduc, 
			offsetX : curOffsetX, 
			offsetY : curOffsetY, 
		};
	}

	applyTexture(_textureDatas) {
		if (_textureDatas === null) return false;
		if (this.meshe === undefined) return false;
		const vertBySide = api$a.tilesDefinition + 1;
		const bufferUvs = new Float32Array(this.verticesNb * 2);
		let stepUV = _textureDatas.uvReduc / api$a.tilesDefinition;
		let uvIndex = 0;
		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				uvIndex = (x * vertBySide) + y;
				bufferUvs[uvIndex * 2] = _textureDatas.offsetX + (stepUV * x);
				bufferUvs[uvIndex * 2 + 1] = 1 - (stepUV * y) - _textureDatas.offsetY;
			}
		}
		
		this.meshe.geometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
        this.meshe.geometry.attributes.uv.needsUpdate = true;
        
        this.diffuseMap = _textureDatas.map.image;
        this.evt.fireEvent('TEXTURE_CHANGED');
        this.redrawDiffuse();
	}

	getVerticesPlaneCoords() {
		const def = api$a.tilesDefinition;
		const vertBySide = def + 1;
		const vertNb = vertBySide * vertBySide;
		const bufferCoords = new Float32Array(vertNb * 2);
		let coordId = 0;
		const stepCoordX = (this.endCoord.x - this.startCoord.x) / def;
		const stepCoordY = (this.endCoord.y - this.startCoord.y) / def;
		for (let x = 0; x < vertBySide; x ++) {
			for (let y = 0; y < vertBySide; y ++) {
				bufferCoords[coordId + 0] = this.startCoord.x + (stepCoordX * x);
				bufferCoords[coordId + 1] = this.startCoord.y + (stepCoordY * y);
				coordId += 2;

			}
		}
		return bufferCoords;
	}

	buildGeometry() {
		let curVertId = 0;
		const bufferVertices = new Float32Array(this.verticesNb * 3);
		const vertCoords = this.getVerticesPlaneCoords();
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			const vertPos = api$a.coordToXYZ(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				0
			);
			bufferVertices[curVertId + 0] = vertPos.x;
			bufferVertices[curVertId + 1] = vertPos.y;
			bufferVertices[curVertId + 2] = vertPos.z;
			curVertId += 3;
		}

		const def = api$a.tilesDefinition;
		const vertBySide = def + 1;
		let faceId = 0;
		const nbFaces = (def * def) * 2;
		const bufferFaces = new Uint32Array(nbFaces * 3);
		for (let x = 0; x < def; x ++) {
			for (let y = 0; y < def; y ++) {
				bufferFaces[faceId + 0] = (x * vertBySide) + y;
				bufferFaces[faceId + 1] = (x * vertBySide) + y + 1;
				bufferFaces[faceId + 2] = ((x + 1) * vertBySide) + y + 1;
				bufferFaces[faceId + 3] = ((x + 1) * vertBySide) + y + 1;
				bufferFaces[faceId + 4] = ((x + 1) * vertBySide) + y;
				bufferFaces[faceId + 5] = (x * vertBySide) + y;
				faceId += 6;
			}
		}
		const geoBuffer = new BufferGeometry();
		geoBuffer.setAttribute('position', new BufferAttribute(bufferVertices, 3));
		geoBuffer.setIndex(new BufferAttribute(bufferFaces, 1));
		geoBuffer.computeFaceNormals();
		geoBuffer.computeVertexNormals();
		if (this.meshe !== undefined) {
			api$a.removeMeshe(this.meshe);
			this.meshe.geometry.dispose();
		}
		this.meshe = new Mesh(geoBuffer, this.material);
		if (this.onStage) {
			api$a.addMeshe(this.meshe);
		}
		this.meshe.castShadow = true;
		this.meshe.receiveShadow = true;
		let parentTexture = this.nearestTextures();
		this.applyTexture(parentTexture);
		this.isReady = true;
		this.evt.fireEvent('TILE_READY');
	}

	updateVertex() {
		api$a.removeMeshe(this.meshe);
		this.meshe.geometry.dispose();
		this.buildGeometry();
		for (let i = 0; i < this.childTiles.length; i ++) {
			this.childTiles[i].updateVertex();
		}
		api.MUST_RENDER = true;
	}

	searchTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom > _zoom) {
			return false;
		}
		if (this.isTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		// if (this.zoom == 13 && this.containTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		for (let i = 0; i < this.childTiles.length; i ++) {
			const res = this.childTiles[i].searchTileAtXYZ(_tileX, _tileY, _zoom);
			if (res) return res;
		}
		if (this.containTileAtXYZ(_tileX, _tileY, _zoom)) return this;
		return false;
	}
	
	containTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom >= _zoom) {
			return false;
		}
		const zoomDiff = _zoom - this.zoom;
		const zoomX = this.tileX * Math.pow(2, zoomDiff);
		const zoomY = this.tileY * Math.pow(2, zoomDiff);
		if (_tileX < zoomX) return false;
		if (_tileY < zoomY) return false;
		if (_tileX > zoomX + 1) return false;
		if (_tileY > zoomY + 1) return false;
		return true;
	}

	isTileAtXYZ(_tileX, _tileY, _zoom) {
		if (this.zoom != _zoom) return false;
		if (this.tileX != _tileX) return false;
		if (this.tileY != _tileY) return false;
		return true;
	}

	show() {
		if (this.onStage) return false;
		this.onStage = true;
		api$a.addMeshe(this.meshe);
		this.evt.fireEvent('SHOW');
	}
	
	hide() {
		if (!this.onStage) return false;
		this.onStage = false;
		api$a.removeMeshe(this.meshe);
		if (!this.textureLoaded) {
			loader.abort({
				z : this.zoom, 
				x : this.tileX, 
				y : this.tileY
			});
		}
		this.evt.fireEvent('HIDE');
	}

	createChilds(_coords) {
		if (this.childTiles.length > 0) return false;
		this.addChild(_coords, 0, 0);
		this.addChild(_coords, 0, 1);
		this.addChild(_coords, 1, 0);
        this.addChild(_coords, 1, 1);
        this.evt.fireEvent('ADD_CHILDRENS');
	}
		
	addChild(_coords, _offsetX, _offsetY) {
		const newTile = new TileBasic(this.tileX * 2 + _offsetX, this.tileY * 2 + _offsetY, this.zoom + 1);
		newTile.parentTile = this;
		newTile.parentOffset = new Vector2(_offsetX, _offsetY);
		newTile.buildGeometry();
		this.childTiles.push(newTile);
	}

	clearChildrens() {
		if (this.childTiles.length == 0) return false;
		this.childTiles.forEach(t => t.dispose());
		this.childTiles = [];
	}

	updateDetails(_coords) {
		if (this.checkCameraHover(_coords, api$a.tilesDetailsMarge)) {
			if (this.zoom < Math.floor(api$a.CUR_ZOOM)) {
				this.createChilds(_coords);
				for (let c = 0; c < this.childTiles.length; c ++) {
					this.childTiles[c].updateDetails(_coords);
				}
				this.hide();
			}else{
				this.clearChildrens();
				this.show();
			}
		}else{
			this.clearChildrens();
			if( this.zoom + 5 < api$a.CUR_ZOOM ){
				this.hide();
			}else{
				this.show();	
			}
		}
	}
	
	getCurTile(_coords) {
		if (this.checkCameraHover(_coords, 1) === false) return false;
		if (this.childTiles.length == 0) return this;
		const childs = this.childTiles
			.map(t => t.getCurTile(_coords))
			.filter(res => res);
		return childs.pop();
	}

	checkCameraHover(_coords, _marge) {
		const startLimit = api$8.tileToCoords(this.tileX - (_marge - 1), this.tileY - (_marge - 1), this.zoom);
		const endLimit = api$8.tileToCoords(this.tileX + _marge, this.tileY + _marge, this.zoom);
		if (startLimit[0] > _coords.x) return false;
		if (endLimit[0] < _coords.x) return false;
		if (startLimit[1] < _coords.y) return false;
		if (endLimit[1] > _coords.y) return false;
		return true;
	}

	setTexture(_texture) {
		this.textureLoaded = true;
		this.remoteTex = _texture;
		this.applyTexture({
			map : this.remoteTex, 
			uvReduc : 1, 
			offsetX : 0, 
			offsetY : 0, 
		});
        api.MUST_RENDER = true;
        this.evt.fireEvent('TEXTURE_LOADED');
	}

	unsetTexture() {
		this.textureLoaded = false;
		this.remoteTex = undefined;
		this.material.map = texture('checker');
	}

	dispose() {
		evt.removeEventListener('TILE_EXTENSION_ACTIVATE', this, this.onExtensionActivation);
		this.clearChildrens();
		this.hide();
		if (this.meshe != undefined) {
			this.meshe.geometry.dispose();
			this.material.map.dispose();
			this.material.dispose();
		}
		if (this.textureLoaded) {
			this.remoteTex.dispose();
		}
		this.extensions.clear();
        this.extensionsMaps.clear();
		this.isReady = false;
		this.evt.fireEvent('DISPOSE');
	}
}

const store = [{
	zoom : 1, 
	startLon : -180, 
	startLat : 90, 
	endLon : 180, 
	endLat : -90, 
	datas : null, 
	childs : [], 
}];


const api$9 = {
	
	set : function(_tile, _buffer) {
		let struct = {
			zoom : _tile.zoom, 
			startLon : _tile.startCoord.x, 
			startLat : _tile.startCoord.y, 
			endLon : _tile.endCoord.x, 
			endLat : _tile.endCoord.y, 
			midLon : _tile.middleCoord.x, 
			midLat : _tile.middleCoord.y, 
			datas : _buffer, 
			childs : [], 
			key : _tile.zoom + '-' + _tile.tileX + '-' + _tile.tileY, 
		};
		addStruct(struct, store);
	}, 

	get : function(_lon, _lat) {
		const struct = searchCoord(_lon, _lat);
		if (!struct) return 0;
		if (!struct.datas) return 0;
		return interpolate(struct, _lon, _lat);
	}, 

	delete : function(_tile) {
		let startLon = _tile.startCoord.x;
		let startLat = _tile.startCoord.y;
		let endLon = _tile.endCoord.x;
		let endLat = _tile.endCoord.y;
		let midLon = _tile.middleCoord.x;
		let midLat = _tile.middleCoord.y;
		const key = _tile.zoom + '-' + _tile.tileX + '-' + _tile.tileY;
		let validParent;
		let parents = store;
		let prevParent;
		while(true) {
			prevParent = validParent;
			let parent = parents.filter(s => structContainCoord(s, midLon, midLat)).pop();
			if (!parent) break;
			validParent = parent;
			parents = parent.childs;
			if (isStructure(validParent, startLon, startLat, endLon, endLat)) {
				prevParent.childs = prevParent.childs.filter(s => !isStructure(s, startLon, startLat, endLon, endLat));
				break;
			}
		}
	}, 
	
};

function isStructure(_struct, _startLon, _startLat, _endLon, _endLat) {
	if (_struct.startLon != _startLon) return false;
	if (_struct.startLat != _startLat) return false;
	if (_struct.endLon != _endLon) return false;
	if (_struct.endLat != _endLat) return false;
	return true;
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}

function slideValue(_min, _max, _prct) {
	const diff = _max - _min;
	return _min + diff * _prct;
}

function interpolate(_struct, _lon, _lat) {
	const vertBySide = api$a.tilesDefinition + 0;
	const vertBySideMax = api$a.tilesDefinition + 1;

	const prctFromLon = mapValue(_lon, _struct.startLon, _struct.endLon); // 0 -> 1
	const prctFromLat = mapValue(_lat, _struct.endLat, _struct.startLat);

	const bufferXMin = Math.floor(prctFromLon * vertBySide); // 0 -> 17
	const bufferYMin = vertBySide - Math.floor(prctFromLat * vertBySide);
	const bufferXMax = Math.ceil(prctFromLon * vertBySide); // 0 -> 17
	const bufferYMax = vertBySide - Math.ceil(prctFromLat * vertBySide);
	
	const bufferIndexMinXMinY = (bufferXMin * vertBySideMax) + bufferYMin;
	const bufferIndexMaxXMinY = (bufferXMax * vertBySideMax) + bufferYMin;
	const bufferIndexMinXMaxY = (bufferXMin * vertBySideMax) + bufferYMax;
	const bufferIndexMaxXMaxY = (bufferXMax * vertBySideMax) + bufferYMax;

	const elevationMinXMinY = _struct.datas[bufferIndexMinXMinY];
	const elevationMaxXMinY = _struct.datas[bufferIndexMaxXMinY];
	const elevationMinXMaxY = _struct.datas[bufferIndexMinXMaxY];
	const elevationMaxXMaxY = _struct.datas[bufferIndexMaxXMaxY];

	const prctX = mapValue(prctFromLon * vertBySide, Math.floor(prctFromLon * vertBySide), Math.ceil(prctFromLon * vertBySide)); // 0 -> 16
	const prctY = mapValue(prctFromLat * vertBySide, Math.floor(prctFromLat * vertBySide), Math.ceil(prctFromLat * vertBySide));
	
	const interpolXMin = slideValue(elevationMinXMinY, elevationMaxXMinY, prctX);
	const interpolXMax = slideValue(elevationMinXMaxY, elevationMaxXMaxY, prctX);
	const interpolY = slideValue(interpolXMin, interpolXMax, prctY);
	if (isNaN(interpolY)) return 0;
	return interpolY;
}

function searchCoord(_lon, _lat) {
	let validParent;
	let parents = store;
	let curZ = 0;
	while(true) {
		let parent = parents.filter(s => structContainCoord(s, _lon, _lat)).pop();
		if (!parent) break;
		validParent = parent;
		curZ = validParent.zoom;
		parents = parent.childs;
	}
	return validParent;
}

function addStruct(_struct, _parents) {
	let validParent;
	while(true) {
		let parent = _parents.filter(s => structContainStruct(s, _struct)).pop();
		if (parent) {
			_parents = parent.childs;
			validParent = parent;
		} else {
			break;
		}
	}
	_struct.childs = validParent.childs.filter(s => structContainStruct(_struct, s));
	validParent.childs = validParent.childs.filter(s => !structContainStruct(_struct, s));
	validParent.childs.push(_struct);
}

function structContainStruct(_structA, _structB) {
	if (_structA.zoom >= _structB.zoom) return false;
	if (_structA.startLon > _structB.midLon) return false;
	if (_structA.endLon < _structB.midLon) return false;
	if (_structA.startLat < _structB.midLat) return false;
	if (_structA.endLat > _structB.midLat) return false;
	return true;
}

function structContainCoord(_struct, _lon, _lat) {
	if (_lon < _struct.startLon) return false;
	if (_lon >= _struct.endLon) return false;
	if (_lat > _struct.startLat) return false;
	if (_lat <= _struct.endLat) return false;
	return true;
}

let curLodOrigine = new Vector3(0, 0, 0);
let curTile = new Vector2(0, 0, 0);
const eleFactor = 1;
let time = 0.5;
let objToUpdate = [];
const tilesBase = [];

const api$a = {
	evt : null, 
	cameraControler : null, 
	CUR_ZOOM : 14, 
	LOD_PLANET : 0, 
	LOD_CITY : 10, 
	LOD_STREET : 19, 
	curLOD : 0, 
	tilesDetailsMarge : 2, 
	coordDetails : new Vector2( 0, 0 ), 
	tileExtensions : {}, 
	radius : 10000, 
	meter : 1, 
	globalScale : 1, 
	meshe : null, 
	tilesDefinition : 16, 
	
	init : function() {
		api$a.evt = new Evt();
		api$a.meshe = new Mesh(new Geometry());
		api$a.coordToXYZ = api$a.coordToXYZPlane;
		api$a.meter = api$a.radius / 40075017.0;
	}, 

	setCameraControler(_controler) {
		api$a.cameraControler = _controler;
		api$a.cameraControler.init(api$a);
	}, 
	
	construct : function() {
		const zoomBase = 4;
		const nbTiles = Math.pow(2, zoomBase);
		for (let curTileY = 0; curTileY < nbTiles; curTileY ++) {
			for (let curTileX = 0; curTileX < nbTiles; curTileX ++) {
				const tile = new TileBasic(curTileX, curTileY, zoomBase);
				tilesBase.push(tile);
				tile.buildGeometry();
			}
		}
		api$6.init();
		api$a.cameraControler.start();
		api$a.evt.fireEvent('READY');
	}, 

	setTime : function(_time) {
		time = _time;
		api$a.evt.fireEvent('TIME_CHANGED', time);	
	}, 

	screenToSurfacePosition : function(_x, _y) {
		return api.checkMouseWorldPos(_x, _y, api$a.meshe);
	}, 

	addMeshe : function(_meshe) {
		api$a.meshe.add(_meshe);
	}, 

	removeMeshe : function(_meshe) {
		api$a.meshe.remove(_meshe);
	},  

	update : function() {
		objToUpdate.forEach(o => o.update());
	},  

	addObjToUpdate : function(_obj) {
		if (objToUpdate.includes(_obj)) return false;
		objToUpdate.push(_obj);
	}, 

	removeObjToUpdate : function(_obj) {
		objToUpdate = objToUpdate.filter(o => o != _obj);
	}, 

	updateLOD : function() {
		for (let i = 0; i < tilesBase.length; i ++) {
			tilesBase[i].updateVertex();
		}
	}, 

	updateZoom : function(_value){
		if (api$a.CUR_ZOOM == _value) return false;
		if (Math.floor(api$a.CUR_ZOOM) != Math.floor(_value)) {
			api$a.evt.fireEvent('ZOOM_CHANGE', Math.floor(_value));
		}
		api$a.CUR_ZOOM = _value;
		api$a.checkLOD();
	}, 

	switchProjection : function(){
		if (api$a.projection == 'SPHERE') {
			api$a.setProjection('PLANE');
		} else if (api$a.projection == 'PLANE') {
			api$a.setProjection('SPHERE');
		}
	}, 

	setProjection : function(_mode) {
		if (_mode == 'PLANE') {
			api$6.activate(true);
			api$a.coordToXYZ = api$a.coordToXYZPlane;
			api.camera.up.set(0, 0, 1);
		} else if (_mode == 'SPHERE') {
			api$6.activate(false);
			api$a.coordToXYZ = api$a.coordToXYZSphere;
			api.camera.up.set(0, 1, 0);
		}
		api$a.projection = _mode;
		for (let i = 0; i < tilesBase.length; i ++) {
			tilesBase[i].updateVertex();
		}
	}, 

	coordToXYZPlane : function(_lon, _lat, _elevation) {
		const pos = new Vector3(0, 0, 0);
		pos.x = api$a.radius * (_lon / 60);
		pos.y = api$a.posFromAltitude(_elevation);
		const tmpZ = Math.log(Math.tan((90 + _lat) * Math.PI / 360.0)) / (Math.PI / 180.0);
		pos.z = (tmpZ * (2 * Math.PI * api$a.radius / 2.0) / 180.0);
		pos.x *= api$a.globalScale;
		pos.y *= 10;
		pos.z *= api$a.globalScale;
		pos.x -= curLodOrigine.x;
		pos.z -= curLodOrigine.z;
		return pos;
	}, 

	coordToXYZSphere : function(lon, lat, _elevation) {
		_elevation *= api$a.meter;
		_elevation += api$a.radius;
		const pos = new Vector3(0, 0, 0);
		const radY = api$7.radians((lon - 180) * -1);
		const radX = api$7.radians(lat * -1);
		pos.x = Math.cos(radY) * ((_elevation) * Math.cos(radX));
		pos.y = Math.sin(radX) * _elevation * -1;
		pos.z = Math.sin(radY) * (_elevation * Math.cos(radX));
		if (api$a.curLOD == api$a.LOD_CITY) {
			pos.x -= curLodOrigine.x;
			pos.y -= curLodOrigine.y;
			pos.z -= curLodOrigine.z;
			pos.x *= api$a.globalScale;
			pos.y *= api$a.globalScale;
			pos.z *= api$a.globalScale;
		}
		return pos;
	}, 

	posFromAltitude : function(_altitude) {
		return 0 - (_altitude * (api$a.meter * eleFactor));
	}, 

	altitudeFromPos : function(_pos) {
		return ((_pos / api$a.globalScale) / (api$a.meter * eleFactor)) * -1;
	}, 

	coordFromPos : function(_x, _y, _eleMeter = 0) {
		const pxlStart = api$a.coordToXYZ( -180, 85.0511, 0);
		const pxlEnd = api$a.coordToXYZ( 180, -85.0511, 0);
		const pxlWidth = Math.abs( pxlEnd.x - pxlStart.x);
		const pxlHeight = Math.abs( pxlEnd.z - pxlStart.z) / 2;
		const prctW = (_x - pxlStart.x) / pxlWidth;
		const prctH = ((_y - pxlEnd.z) / pxlHeight) - 1;
		const coordX = -180 + (prctW * 360);
		let coordY = (prctH * 180);
		coordY = 180 / Math.PI * (2 * Math.atan( Math.exp( coordY * Math.PI / 180.0)) - Math.PI / 2.0);
		const ele = api$a.getElevationAtCoords(coordX, coordY, true);
		return new Vector3(coordX, coordY, ele + _eleMeter);
	}, 

	tileFromXYZ : function(_tileX, _tileY, _zoom) {
		for (let i = 0; i < tilesBase.length; i ++) {
			const res = tilesBase[i].searchTileAtXYZ(_tileX, _tileY, _zoom);
			if (res) return res;
		}
		return null;
	}, 

	checkLOD : function(){
		if (api$a.CUR_ZOOM >= api$a.LOD_STREET) {
			if (api$a.curLOD != api$a.LOD_STREET) {
				console.log("SET TO LOD_STREET");
				api$a.globalScale = 100;
				updateMeter();
				curLodOrigine = api$a.coordToXYZ(api$a.coordDetails.x, api$a.coordDetails.y, 0);
				console.log('curLodOrigine', curLodOrigine);
				api$a.curLOD = api$a.LOD_STREET;
				api$a.updateLOD();
				api$a.setProjection("PLANE");
				api.camera.far = api$a.radius * api$a.globalScale;
				api.camera.near = (api$a.radius * api$a.globalScale) / 10000000;
				api.camera.updateProjectionMatrix();
				if (api.scene.fog) {
					api.scene.fog.near = api$a.radius * (0.01 * api$a.globalScale);
					api.scene.fog.far = api$a.radius * (0.9 * api$a.globalScale);
				}
				api$a.evt.fireEvent("LOD_CHANGED");
			}
		} else if (api$a.CUR_ZOOM >= api$a.LOD_CITY) {
			if (api$a.curLOD != api$a.LOD_CITY) {
				// console.log("SET TO LOD_CITY");
				api$a.globalScale = 10;
				// api.globalScale = 100;
				updateMeter();
				curLodOrigine = api$a.coordToXYZ(api$a.coordDetails.x, api$a.coordDetails.y, 0);
				api$a.curLOD = api$a.LOD_CITY;
				api$a.updateLOD();
				api$a.setProjection("PLANE");
				api.camera.far = api$a.radius * api$a.globalScale;
				api.camera.near = (api$a.radius * api$a.globalScale ) / 1000000;
				api.camera.updateProjectionMatrix();
				// if (Renderer.scene.fog) {
				// 	Renderer.scene.fog.near = api.radius * ( 0.01 * api.globalScale );
				// 	Renderer.scene.fog.far = api.radius * ( 0.9 * api.globalScale );
				// }
				api$a.evt.fireEvent('LOD_CHANGED');
			}
		} else if (api$a.CUR_ZOOM >= api$a.LOD_PLANET) {
			if (api$a.curLOD != api$a.LOD_PLANET) {
				console.log("SET TO LOD_PLANET");
				curLodOrigine = new Vector3( 0, 0, 0 );
				api$a.globalScale = 1;
				updateMeter();
				api$a.curLOD = api$a.LOD_PLANET;
				api$a.setProjection("SPHERE");
				api$a.updateLOD();
				api.camera.far = (api$a.radius * 2 ) * api$a.globalScale;
				api.camera.near = (api$a.radius * api$a.globalScale) / 1000000;
				api.camera.updateProjectionMatrix();
				if (api.scene.fog) {
					api.scene.fog.near = api$a.radius * (0.01 * api$a.globalScale);
					api.scene.fog.far = api$a.radius * (0.9 * api$a.globalScale);
				}
				api$a.evt.fireEvent("LOD_CHANGED");
			}
		}
	}, 
	
	getElevationAtCoords : function(_lon, _lat, _inMeters = false) {
		let ele = api$9.get(_lon, _lat) || 0;
		if (_inMeters) return ele;
		return ele *= (api$a.meter * eleFactor);
	}, 
	
	getCurTile : function() {
		return tilesBase.map(t => {
			return t.getCurTile(api$a.coordDetails)
		}).filter(res => res).pop();
	}, 
	
	onCurTileChange : function(_newTile){
		curTile = _newTile;
		for (let i = 0; i < tilesBase.length; i ++) {
			tilesBase[i].updateDetails(api$a.coordDetails);
		}
		api$a.evt.fireEvent('CURTILE_CHANGED', curTile);
	}, 

	updateCurTile : function(_coordX, _coordY) {
		api$a.coordDetails.x = _coordX;
		api$a.coordDetails.y = _coordY;
		const newTile = api$8.coordsToTile(api$a.coordDetails.x, api$a.coordDetails.y, api$a.CUR_ZOOM);
		if (newTile.x != curTile.x || newTile.y != curTile.y || newTile.z != curTile.z) {
			api$a.onCurTileChange(newTile);
		}
		curTile = newTile;
	}, 

	altitude : function(_zoomlevel) { // return altitude in opengl unit
		return api$8.getAltitude(_zoomlevel, api$a.radius);
	}, 
};

function updateMeter() {
	api$a.meter = (api$a.radius / 40075017.0) * api$a.globalScale;
}

let waypointMat;
const waypointsList = [];
let wpStored = [];

var api$b = {
	evt : null, 

	init : function() {
		api$b.evt = new Evt();
		api$a.evt.addEventListener('READY', api$b, api$b.onAppStart);
	}, 
	
	onAppStart : function() {
		api$a.evt.removeEventListener('READY', api$b, api$b.onAppStart);
		waypointMat = new SpriteMaterial({map:texture('waypoint'), color:0xffffff, fog:false});
		if (localStorage.getItem('waypoints') == undefined) {
			localStorage.setItem('waypoints', JSON.stringify(wpStored));
		}else{
			wpStored = JSON.parse(localStorage.getItem('waypoints'));
			wpStored.forEach(waypoint => {
				api$b.saveWaypoint(waypoint.lon, waypoint.lat, waypoint.zoom, waypoint.name);
			});
		}
	}, 

	waypoints : function() {
		return waypointsList;
	}, 
	
	getWaypointById : function(_index) {
		return waypointsList[_index];
	}, 
	
	saveWaypoint : function(_lon, _lat, _zoom, _name, _localStore = false) {
		_name = _name || 'WP ' + waypointsList.length;
		const wp = new WayPoint(_lon, _lat, _zoom, _name);
		waypointsList.push(wp);
		api$b.evt.fireEvent('WAYPOINT_ADDED', waypointsList);
		// UI.updateWaypointsList(waypointsList);
		if (_localStore) {
			wpStored.push({name : _name, lon : _lon, lat : _lat, zoom : _zoom});
			localStorage.setItem("waypoints", JSON.stringify(wpStored));
		}
		return wp;
	}, 
	
	removeWaypoint : function( _wId ) {
		wpStored = wpStored.filter(w => {
			if (w.lon != waypoints[_wId].lon) return true;
			if (w.lat != waypoints[_wId].lat) return true;
			if (w.zoom != waypoints[_wId].zoom) return true;
			return false;
		});
		localStorage.setItem("waypoints", JSON.stringify(wpStored));	
		waypoints[_wId].dispose();
		waypoints.splice(_wId, 1);
		updateWaypointsList(waypoints);
	}
};

class WayPoint {
	constructor(_lon, _lat,_zoom, _name) {
		this.showSprite = true;
		this.showList = true;
		if (_name == 'none') {
			this.showList = false;
		}
		this.lon = _lon;
		this.lat = _lat;
		this.zoom = _zoom;
		this.name = _name;
		this.onStage = true;
		this.sprite = undefined;
		this.material = undefined;
		if (this.showSprite) this.addToScene();
	}

	addToScene() {
		this.material = waypointMat;
		this.sprite = new Sprite(this.material);
		var ele = api$a.getElevationAtCoords(this.lon, this.lat, true);
		var pos = api$a.coordToXYZ(this.lon, this.lat, ele);
		this.sprite.position.x = pos.x;
		this.sprite.position.y = pos.y;
		this.sprite.position.z = pos.z;
		let wpScale = (api$a.cameraControler.coordCam.z / api$a.radius) * 1000;
		wpScale = Math.max(wpScale, 1);
		this.sprite.scale.x = wpScale;
		this.sprite.scale.y = wpScale;
		this.sprite.scale.z = wpScale;
		api.scene.add(this.sprite);
	}

	updatePos() {
		if (this.showSprite) {
			var pos = api$a.coordToXYZ(this.lon, this.lat, (api$a.meter * 64) * api$a.globalScale);
			this.sprite.position.x = pos.x;
			this.sprite.position.y = pos.y;
			this.sprite.position.z = pos.z;
		}
	}

	resize(_scale) {
		if (this.showSprite) {
			this.sprite.scale.x = _scale;
			this.sprite.scale.y = _scale;
			this.sprite.scale.z = _scale;
		}
	}

	hide(_state) {
		if (!this.showSprite) return true;
		if (this.onStage && _state){
			this.onStage = false;
			api.scene.remove(this.sprite);
		} else if (!this.onStage && !_state) {
			this.onStage = true;
			api.scene.add(this.sprite);
		}
	}

	dispose() {
		if (this.showSprite) {
			api.scene.remove(this.sprite);
		}
	}
}

class TweenValue {

	constructor(_value = 0) {
		this.value = _value;
		this.valueStart = 0;
		this.valueEnd = 0;
		this.timeStart = -1;
		this.timeEnd = -1;
		this.timeTotal = -1;
		this.running = false;
		this.evt = new Evt();
	}

	setTargetValue(_value, _duration) {
		const d = new Date();
		const curTime = d.getTime();
		this.valueStart = this.value;
		this.valueEnd = _value;
		this.timeStart = curTime;
		this.timeEnd = curTime + _duration;
		this.timeTotal = this.timeEnd - this.timeStart;
		this.running = true;
	}
	
	getValueAtTime(_curTime) {
		this.timeTotal = this.timeEnd - this.timeStart;
		const timeElapsed = _curTime - this.timeStart;
		const timePrct = (timeElapsed / this.timeTotal);
		const delta = this.valueEnd - this.valueStart;
		this.value = this.valueStart + (delta * (timePrct));
		if(timePrct >= 1){
			this.reachTargetValue();
		}
		return this.value;
	}

	reachTargetValue() {
		this.value = this.valueEnd;
		this.valueStart = this.valueEnd;
		this.timeEnd = -1;
		this.timeTotal = -1;
		this.running = false;
		this.evt.fireEvent('END');
	}
}

/**
 * @author Rich Tibbett / https://github.com/richtr
 * @author mrdoob / http://mrdoob.com/
 * @author Tony Parisi / http://www.tonyparisi.com/
 * @author Takahiro / https://github.com/takahirox
 * @author Don McCurdy / https://www.donmccurdy.com
 */

var GLTFLoader = ( function () {

	function GLTFLoader( manager ) {

		this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;
		this.dracoLoader = null;

	}

	GLTFLoader.prototype = {

		constructor: GLTFLoader,

		crossOrigin: 'anonymous',

		load: function ( url, onLoad, onProgress, onError ) {

			var scope = this;

			var resourcePath;

			if ( this.resourcePath !== undefined ) {

				resourcePath = this.resourcePath;

			} else if ( this.path !== undefined ) {

				resourcePath = this.path;

			} else {

				resourcePath = LoaderUtils.extractUrlBase( url );

			}

			// Tells the LoadingManager to track an extra item, which resolves after
			// the model is fully loaded. This means the count of items loaded will
			// be incorrect, but ensures manager.onLoad() does not fire early.
			scope.manager.itemStart( url );

			var _onError = function ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			};

			var loader = new FileLoader( scope.manager );

			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );

			loader.load( url, function ( data ) {

				try {

					scope.parse( data, resourcePath, function ( gltf ) {

						onLoad( gltf );

						scope.manager.itemEnd( url );

					}, _onError );

				} catch ( e ) {

					_onError( e );

				}

			}, onProgress, _onError );

		},

		setCrossOrigin: function ( value ) {

			this.crossOrigin = value;
			return this;

		},

		setPath: function ( value ) {

			this.path = value;
			return this;

		},

		setResourcePath: function ( value ) {

			this.resourcePath = value;
			return this;

		},

		setDRACOLoader: function ( dracoLoader ) {

			this.dracoLoader = dracoLoader;
			return this;

		},

		parse: function ( data, path, onLoad, onError ) {

			var content;
			var extensions = {};

			if ( typeof data === 'string' ) {

				content = data;

			} else {

				var magic = LoaderUtils.decodeText( new Uint8Array( data, 0, 4 ) );

				if ( magic === BINARY_EXTENSION_HEADER_MAGIC ) {

					try {

						extensions[ EXTENSIONS.KHR_BINARY_GLTF ] = new GLTFBinaryExtension( data );

					} catch ( error ) {

						if ( onError ) onError( error );
						return;

					}

					content = extensions[ EXTENSIONS.KHR_BINARY_GLTF ].content;

				} else {

					content = LoaderUtils.decodeText( new Uint8Array( data ) );

				}

			}

			var json = JSON.parse( content );

			if ( json.asset === undefined || json.asset.version[ 0 ] < 2 ) {

				if ( onError ) onError( new Error( 'THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported. Use LegacyGLTFLoader instead.' ) );
				return;

			}

			if ( json.extensionsUsed ) {

				for ( var i = 0; i < json.extensionsUsed.length; ++ i ) {

					var extensionName = json.extensionsUsed[ i ];
					var extensionsRequired = json.extensionsRequired || [];

					switch ( extensionName ) {

						case EXTENSIONS.KHR_LIGHTS_PUNCTUAL:
							extensions[ extensionName ] = new GLTFLightsExtension( json );
							break;

						case EXTENSIONS.KHR_MATERIALS_UNLIT:
							extensions[ extensionName ] = new GLTFMaterialsUnlitExtension( json );
							break;

						case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
							extensions[ extensionName ] = new GLTFMaterialsPbrSpecularGlossinessExtension( json );
							break;

						case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
							extensions[ extensionName ] = new GLTFDracoMeshCompressionExtension( json, this.dracoLoader );
							break;

						case EXTENSIONS.MSFT_TEXTURE_DDS:
							extensions[ EXTENSIONS.MSFT_TEXTURE_DDS ] = new GLTFTextureDDSExtension();
							break;

						case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
							extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] = new GLTFTextureTransformExtension( json );
							break;

						default:

							if ( extensionsRequired.indexOf( extensionName ) >= 0 ) {

								console.warn( 'THREE.GLTFLoader: Unknown extension "' + extensionName + '".' );

							}

					}

				}

			}

			var parser = new GLTFParser( json, extensions, {

				path: path || this.resourcePath || '',
				crossOrigin: this.crossOrigin,
				manager: this.manager

			} );

			parser.parse( onLoad, onError );

		}

	};

	/* GLTFREGISTRY */

	function GLTFRegistry() {

		var objects = {};

		return	{

			get: function ( key ) {

				return objects[ key ];

			},

			add: function ( key, object ) {

				objects[ key ] = object;

			},

			remove: function ( key ) {

				delete objects[ key ];

			},

			removeAll: function () {

				objects = {};

			}

		};

	}

	/*********************************/
	/********** EXTENSIONS ***********/
	/*********************************/

	var EXTENSIONS = {
		KHR_BINARY_GLTF: 'KHR_binary_glTF',
		KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
		KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
		KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
		KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
		KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
		MSFT_TEXTURE_DDS: 'MSFT_texture_dds'
	};

	/**
	 * DDS Texture Extension
	 *
	 * Specification:
	 * https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/MSFT_texture_dds
	 *
	 */
	function GLTFTextureDDSExtension() {

		if ( ! THREE.DDSLoader ) {

			throw new Error( 'THREE.GLTFLoader: Attempting to load .dds texture without importing THREE.DDSLoader' );

		}

		this.name = EXTENSIONS.MSFT_TEXTURE_DDS;
		this.ddsLoader = new THREE.DDSLoader();

	}

	/**
	 * Lights Extension
	 *
	 * Specification: PENDING
	 */
	function GLTFLightsExtension( json ) {

		this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL;

		var extension = ( json.extensions && json.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ] ) || {};
		this.lightDefs = extension.lights || [];

	}

	GLTFLightsExtension.prototype.loadLight = function ( lightIndex ) {

		var lightDef = this.lightDefs[ lightIndex ];
		var lightNode;

		var color = new Color( 0xffffff );
		if ( lightDef.color !== undefined ) color.fromArray( lightDef.color );

		var range = lightDef.range !== undefined ? lightDef.range : 0;

		switch ( lightDef.type ) {

			case 'directional':
				lightNode = new DirectionalLight( color );
				lightNode.target.position.set( 0, 0, - 1 );
				lightNode.add( lightNode.target );
				break;

			case 'point':
				lightNode = new PointLight( color );
				lightNode.distance = range;
				break;

			case 'spot':
				lightNode = new SpotLight( color );
				lightNode.distance = range;
				// Handle spotlight properties.
				lightDef.spot = lightDef.spot || {};
				lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
				lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
				lightNode.angle = lightDef.spot.outerConeAngle;
				lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
				lightNode.target.position.set( 0, 0, - 1 );
				lightNode.add( lightNode.target );
				break;

			default:
				throw new Error( 'THREE.GLTFLoader: Unexpected light type, "' + lightDef.type + '".' );

		}

		// Some lights (e.g. spot) default to a position other than the origin. Reset the position
		// here, because node-level parsing will only override position if explicitly specified.
		lightNode.position.set( 0, 0, 0 );

		lightNode.decay = 2;

		if ( lightDef.intensity !== undefined ) lightNode.intensity = lightDef.intensity;

		lightNode.name = lightDef.name || ( 'light_' + lightIndex );

		return Promise.resolve( lightNode );

	};

	/**
	 * Unlit Materials Extension (pending)
	 *
	 * PR: https://github.com/KhronosGroup/glTF/pull/1163
	 */
	function GLTFMaterialsUnlitExtension() {

		this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;

	}

	GLTFMaterialsUnlitExtension.prototype.getMaterialType = function () {

		return MeshBasicMaterial;

	};

	GLTFMaterialsUnlitExtension.prototype.extendParams = function ( materialParams, materialDef, parser ) {

		var pending = [];

		materialParams.color = new Color( 1.0, 1.0, 1.0 );
		materialParams.opacity = 1.0;

		var metallicRoughness = materialDef.pbrMetallicRoughness;

		if ( metallicRoughness ) {

			if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

				var array = metallicRoughness.baseColorFactor;

				materialParams.color.fromArray( array );
				materialParams.opacity = array[ 3 ];

			}

			if ( metallicRoughness.baseColorTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

			}

		}

		return Promise.all( pending );

	};
	var BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
	var BINARY_EXTENSION_HEADER_LENGTH = 12;
	var BINARY_EXTENSION_CHUNK_TYPES = { JSON: 0x4E4F534A, BIN: 0x004E4942 };

	function GLTFBinaryExtension( data ) {

		this.name = EXTENSIONS.KHR_BINARY_GLTF;
		this.content = null;
		this.body = null;

		var headerView = new DataView( data, 0, BINARY_EXTENSION_HEADER_LENGTH );

		this.header = {
			magic: LoaderUtils.decodeText( new Uint8Array( data.slice( 0, 4 ) ) ),
			version: headerView.getUint32( 4, true ),
			length: headerView.getUint32( 8, true )
		};

		if ( this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC ) {

			throw new Error( 'THREE.GLTFLoader: Unsupported glTF-Binary header.' );

		} else if ( this.header.version < 2.0 ) {

			throw new Error( 'THREE.GLTFLoader: Legacy binary file detected. Use LegacyGLTFLoader instead.' );

		}

		var chunkView = new DataView( data, BINARY_EXTENSION_HEADER_LENGTH );
		var chunkIndex = 0;

		while ( chunkIndex < chunkView.byteLength ) {

			var chunkLength = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			var chunkType = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON ) {

				var contentArray = new Uint8Array( data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength );
				this.content = LoaderUtils.decodeText( contentArray );

			} else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {

				var byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
				this.body = data.slice( byteOffset, byteOffset + chunkLength );

			}

			// Clients must ignore chunks with unknown types.

			chunkIndex += chunkLength;

		}

		if ( this.content === null ) {

			throw new Error( 'THREE.GLTFLoader: JSON content not found.' );

		}

	}

	/**
	 * DRACO Mesh Compression Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/pull/874
	 */
	function GLTFDracoMeshCompressionExtension( json, dracoLoader ) {

		if ( ! dracoLoader ) {

			throw new Error( 'THREE.GLTFLoader: No DRACOLoader instance provided.' );

		}

		this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
		this.json = json;
		this.dracoLoader = dracoLoader;

	}

	GLTFDracoMeshCompressionExtension.prototype.decodePrimitive = function ( primitive, parser ) {

		var json = this.json;
		var dracoLoader = this.dracoLoader;
		var bufferViewIndex = primitive.extensions[ this.name ].bufferView;
		var gltfAttributeMap = primitive.extensions[ this.name ].attributes;
		var threeAttributeMap = {};
		var attributeNormalizedMap = {};
		var attributeTypeMap = {};

		for ( var attributeName in gltfAttributeMap ) {

			var threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();

			threeAttributeMap[ threeAttributeName ] = gltfAttributeMap[ attributeName ];

		}

		for ( attributeName in primitive.attributes ) {

			var threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();

			if ( gltfAttributeMap[ attributeName ] !== undefined ) {

				var accessorDef = json.accessors[ primitive.attributes[ attributeName ] ];
				var componentType = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ];

				attributeTypeMap[ threeAttributeName ] = componentType;
				attributeNormalizedMap[ threeAttributeName ] = accessorDef.normalized === true;

			}

		}

		return parser.getDependency( 'bufferView', bufferViewIndex ).then( function ( bufferView ) {

			return new Promise( function ( resolve ) {

				dracoLoader.decodeDracoFile( bufferView, function ( geometry ) {

					for ( var attributeName in geometry.attributes ) {

						var attribute = geometry.attributes[ attributeName ];
						var normalized = attributeNormalizedMap[ attributeName ];

						if ( normalized !== undefined ) attribute.normalized = normalized;

					}

					resolve( geometry );

				}, threeAttributeMap, attributeTypeMap );

			} );

		} );

	};

	/**
	 * Texture Transform Extension
	 *
	 * Specification:
	 */
	function GLTFTextureTransformExtension() {

		this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;

	}

	GLTFTextureTransformExtension.prototype.extendTexture = function ( texture, transform ) {

		texture = texture.clone();

		if ( transform.offset !== undefined ) {

			texture.offset.fromArray( transform.offset );

		}

		if ( transform.rotation !== undefined ) {

			texture.rotation = transform.rotation;

		}

		if ( transform.scale !== undefined ) {

			texture.repeat.fromArray( transform.scale );

		}

		if ( transform.texCoord !== undefined ) {

			console.warn( 'THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.' );

		}

		texture.needsUpdate = true;

		return texture;

	};

	/**
	 * Specular-Glossiness Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness
	 */
	function GLTFMaterialsPbrSpecularGlossinessExtension() {

		return {

			name: EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS,

			specularGlossinessParams: [
				'color',
				'map',
				'lightMap',
				'lightMapIntensity',
				'aoMap',
				'aoMapIntensity',
				'emissive',
				'emissiveIntensity',
				'emissiveMap',
				'bumpMap',
				'bumpScale',
				'normalMap',
				'displacementMap',
				'displacementScale',
				'displacementBias',
				'specularMap',
				'specular',
				'glossinessMap',
				'glossiness',
				'alphaMap',
				'envMap',
				'envMapIntensity',
				'refractionRatio',
			],

			getMaterialType: function () {

				return ShaderMaterial;

			},

			extendParams: function ( materialParams, materialDef, parser ) {

				var pbrSpecularGlossiness = materialDef.extensions[ this.name ];

				var shader = ShaderLib[ 'standard' ];

				var uniforms = UniformsUtils.clone( shader.uniforms );

				var specularMapParsFragmentChunk = [
					'#ifdef USE_SPECULARMAP',
					'	uniform sampler2D specularMap;',
					'#endif'
				].join( '\n' );

				var glossinessMapParsFragmentChunk = [
					'#ifdef USE_GLOSSINESSMAP',
					'	uniform sampler2D glossinessMap;',
					'#endif'
				].join( '\n' );

				var specularMapFragmentChunk = [
					'vec3 specularFactor = specular;',
					'#ifdef USE_SPECULARMAP',
					'	vec4 texelSpecular = texture2D( specularMap, vUv );',
					'	texelSpecular = sRGBToLinear( texelSpecular );',
					'	// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture',
					'	specularFactor *= texelSpecular.rgb;',
					'#endif'
				].join( '\n' );

				var glossinessMapFragmentChunk = [
					'float glossinessFactor = glossiness;',
					'#ifdef USE_GLOSSINESSMAP',
					'	vec4 texelGlossiness = texture2D( glossinessMap, vUv );',
					'	// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture',
					'	glossinessFactor *= texelGlossiness.a;',
					'#endif'
				].join( '\n' );

				var lightPhysicalFragmentChunk = [
					'PhysicalMaterial material;',
					'material.diffuseColor = diffuseColor.rgb;',
					'material.specularRoughness = clamp( 1.0 - glossinessFactor, 0.04, 1.0 );',
					'material.specularColor = specularFactor.rgb;',
				].join( '\n' );

				var fragmentShader = shader.fragmentShader
					.replace( 'uniform float roughness;', 'uniform vec3 specular;' )
					.replace( 'uniform float metalness;', 'uniform float glossiness;' )
					.replace( '#include <roughnessmap_pars_fragment>', specularMapParsFragmentChunk )
					.replace( '#include <metalnessmap_pars_fragment>', glossinessMapParsFragmentChunk )
					.replace( '#include <roughnessmap_fragment>', specularMapFragmentChunk )
					.replace( '#include <metalnessmap_fragment>', glossinessMapFragmentChunk )
					.replace( '#include <lights_physical_fragment>', lightPhysicalFragmentChunk );

				delete uniforms.roughness;
				delete uniforms.metalness;
				delete uniforms.roughnessMap;
				delete uniforms.metalnessMap;

				uniforms.specular = { value: new Color().setHex( 0x111111 ) };
				uniforms.glossiness = { value: 0.5 };
				uniforms.specularMap = { value: null };
				uniforms.glossinessMap = { value: null };

				materialParams.vertexShader = shader.vertexShader;
				materialParams.fragmentShader = fragmentShader;
				materialParams.uniforms = uniforms;
				materialParams.defines = { 'STANDARD': '' };

				materialParams.color = new Color( 1.0, 1.0, 1.0 );
				materialParams.opacity = 1.0;

				var pending = [];

				if ( Array.isArray( pbrSpecularGlossiness.diffuseFactor ) ) {

					var array = pbrSpecularGlossiness.diffuseFactor;

					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( pbrSpecularGlossiness.diffuseTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', pbrSpecularGlossiness.diffuseTexture ) );

				}

				materialParams.emissive = new Color( 0.0, 0.0, 0.0 );
				materialParams.glossiness = pbrSpecularGlossiness.glossinessFactor !== undefined ? pbrSpecularGlossiness.glossinessFactor : 1.0;
				materialParams.specular = new Color( 1.0, 1.0, 1.0 );

				if ( Array.isArray( pbrSpecularGlossiness.specularFactor ) ) {

					materialParams.specular.fromArray( pbrSpecularGlossiness.specularFactor );

				}

				if ( pbrSpecularGlossiness.specularGlossinessTexture !== undefined ) {

					var specGlossMapDef = pbrSpecularGlossiness.specularGlossinessTexture;
					pending.push( parser.assignTexture( materialParams, 'glossinessMap', specGlossMapDef ) );
					pending.push( parser.assignTexture( materialParams, 'specularMap', specGlossMapDef ) );

				}

				return Promise.all( pending );

			},

			createMaterial: function ( params ) {

				// setup material properties based on MeshStandardMaterial for Specular-Glossiness

				var material = new ShaderMaterial( {
					defines: params.defines,
					vertexShader: params.vertexShader,
					fragmentShader: params.fragmentShader,
					uniforms: params.uniforms,
					fog: true,
					lights: true,
					opacity: params.opacity,
					transparent: params.transparent
				} );

				material.isGLTFSpecularGlossinessMaterial = true;

				material.color = params.color;

				material.map = params.map === undefined ? null : params.map;

				material.lightMap = null;
				material.lightMapIntensity = 1.0;

				material.aoMap = params.aoMap === undefined ? null : params.aoMap;
				material.aoMapIntensity = 1.0;

				material.emissive = params.emissive;
				material.emissiveIntensity = 1.0;
				material.emissiveMap = params.emissiveMap === undefined ? null : params.emissiveMap;

				material.bumpMap = params.bumpMap === undefined ? null : params.bumpMap;
				material.bumpScale = 1;

				material.normalMap = params.normalMap === undefined ? null : params.normalMap;

				if ( params.normalScale ) material.normalScale = params.normalScale;

				material.displacementMap = null;
				material.displacementScale = 1;
				material.displacementBias = 0;

				material.specularMap = params.specularMap === undefined ? null : params.specularMap;
				material.specular = params.specular;

				material.glossinessMap = params.glossinessMap === undefined ? null : params.glossinessMap;
				material.glossiness = params.glossiness;

				material.alphaMap = null;

				material.envMap = params.envMap === undefined ? null : params.envMap;
				material.envMapIntensity = 1.0;

				material.refractionRatio = 0.98;

				material.extensions.derivatives = true;

				return material;

			},

			/**
			 * Clones a GLTFSpecularGlossinessMaterial instance. The ShaderMaterial.copy() method can
			 * copy only properties it knows about or inherits, and misses many properties that would
			 * normally be defined by MeshStandardMaterial.
			 *
			 * This method allows GLTFSpecularGlossinessMaterials to be cloned in the process of
			 * loading a glTF model, but cloning later (e.g. by the user) would require these changes
			 * AND also updating `.onBeforeRender` on the parent mesh.
			 *
			 * @param  {ShaderMaterial} source
			 * @return {ShaderMaterial}
			 */
			cloneMaterial: function ( source ) {

				var target = source.clone();

				target.isGLTFSpecularGlossinessMaterial = true;

				var params = this.specularGlossinessParams;

				for ( var i = 0, il = params.length; i < il; i ++ ) {

					var value = source[ params[ i ] ];
					target[ params[ i ] ] = ( value && value.isColor ) ? value.clone() : value;

				}

				return target;

			},

			// Here's based on refreshUniformsCommon() and refreshUniformsStandard() in WebGLRenderer.
			refreshUniforms: function ( renderer, scene, camera, geometry, material, group ) {

				if ( material.isGLTFSpecularGlossinessMaterial !== true ) {

					return;

				}

				var uniforms = material.uniforms;
				var defines = material.defines;

				uniforms.opacity.value = material.opacity;

				uniforms.diffuse.value.copy( material.color );
				uniforms.emissive.value.copy( material.emissive ).multiplyScalar( material.emissiveIntensity );

				uniforms.map.value = material.map;
				uniforms.specularMap.value = material.specularMap;
				uniforms.alphaMap.value = material.alphaMap;

				uniforms.lightMap.value = material.lightMap;
				uniforms.lightMapIntensity.value = material.lightMapIntensity;

				uniforms.aoMap.value = material.aoMap;
				uniforms.aoMapIntensity.value = material.aoMapIntensity;

				// uv repeat and offset setting priorities
				// 1. color map
				// 2. specular map
				// 3. normal map
				// 4. bump map
				// 5. alpha map
				// 6. emissive map

				var uvScaleMap;

				if ( material.map ) {

					uvScaleMap = material.map;

				} else if ( material.specularMap ) {

					uvScaleMap = material.specularMap;

				} else if ( material.displacementMap ) {

					uvScaleMap = material.displacementMap;

				} else if ( material.normalMap ) {

					uvScaleMap = material.normalMap;

				} else if ( material.bumpMap ) {

					uvScaleMap = material.bumpMap;

				} else if ( material.glossinessMap ) {

					uvScaleMap = material.glossinessMap;

				} else if ( material.alphaMap ) {

					uvScaleMap = material.alphaMap;

				} else if ( material.emissiveMap ) {

					uvScaleMap = material.emissiveMap;

				}

				if ( uvScaleMap !== undefined ) {

					// backwards compatibility
					if ( uvScaleMap.isWebGLRenderTarget ) {

						uvScaleMap = uvScaleMap.texture;

					}

					if ( uvScaleMap.matrixAutoUpdate === true ) {

						uvScaleMap.updateMatrix();

					}

					uniforms.uvTransform.value.copy( uvScaleMap.matrix );

				}

				if ( material.envMap ) {

					uniforms.envMap.value = material.envMap;
					uniforms.envMapIntensity.value = material.envMapIntensity;

					// don't flip CubeTexture envMaps, flip everything else:
					//  WebGLRenderTargetCube will be flipped for backwards compatibility
					//  WebGLRenderTargetCube.texture will be flipped because it's a Texture and NOT a CubeTexture
					// this check must be handled differently, or removed entirely, if WebGLRenderTargetCube uses a CubeTexture in the future
					uniforms.flipEnvMap.value = material.envMap.isCubeTexture ? - 1 : 1;

					uniforms.reflectivity.value = material.reflectivity;
					uniforms.refractionRatio.value = material.refractionRatio;

					uniforms.maxMipLevel.value = renderer.properties.get( material.envMap ).__maxMipLevel;

				}

				uniforms.specular.value.copy( material.specular );
				uniforms.glossiness.value = material.glossiness;

				uniforms.glossinessMap.value = material.glossinessMap;

				uniforms.emissiveMap.value = material.emissiveMap;
				uniforms.bumpMap.value = material.bumpMap;
				uniforms.normalMap.value = material.normalMap;

				uniforms.displacementMap.value = material.displacementMap;
				uniforms.displacementScale.value = material.displacementScale;
				uniforms.displacementBias.value = material.displacementBias;

				if ( uniforms.glossinessMap.value !== null && defines.USE_GLOSSINESSMAP === undefined ) {

					defines.USE_GLOSSINESSMAP = '';
					// set USE_ROUGHNESSMAP to enable vUv
					defines.USE_ROUGHNESSMAP = '';

				}

				if ( uniforms.glossinessMap.value === null && defines.USE_GLOSSINESSMAP !== undefined ) {

					delete defines.USE_GLOSSINESSMAP;
					delete defines.USE_ROUGHNESSMAP;

				}

			}

		};

	}

	/*********************************/
	/********** INTERPOLATION ********/
	/*********************************/

	// Spline Interpolation
	// Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#appendix-c-spline-interpolation
	function GLTFCubicSplineInterpolant( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

		Interpolant.call( this, parameterPositions, sampleValues, sampleSize, resultBuffer );

	}

	GLTFCubicSplineInterpolant.prototype = Object.create( Interpolant.prototype );
	GLTFCubicSplineInterpolant.prototype.constructor = GLTFCubicSplineInterpolant;

	GLTFCubicSplineInterpolant.prototype.copySampleValue_ = function ( index ) {

		// Copies a sample value to the result buffer. See description of glTF
		// CUBICSPLINE values layout in interpolate_() function below.

		var result = this.resultBuffer,
			values = this.sampleValues,
			valueSize = this.valueSize,
			offset = index * valueSize * 3 + valueSize;

		for ( var i = 0; i !== valueSize; i ++ ) {

			result[ i ] = values[ offset + i ];

		}

		return result;

	};

	GLTFCubicSplineInterpolant.prototype.beforeStart_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;

	GLTFCubicSplineInterpolant.prototype.afterEnd_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;

	GLTFCubicSplineInterpolant.prototype.interpolate_ = function ( i1, t0, t, t1 ) {

		var result = this.resultBuffer;
		var values = this.sampleValues;
		var stride = this.valueSize;

		var stride2 = stride * 2;
		var stride3 = stride * 3;

		var td = t1 - t0;

		var p = ( t - t0 ) / td;
		var pp = p * p;
		var ppp = pp * p;

		var offset1 = i1 * stride3;
		var offset0 = offset1 - stride3;

		var s2 = - 2 * ppp + 3 * pp;
		var s3 = ppp - pp;
		var s0 = 1 - s2;
		var s1 = s3 - pp + p;

		// Layout of keyframe output values for CUBICSPLINE animations:
		//   [ inTangent_1, splineVertex_1, outTangent_1, inTangent_2, splineVertex_2, ... ]
		for ( var i = 0; i !== stride; i ++ ) {

			var p0 = values[ offset0 + i + stride ]; // splineVertex_k
			var m0 = values[ offset0 + i + stride2 ] * td; // outTangent_k * (t_k+1 - t_k)
			var p1 = values[ offset1 + i + stride ]; // splineVertex_k+1
			var m1 = values[ offset1 + i ] * td; // inTangent_k+1 * (t_k+1 - t_k)

			result[ i ] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;

		}

		return result;

	};

	/*********************************/
	/********** INTERNALS ************/
	/*********************************/

	/* CONSTANTS */

	var WEBGL_CONSTANTS = {
		FLOAT: 5126,
		//FLOAT_MAT2: 35674,
		FLOAT_MAT3: 35675,
		FLOAT_MAT4: 35676,
		FLOAT_VEC2: 35664,
		FLOAT_VEC3: 35665,
		FLOAT_VEC4: 35666,
		LINEAR: 9729,
		REPEAT: 10497,
		SAMPLER_2D: 35678,
		POINTS: 0,
		LINES: 1,
		LINE_LOOP: 2,
		LINE_STRIP: 3,
		TRIANGLES: 4,
		TRIANGLE_STRIP: 5,
		TRIANGLE_FAN: 6,
		UNSIGNED_BYTE: 5121,
		UNSIGNED_SHORT: 5123
	};

	var WEBGL_COMPONENT_TYPES = {
		5120: Int8Array,
		5121: Uint8Array,
		5122: Int16Array,
		5123: Uint16Array,
		5125: Uint32Array,
		5126: Float32Array
	};

	var WEBGL_FILTERS = {
		9728: NearestFilter,
		9729: LinearFilter,
		9984: NearestMipMapNearestFilter,
		9985: LinearMipMapNearestFilter,
		9986: NearestMipMapLinearFilter,
		9987: LinearMipMapLinearFilter
	};

	var WEBGL_WRAPPINGS = {
		33071: ClampToEdgeWrapping,
		33648: MirroredRepeatWrapping,
		10497: RepeatWrapping
	};

	var WEBGL_TYPE_SIZES = {
		'SCALAR': 1,
		'VEC2': 2,
		'VEC3': 3,
		'VEC4': 4,
		'MAT2': 4,
		'MAT3': 9,
		'MAT4': 16
	};

	var ATTRIBUTES = {
		POSITION: 'position',
		NORMAL: 'normal',
		TANGENT: 'tangent',
		TEXCOORD_0: 'uv',
		TEXCOORD_1: 'uv2',
		COLOR_0: 'color',
		WEIGHTS_0: 'skinWeight',
		JOINTS_0: 'skinIndex',
	};

	var PATH_PROPERTIES = {
		scale: 'scale',
		translation: 'position',
		rotation: 'quaternion',
		weights: 'morphTargetInfluences'
	};

	var INTERPOLATION = {
		CUBICSPLINE: undefined, // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
		                        // keyframe track will be initialized with a default interpolation type, then modified.
		LINEAR: InterpolateLinear,
		STEP: InterpolateDiscrete
	};

	var ALPHA_MODES = {
		OPAQUE: 'OPAQUE',
		MASK: 'MASK',
		BLEND: 'BLEND'
	};

	var MIME_TYPE_FORMATS = {
		'image/png': RGBAFormat,
		'image/jpeg': RGBFormat
	};

	/* UTILITY FUNCTIONS */

	function resolveURL( url, path ) {

		// Invalid URL
		if ( typeof url !== 'string' || url === '' ) return '';

		// Absolute URL http://,https://,//
		if ( /^(https?:)?\/\//i.test( url ) ) return url;

		// Data URI
		if ( /^data:.*,.*$/i.test( url ) ) return url;

		// Blob URL
		if ( /^blob:.*$/i.test( url ) ) return url;

		// Relative URL
		return path + url;

	}

	var defaultMaterial;

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
	 */
	function createDefaultMaterial() {

		defaultMaterial = defaultMaterial || new MeshStandardMaterial( {
			color: 0xFFFFFF,
			emissive: 0x000000,
			metalness: 1,
			roughness: 1,
			transparent: false,
			depthTest: true,
			side: FrontSide
		} );

		return defaultMaterial;

	}

	function addUnknownExtensionsToUserData( knownExtensions, object, objectDef ) {

		// Add unknown glTF extensions to an object's userData.

		for ( var name in objectDef.extensions ) {

			if ( knownExtensions[ name ] === undefined ) {

				object.userData.gltfExtensions = object.userData.gltfExtensions || {};
				object.userData.gltfExtensions[ name ] = objectDef.extensions[ name ];

			}

		}

	}

	/**
	 * @param {Object3D|Material|BufferGeometry} object
	 * @param {GLTF.definition} gltfDef
	 */
	function assignExtrasToUserData( object, gltfDef ) {

		if ( gltfDef.extras !== undefined ) {

			if ( typeof gltfDef.extras === 'object' ) {

				Object.assign( object.userData, gltfDef.extras );

			} else {

				console.warn( 'THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras );

			}

		}

	}

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets
	 *
	 * @param {BufferGeometry} geometry
	 * @param {Array<GLTF.Target>} targets
	 * @param {GLTFParser} parser
	 * @return {Promise<BufferGeometry>}
	 */
	function addMorphTargets( geometry, targets, parser ) {

		var hasMorphPosition = false;
		var hasMorphNormal = false;

		for ( var i = 0, il = targets.length; i < il; i ++ ) {

			var target = targets[ i ];

			if ( target.POSITION !== undefined ) hasMorphPosition = true;
			if ( target.NORMAL !== undefined ) hasMorphNormal = true;

			if ( hasMorphPosition && hasMorphNormal ) break;

		}

		if ( ! hasMorphPosition && ! hasMorphNormal ) return Promise.resolve( geometry );

		var pendingPositionAccessors = [];
		var pendingNormalAccessors = [];

		for ( var i = 0, il = targets.length; i < il; i ++ ) {

			var target = targets[ i ];

			if ( hasMorphPosition ) {

				var pendingAccessor = target.POSITION !== undefined
					? parser.getDependency( 'accessor', target.POSITION )
					: geometry.attributes.position;

				pendingPositionAccessors.push( pendingAccessor );

			}

			if ( hasMorphNormal ) {

				var pendingAccessor = target.NORMAL !== undefined
					? parser.getDependency( 'accessor', target.NORMAL )
					: geometry.attributes.normal;

				pendingNormalAccessors.push( pendingAccessor );

			}

		}

		return Promise.all( [
			Promise.all( pendingPositionAccessors ),
			Promise.all( pendingNormalAccessors )
		] ).then( function ( accessors ) {

			var morphPositions = accessors[ 0 ];
			var morphNormals = accessors[ 1 ];

			// Clone morph target accessors before modifying them.

			for ( var i = 0, il = morphPositions.length; i < il; i ++ ) {

				if ( geometry.attributes.position === morphPositions[ i ] ) continue;

				morphPositions[ i ] = cloneBufferAttribute( morphPositions[ i ] );

			}

			for ( var i = 0, il = morphNormals.length; i < il; i ++ ) {

				if ( geometry.attributes.normal === morphNormals[ i ] ) continue;

				morphNormals[ i ] = cloneBufferAttribute( morphNormals[ i ] );

			}

			for ( var i = 0, il = targets.length; i < il; i ++ ) {

				var target = targets[ i ];
				var attributeName = 'morphTarget' + i;

				if ( hasMorphPosition ) {

					// Three.js morph position is absolute value. The formula is
					//   basePosition
					//     + weight0 * ( morphPosition0 - basePosition )
					//     + weight1 * ( morphPosition1 - basePosition )
					//     ...
					// while the glTF one is relative
					//   basePosition
					//     + weight0 * glTFmorphPosition0
					//     + weight1 * glTFmorphPosition1
					//     ...
					// then we need to convert from relative to absolute here.

					if ( target.POSITION !== undefined ) {

						var positionAttribute = morphPositions[ i ];
						positionAttribute.name = attributeName;

						var position = geometry.attributes.position;

						for ( var j = 0, jl = positionAttribute.count; j < jl; j ++ ) {

							positionAttribute.setXYZ(
								j,
								positionAttribute.getX( j ) + position.getX( j ),
								positionAttribute.getY( j ) + position.getY( j ),
								positionAttribute.getZ( j ) + position.getZ( j )
							);

						}

					}

				}

				if ( hasMorphNormal ) {

					// see target.POSITION's comment

					if ( target.NORMAL !== undefined ) {

						var normalAttribute = morphNormals[ i ];
						normalAttribute.name = attributeName;

						var normal = geometry.attributes.normal;

						for ( var j = 0, jl = normalAttribute.count; j < jl; j ++ ) {

							normalAttribute.setXYZ(
								j,
								normalAttribute.getX( j ) + normal.getX( j ),
								normalAttribute.getY( j ) + normal.getY( j ),
								normalAttribute.getZ( j ) + normal.getZ( j )
							);

						}

					}

				}

			}

			if ( hasMorphPosition ) geometry.morphAttributes.position = morphPositions;
			if ( hasMorphNormal ) geometry.morphAttributes.normal = morphNormals;

			return geometry;

		} );

	}

	/**
	 * @param {Mesh} mesh
	 * @param {GLTF.Mesh} meshDef
	 */
	function updateMorphTargets( mesh, meshDef ) {

		mesh.updateMorphTargets();

		if ( meshDef.weights !== undefined ) {

			for ( var i = 0, il = meshDef.weights.length; i < il; i ++ ) {

				mesh.morphTargetInfluences[ i ] = meshDef.weights[ i ];

			}

		}

		// .extras has user-defined data, so check that .extras.targetNames is an array.
		if ( meshDef.extras && Array.isArray( meshDef.extras.targetNames ) ) {

			var targetNames = meshDef.extras.targetNames;

			if ( mesh.morphTargetInfluences.length === targetNames.length ) {

				mesh.morphTargetDictionary = {};

				for ( var i = 0, il = targetNames.length; i < il; i ++ ) {

					mesh.morphTargetDictionary[ targetNames[ i ] ] = i;

				}

			} else {

				console.warn( 'THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.' );

			}

		}

	}

	function createPrimitiveKey( primitiveDef ) {

		var dracoExtension = primitiveDef.extensions && primitiveDef.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ];
		var geometryKey;

		if ( dracoExtension ) {

			geometryKey = 'draco:' + dracoExtension.bufferView
				+ ':' + dracoExtension.indices
				+ ':' + createAttributesKey( dracoExtension.attributes );

		} else {

			geometryKey = primitiveDef.indices + ':' + createAttributesKey( primitiveDef.attributes ) + ':' + primitiveDef.mode;

		}

		return geometryKey;

	}

	function createAttributesKey( attributes ) {

		var attributesKey = '';

		var keys = Object.keys( attributes ).sort();

		for ( var i = 0, il = keys.length; i < il; i ++ ) {

			attributesKey += keys[ i ] + ':' + attributes[ keys[ i ] ] + ';';

		}

		return attributesKey;

	}

	function cloneBufferAttribute( attribute ) {

		if ( attribute.isInterleavedBufferAttribute ) {

			var count = attribute.count;
			var itemSize = attribute.itemSize;
			var array = attribute.array.slice( 0, count * itemSize );

			for ( var i = 0, j = 0; i < count; ++ i ) {

				array[ j ++ ] = attribute.getX( i );
				if ( itemSize >= 2 ) array[ j ++ ] = attribute.getY( i );
				if ( itemSize >= 3 ) array[ j ++ ] = attribute.getZ( i );
				if ( itemSize >= 4 ) array[ j ++ ] = attribute.getW( i );

			}

			return new BufferAttribute( array, itemSize, attribute.normalized );

		}

		return attribute.clone();

	}

	/* GLTF PARSER */

	function GLTFParser( json, extensions, options ) {

		this.json = json || {};
		this.extensions = extensions || {};
		this.options = options || {};

		// loader object cache
		this.cache = new GLTFRegistry();

		// BufferGeometry caching
		this.primitiveCache = {};

		this.textureLoader = new TextureLoader( this.options.manager );
		this.textureLoader.setCrossOrigin( this.options.crossOrigin );

		this.fileLoader = new FileLoader( this.options.manager );
		this.fileLoader.setResponseType( 'arraybuffer' );

	}

	GLTFParser.prototype.parse = function ( onLoad, onError ) {

		var parser = this;
		var json = this.json;
		var extensions = this.extensions;

		// Clear the loader cache
		this.cache.removeAll();

		// Mark the special nodes/meshes in json for efficient parse
		this.markDefs();

		Promise.all( [

			this.getDependencies( 'scene' ),
			this.getDependencies( 'animation' ),
			this.getDependencies( 'camera' ),

		] ).then( function ( dependencies ) {

			var result = {
				scene: dependencies[ 0 ][ json.scene || 0 ],
				scenes: dependencies[ 0 ],
				animations: dependencies[ 1 ],
				cameras: dependencies[ 2 ],
				asset: json.asset,
				parser: parser,
				userData: {}
			};

			addUnknownExtensionsToUserData( extensions, result, json );

			onLoad( result );

		} ).catch( onError );

	};

	/**
	 * Marks the special nodes/meshes in json for efficient parse.
	 */
	GLTFParser.prototype.markDefs = function () {

		var nodeDefs = this.json.nodes || [];
		var skinDefs = this.json.skins || [];
		var meshDefs = this.json.meshes || [];

		var meshReferences = {};
		var meshUses = {};

		// Nothing in the node definition indicates whether it is a Bone or an
		// Object3D. Use the skins' joint references to mark bones.
		for ( var skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex ++ ) {

			var joints = skinDefs[ skinIndex ].joints;

			for ( var i = 0, il = joints.length; i < il; i ++ ) {

				nodeDefs[ joints[ i ] ].isBone = true;

			}

		}

		// Meshes can (and should) be reused by multiple nodes in a glTF asset. To
		// avoid having more than one Mesh with the same name, count
		// references and rename instances below.
		//
		// Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
		for ( var nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

			var nodeDef = nodeDefs[ nodeIndex ];

			if ( nodeDef.mesh !== undefined ) {

				if ( meshReferences[ nodeDef.mesh ] === undefined ) {

					meshReferences[ nodeDef.mesh ] = meshUses[ nodeDef.mesh ] = 0;

				}

				meshReferences[ nodeDef.mesh ] ++;

				// Nothing in the mesh definition indicates whether it is
				// a SkinnedMesh or Mesh. Use the node's mesh reference
				// to mark SkinnedMesh if node has skin.
				if ( nodeDef.skin !== undefined ) {

					meshDefs[ nodeDef.mesh ].isSkinnedMesh = true;

				}

			}

		}

		this.json.meshReferences = meshReferences;
		this.json.meshUses = meshUses;

	};

	/**
	 * Requests the specified dependency asynchronously, with caching.
	 * @param {string} type
	 * @param {number} index
	 * @return {Promise<Object3D|Material|Texture|AnimationClip|ArrayBuffer|Object>}
	 */
	GLTFParser.prototype.getDependency = function ( type, index ) {

		var cacheKey = type + ':' + index;
		var dependency = this.cache.get( cacheKey );

		if ( ! dependency ) {

			switch ( type ) {

				case 'scene':
					dependency = this.loadScene( index );
					break;

				case 'node':
					dependency = this.loadNode( index );
					break;

				case 'mesh':
					dependency = this.loadMesh( index );
					break;

				case 'accessor':
					dependency = this.loadAccessor( index );
					break;

				case 'bufferView':
					dependency = this.loadBufferView( index );
					break;

				case 'buffer':
					dependency = this.loadBuffer( index );
					break;

				case 'material':
					dependency = this.loadMaterial( index );
					break;

				case 'texture':
					dependency = this.loadTexture( index );
					break;

				case 'skin':
					dependency = this.loadSkin( index );
					break;

				case 'animation':
					dependency = this.loadAnimation( index );
					break;

				case 'camera':
					dependency = this.loadCamera( index );
					break;

				case 'light':
					dependency = this.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].loadLight( index );
					break;

				default:
					throw new Error( 'Unknown type: ' + type );

			}

			this.cache.add( cacheKey, dependency );

		}

		return dependency;

	};

	/**
	 * Requests all dependencies of the specified type asynchronously, with caching.
	 * @param {string} type
	 * @return {Promise<Array<Object>>}
	 */
	GLTFParser.prototype.getDependencies = function ( type ) {

		var dependencies = this.cache.get( type );

		if ( ! dependencies ) {

			var parser = this;
			var defs = this.json[ type + ( type === 'mesh' ? 'es' : 's' ) ] || [];

			dependencies = Promise.all( defs.map( function ( def, index ) {

				return parser.getDependency( type, index );

			} ) );

			this.cache.add( type, dependencies );

		}

		return dependencies;

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
	 * @param {number} bufferIndex
	 * @return {Promise<ArrayBuffer>}
	 */
	GLTFParser.prototype.loadBuffer = function ( bufferIndex ) {

		var bufferDef = this.json.buffers[ bufferIndex ];
		var loader = this.fileLoader;

		if ( bufferDef.type && bufferDef.type !== 'arraybuffer' ) {

			throw new Error( 'THREE.GLTFLoader: ' + bufferDef.type + ' buffer type is not supported.' );

		}

		// If present, GLB container is required to be the first buffer.
		if ( bufferDef.uri === undefined && bufferIndex === 0 ) {

			return Promise.resolve( this.extensions[ EXTENSIONS.KHR_BINARY_GLTF ].body );

		}

		var options = this.options;

		return new Promise( function ( resolve, reject ) {

			loader.load( resolveURL( bufferDef.uri, options.path ), resolve, undefined, function () {

				reject( new Error( 'THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".' ) );

			} );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
	 * @param {number} bufferViewIndex
	 * @return {Promise<ArrayBuffer>}
	 */
	GLTFParser.prototype.loadBufferView = function ( bufferViewIndex ) {

		var bufferViewDef = this.json.bufferViews[ bufferViewIndex ];

		return this.getDependency( 'buffer', bufferViewDef.buffer ).then( function ( buffer ) {

			var byteLength = bufferViewDef.byteLength || 0;
			var byteOffset = bufferViewDef.byteOffset || 0;
			return buffer.slice( byteOffset, byteOffset + byteLength );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
	 * @param {number} accessorIndex
	 * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
	 */
	GLTFParser.prototype.loadAccessor = function ( accessorIndex ) {

		var parser = this;
		var json = this.json;

		var accessorDef = this.json.accessors[ accessorIndex ];

		if ( accessorDef.bufferView === undefined && accessorDef.sparse === undefined ) {

			// Ignore empty accessors, which may be used to declare runtime
			// information about attributes coming from another source (e.g. Draco
			// compression extension).
			return Promise.resolve( null );

		}

		var pendingBufferViews = [];

		if ( accessorDef.bufferView !== undefined ) {

			pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.bufferView ) );

		} else {

			pendingBufferViews.push( null );

		}

		if ( accessorDef.sparse !== undefined ) {

			pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.indices.bufferView ) );
			pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.values.bufferView ) );

		}

		return Promise.all( pendingBufferViews ).then( function ( bufferViews ) {

			var bufferView = bufferViews[ 0 ];

			var itemSize = WEBGL_TYPE_SIZES[ accessorDef.type ];
			var TypedArray = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ];

			// For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
			var elementBytes = TypedArray.BYTES_PER_ELEMENT;
			var itemBytes = elementBytes * itemSize;
			var byteOffset = accessorDef.byteOffset || 0;
			var byteStride = accessorDef.bufferView !== undefined ? json.bufferViews[ accessorDef.bufferView ].byteStride : undefined;
			var normalized = accessorDef.normalized === true;
			var array, bufferAttribute;

			// The buffer is not interleaved if the stride is the item size in bytes.
			if ( byteStride && byteStride !== itemBytes ) {

				var ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType;
				var ib = parser.cache.get( ibCacheKey );

				if ( ! ib ) {

					// Use the full buffer if it's interleaved.
					array = new TypedArray( bufferView );

					// Integer parameters to IB/IBA are in array elements, not bytes.
					ib = new InterleavedBuffer( array, byteStride / elementBytes );

					parser.cache.add( ibCacheKey, ib );

				}

				bufferAttribute = new InterleavedBufferAttribute( ib, itemSize, byteOffset / elementBytes, normalized );

			} else {

				if ( bufferView === null ) {

					array = new TypedArray( accessorDef.count * itemSize );

				} else {

					array = new TypedArray( bufferView, byteOffset, accessorDef.count * itemSize );

				}

				bufferAttribute = new BufferAttribute( array, itemSize, normalized );

			}

			// https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#sparse-accessors
			if ( accessorDef.sparse !== undefined ) {

				var itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
				var TypedArrayIndices = WEBGL_COMPONENT_TYPES[ accessorDef.sparse.indices.componentType ];

				var byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
				var byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;

				var sparseIndices = new TypedArrayIndices( bufferViews[ 1 ], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices );
				var sparseValues = new TypedArray( bufferViews[ 2 ], byteOffsetValues, accessorDef.sparse.count * itemSize );

				if ( bufferView !== null ) {

					// Avoid modifying the original ArrayBuffer, if the bufferView wasn't initialized with zeroes.
					bufferAttribute.setArray( bufferAttribute.array.slice() );

				}

				for ( var i = 0, il = sparseIndices.length; i < il; i ++ ) {

					var index = sparseIndices[ i ];

					bufferAttribute.setX( index, sparseValues[ i * itemSize ] );
					if ( itemSize >= 2 ) bufferAttribute.setY( index, sparseValues[ i * itemSize + 1 ] );
					if ( itemSize >= 3 ) bufferAttribute.setZ( index, sparseValues[ i * itemSize + 2 ] );
					if ( itemSize >= 4 ) bufferAttribute.setW( index, sparseValues[ i * itemSize + 3 ] );
					if ( itemSize >= 5 ) throw new Error( 'THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.' );

				}

			}

			return bufferAttribute;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
	 * @param {number} textureIndex
	 * @return {Promise<Texture>}
	 */
	GLTFParser.prototype.loadTexture = function ( textureIndex ) {

		var parser = this;
		var json = this.json;
		var options = this.options;
		var textureLoader = this.textureLoader;

		var URL = window.URL || window.webkitURL;

		var textureDef = json.textures[ textureIndex ];

		var textureExtensions = textureDef.extensions || {};

		var source;

		if ( textureExtensions[ EXTENSIONS.MSFT_TEXTURE_DDS ] ) {

			source = json.images[ textureExtensions[ EXTENSIONS.MSFT_TEXTURE_DDS ].source ];

		} else {

			source = json.images[ textureDef.source ];

		}

		var sourceURI = source.uri;
		var isObjectURL = false;

		if ( source.bufferView !== undefined ) {

			// Load binary image data from bufferView, if provided.

			sourceURI = parser.getDependency( 'bufferView', source.bufferView ).then( function ( bufferView ) {

				isObjectURL = true;
				var blob = new Blob( [ bufferView ], { type: source.mimeType } );
				sourceURI = URL.createObjectURL( blob );
				return sourceURI;

			} );

		}

		return Promise.resolve( sourceURI ).then( function ( sourceURI ) {

			// Load Texture resource.

			var loader = Loader$1.Handlers.get( sourceURI );

			if ( ! loader ) {

				loader = textureExtensions[ EXTENSIONS.MSFT_TEXTURE_DDS ]
					? parser.extensions[ EXTENSIONS.MSFT_TEXTURE_DDS ].ddsLoader
					: textureLoader;

			}

			return new Promise( function ( resolve, reject ) {

				loader.load( resolveURL( sourceURI, options.path ), resolve, undefined, reject );

			} );

		} ).then( function ( texture ) {

			// Clean up resources and configure Texture.

			if ( isObjectURL === true ) {

				URL.revokeObjectURL( sourceURI );

			}

			texture.flipY = false;

			if ( textureDef.name !== undefined ) texture.name = textureDef.name;

			// Ignore unknown mime types, like DDS files.
			if ( source.mimeType in MIME_TYPE_FORMATS ) {

				texture.format = MIME_TYPE_FORMATS[ source.mimeType ];

			}

			var samplers = json.samplers || {};
			var sampler = samplers[ textureDef.sampler ] || {};

			texture.magFilter = WEBGL_FILTERS[ sampler.magFilter ] || LinearFilter;
			texture.minFilter = WEBGL_FILTERS[ sampler.minFilter ] || LinearMipMapLinearFilter;
			texture.wrapS = WEBGL_WRAPPINGS[ sampler.wrapS ] || RepeatWrapping;
			texture.wrapT = WEBGL_WRAPPINGS[ sampler.wrapT ] || RepeatWrapping;

			return texture;

		} );

	};

	/**
	 * Asynchronously assigns a texture to the given material parameters.
	 * @param {Object} materialParams
	 * @param {string} mapName
	 * @param {Object} mapDef
	 * @return {Promise}
	 */
	GLTFParser.prototype.assignTexture = function ( materialParams, mapName, mapDef ) {

		var parser = this;

		return this.getDependency( 'texture', mapDef.index ).then( function ( texture ) {

			if ( ! texture.isCompressedTexture ) {

				switch ( mapName ) {

					case 'aoMap':
					case 'emissiveMap':
					case 'metalnessMap':
					case 'normalMap':
					case 'roughnessMap':
						texture.format = RGBFormat;
						break;

				}

			}

			if ( parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] ) {

				var transform = mapDef.extensions !== undefined ? mapDef.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] : undefined;

				if ( transform ) {

					texture = parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ].extendTexture( texture, transform );

				}

			}

			materialParams[ mapName ] = texture;

		} );

	};

	/**
	 * Assigns final material to a Mesh, Line, or Points instance. The instance
	 * already has a material (generated from the glTF material options alone)
	 * but reuse of the same glTF material may require multiple threejs materials
	 * to accomodate different primitive types, defines, etc. New materials will
	 * be created if necessary, and reused from a cache.
	 * @param  {Object3D} mesh Mesh, Line, or Points instance.
	 */
	GLTFParser.prototype.assignFinalMaterial = function ( mesh ) {

		var geometry = mesh.geometry;
		var material = mesh.material;
		var extensions = this.extensions;

		var useVertexTangents = geometry.attributes.tangent !== undefined;
		var useVertexColors = geometry.attributes.color !== undefined;
		var useFlatShading = geometry.attributes.normal === undefined;
		var useSkinning = mesh.isSkinnedMesh === true;
		var useMorphTargets = Object.keys( geometry.morphAttributes ).length > 0;
		var useMorphNormals = useMorphTargets && geometry.morphAttributes.normal !== undefined;

		if ( mesh.isPoints ) {

			var cacheKey = 'PointsMaterial:' + material.uuid;

			var pointsMaterial = this.cache.get( cacheKey );

			if ( ! pointsMaterial ) {

				pointsMaterial = new PointsMaterial();
				Material.prototype.copy.call( pointsMaterial, material );
				pointsMaterial.color.copy( material.color );
				pointsMaterial.map = material.map;
				pointsMaterial.lights = false; // PointsMaterial doesn't support lights yet

				this.cache.add( cacheKey, pointsMaterial );

			}

			material = pointsMaterial;

		} else if ( mesh.isLine ) {

			var cacheKey = 'LineBasicMaterial:' + material.uuid;

			var lineMaterial = this.cache.get( cacheKey );

			if ( ! lineMaterial ) {

				lineMaterial = new LineBasicMaterial();
				Material.prototype.copy.call( lineMaterial, material );
				lineMaterial.color.copy( material.color );
				lineMaterial.lights = false; // LineBasicMaterial doesn't support lights yet

				this.cache.add( cacheKey, lineMaterial );

			}

			material = lineMaterial;

		}

		// Clone the material if it will be modified
		if ( useVertexTangents || useVertexColors || useFlatShading || useSkinning || useMorphTargets ) {

			var cacheKey = 'ClonedMaterial:' + material.uuid + ':';

			if ( material.isGLTFSpecularGlossinessMaterial ) cacheKey += 'specular-glossiness:';
			if ( useSkinning ) cacheKey += 'skinning:';
			if ( useVertexTangents ) cacheKey += 'vertex-tangents:';
			if ( useVertexColors ) cacheKey += 'vertex-colors:';
			if ( useFlatShading ) cacheKey += 'flat-shading:';
			if ( useMorphTargets ) cacheKey += 'morph-targets:';
			if ( useMorphNormals ) cacheKey += 'morph-normals:';

			var cachedMaterial = this.cache.get( cacheKey );

			if ( ! cachedMaterial ) {

				cachedMaterial = material.isGLTFSpecularGlossinessMaterial
					? extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ].cloneMaterial( material )
					: material.clone();

				if ( useSkinning ) cachedMaterial.skinning = true;
				if ( useVertexTangents ) cachedMaterial.vertexTangents = true;
				if ( useVertexColors ) cachedMaterial.vertexColors = VertexColors;
				if ( useFlatShading ) cachedMaterial.flatShading = true;
				if ( useMorphTargets ) cachedMaterial.morphTargets = true;
				if ( useMorphNormals ) cachedMaterial.morphNormals = true;

				this.cache.add( cacheKey, cachedMaterial );

			}

			material = cachedMaterial;

		}

		// workarounds for mesh and geometry

		if ( material.aoMap && geometry.attributes.uv2 === undefined && geometry.attributes.uv !== undefined ) {

			console.log( 'THREE.GLTFLoader: Duplicating UVs to support aoMap.' );
			geometry.addAttribute( 'uv2', new BufferAttribute( geometry.attributes.uv.array, 2 ) );

		}

		if ( material.isGLTFSpecularGlossinessMaterial ) {

			// for GLTFSpecularGlossinessMaterial(ShaderMaterial) uniforms runtime update
			mesh.onBeforeRender = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ].refreshUniforms;

		}

		mesh.material = material;

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
	 * @param {number} materialIndex
	 * @return {Promise<Material>}
	 */
	GLTFParser.prototype.loadMaterial = function ( materialIndex ) {

		var parser = this;
		var json = this.json;
		var extensions = this.extensions;
		var materialDef = json.materials[ materialIndex ];

		var materialType;
		var materialParams = {};
		var materialExtensions = materialDef.extensions || {};

		var pending = [];

		if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ] ) {

			var sgExtension = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ];
			materialType = sgExtension.getMaterialType();
			pending.push( sgExtension.extendParams( materialParams, materialDef, parser ) );

		} else if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ] ) {

			var kmuExtension = extensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ];
			materialType = kmuExtension.getMaterialType();
			pending.push( kmuExtension.extendParams( materialParams, materialDef, parser ) );

		} else {

			// Specification:
			// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#metallic-roughness-material

			materialType = MeshStandardMaterial;

			var metallicRoughness = materialDef.pbrMetallicRoughness || {};

			materialParams.color = new Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;

			if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

				var array = metallicRoughness.baseColorFactor;

				materialParams.color.fromArray( array );
				materialParams.opacity = array[ 3 ];

			}

			if ( metallicRoughness.baseColorTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

			}

			materialParams.metalness = metallicRoughness.metallicFactor !== undefined ? metallicRoughness.metallicFactor : 1.0;
			materialParams.roughness = metallicRoughness.roughnessFactor !== undefined ? metallicRoughness.roughnessFactor : 1.0;

			if ( metallicRoughness.metallicRoughnessTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture ) );
				pending.push( parser.assignTexture( materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture ) );

			}

		}

		if ( materialDef.doubleSided === true ) {

			materialParams.side = DoubleSide;

		}

		var alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;

		if ( alphaMode === ALPHA_MODES.BLEND ) {

			materialParams.transparent = true;

		} else {

			materialParams.transparent = false;

			if ( alphaMode === ALPHA_MODES.MASK ) {

				materialParams.alphaTest = materialDef.alphaCutoff !== undefined ? materialDef.alphaCutoff : 0.5;

			}

		}

		if ( materialDef.normalTexture !== undefined && materialType !== MeshBasicMaterial ) {

			pending.push( parser.assignTexture( materialParams, 'normalMap', materialDef.normalTexture ) );

			materialParams.normalScale = new Vector2( 1, 1 );

			if ( materialDef.normalTexture.scale !== undefined ) {

				materialParams.normalScale.set( materialDef.normalTexture.scale, materialDef.normalTexture.scale );

			}

		}

		if ( materialDef.occlusionTexture !== undefined && materialType !== MeshBasicMaterial ) {

			pending.push( parser.assignTexture( materialParams, 'aoMap', materialDef.occlusionTexture ) );

			if ( materialDef.occlusionTexture.strength !== undefined ) {

				materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;

			}

		}

		if ( materialDef.emissiveFactor !== undefined && materialType !== MeshBasicMaterial ) {

			materialParams.emissive = new Color().fromArray( materialDef.emissiveFactor );

		}

		if ( materialDef.emissiveTexture !== undefined && materialType !== MeshBasicMaterial ) {

			pending.push( parser.assignTexture( materialParams, 'emissiveMap', materialDef.emissiveTexture ) );

		}

		return Promise.all( pending ).then( function () {

			var material;

			if ( materialType === ShaderMaterial ) {

				material = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ].createMaterial( materialParams );

			} else {

				material = new materialType( materialParams );

			}

			if ( materialDef.name !== undefined ) material.name = materialDef.name;

			// baseColorTexture, emissiveTexture, and specularGlossinessTexture use sRGB encoding.
			if ( material.map ) material.map.encoding = sRGBEncoding;
			if ( material.emissiveMap ) material.emissiveMap.encoding = sRGBEncoding;
			if ( material.specularMap ) material.specularMap.encoding = sRGBEncoding;

			assignExtrasToUserData( material, materialDef );

			if ( materialDef.extensions ) addUnknownExtensionsToUserData( extensions, material, materialDef );

			return material;

		} );

	};

	/**
	 * @param {BufferGeometry} geometry
	 * @param {GLTF.Primitive} primitiveDef
	 * @param {GLTFParser} parser
	 * @return {Promise<BufferGeometry>}
	 */
	function addPrimitiveAttributes( geometry, primitiveDef, parser ) {

		var attributes = primitiveDef.attributes;

		var pending = [];

		function assignAttributeAccessor( accessorIndex, attributeName ) {

			return parser.getDependency( 'accessor', accessorIndex )
				.then( function ( accessor ) {

					geometry.addAttribute( attributeName, accessor );

				} );

		}

		for ( var gltfAttributeName in attributes ) {

			var threeAttributeName = ATTRIBUTES[ gltfAttributeName ] || gltfAttributeName.toLowerCase();

			// Skip attributes already provided by e.g. Draco extension.
			if ( threeAttributeName in geometry.attributes ) continue;

			pending.push( assignAttributeAccessor( attributes[ gltfAttributeName ], threeAttributeName ) );

		}

		if ( primitiveDef.indices !== undefined && ! geometry.index ) {

			var accessor = parser.getDependency( 'accessor', primitiveDef.indices ).then( function ( accessor ) {

				geometry.setIndex( accessor );

			} );

			pending.push( accessor );

		}

		assignExtrasToUserData( geometry, primitiveDef );

		return Promise.all( pending ).then( function () {

			return primitiveDef.targets !== undefined
				? addMorphTargets( geometry, primitiveDef.targets, parser )
				: geometry;

		} );

	}

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
	 *
	 * Creates BufferGeometries from primitives.
	 *
	 * @param {Array<GLTF.Primitive>} primitives
	 * @return {Promise<Array<BufferGeometry>>}
	 */
	GLTFParser.prototype.loadGeometries = function ( primitives ) {

		var parser = this;
		var extensions = this.extensions;
		var cache = this.primitiveCache;

		function createDracoPrimitive( primitive ) {

			return extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ]
				.decodePrimitive( primitive, parser )
				.then( function ( geometry ) {

					return addPrimitiveAttributes( geometry, primitive, parser );

				} );

		}

		var pending = [];

		for ( var i = 0, il = primitives.length; i < il; i ++ ) {

			var primitive = primitives[ i ];
			var cacheKey = createPrimitiveKey( primitive );

			// See if we've already created this geometry
			var cached = cache[ cacheKey ];

			if ( cached ) {

				// Use the cached geometry if it exists
				pending.push( cached.promise );

			} else {

				var geometryPromise;

				if ( primitive.extensions && primitive.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ] ) {

					// Use DRACO geometry if available
					geometryPromise = createDracoPrimitive( primitive );

				} else {

					// Otherwise create a new geometry
					geometryPromise = addPrimitiveAttributes( new BufferGeometry(), primitive, parser );

				}

				// Cache this geometry
				cache[ cacheKey ] = { primitive: primitive, promise: geometryPromise };

				pending.push( geometryPromise );

			}

		}

		return Promise.all( pending );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
	 * @param {number} meshIndex
	 * @return {Promise<Group|Mesh|SkinnedMesh>}
	 */
	GLTFParser.prototype.loadMesh = function ( meshIndex ) {

		var parser = this;
		var json = this.json;
		var extensions = this.extensions;

		var meshDef = json.meshes[ meshIndex ];
		var primitives = meshDef.primitives;

		var pending = [];

		for ( var i = 0, il = primitives.length; i < il; i ++ ) {

			var material = primitives[ i ].material === undefined
				? createDefaultMaterial()
				: this.getDependency( 'material', primitives[ i ].material );

			pending.push( material );

		}

		return Promise.all( pending ).then( function ( originalMaterials ) {

			return parser.loadGeometries( primitives ).then( function ( geometries ) {

				var meshes = [];

				for ( var i = 0, il = geometries.length; i < il; i ++ ) {

					var geometry = geometries[ i ];
					var primitive = primitives[ i ];

					// 1. create Mesh

					var mesh;

					var material = originalMaterials[ i ];

					if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLES ||
						primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ||
						primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ||
						primitive.mode === undefined ) {

						// .isSkinnedMesh isn't in glTF spec. See .markDefs()
						mesh = meshDef.isSkinnedMesh === true
							? new SkinnedMesh( geometry, material )
							: new Mesh( geometry, material );

						if ( mesh.isSkinnedMesh === true ) mesh.normalizeSkinWeights(); // #15319

						if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ) {

							mesh.drawMode = TriangleStripDrawMode;

						} else if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ) {

							mesh.drawMode = TriangleFanDrawMode;

						}

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINES ) {

						mesh = new LineSegments( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_STRIP ) {

						mesh = new Line( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_LOOP ) {

						mesh = new LineLoop( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.POINTS ) {

						mesh = new Points( geometry, material );

					} else {

						throw new Error( 'THREE.GLTFLoader: Primitive mode unsupported: ' + primitive.mode );

					}

					if ( Object.keys( mesh.geometry.morphAttributes ).length > 0 ) {

						updateMorphTargets( mesh, meshDef );

					}

					mesh.name = meshDef.name || ( 'mesh_' + meshIndex );

					if ( geometries.length > 1 ) mesh.name += '_' + i;

					assignExtrasToUserData( mesh, meshDef );

					parser.assignFinalMaterial( mesh );

					meshes.push( mesh );

				}

				if ( meshes.length === 1 ) {

					return meshes[ 0 ];

				}

				var group = new Group();

				for ( var i = 0, il = meshes.length; i < il; i ++ ) {

					group.add( meshes[ i ] );

				}

				return group;

			} );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
	 * @param {number} cameraIndex
	 * @return {Promise<Camera>}
	 */
	GLTFParser.prototype.loadCamera = function ( cameraIndex ) {

		var camera;
		var cameraDef = this.json.cameras[ cameraIndex ];
		var params = cameraDef[ cameraDef.type ];

		if ( ! params ) {

			console.warn( 'THREE.GLTFLoader: Missing camera parameters.' );
			return;

		}

		if ( cameraDef.type === 'perspective' ) {

			camera = new PerspectiveCamera( Math$1.radToDeg( params.yfov ), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6 );

		} else if ( cameraDef.type === 'orthographic' ) {

			camera = new OrthographicCamera( params.xmag / - 2, params.xmag / 2, params.ymag / 2, params.ymag / - 2, params.znear, params.zfar );

		}

		if ( cameraDef.name !== undefined ) camera.name = cameraDef.name;

		assignExtrasToUserData( camera, cameraDef );

		return Promise.resolve( camera );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
	 * @param {number} skinIndex
	 * @return {Promise<Object>}
	 */
	GLTFParser.prototype.loadSkin = function ( skinIndex ) {

		var skinDef = this.json.skins[ skinIndex ];

		var skinEntry = { joints: skinDef.joints };

		if ( skinDef.inverseBindMatrices === undefined ) {

			return Promise.resolve( skinEntry );

		}

		return this.getDependency( 'accessor', skinDef.inverseBindMatrices ).then( function ( accessor ) {

			skinEntry.inverseBindMatrices = accessor;

			return skinEntry;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
	 * @param {number} animationIndex
	 * @return {Promise<AnimationClip>}
	 */
	GLTFParser.prototype.loadAnimation = function ( animationIndex ) {

		var json = this.json;

		var animationDef = json.animations[ animationIndex ];

		var pendingNodes = [];
		var pendingInputAccessors = [];
		var pendingOutputAccessors = [];
		var pendingSamplers = [];
		var pendingTargets = [];

		for ( var i = 0, il = animationDef.channels.length; i < il; i ++ ) {

			var channel = animationDef.channels[ i ];
			var sampler = animationDef.samplers[ channel.sampler ];
			var target = channel.target;
			var name = target.node !== undefined ? target.node : target.id; // NOTE: target.id is deprecated.
			var input = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.input ] : sampler.input;
			var output = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.output ] : sampler.output;

			pendingNodes.push( this.getDependency( 'node', name ) );
			pendingInputAccessors.push( this.getDependency( 'accessor', input ) );
			pendingOutputAccessors.push( this.getDependency( 'accessor', output ) );
			pendingSamplers.push( sampler );
			pendingTargets.push( target );

		}

		return Promise.all( [

			Promise.all( pendingNodes ),
			Promise.all( pendingInputAccessors ),
			Promise.all( pendingOutputAccessors ),
			Promise.all( pendingSamplers ),
			Promise.all( pendingTargets )

		] ).then( function ( dependencies ) {

			var nodes = dependencies[ 0 ];
			var inputAccessors = dependencies[ 1 ];
			var outputAccessors = dependencies[ 2 ];
			var samplers = dependencies[ 3 ];
			var targets = dependencies[ 4 ];

			var tracks = [];

			for ( var i = 0, il = nodes.length; i < il; i ++ ) {

				var node = nodes[ i ];
				var inputAccessor = inputAccessors[ i ];
				var outputAccessor = outputAccessors[ i ];
				var sampler = samplers[ i ];
				var target = targets[ i ];

				if ( node === undefined ) continue;

				node.updateMatrix();
				node.matrixAutoUpdate = true;

				var TypedKeyframeTrack;

				switch ( PATH_PROPERTIES[ target.path ] ) {

					case PATH_PROPERTIES.weights:

						TypedKeyframeTrack = NumberKeyframeTrack;
						break;

					case PATH_PROPERTIES.rotation:

						TypedKeyframeTrack = QuaternionKeyframeTrack;
						break;

					case PATH_PROPERTIES.position:
					case PATH_PROPERTIES.scale:
					default:

						TypedKeyframeTrack = VectorKeyframeTrack;
						break;

				}

				var targetName = node.name ? node.name : node.uuid;

				var interpolation = sampler.interpolation !== undefined ? INTERPOLATION[ sampler.interpolation ] : InterpolateLinear;

				var targetNames = [];

				if ( PATH_PROPERTIES[ target.path ] === PATH_PROPERTIES.weights ) {

					// Node may be a Group (glTF mesh with several primitives) or a Mesh.
					node.traverse( function ( object ) {

						if ( object.isMesh === true && object.morphTargetInfluences ) {

							targetNames.push( object.name ? object.name : object.uuid );

						}

					} );

				} else {

					targetNames.push( targetName );

				}

				for ( var j = 0, jl = targetNames.length; j < jl; j ++ ) {

					var track = new TypedKeyframeTrack(
						targetNames[ j ] + '.' + PATH_PROPERTIES[ target.path ],
						inputAccessor.array,
						outputAccessor.array,
						interpolation
					);

					// Override interpolation with custom factory method.
					if ( sampler.interpolation === 'CUBICSPLINE' ) {

						track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline( result ) {

							// A CUBICSPLINE keyframe in glTF has three output values for each input value,
							// representing inTangent, splineVertex, and outTangent. As a result, track.getValueSize()
							// must be divided by three to get the interpolant's sampleSize argument.

							return new GLTFCubicSplineInterpolant( this.times, this.values, this.getValueSize() / 3, result );

						};

						// Mark as CUBICSPLINE. `track.getInterpolation()` doesn't support custom interpolants.
						track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;

					}

					tracks.push( track );

				}

			}

			var name = animationDef.name !== undefined ? animationDef.name : 'animation_' + animationIndex;

			return new AnimationClip( name, undefined, tracks );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
	 * @param {number} nodeIndex
	 * @return {Promise<Object3D>}
	 */
	GLTFParser.prototype.loadNode = function ( nodeIndex ) {

		var json = this.json;
		var extensions = this.extensions;
		var parser = this;

		var meshReferences = json.meshReferences;
		var meshUses = json.meshUses;

		var nodeDef = json.nodes[ nodeIndex ];

		return ( function () {

			// .isBone isn't in glTF spec. See .markDefs
			if ( nodeDef.isBone === true ) {

				return Promise.resolve( new Bone() );

			} else if ( nodeDef.mesh !== undefined ) {

				return parser.getDependency( 'mesh', nodeDef.mesh ).then( function ( mesh ) {

					var node;

					if ( meshReferences[ nodeDef.mesh ] > 1 ) {

						var instanceNum = meshUses[ nodeDef.mesh ] ++;

						node = mesh.clone();
						node.name += '_instance_' + instanceNum;

						// onBeforeRender copy for Specular-Glossiness
						node.onBeforeRender = mesh.onBeforeRender;

						for ( var i = 0, il = node.children.length; i < il; i ++ ) {

							node.children[ i ].name += '_instance_' + instanceNum;
							node.children[ i ].onBeforeRender = mesh.children[ i ].onBeforeRender;

						}

					} else {

						node = mesh;

					}

					// if weights are provided on the node, override weights on the mesh.
					if ( nodeDef.weights !== undefined ) {

						node.traverse( function ( o ) {

							if ( ! o.isMesh ) return;

							for ( var i = 0, il = nodeDef.weights.length; i < il; i ++ ) {

								o.morphTargetInfluences[ i ] = nodeDef.weights[ i ];

							}

						} );

					}

					return node;

				} );

			} else if ( nodeDef.camera !== undefined ) {

				return parser.getDependency( 'camera', nodeDef.camera );

			} else if ( nodeDef.extensions
				&& nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ]
				&& nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].light !== undefined ) {

				return parser.getDependency( 'light', nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].light );

			} else {

				return Promise.resolve( new Object3D() );

			}

		}() ).then( function ( node ) {

			if ( nodeDef.name !== undefined ) {

				node.userData.name = nodeDef.name;
				node.name = PropertyBinding.sanitizeNodeName( nodeDef.name );

			}

			assignExtrasToUserData( node, nodeDef );

			if ( nodeDef.extensions ) addUnknownExtensionsToUserData( extensions, node, nodeDef );

			if ( nodeDef.matrix !== undefined ) {

				var matrix = new Matrix4();
				matrix.fromArray( nodeDef.matrix );
				node.applyMatrix( matrix );

			} else {

				if ( nodeDef.translation !== undefined ) {

					node.position.fromArray( nodeDef.translation );

				}

				if ( nodeDef.rotation !== undefined ) {

					node.quaternion.fromArray( nodeDef.rotation );

				}

				if ( nodeDef.scale !== undefined ) {

					node.scale.fromArray( nodeDef.scale );

				}

			}

			return node;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
	 * @param {number} sceneIndex
	 * @return {Promise<Scene>}
	 */
	GLTFParser.prototype.loadScene = function () {

		// scene node hierachy builder

		function buildNodeHierachy( nodeId, parentObject, json, parser ) {

			var nodeDef = json.nodes[ nodeId ];

			return parser.getDependency( 'node', nodeId ).then( function ( node ) {

				if ( nodeDef.skin === undefined ) return node;

				// build skeleton here as well

				var skinEntry;

				return parser.getDependency( 'skin', nodeDef.skin ).then( function ( skin ) {

					skinEntry = skin;

					var pendingJoints = [];

					for ( var i = 0, il = skinEntry.joints.length; i < il; i ++ ) {

						pendingJoints.push( parser.getDependency( 'node', skinEntry.joints[ i ] ) );

					}

					return Promise.all( pendingJoints );

				} ).then( function ( jointNodes ) {

					var meshes = node.isGroup === true ? node.children : [ node ];

					for ( var i = 0, il = meshes.length; i < il; i ++ ) {

						var mesh = meshes[ i ];

						var bones = [];
						var boneInverses = [];

						for ( var j = 0, jl = jointNodes.length; j < jl; j ++ ) {

							var jointNode = jointNodes[ j ];

							if ( jointNode ) {

								bones.push( jointNode );

								var mat = new Matrix4();

								if ( skinEntry.inverseBindMatrices !== undefined ) {

									mat.fromArray( skinEntry.inverseBindMatrices.array, j * 16 );

								}

								boneInverses.push( mat );

							} else {

								console.warn( 'THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[ j ] );

							}

						}

						mesh.bind( new Skeleton( bones, boneInverses ), mesh.matrixWorld );

					}

					return node;

				} );

			} ).then( function ( node ) {

				// build node hierachy

				parentObject.add( node );

				var pending = [];

				if ( nodeDef.children ) {

					var children = nodeDef.children;

					for ( var i = 0, il = children.length; i < il; i ++ ) {

						var child = children[ i ];
						pending.push( buildNodeHierachy( child, node, json, parser ) );

					}

				}

				return Promise.all( pending );

			} );

		}

		return function loadScene( sceneIndex ) {

			var json = this.json;
			var extensions = this.extensions;
			var sceneDef = this.json.scenes[ sceneIndex ];
			var parser = this;

			var scene = new Scene();
			if ( sceneDef.name !== undefined ) scene.name = sceneDef.name;

			assignExtrasToUserData( scene, sceneDef );

			if ( sceneDef.extensions ) addUnknownExtensionsToUserData( extensions, scene, sceneDef );

			var nodeIds = sceneDef.nodes || [];

			var pending = [];

			for ( var i = 0, il = nodeIds.length; i < il; i ++ ) {

				pending.push( buildNodeHierachy( nodeIds[ i ], scene, json, parser ) );

			}

			return Promise.all( pending ).then( function () {

				return scene;

			} );

		};

	}();

	return GLTFLoader;

} )();

const batchs$1 = [];
const modelsLoaded = {};
let objectLoader = null;
let gltflLoader = null;
let curBatch$1 = null;

function get$1(_name) {
	return modelsLoaded[_name];
}

function init$3() {
	gltflLoader = new GLTFLoader();
	objectLoader = new ObjectLoader();
}

function addToList$1(_list, _id, _url) {
	_list.push({id:_id, url:_url});
}

function loadBatch$1(_list, _callback) {
	const batch = {
		callback : _callback, 
		list : _list, 
	};
	batchs$1.push(batch);
	if (curBatch$1 === null) {
		loadNextBatch$1();
	}
}

function loadNextBatch$1() {
	if (batchs$1.length == 0) {
		curBatch$1 = null;
		return false;
	}
	curBatch$1 = batchs$1.shift();
	loadNextModel();
}

function loadNextModel() {
	const nextModel = curBatch$1.list.shift();
	if (nextModel.url.includes('.glb')) {
		loadGlb(nextModel);
	} else {
		loadJson(nextModel);
	}
}

function loadGlb(_nextModel) {
	gltflLoader.load(
		'assets/models/' + _nextModel.url, 
		gltf => {
			console.log('gltf', gltf);
			// gltf.asset.rotation.x = Math.PI;
			modelsLoaded[_nextModel.id] = gltf.scene.children[0];
			if (curBatch$1.list.length == 0) {
				curBatch$1.callback();
				loadNextBatch$1();
			}else{
				loadNextModel();
			}
		}, 
		xhr => {},
		xhr => console.warn( 'NetModels error for loading', _nextModel.url )
	);
}

function loadJson(_nextModel) {
	objectLoader.load(
		'assets/models/' + _nextModel.url, 
		object => {
			object.rotation.x = Math.PI;
			modelsLoaded[_nextModel.id] = object;
			if (curBatch$1.list.length == 0) {
				curBatch$1.callback();
				loadNextBatch$1();
			}else{
				loadNextModel();
			}
		}, 
		xhr => {},
		xhr => console.warn( 'NetModels error for loading', _nextModel.url )
	);
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension);

const modelsToLoad = [
    ['plane', 'airbus.json'], 
];

const api$c = {
    evt : new Evt(), 
    isReady : false, 

    get : function(_model) {
        const geometry = get$1(_model).geometry.clone();
        applyTransformation(geometry);
        return geometry;
    }, 

};

function applyTransformation(_geometrie) {
    const planeScale = 1;
    const scale = new Vector3(planeScale, planeScale, planeScale);
    _geometrie.scale(scale.x, scale.y, scale.z);
}

function onActivateExtension() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension);
    loadModels();
}

function loadModels() {
    const modelsList = [];
    modelsToLoad.forEach(d => addToList$1(modelsList, d[0], d[1]));
    loadBatch$1(modelsList, onModelsLoaded);
}

function onModelsLoaded() {
    console.log('Plane MODELS LOADED');
    api$c.isReady = true;
    api$c.evt.fireEvent('READY');
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateNodes);

const api$d = {
    evt : new Evt(), 
    isReady : false, 

    material : function() {
        return material;
    }, 
};

let material = null;

function onActivateNodes() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateNodes);
    createMaterials();
    loadTextures();
}

function createMaterials() {
    material = new MeshPhysicalMaterial({color: 0xffffff, metalness:0, roughness:0.3});
}

function loadTextures() {
    const texturesList = [
        {
            id : 'plane', 
            url : 'airbus-diffuse.png', 
        }, 
    ];
    loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    material.map = texture('plane');
    console.log('Plane TEXTURES_LOADED');
    api$d.isReady = true;
    api$d.evt.fireEvent('READY');
}

const storedPlanes = new Map();

evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension$1);

function onActivateExtension$1() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension$1);
    setTimeout(() => clearOldPlanes(), 20000);
}

function clearOldPlanes() {
    const d = new Date();
    const curTime = d.getTime() / 1000;
    storedPlanes.forEach((plane, id) => {
        const planeTime = plane.lastPositionTime();
        if (curTime - planeTime < 30) return;
        deletePlane(id);
    });
    console.log('Plane NB', storedPlanes.size);
    setTimeout(() => clearOldPlanes(), 20000);
}

const api$e = {
    evt : new Evt(), 

    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        if (!parsedJson.states) return null;
        const planes = extractPlanes(parsedJson.states);
        registerDatas(planes);
    }, 

    getPlane(_planeId) {
        return storedPlanes.get(_planeId);
    }, 

    tileRemoved : function(_tile) {
        const bbox = {
            minLon : _tile.startCoord.x, 
            maxLon : _tile.endCoord.x, 
            minLat : _tile.endCoord.y, 
            maxLat : _tile.startCoord.y, 
        };
        storedPlanes.forEach((plane, id) => {
            if (!plane.isInBBox(bbox)) return;
            deletePlane(id);
        });
    }
};

function deletePlane(_planeId) {
    const plane = storedPlanes.get(_planeId);
    plane.dispose();
    storedPlanes.delete(_planeId);
    api$e.evt.fireEvent('PLANE_DELETE', _planeId);
}

function registerDatas(_planes) {
    for (let i = 0; i < _planes.length; i ++) {
        const planeDatas = _planes[i];
        if (storedPlanes.has(planeDatas.id)) {
            // console.log('DEJA', planeDatas, storedPlanes.get(planeDatas.id));
            storedPlanes.get(planeDatas.id).updateProps(planeDatas);
            continue;
        }
        const plane = new Plane(planeDatas);
        plane.buildMesh();
        storedPlanes.set(planeDatas.id, plane);
        api$e.evt.fireEvent('PLANE_ADD', planeDatas.id);
    }
}

function extractPlanes(_states) {
    const planes = new Array(_states.length);
    for (let i = 0; i < _states.length; i ++) {
        const planeDatas = _states[i];
        planes[i] = {
            id : planeDatas[0], 
            timePosition : planeDatas[3], 
            lon : planeDatas[5], 
            lat : planeDatas[6], 
            alt : planeDatas[7] || 1000, 
            onGround : planeDatas[8], 
            horizontalSpeed : planeDatas[9], 
            angle : planeDatas[10], 
            verticalSpeed : planeDatas[11], 
        };
    }
    return planes;
}

class Plane {
    constructor(_props) {
        this.props = _props;
        this.mesh = undefined;
        this.tweens = {
			lon : new TweenValue(this.props.lon), 
			lat : new TweenValue(this.props.lat), 
			alt : new TweenValue(this.props.alt), 
		};
    }

    getCurCoord() {
        const d = new Date();
        const curTime = d.getTime();
        if (this.tweens.lon.getValueAtTime(curTime) != 0) {
            // console.log('RUN', this.props.id);
            return {
                lon : this.tweens.lon.getValueAtTime(curTime), 
                lat : this.tweens.lat.getValueAtTime(curTime), 
                alt : this.tweens.alt.getValueAtTime(curTime), 
            };
        }
        // console.log('STOP', this.props.id);
        return {
            lon : this.props.lon, 
            lat : this.props.lat, 
            alt : this.props.alt, 
        };
    }

    lastPositionTime() {
        return this.props.timePosition;
    }

    isInBBox(_bbox) {
        if (this.props.lon < _bbox.minLon) return false;
        if (this.props.lon > _bbox.maxLon) return false;
        if (this.props.lat < _bbox.minLat) return false;
        if (this.props.lat > _bbox.maxLat) return false;
        return true;
    }

    updateProps(_props) {
        if (_props.timePosition < this.props.timePosition) return false;
        const timeDiff = _props.timePosition - this.props.timePosition;

        this.tweens.lon.value = this.props.lon;
        this.tweens.lat.value = this.props.lat;
        this.tweens.alt.value = this.props.alt;

        this.tweens.lon.setTargetValue(_props.lon, timeDiff * 1000);
        this.tweens.lat.setTargetValue(_props.lat, timeDiff * 1000);
        this.tweens.alt.setTargetValue(_props.alt, timeDiff * 1000);

        this.props = _props;
    }

    buildMesh() {
        this.mesh = new Mesh(
            api$c.get('plane'), 
            api$d.material()
        );
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.placeMesh();
        api$a.addMeshe(this.mesh);
        api$a.addObjToUpdate(this);
    }

    update() {
        this.placeMesh();
    }

    placeMesh() {
        const curCoord = this.getCurCoord();
        const pos = api$a.coordToXYZ(
            curCoord.lon, 
            curCoord.lat, 
            curCoord.alt, 
        );
        this.mesh.position.x = pos.x;
        this.mesh.position.y = pos.y;
        this.mesh.position.z = pos.z;
        this.mesh.rotation.y = api$7.radians(this.props.angle + 180);
        api.MUST_RENDER = true;
    }

    dispose() {
        api$a.removeMeshe(this.mesh);
        api$a.removeObjToUpdate(this);
        this.mesh.geometry.dispose();
    }
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onPlaneActivation);
evt.addEventListener('TILE_EXTENSION_DESACTIVATE_PLANE', null, onPlaneDesactivation);
api$e.evt.addEventListener('PLANE_ADD', null, onPlaneAdded);
api$e.evt.addEventListener('PLANE_DELETE', null, onPlaneDeleted);

let uiElmt;

const api$f = {

	init : function() {
		uiElmt = document.getElementById('overlayExtensionsUi');
	}, 
		
};

function onBtnPlaneClick(_evt) {
    const planeId = _evt.target.dataset.plane_id;
    const plane = api$e.getPlane(planeId);
    console.log('plane', plane);
    const planeCoord = plane.getCurCoord();
    console.log('planeCoord', planeCoord);
    api$a.cameraControler.setDestination(planeCoord.lon, planeCoord.lat, 13);
}

function addPlaneButton(_planeId) {
    const btnElmt = document.createElement('div');
    btnElmt.id = 'btn-plane-' + _planeId;
    btnElmt.dataset.plane_id = _planeId;
    btnElmt.classList.add('btn-plane');
    // btnElmt.innerHTML = _planeId;
    btnElmt.title = 'Plane ' + _planeId;
    btnElmt.addEventListener('click', onBtnPlaneClick);
    uiElmt.appendChild(btnElmt);
}

function removePlaneButton(_planeId) {
    const btnElmt = document.getElementById('btn-plane-' + _planeId);
    btnElmt.removeEventListener('click', onBtnPlaneClick);
    btnElmt.remove();
}

function onPlaneActivation() {
    
}

function onPlaneDesactivation() {
    
}

function onPlaneAdded(_planeId) {
    addPlaneButton(_planeId);
}

function onPlaneDeleted(_planeId) {
    removePlaneButton(_planeId);
}

let elmtCamHeading;
let elmtCoord;
let elmtCurTile;
let lastTimeLoadingUpdated = 0;
let params;

const apiUi = {
	dragSun : false, 

	init : function(_params) {
		params = _params;
		api$f.init();
		elmtCurTile = document.getElementById("overlayCurtile");
		api$1.evt.addEventListener('MOUSE_LEFT_DOWN', null, onMouseDownLeft);
		api$1.evt.addEventListener('MOUSE_LEFT_UP', null, onMouseUpLeft);
		APP.evt.addEventListener('APP_INIT', null, onAppInit);
		APP.evt.addEventListener('APP_START', null, onAppStart);
		if (!params.waypoints) {
			document.getElementById('overlayWaypoints').remove();
		}
		if (params.navigation) {
			api$a.evt.addEventListener('READY', null, onGlobeReady);
			const navigationContainer = document.getElementById('overlayNavigation');
			createButton(navigationContainer, '<div class="heading" id="camHeading"></div>');
			createButton(navigationContainer, '<img src="img/icon_zoom_out.png"/>', 'btn-zoom-out');
			createButton(navigationContainer, '<img src="img/icon_zoom_in.png"/>', 'btn-zoom-in');
			elmtCamHeading = document.getElementById("camHeading");
		} else {
			document.getElementById('overlayNavigation').remove();
		}
		if (params.extensions) {
			UiTilesExtension.init();
			elmtCoord = document.getElementById('overlayUICoords');
			evt$1.addEventListener('DATA_LOADED', UiTilesExtension, UiTilesExtension.updateLoadingDatas);
			evt.addEventListener('TILE_EXTENSION_ACTIVATE', UiTilesExtension, UiTilesExtension.onExtensionActivate);
			evt.addEventListener('TILE_EXTENSION_DESACTIVATE', UiTilesExtension, UiTilesExtension.onExtensionDesctivate);
		} else {
			document.getElementById('overlayExtensions').remove();
			document.getElementById('overlayUICoords').remove();
		}
	}, 
		
	setCamera : function(_camCtrl) {
		if (!params.navigation) return;
		_camCtrl.evt.addEventListener('ON_ROTATE', null, onCamRotate);
	}, 

	showUICoords : function(_lon, _lat, _ele){
		if (!params.extensions) return;
		elmtCoord.innerHTML = 'Lon : ' + (Math.round(_lon * 1000) / 1000) + ', Lat : ' + (Math.round(_lat * 1000) / 1000) + ', Elevation : ' + Math.round(_ele);
	}, 

	listenOnChildsClass : function(_parentId, _event, _childsClass, _callback) {
		var childClass = _childsClass;
		document.getElementById(_parentId).addEventListener(_event, function(_evt) {
			if (_evt.target.classList.contains(childClass)) {
				_callback(_evt);
			}
		}, false);
	}, 

	openModal : function( _content ){
		document.getElementById('modalContent').innerHTML = _content;
		document.getElementById('modalContainer').classList.add('activ');
	}, 

	closeModal : function(){
		document.getElementById('modalContainer').classList.remove('activ');
		document.getElementById('modalContent').innerHTML = '';
	}, 
};

function createButton(_parent, _content, _id = '', _classes = []) {
	var button = document.createElement('span');
	button.id = _id;
	button.classList.add('floating-btn');
	button.classList.add(..._classes);
	button.innerHTML = _content;
	_parent.appendChild(button);
}

function onGlobeReady() {
	api$a.evt.removeEventListener('READY', null, onGlobeReady);
	document.getElementById('btn-zoom-in').addEventListener('click', () => api$a.cameraControler.zoomIn());
	document.getElementById('btn-zoom-out').addEventListener('click', () => api$a.cameraControler.zoomOut());
}

function onCamRotate(_radian) {
	elmtCamHeading.style.transform = 'rotate(' + (180 + api$7.degree(_radian)) + 'deg)';
}

function onAppInit() {
	APP.evt.removeEventListener('APP_INIT', null, onAppInit);
	api$a.evt.addEventListener('CURTILE_CHANGED', null, onCurTileChanged);
}

function onAppStart() {
	if (!params.waypoints) return;
	onWaypointsChanged(api$b.waypoints());
	api$b.evt.addEventListener('WAYPOINT_ADDED', null, onWaypointsChanged);
}

function onWaypointsChanged(_waypoints) {
	const elmt = document.getElementById('waypointsInfos');
	let html = '';
	_waypoints
	.filter(w => w.showList)
	.forEach((w, i) => {
		html += '<img src="img/ico_waypoint.png" />  <span class="hand waypoint" onclick="APP.gotoWaypoint(' + i + ');" title=" '+ ( Math.round( w.lon * 1000 ) / 1000 ) + " / " + ( Math.round( w.lat * 1000 ) / 1000 ) +'">' + w.name + '</span><br>';
	});
	elmt.innerHTML = html;
	
}

function onCurTileChanged(_evt) {
	elmtCurTile.innerText = 'Z : ' + _evt.z + ', X : ' + _evt.x + ', Y : ' + _evt.y;
}

function onMouseDownLeft() {
	var coordOnGround = api$a.screenToSurfacePosition(api$1.curMouseX, api$1.curMouseY);
	if (coordOnGround === undefined){
		apiUi.dragSun = true;
	}
}
function onMouseUpLeft() {
	apiUi.dragSun = false;
}


const UiTilesExtension = (function(){
	var api = {
		
		init : function() {
			APP.evt.addEventListener('APP_START', api, api.onAppStart);
		}, 
		
		onAppStart : function() {
			apiUi.listenOnChildsClass('overlayExtensions', 'click', 'extension-switch', api._onClickExtensionSwitch);
			addExtensionsSwitchs();
		}, 
		
		onExtensionDesctivate : function(_evt) {
			document.getElementById('extension-icon-' + _evt).src = 'img/extension-' + _evt.toLocaleLowerCase() + '.png';
		}, 
		onExtensionActivate : function(_evt) {
			document.getElementById('extension-icon-' + _evt).src = 'img/extension-' + _evt.toLocaleLowerCase() + '-active.png';
		}, 

		_onClickExtensionSwitch : function(_evt) {
			var extension = _evt.target.dataset.extension;
			if (extension === undefined) return false;
			if (_evt.target.classList.contains('active')) {
				desactivate(extension);
			} else {
				activate(extension);
				api.updateLoadingDatas({type:extension, nb:'...'});
			}
			_evt.target.classList.toggle('active');
		}, 

		updateLoadingDatas : function(_evt){
			var curTime = APP.clock.getElapsedTime();
			if (_evt.nb > 0 && curTime - lastTimeLoadingUpdated <= 1) return false;
			lastTimeLoadingUpdated = curTime;
			const elmt = document.getElementById('btn-extension-switch-' + _evt.type);
			elmt.dataset.loading_nb = _evt.nb || '';
		}, 
		
	};

	function addExtensionsSwitchs() {
		var iconsExtensions = '';
		const extensionsActives = listActives();
		for (var key in extensions) {
			const active = extensionsActives.includes(key) ? 'active' : '';
			const activeImg = extensionsActives.includes(key) ? '-active' : '';
			iconsExtensions += '<span title="' + key + '" class="floating-btn extension-switch ' + active + '" data-extension="' + key + '" id="btn-extension-switch-' + key + '" data-loading_nb=""><img id="extension-icon-' + key + '" src="img/extension-' + key.toLocaleLowerCase() + activeImg + '.png"/></span>';
		}
		document.getElementById('overlayExtensions').innerHTML += iconsExtensions;
	}
	
	return api;
})();

let urlParams = {
    location : null, 
    extensions : [], 
};

const api$g = {

    init : function(_params, _startCamera) {
        urlParams.location = _startCamera;
        if (!_params.enabled) return;
        parseHash(location.hash);
        APP.evt.addEventListener('APP_INIT', null, onAppStart$1);
    }, 

    cameraLocation : function() {
        return urlParams.location;
    }, 

    activesExtensions : function() {
        return urlParams.extensions;
    }, 
};

function updateHash(_urlParams) {
    let hash = '';
    hash += 'location=' + _urlParams.location.z + '/' + _urlParams.location.x + '/' + _urlParams.location.y;
    if (_urlParams.extensions.length) {
        hash += '&extensions=' + _urlParams.extensions.map(extension => extension.toLowerCase()).join(',');
    }
    location.hash = hash;
}

function onAppStart$1() {
    APP.evt.removeEventListener('APP_INIT', null, onAppStart$1);
    evt.addEventListener('TILE_EXTENSION_ACTIVATE', null, onExtensionActivate);
    evt.addEventListener('TILE_EXTENSION_DESACTIVATE', null, onExtensionDesctivate);
    api$a.evt.addEventListener('READY', null, onGlobeReady$1);
}

function onGlobeReady$1() {
    api$a.evt.removeEventListener('READY', null, onGlobeReady$1);
    api$a.cameraControler.evt.addEventListener('CAM_UPDATED', null, onCameraUpdate);
}

function onExtensionActivate(_extension) {
    urlParams.extensions.push(_extension);
    updateHash(urlParams);
}

function onExtensionDesctivate(_extension) {
    urlParams.extensions = urlParams.extensions.filter(extension => _extension != extension);
    updateHash(urlParams);
}

function onCameraUpdate(_datas) {
    urlParams.location.x = _datas.coord.lon;
    urlParams.location.y = _datas.coord.lat;
    urlParams.location.z = _datas.coord.zoom;
    updateHash(urlParams);
}

function parseHash(_hash) {
    if (_hash == '') return null;
    const props = {};
    _hash
    .substring(1)
    .split('&')
    .map(token => token.split('='))
    .forEach(values => {
        props[values[0]] = values[1];
    });
    if (props.location) {
        const coords = props.location.split('/');
        props.location = {
            z : parseFloat(coords[0]), 
            x : parseFloat(coords[1]), 
            y : parseFloat(coords[2]), 
        };
    }
    if (props.extensions) {
        const extensions = props.extensions.split(',');
        props.extensions = extensions.map(extension => extension.toUpperCase());
    } else {
        props.extensions = [];
    }
    urlParams = props;
}

class CameraGod {
	constructor(_camera, _startPosition = null) {
		this.startPosition = _startPosition;
		this.camera = _camera;
		this.globe = undefined;
		this.pointer = undefined;
		this.mouseLastPos = [0, 0];
		this.zoomCur = 14;
		this.coordLookat = new Vector3(4.1862, 43.7682, 0);
		this.zoomDest = this.zoomCur;
		this.coordCam = new Vector3(this.coordLookat.x, this.coordLookat.y, 0);
		this.camRotation = [Math.PI, 0.2];
		this.dragging = false;
		this.rotating = false;
		this.coordOnGround = new Vector2(0, 0);
		this.tweens = {
			zoom : new TweenValue(this.zoomCur), 
			lon : new TweenValue(this.coordLookat.x), 
			lat : new TweenValue(this.coordLookat.y), 
		};
		this.clicPointer = undefined;
		this.debugPointer = undefined;
		this.evt = new Evt();
		api$1.evt.addEventListener('MOUSE_WHEEL', this, this.onMouseWheel);
		api$1.evt.addEventListener('MOUSE_LEFT_DOWN', this, this.onMouseDownLeft);
		api$1.evt.addEventListener('MOUSE_RIGHT_DOWN', this, this.onMouseDownRight);
		api$1.evt.addEventListener('MOUSE_LEFT_UP', this, this.onMouseUpLeft);
		api$1.evt.addEventListener('MOUSE_RIGHT_UP', this, this.onMouseUpRight);
		this.MUST_UPDATE = false;
	}

	init(_globe) {
		this.globe = _globe;
	}

	start() {
		this.camera.up.set(0, -1, 0);
		this.pointer = new Mesh(new SphereGeometry(this.globe.meter * 200, 16, 7), new MeshBasicMaterial({color: 0x00ff00}));
		api.scene.add(this.pointer);
		this.clicPointer = new Mesh(new SphereGeometry(this.globe.meter * 150, 16, 7), new MeshBasicMaterial({color: 0x0000ff}));
		api.scene.add(this.clicPointer);
		this.debugPointer = new Mesh(new SphereGeometry(this.globe.meter * 150, 16, 7), new MeshBasicMaterial({color: 0xfffc00}));
		api.scene.add(this.debugPointer);
		if (this.startPosition) {
			this.zoomCur = this.startPosition.z;
			this.zoomDest = this.zoomCur;
			this.tweens.zoom.value = this.zoomCur;
			this.setLookAt(this.startPosition.x, this.startPosition.y);
			this.tweens.lon.value = this.coordLookat.x;
			this.tweens.lat.value = this.coordLookat.y;
			this.globe.updateCurTile(this.coordLookat.x, this.coordLookat.y);
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
		this.mouseLastPos[0] = api$1.curMouseX;
		this.mouseLastPos[1] = api$1.curMouseY;
	}

	setDestination( _lon, _lat, _zoom, _duration) {
		if (_duration == undefined) {
			const distance = api$8.coordDistance(this.coordLookat.x, this.coordLookat.y, _lon, _lat);
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
		const depX = (api$1.curMouseX - this.mouseLastPos[0]) / Math.pow(2.0, this.zoomCur);
		const depY = (api$1.curMouseY - this.mouseLastPos[1]) / Math.pow(2.0, this.zoomCur);
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
		var depX = (api$1.curMouseX - this.mouseLastPos[0]) / 100.0;
		var depY = (api$1.curMouseY - this.mouseLastPos[1]) / 100.0;
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

	updateCamera() {
		this.coordLookat.z = this.globe.getElevationAtCoords(this.coordLookat.x, this.coordLookat.y, true);
		const posLookat = this.globe.coordToXYZ(this.coordLookat.x, this.coordLookat.y, this.coordLookat.z);
		this.coordCam.z = this.globe.altitude(this.zoomCur);
		let posCam;
		if (this.globe.projection == "SPHERE") {
			posCam = this.updateOnSphere();
		}else{
			posCam = this.updateOnPlane(posLookat);
		}
		this.camera.position.x = posCam[0];
		this.camera.position.y = posCam[1];
		this.camera.position.z = posCam[2];
		const tmpCoords = this.globe.coordFromPos(posCam[0], posCam[2]);
		this.coordCam.x = tmpCoords.x;
		this.coordCam.y = tmpCoords.y;
		this.camera.lookAt(posLookat);
		this.globe.updateCurTile(this.coordLookat.x, this.coordLookat.y);
		this.globe.zoomDetails = this.zoomCur;
		this.globe.checkLOD();
		const wpScale = (this.coordCam.z / this.globe.radius) * 500;
		this.pointer.scale.x = wpScale;
		this.pointer.scale.y = wpScale;
		this.pointer.scale.z = wpScale;
		this.pointer.position.x = posLookat.x;
		this.pointer.position.y = posLookat.y;
		this.pointer.position.z = posLookat.z;
		this.debugPointer.scale.x = wpScale;
		this.debugPointer.scale.y = wpScale;
		this.debugPointer.scale.z = wpScale;
		api.MUST_RENDER = true;

		const evtDatas = {
			posLookat : posLookat, 
			coord : {
				lon : Math.round(this.coordLookat.x * 10000) / 10000, 
				lat : Math.round(this.coordLookat.y * 10000) / 10000, 
				zoom : Math.round(this.zoomDest * 10000) / 10000
			}
		};
		this.evt.fireEvent('CAM_UPDATED', evtDatas);
	}

	updateOnSphere() {
		const radLon = api$7.radians(this.coordLookat.x);
		const radLat = api$7.radians(this.coordLookat.y);
		const matGlob = new Matrix4();
		const matZ = new Matrix4();
		const matY = new Matrix4();
		const matX = new Matrix4();
		matX.makeRotationX(0);
		matY.makeRotationY(radLon);
		matZ.makeRotationZ(radLat);
		matGlob.multiplyMatrices(matY, matZ);
		matGlob.multiply(matX);
		const tmpG = new Vector3(this.globe.radius / this.globe.globalScale, 0, 0);
		tmpG.applyMatrix4(matGlob);
		// rotation locale
		const matLocX = new Matrix4();
		const matLocY = new Matrix4();
		const matLocZ = new Matrix4();
		matLocX.makeRotationX(this.camRotation[0] * -1);
		matLocY.makeRotationY(0);
		matLocZ.makeRotationZ(this.camRotation[1] * 1);
		matGlob.multiply(matLocX);
		matGlob.multiply(matLocZ);
		const tmpL = new Vector3(this.coordCam.z / this.globe.globalScale, 0, 0);
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
		this.coordCam.z *= this.globe.globalScale;
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
		this.coordOnGround = this.globe.screenToSurfacePosition(api$1.curMouseX, api$1.curMouseY);
		if (!this.coordOnGround) return;
		const scale = (this.coordCam.z / this.globe.radius) * 500;
		this.clicPointer.scale.x = scale;
		this.clicPointer.scale.y = scale;
		this.clicPointer.scale.z = scale;
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

function extensionClass() {
	return MapExtension;
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_SATELLITE', null, onActivateSatellite);

function onActivateSatellite() {
    desactivate('TILE2D');
}

class MapExtension {
	constructor(_tile) {
		this.id = 'TILE2D';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		if (this.dataLoaded) {
            this.tile.setTexture(this.texture);
            return true;
        }
		if (this.dataLoading) return false;
		this.dataLoading = true;
		loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onMapLoaded(_datas)
		);
    }
    
    onMapLoaded(_datas) {
        this.texture = _datas;
		this.dataLoading = false;
		this.dataLoaded = true;
		if (!this.tile) return false;
		if (!this.tile.isReady) return false;
		this.tile.setTexture(this.texture);
	}
	
	onTileDispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
		this.hide();
		this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.removeEventListener('HIDE', this, this.hide);
		if (this.texture) this.texture.dispose();
        this.texture = null;
		this.dataLoaded = false;
		this.dataLoading = false;
		this.tile.unsetTexture();
		this.tile = null;
		api.MUST_RENDER = true;
	}
	
}

const PARAMS$1 = {
	nbLoaders : 4, 
	useCache : false, 
};

let API_URL$1 = '';

function setApiUrl$1(_url) {
	API_URL$1 = _url;
}

class LoaderElevation {

	constructor(_callback) {
		this.definition = api$a.tilesDefinition;
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		var loader = this;
		this.imageObj = new Image();
		this.imageObj.crossOrigin = 'Anonymous';
		this.imageObj.onload = function() {
			loader.onImgReady(this);
		};
	}

	load(_params) {
		this.isLoading = true;
		this.params = _params;
		this.imageObj.src = API_URL$1 + '&def=' + this.definition + '&z='+_params.z+'&x='+_params.x+'&y='+_params.y;
	}
	
	onImgReady(_img) {
		var res = extractElevation(_img, _img.width, _img.height);
		this.isLoading = false;
		if (this.callback) {
			this.callback(res, this.params);
		}
	}
}


const canvas = document.createElement('canvas');
const canvasSize = api$a.tilesDefinition + 1;
canvas.width = canvasSize;
canvas.height = canvasSize;
const context = canvas.getContext('2d');

function extractElevation(_img, _imgWidth, _imgHeight) {
    context.drawImage(_img, 0, 0, _imgWidth, _imgHeight);
    const imageData = context.getImageData(0, 0, _imgWidth, _imgHeight).data;
    const eleBuffer = new Uint16Array(imageData.length / 4);
    let bufferIndex = 0;
    for (let x = 0; x < _imgWidth; ++x) {
        for (let y = 0; y < _imgHeight; ++y) {
            let index = (y * _imgWidth + x) * 4;
            const red = imageData[index];
            index ++;
            const blue = imageData[++index];
            const alt = red * 256 + blue;
            eleBuffer[bufferIndex] = alt;
            bufferIndex ++;
        }
    }
    return eleBuffer;
}

registerLoader('ELEVATION', LoaderElevation, PARAMS$1);
const loader$1 = new Loader('ELEVATION');

function extensionClass$1() {
	return ElevationExtension;
}

class ElevationExtension {
	constructor(_tile) {
		this.id = 'ELEVATION';
		this.dataLoading = false;
		this.dataLoaded = false;
		this.elevationBuffer = new Uint16Array((32 * 32) / 4);
		this.tile = _tile;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.dispose);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		if (this.dataLoaded) return false;
		this.applyElevationToGeometry(this.nearestElevationDatas());
		if (this.tile.zoom > 15) return false;
		if (this.dataLoading) return false;
		this.dataLoading = true;
		loader$1.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onElevationLoaded(_datas.slice(0))
		);
	}
	
	hide() {
		loader$1.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}

	nearestElevationDatas() {
		const def = api$a.tilesDefinition + 1;
		const buffer = new Uint16Array(def * def);
		const vertCoords = this.tile.getVerticesPlaneCoords();
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			buffer[i] = api$9.get(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				this.tile.zoom
			);
		}
		return buffer;
	}
	
	onElevationLoaded(_datas) {
		this.dataLoading = false;
		if (!this.tile.isReady) return false;
		this.dataLoaded = true;
		this.elevationBuffer = _datas;
		api$9.set(this.tile, this.elevationBuffer);
		this.applyElevationToGeometry(this.elevationBuffer);
	}
	
	applyElevationToGeometry(_elevationBuffer) {
		if (!this.tile.isReady) return false;
		let curVertId = 0;
		const verticePositions = this.tile.meshe.geometry.getAttribute('position');
		const vertCoords = this.tile.getVerticesPlaneCoords();
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			const vertPos = api$a.coordToXYZ(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				_elevationBuffer[i]
			);
			verticePositions.array[curVertId + 0] = vertPos.x;
			verticePositions.array[curVertId + 1] = vertPos.y;
			verticePositions.array[curVertId + 2] = vertPos.z;
			curVertId += 3;
		}

		verticePositions.needsUpdate = true;
		this.tile.meshe.geometry.verticesNeedUpdate = true;
		this.tile.meshe.geometry.uvsNeedUpdate = true;
		this.tile.meshe.geometry.computeFaceNormals();
		this.tile.meshe.geometry.computeVertexNormals();
		api.MUST_RENDER = true;
	} 
	
	dispose() {
		this.tile.evt.removeEventListener('DISPOSE', this, this.dispose);
		this.hide();
		if (this.dataLoaded) {
			api$9.delete(this.tile);
			const def = api$a.tilesDefinition + 1;
			const buffer = new Uint16Array(def * def);
			buffer.fill(0);
			this.applyElevationToGeometry(buffer);
		}
		this.dataLoaded = false;
		this.dataLoading = false;
		this.elevationBuffer = null;
		api.MUST_RENDER = true;
	}
	
}

const PARAMS$2 = {
	nbLoaders : 2, 
	useCache : false, 
};

let API_URL$2 = '';

function setApiUrl$2(_url) {
	API_URL$2 = _url;
}

const loadersWaiting = [];

function compute(_loader, _datas) {
    loadersWaiting.push(_loader);
    workerParser.postMessage(_datas);
}

function onWorkerMessage(_res) {
    const loader = loadersWaiting.shift();
    loader.datasReady(_res.data);
}

const workerParser = new Worker('js/oev/tileExtensions/building/workerBuildingJsonParser.js');
workerParser.onmessage = onWorkerMessage;


class LoaderBuilding {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = API_URL$2 + "&z=" + _params.z + "&x=" + _params.x + "&y=" + _params.y;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text));
	}
	
	onDataLoadSuccess(_data) {
		compute(this, {
			json : _data, 
			bbox : this.params.bbox
		});
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

registerLoader('BUILDING', LoaderBuilding, PARAMS$2);
const loader$2 = new Loader('BUILDING');

const mainZoom = 14;
let waitings = {};

const store$1 = {
	get : function(_zoom, _tileX, _tileY, _bbox, _priority, _callback) {
		const mainValues = valueAtMainZoom(_zoom, _tileX, _tileY);
		const key = mainValues.z + '_' + mainValues.x + '_' + mainValues.y;
		waitings[key] = waitings[key] || 0;
		waitings[key] ++;
		loader$2.getData(
			{
				z : mainValues.z, 
				x : mainValues.x, 
				y : mainValues.y, 
				priority : _priority, 
				bbox : _bbox, 
			}, _callback
		);
	}, 

	abort : function(_zoom, _tileX, _tileY) {
		const mainValues = valueAtMainZoom(_zoom, _tileX, _tileY);
		const key = mainValues.z + '_' + mainValues.x + '_' + mainValues.y;
		waitings[key] = waitings[key] || 0;
		// console.warn('Abort', waitings[key]);
		waitings[key] --;
		waitings[key] = Math.max(0, waitings[key]);
		if (waitings[key] == 0) loader$2.abort({key : key});
	}
};

function valueAtMainZoom(_zoom, _tileX, _tileY) {
	let res = {
		z : _zoom, 
		x : _tileX, 
		y : _tileY, 
	};
	while (res.z > mainZoom) {
		res.z --;
		res.x = Math.floor(res.x / 2);
		res.y = Math.floor(res.y / 2);
	}
	return res;
}

const cacheGeometries = [];
let freeGeometryIndex = -1;

function getGeometry() {
    // console.log('maxNb', maxNb);
    if (freeGeometryIndex < 0) return new BufferGeometry();
    const geometry = cacheGeometries[freeGeometryIndex];
    freeGeometryIndex --;
    return geometry;
}

function storeGeometry(_geometry) {
    for (let name in _geometry.attributes) {
        _geometry.deleteAttribute(name);
    }
    freeGeometryIndex ++;
    if (freeGeometryIndex > cacheGeometries.length - 1) {
        cacheGeometries.push(_geometry);
    } else {
        cacheGeometries[freeGeometryIndex] = _geometry;
    }
}

function storeGeometries(_geometries) {
    for (let i = 0; i < _geometries.length; i ++) {
        storeGeometry(_geometries[i]);
    }
}
const cachedMeshes = [];
let freeMeshesIndex = -1;

function getMesh() {
    // console.log('maxNbMeshes', maxNbMeshes);
    if (freeMeshesIndex < 0) return new Mesh();
    const mesh = cachedMeshes[freeMeshesIndex];
    freeMeshesIndex --;
    return mesh;
}

function storeMesh(_mesh) {
    freeMeshesIndex ++;
    if (freeMeshesIndex > cachedMeshes.length - 1) {
        cachedMeshes.push(_mesh);
    } else {
        cachedMeshes[freeMeshesIndex] = _mesh;
    }
}

function extensionClass$2() {
	return BuildingExtension;
}

const materialWalls = new MeshPhongMaterial({shininess:0,color:0xaaaaaa,vertexColors:VertexColors});
const materialRoof = new MeshPhongMaterial({shininess:0,color:0xaaaaaa,vertexColors:VertexColors});

const workerEvent = new Evt();
const worker = new Worker('js/oev/tileExtensions/building/workerBuildingMaker.js', {type:'module'});
worker.onmessage = onWorkerMessage$1;

function onWorkerMessage$1(_res) {
	workerEvent.fireEvent('BUILDING_READY_' + _res.data.tileKey, _res.data.result);
}

class BuildingExtension {
	constructor(_tile) {
		this.id = 'BUILDING';
		this.datas = undefined;
		this.dataLoaded = false;
		this.meshWalls = undefined;
		this.meshRoof = undefined;
		this.meshEntrances = undefined;
		this.waiting = false;
		this.tile = _tile;
		this.isActive = this.tile.zoom == 15;
		// this.isActive = this.tile.key == '16597_11268_15';
		this.tileKey = this.tile.zoom + '_' + this.tile.tileX + '_' + this.tile.tileY;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.dispose);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady(_evt) {
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		if (!this.isActive) return false;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		this.waiting = true;
		store$1.get(this.tile.zoom, this.tile.tileX, this.tile.tileY, bbox, this.tile.distToCam, _datas => {
			this.waiting = false;
			this.onBuildingsLoaded(_datas);
		});
	}

	onBuildingsLoaded(_datas) {
		if (!this.tile) return false;
		this.dataLoaded = true;
		this.datas = _datas;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		workerEvent.addEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		worker.postMessage({
			tileKey : this.tileKey,
			buildingsDatas : this.datas,  
			bbox : bbox, 
			zoom : this.tile.zoom, 
		});
	}

	onWorkerFinishedBuild(_res) {
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		this.construct(_res);
	}

	construct(_datas) {
		if (this.meshWalls != undefined) { // TODO: et le mesh roof ?
			api.scene.add(this.meshWalls);
			return false;
		}
		this.buildRoof(_datas.roofsBuffers);
		this.buildWalls(_datas.wallsBuffers);
		this.buildEntrances(_datas.entrancesDatas);
		api.MUST_RENDER = true;
	}

	buildEntrances(_entrancesDatas) {
		if (!_entrancesDatas) return;
		if (!_entrancesDatas.length) return;
		const entrancesGeometries = new Array(_entrancesDatas.length);
		for (let i = 0; i < _entrancesDatas.length; i ++) {
			const entrance = _entrancesDatas[i];
			const alt = api$9.get(entrance.coord[0], entrance.coord[1]);
			const distance = (api$a.meter * 0.001) * 3;
			const corners = [];
			const angleStep = Math.PI / 2;
			for (let a = 0; a < 4; a ++) {
				const curAngle = (entrance.angle - Math.PI / 4) + (angleStep * a);
				corners.push([
					entrance.coord[0] + Math.cos(curAngle) * distance, 
					entrance.coord[1] + Math.sin(curAngle) * distance, 
					alt - 5, 
				]);
			}
			const positions = [];
			for (let j = 0; j < 2; j ++) {
				for (let c = 0; c < corners.length; c ++) {
					const vertPos = api$a.coordToXYZ(
						corners[c][0], 
						corners[c][1], 
						corners[c][2] + (j * 7), 
					);
					positions.push(vertPos.x);
					positions.push(vertPos.y);
					positions.push(vertPos.z);
				}
			}
			const bufferCoord = Float32Array.from(positions);
			const facesIndex = [
				0, 1, 4, 
				1, 5, 4, 
				1, 2, 5, 
				2, 6, 5, 
				2, 3, 6, 
				3, 7, 6, 
				3, 0, 7, 
				0, 4, 7, 
				4, 5, 7, 
				5, 6, 7, 
			];
			const bufferFaces = Uint32Array.from(facesIndex);

			// const bufferGeometry = new THREE.BufferGeometry();
			const bufferGeometry = getGeometry();
			bufferGeometry.setAttribute('position', new BufferAttribute(bufferCoord, 3));
			bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			bufferGeometry.computeFaceNormals();
			entrancesGeometries[i] = bufferGeometry;
		}
		const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(entrancesGeometries);
		storeGeometries(entrancesGeometries);
		// this.meshEntrances = new THREE.Mesh(mergedGeometry, materialRoof);
		this.meshEntrances = getMesh();
		this.meshEntrances.geometry = mergedGeometry;
		this.meshEntrances.material = materialRoof;
		this.meshEntrances.receiveShadow = true;
		this.meshEntrances.castShadow = true;
		api.scene.add(this.meshEntrances);
	}

	buildRoof(roofsDatas) {
		if (!roofsDatas) return;
		const roofsGeometries = new Array(roofsDatas.buildingNb);
		for (let r = 0; r < roofsDatas.buildingNb; r ++) {
			const roofBuffers = roofsDatas.buffers[r];
			this.applyElevationToVerticesRoof(roofBuffers, roofsDatas.centroids[r]);
			this.convertCoordToPositionRoof(roofBuffers.bufferCoord);
			const bufferGeometry = getGeometry();
			// const bufferGeometry = new THREE.BufferGeometry();
			bufferGeometry.setAttribute('position', new BufferAttribute(roofBuffers.bufferCoord, 3));
			bufferGeometry.setAttribute('color', new BufferAttribute(roofBuffers.bufferColor, 3, true));
			bufferGeometry.setIndex(new BufferAttribute(roofBuffers.bufferFaces, 1));
			bufferGeometry.computeVertexNormals();
			bufferGeometry.computeFaceNormals();
			roofsGeometries[r] = bufferGeometry;
		}
		const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(roofsGeometries);
		storeGeometries(roofsGeometries);
		// this.meshRoof = new THREE.Mesh(mergedGeometry, materialRoof);
		this.meshRoof = getMesh();
		this.meshRoof.geometry = mergedGeometry;
		this.meshRoof.material = materialRoof;

		this.meshRoof.receiveShadow = true;
		this.meshRoof.castShadow = true;
		api.scene.add(this.meshRoof);
	}

	applyElevationToVerticesRoof(_buffers, _centroid) {
		const alt = api$9.get(_centroid[0], _centroid[1]);
		for (let v = 2; v < _buffers.bufferCoord.length; v += 3) {
		_buffers.bufferCoord[v] += alt;
		}
	}
	convertCoordToPositionRoof(_bufferCoord) {
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
			const vertPos = api$a.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			_bufferCoord[bufferVertIndex + 0] = vertPos.x;
			_bufferCoord[bufferVertIndex + 1] = vertPos.y;
			_bufferCoord[bufferVertIndex + 2] = vertPos.z;
			bufferVertIndex += 3;
		}
	}

	buildWalls(_buffers) {
		if (!_buffers) return;
		this.applyElevationToVertices(_buffers);
		this.convertCoordToPosition(_buffers.bufferCoord);
		const bufferGeometry = getGeometry();
		// const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.setAttribute('position', new BufferAttribute(_buffers.bufferCoord, 3));
		bufferGeometry.setAttribute('color', new BufferAttribute(_buffers.bufferColor, 3, true));
		bufferGeometry.setIndex(new BufferAttribute(_buffers.bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		// this.meshWalls = new THREE.Mesh(bufferGeometry, materialWalls);
		this.meshWalls = getMesh();
		this.meshWalls.geometry = bufferGeometry;
		this.meshWalls.material = materialWalls;

		this.meshWalls.receiveShadow = true;
		this.meshWalls.castShadow = true;
		api.scene.add(this.meshWalls);
	}

	applyElevationToVertices(_buffers) {
		let bufferVertIndex = 0;
		for (let b = 0; b < _buffers.buildingNb; b ++) {
			const center = _buffers.centroids[b];
			const alt = api$9.get(center[0], center[1]);
			for (let v = 0; v < _buffers.verticesNbs[b]; v ++) {
				_buffers.bufferCoord[bufferVertIndex + 2] += alt;
				bufferVertIndex += 3;
			}
		}
	}

	convertCoordToPosition(_bufferCoord) {
		// const bufferPos = new Float32Array(_bufferCoord);
		let bufferVertIndex = 0;
		const length = _bufferCoord.length / 3;
		for (let c = 0; c < length; c ++) {
			const vertPos = api$a.coordToXYZ(
				_bufferCoord[bufferVertIndex + 0], 
				_bufferCoord[bufferVertIndex + 1], 
				_bufferCoord[bufferVertIndex + 2]
			);
			_bufferCoord[bufferVertIndex + 0] = vertPos.x;
			_bufferCoord[bufferVertIndex + 1] = vertPos.y;
			_bufferCoord[bufferVertIndex + 2] = vertPos.z;
			bufferVertIndex += 3;
		}
		// return bufferPos;
	}

	dispose() {
		this.tile.evt.removeEventListener('DISPOSE', this, this.dispose);
		if (!this.isActive) return false;
		if (!this.dataLoaded){
			store$1.abort(this.tile.zoom, this.tile.tileX, this.tile.tileY);
		}
		workerEvent.removeEventListener('BUILDING_READY_' + this.tileKey, this, this.onWorkerFinishedBuild);
		if (this.meshWalls != undefined) {
			api.scene.remove(this.meshWalls);
			api.scene.remove(this.meshRoof);
			api.scene.remove(this.meshEntrances);
			// this.meshWalls.geometry.dispose();
			storeGeometries(this.meshWalls.geometry);
			storeMesh(this.meshWalls);
			this.meshWalls = undefined;
			this.meshRoof.geometry.dispose();
			storeMesh(this.meshRoof);
			this.meshRoof = undefined;
		}
		if (this.meshEntrances) {
			this.meshEntrances.geometry.dispose();
			storeMesh(this.meshEntrances);
			this.meshEntrances = undefined;
		}
		this.tile = null;
		api.MUST_RENDER = true;
	}
}

const PARAMS$3 = {
	nbLoaders : 1, 
	useCache : false, 
};

let API_URL$3 = '';

function setApiUrl$3(_url) {
	API_URL$3 = _url;
}

class LoaderNormal {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.textureLoader = new TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		this.textureLoader.load(API_URL$3 + '&z=' + this.params.z + '&x=' + this.params.x + '&y=' + this.params.y + '&def=' + api$a.tilesDefinition, 
			_texture => this.onDataLoadSuccess(_texture), 
			xhr => {},
			xhr => this.onDataLoadError()
		);
	}
	
	onDataLoadSuccess(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}
	
	onDataLoadError() {
		this.isLoading = false;
		console.warn( 'LoaderNormal error', this.params);
		this.callback(null, this.params);
	}
}

registerLoader('NORMAL', LoaderNormal, PARAMS$3);
const loader$3 = new Loader('NORMAL');

function extensionClass$3() {
	return NormalExtension;
}

class NormalExtension {
	constructor(_tile) {
        this.id = 'NORMAL';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		if (this.dataLoaded) {
            this.tile.material.normalMap = this.texture;
            this.tile.material.needsUpdate = true;
            return true;
        }
        if (this.tile.zoom < 11) return false;
        if (this.tile.zoom > 15) return false;
		if (this.dataLoading) return false;
		this.dataLoading = true;
		loader$3.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onMapLoaded(_datas)
		);
    }
    
    onMapLoaded(_datas) {
        if (!this.tile) return false;
        this.texture = _datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        this.tile.material.normalMap = this.texture;
        this.tile.material.needsUpdate = true;
        api.MUST_RENDER = true;
    }
    
    onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader$3.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.hide();
        if (this.texture) this.texture.dispose();
        this.texture = null;
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile.material.normalMap = null;
        this.tile.material.needsUpdate = true;
        this.tile = null;
		api.MUST_RENDER = true;
	}
	
}

const xy = {
    toStringBase : function(p) {
        return ("(" + p.x + ";" + p.y + ")");
    }, 

    toString : function(p) {
        // Try a custom toString first, and fallback to own implementation if none
        var s = p.toString();
        return (s === '[object Object]' ? toStringBase(p) : s);
    }, 

    compare : function(a, b) {
        if (a.y === b.y) {
            return a.x - b.x;
        } else {
            return a.y - b.y;
        }
    }, 

    equals : function(a, b) {
        return a.x === b.x && a.y === b.y;
    }, 
};


const utils = {
    EPSILON : 1e-12, 
    Orientation : {
        "CW": 1,
        "CCW": -1,
        "COLLINEAR": 0
    }, 

    orient2d : function(pa, pb, pc) {
        var detleft = (pa.x - pc.x) * (pb.y - pc.y);
        var detright = (pa.y - pc.y) * (pb.x - pc.x);
        var val = detleft - detright;
        if (val > -(utils.EPSILON) && val < (utils.EPSILON)) {
            return utils.Orientation.COLLINEAR;
        } else if (val > 0) {
            return utils.Orientation.CCW;
        } else {
            return utils.Orientation.CW;
        }
    }, 

    inScanArea : function(pa, pb, pc, pd) {
        var oadb = (pa.x - pb.x) * (pd.y - pb.y) - (pd.x - pb.x) * (pa.y - pb.y);
        if (oadb >= -utils.EPSILON) {
            return false;
        }
    
        var oadc = (pa.x - pc.x) * (pd.y - pc.y) - (pd.x - pc.x) * (pa.y - pc.y);
        if (oadc <= utils.EPSILON) {
            return false;
        }
        return true;
    }, 

    isAngleObtuse : function(pa, pb, pc) {
        var ax = pb.x - pa.x;
        var ay = pb.y - pa.y;
        var bx = pc.x - pa.x;
        var by = pc.y - pa.y;
        return (ax * bx + ay * by) < 0;
    }
};




var Point = function(x, y, _id) {
    this.id = _id || 0;
    this.x = +x || 0;
    this.y = +y || 0;
    this._p2t_edge_list = null;
};

Point.prototype.toString = function() {
    return xy.toStringBase(this);
};

Point.prototype.toJSON = function() {
    return { x: this.x, y: this.y };
};

Point.prototype.clone = function() {
    return new Point(this.x, this.y);
};

Point.prototype.set_zero = function() {
    this.x = 0.0;
    this.y = 0.0;
    return this; // for chaining
};

Point.prototype.set = function(x, y) {
    this.x = +x || 0;
    this.y = +y || 0;
    return this; // for chaining
};

Point.prototype.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    return this; // for chaining
};

Point.prototype.add = function(n) {
    this.x += n.x;
    this.y += n.y;
    return this; // for chaining
};

Point.prototype.sub = function(n) {
    this.x -= n.x;
    this.y -= n.y;
    return this; // for chaining
};

Point.prototype.mul = function(s) {
    this.x *= s;
    this.y *= s;
    return this; // for chaining
};

Point.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Point.prototype.normalize = function() {
    var len = this.length();
    this.x /= len;
    this.y /= len;
    return len;
};

Point.prototype.equals = function(p) {
    return this.x === p.x && this.y === p.y;
};

Point.negate = function(p) {
    return new Point(-p.x, -p.y);
};

Point.add = function(a, b) {
    return new Point(a.x + b.x, a.y + b.y);
};

Point.sub = function(a, b) {
    return new Point(a.x - b.x, a.y - b.y);
};

Point.mul = function(s, p) {
    return new Point(s * p.x, s * p.y);
};

Point.cross = function(a, b) {
    if (typeof(a) === 'number') {
        if (typeof(b) === 'number') {
            return a * b;
        } else {
            return new Point(-a * b.y, a * b.x);
        }
    } else {
        if (typeof(b) === 'number') {
            return new Point(b * a.y, -b * a.x);
        } else {
            return a.x * b.y - a.y * b.x;
        }
    }
};

Point.toString = xy.toString;
Point.compare = xy.compare;
Point.cmp = xy.compare; // backward compatibility
Point.equals = xy.equals;

Point.dot = function(a, b) {
    return a.x * b.x + a.y * b.y;
};





const PointError = function(message, points) {
    this.name = "PointError";
    this.points = points = points || [];
    this.message = message || "Invalid Points!";
    for (var i = 0; i < points.length; i++) {
        this.message += " " + xy.toString(points[i]);
    }
};
PointError.prototype = new Error();
PointError.prototype.constructor = PointError;
    




const SweepContext = (function() {
    // var Node = AdvancingFront.Node;
    var kAlpha = 0.3;
    
    var Edge = function(p1, p2) {
        this.p = p1;
        this.q = p2;
    
        if (p1.y > p2.y) {
            this.q = p1;
            this.p = p2;
        } else if (p1.y === p2.y) {
            if (p1.x > p2.x) {
                this.q = p1;
                this.p = p2;
            } else if (p1.x === p2.x) {
                throw new PointError('poly2tri Invalid Edge constructor: repeated points!', [p1]);
            }
        }
    
        if (!this.q._p2t_edge_list) {
            this.q._p2t_edge_list = [];
        }
        this.q._p2t_edge_list.push(this);
    };
    
    var Basin = function() {
        this.left_node = null;
        this.bottom_node = null;
        this.right_node = null;
        this.width = 0.0;
        this.left_highest = false;
    };
    
    Basin.prototype.clear = function() {
        this.left_node = null;
        this.bottom_node = null;
        this.right_node = null;
        this.width = 0.0;
        this.left_highest = false;
    };
    
    var EdgeEvent = function() {
        this.constrained_edge = null;
        this.right = false;
    };
    
    // ----------------------------------------------------SweepContext (public API)
    
    var SweepContext = function(contour, options) {
        options = options || {};
        this.triangles_ = [];
        this.map_ = [];
        this.points_ = (options.cloneArrays ? contour.slice(0) : contour);
        this.edge_list = [];
    
        // Bounding box of all points. Computed at the start of the triangulation, 
        // it is stored in case it is needed by the caller.
        this.pmin_ = this.pmax_ = null;
        this.front_ = null;
        this.head_ = null;
        this.tail_ = null;
        this.af_head_ = null;
        this.af_middle_ = null;
        this.af_tail_ = null;
        this.basin = new Basin();
        this.edge_event = new EdgeEvent();
        this.initEdges(this.points_);
    };
    
    SweepContext.prototype.addHole = function(polyline) {
        this.initEdges(polyline);
        var i, len = polyline.length;
        for (i = 0; i < len; i++) {
            this.points_.push(polyline[i]);
        }
        return this; // for chaining
    };
    
    SweepContext.prototype.AddHole = SweepContext.prototype.addHole;
    
    SweepContext.prototype.addHoles = function(holes) {
        var i, len = holes.length;
        for (i = 0; i < len; i++) {
            this.initEdges(holes[i]);
        }
        this.points_ = this.points_.concat.apply(this.points_, holes);
        return this; // for chaining
    };
    
    SweepContext.prototype.addPoint = function(point) {
        this.points_.push(point);
        return this; // for chaining
    };
    
    SweepContext.prototype.AddPoint = SweepContext.prototype.addPoint;
    
    SweepContext.prototype.addPoints = function(points) {
        this.points_ = this.points_.concat(points);
        return this; // for chaining
    };
    
    SweepContext.prototype.triangulate = function() {
        triangulate(this);
        return this; // for chaining
    };
    
    SweepContext.prototype.getBoundingBox = function() {
        return {min: this.pmin_, max: this.pmax_};
    };
    
    SweepContext.prototype.getTriangles = function() {
        return this.triangles_;
    };
    
    SweepContext.prototype.GetTriangles = SweepContext.prototype.getTriangles;
    
    
    // ---------------------------------------------------SweepContext (private API)
    
    SweepContext.prototype.front = function() {
        return this.front_;
    };
    
    SweepContext.prototype.pointCount = function() {
        return this.points_.length;
    };
    
    SweepContext.prototype.head = function() {
        return this.head_;
    };
    
    SweepContext.prototype.setHead = function(p1) {
        this.head_ = p1;
    };
    
    SweepContext.prototype.tail = function() {
        return this.tail_;
    };
    
    SweepContext.prototype.setTail = function(p1) {
        this.tail_ = p1;
    };
    
    SweepContext.prototype.getMap = function() {
        return this.map_;
    };
    
    SweepContext.prototype.initTriangulation = function() {
        var xmax = this.points_[0].x;
        var xmin = this.points_[0].x;
        var ymax = this.points_[0].y;
        var ymin = this.points_[0].y;
    
        // Calculate bounds
        var i, len = this.points_.length;
        for (i = 1; i < len; i++) {
            var p = this.points_[i];
            /* jshint expr:true */
            (p.x > xmax) && (xmax = p.x);
            (p.x < xmin) && (xmin = p.x);
            (p.y > ymax) && (ymax = p.y);
            (p.y < ymin) && (ymin = p.y);
        }
        this.pmin_ = new Point(xmin, ymin);
        this.pmax_ = new Point(xmax, ymax);
    
        var dx = kAlpha * (xmax - xmin);
        var dy = kAlpha * (ymax - ymin);
        this.head_ = new Point(xmax + dx, ymin - dy);
        this.tail_ = new Point(xmin - dx, ymin - dy);
    
        // Sort points along y-axis
        this.points_.sort(Point.compare);
    };
    
    SweepContext.prototype.initEdges = function(polyline) {
        var i, len = polyline.length;
        for (i = 0; i < len; ++i) {
            this.edge_list.push(new Edge(polyline[i], polyline[(i + 1) % len]));
        }
    };
    
    SweepContext.prototype.getPoint = function(index) {
        return this.points_[index];
    };
    
    SweepContext.prototype.addToMap = function(triangle) {
        this.map_.push(triangle);
    };
    
    SweepContext.prototype.locateNode = function(point) {
        return this.front_.locateNode(point.x);
    };
    
    SweepContext.prototype.createAdvancingFront = function() {
        var head;
        var middle;
        var tail;
        // Initial triangle
        var triangle = new Triangle(this.points_[0], this.tail_, this.head_);
        this.map_.push(triangle);
        head = new Node(triangle.getPoint(1), triangle);
        middle = new Node(triangle.getPoint(0), triangle);
        tail = new Node(triangle.getPoint(2));
        this.front_ = new AdvancingFront(head, tail);
        head.next = middle;
        middle.next = tail;
        middle.prev = head;
        tail.prev = middle;
    };
    
    SweepContext.prototype.removeNode = function(node) {
        // do nothing
        /* jshint unused:false */
    };
    
    SweepContext.prototype.mapTriangleToNodes = function(t) {
        for (var i = 0; i < 3; ++i) {
            if (!t.getNeighbor(i)) {
                var n = this.front_.locatePoint(t.pointCW(t.getPoint(i)));
                if (n) {
                    n.triangle = t;
                }
            }
        }
    };
    
    SweepContext.prototype.removeFromMap = function(triangle) {
        var i, map = this.map_, len = map.length;
        for (i = 0; i < len; i++) {
            if (map[i] === triangle) {
                map.splice(i, 1);
                break;
            }
        }
    };
    
    SweepContext.prototype.meshClean = function(triangle) {
        var triangles = [triangle], t, i;
        while (t = triangles.pop()) {
            if (!t.isInterior()) {
                t.setInterior(true);
                this.triangles_.push(t);
                for (i = 0; i < 3; i++) {
                    if (!t.constrained_edge[i]) {
                        triangles.push(t.getNeighbor(i));
                    }
                }
            }
        }
    };
    
    return SweepContext;
})();




var Node = function(p, t) {
    this.point = p;
    this.triangle = t || null;
    this.next = null;
    this.prev = null;
    this.value = p.x;
};

var AdvancingFront = function(head, tail) {
    this.head_ = head;
    this.tail_ = tail;
    this.search_node_ = head;
};

AdvancingFront.prototype.head = function() {
    return this.head_;
};

AdvancingFront.prototype.setHead = function(node) {
    this.head_ = node;
};

AdvancingFront.prototype.tail = function() {
    return this.tail_;
};

AdvancingFront.prototype.setTail = function(node) {
    this.tail_ = node;
};

AdvancingFront.prototype.search = function() {
    return this.search_node_;
};

AdvancingFront.prototype.setSearch = function(node) {
    this.search_node_ = node;
};

AdvancingFront.prototype.findSearchNode = function(/*x*/) {
    return this.search_node_;
};

AdvancingFront.prototype.locateNode = function(x) {
    var node = this.search_node_;
    if (x < node.value) {
        while (node = node.prev) {
            if (x >= node.value) {
                this.search_node_ = node;
                return node;
            }
        }
    } else {
        while (node = node.next) {
            if (x < node.value) {
                this.search_node_ = node.prev;
                return node.prev;
            }
        }
    }
    return null;
};

AdvancingFront.prototype.locatePoint = function(point) {
    var px = point.x;
    var node = this.findSearchNode(px);
    var nx = node.point.x;
    if (px === nx) {
        if (point !== node.point) {
            if (point === node.prev.point) {
                node = node.prev;
            } else if (point === node.next.point) {
                node = node.next;
            } else {
                throw new Error('poly2tri Invalid AdvancingFront.locatePoint() call');
            }
        }
    } else if (px < nx) {
        while (node = node.prev) {
            if (point === node.point) {
                break;
            }
        }
    } else {
        while (node = node.next) {
            if (point === node.point) {
                break;
            }
        }
    }

    if (node) {
        this.search_node_ = node;
    }
    return node;
};


function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assert Failed");
    }
}


const triangulate = (function() {

    var EPSILON = utils.EPSILON;
    var Orientation = utils.Orientation;
    var orient2d = utils.orient2d;
    var inScanArea = utils.inScanArea;
    var isAngleObtuse = utils.isAngleObtuse;

    function triangulate(tcx) {
        tcx.initTriangulation();
        tcx.createAdvancingFront();
        sweepPoints(tcx);
        finalizationPolygon(tcx);
    }

    function sweepPoints(tcx) {
        var i, len = tcx.pointCount();
        for (i = 1; i < len; ++i) {
            var point = tcx.getPoint(i);
            var node = pointEvent(tcx, point);
            var edges = point._p2t_edge_list;
            for (var j = 0; edges && j < edges.length; ++j) {
                edgeEventByEdge(tcx, edges[j], node);
            }
        }
    }

    function finalizationPolygon(tcx) {
        var t = tcx.front().head().next.triangle;
        var p = tcx.front().head().next.point;
        while (!t.getConstrainedEdgeCW(p)) {
            t = t.neighborCCW(p);
        }
        tcx.meshClean(t);
    }

    function pointEvent(tcx, point) {
        var node = tcx.locateNode(point);
        var new_node = newFrontTriangle(tcx, point, node);
        if (point.x <= node.point.x + (EPSILON)) {
            fill(tcx, node);
        }
        fillAdvancingFront(tcx, new_node);
        return new_node;
    }

    function edgeEventByEdge(tcx, edge, node) {
        tcx.edge_event.constrained_edge = edge;
        tcx.edge_event.right = (edge.p.x > edge.q.x);

        if (isEdgeSideOfTriangle(node.triangle, edge.p, edge.q)) {
            return;
        }
        fillEdgeEvent(tcx, edge, node);
        edgeEventByPoints(tcx, edge.p, edge.q, node.triangle, edge.q);
    }

    function edgeEventByPoints(tcx, ep, eq, triangle, point) {
        if (isEdgeSideOfTriangle(triangle, ep, eq)) {
            return;
        }
        var p1 = triangle.pointCCW(point);
        var o1 = orient2d(eq, p1, ep);
        if (o1 === Orientation.COLLINEAR) {
            throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p1, ep]);
        }
        var p2 = triangle.pointCW(point);
        var o2 = orient2d(eq, p2, ep);
        if (o2 === Orientation.COLLINEAR) {
            throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p2, ep]);
        }
        if (o1 === o2) {
            if (o1 === Orientation.CW) {
                triangle = triangle.neighborCCW(point);
            } else {
                triangle = triangle.neighborCW(point);
            }
            edgeEventByPoints(tcx, ep, eq, triangle, point);
        } else {
            flipEdgeEvent(tcx, ep, eq, triangle, point);
        }
    }

    function isEdgeSideOfTriangle(triangle, ep, eq) {
        var index = triangle.edgeIndex(ep, eq);
        if (index !== -1) {
            triangle.markConstrainedEdgeByIndex(index);
            var t = triangle.getNeighbor(index);
            if (t) {
                t.markConstrainedEdgeByPoints(ep, eq);
            }
            return true;
        }
        return false;
    }

    function newFrontTriangle(tcx, point, node) {
        var triangle = new Triangle(point, node.point, node.next.point);
        triangle.markNeighbor(node.triangle);
        tcx.addToMap(triangle);
        var new_node = new Node(point);
        new_node.next = node.next;
        new_node.prev = node;
        node.next.prev = new_node;
        node.next = new_node;
        if (!legalize(tcx, triangle)) {
            tcx.mapTriangleToNodes(triangle);
        }
        return new_node;
    }

    function fill(tcx, node) {
        var triangle = new Triangle(node.prev.point, node.point, node.next.point);
        triangle.markNeighbor(node.prev.triangle);
        triangle.markNeighbor(node.triangle);
        tcx.addToMap(triangle);
        node.prev.next = node.next;
        node.next.prev = node.prev;
        if (!legalize(tcx, triangle)) {
            tcx.mapTriangleToNodes(triangle);
        }
    }

    function fillAdvancingFront(tcx, n) {
        var node = n.next;
        while (node.next) {
            if (isAngleObtuse(node.point, node.next.point, node.prev.point)) {
                break;
            }
            fill(tcx, node);
            node = node.next;
        }

        node = n.prev;
        while (node.prev) {
            if (isAngleObtuse(node.point, node.next.point, node.prev.point)) {
                break;
            }
            fill(tcx, node);
            node = node.prev;
        }
        if (n.next && n.next.next) {
            if (isBasinAngleRight(n)) {
                fillBasin(tcx, n);
            }
        }
    }

    function isBasinAngleRight(node) {
        var ax = node.point.x - node.next.next.point.x;
        var ay = node.point.y - node.next.next.point.y;
        assert(ay >= 0, "unordered y");
        return (ax >= 0 || Math.abs(ax) < ay);
    }

    function legalize(tcx, t) {
        for (var i = 0; i < 3; ++i) {
            if (t.delaunay_edge[i]) {
                continue;
            }
            var ot = t.getNeighbor(i);
            if (ot) {
                var p = t.getPoint(i);
                var op = ot.oppositePoint(t, p);
                var oi = ot.index(op);
                if (ot.constrained_edge[oi] || ot.delaunay_edge[oi]) {
                    t.constrained_edge[i] = ot.constrained_edge[oi];
                    continue;
                }

                var inside = inCircle(p, t.pointCCW(p), t.pointCW(p), op);
                if (inside) {
                    t.delaunay_edge[i] = true;
                    ot.delaunay_edge[oi] = true;
                    rotateTrianglePair(t, p, ot, op);
                    var not_legalized = !legalize(tcx, t);
                    if (not_legalized) {
                        tcx.mapTriangleToNodes(t);
                    }
                    not_legalized = !legalize(tcx, ot);
                    if (not_legalized) {
                        tcx.mapTriangleToNodes(ot);
                    }
                    t.delaunay_edge[i] = false;
                    ot.delaunay_edge[oi] = false;
                    return true;
                }
            }
        }
        return false;
    }

    function inCircle(pa, pb, pc, pd) {
        var adx = pa.x - pd.x;
        var ady = pa.y - pd.y;
        var bdx = pb.x - pd.x;
        var bdy = pb.y - pd.y;

        var adxbdy = adx * bdy;
        var bdxady = bdx * ady;
        var oabd = adxbdy - bdxady;
        if (oabd <= 0) {
            return false;
        }

        var cdx = pc.x - pd.x;
        var cdy = pc.y - pd.y;

        var cdxady = cdx * ady;
        var adxcdy = adx * cdy;
        var ocad = cdxady - adxcdy;
        if (ocad <= 0) {
            return false;
        }

        var bdxcdy = bdx * cdy;
        var cdxbdy = cdx * bdy;

        var alift = adx * adx + ady * ady;
        var blift = bdx * bdx + bdy * bdy;
        var clift = cdx * cdx + cdy * cdy;

        var det = alift * (bdxcdy - cdxbdy) + blift * ocad + clift * oabd;
        return det > 0;
    }

    function rotateTrianglePair(t, p, ot, op) {
        var n1, n2, n3, n4;
        n1 = t.neighborCCW(p);
        n2 = t.neighborCW(p);
        n3 = ot.neighborCCW(op);
        n4 = ot.neighborCW(op);

        var ce1, ce2, ce3, ce4;
        ce1 = t.getConstrainedEdgeCCW(p);
        ce2 = t.getConstrainedEdgeCW(p);
        ce3 = ot.getConstrainedEdgeCCW(op);
        ce4 = ot.getConstrainedEdgeCW(op);

        var de1, de2, de3, de4;
        de1 = t.getDelaunayEdgeCCW(p);
        de2 = t.getDelaunayEdgeCW(p);
        de3 = ot.getDelaunayEdgeCCW(op);
        de4 = ot.getDelaunayEdgeCW(op);

        t.legalize(p, op);
        ot.legalize(op, p);

        // Remap delaunay_edge
        ot.setDelaunayEdgeCCW(p, de1);
        t.setDelaunayEdgeCW(p, de2);
        t.setDelaunayEdgeCCW(op, de3);
        ot.setDelaunayEdgeCW(op, de4);

        // Remap constrained_edge
        ot.setConstrainedEdgeCCW(p, ce1);
        t.setConstrainedEdgeCW(p, ce2);
        t.setConstrainedEdgeCCW(op, ce3);
        ot.setConstrainedEdgeCW(op, ce4);

        t.clearNeighbors();
        ot.clearNeighbors();
        if (n1) {
            ot.markNeighbor(n1);
        }
        if (n2) {
            t.markNeighbor(n2);
        }
        if (n3) {
            t.markNeighbor(n3);
        }
        if (n4) {
            ot.markNeighbor(n4);
        }
        t.markNeighbor(ot);
    }

    function fillBasin(tcx, node) {
        if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
            tcx.basin.left_node = node.next.next;
        } else {
            tcx.basin.left_node = node.next;
        }
        tcx.basin.bottom_node = tcx.basin.left_node;
        while (tcx.basin.bottom_node.next && tcx.basin.bottom_node.point.y >= tcx.basin.bottom_node.next.point.y) {
            tcx.basin.bottom_node = tcx.basin.bottom_node.next;
        }
        if (tcx.basin.bottom_node === tcx.basin.left_node) {
            return;
        }

        tcx.basin.right_node = tcx.basin.bottom_node;
        while (tcx.basin.right_node.next && tcx.basin.right_node.point.y < tcx.basin.right_node.next.point.y) {
            tcx.basin.right_node = tcx.basin.right_node.next;
        }
        if (tcx.basin.right_node === tcx.basin.bottom_node) {
            return;
        }
        tcx.basin.width = tcx.basin.right_node.point.x - tcx.basin.left_node.point.x;
        tcx.basin.left_highest = tcx.basin.left_node.point.y > tcx.basin.right_node.point.y;
        fillBasinReq(tcx, tcx.basin.bottom_node);
    }

    function fillBasinReq(tcx, node) {
        if (isShallow(tcx, node)) {
            return;
        }
        fill(tcx, node);
        var o;
        if (node.prev === tcx.basin.left_node && node.next === tcx.basin.right_node) {
            return;
        } else if (node.prev === tcx.basin.left_node) {
            o = orient2d(node.point, node.next.point, node.next.next.point);
            if (o === Orientation.CW) {
                return;
            }
            node = node.next;
        } else if (node.next === tcx.basin.right_node) {
            o = orient2d(node.point, node.prev.point, node.prev.prev.point);
            if (o === Orientation.CCW) {
                return;
            }
            node = node.prev;
        } else {
            if (node.prev.point.y < node.next.point.y) {
                node = node.prev;
            } else {
                node = node.next;
            }
        }

        fillBasinReq(tcx, node);
    }

    function isShallow(tcx, node) {
        var height;
        if (tcx.basin.left_highest) {
            height = tcx.basin.left_node.point.y - node.point.y;
        } else {
            height = tcx.basin.right_node.point.y - node.point.y;
        }
        if (tcx.basin.width > height) {
            return true;
        }
        return false;
    }

    function fillEdgeEvent(tcx, edge, node) {
        if (tcx.edge_event.right) {
            fillRightAboveEdgeEvent(tcx, edge, node);
        } else {
            fillLeftAboveEdgeEvent(tcx, edge, node);
        }
    }

    function fillRightAboveEdgeEvent(tcx, edge, node) {
        while (node.next.point.x < edge.p.x) {
            if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
                fillRightBelowEdgeEvent(tcx, edge, node);
            } else {
                node = node.next;
            }
        }
    }

    function fillRightBelowEdgeEvent(tcx, edge, node) {
        if (node.point.x < edge.p.x) {
            if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                // Concave
                fillRightConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Convex
                fillRightConvexEdgeEvent(tcx, edge, node);
                // Retry this one
                fillRightBelowEdgeEvent(tcx, edge, node);
            }
        }
    }

    function fillRightConcaveEdgeEvent(tcx, edge, node) {
        fill(tcx, node.next);
        if (node.next.point !== edge.p) {
            // Next above or below edge?
            if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
                // Below
                if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                    // Next is concave
                    fillRightConcaveEdgeEvent(tcx, edge, node);
                }
            }
        }
    }

    function fillRightConvexEdgeEvent(tcx, edge, node) {
        // Next concave or convex?
        if (orient2d(node.next.point, node.next.next.point, node.next.next.next.point) === Orientation.CCW) {
            // Concave
            fillRightConcaveEdgeEvent(tcx, edge, node.next);
        } else {
            // Convex
            // Next above or below edge?
            if (orient2d(edge.q, node.next.next.point, edge.p) === Orientation.CCW) {
                // Below
                fillRightConvexEdgeEvent(tcx, edge, node.next);
            }
        }
    }

    function fillLeftAboveEdgeEvent(tcx, edge, node) {
        while (node.prev.point.x > edge.p.x) {
            // Check if next node is below the edge
            if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
                fillLeftBelowEdgeEvent(tcx, edge, node);
            } else {
                node = node.prev;
            }
        }
    }

    function fillLeftBelowEdgeEvent(tcx, edge, node) {
        if (node.point.x > edge.p.x) {
            if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                // Concave
                fillLeftConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Convex
                fillLeftConvexEdgeEvent(tcx, edge, node);
                // Retry this one
                fillLeftBelowEdgeEvent(tcx, edge, node);
            }
        }
    }

    function fillLeftConvexEdgeEvent(tcx, edge, node) {
        // Next concave or convex?
        if (orient2d(node.prev.point, node.prev.prev.point, node.prev.prev.prev.point) === Orientation.CW) {
            // Concave
            fillLeftConcaveEdgeEvent(tcx, edge, node.prev);
        } else {
            // Convex
            // Next above or below edge?
            if (orient2d(edge.q, node.prev.prev.point, edge.p) === Orientation.CW) {
                // Below
                fillLeftConvexEdgeEvent(tcx, edge, node.prev);
            }
        }
    }

    function fillLeftConcaveEdgeEvent(tcx, edge, node) {
        fill(tcx, node.prev);
        if (node.prev.point !== edge.p) {
            // Next above or below edge?
            if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
                // Below
                if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                    // Next is concave
                    fillLeftConcaveEdgeEvent(tcx, edge, node);
                }
            }
        }
    }

    function flipEdgeEvent(tcx, ep, eq, t, p) {
        var ot = t.neighborAcross(p);
        assert(ot, "FLIP failed due to missing triangle!");

        var op = ot.oppositePoint(t, p);

        // Additional check from Java version (see issue #88)
        if (t.getConstrainedEdgeAcross(p)) {
            var index = t.index(p);
            throw new PointError("poly2tri Intersecting Constraints",
                    [p, op, t.getPoint((index + 1) % 3), t.getPoint((index + 2) % 3)]);
        }

        if (inScanArea(p, t.pointCCW(p), t.pointCW(p), op)) {
            // Lets rotate shared edge one vertex CW
            rotateTrianglePair(t, p, ot, op);
            tcx.mapTriangleToNodes(t);
            tcx.mapTriangleToNodes(ot);
            if (p === eq && op === ep) {
                if (eq === tcx.edge_event.constrained_edge.q && ep === tcx.edge_event.constrained_edge.p) {
                    t.markConstrainedEdgeByPoints(ep, eq);
                    ot.markConstrainedEdgeByPoints(ep, eq);
                    legalize(tcx, t);
                    legalize(tcx, ot);
                }
            } else {
                var o = orient2d(eq, op, ep);
                t = nextFlipTriangle(tcx, o, t, ot, p, op);
                flipEdgeEvent(tcx, ep, eq, t, p);
            }
        } else {
            var newP = nextFlipPoint(ep, eq, ot, op);
            flipScanEdgeEvent(tcx, ep, eq, t, ot, newP);
            edgeEventByPoints(tcx, ep, eq, t, p);
        }
    }

    function nextFlipTriangle(tcx, o, t, ot, p, op) {
        var edge_index;
        if (o === Orientation.CCW) {
            // ot is not crossing edge after flip
            edge_index = ot.edgeIndex(p, op);
            ot.delaunay_edge[edge_index] = true;
            legalize(tcx, ot);
            ot.clearDelaunayEdges();
            return t;
        }

        // t is not crossing edge after flip
        edge_index = t.edgeIndex(p, op);

        t.delaunay_edge[edge_index] = true;
        legalize(tcx, t);
        t.clearDelaunayEdges();
        return ot;
    }

    function nextFlipPoint(ep, eq, ot, op) {
        var o2d = orient2d(eq, op, ep);
        if (o2d === Orientation.CW) {
            // Right
            return ot.pointCCW(op);
        } else if (o2d === Orientation.CCW) {
            // Left
            return ot.pointCW(op);
        } else {
            throw new PointError("poly2tri [Unsupported] nextFlipPoint: opposing point on constrained edge!", [eq, op, ep]);
        }
    }

    function flipScanEdgeEvent(tcx, ep, eq, flip_triangle, t, p) {
        var ot = t.neighborAcross(p);
        assert(ot, "FLIP failed due to missing triangle");

        var op = ot.oppositePoint(t, p);

        if (inScanArea(eq, flip_triangle.pointCCW(eq), flip_triangle.pointCW(eq), op)) {
            // flip with new edge op.eq
            flipEdgeEvent(tcx, eq, op, ot, op);
        } else {
            var newP = nextFlipPoint(ep, eq, ot, op);
            flipScanEdgeEvent(tcx, ep, eq, flip_triangle, ot, newP);
        }
    }

    return triangulate;
})();





const Triangle = function(a, b, c) {
    this.points_ = [a, b, c];
    this.neighbors_ = [null, null, null];
    this.interior_ = false;
    this.constrained_edge = [false, false, false];
    this.delaunay_edge = [false, false, false];
};

var p2s = xy.toString;

Triangle.prototype.toString = function() {
    return ("[" + p2s(this.points_[0]) + p2s(this.points_[1]) + p2s(this.points_[2]) + "]");
};

Triangle.prototype.getPoint = function(index) {
    return this.points_[index];
};

Triangle.prototype.GetPoint = Triangle.prototype.getPoint;

Triangle.prototype.getPoints = function() {
    return this.points_;
};

Triangle.prototype.getNeighbor = function(index) {
    return this.neighbors_[index];
};

Triangle.prototype.containsPoint = function(point) {
    var points = this.points_;
    // Here we are comparing point references, not values
    return (point === points[0] || point === points[1] || point === points[2]);
};

Triangle.prototype.containsEdge = function(edge) {
    return this.containsPoint(edge.p) && this.containsPoint(edge.q);
};

Triangle.prototype.containsPoints = function(p1, p2) {
    return this.containsPoint(p1) && this.containsPoint(p2);
};

Triangle.prototype.isInterior = function() {
    return this.interior_;
};

Triangle.prototype.setInterior = function(interior) {
    this.interior_ = interior;
    return this;
};

Triangle.prototype.markNeighborPointers = function(p1, p2, t) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if ((p1 === points[2] && p2 === points[1]) || (p1 === points[1] && p2 === points[2])) {
        this.neighbors_[0] = t;
    } else if ((p1 === points[0] && p2 === points[2]) || (p1 === points[2] && p2 === points[0])) {
        this.neighbors_[1] = t;
    } else if ((p1 === points[0] && p2 === points[1]) || (p1 === points[1] && p2 === points[0])) {
        this.neighbors_[2] = t;
    } else {
        throw new Error('poly2tri Invalid Triangle.markNeighborPointers() call');
    }
};

Triangle.prototype.markNeighbor = function(t) {
    var points = this.points_;
    if (t.containsPoints(points[1], points[2])) {
        this.neighbors_[0] = t;
        t.markNeighborPointers(points[1], points[2], this);
    } else if (t.containsPoints(points[0], points[2])) {
        this.neighbors_[1] = t;
        t.markNeighborPointers(points[0], points[2], this);
    } else if (t.containsPoints(points[0], points[1])) {
        this.neighbors_[2] = t;
        t.markNeighborPointers(points[0], points[1], this);
    }
};

Triangle.prototype.clearNeighbors = function() {
    this.neighbors_[0] = null;
    this.neighbors_[1] = null;
    this.neighbors_[2] = null;
};

Triangle.prototype.clearDelaunayEdges = function() {
    this.delaunay_edge[0] = false;
    this.delaunay_edge[1] = false;
    this.delaunay_edge[2] = false;
};

Triangle.prototype.pointCW = function(p) {
    var points = this.points_;
    if (p === points[0]) {
        return points[2];
    } else if (p === points[1]) {
        return points[0];
    } else if (p === points[2]) {
        return points[1];
    } else {
        return null;
    }
};

Triangle.prototype.pointCCW = function(p) {
    var points = this.points_;
    if (p === points[0]) {
        return points[1];
    } else if (p === points[1]) {
        return points[2];
    } else if (p === points[2]) {
        return points[0];
    } else {
        return null;
    }
};

Triangle.prototype.neighborCW = function(p) {
    if (p === this.points_[0]) {
        return this.neighbors_[1];
    } else if (p === this.points_[1]) {
        return this.neighbors_[2];
    } else {
        return this.neighbors_[0];
    }
};

Triangle.prototype.neighborCCW = function(p) {
    if (p === this.points_[0]) {
        return this.neighbors_[2];
    } else if (p === this.points_[1]) {
        return this.neighbors_[0];
    } else {
        return this.neighbors_[1];
    }
};

Triangle.prototype.getConstrainedEdgeCW = function(p) {
    if (p === this.points_[0]) {
        return this.constrained_edge[1];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[2];
    } else {
        return this.constrained_edge[0];
    }
};

Triangle.prototype.getConstrainedEdgeCCW = function(p) {
    if (p === this.points_[0]) {
        return this.constrained_edge[2];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[0];
    } else {
        return this.constrained_edge[1];
    }
};

Triangle.prototype.getConstrainedEdgeAcross = function(p) {
    if (p === this.points_[0]) {
        return this.constrained_edge[0];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[1];
    } else {
        return this.constrained_edge[2];
    }
};

Triangle.prototype.setConstrainedEdgeCW = function(p, ce) {
    if (p === this.points_[0]) {
        this.constrained_edge[1] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[2] = ce;
    } else {
        this.constrained_edge[0] = ce;
    }
};

Triangle.prototype.setConstrainedEdgeCCW = function(p, ce) {
    if (p === this.points_[0]) {
        this.constrained_edge[2] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[0] = ce;
    } else {
        this.constrained_edge[1] = ce;
    }
};

Triangle.prototype.getDelaunayEdgeCW = function(p) {
    if (p === this.points_[0]) {
        return this.delaunay_edge[1];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[2];
    } else {
        return this.delaunay_edge[0];
    }
};

Triangle.prototype.getDelaunayEdgeCCW = function(p) {
    if (p === this.points_[0]) {
        return this.delaunay_edge[2];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[0];
    } else {
        return this.delaunay_edge[1];
    }
};

Triangle.prototype.setDelaunayEdgeCW = function(p, e) {
    if (p === this.points_[0]) {
        this.delaunay_edge[1] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[2] = e;
    } else {
        this.delaunay_edge[0] = e;
    }
};

Triangle.prototype.setDelaunayEdgeCCW = function(p, e) {
    if (p === this.points_[0]) {
        this.delaunay_edge[2] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[0] = e;
    } else {
        this.delaunay_edge[1] = e;
    }
};

Triangle.prototype.neighborAcross = function(p) {
    if (p === this.points_[0]) {
        return this.neighbors_[0];
    } else if (p === this.points_[1]) {
        return this.neighbors_[1];
    } else {
        return this.neighbors_[2];
    }
};

Triangle.prototype.oppositePoint = function(t, p) {
    var cw = t.pointCW(p);
    return this.pointCW(cw);
};

Triangle.prototype.legalize = function(opoint, npoint) {
    var points = this.points_;
    if (opoint === points[0]) {
        points[1] = points[0];
        points[0] = points[2];
        points[2] = npoint;
    } else if (opoint === points[1]) {
        points[2] = points[1];
        points[1] = points[0];
        points[0] = npoint;
    } else if (opoint === points[2]) {
        points[0] = points[2];
        points[2] = points[1];
        points[1] = npoint;
    } else {
        throw new Error('poly2tri Invalid Triangle.legalize() call');
    }
};

Triangle.prototype.index = function(p) {
    var points = this.points_;
    if (p === points[0]) {
        return 0;
    } else if (p === points[1]) {
        return 1;
    } else if (p === points[2]) {
        return 2;
    } else {
        throw new Error('poly2tri Invalid Triangle.index() call');
    }
};

Triangle.prototype.edgeIndex = function(p1, p2) {
    var points = this.points_;
    if (p1 === points[0]) {
        if (p2 === points[1]) {
            return 2;
        } else if (p2 === points[2]) {
            return 1;
        }
    } else if (p1 === points[1]) {
        if (p2 === points[2]) {
            return 0;
        } else if (p2 === points[0]) {
            return 2;
        }
    } else if (p1 === points[2]) {
        if (p2 === points[0]) {
            return 1;
        } else if (p2 === points[1]) {
            return 0;
        }
    }
    return -1;
};

Triangle.prototype.markConstrainedEdgeByIndex = function(index) {
    this.constrained_edge[index] = true;
};

Triangle.prototype.markConstrainedEdgeByEdge = function(edge) {
    this.markConstrainedEdgeByPoints(edge.p, edge.q);
};

Triangle.prototype.markConstrainedEdgeByPoints = function(p, q) {
    var points = this.points_;
    if ((q === points[0] && p === points[1]) || (q === points[1] && p === points[0])) {
        this.constrained_edge[2] = true;
    } else if ((q === points[0] && p === points[2]) || (q === points[2] && p === points[0])) {
        this.constrained_edge[1] = true;
    } else if ((q === points[1] && p === points[2]) || (q === points[2] && p === points[1])) {
        this.constrained_edge[0] = true;
    }
};

const api$h = {
    extractNodes : function(_datas) {
        const nodes = new Map();
        const extractedNodes = api$h.extractElements(_datas, 'node');
        for (let i = 0; i < extractedNodes.length; i ++) {
            const node = extractedNodes[i];
            nodes.set('NODE_' + node.id, [
                parseFloat(node.lon), 
                parseFloat(node.lat)
            ]);
        }
        return nodes;
    }, 

    extractWays : function(_datas) {
        const ways = new Map();
        const extractedWays = api$h.extractElements(_datas, 'way');
        for (let i = 0; i < extractedWays.length; i ++) {
            const way = extractedWays[i];
            ways.set('WAY_' + way.id, way);
        }
        return ways;
    }, 

    extractElements : function(_datas, _type) {
        const elements = [];
        for (let i = 0; i < _datas.elements.length; i ++) {
            const element = _datas.elements[i];
            if (element.type != _type) continue;
            elements.push(element);
        }
        return elements;
    }, 

};

/*
 (c) 2017, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

(function () {
// to suit your point format, run search/replace for '.x' and '.y';
// for 3D version, see 3d branch (configurability would draw significant performance overhead)

// square distance between 2 points
function getSqDist(p1, p2) {

    var dx = p1[0] - p2[0],
        dy = p1[1] - p2[1];

    return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p, p1, p2) {

    var x = p1[0],
        y = p1[1],
        dx = p2[0] - x,
        dy = p2[1] - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2[0];
            y = p2[1];

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p[0] - x;
    dy = p[1] - y;

    return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points, sqTolerance) {

    var prevPoint = points[0],
        newPoints = [prevPoint],
        point;

    for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== point) newPoints.push(point);

    return newPoints;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
    var maxSqDist = sqTolerance,
        index;

    for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);

        if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
        }
    }

    if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyDouglasPeucker(points, sqTolerance) {
    var last = points.length - 1;

    var simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
}

// both algorithms combined for awesome performance
function simplify(points, tolerance, highestQuality) {

    if (points.length <= 2) return points;

    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

    points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    return points;
}

// export as AMD module / Node module / browser or worker variable
if (typeof define === 'function' && define.amd) define(function() { return simplify; });
else if (typeof module !== 'undefined') {
    module.exports = simplify;
    module.exports.default = simplify;
} else if (typeof self !== 'undefined') self.simplify = simplify;
else window.simplify = simplify;

})();

/*
 * A speed-improved perlin and simplex noise algorithms for 2D.
 *
 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 * Converted to Javascript by Joseph Gentle.
 *
 * Version 2012-03-09
 *
 * This code was placed in the public domain by its original author,
 * Stefan Gustavson. You may use it as you see fit, but
 * attribution is appreciated.
 *
 */
  function Grad(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }
  
  Grad.prototype.dot2 = function(x, y) {
    return this.x*x + this.y*y;
  };

  Grad.prototype.dot3 = function(x, y, z) {
    return this.x*x + this.y*y + this.z*z;
  };

  var grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
               new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
               new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];

  var p = [151,160,137,91,90,15,
  131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
  190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
  88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
  77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
  102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
  135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
  5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
  223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
  129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
  251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
  49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  // To remove the need for index wrapping, double the permutation table length
  var perm = new Array(512);
  var gradP = new Array(512);

  // This isn't a very good seeding function, but it works ok. It supports 2^16
  // different seed values. Write something better if you need more seeds.
  function seed(seed) {
    if(seed > 0 && seed < 1) {
      // Scale the seed out
      seed *= 65536;
    }

    seed = Math.floor(seed);
    if(seed < 256) {
      seed |= seed << 8;
    }

    for(var i = 0; i < 256; i++) {
      var v;
      if (i & 1) {
        v = p[i] ^ (seed & 255);
      } else {
        v = p[i] ^ ((seed>>8) & 255);
      }

      perm[i] = perm[i + 256] = v;
      gradP[i] = gradP[i + 256] = grad3[v % 12];
    }
  }
  seed(0);

  var F3 = 1/3;
  var G3 = 1/6;

  // 3D simplex noise
  function simplex3(xin, yin, zin) {
    var n0, n1, n2, n3; // Noise contributions from the four corners

    // Skew the input space to determine which simplex cell we're in
    var s = (xin+yin+zin)*F3; // Hairy factor for 2D
    var i = Math.floor(xin+s);
    var j = Math.floor(yin+s);
    var k = Math.floor(zin+s);

    var t = (i+j+k)*G3;
    var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
    var y0 = yin-j+t;
    var z0 = zin-k+t;

    // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
    // Determine which simplex we are in.
    var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
    var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
    if(x0 >= y0) {
      if(y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if(x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else              { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if(y0 < z0)      { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if(x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else             { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }
    // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
    // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
    // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
    // c = 1/6.
    var x1 = x0 - i1 + G3; // Offsets for second corner
    var y1 = y0 - j1 + G3;
    var z1 = z0 - k1 + G3;

    var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
    var y2 = y0 - j2 + 2 * G3;
    var z2 = z0 - k2 + 2 * G3;

    var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
    var y3 = y0 - 1 + 3 * G3;
    var z3 = z0 - 1 + 3 * G3;

    // Work out the hashed gradient indices of the four simplex corners
    i &= 255;
    j &= 255;
    k &= 255;
    var gi0 = gradP[i+   perm[j+   perm[k   ]]];
    var gi1 = gradP[i+i1+perm[j+j1+perm[k+k1]]];
    var gi2 = gradP[i+i2+perm[j+j2+perm[k+k2]]];
    var gi3 = gradP[i+ 1+perm[j+ 1+perm[k+ 1]]];

    // Calculate the contribution from the four corners
    var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if(t0<0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot3(x0, y0, z0);  // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if(t1<0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
    }
    var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if(t2<0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
    }
    var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if(t3<0) {
      n3 = 0;
    } else {
      t3 *= t3;
      n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 32 * (n0 + n1 + n2 + n3);

  }

function buildLanduseGeometry(_landuse, _layerInfos, _facesIndex, _elevationsDatas, _tile) {
    let lastMaterialLayer = 0;
    let layersBuffers = [];
    let curLayerBuffersGeos = [];

    let bufferColor = null;

    for (let layer = 0; layer < _layerInfos.nbLayers; layer ++) {
        const layerGroundElevation = _layerInfos.groundOffset + (layer * _layerInfos.meterBetweenLayers);
        const bufferGeometry = getGeometry();
        let verticesNb = _landuse.border.length + _landuse.fillPoints.length;
        _landuse.holes.forEach(hole => verticesNb += hole.length);
        const bufferVertices = new Float32Array(verticesNb * 3);
        let verticeId = 0;
        verticeId = addVerticesToBuffer(verticeId, bufferVertices, _landuse.border, _elevationsDatas.border, layerGroundElevation);
        _landuse.holes.forEach((hole, h) => {
            verticeId = addVerticesToBuffer(verticeId, bufferVertices, hole, _elevationsDatas.holes[h], layerGroundElevation);
        });
        verticeId = addVerticesToBuffer(verticeId, bufferVertices, _landuse.fillPoints, _elevationsDatas.fill, layerGroundElevation);
        const bufferUvs = new Float32Array(verticesNb * 2);
        let uvId = 0;
        uvId = addUvToBuffer(uvId, bufferUvs, _landuse.border, _layerInfos.uvFactor, _tile);
        _landuse.holes.forEach(hole => {
            uvId = addUvToBuffer(uvId, bufferUvs, hole, _layerInfos.uvFactor, _tile);
        });
        uvId = addUvToBuffer(uvId, bufferUvs, _landuse.fillPoints, _layerInfos.uvFactor, _tile);
        const facesNb = _facesIndex.length;
        const bufferFaces = new Uint32Array(facesNb * 3);
        let facesId = 0;

        for (let i = 0; i < _facesIndex.length; i ++) {
            const t = _facesIndex[i];
            // bufferFaces[facesId + 0] = t[0];
            // bufferFaces[facesId + 1] = t[1];
            // bufferFaces[facesId + 2] = t[2];
            const points = t.getPoints();
            bufferFaces[facesId + 0] = points[0].id;
            bufferFaces[facesId + 1] = points[1].id;
            bufferFaces[facesId + 2] = points[2].id;
            facesId += 3;
        }
        if (_layerInfos.vertexColor) {
            if (!bufferColor) {
                bufferColor = new Uint8Array(verticesNb * 3);
                seed(Math.random());
                for (let i = 0; i < bufferVertices.length; i += 3) {
                    const value = perlinValue(bufferVertices[i + 0], bufferVertices[i + 1], bufferVertices[i + 2]);

                    if (_landuse.type == 'forest') {
                        bufferColor[i + 0] = Math.min(255, 50 + value * 150);
                        bufferColor[i + 1] = Math.min(255, 100 + value * 150);
                        bufferColor[i + 2] = 10 + value * 70;
                    } else {
                        bufferColor[i + 0] = Math.min(255, 100 + value * 120);
                        bufferColor[i + 1] = Math.min(255, 80 + value * 120);
                        bufferColor[i + 2] = 10 + value * 70;
                    }

                    // bufferColor[i + 0] = 255;
                    // bufferColor[i + 1] = 255;
                    // bufferColor[i + 2] = 255;
                }
            }
            bufferGeometry.setAttribute('color', new BufferAttribute(bufferColor, 3, true));
        }
        bufferGeometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
        bufferGeometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
		bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();

        let curLayerMap = Math.floor(layer / _layerInfos.layersByMap);
        if (curLayerMap != lastMaterialLayer) {
            lastMaterialLayer = curLayerMap;
            const mergedLayersBuffer = BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
            layersBuffers.push(mergedLayersBuffer);
            storeGeometries(curLayerBuffersGeos);
            curLayerBuffersGeos = [];
        }
        curLayerBuffersGeos.push(bufferGeometry);
    }
    const mergedLayersBuffer = BufferGeometryUtils.mergeBufferGeometries(curLayerBuffersGeos);
    storeGeometries(curLayerBuffersGeos);
    curLayerBuffersGeos = [];
    layersBuffers.push(mergedLayersBuffer);
    return layersBuffers;
}

function perlinValue(_x, _y, _z) {
    let res = 0;
    let scale = 0.05;
    let factor = 1;
    for (let i = 0; i < 5; i ++) {
        const value = simplex3(_x * scale, _y * scale, _z * scale);
        res += (value * factor);
        factor *= 0.6;
        scale *= 2;
    }
    return Math.max(0, Math.min(1, (res + 1) / 2));
}

function addVerticesToBuffer(_offset, _buffer, _positions, _elevationsDatas, _elevationOffset) {
    for (let i = 0; i < _positions.length; i ++) {
        const point = _positions[i];
        const vertPos = api$a.coordToXYZ(
            point[0], 
            point[1], 
            _elevationOffset + _elevationsDatas[i]
        );
        _buffer[_offset + 0] = vertPos.x;
        _buffer[_offset + 1] = vertPos.y;
        _buffer[_offset + 2] = vertPos.z;
        _offset += 3;
    }
    return _offset;
}

function addUvToBuffer(_offset, _buffer, _positions, _uvFactor, _tile) {
    for (let i = 0; i < _positions.length; i ++) {
        const point = _positions[i];
        let uvX = mapValue$1(point[0], _tile.startCoord.x, _tile.endCoord.x);
        let uvY = mapValue$1(point[1], _tile.endCoord.y, _tile.startCoord.y);
        _buffer[_offset + 0] = uvX * _uvFactor;
        _buffer[_offset + 1] = uvY * _uvFactor;
        _offset += 2;
    }
    return _offset;
}

function mapValue$1(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension$2);

const texturesToLoad = [
    ['shell_void', 'shell_void.png'], 
    
    // ['landuse_border_forest', 'splat_alpha.png'], 
    // ['landuse_border_scrub', 'landuse_border_scrub.png'], 

    ['landuse_border_scrub', 'splat_alpha.png'], 
    ['landuse_border_forest', 'landuse_border_scrub.png'], 
    
    // ['shell_water_normal_1', 'shell_water_normal_tumblr_1.png'], 
    // ['shell_water_normal_2', 'shell_water_normal_tumblr_2.png'], 
    // ['shell_water_normal_3', 'shell_water_normal_tumblr_3.png'], 

    ['shell_tree_0', 'shell_tree_0.png'], 
    ['shell_tree_1', 'shell_tree_1_grey.png'], 
    ['shell_tree_2', 'shell_tree_2_grey.png'], 
    ['shell_tree_3', 'shell_tree_3_grey.png'], 
    ['shell_tree_4', 'shell_tree_4_grey.png'], 
    
    ['shell_tree_normal', 'shell_tree_normal.png'], 
    // ['shell_tree_specular', 'shell_tree_specular.png'], 

    // ['shell_vine_1', 'shell_vine_1.png'], 
    // ['shell_vine_2', 'shell_vine_2.png'], 
    // ['shell_vine_3', 'shell_vine_3.png'], 
    // ['shell_vine_4', 'shell_vine_4.png'], 
    // ['shell_vine_normal', 'vine_normal.png'], 
    // ['shell_vine_specular', 'shell_vine_specular.png'], 

    // ['shell_grass_1', 'shell_grass_1.png'], 
    // ['shell_grass_2', 'shell_grass_2.png'], 
    // ['shell_grass_normal', 'shell_grass_normal.png'], 
    // ['shell_grass_specular', 'shell_grass_specular.png'], 

    ['shell_scrub_1', 'shell_scrub_mix_1.png'], 
    ['shell_scrub_2', 'shell_scrub_grey_2.png'], 
    ['shell_scrub_3', 'shell_scrub_grey_3.png'], 
    ['shell_scrub_normal', 'shell_scrub_mix_normal.png'], 

    ['shell_rock_1', 'shell_rock_1.png'], 
    ['shell_rock_normal', 'shell_rock_normal.png'], 

    // ['shell_scrub_specular', 'shell_scrub_mix_specular.png'], 
    
];

const api$i = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials[_type];
    }, 
};

const materials = {
    forest : [], 
    scrub : [], 
    grass : [], 
    vineyard : [], 
    rock : [], 
    water : [], 
    wetland : [], 
};


function onActivateExtension$2() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension$2);
    createMaterials$1();
    loadTextures$1();
}

function createMaterials$1() {
        // const sided = THREE.DoubleSide;
        const sided = FrontSide;

        
        // materials.wetland.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x18472d, side:sided}));
        // materials.wetland.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.wetland.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));

        // materials.water.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x18472d, side:sided}));
        // materials.water.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x3f66aa, side:sided, transparent:true, opacity:0.6}));
        // materials.water.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x4a7ed6, side:sided, transparent:true, opacity:0.3}));

        // materials.forest.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:1,metalness:0, color:0xFFFFFF, side:sided}));
        materials.forest.push(new MeshPhysicalMaterial({vertexColors:VertexColors,roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        materials.forest.push(new MeshPhysicalMaterial({vertexColors:VertexColors,roughness:0.9,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.6}));
        materials.forest.push(new MeshPhysicalMaterial({vertexColors:VertexColors,roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.7}));
        materials.forest.push(new MeshPhysicalMaterial({vertexColors:VertexColors,roughness:0.7,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.8}));

        // materials.scrub.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided}));
        // materials.scrub.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        materials.scrub.push(new MeshPhysicalMaterial({vertexColors:VertexColors,roughness:0.9,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        materials.scrub.push(new MeshPhysicalMaterial({vertexColors:VertexColors,roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        
        // materials.grass.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.grass.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        
        materials.rock.push(new MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:false, alphaTest:0.2}));
}

function loadTextures$1() {
    const texturesList = [];
    texturesToLoad.forEach(d => addToList(texturesList, d[0], d[1]));
    loadBatch(texturesList, onTexturesLoaded$1);
}

function onTexturesLoaded$1() {
    // materials.water[0].normalMap = NET_TEXTURES.texture('shell_water_normal_1');
    // materials.water[1].normalMap = NET_TEXTURES.texture('shell_water_normal_2');
    // materials.water[2].normalMap = NET_TEXTURES.texture('shell_water_normal_3');

    // materials.wetland[0].normalMap = NET_TEXTURES.texture('shell_water_normal_1');
    // materials.wetland[1].map = NET_TEXTURES.texture('shell_scrub_2');
    // materials.wetland[1].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
    // materials.wetland[1].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
    // materials.wetland[2].map = NET_TEXTURES.texture('shell_scrub_3');
    // materials.wetland[2].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
    // materials.wetland[2].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');

    // materials.forest[0].map = NET_TEXTURES.texture('shell_tree_0');
    materials.forest[0].map = texture('shell_tree_1');
    materials.forest[1].map = texture('shell_tree_2');
    materials.forest[2].map = texture('shell_tree_3');
    materials.forest[3].map = texture('shell_tree_4');

    materials.forest[1].normalMap = texture('shell_tree_normal');
    materials.forest[2].normalMap = texture('shell_tree_normal');
    materials.forest[3].normalMap = texture('shell_tree_normal');
    // materials.forest[2].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');
    // materials.forest[3].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');
    // materials.forest[4].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');

    // materials.scrub[0].map = NET_TEXTURES.texture('shell_tree_0');
    materials.scrub[0].map = texture('shell_scrub_2');
    materials.scrub[1].map = texture('shell_scrub_3');
    // materials.scrub[3].map = NET_TEXTURES.texture('shell_scrub_3');
    
    materials.scrub[0].normalMap = texture('shell_scrub_normal');
    materials.scrub[1].normalMap = texture('shell_scrub_normal');
    // materials.scrub[2].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
    // materials.scrub[3].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
    
    materials.rock[0].map = texture('shell_rock_1');
    materials.rock[0].normalMap = texture('shell_rock_normal');

    // materials.vineyard[0].map = NET_TEXTURES.texture('shell_vine_2');
    // materials.vineyard[1].map = NET_TEXTURES.texture('shell_vine_2');
    // materials.vineyard[2].map = NET_TEXTURES.texture('shell_vine_3');
    // materials.vineyard[3].map = NET_TEXTURES.texture('shell_vine_4');

    // materials.vineyard[1].normalMap = NET_TEXTURES.texture('shell_vine_normal');
    // materials.vineyard[2].normalMap = NET_TEXTURES.texture('shell_vine_normal');
    // materials.vineyard[3].normalMap = NET_TEXTURES.texture('shell_vine_normal');
    // materials.vineyard[1].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
    // materials.vineyard[2].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
    // materials.vineyard[3].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
    
    // materials.grass[0].map = NET_TEXTURES.texture('shell_grass_1');
    // materials.grass[1].map = NET_TEXTURES.texture('shell_grass_2');
    
    // materials.grass[1].roughnessMap = NET_TEXTURES.texture('shell_grass_specular');
    // materials.grass[1].normalMap = NET_TEXTURES.texture('shell_grass_normal');

/*
    const shaderA = function (shader) {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            'vUv = (uvTransform * vec3(uv, 1)).xy;', 
            'float uTime = time + vUv.y;', 
            'vUv.x += time * 0.001;', 
            'vUv.y -= time * 0.001;', 
        ].join('\n'));
        materialAnimator.toto(shader);
    };

    const shaderB = function (shader) {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            'vUv = (uvTransform * vec3(uv, 1)).xy;', 
            'float uTime = time + vUv.y;', 
            'vUv.x -= time * 0.003;', 
            'vUv.y -= time * 0.001;', 
        ].join('\n'));
        materialAnimator.toto(shader);
    };

    const shaderC = function (shader) {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            'vUv = (uvTransform * vec3(uv, 1)).xy;', 
            'float uTime = time + vUv.y;', 
            'vUv.x += time * 0.005;', 
            'vUv.y += time * 0.002;', 
        ].join('\n'));
        materialAnimator.toto(shader);
    };
*/
    // materialAnimator.applyCustomShader(materials.water[0], shaderA);
    // materialAnimator.applyCustomShader(materials.water[1], shaderB);
    // materialAnimator.applyCustomShader(materials.water[2], shaderC);
    // GLOBE.addObjToUpdate(materialAnimator);

    api$i.isReady = true;
    api$i.evt.fireEvent('READY');
}

let knowIds = [];
const tileToLanduses = new Map();
const storedLanduses = new Map();
const typedMeshes = new Map();
let schdeduleNb = 0;
const rejectedIds = [];
const tilesUnderLinks = new Map();

const api$j = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = api$h.extractNodes(parsedJson);
        const waysList = api$h.extractWays(parsedJson);
        tileToLanduses.set(_tile.key, []);
        const extractedRelations = extractElements(parsedJson, 'relation', _tile.zoom);
        const extractedWays = extractElements(parsedJson, 'way', _tile.zoom);
        registerDatas$1(_tile.key, extractedRelations);
        registerDatas$1(_tile.key, extractedWays);
        let landuseAdded = 0;
        landuseAdded += prepareLanduse(_tile, extractedRelations, buildRelation, nodesList, waysList);
        landuseAdded += prepareLanduse(_tile, extractedWays, buildWay, nodesList, waysList);
        if (landuseAdded > 0) scheduleDraw();
    }, 

    tileRemoved : function(_tileKey) {
        if (!tileToLanduses.get(_tileKey)) return false;
        tileToLanduses.get(_tileKey)
        .forEach(landuseId => {
            const stored = storedLanduses.get(landuseId);
            if (!stored) return false;
            stored.refNb --;
            if (stored.refNb > 0) return;
            forgotLanduse(landuseId);
            deleteLanduseGeometry(stored.id, stored.type);
            storedLanduses.delete(landuseId);
            const zoom = 13;
            const bbox = calcBbox(stored.buildDatas.border);
            const tileA = api$8.coordsToTile(bbox.minLon, bbox.minLat, zoom);
            const tileB = api$8.coordsToTile(bbox.maxLon, bbox.maxLat, zoom);
            for (let x = tileA.x; x <= tileB.x; x ++) {
                for (let y = tileB.y; y <= tileA.y; y ++) {
                    const tile = api$a.tileFromXYZ(x, y, zoom);
                    if (!tile) continue;
                    const extension = tile.extensions.get('LANDUSE');
                    if (!extension) continue;
                    extension.removeLanduse(landuseId);
                }
            }
        });
        tileToLanduses.delete(_tileKey);
        scheduleDraw();
    }
};

function registerDatas$1(_tileKey, _extractedDatas) {
    const curTileLinks = tileToLanduses.get(_tileKey);
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuse = _extractedDatas[i];
        curTileLinks.push(landuse.id);
        if (!isLanduseKnowed(landuse.id)) continue;
        storedLanduses.get(landuse.id).refNb ++;
    }
}

function scheduleDraw() {
    if (schdeduleNb > 0) return false;
    schdeduleNb ++;
    setTimeout(redrawMeshes, 1000);
}

function prepareLanduse(_tile, _extractedDatas, _buildFunction, _nodesList, _waysList) {
    let landuseAdded = 0;
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const landuseDatas = _extractedDatas[i];
        if (rejectedIds.includes(landuseDatas.id)) {
            console.log('ID rejecte, pass');
            continue;
        }
        if (isLanduseKnowed(landuseDatas.id)) {
            continue;
        }
        const landuseBuilded = _buildFunction(landuseDatas, _nodesList, _waysList);
        if (!landuseBuilded) {
            rejectedIds.push(landuseDatas.id);
            continue;
        }
        if (landuseBuilded.border.length > 10000) {
            console.log('Too big, pass');
            continue;
        }
        if (!buildLanduse(landuseBuilded, _tile)) {
            continue;
        }
        knowIds.push(landuseDatas.id);
        storedLanduses.set(landuseBuilded.id, {
            id : landuseBuilded.id, 
            type : landuseBuilded.type, 
            refNb : 1, 
            buildDatas : landuseBuilded, 
        });
        landuseAdded ++;
    }
    return landuseAdded;
}

function buildLanduse(_landuse, _tile) {
    const trianglesResult = triangulate$1(_landuse);
    if (trianglesResult === null) return false;
    const layerInfos = getLayerInfos(_landuse.type);
    const elevationsDatas = getElevationsDatas(_landuse);
    const layersBuffers = buildLanduseGeometry(_landuse, layerInfos, trianglesResult, elevationsDatas, _tile);
    saveLanduseGeometries(_landuse, layersBuffers);
    return true;
}

function saveLanduseGeometries(_landuse, _geometries) {
    const type = _landuse.type;
    if (!typedMeshes.get(type)) {
        const layerInfos = getLayerInfos(type);
        const meshes = new Array(layerInfos.materialNb);
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = new Mesh(new BufferGeometry(), api$i.material(type)[l]);
            mesh.receiveShadow = true;
            meshes[l] = mesh;
        }
        typedMeshes.set(type, {
            meshes : meshes, 
            list : [], 
        });
    }
    const layerInfos = getLayerInfos(type);
    if (layerInfos.hideTile) {
        searchTilesUnderLanduse(_landuse);
    }
    typedMeshes.get(type).list.push({
        id : _landuse.id, 
        geometries : _geometries, 
    });
}

function searchTilesUnderLanduse(_landuse) {
    const myLanduse = {
        id : _landuse.id, 
        type : _landuse.type, 
        border : _landuse.border, 
        holes : _landuse.holes, 
    };
    const zoom = 13;
    const bbox = calcBbox(_landuse.border);
    const tileA = api$8.coordsToTile(bbox.minLon, bbox.minLat, zoom);
    const tileB = api$8.coordsToTile(bbox.maxLon, bbox.maxLat, zoom);
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            const tile = api$a.tileFromXYZ(x, y, zoom);
            if (!tile) continue;
            const map = new Map();
            map.set(_landuse.id, myLanduse);
            // tile.setLanduses(map);
            const extension = tile.extensions.get('LANDUSE');
            if (!extension) continue;
            extension.setLanduses(map);
        }
    }
}

function redrawMeshes() {
    for (let [type, curTyped] of typedMeshes) {
        const layerInfos = getLayerInfos(type);
        for (let l = 0; l < layerInfos.materialNb; l ++) {
            const mesh = curTyped.meshes[l];
            api$a.removeMeshe(mesh);
            mesh.geometry.dispose();
            const datasGeometries = [];
            for (let g = 0; g < curTyped.list.length; g ++) {
                datasGeometries.push(curTyped.list[g].geometries[l]);
            }
            if (!datasGeometries.length) continue;
            mesh.geometry = BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
            api$a.addMeshe(mesh);
        }
    }
    schdeduleNb --;
    api.MUST_RENDER = true;
}

function deleteLanduseGeometry(_id, _type) {
    const curTypedGeos = typedMeshes.get(_type); 
    for (let i = 0; i < curTypedGeos.list.length; i ++) {
        if (curTypedGeos.list[i].id != _id) continue;
        curTypedGeos.list[i].geometries.forEach(geo => geo.dispose());
        curTypedGeos.list.splice(i, 1);
        break;
    }
    if (curTypedGeos.list.length == 0) {
        curTypedGeos.meshes.forEach(mesh => api$a.removeMeshe(mesh));
    }
}


function calcBbox(_border) {
    const lon = _border.map(point => point[0]);
    const lat = _border.map(point => point[1]);
    return {
        minLon : Math.min(...lon), 
        maxLon : Math.max(...lon), 
        minLat : Math.min(...lat), 
        maxLat : Math.max(...lat), 
    }
}

function coordGrid(_bbox, _border) {
    const zoom = 15;
    const tileA = api$8.coordsToTile(_bbox.minLon, _bbox.minLat, zoom);
    const tileB = api$8.coordsToTile(_bbox.maxLon, _bbox.maxLat, zoom);
    const tilesPos = [];
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            tilesPos.push([x, y]);
        }
    }
    const grid = [];
    const def = api$a.tilesDefinition;
    for (let i = 0; i < tilesPos.length; i ++) {
        const tilePos = tilesPos[i];
        const startCoord = api$8.tileToCoordsVect(tilePos[0], tilePos[1], zoom);
        const endCoord = api$8.tileToCoordsVect(tilePos[0] + 1, tilePos[1] + 1, zoom);
		const stepCoordX = (endCoord.x - startCoord.x) / def;
		const stepCoordY = (endCoord.y - startCoord.y) / def;
		for (let x = 0; x < def; x ++) {
			for (let y = 0; y < def; y ++) {
                const coord = [
					startCoord.x + (stepCoordX * x), 
					startCoord.y + (stepCoordY * y)
				];
                if (pointIntoPolygon(coord, _border)) grid.push(coord);
			}
		}
    }
    return grid;
}

function triangulate$1(_landuse) {
    let nbPoints = 0;
    const border = new Array(_landuse.border.length);
    for (let i = 0; i < _landuse.border.length; i ++) {
        border[i] = new Point(_landuse.border[i][0], _landuse.border[i][1], i + nbPoints);
    }
    try {
        const swctx = new SweepContext(border);
        nbPoints += _landuse.border.length;
        _landuse.holes.forEach(hole => {
            const swcHole = hole.map((p, i) => new Point(p[0], p[1], i + nbPoints));
            swctx.addHole(swcHole);
            nbPoints += hole.length;
        });
        for (let i = 0; i < _landuse.fillPoints.length; i ++) {
            const point = _landuse.fillPoints[i];
            swctx.addPoint(new Point(point[0], point[1], i + nbPoints));
        }
        nbPoints += _landuse.fillPoints.length;
        swctx.triangulate();
        return swctx.getTriangles();
    } catch (error) {
        console.warn('Error on landuse', _landuse.id, error);
        console.log('_landuse', _landuse);
        rejectedIds.push(_landuse.id);
        return null;
    }
}

function getElevationsDatas(_landuse) {
    const elevationsBorder = new Array(_landuse.border.length);
    for (let i = 0; i < _landuse.border.length; i ++) {
        const point = _landuse.border[i];
        elevationsBorder[i] = api$9.get(point[0], point[1]);
    }
    const elevationsHoles = [];
    for (let i = 0; i < _landuse.holes.length; i ++) {
        const hole = _landuse.holes[i];
        const holeElevations = new Array(hole.length);
        for (let h = 0; h < hole.length; h ++) {
            const point = hole[h];
            holeElevations[h] = api$9.get(point[0], point[1]);
        }
        elevationsHoles.push(holeElevations);
    }
    const elevationsFill = new Array(_landuse.fillPoints.length);
    for (let i = 0; i < _landuse.fillPoints.length; i ++) {
        const point = _landuse.fillPoints[i];
        elevationsFill[i] = api$9.get(point[0], point[1]);
    }
    return {
        border : elevationsBorder, 
        holes : elevationsHoles, 
        fill : elevationsFill, 
    }
}

function buildRelation(_relation, _nodesList, _waysList) {
    const innersCoords = [];
    for (let i = 0; i < _relation.members.length; i ++) {
        const member = _relation.members[i];
        if (member.role != 'inner') continue;
        const memberNodesIds = _waysList.get('WAY_' + member.ref).nodes;
        const memberNodes = [];
        for (let j = 0; j < memberNodesIds.length; j ++) {
            memberNodes.push(_nodesList.get('NODE_' + memberNodesIds[j]));
        }
        memberNodes.pop();
        innersCoords.push(memberNodes);
    }
    const wayNodes = [];
    for (let i = 0; i < _relation.members.length; i ++) {
        const member = _relation.members[i];
        if (member.role != 'outer') continue;
        const memberNodesIds = _waysList.get('WAY_' + member.ref).nodes;
        for (let j = 1; j < memberNodesIds.length - 1; j ++) {
            wayNodes.push(_nodesList.get('NODE_' + memberNodesIds[j]));
        }
    }
    if (wayNodes.length > 10000) {
        console.log('wayNodes too long', wayNodes.length);
        return null;
    }
    const border = wayNodes.slice(1);
    const bbox = calcBbox(border);
    const grid = coordGrid(bbox, border);
    return {
        id : _relation.id, 
        type : extractType(_relation), 
        border : border, 
        fillPoints : grid, 
        holes : innersCoords, 
    };
}

function buildWay(_way, _nodesList) {
    let wayNodes = _way.nodes.map(nodeId => _nodesList.get('NODE_' + nodeId));
    const border = wayNodes.slice(1);
    const bbox = calcBbox(border);
    const grid = coordGrid(bbox, border);
    return {
        id : _way.id, 
        type : extractType(_way), 
        border : border, 
        fillPoints : grid, 
        holes : [], 
    };
}

function isLanduseKnowed(_id) {
    return knowIds.includes(_id);
}

function forgotLanduse(_landuseId) {
    knowIds = knowIds.filter(id => id != _landuseId);
    const toDelete = [];
    for (let [key, values] of tilesUnderLinks) {
        for (let i = 0; i < values.datas.length; i ++) {
            const datas = values.datas[i];
            if (datas.id != _landuseId) continue;
            values.datas.splice(i, 1);
            break;
        }
        if (values.datas.length) continue;
        toDelete.push(key);
        const tile = api$a.tileFromXYZ(values.x, values.y, values.z);
        if (!tile) continue;
        console.log('A');
        const extension = tile.extensions.get('LANDUSE');
        extension.removeLanduse(_landuseId);
    }
    for (let i = 0; i < toDelete.length; i ++) {
        tilesUnderLinks.delete(toDelete[i]);
    }
}

function extractElements(_datas, _type, _zoom) {
    return api$h.extractElements(_datas, _type)
    .filter(e => e.tags)
    .filter(e => isTagSupported(e, _zoom));
}

function isTagSupported(_element, _zoom) {
    const type = extractType(_element);
    if (!type) return false;
    if (_zoom != tagsZoom[type]) return false;
	return true;
}

function extractType(_element) {
    let elementType = null;
    supportedTags.forEach(tag => {
        if (!_element.tags[tag.key]) return false;
        tag.values.forEach(value => {
            if (_element.tags[tag.key] == value) {
                elementType = value;
                return null;
            }
            return null;
        });
    });
    if (equalsTags[elementType]) return equalsTags[elementType];
	return elementType;
}

function pointIntoPolygon(point, vs) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
function getLayerInfos(_type) {
    let nbLayers = 16;
    let materialNb = 4;
    let uvFactor = 1;
    let meterBetweenLayers = 1.5;
    let groundOffset = 0;
    let hideTile = false;
    let vertexColor = false;

    if (_type == 'forest') {
        meterBetweenLayers = 1;
        nbLayers = 16;
        materialNb = 4;
        uvFactor = 12;
        vertexColor = true;
        hideTile = true;
    }
    if (_type == 'water') {
        meterBetweenLayers = 0.5;
        uvFactor = 2;
        materialNb = 3;
        nbLayers = 3;
        groundOffset = -1;
        // hideTile = true;
    }
    if (_type == 'wetland') {
        meterBetweenLayers = 0.2;
        uvFactor = 3;
        materialNb = 3;
        nbLayers = 6;
        groundOffset = 0.0;
    }
    if (_type == 'grass') {
        meterBetweenLayers = 0.1;
        uvFactor = 3;
        materialNb = 2;
        nbLayers = 8;
    }
    if (_type == 'scrub') {
        meterBetweenLayers = 0.7;
        groundOffset = 0.2;
        uvFactor = 8;
        materialNb = 2;
        nbLayers = 8;
        vertexColor = true;
        hideTile = true;
    }
    if (_type == 'rock') {
        meterBetweenLayers = 0.6;
        // uvFactor = 2;
        uvFactor = 8;
        materialNb = 1;
        nbLayers = 2;
        groundOffset = 1;
    }
    if (_type == 'vineyard') {
        meterBetweenLayers = 0.4;
        uvFactor = 16;
        materialNb = 4;
        nbLayers = 12;
    }
    return {
        meterBetweenLayers : meterBetweenLayers, 
        uvFactor : uvFactor, 
        nbLayers : nbLayers, 
        groundOffset : groundOffset, 
        hideTile : hideTile, 
        materialNb : materialNb, 
        layersByMap : nbLayers / materialNb, 
        vertexColor : vertexColor, 
    }
}

const equalsTags = {
    wood : 'forest', 
    farmyard : 'grass', 
    farmland : 'grass', 
    grassland : 'grass', 
    orchard : 'grass', 
    meadow : 'grass', 
    greenfield : 'grass', 
    village_green : 'grass', 
    bare_rock : 'rock', 
    scree : 'rock', 
    basin : 'water', 
    riverbank : 'water', 
};

const tagsZoom = {
    forest : 13, 
    scrub : 13, 
    vineyard : 16, 
    grass : 17, 
    rock : 13, 
    water : 15, 
    wetland : 15, 
};

const supportedTags = [
    {
        key : 'landuse', 
        values : [
            'forest', 
            'wood', 
            // 'vineyard', 
            'scrub',
            
            // 'basin', 
            
            // 'grass', 
            // 'farmyard', 
            // 'farmland', 
            // 'grassland', 
            // 'orchard', 
            // 'meadow', 
            // 'greenfield', 
            // 'village_green', 
        ]
    }, 
    {
        key : 'natural', 
        values : [
            'forest', 
            'wood', 
            // 'vineyard', 
            'scrub', 
            'bare_rock', 
            // 'water', 
            // 'wetland', 
            
            'scree', 
            // 'grass', 
            // 'farmyard', 
            // 'farmland', 
            // 'grassland', 
            // 'orchard', 
            // 'meadow', 
            // 'greenfield', 
            // 'village_green', 
        ], 
    }, 
    // {
    //     key : 'waterway', 
    //     values : [
    //         'riverbank', 
    //     ], 
    // }, 
];

const PARAMS$4 = {
	nbLoaders : 1, 
	useCache : true, 
};

let API_URL$4 = '';

function setApiUrl$4(_url) {
	API_URL$4 = _url;
}

class LoaderLanduse {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = API_URL$4 + '&z=' + _params.z + '&x=' + _params.x + '&y=' + _params.y;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text));
	}
	
	onDataLoadSuccess(_data) {
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

registerLoader('LANDUSE', LoaderLanduse, PARAMS$4);
const loader$4 = new Loader('LANDUSE');

const canvasFinal = document.createElement('canvas');
canvasFinal.width = mapSize;
canvasFinal.height = mapSize;
const contextFinal = canvasFinal.getContext("2d");

const canvasTypes = new Map();
canvasTypes.set('forest', createCanvas(mapSize));
canvasTypes.set('scrub', createCanvas(mapSize));

const splatSize = 16;

const linePatterns = new Map();
linePatterns.set('forest', {
    canvas : createCanvas(splatSize), 
    minFactor : 0.2, 
    maxFactor : 0.8, 
});
linePatterns.set('scrub', {
    canvas : createCanvas(splatSize), 
    minFactor : 0.2, 
    maxFactor : 0.5, 
});

const groundImage = {
    forest : null, 
    scrub : null, 
};

api$i.evt.addEventListener('READY', null, onMaterialReady);

function onMaterialReady() {
    api$i.evt.removeEventListener('READY', null, onMaterialReady);
    groundImage.forest = texture('shell_tree_0').image; 
    groundImage.scrub = texture('shell_scrub_1').image;

    let contextLine;
    contextLine = linePatterns.get('forest').canvas.getContext('2d');
    contextLine.drawImage(texture('landuse_border_forest').image, 0, 0);
    contextLine = linePatterns.get('scrub').canvas.getContext('2d');
    contextLine.drawImage(texture('landuse_border_scrub').image, 0, 0);
}

const typedDatas = {
    forest : {
        borders : [], 
        holes : [], 
    }, 
    scrub : {
        borders : [], 
        holes : [], 
    }, 
};

function clearTypedDatas() {
    typedDatas.forest.borders.length = 0;
    typedDatas.forest.holes.length = 0;
    typedDatas.scrub.borders.length = 0;
    typedDatas.scrub.holes.length = 0;
}

const api$k = {
  
	draw : function(_landuses, _tileBBox, _zoom) {
        const sizeFactor = getSizeFactor(_zoom);
        contextFinal.clearRect(0, 0, mapSize, mapSize);
        if (!_landuses.size) return canvasFinal;
        clearTypedDatas();
        
        _landuses.forEach(curLanduse => {
            if (!curLanduse.bordersSplit.length) {
                return false;
            }
            convertCoordToCanvasPositions(curLanduse.bordersSplit, typedDatas[curLanduse.type].borders, _tileBBox);
            convertCoordToCanvasPositions(curLanduse.holesSplit, typedDatas[curLanduse.type].holes, _tileBBox);
        });

        for (let type in typedDatas) {
            const linePattern = linePatterns.get(type);
            const datas = typedDatas[type];
            const canvasTemp = canvasTypes.get(type);
            const contextTemp = canvasTemp.getContext('2d');
            contextTemp.clearRect(0, 0, mapSize, mapSize);

            for (let i = 0; i < datas.borders.length; i ++) {
                const coords = datas.borders[i];
                contextTemp.globalCompositeOperation = 'source-over';
                drawLineImage(linePattern, coords, contextTemp, sizeFactor);
                drawCanvasShape(coords, contextTemp, '#ffffff');
            }
            for (let i = 0; i < datas.holes.length; i ++) {
                const coords = datas.holes[i];
                contextTemp.globalCompositeOperation = 'destination-out';
                drawCanvasShape(coords, contextTemp, '#ffffff');
                contextTemp.globalCompositeOperation = 'source-over';
                drawLineImage(linePattern, coords, contextTemp, sizeFactor);
            }
            contextTemp.globalCompositeOperation = 'source-in';
            contextTemp.fillStyle = contextTemp.createPattern(groundImage[type], 'repeat');
            contextTemp.fillRect(0, 0, mapSize, mapSize);
            contextFinal.drawImage(canvasTemp, 0, 0);
        }

        return canvasFinal;
    }, 

};

function getSizeFactor(_zoom) {
    const zoomDiff = _zoom - 13;
    return zoomDiff * 0.5;
}

function convertCoordToCanvasPositions(_coords, _res, _tileBox) {
  for (let s = 0; s < _coords.length; s ++) {
    _res.push(api$8.coordToCanvas(_tileBox, mapSize, _coords[s]));
  }
}

function createCanvas(_size) {
    const canvas = document.createElement('canvas');
    canvas.width = _size;
    canvas.height = _size;
    return canvas;
  }
  

function drawLineImage(_linePattern, _coords, _context, _sizeFactor) {
  const splatSpace = 6;
  let lastPoint = _coords[0];
  for (let i = 1; i < _coords.length; i ++) {
    const point = _coords[i];
    const angle = Math.atan2(point[1] - lastPoint[1], point[0] - lastPoint[0]);
    const distance = Math.sqrt(Math.pow(lastPoint[0] - point[0], 2) + Math.pow(lastPoint[1] - point[1], 2));
    const nbDraw = Math.ceil(distance / splatSpace);
    const stepX = Math.cos(angle) * splatSpace;
    const stepY = Math.sin(angle) * splatSpace;
    for (let d = 0; d < nbDraw; d ++) {
        const rotation = Math.random() * 6;
        const scale = (_linePattern.minFactor + Math.random() * _linePattern.maxFactor) * _sizeFactor;
        const dX = lastPoint[0] + stepX * d;
        const dY = lastPoint[1] + stepY * d;
        _context.save();
        _context.translate(dX, dY);
        _context.rotate(rotation);
        _context.scale(scale, scale);
        _context.drawImage(_linePattern.canvas, -splatSize / 2, -splatSize / 2);
        _context.restore();
      }
      lastPoint = point;
    }
}

function drawCanvasShape(_coords, _context, _color) {
    const start = _coords[0];
    _context.beginPath();
    _context.fillStyle = _color;
        _context.moveTo(start[0], start[1]);
        for (let i = 1; i < _coords.length; i ++) {
            _context.lineTo(_coords[i][0], _coords[i][1]);
        }
    _context.closePath();
    _context.fill('evenodd');
}

function extensionClass$4() {
	return LanduseExtension;
}

class LanduseExtension {
	constructor(_tile) {
		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;

        this.shapes = new Map();
        this.scheduleNb = 0;
        this.canvas = null;
        /*
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
		const canvasSize = 256;
		this.canvas.width = canvasSize;
		this.canvas.height = canvasSize;
        this.tile.extensionsMaps.set(this.id, this.canvas);
        */

        this.isActive = this.tile.zoom >= 13;
        if (api$i.isReady) {
            this.onMaterialReady();
        } else {
            api$i.evt.addEventListener('READY', this, this.onMaterialReady);
        }
    }

    onMaterialReady() {
        api$i.evt.removeEventListener('READY', this, this.onMaterialReady);
        this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
        this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
        this.tile.evt.addEventListener('ADD_CHILDRENS', this, this.onTileSplit);
        if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		loader$4.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onLanduseLoaded(_datas)
		);
    }
    
    onLanduseLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        api$j.setDatas(_datas, this.tile);
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader$4.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
        this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.tile.evt.removeEventListener('ADD_CHILDRENS', this, this.onTileSplit);
        // this.tile.extensionsMaps.delete(this.id);

        if (this.canvas) {
            this.tile.extensionsMaps.delete(this.id);
            this.drawCanvas();
            this.context = null;
            this.canvas = null;
        }


        // this.drawCanvas();
        // if (!this.isActive) return false;
        api$j.tileRemoved(this.tile.key);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
        this.shapes.clear();
		api.MUST_RENDER = true;
    }
    


    initCanvas() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
		this.canvas.width = mapSize;
		this.canvas.height = mapSize;
        this.tile.extensionsMaps.set(this.id, this.canvas);
    }


    scheduleDraw() {
        if (this.scheduleNb > 0) return false;
        this.scheduleNb ++;
        setTimeout(() => this.drawCanvas(), 1000);
    }

    drawCanvas() {
        this.scheduleNb --;
        if (!this.tile) return false
        this.context.clearRect(0, 0, 256, 256);
        this.context.drawImage(api$k.draw(this.shapes, this.tile.bbox, this.tile.zoom), 0, 0);
        this.tile.redrawDiffuse();
    }


    removeLanduse(_landuseId) {
        if (!this.tile) return false;
        if (!this.shapes.has(_landuseId)) return false;
		this.shapes.delete(_landuseId);
		this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.removeLanduse(_landuseId);
		}
	}

    onTileSplit() {
        for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
			extension.setLanduses(this.shapes);
		}
    }

    setLanduses(_landuses) {
		if (!this.splitLanduses(_landuses)) return false;
		this.initCanvas();
		this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.setLanduses(this.shapes);
		}
	}

	splitLanduses(_landuses) {
        let addNb = 0;
		const box = [
			[this.tile.startCoord.x, this.tile.endCoord.y], 
			[this.tile.endCoord.x, this.tile.endCoord.y], 
			[this.tile.endCoord.x, this.tile.startCoord.y], 
			[this.tile.startCoord.x, this.tile.startCoord.y], 
			[this.tile.startCoord.x, this.tile.endCoord.y], 
		];
		_landuses.forEach(curLanduse => {
			if (this.shapes.has(curLanduse.id)) return false;
			const myLanduse = {
				id : curLanduse.id, 
				type : curLanduse.type, 
				border : curLanduse.border, 
				bordersSplit : [], 
				holes : curLanduse.holes, 
				holesSplit : [], 
			};
			const shapesBorder = PolygonClipping.intersection([box], [curLanduse.border]);
			for (let s = 0; s < shapesBorder.length; s ++) {
                myLanduse.bordersSplit.push(shapesBorder[s][0]);
            }
            if (myLanduse.bordersSplit.length == 0) {
                return false;
            }
			const shapesHoles = PolygonClipping.intersection([box], curLanduse.holes);
			for (let s = 0; s < shapesHoles.length; s ++) {
                myLanduse.holesSplit.push(shapesHoles[s][0]);
            }
			this.shapes.set(curLanduse.id, myLanduse);
            addNb ++;
        });
        return addNb;
	}
}

const PARAMS$5 = {
	nbLoaders : 4, 
	useCache : false, 
};

let API_URL$5 = '';

function setApiUrl$5(_url) {
	API_URL$5 = _url;
}

class LoaderSatellite {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
		this.textureLoader = new TextureLoader();
	}

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		var loader = this;
		this.textureLoader.load(API_URL$5 + '&z='+this.params.z+'&x='+this.params.x+'&y='+this.params.y, 
			_texture => loader.onDataLoadSuccess(_texture), 
			xhr => {},
			xhr => loader.onDataLoadError()
		);
	}
	
	onDataLoadSuccess(_data) {
		this.isLoading = false;
		this.callback(_data, this.params);
	}
	
	onDataLoadError() {
		this.isLoading = false;
		console.warn( 'LoaderSatellite error', this.params);
		this.callback(null);
	}
}

registerLoader('SATELLITE', LoaderSatellite, PARAMS$5);
const loader$5 = new Loader('SATELLITE');

function extensionClass$5() {
	return SatelliteExtension;
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_TILE2D', null, onActivateTile2D);

function onActivateTile2D() {
    desactivate('SATELLITE');
}

class SatelliteExtension {
	constructor(_tile) {
		this.id = 'SATELLITE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		if (this.dataLoaded) {
            this.tile.setTexture(this.texture);
            return true;
        }
		if (this.dataLoading) return false;
		this.dataLoading = true;
		loader$5.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onMapLoaded(_datas)
		);
    }
    
    onMapLoaded(_datas) {
        this.texture = _datas;
		this.dataLoading = false;
        this.dataLoaded = true;
        if (!this.tile) return false;
		if (!this.tile.isReady) return false;
		this.tile.setTexture(this.texture);
	}
	
	onTileDispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader$5.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.hide();
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.removeEventListener('HIDE', this, this.hide);
		if (this.texture) this.texture.dispose();
        this.texture = null;
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile.unsetTexture();
		this.tile = null;
		api.MUST_RENDER = true;
	}
	
}

const PARAMS$6 = {
	nbLoaders : 1, 
	useCache : true, 
};

let API_URL$6 = '';

function setApiUrl$6(_url) {
	API_URL$6 = _url;
}

class NodeLoader {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = API_URL$6 + '&z=' + _params.z + '&x=' + _params.x + '&y=' + _params.y;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text));
	}
	
	onDataLoadSuccess(_data) {
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

registerLoader('NODE', NodeLoader, PARAMS$6);
const loader$6 = new Loader('NODE');

evt.addEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateNodes$1);

const api$l = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials$1[_type];
    }, 
};

const materials$1 = {
    bench : null, 
    street_lamp : null, 
    tower : null, 
    tree : null, 
};

function onActivateNodes$1() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateNodes$1);
    createMaterials$2();
    loadTextures$2();
}

function createMaterials$2() {
    materials$1.bench = new MeshPhysicalMaterial({roughness:0.9,metalness:0, color:0x544d42}), 
    materials$1.street_lamp = new MeshPhysicalMaterial({roughness:0.5,metalness:0.5, color:0x303030}), 
    materials$1.tower = new MeshPhysicalMaterial({roughness:0.5,metalness:0, color:0xdddddd, side:DoubleSide, transparent:true, alphaTest:0.1}), 
    materials$1.tree = new MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xffffff});
}

function loadTextures$2() {
    const texturesList = [
        {
            id : 'tree_leaves', 
            url : 'tree_leaves.png', 
        }, 
        {
            id : 'pylone', 
            url : 'pylone_diffuse.png', 
        }, 
    ];
    loadBatch(texturesList, onTexturesLoaded$2);
}

function onTexturesLoaded$2() {
    materials$1.tree.map = texture('tree_leaves');
    materials$1.tower.map = texture('pylone');
    console.log('Nodes TEXTURES_LOADED');
    api$l.isReady = true;
    api$l.evt.fireEvent('READY');
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateExtension$3);

const modelsToLoad$1 = [
    ['tower', 'pylone.json'], 
    ['tree_needles', 'tree_needles.json'], 
    ['tree_leaves', 'tree_leaves.json'], 
    ['bench', 'bench.json'], 
    ['street_lamp', 'lamp.json'], 
];

const api$m = {
    evt : new Evt(), 
    isReady : false, 

    get : function(_node) {
        let type = _node.type;
        if (type == 'tree') {
            type = getTreeModel(_node.props);
            // console.log('tree', type);
        }
        const geometry = get$1(type).geometry.clone();
        applyTransformation$1(_node, geometry);
        return geometry;
    }
};

function getTreeModel(_props) {
    if (_props.diameter_crown) console.log('_props.diameter_crown', _props.diameter_crown);
    if (!_props.leaf_type) return 'tree_leaves';
    if (_props.leaf_type == 'needleleaved') return 'tree_needles';
    return 'tree_leaves';
}

function applyTransformation$1(_node, _geometrie) {
    const scale = new Vector3(1, 1, 1);
    if (_node.props.circumference) {
        scale.x = _node.props.circumference;
        scale.z = _node.props.circumference;
    }
    const minHeight = _node.props.min_height || 0;
    if (_node.props.height) {
        scale.y = (_node.props.height - minHeight) / 5;
    }
    _geometrie.scale(scale.x, scale.y, scale.z);
    _geometrie.rotateY(Math.random() * 6);
}

function onActivateExtension$3() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_NODE', null, onActivateExtension$3);
    loadModels$1();
}

function loadModels$1() {
    const modelsList = [];
    modelsToLoad$1.forEach(d => addToList$1(modelsList, d[0], d[1]));
    loadBatch$1(modelsList, onModelsLoaded$1);
}

function onModelsLoaded$1() {
    console.log('Nodes MODELS LOADED');
    api$m.isReady = true;
    api$m.evt.fireEvent('READY');
}

function extensionClass$6() {
	return NodeExtension;
}

class NodeExtension {
	constructor(_tile) {
		this.id = 'NODE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.meshes = {};
        this.mesh = null;

        if (api$l.isReady && api$m.isReady) {
            this.onRessourcesLoaded();
        }
        if (!api$l.isReady) {
            api$l.evt.addEventListener('READY', this, this.onTexturesReady);
        }
        if (!api$m.isReady) {
            api$m.evt.addEventListener('READY', this, this.onModelsReady);
        }
    }

    onTexturesReady() {
        api$l.evt.removeEventListener('READY', this, this.onTexturesReady);
        this.onRessourcesLoaded();
    }
    
    onModelsReady() {
        api$m.evt.removeEventListener('READY', this, this.onModelsReady);
        this.onRessourcesLoaded();
    }

    onRessourcesLoaded() {
        if (!api$l.isReady) return false;
        if (!api$m.isReady) return false;
        this.isActive = this.tile.zoom == 15;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		loader$6.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onNodesLoaded(_datas)
		);
    }
    
    onNodesLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        const parsedJson = JSON.parse(_datas);
        const nodes = prepareNodesDatas(parsedJson);
        if (!nodes.length) return false;
        this.drawNodes(nodes);
    }

    drawNodes(_nodes) {
        const typedGeometries = {};
        _nodes.forEach(node => {
            if (!typedGeometries[node.type]) typedGeometries[node.type] = [];
            const model = api$m.get(node);
            const elevation = api$9.get(node.coord[0], node.coord[1]);
            const pos = api$a.coordToXYZ(
                node.coord[0], 
                node.coord[1], 
                elevation
            );
            const verticesBuffer = model.getAttribute('position');
            let verticeId = 0;
            let len = verticesBuffer.array.length / 3;
            for (let v = 0; v < len; v ++) {
                verticesBuffer.array[verticeId + 0] += pos.x;
                verticesBuffer.array[verticeId + 1] += pos.y;
                verticesBuffer.array[verticeId + 2] += pos.z;
                verticeId += 3;
            }
            if (!model) console.warn('Model NULL', node);
            typedGeometries[node.type].push(model);
        });
        Object.keys(typedGeometries).forEach(type => {
            const mergedGeometrie = BufferGeometryUtils.mergeBufferGeometries(typedGeometries[type]);
            this.meshes[type] = getMesh();
            this.meshes[type].geometry = mergedGeometrie;
            this.meshes[type].material = api$l.material(type);

            this.meshes[type].receiveShadow = true;
            this.meshes[type].castShadow = true;
            api$a.addMeshe(this.meshes[type]);
        });
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader$6.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        if (!this.isActive) return false;
        Object.keys(this.meshes).forEach(key => {
            this.meshes[key].geometry.dispose();
            api$a.removeMeshe(this.meshes[key]);
            storeMesh(this.meshes[key]);
            delete this.meshes[key];
        });
        this.meshes = null;
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		api.MUST_RENDER = true;
	}
}

function prepareNodesDatas(_datas) {
    const nodes = [];
    _datas.elements
    .filter(node => isTagSupported$1(node))
	.forEach(node => {
		nodes.push({
            id : node.id, 
            props : node.tags, 
            type : extractType$1(node), 
            coord : [
                parseFloat(node.lon), 
                parseFloat(node.lat)
            ], 
        });
    });
    return nodes;
}

function isTagSupported$1(_element) {
    if (extractType$1(_element)) return true;
	return false;
}

function extractType$1(_element) {
    let elementType = null;
    supportedTags$1.forEach(tag => {
        if (!_element.tags[tag.key]) return false;
        tag.values.forEach(value => {
            if (_element.tags[tag.key] == value) {
                elementType = value;
                return;
            }
            return;
        });
    });
    if (equalsTags$1[elementType]) return equalsTags$1[elementType];
	return elementType;
}

const equalsTags$1 = {
    pole : 'tower', 
    waste_basket : 'recycling', 
    waste_disposal : 'recycling', 
};

const supportedTags$1 = [
    {
        key : 'power', 
        values : [
            'tower', 
            // 'pole', 
        ]
    }, 
    
    {
        key : 'amenity', 
        values : [
            'bench', 
            // 'recycling', 
            // 'waste_basket', 
            // 'waste_disposal', 
        ], 
    }, 

    {
        key : 'highway', 
        values : [
            'street_lamp', 
        ], 
    }, 
    
    {
        key : 'natural', 
        values : [
            'tree', 
            // 'rock', 
        ], 
    }, 
];

// Cohen-Sutherland line clippign algorithm, adapted to efficiently
// handle polylines rather than just segments

function lineclip(points, bbox, result) {

    var len = points.length,
        codeA = bitCode(points[0], bbox),
        part = [],
        i, a, b, codeB, lastCode;

    if (!result) result = [];

    for (i = 1; i < len; i++) {
        a = points[i - 1];
        b = points[i];
        codeB = lastCode = bitCode(b, bbox);

        while (true) {

            if (!(codeA | codeB)) { // accept
                part.push(a);

                if (codeB !== lastCode) { // segment went outside
                    part.push(b);

                    if (i < len - 1) { // start a new line
                        result.push(part);
                        part = [];
                    }
                } else if (i === len - 1) {
                    part.push(b);
                }
                break;

            } else if (codeA & codeB) { // trivial reject
                break;

            } else if (codeA) { // a outside, intersect with clip edge
                a = intersect(a, b, codeA, bbox);
                codeA = bitCode(a, bbox);

            } else { // b outside
                b = intersect(a, b, codeB, bbox);
                codeB = bitCode(b, bbox);
            }
        }

        codeA = lastCode;
    }

    if (part.length) result.push(part);

    return result;
}

// intersect a segment against one of the 4 lines that make up the bbox

function intersect(a, b, edge, bbox) {
    return edge & 8 ? [a[0] + (b[0] - a[0]) * (bbox[3] - a[1]) / (b[1] - a[1]), bbox[3]] : // top
        edge & 4 ? [a[0] + (b[0] - a[0]) * (bbox[1] - a[1]) / (b[1] - a[1]), bbox[1]] : // bottom
        edge & 2 ? [bbox[2], a[1] + (b[1] - a[1]) * (bbox[2] - a[0]) / (b[0] - a[0])] : // right
        edge & 1 ? [bbox[0], a[1] + (b[1] - a[1]) * (bbox[0] - a[0]) / (b[0] - a[0])] : null; // left
}

// bit code reflects the point position relative to the bbox:

//         left  mid  right
//    top  1001  1000  1010
//    mid  0001  0000  0010
// bottom  0101  0100  0110

function bitCode(p, bbox) {
    var code = 0;

    if (p[0] < bbox[0]) code |= 1; // left
    else if (p[0] > bbox[2]) code |= 2; // right

    if (p[1] < bbox[1]) code |= 4; // bottom
    else if (p[1] > bbox[3]) code |= 8; // top

    return code;
}

const PARAMS$7 = {
	nbLoaders : 1, 
	useCache : false, 
};

let API_URL$7 = '';

function setApiUrl$7(_url) {
	API_URL$7 = _url;
}

class LinesLoader {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
		const url = API_URL$7 + '&z=' + _params.z + '&x=' + _params.x + '&y=' + _params.y;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text));
	}
	
	onDataLoadSuccess(_data) {
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

registerLoader('LINES', LinesLoader, PARAMS$7);
const loader$7 = new Loader('LINES');

evt.addEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension$4);

const texturesToLoad$1 = [
    ['fence', 'fence.png'], 
    ['wall', 'wall.png'], 
    ['path_texture', 'path_texture.png'], 
    ['vehicle', 'voiture-map.png'], 
];

const api$n = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials$2.get(_type);
    }, 

    textureBuffer : function() {
        return textureBuffer;
    }, 
};

const materials$2 = new Map();

let textureBuffer = null;
const canvasTexture = document.createElement('canvas');
canvasTexture.width = 16;
canvasTexture.height = 16;


function onActivateExtension$4() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension$4);
    createMaterials$3();
    loadTextures$3();
}

function createMaterials$3() {
    materials$2.set('fence', new MeshPhysicalMaterial({roughness:0.5,metalness:0.5, color:0xFFFFFF, side:DoubleSide, transparent:true, alphaTest:0.2}));
    materials$2.set('wall', new MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF}));
    materials$2.set('highway', new MeshPhysicalMaterial({roughness:1,metalness:0, color:0x0a1918}));
    materials$2.set('vehicle', new MeshPhysicalMaterial({roughness:0.2,metalness:0, color: 0xffffff}));
}

function loadTextures$3() {
    const texturesList = [];
    texturesToLoad$1.forEach(d => addToList(texturesList, d[0], d[1]));
    loadBatch(texturesList, onTexturesLoaded$3);
}

function onTexturesLoaded$3() {
    materials$2.get('fence').map = texture('fence');
    materials$2.get('wall').map = texture('wall');
    materials$2.get('vehicle').map = texture('vehicle');


    const context = canvasTexture.getContext('2d');
    context.drawImage(texture('path_texture').image, 0, 0);
    textureBuffer = context.getImageData(0, 0, 16, 16).data;


    api$n.isReady = true;
    api$n.evt.fireEvent('READY');
}

evt.addEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension$5);

const modelsToLoad$2 = [
    ['vehicle', 'voiture.json'], 
    // ['vehicle', 'voiture.glb'], 
];

const api$o = {
    evt : new Evt(), 
    isReady : false, 

    get : function(_model) {
        const geometry = get$1(_model).geometry.clone();
        applyTransformation$2( geometry);
        return geometry;
    }
};

function applyTransformation$2(_geometrie) {
    const scaleValue = 0.8;
    const scale = new Vector3(scaleValue, scaleValue, scaleValue);
    // const rotation = 0;
    _geometrie.scale(scale.x, scale.y, scale.z);
    // _geometrie.rotateY(rotation);
}

function onActivateExtension$5() {
    evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LINES', null, onActivateExtension$5);
    loadModels$2();
}

function loadModels$2() {
    const modelsList = [];
    modelsToLoad$2.forEach(d => addToList$1(modelsList, d[0], d[1]));
    loadBatch$1(modelsList, onModelsLoaded$2);
}

function onModelsLoaded$2() {
    console.log('Lines MODELS LOADED');
    api$o.isReady = true;
    api$o.evt.fireEvent('READY');
}

function buildGeometry(_line, _tile) {

    const elevationsDatas = getElevationsDatas$1(_line.border);

    const fullCoords = packCoordsWithElevation(_line.border, elevationsDatas);
    const verticesNb = fullCoords.length * 2;
    const bufferGeometry = new BufferGeometry();
    const bufferVertices = new Float32Array(verticesNb * 3);
    let verticeId = 0;
    verticeId = addVerticesToBuffer$1(verticeId, bufferVertices, fullCoords, -1);
    verticeId = addVerticesToBuffer$1(verticeId, bufferVertices, fullCoords, _line.props.height);
    const bufferUvs = new Float32Array(verticesNb * 2);
    let uvId = 0;
    uvId = addUvToBuffer$1(uvId, bufferUvs, fullCoords, 200000, _tile, 0);
    uvId = addUvToBuffer$1(uvId, bufferUvs, fullCoords, 200000, _tile, 1);
    const facesIndex = [];
    const layerOffset = fullCoords.length;
    for (let i = 0; i < fullCoords.length - 1; i ++) {
        facesIndex.push(i);
        facesIndex.push(i + 1);
        facesIndex.push(layerOffset + i);
        facesIndex.push(i + 1);
        facesIndex.push(layerOffset + i + 1);
        facesIndex.push(layerOffset + i);
    }
    const bufferFaces = Uint32Array.from(facesIndex);
    bufferGeometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
    bufferGeometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}

function earcut(data, holeIndices, dim) {

    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
        outerLen = hasHoles ? holeIndices[0] * dim : data.length,
        outerNode = linkedList(data, 0, outerLen, dim, true),
        triangles = [];

    if (!outerNode || outerNode.next === outerNode.prev) return triangles;

    var minX, minY, maxX, maxY, x, y, invSize;

    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
        minX = maxX = data[0];
        minY = maxY = data[1];

        for (var i = dim; i < outerLen; i += dim) {
            x = data[i];
            y = data[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
        // minX, minY and invSize are later used to transform coords into integers for z-order calculation
        invSize = Math.max(maxX - minX, maxY - minY);
        invSize = invSize !== 0 ? 1 / invSize : 0;
    }

    earcutLinked(outerNode, triangles, dim, minX, minY, invSize);

    return triangles;
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === (signedArea(data, start, end, dim) > 0)) {
        for (i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);
    } else {
        for (i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);
    }

    if (last && equals(last, last.next)) {
        removeNode(last);
        last = last.next;
    }

    return last;
}

// eliminate colinear or duplicate points
function filterPoints(start, end) {
    if (!start) return start;
    if (!end) end = start;

    var p = start,
        again;
    do {
        again = false;

        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
            removeNode(p);
            p = end = p.prev;
            if (p === p.next) break;
            again = true;

        } else {
            p = p.next;
        }
    } while (again || p !== end);

    return end;
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) return;

    // interlink polygon nodes in z-order
    if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

    var stop = ear,
        prev, next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;

        if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
            // cut off the triangle
            triangles.push(prev.i / dim);
            triangles.push(ear.i / dim);
            triangles.push(next.i / dim);

            removeNode(ear);

            // skipping the next vertex leads to less sliver triangles
            ear = next.next;
            stop = next.next;

            continue;
        }

        ear = next;

        // if we looped through the whole remaining polygon and can't find any more ears
        if (ear === stop) {
            // try filtering points and slicing again
            if (!pass) {
                earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);

            // if this didn't work, try curing all small self-intersections locally
            } else if (pass === 1) {
                ear = cureLocalIntersections(ear, triangles, dim);
                earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

            // as a last resort, try splitting the remaining polygon into two
            } else if (pass === 2) {
                splitEarcut(ear, triangles, dim, minX, minY, invSize);
            }

            break;
        }
    }
}

// check whether a polygon node forms a valid ear with adjacent nodes
function isEar(ear) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
        if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) return false;
        p = p.next;
    }

    return true;
}

function isEarHashed(ear, minX, minY, invSize) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
        minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
        maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
        maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

    // z-order range for the current triangle bbox;
    var minZ = zOrder(minTX, minTY, minX, minY, invSize),
        maxZ = zOrder(maxTX, maxTY, minX, minY, invSize);

    var p = ear.prevZ,
        n = ear.nextZ;

    // look for points inside the triangle in both directions
    while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (p !== ear.prev && p !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;

        if (n !== ear.prev && n !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area(n.prev, n, n.next) >= 0) return false;
        n = n.nextZ;
    }

    // look for remaining points in decreasing z-order
    while (p && p.z >= minZ) {
        if (p !== ear.prev && p !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;
    }

    // look for remaining points in increasing z-order
    while (n && n.z <= maxZ) {
        if (n !== ear.prev && n !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area(n.prev, n, n.next) >= 0) return false;
        n = n.nextZ;
    }

    return true;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start, triangles, dim) {
    var p = start;
    do {
        var a = p.prev,
            b = p.next.next;

        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

            triangles.push(a.i / dim);
            triangles.push(p.i / dim);
            triangles.push(b.i / dim);

            // remove two nodes involved
            removeNode(p);
            removeNode(p.next);

            p = start = b;
        }
        p = p.next;
    } while (p !== start);

    return p;
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(start, triangles, dim, minX, minY, invSize) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
        var b = a.next.next;
        while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal(a, b)) {
                // split the polygon in two by the diagonal
                var c = splitPolygon(a, b);

                // filter colinear points around the cuts
                a = filterPoints(a, a.next);
                c = filterPoints(c, c.next);

                // run earcut on each half
                earcutLinked(a, triangles, dim, minX, minY, invSize);
                earcutLinked(c, triangles, dim, minX, minY, invSize);
                return;
            }
            b = b.next;
        }
        a = a.next;
    } while (a !== start);
}

// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(data, holeIndices, outerNode, dim) {
    var queue = [],
        i, len, start, end, list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
        start = holeIndices[i] * dim;
        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        list = linkedList(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost(list));
    }

    queue.sort(compareX);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
        eliminateHole(queue[i], outerNode);
        outerNode = filterPoints(outerNode, outerNode.next);
    }

    return outerNode;
}

function compareX(a, b) {
    return a.x - b.x;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
function eliminateHole(hole, outerNode) {
    outerNode = findHoleBridge(hole, outerNode);
    if (outerNode) {
        var b = splitPolygon(outerNode, hole);
        filterPoints(b, b.next);
    }
}

// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole, outerNode) {
    var p = outerNode,
        hx = hole.x,
        hy = hole.y,
        qx = -Infinity,
        m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                if (x === hx) {
                    if (hy === p.y) return p;
                    if (hy === p.next.y) return p.next;
                }
                m = p.x < p.next.x ? p : p.next;
            }
        }
        p = p.next;
    } while (p !== outerNode);

    if (!m) return null;

    if (hx === qx) return m.prev; // hole touches outer segment; pick lower endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
        mx = m.x,
        my = m.y,
        tanMin = Infinity,
        tan;

    p = m.next;

    while (p !== stop) {
        if (hx >= p.x && p.x >= mx && hx !== p.x &&
                pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

            if ((tan < tanMin || (tan === tanMin && p.x > m.x)) && locallyInside(p, hole)) {
                m = p;
                tanMin = tan;
            }
        }

        p = p.next;
    }

    return m;
}

// interlink polygon nodes in z-order
function indexCurve(start, minX, minY, invSize) {
    var p = start;
    do {
        if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, invSize);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked(p);
}

// Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
function sortLinked(list) {
    var i, p, q, e, tail, numMerges, pSize, qSize,
        inSize = 1;

    do {
        p = list;
        list = null;
        tail = null;
        numMerges = 0;

        while (p) {
            numMerges++;
            q = p;
            pSize = 0;
            for (i = 0; i < inSize; i++) {
                pSize++;
                q = q.nextZ;
                if (!q) break;
            }
            qSize = inSize;

            while (pSize > 0 || (qSize > 0 && q)) {

                if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                }

                if (tail) tail.nextZ = e;
                else list = e;

                e.prevZ = tail;
                tail = e;
            }

            p = q;
        }

        tail.nextZ = null;
        inSize *= 2;

    } while (numMerges > 1);

    return list;
}

// z-order of a point given coords and inverse of the longer side of data bbox
function zOrder(x, y, minX, minY, invSize) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) * invSize;
    y = 32767 * (y - minY) * invSize;

    x = (x | (x << 8)) & 0x00FF00FF;
    x = (x | (x << 4)) & 0x0F0F0F0F;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;

    y = (y | (y << 8)) & 0x00FF00FF;
    y = (y | (y << 4)) & 0x0F0F0F0F;
    y = (y | (y << 2)) & 0x33333333;
    y = (y | (y << 1)) & 0x55555555;

    return x | (y << 1);
}

// find the leftmost node of a polygon ring
function getLeftmost(start) {
    var p = start,
        leftmost = start;
    do {
        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
        p = p.next;
    } while (p !== start);

    return leftmost;
}

// check if a point lies within a convex triangle
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
           (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
           (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
}

// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
function isValidDiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) &&
           locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b);
}

// signed area of a triangle
function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// check if two points are equal
function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

// check if two segments intersect
function intersects(p1, q1, p2, q2) {
    if ((equals(p1, p2) && equals(q1, q2)) ||
        (equals(p1, q2) && equals(p2, q1))) return true;
    return area(p1, q1, p2) > 0 !== area(p1, q1, q2) > 0 &&
           area(p2, q2, p1) > 0 !== area(p2, q2, q1) > 0;
}

// check if a polygon diagonal intersects any polygon segments
function intersectsPolygon(a, b) {
    var p = a;
    do {
        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
                intersects(p, p.next, a, b)) return true;
        p = p.next;
    } while (p !== a);

    return false;
}

// check if a polygon diagonal is locally inside the polygon
function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0 ?
        area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
        area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

// check if the middle point of a polygon diagonal is inside the polygon
function middleInside(a, b) {
    var p = a,
        inside = false,
        px = (a.x + b.x) / 2,
        py = (a.y + b.y) / 2;
    do {
        if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&
                (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
            inside = !inside;
        p = p.next;
    } while (p !== a);

    return inside;
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
function splitPolygon(a, b) {
    var a2 = new Node$1(a.i, a.x, a.y),
        b2 = new Node$1(b.i, b.x, b.y),
        an = a.next,
        bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
}

// create a node and optionally link it with previous one (in a circular doubly linked list)
function insertNode(i, x, y, last) {
    var p = new Node$1(i, x, y);

    if (!last) {
        p.prev = p;
        p.next = p;

    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function Node$1(i, x, y) {
    // vertex index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertex nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
}

// return a percentage difference between the polygon area and its triangulation area;
// used to verify correctness of triangulation
earcut.deviation = function (data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
    if (hasHoles) {
        for (var i = 0, len = holeIndices.length; i < len; i++) {
            var start = holeIndices[i] * dim;
            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            polygonArea -= Math.abs(signedArea(data, start, end, dim));
        }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
        var a = triangles[i] * dim;
        var b = triangles[i + 1] * dim;
        var c = triangles[i + 2] * dim;
        trianglesArea += Math.abs(
            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
            (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
    }

    return polygonArea === 0 && trianglesArea === 0 ? 0 :
        Math.abs((trianglesArea - polygonArea) / polygonArea);
};

function signedArea(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
    }
    return sum;
}

// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
earcut.flatten = function (data) {
    var dim = data[0][0].length,
        result = {vertices: [], holes: [], dimensions: dim},
        holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            result.holes.push(holeIndex);
        }
    }
    return result;
};

function buildGeometry$1(_line, _tile, _id) {
    if (_line.border.length < 2) console.log('ATTENTION', _line.border.length);
    const distance = (api$a.meter * 0.001) * (_line.props.width * 2);
    let offsetCoords = inflate(_line.border, distance);
    if (offsetCoords.length > 2) {
        console.warn('Wall', _id, 'had 3 borders');
        return null;
    }
    const wallGeometries = [];
    for (let margin = 0; margin < offsetCoords.length; margin ++) {
        offsetCoords[margin] = api$7.fixPolygonDirection(offsetCoords[margin], margin > 0);
        const elevationsDatas = getElevationsDatas$1(offsetCoords[margin]);
        const fullCoords = packCoordsWithElevation(offsetCoords[margin], elevationsDatas);
        const verticesNb = fullCoords.length * 2;
        const bufferVertices = new Float32Array(verticesNb * 3);
        let verticeId = 0;
        verticeId = addVerticesToBuffer$1(verticeId, bufferVertices, fullCoords, -1);
        verticeId = addVerticesToBuffer$1(verticeId, bufferVertices, fullCoords, _line.props.height);
        const bufferUvs = new Float32Array(verticesNb * 2);
        let uvId = 0;
        uvId = addUvToBuffer$1(uvId, bufferUvs, fullCoords, 200000, _tile, 0);
        uvId = addUvToBuffer$1(uvId, bufferUvs, fullCoords, 200000, _tile, 1);
        const facesIndex = [];
        const layerOffset = fullCoords.length;
        for (let i = 0; i < fullCoords.length - 1; i ++) {
            facesIndex.push(i);
            facesIndex.push(i + 1);
            facesIndex.push(layerOffset + i);
            facesIndex.push(i + 1);
            facesIndex.push(layerOffset + i + 1);
            facesIndex.push(layerOffset + i);
        }
        const bufferFaces = Uint32Array.from(facesIndex);
        const bufferGeometry = new BufferGeometry();
        bufferGeometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
        bufferGeometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
        bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
        bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
        wallGeometries.push(bufferGeometry);
    }
    wallGeometries.push(buildWallRoof(offsetCoords, _line.props));
    return BufferGeometryUtils.mergeBufferGeometries(wallGeometries);
}

function buildWallRoof(_offsetCoords, _props) {
    const holesIndex = [];
    _offsetCoords = _offsetCoords.filter(coords => coords.length);
    for (let margin = 0; margin < _offsetCoords.length - 1; margin ++) {
        holesIndex.push(_offsetCoords[margin].length);
    }
    const earsCoords = _offsetCoords.flat();
    if (earsCoords.length == holesIndex[0]) {
        console.log('ATTENTION earsCoords');
        console.log('_offsetCoords', _offsetCoords);
        console.log('earsCoords', earsCoords);
        console.log('holesIndex', holesIndex);
    }
    const facesIndex = earcut(earsCoords.flat(), holesIndex);
    const bufferFaces = Uint32Array.from(facesIndex);
    const fullCoords = [];
    for (let margin = 0; margin < _offsetCoords.length; margin ++) {
        const elevationsDatas = getElevationsDatas$1(_offsetCoords[margin]);
        fullCoords.push(...packCoordsWithElevation(_offsetCoords[margin], elevationsDatas));
    }
    const bufferVertices = new Float32Array(fullCoords.length * 3);
    let verticeId = 0;
    verticeId = addVerticesToBuffer$1(verticeId, bufferVertices, fullCoords,  + _props.height);
    const bufferGeometry = new BufferGeometry();
    const bufferUvs = new Float32Array(fullCoords.length * 2);
    bufferUvs.fill(0);
    bufferGeometry.setAttribute('position', new BufferAttribute(bufferVertices, 3));
    bufferGeometry.setAttribute('uv', new BufferAttribute(bufferUvs, 2));
    bufferGeometry.setIndex(new BufferAttribute(bufferFaces, 1));
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
}

function inflate(_coords, _distance) {
    const res = [];
    const geoInput = [];
    for (let i = 0; i < _coords.length; i ++) {
        geoInput.push(new jsts.geom.Coordinate(_coords[i][0], _coords[i][1]));
    }
    const geometryFactory = new jsts.geom.GeometryFactory();
    const isClosed = api$7.isClosedPath(_coords);
    let shell;
    if (isClosed) {
        shell = geometryFactory.createPolygon(geoInput);
    } else {
        shell = geometryFactory.createLineString(geoInput);
    }
    let polygon = shell.buffer(_distance, jsts.operation.buffer.BufferParameters.CAP_FLAT);
    let oCoordinates = polygon.shell.points.coordinates;
    let oCoords = [];
    for (let i = 0; i < oCoordinates.length; i ++) {
        oCoords.push([
            oCoordinates[i].x, 
            oCoordinates[i].y, 
        ]);
    }
    res.push(oCoords);
    if (isClosed) {
        let polygon = shell.buffer(_distance * -1, jsts.operation.buffer.BufferParameters.CAP_FLAT);
        if (polygon.shell) {
            oCoordinates = polygon.shell.points.coordinates;
            oCoords = [];
            for (let i = 0; i < oCoordinates.length; i ++) {
                oCoords.push([
                    oCoordinates[i].x, 
                    oCoordinates[i].y, 
                ]);
            }
            res.push(oCoords);
        }
    }
    return res;
}

function buildGeometry$2(_line, _tile) {
    if (_line.type == 'fence') {
        // return null;
        return buildGeometry(_line, _tile);
    } else if (_line.type == 'wall') {
        // return null;
        return buildGeometry$1(_line, _tile, _line.id);
    } else if (_line.type == 'highway') {
        return null;
    }
}

function addVerticesToBuffer$1(_offset, _buffer, _coords, _elevationOffset) {
    for (let i = 0; i < _coords.length; i ++) {
        const coord = _coords[i];
        const vertPos = api$a.coordToXYZ(
            coord[0], 
            coord[1], 
            coord[2] + _elevationOffset, 
        );
        _buffer[_offset + 0] = vertPos.x;
        _buffer[_offset + 1] = vertPos.y;
        _buffer[_offset + 2] = vertPos.z;
        _offset += 3;
    }
    return _offset;
}

function addUvToBuffer$1(_offset, _buffer, _coords, _uvFactor, _tile, _offsetY) {
    const tileSize = Math.abs(_tile.startCoord.x, _tile.endCoord.x);
    _buffer[_offset + 0] = 0;
    _buffer[_offset + 1] = _offsetY;
    _offset += 2;
    let lastUv = 0;
    for (let i = 1; i < _coords.length; i ++) {
        const dist = Math.sqrt(Math.pow(_coords[i][0] - _coords[i - 1][0], 2) + Math.pow(_coords[i][1] - _coords[i - 1][1], 2));
        const curUv = (dist / tileSize) * _uvFactor;
        _buffer[_offset + 0] = lastUv + curUv;
        _buffer[_offset + 1] = _offsetY;
        lastUv += curUv;
        _offset += 2;
    }
    return _offset;
}

function packCoordsWithElevation(_coords, _elevations) {
    const fullCoords = [];
    for (let i = 0; i < _coords.length; i ++) {
        const coord = _coords[i];
        fullCoords.push([
            coord[0], 
            coord[1], 
            _elevations[i], 
        ]);
    }
    return fullCoords;
}

function getElevationsDatas$1(_coords) {
    const elevations = [];
    for (let i = 0; i < _coords.length; i ++) {
        elevations.push(api$9.get(_coords[i][0], _coords[i][1]));
    }
    return elevations;
}

let knowIds$1 = [];
const tileToLines = new Map();
const storedLines = new Map();
const typedGeometries = new Map();
let schdeduleNb$1 = 0;

const api$p = {
    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        const nodesList = api$h.extractNodes(parsedJson);
        tileToLines.set(_tile.key, []);
        const extractedWays = extractElements$1(parsedJson, _tile.zoom);
        // NavigationGraph.build(extractedWays, nodesList);
        registerDatas$2(_tile, extractedWays);
        let lineAdded = buildLine(_tile, extractedWays, nodesList);
        if (lineAdded > 0) scheduleDraw$1();
    }, 

    tileRemoved : function(_tile) {
        // console.log('A tileRemoved');
        if (!tileToLines.get(_tile.key)) return false;
        // console.log('B tileRemoved');
        // NavigationGraph.cleanTile(_tile);
        tileToLines.get(_tile.key)
        .forEach(lineId => {
            if (!storedLines.get('LINE_' + lineId)) return false;
            const stored = storedLines.get('LINE_' + lineId);
            stored.refNb --;
            if (stored.refNb > 0) return;
            forgotLine(lineId);
            deleteLineGeometry(stored.id, stored.type);
            storedLines.delete('LINE_' + lineId);

            const zoom = 13;
            // console.log('stored.buildDatas.border', stored.buildDatas.border);
            const bbox = calcBbox$1(stored.buildDatas.border);
            const tileA = api$8.coordsToTile(bbox.minLon, bbox.minLat, zoom);
            const tileB = api$8.coordsToTile(bbox.maxLon, bbox.maxLat, zoom);
            for (let x = tileA.x; x <= tileB.x; x ++) {
                for (let y = tileB.y; y <= tileA.y; y ++) {
                    const tile = api$a.tileFromXYZ(x, y, zoom);
                    if (!tile) continue;
                    const extension = tile.extensions.get('LINES');
                    if (!extension) continue;
                    extension.removeLine(lineId);
                }
            }


        });
        tileToLines.delete(_tile.key);
        scheduleDraw$1();
    }
};

function registerDatas$2(_tile, _extractedDatas) {
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const way = _extractedDatas[i];
        if (!isLineKnowed(way.id)) continue;
        storedLines.get('LINE_' + way.id).refNb ++;
    }
    tileToLines.get(_tile.key).push(..._extractedDatas.map(line => line.id));
}

function buildLine(_tile, _extractedDatas, _nodesList) {
    let lineAdded = 0;
    for (let i = 0; i < _extractedDatas.length; i ++) {
        const way = _extractedDatas[i];
        if (isLineKnowed(way.id)) continue;
        knowIds$1.push(way.id);
        const lineBuilded = buildWay$1(way, _nodesList);
        if (lineBuilded.border.length < 2) return;
        storedLines.set('LINE_' + lineBuilded.id, {
            id : lineBuilded.id, 
            type : lineBuilded.type, 
            refNb : 1, 
            buildDatas : lineBuilded, 
        });
        if (lineBuilded.type == 'highway') {
            searchTilesUnderWay(lineBuilded);
        }
        drawLine(lineBuilded, _tile);
        lineAdded ++;
    }
    return lineAdded;
}

function searchTilesUnderWay(_way) {
    const zoom = 13;
    const bbox = calcBbox$1(_way.border);
    const tileA = api$8.coordsToTile(bbox.minLon, bbox.minLat, zoom);
    const tileB = api$8.coordsToTile(bbox.maxLon, bbox.maxLat, zoom);
    for (let x = tileA.x; x <= tileB.x; x ++) {
        for (let y = tileB.y; y <= tileA.y; y ++) {
            const tile = api$a.tileFromXYZ(x, y, zoom);
            if (!tile) continue;
            const map = new Map();
            map.set(_way.id, _way);
            const extension = tile.extensions.get('LINES');
            if (!extension) continue;
            extension.setHighways(map);
        }
    }
}

function calcBbox$1(_border) {
    const lon = _border.map(point => point[0]);
    const lat = _border.map(point => point[1]);
    return {
        minLon : Math.min(...lon), 
        maxLon : Math.max(...lon), 
        minLat : Math.min(...lat), 
        maxLat : Math.max(...lat), 
    }
}



function scheduleDraw$1() {
    if (schdeduleNb$1 > 0) return false;
    schdeduleNb$1 ++;
    setTimeout(redrawMeshes$1, 1000);
}

function drawLine(_line, _tile) {
    const lineGeometry = buildGeometry$2(_line, _tile);
    if (lineGeometry) saveLineGeometries(_line.id, lineGeometry, _line.type);
}

function redrawMeshes$1() {
    typedGeometries.forEach((curTypedGeos) => {
        curTypedGeos.mesh.geometry.dispose();
        const datasGeometries = curTypedGeos.list.map(data => data.geometry);
        if (datasGeometries.length == 0) return;
        curTypedGeos.mesh.geometry = BufferGeometryUtils.mergeBufferGeometries(datasGeometries);
        api$a.addMeshe(curTypedGeos.mesh);
    });
    schdeduleNb$1 --;
    api.MUST_RENDER = true;
}

function saveLineGeometries(_id, _geometry, _type) {
    if (!typedGeometries.get(_type)) {
        const mesh = new Mesh(new BufferGeometry(), api$n.material(_type));
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        typedGeometries.set(_type, {
            mesh : mesh, 
            list : [], 
        });
    }
    typedGeometries.get(_type).list.push({
        id : _id, 
        geometry : _geometry, 
    });
}

function deleteLineGeometry(_id, _type) {
    const curTypedGeos = typedGeometries.get(_type);
    if (!curTypedGeos) return;
    for (let i = 0; i < curTypedGeos.list.length; i ++) {
        if (curTypedGeos.list[i].id != _id) continue;
        curTypedGeos.list[i].geometry.dispose();
        curTypedGeos.list.splice(i, 1);
        break;
    }
    if (curTypedGeos.list.length == 0) {
        api$a.removeMeshe(curTypedGeos.mesh);
    }
}

function buildWay$1(_way, _nodesList) {
    const wayNodes = [];
    for (let i = 0; i < _way.nodes.length; i ++) {
        wayNodes.push(_nodesList.get('NODE_' + _way.nodes[i]));
    }
    const type = extractType$2(_way);
    // TODO: si c'est une highway, merger les morceaux contigues et semblables
    return {
        id : _way.id, 
        type : type, 
        props : extractTags(_way.tags, type), 
        border : wayNodes, 
    };
}

function isLineKnowed(_id) {
    return knowIds$1.includes(_id);
}

function forgotLine(_id) {
    knowIds$1 = knowIds$1.filter(id => id != _id);
}

function extractElements$1(_datas, _zoom) {
    return api$h.extractElements(_datas, 'way')
    .filter(e => e.tags)
    .filter(e => isTagSupported$2(e, _zoom));
}

function isTagSupported$2(_element, _zoom) {
    const type = extractType$2(_element);
    if (!type) return false;
    if (_zoom != tagsZoom$1[type]) return false;
	return true;
}

function extractType$2(_element) {
    let elementType = null;
    supportedTags$2.forEach(tag => {
        if (!_element.tags[tag.key]) return false;
        tag.values.forEach(value => {
            if (value == '*') {
                elementType = tag.key;
                return;
            }
            if (_element.tags[tag.key] == value) {
                elementType = tag.useKey ? tag.key : value;
                return;
            }
            return;
        });
    });
    if (equalsTags$2[elementType]) return equalsTags$2[elementType];
	return elementType;
}

function extractTags(_tags, _type) {
    const res = {
        width : 1, 
        height : 2, 
    };
    if (_type == 'wall') {
        res.width = 1;
        res.height = 2;
    }
    if (_type == 'highway') {
        res.highway = _tags.highway;
        res.width = 4;
        res.height = 0.5;
        const highwayProps = getHighwayTags(_tags.highway);
        highwayProps.forEach((value, prop) => {
            res[prop] = value;
        });
    }
    if (_tags.width) {
        _tags.width = _tags.width.replace('m', '');
        _tags.width = _tags.width.replace(' ', '');
        res.width = parseFloat(_tags.width);
    }
    if (_tags.height) {
        _tags.height = _tags.height.replace('m', '');
        _tags.height = _tags.height.replace(' ', '');
        _tags.height = _tags.height.replace('~', '');
        res.height = parseFloat(_tags.height);
        if (isNaN(res.height)) console.log('res.height', _tags.height);
    }
    return res;
}

function getHighwayTags(_highwayValue) {
    const values = [
        {
            tags : [
                'motorway', 
                'trunk', 
                'motorway_link', 
                'trunk_link', 
            ], 
            width : 10
        }, 
        {
            tags : [
                'primary', 
                'primary_link', 
                'raceway', 
            ], 
            width : 6
        }, 
        {
            tags : [
                'secondary', 
                'secondary_link', 
            ], 
            width : 5
        }, 
        {
            tags : [
                'tertiary', 
                'tertiary_link', 
                'unclassified', 
                'road', 
            ], 
            width : 4
        }, 
        {
            tags : [
                'residential', 
                'living_street', 
            ], 
            width : 3
        }, 
        {
            tags : [
                'pedestrian', 
                'service', 
            ], 
            width : 2
        }, 
        {
            tags : [
                'track', 
            ], 
            width : 2
        }, 
    ];
    return values
    .filter(value => value.tags.includes(_highwayValue))
    .map(value => {
        const res = new Map();
        res.set('width', value.width);
        return res;
    }).pop();
}

const equalsTags$2 = {
    retaining_wall : 'wall', 
    line : 'powerLine', 
};

const tagsZoom$1 = {
    wall : 15, 
    fence : 15, 
    powerLine : 16, 
    highway : 15, 
};

const supportedTags$2 = [
    {
        key : 'barrier', 
        values : [
            'fence', 
            'wall', 
            'retaining_wall', 
        ]
    }, 
    {
        key : 'power', 
        values : [
            'line', 
        ], 
    }, 
    {
        useKey : true, 
        key : 'highway', 
        values : [
            'motorway', 
            'trunk', 
            'primary', 
            'secondary', 
            'tertiary', 
            'unclassified', 
            'residential', 
            'motorway_link', 
            'trunk_link', 
            'primary_link', 
            'secondary_link', 
            'tertiary_link', 
            'living_street', 
            'service', 
            'pedestrian', 
            'raceway', 
            'road', 
            'track', 
        ], 
    }, 
];

const canvasFinal$1 = document.createElement('canvas');
canvasFinal$1.width = mapSize;
canvasFinal$1.height = mapSize;
const contextFinal$1 = canvasFinal$1.getContext("2d");

function extensionClass$7() {
	return LinesExtension;
}

const workerEvt = new Evt();
const workerCanvas = new Worker('js/oev/tileExtensions/lines/workerLineDrawer.js', {type:'module'});
workerCanvas.addEventListener('message', evt => {
    workerEvt.fireEvent('LINE_DRAW_' + evt.data.tileKey, evt.data.pixelsDatas);
});


class LinesExtension {
	constructor(_tile) {
		this.id = 'LINES';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.isActive = this.tile.zoom == 15;

        this.shapes = new Map();
        this.scheduleNb = 0;
        this.canvas = null;
        

        if (api$n.isReady && api$o.isReady) {
            this.onRessourcesLoaded();
        }
        if (!api$n.isReady) {
            api$n.evt.addEventListener('READY', this, this.onMaterialReady);
        }
        if (!api$o.isReady) {
            api$o.evt.addEventListener('READY', this, this.onModelsReady);
        }
    }

    onMaterialReady() {
        api$n.evt.removeEventListener('READY', this, this.onMaterialReady);
		if (this.tile.isReady) this.onRessourcesLoaded();
    }

    onModelsReady() {
        api$o.evt.removeEventListener('READY', this, this.onModelsReady);
        this.onRessourcesLoaded();
    }

    onRessourcesLoaded() {
        if (!api$n.isReady) return false;
        if (!api$o.isReady) return false;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
        this.tile.evt.addEventListener('ADD_CHILDRENS', this, this.onTileSplit);
		if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		loader$7.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onLinesLoaded(_datas)
		);
    }
    
    onLinesLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        api$p.setDatas(_datas, this.tile);
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader$7.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
        this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.tile.evt.removeEventListener('ADD_CHILDRENS', this, this.onTileSplit);
        if (this.canvas) {
            this.tile.extensionsMaps.delete(this.id);
            this.drawCanvas();
            this.context = null;
            this.canvas = null;
            workerEvt.removeEventListener('LINE_DRAW_' + this.tile.key, this, this.onWorkerFinished);
        }
        // if (!this.isActive) return false;
        api$p.tileRemoved(this.tile);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
        this.shapes.clear();
		api.MUST_RENDER = true;
    }

    initCanvas() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
		this.canvas.width = mapSize;
		this.canvas.height = mapSize;
        this.tile.extensionsMaps.set(this.id, this.canvas);
        workerEvt.addEventListener('LINE_DRAW_' + this.tile.key, this, this.onWorkerFinished);
    }


    removeLine(_lineId) {
        // console.log('removeLine');
        if (!this.tile) return false;
        if (!this.shapes.has(_lineId)) return false;
		this.shapes.delete(_lineId);
		this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.removeLine(_lineId);
		}
    }
        
    onTileSplit() {
        for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
			extension.setHighways(this.shapes);
		}
    }


    scheduleDraw() {
        if (this.scheduleNb > 0) return false;
        this.scheduleNb ++;
        setTimeout(() => this.drawCanvas(), 1000);
    }

    drawCanvas() {
        this.scheduleNb --;
        if (!this.tile) return false
        this.context.clearRect(0, 0, mapSize, mapSize);

        if (this.shapes.size) {
            const localWays = [];
            this.shapes.forEach(curWay => {
                if (!curWay.bordersSplit.length) return false;
                for (let i = 0; i < curWay.bordersSplit.length; i ++ ){
                    const local = api$8.coordToCanvas(this.tile.bbox, mapSize, curWay.bordersSplit[i]);
                    localWays.push({
                        positions : local, 
                        props : curWay.props, 
                    });
                }
            });
            const textureBuffer = api$n.textureBuffer();
            workerCanvas.postMessage({
                localCoords : localWays, 
                tileKey : this.tile.key, 
                zoom : this.tile.zoom, 
                textureBuffer : textureBuffer, 
            });
        }
    }

    onWorkerFinished(_pixelsDatas) {
        if (!this.tile) return;
        if (!this.context) return;
        const imageDatas = new ImageData(_pixelsDatas, 256, 256);
        this.context.putImageData(imageDatas, 0, 0);
        this.tile.redrawDiffuse();
    }
    

    setHighways(_highways) {
        if (!this.splitHighways(_highways)) return false;
        this.initCanvas();
        this.scheduleDraw();
		for (let c = 0; c < this.tile.childTiles.length; c ++) {
            const child = this.tile.childTiles[c];
            const extension = child.extensions.get(this.id);
            if (!extension) continue;
			extension.setHighways(this.shapes);
		}
	}

	splitHighways(_highways) {
        // if (this.tile.key != '16756_11936_15') {
        //     return 0;
        // }
        const bbox = [
            this.tile.startCoord.x, // min X
			this.tile.endCoord.y, // min Y
			this.tile.endCoord.x, // max X
            this.tile.startCoord.y, // max Y
        ];
        let addNb = 0;
		_highways.forEach(curWay => {
            if (this.shapes.has(curWay.id)) return false;
			const myWay = {
				id : curWay.id, 
				type : curWay.type, 
				props : curWay.props, 
				border : curWay.border, 
				bordersSplit : [], 
            };
            // if (curWay.props.width < 5) return false;
            // if (curWay.props.highway != 'primary') return false;
            myWay.bordersSplit = lineclip(curWay.border, bbox);
            if (myWay.bordersSplit.length == 0) {
                return false;
            }
			this.shapes.set(curWay.id, myWay);
            addNb ++;
        });
        return addNb;
	}
}

const PARAMS$8 = {
	nbLoaders : 1, 
	useCache : false, 
	delay : 2000, 
};

let API_URL$8 = 'https://opensky-network.org/api/states/all?';

class LoaderPlane {
	constructor(_callback) {
		this.isLoading = false;
		this.callback = _callback;
		this.params = {};
	}	

	load(_params) {
		this.params = _params;
		this.isLoading = true;
        const url = API_URL$8 + 'lamin=' + this.params.minLat + '&lomin=' + this.params.minLon + '&lamax=' + this.params.maxLat + '&lomax=' + this.params.maxLon;
		fetch(url)
		.then(res => res.text())
		.then(text => this.onDataLoadSuccess(text))
		.catch(error => console.log('Error', error));
	}
	
	onDataLoadSuccess(_data) {
        this.datasReady(_data);
	}
	
	datasReady(_datas) {
		this.isLoading = false;
		this.callback(_datas, this.params);
	}
}

registerLoader('PLANE', LoaderPlane, PARAMS$8);
const loader$8 = new Loader('PLANE');

function extensionClass$8() {
	return PlaneExtension;
}

class PlaneExtension {
	constructor(_tile) {
		this.id = 'PLANE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.isActive = this.tile.zoom == 11;

        if (api$d.isReady && api$c.isReady) {
            this.onRessourcesLoaded();
        }
        if (!api$d.isReady) {
            api$d.evt.addEventListener('READY', this, this.onTexturesReady);
        }
        if (!api$c.isReady) {
            api$c.evt.addEventListener('READY', this, this.onModelsReady);
        }
    }

    onTexturesReady() {
        api$d.evt.removeEventListener('READY', this, this.onTexturesReady);
        this.onRessourcesLoaded();
    }

    onModelsReady() {
        api$c.evt.removeEventListener('READY', this, this.onModelsReady);
        this.onRessourcesLoaded();
    }

    onRessourcesLoaded() {
        if (!api$d.isReady) return false;
        if (!api$c.isReady) return false;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
        
        loader$8.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
                y : this.tile.tileY,
                minLon : this.tile.startCoord.x,  
                maxLon : this.tile.endCoord.x,  
                minLat : this.tile.endCoord.y,  
                maxLat : this.tile.startCoord.y,  
				priority : this.tile.distToCam
			}, 
			_datas => this.onPlanesLoaded(_datas)
		);
    }
    
    refreshDatas() {
        this.dataLoading = false;
        this.dataLoaded = false;
        if (!this.tile) return false;
        if (!this.tile.isReady) return false;
        this.onTileReady();
    }

    onPlanesLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        api$e.setDatas(_datas, this.tile);
        setTimeout(() => this.refreshDatas(), 20000);
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		loader$8.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        if (!this.isActive) return false;
        api$e.tileRemoved(this.tile);
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		api.MUST_RENDER = true;
	}
}

function load$1(_url) {
    fetch(_url)
    .then(res => res.text())
    .then(text => onGpxLoaded(text));
}

function onGpxLoaded(_gpx) {
    var gpx = new gpxParser();
    gpx.parse(_gpx);
    const pathCoords = getPathPoints(gpx.tracks[0].points);
    const geometry = new BufferGeometry().setFromPoints(pathCoords);
    var material = new LineBasicMaterial({color: 0x0000ff});
    const line = new Line(geometry, material);
    // console.log(pathCoords);
    api.scene.add(line);
    // return line;
}

function getPathPoints(_points) {
    return _points.map(point => api$a.coordToXYZ(point.lon, point.lat, point.ele));
}

let containerOffset$1 = undefined;

function _choose(_value, _defaultValue) {
	if (_value === undefined) return _defaultValue;
	if (_value === null) return _defaultValue;
	return _value;
}

const APP$1 = {
	appStarted : false, 
	evt : null, 
	clock : null, 
	tileExtensions : {}, 

	parseParams : function(_params) {
		// const serverURL = 'https://val.openearthview.net/api/';
		const serverURL = 'https://ns378984.ip-5-196-69.eu/api/';
		_params = _choose(_params, {});
		_params.CAMERA = _choose(_params.CAMERA, {});
		_params.CAMERA.x = _choose(_params.CAMERA.x, 2.3831);
		_params.CAMERA.y = _choose(_params.CAMERA.y, 48.8809);
		_params.CAMERA.z = _choose(_params.CAMERA.z, 13);
		_params.UI = _choose(_params.UI, {});
		_params.UI.extensions = _choose(_params.UI.extensions, false);
		_params.UI.waypoints = _choose(_params.UI.waypoints, false);
		_params.UI.navigation = _choose(_params.UI.navigation, false);
		_params.URL = _choose(_params.URL, {});
		_params.URL.disabled = _choose(_params.URL.enabled, false);
		_params.EXTENSIONS = _choose(_params.EXTENSIONS, {});
		_params.EXTENSIONS.map = _choose(_params.EXTENSIONS.map, {});
		_params.EXTENSIONS.map.active = _choose(_params.EXTENSIONS.map.active, true);
		_params.EXTENSIONS.map.url = _choose(_params.EXTENSIONS.map.url, serverURL + 'index.php?ressource=osm');
		_params.EXTENSIONS.elevation = _choose(_params.EXTENSIONS.elevation, {});
		_params.EXTENSIONS.elevation.active = _choose(_params.EXTENSIONS.elevation.active, true);
		_params.EXTENSIONS.elevation.url = _choose(_params.EXTENSIONS.elevation.url, serverURL + 'index.php?ressource=elevation');
		return _params;
	}, 

	init : function(_htmlContainer, _params = {}) {
		const params = this.parseParams(_params);
		APP$1.evt = new Evt();
		api.init(_htmlContainer);
		init$1('assets/textures');
		init$3();
		init$2();
		init();
		api$a.init();
		api$b.init();
		api$g.init(params.URL, params.CAMERA);
		APP$1.clock = new Clock();
		// const serverURL = 'https://val.openearthview.net/api/';
		const serverURL = 'https://ns378984.ip-5-196-69.eu/api/';
		if (_params.EXTENSIONS.map.active) {
			setApiUrl(_params.EXTENSIONS.map.url);
			register('TILE2D', extensionClass());
			activate('TILE2D');
		}
		if (_params.EXTENSIONS.elevation.active) {
			setApiUrl$1(serverURL + 'index.php?ressource=elevation');
			register('ELEVATION', extensionClass$1());
			activate('ELEVATION');
		}
		setApiUrl$5(serverURL + 'index.php?ressource=satellite');
		setApiUrl$3(serverURL + 'index.php?ressource=normal');
		setApiUrl$4(serverURL + 'index.php?ressource=landuse');
		setApiUrl$2(serverURL + 'index.php?ressource=building');
		setApiUrl$6(serverURL + 'index.php?ressource=node');
		setApiUrl$7(serverURL + 'index.php?ressource=lines');
		
		// TileExtension.register('TILE2D', MapExtension.extensionClass());
		register('SATELLITE', extensionClass$5());
		register('NORMAL', extensionClass$3());
		register('LANDUSE', extensionClass$4());
		register('BUILDING', extensionClass$2());
		register('NODE', extensionClass$6());
		register('LINES', extensionClass$7());
		register('PLANE', extensionClass$8());
		
		// TileExtension.activate('TILE2D');
		activate('NORMAL');
		const activesExtensions = api$g.activesExtensions();
		activesExtensions.forEach(extensionToActivate => {
			activate(extensionToActivate);
		});
		api.scene.add(api$a.meshe);
		const elmtHtmlContainer = document.getElementById(_htmlContainer);
		containerOffset$1 = new Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
		apiUi.init(params.UI);
		APP$1.evt.fireEvent('APP_INIT');	
		APP$1.loadTextures()
		.then(() => {
			return APP$1.loadShaders();
		})
		.then(() => {
			apiUi.closeModal();
			APP$1.start();
		});
	}, 
	
	start : function() {
		const cameraLocation = api$g.cameraLocation();
		const cameraCtrl = new CameraGod(api.camera, cameraLocation);
		apiUi.setCamera(cameraCtrl);
		api$a.setCameraControler(cameraCtrl);
		api$b.saveWaypoint(4.231021, 43.795594, 13, 'Vaunage');
		api$b.saveWaypoint(3.854188, 43.958125, 13, 'St Hippo');
		api$b.saveWaypoint(3.8139,43.7925, 13, 'Pic St Loup');
		api$b.saveWaypoint(5.2659, 44.1747, 13, 'Mt Ventoux');
		api$b.saveWaypoint(5.7333, 43.1637, 14, 'St Cyr');
		api$b.saveWaypoint(2.383138,48.880945, 13, 'Paris');
		APP$1.appStarted = true;
		APP$1.evt.fireEvent('APP_START');
		api$a.construct();
		APP$1.render();
		load$1('/assets/gpx/test.gpx');
	}, 

	loadTextures : function() {
		apiUi.openModal('Loading textures, please wait');
		const textList = [];
		const toLoad = [
			['checker', 'loading.png'], 
			['sky_gradient', 'sky_gradient.png'], 
			['waypoint', 'waypoint.png'], 
		];
		toLoad.forEach(d => addToList(textList, d[0], d[1]));
		return new Promise((resolve) => {
			loadBatch(textList, resolve);
		});
	}, 
	
	loadShaders : function() {
		return new Promise((resolve) => {
			loadList(['cloud', 'sky', 'sun'], resolve);
		});
	}, 

	render : function() {
		if (api.MUST_RENDER) {
			apiUi.showUICoords(api$a.cameraControler.coordLookat.x, api$a.cameraControler.coordLookat.y, api$a.cameraControler.coordLookat.y);
		}
		api.render();
		api$a.cameraControler.update();
		if (apiUi.dragSun) {
			const sceneSize = api.sceneSize();
			const normalizedTIme = ((api$1.curMouseX - containerOffset$1.x) / sceneSize[0]);
			api$a.setTime(normalizedTIme);	
		}
		api$a.update();
		requestAnimationFrame(APP$1.render);
	}, 

	gotoWaypoint : function(_waypointIndex) {
		const waypoint = api$b.getWaypointById(_waypointIndex);
		api$a.cameraControler.setDestination(waypoint.lon, waypoint.lat, waypoint.zoom);
	},  

};

window.APP = APP$1;

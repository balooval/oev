var scene;
var camera;
var renderer;

var sceneWidth = 800;
var sceneHeight = 600;
var containerOffset = undefined;



var tileLoader = new THREE.TextureLoader();

var earth;
var sky;

var atmosphereMeshe = undefined;

var texturesToPreload = [ 'waypoint.png', 'loading.png', 'sky.png', 'building_wall_2.png', 'checker_alpha.png' ];
texturesToPreload.push( 'roof.png' );
texturesToPreload.push( 'sun2.png' );
texturesToPreload.push( 'cloud_3.png' );
texturesToPreload.push( 'sky_gradient.png' );
texturesToPreload.push( 'grass.png' );
var texturesNames = [ 'waypoint', 'checker', 'sky', 'building_wall', 'checker_alpha' ];
texturesNames.push( 'roof' );
texturesNames.push( 'sun' );
texturesNames.push( 'cloud' );
texturesNames.push( 'sky_gradient' );
texturesNames.push( 'grass' );
var textures = {};
var curTextureLoading = -1;

var modelsToLoad = [ 'tree_lod_1.json', 'tree_lod_1.json', 'tree_lod_0.json', 'hydrant_lod_0.json', 'hydrant_lod_1.json', 'hydrant_lod_1.json' ];
modelsToLoad.push( 'lamp_lod_0.json' );
modelsToLoad.push( 'lamp_lod_1.json' );
modelsToLoad.push( 'lamp_lod_2.json' );
modelsToLoad.push( 'capitelle.json' );
modelsToLoad.push( 'capitelle.json' );
modelsToLoad.push( 'capitelle.json' );
var modelsName = [ 'TREE_lod_2', 'TREE_lod_1', 'TREE_lod_0', 'HYDRANT_lod_0', 'HYDRANT_lod_1', 'HYDRANT_lod_2' ];
modelsName.push( 'LAMP_lod_0' );
modelsName.push( 'LAMP_lod_1' );
modelsName.push( 'LAMP_lod_2' );
modelsName.push( 'CAPITELLE_lod_0' );
modelsName.push( 'CAPITELLE_lod_1' );
modelsName.push( 'CAPITELLE_lod_2' );
var modelsLib = {};
var curModelLoading = -1;

var modelsLoader = new THREE.ObjectLoader();
var geoDebug = undefined;
var materialWaypoints = {};
var postprocessing = {};
var dofActiv = false;
var materialPOILine;
var ctrlActiv = false;
var bokehPass;

var MUST_RENDER = true;
var MODELS_CFG;
var showRendererInfos = false;


var debugMouseObj;
var raycaster = undefined;



var preloadQuery = [];


function init(){
	var intElemClientWidth = document.getElementById( "threeContainer" ).clientWidth;
	var intElemClientHeight = document.getElementById( "tools" ).clientHeight;
	sceneWidth = Math.min( intElemClientWidth, 1000 );
	sceneHeight = Math.min( intElemClientHeight, 800 );

	scene = new THREE.Scene();
	
	camera = new THREE.PerspectiveCamera( 90, sceneWidth / sceneHeight, 0.1, 20000 );
	sky = new Sky();
	earth = new Globe();
	// earth.configure( CFG_GLOBE );

	// scene.fog = new THREE.Fog( 0xc5d3ea, earth.radius / 2, earth.radius );
	
	// renderer = new THREE.WebGLRenderer( { alpha: true } );
	renderer = new THREE.WebGLRenderer( { alpha: true, clearAlpha: 1 } );
	// renderer = new THREE.WebGLRenderer( { clearAlpha: 1 });
	
	// renderer.sortObjects = false;
	
	raycaster = new THREE.Raycaster();
	
	renderer.setSize( sceneWidth, sceneHeight );
	document.getElementById( "threeContainer" ).appendChild( renderer.domElement );

	containerOffset = new THREE.Vector2( document.getElementById( 'threeContainer' ).offsetLeft, document.getElementById( 'threeContainer' ).offsetTop );
	
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = 500;
	
	loadConfig();
	

	// DOF
	initPostprocessing();
	
	renderer.setClearColor( 0x202040, 1 );
	render();
}


function initPostprocessing() {
	var renderPass = new THREE.RenderPass( scene, camera );

	bokehPass = new THREE.BokehPass( scene, camera, {
		focus: 		1.0,
		// aperture:	0.025,
		// aperture:	0.005,
		aperture:	0.055,
		// maxblur:	1.0,
		maxblur:	0.02, // OK

		width: sceneWidth,
		height: sceneHeight
	} );

	bokehPass.renderToScreen = true;

	var composer = new THREE.EffectComposer( renderer );

	composer.addPass( renderPass );
	composer.addPass( bokehPass );

	postprocessing.composer = composer;
	postprocessing.bokeh = bokehPass;
}

function switchClouds(){
	if( sky.cloudsActiv ){
		sky.clearClouds();
		setElementActiv( document.getElementById( "btnClouds" ), false );
	}else{
		sky.makeClouds();
		setElementActiv( document.getElementById( "btnClouds" ), true );
	}
}

function switchDof(){
	dofActiv = !dofActiv;
	if( dofActiv ){
		setElementActiv( document.getElementById( "btnDof" ), true );
	}else{
		setElementActiv( document.getElementById( "btnDof" ), false );
	}
	MUST_RENDER = true;
}


function start(){
	initUi();
	var debugGeo = new THREE.SphereGeometry( earth.meter * 100, 16, 7 ); 
	var debugMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
	geoDebug = new THREE.Mesh( debugGeo, debugMat );
	scene.add( geoDebug );
	
	materialWaypoints['default'] = new THREE.SpriteMaterial( { map: textures['waypoint'], color: 0xffffff, fog: false } );
	
	for( var model in MODELS_CFG ){
		if( MODELS_CFG[model]["MARKER"] != "none" && MODELS_CFG[model]["MARKER"] != 'default' && texturesToPreload.indexOf( MODELS_CFG[model]["MARKER"] ) < 0 ){
			materialWaypoints['MARKER_' + MODELS_CFG[model]["NAME"]] = new THREE.SpriteMaterial( { map: textures['MARKER_' + MODELS_CFG[model]["NAME"]], color: 0xffffff, fog: false } );
		}
	}
	
	materialPOILine = new THREE.LineBasicMaterial({color: 0xFFFFFF});
	
	earth.construct();
	earth.addZoom( 0 );
	earth.updateCamera();
	
	
	var debugMouse = new THREE.SphereGeometry( earth.meter * 100, 16, 7 );
	var debugMouseMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
	debugMouseObj = new THREE.Mesh( debugMouse, debugMouseMat );
	var posMD = earth.coordToXYZ( 46, 4, 100 );
	debugMouseObj.position.x = geoDebug.position.x;
	debugMouseObj.position.y = geoDebug.position.y;
	debugMouseObj.position.z = geoDebug.position.z;

	// console.log( geoDebug.position );
	// console.log( debugMouseObj.position );
	
	debugMouseObj.scale.x = geoDebug.scale.x * 2;
	debugMouseObj.scale.y = geoDebug.scale.y * 2;
	debugMouseObj.scale.z = geoDebug.scale.z * 2;
		
	// scene.add( debugMouseObj );

	sky.construct();
	

	initTouch();
}





function loadConfig(){
	var ajaxCfg = new AjaxMng( 'cfg_models.json', {}, function( res, _params ){
			debug( 'Config loaded' );
			MODELS_CFG = JSON.parse( res );
			for( var model in MODELS_CFG ){
				if( MODELS_CFG[model]["MARKER"] != "none" && MODELS_CFG[model]["MARKER"] != 'default' && texturesToPreload.indexOf( MODELS_CFG[model]["MARKER"] ) < 0 ){
					texturesToPreload.push( MODELS_CFG[model]["MARKER"] );
					texturesNames.push( 'MARKER_' + MODELS_CFG[model]["NAME"] );
				}
				
				document.getElementById( "models_switch" ).innerHTML += '<input type="checkbox" class="cfg_load_models" data-model="'+MODELS_CFG[model]["NAME"]+'" id="cfg_load_'+MODELS_CFG[model]["NAME"]+'" value="1" > <label for="cfg_load_'+MODELS_CFG[model]["NAME"]+'" title="zoom min : '+MODELS_CFG[model]["ZOOM_MIN"]+'">'+MODELS_CFG[model]["NAME"]+'</label> <a href="#" onclick="openConfigModel(\''+MODELS_CFG[model]["NAME"]+'\');"><img src="img/ico_config.png" alt="config" title="config"></a><br>';
			}
						
			loadDefaultTextures();
		});
}




function loadModels(){
	curModelLoading ++;
	var curModel = modelsToLoad.shift();
	// debug( "loading model " + curModel );
	modelsLoader.load( 'models/'+curModel, function ( object ) {
			object.rotation.x = Math.PI;
			object.scale.x = 0.005;
			object.scale.y = 0.005;
			object.scale.z = 0.005;
			modelsLib[modelsName[curModelLoading]] = object;
			
			if( modelsToLoad.length > 0 ){
				loadModels();
			}else{
				start();
			}

	} );
}

function loadDefaultTextures(){
	var curText = texturesToPreload.shift();
	curTextureLoading ++;
	tileLoader.load( "textures/"+curText, 
			function(t){
				textures[texturesNames[curTextureLoading]] = t;
				textures[texturesNames[curTextureLoading]].wrapS = textures[texturesNames[curTextureLoading]].wrapT = THREE.RepeatWrapping;
				if( texturesToPreload.length == 0 ){
					debug( "All " + texturesNames.length + " textures loaded" );
					loadModels();
				}else{
					loadDefaultTextures();
				}
			}, 
			function ( xhr ) {
				// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
			},
			function ( xhr ) {
				console.log( 'TilesMng .An error happened' );
			}
		);
}



function resetHeading(){
	earth.destHeading.x = 0;
	earth.destHeading.y = 0;
}

function activAtmosphere( _state ){
	if( _state ){
		if( atmosphereMeshe == undefined ){
			var skyGeo = new THREE.SphereGeometry( earth.radius * 2, 32, 15 );
			
			var skyMat = new THREE.ShaderMaterial( 
			{
				uniforms: {  },
				vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
				fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
				side: THREE.BackSide,
				// blending: THREE.AdditiveBlending,
				transparent: true
			}   );
			atmosphereMeshe = new THREE.Mesh( skyGeo, skyMat );
		}
		scene.add( atmosphereMeshe );
	}else if( !_state && atmosphereMeshe != undefined ){
		scene.remove( atmosphereMeshe );
	}
}


function radians( _degress ){
	return _degress * ( Math.PI / 180 );
}


function changeProjection(){
	earth.switchProjection();
	// document.getElementById( "btnProjection" ).value = "Projection " + earth.projection;
}


function zoomOut(){
	earth.addZoom( -1 );
}

function zoomIn(){
	earth.addZoom( 1 );
}


function checkMouseWorldPos(){
	var divPos = {};
	var mX = ( ( mouseX - containerOffset.x ) / sceneWidth ) * 2 - 1;
	var mY = -( ( mouseY - containerOffset.y ) / sceneHeight ) * 2 + 1;
	raycaster.near = camera.near;
	raycaster.far = camera.far;
	raycaster.setFromCamera( new THREE.Vector2( mX, mY ), camera );
	var intersects = raycaster.intersectObjects( earth.meshe.children );
	
	var coord = undefined;
	
	for ( var i = 0; i < intersects.length; i++ ) {
		coord = earth.coordFromPos( intersects[ i ].point.x, intersects[ i ].point.z );
		/*
		debugMouseObj.scale.x = geoDebug.scale.x;
		debugMouseObj.scale.y = geoDebug.scale.y;
		debugMouseObj.scale.z = geoDebug.scale.z;

		earth.mouseDragPos.x = mouseX;
		earth.mouseDragPos.y = mouseY;
		earth.mouseStartCoord.x = earth.camCoords.x;
		earth.mouseStartCoord.y = earth.camCoords.y;
		earth.mouseDragCoord = earth.coordFromPos( intersects[ i ].point.x, intersects[ i ].point.z );

		var pos = earth.coordToXYZ( earth.mouseDragCoord.x, earth.mouseDragCoord.y, 0 );

		debugMouseObj.position.x = pos.x;
		debugMouseObj.position.y = 0;
		debugMouseObj.position.z = pos.z;
		
		earth.updateCamera();
		*/
	}
	return coord;
}

function render() {
	requestAnimationFrame( render );

	if( MUST_RENDER ){
	// if( true ){
		if( dofActiv ){
			postprocessing.composer.render( 0.0 );
		}else{
			renderer.render( scene, camera );
		}
		MUST_RENDER = false;
	}
	
	if( dragView ){
		earth.dragCamera();
	}
	
	if( dragSun ){
		var mX = ( ( mouseX - containerOffset.x ) / sceneWidth );
		sky.setSunTime( mX );
	}
	
	if( rotateView ){
		// earth.rotateCamera();
		earth.rotateCamera( ( mouseX - lastMouseX ) / 100.0, ( mouseY - lastMouseY ) / 100.0 );
	}
	
	lastMouseX = mouseX;
	lastMouseY = mouseY;
	
	if( showRendererInfos ){
		var rendererInfos = '';
		for( var key in renderer.info ){
			for( var prop in renderer.info[key] ){
				rendererInfos += "info " + key + " / " + prop + " / " + renderer.info[key][prop] + '<br>';
			}
		}
		debug( rendererInfos, true );
	}
	
	earth.update();
	sky.update();
}


function tmpAngle( _x, _y ){
	var angTarget = ( Math.min( Math.max( ( ( 500 - _x ) / 500 ) * Math.PI, -Math.PI ), Math.PI ) ) * -1;
	debug( "angTarget : " + angTarget );
	var angCur = -3;
	var tmpAngleDelta = ( Math.atan2( Math.sin( angTarget - angCur ), Math.cos( angTarget - angCur ) ) ) * -1;
	debug( "tmpAngleDelta : " + tmpAngleDelta );
}




function querySearch(){
	var searchValue = document.getElementById( "search_value" ).value;
	debug( "searchValue: " + searchValue );
	var bbox = earth.getCurrentBBox();
	var url = DEV+"libs/remoteImg.php?nominatim=1&searchValue="+searchValue+"&left="+bbox["left"]+"&top="+bbox["top"]+"&right="+bbox["right"]+"&bottom="+bbox["bottom"]+"";
	var ajaxMng = new AjaxMng( url, { "searchValue" : searchValue }, function( res, _params ){
		var results = JSON.parse( res );
		if( results.length > 0 ){
			debug( "Found" );
			earth.saveWayPoints( parseFloat( results[0]["lon"] ), parseFloat( results[0]["lat"] ), 10, _params["searchValue"] );
			earth.gotoWaypoint( earth.wayPoints.length - 1 );
		}else{
			debug( "No results" );
		}
	});
	return false;
}


function debug( _msg, _inHtml ){
	_inHtml = _inHtml || false;
	if( _inHtml ){
		document.getElementById( "debugBox" ).innerHTML = _msg;
	}else{
		console.log( _msg );
	}
}


/*
function rgbToHex(r, g, b) {
    // return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    return (r << 16) + (g << 8) + (b);
}
*/

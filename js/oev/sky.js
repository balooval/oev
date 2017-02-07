Oev.Sky = (function(){
	'use strict';
	var lightAmbiant = undefined;
	var lightSunTarget = undefined;
	var sunSpriteMat = undefined;
	var sunSpriteObj = undefined;
	var sunHelper = undefined;
	var sunTargetCoord = undefined;
	var atmosphereMeshe = undefined;
	var skyDome = undefined;
	var skyMat = undefined;
	var sunRotation = -1.5;
	var sunTarget = undefined;
	var animateSun = false;
	var particleSystem = undefined;
	var pMaterial = undefined;
	var colorsGradient = undefined;
	var sunLightBack = undefined;
	var sunLightBackHelper = undefined;
	var fogActive = true;
	var lightHemi = undefined;
	var hemiIntensity = 0.35;
	var sunPoint = undefined;
	var stars = null;
	var starsMat = null;
	var snowEmiter = undefined;
	var destTime = 0;
	var destTimeSpeed = 0.01;
	var rainEnabled = false;
	var weatherEnabled = false;
	
	var api = {
		evt : new Oev.Utils.Evt(), 
		cloudsActiv : true, 
		lightSun : undefined, 
		globalScale : 1, 
		normalizedTime : 0.5, 
		posCenter : new THREE.Vector3( 0, 0, 0 ), 
		
		init : function() {
			destTime = api.normalizedTime;
			if( fogActive ){
				OEV.scene.fog = new THREE.Fog(0xc5d3ea, OEV.earth.radius , OEV.earth.radius * 2);
			}
			colorsGradient = getImageData(OEV.textures['sky_gradient'].image);	
			sunPoint = new THREE.PointLight(0xffffff, 1.0, OEV.earth.radius);
			OEV.scene.add( sunPoint );
			
			sunLightBack = new THREE.SpotLight(0xffffff, 1, 0.0, 1.0, 20);
			OEV.scene.add(sunLightBack);
			sunLightBackHelper = new THREE.SpotLightHelper(sunLightBack);

			sunSpriteMat = new THREE.SpriteMaterial({map: OEV.textures['sun'], color: 0xffffff, blending: THREE.AdditiveBlending, fog: false});
			sunSpriteObj = new THREE.Sprite(sunSpriteMat);
			var sunSpriteScale = 1000;
			sunSpriteObj.scale.x = sunSpriteScale;
			sunSpriteObj.scale.y = sunSpriteScale;
			sunSpriteObj.scale.z = sunSpriteScale;
			OEV.scene.add(sunSpriteObj);
			sunLightBack.target = sunSpriteObj;
			sunTargetCoord = new THREE.Vector3(0, 0, 0);
			var sunTargetGeo = new THREE.SphereGeometry(OEV.earth.meter * 100, 16, 7); 
			var debugMat = new THREE.MeshBasicMaterial({color: 0xFFFF00});
			sunTarget = new THREE.Mesh(sunTargetGeo, debugMat);
			var sunTargetPos = OEV.earth.coordToXYZ(sunTargetCoord.x, sunTargetCoord.y, sunTargetCoord.z);
			sunTarget.position.x = sunTargetPos.x;
			sunTarget.position.y = 0;
			sunTarget.position.z = sunTargetPos.z;
			OEV.scene.add(sunTarget);
			lightHemi = new THREE.HemisphereLight(0xffffbb, 0x3992e5, hemiIntensity);
			OEV.scene.add(lightHemi);
			lightAmbiant = new THREE.AmbientLight(0x111111);
			OEV.scene.add(lightAmbiant);
			lightSunTarget = new THREE.Mesh(new THREE.Geometry());
			lightSunTarget.position.x = api.posCenter.x;
			lightSunTarget.position.y = api.posCenter.y;
			lightSunTarget.position.z = api.posCenter.z;
			api.lightSun = new THREE.DirectionalLight(0xffffff, 0);
			api.lightSun.up = new THREE.Vector3(0, 1, 0);
			if (OEV.shadowsEnabled) {
				api.lightSun.castShadow = true;
				// api.lightSun.shadowDarkness = 1
				api.lightSun.shadow.camera.far = OEV.earth.radius * OEV.earth.globalScale;
				console.log('api.lightSun.shadow.camera.far', api.lightSun.shadow.camera.far);
				api.lightSun.shadow.camera.near = 1;
				api.lightSun.shadow.mapSize.width = 1024;
				api.lightSun.shadow.mapSize.height = 1024;
				api.lightSun.shadow.camera.left = (OEV.earth.radius * OEV.earth.globalScale) * -0.002;
				api.lightSun.shadow.camera.right = (OEV.earth.radius * OEV.earth.globalScale) * 0.002;
				api.lightSun.shadow.camera.top = (OEV.earth.radius * OEV.earth.globalScale) * 0.002;
				api.lightSun.shadow.camera.bottom = (OEV.earth.radius * OEV.earth.globalScale) * -0.002;
			}
			OEV.scene.add(api.lightSun);
			sunHelper = new THREE.DirectionalLightHelper(api.lightSun, 1000);
			api.initSunPos();
			if(api.cloudsActiv){
				api.makeClouds();
			}
			api.makeStars();
			api.setSunTime( 0.5 );
			
			
			OEV.earth.evt.addEventListener( 'CURTILE_CHANGED', api, api.onCurTileChanged );
			
			if (rainEnabled) {
				OEV.earth.evt.addEventListener( 'LOD_CHANGED', api, api.onLodChanged );
				api.onLodChanged();
			}
		}, 
		
		
		update : function() {
			if (destTime != api.normalizedTime) {
				var delta = destTime - api.normalizedTime;
				if (delta > 0) {
					api.normalizedTime += destTimeSpeed;
					if (api.normalizedTime > destTime) {
						api.normalizedTime = destTime;
					}
				} else {
					api.normalizedTime -= destTimeSpeed;
					if (api.normalizedTime < destTime) {
						api.normalizedTime = destTime;
					}
				}
				api.updateSun();
				
				if (destTime == api.normalizedTime) {
					debug( "sunTime END" );
					OEV.earth.walkRecorder.endCmdStep( "sunTime" );
				}
			}
			updateStarsPos();
		}, 
		
		
		initSunPos : function() {
			var sunPos = OEV.earth.coordToXYZ( 0, 0, OEV.earth.radius );
			api.lightSun.position.x = sunPos.x;
			api.lightSun.position.y = sunPos.y;
			api.lightSun.position.z = sunPos.z;
		},

		setSunTime : function(_time) {
			api.normalizedTime = _time;
			destTime = api.normalizedTime;
			api.updateSun();
		}, 	

		updateSun : function() {
			if( skyDome != undefined ){
				updateSkyDome();
			}
			if( api.lightSun != undefined ){
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
				if (OEV.earth.projection == "PLANE") {
					var sunPosX = api.posCenter.x - (Math.cos(sunRotation) * (OEV.earth.radius / 4));
					var sunPosY = api.posCenter.y + (Math.sin(sunRotation) * (OEV.earth.radius / 4));
					var sunPosZ = api.posCenter.z + (Math.sin(sunRotation) * (OEV.earth.radius / 8));
					lightSunTarget.position.x = api.posCenter.x;
					lightSunTarget.position.y = api.posCenter.y;
					lightSunTarget.position.z = api.posCenter.z;
					api.lightSun.color = sunCol;
					sunPoint.color = sunCol;
				}else{
					var sunPosX = OEV.camera.position.x;
					var sunPosY = OEV.camera.position.y;
					var sunPosZ = OEV.camera.position.z;
					lightSunTarget.position.x = 0;
					lightSunTarget.position.y = 0;
					lightSunTarget.position.z = 0;
				}
				api.lightSun.position.x = sunPosX;
				api.lightSun.position.y = sunPosY;
				api.lightSun.position.z = sunPosZ;
				sunPoint.position.x = sunPosX;
				sunPoint.position.y = sunPosY;
				sunPoint.position.z = sunPosZ;
				hemiIntensity = 0.35 - (0.3 * cos);
				
				lightHemi.intensity = hemiIntensity;
				lightHemi.color = sunCol;
				lightHemi.groundColor = new THREE.Color("rgb("+Math.round(200*cos)+","+Math.round(200*cos)+","+Math.round(255*cos)+")");
				lightHemi.position.x = sunPosX;
				lightHemi.position.y = sunPosY;
				lightHemi.position.z = sunPosZ;
				lightHemi.lookAt( new THREE.Vector3(api.posCenter.x, api.posCenter.y, api.posCenter.z));
				var sunBackCol = new THREE.Color("rgb("+rampColorFog.r+","+rampColorFog.g+","+rampColorFog.b+")");
				var spotAngle = Math.abs(api.normalizedTime - 0.5) + 0.5;
				spotAngle = (spotAngle - 0.5) * 3;
				sunLightBack.color = sunBackCol;
				sunLightBack.angle = spotAngle;
				sunLightBack.exponent = 20 - (spotAngle * 10);
				sunLightBack.position.x = sunPosX;
				sunLightBack.position.y = sunPosY;
				sunLightBack.position.z = sunPosZ;
				sunLightBackHelper.update();
				sunSpriteMat.color = new THREE.Color("rgb("+ Math.round(255 - cos * 1) +", "+ Math.round(255 - cos * 50) +", "+ Math.round(255 - cos * 150) +")");
				var sunSpriteScale = 1000 * OEV.earth.globalScale;
				sunSpriteObj.scale.x = sunSpriteScale;
				sunSpriteObj.scale.y = sunSpriteScale;
				sunSpriteObj.scale.z = sunSpriteScale;
				if (OEV.earth.projection == "PLANE"){
					var sunSpritePosX = api.posCenter.x - ( Math.cos(sunRotation) * (OEV.earth.radius * (skyDome.scale.x * 0.6)));
					var sunSpritePosY = api.posCenter.y + ( Math.sin(sunRotation) * (OEV.earth.radius * (skyDome.scale.x * 0.6)));
					var sunSpritePosZ = api.posCenter.z + ( Math.sin(sunRotation) * (OEV.earth.radius * (skyDome.scale.x * 0.6)));
				}else{
					var sunSpritePosX = Math.cos(api.normalizedTime * 2 * Math.PI) * (OEV.earth.radius * 1.1);
					var sunSpritePosY = 0;
					var sunSpritePosZ = Math.sin(api.normalizedTime * 2 * Math.PI) * (OEV.earth.radius * 1.1);
				}
				sunSpriteObj.position.x = sunSpritePosX;
				sunSpriteObj.position.y = sunSpritePosY;
				sunSpriteObj.position.z = sunSpritePosZ;
				if (api.cloudsActiv){
					pMaterial.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
				}
				OEV.earth.forestMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
				OEV.earth.vineyardMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
				OEV.earth.grassMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
				skyMat.emissive = new THREE.Color("rgb("+rampColorSky.r+","+rampColorSky.g+","+rampColorSky.b+")");
				if (fogActive) {
					OEV.scene.fog.color = new THREE.Color("rgb("+rampColorFog.r+","+rampColorFog.g+","+rampColorFog.b+")");
				}
				sunHelper.update();
				OEV.MUST_RENDER = true;
				api.evt.fireEvent("SUN_CHANGED");
			}
		},
		
		activAtmosphere : function(_state) {
			if (_state) {
				if (atmosphereMeshe == undefined) {
					var skyGeo = new THREE.SphereGeometry( OEV.earth.radius * 1.5, 32, 15 );
					var skyMat = new THREE.ShaderMaterial( 
					{
						uniforms: {  },
						vertexShader:   document.getElementById( 'vertAtmosphere'   ).textContent,
						fragmentShader: document.getElementById( 'fragAtmosphere' ).textContent,
						side: THREE.BackSide,
						blending: THREE.AdditiveBlending,
						transparent: true
					}   );
					atmosphereMeshe = new THREE.Mesh( skyGeo, skyMat );
				}
				OEV.scene.add(atmosphereMeshe);
			} else if (!_state && atmosphereMeshe != undefined) {
				OEV.scene.remove(atmosphereMeshe);
			}
		}, 
		
		activSky : function(_state) {
			if (_state) {
				if (skyDome == undefined){
					skyMat = new THREE.MeshPhongMaterial({ color: new THREE.Color("rgb(103,144,230)"), side: THREE.BackSide, fog:false});
					skyDome = new THREE.Mesh(new THREE.SphereGeometry( OEV.earth.radius * 0.8, 32, 15 ), skyMat);
				}
				OEV.scene.add(skyDome);
			} else if (!_state && skyDome != undefined){
				OEV.scene.remove(skyDome);
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
			
			stars.position.x = this.posCenter.x;
			stars.position.y = this.posCenter.y;
			stars.position.z = this.posCenter.z;
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
				pMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 800, map: OEV.textures['cloud'] });
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
			// create the particle system
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
			if (OEV.earth.curLOD == OEV.earth.LOD_STREET) {
				snowEmiter = new RainEmiter(api);
			}else if (snowEmiter != undefined) {
				snowEmiter.dispose();
				snowEmiter = undefined;
			}
		}, 
	};
	
	
	function updateStarsPos() {
		stars.position.x = api.posCenter.x;
		stars.position.y = api.posCenter.y;
		stars.position.z = api.posCenter.z;
	}
	
	function updateSkyDome() {
		skyDome.position.x = api.posCenter.x;
		skyDome.position.y = api.posCenter.y;
		skyDome.position.z = api.posCenter.z;
		var skyScale = api.globalScale;
		skyDome.scale.set( skyScale, skyScale, skyScale );
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
	
	return api;
})();


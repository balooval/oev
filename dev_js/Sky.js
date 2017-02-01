var Sky = function () {
	this.lightAmbiant = undefined;
	this.lightSun = undefined;
	this.lightSunTarget = undefined;
	this.sunSpriteMat = undefined;
	this.sunSpriteObj = undefined;
	this.sunHelper = undefined;
	this.sunTargetCoord = undefined;
	this.atmosphereMeshe = undefined;
	this.skyDome = undefined;
	this.skyMat = undefined;
	this.sunRotation = -1.5;
	this.animateSun = false;
	this.particleSystem = undefined;
	this.pMaterial = undefined;
	this.colorsGradient = undefined;
	this.normalizedTime = 0.5;
	this.sunLightBack = undefined;
	this.sunLightBackHelper = undefined;
	this.fogActive = true;
	
	this.lightHemi = undefined;
	this.hemiIntensity = 0.35;
	
	this.cloudsActiv = false;
	this.cloudsActiv = true;
	this.sunPoint = undefined;
	this.stars = null;
	this.starsMat = null;
	
	this.snowEmiter = undefined;
	
	this.destTime = this.normalizedTime;
	this.destTimeSpeed = 0.01;
	
	this.posCenter = new THREE.Vector3( 0, 0, 0 );
	this.globalScale = 1;
	
	this.rainEnabled = false;
	// this.rainEnabled = true;
	
	this.weatherEnabled = false;
	// this.weatherEnabled = true;
	
	this.evt = new Evt();
}


Sky.prototype.setDestTime = function( _time ) {
	if( _time != this.normalizedTime ){
		this.destTime = _time;
		return true;
	}
	return false;
}

Sky.prototype.update = function() {
	if( this.destTime != this.normalizedTime ){
		var delta = this.destTime - this.normalizedTime;
		if( delta > 0 ){
			this.normalizedTime += this.destTimeSpeed;
			if( this.normalizedTime > this.destTime ){
				this.normalizedTime = this.destTime;
			}
		}else{
			this.normalizedTime -= this.destTimeSpeed;
			if( this.normalizedTime < this.destTime ){
				this.normalizedTime = this.destTime;
			}
		}
		this.updateSun();
		
		if( this.destTime == this.normalizedTime ){
			debug( "sunTime END" );
			OEV.earth.walkRecorder.endCmdStep( "sunTime" );
		}
	}
	this.updateStarsPos();
}

Sky.prototype.moveClouds = function() {
	if( this.particleSystem != undefined ){
		this.particleSystem.scale.x -= 0.01;
		this.particleSystem.scale.y -= 0.01;
		this.particleSystem.scale.z -= 0.01;
	}
}

Sky.prototype.updateCloudsPos = function() {
	if( this.particleSystem != undefined ){
		this.particleSystem.position.x = this.posCenter.x;
		this.particleSystem.position.y = this.posCenter.y;
		this.particleSystem.position.z = this.posCenter.z;
		this.particleSystem.scale.x = OEV.earth.globalScale;
		this.particleSystem.scale.y = OEV.earth.globalScale;
		this.particleSystem.scale.z = OEV.earth.globalScale;
		this.pMaterial.size = 800 * OEV.earth.globalScale;
	}
	
	this.stars.position.x = this.posCenter.x;
	this.stars.position.y = this.posCenter.y;
	this.stars.position.z = this.posCenter.z;
	this.stars.scale.x = OEV.earth.globalScale;
	this.stars.scale.y = OEV.earth.globalScale;
	this.stars.scale.z = OEV.earth.globalScale;
	this.starsMat.size = 30 * OEV.earth.globalScale;
}

Sky.prototype.clearClouds = function() {
	if( this.particleSystem != undefined ){
		this.particleSystem.geometry.dispose();
		OEV.scene.remove( this.particleSystem );
		this.particleSystem = undefined;
	}
	this.cloudsActiv = false;
	OEV.MUST_RENDER = true;
}


Sky.prototype.updateStarsPos = function() {
	this.stars.position.x = this.posCenter.x;
	this.stars.position.y = this.posCenter.y;
	this.stars.position.z = this.posCenter.z;
}



Sky.prototype.makeStars = function() {
	var starsGeom = new THREE.Geometry();
	var angleH = 0;
	var angleV = 0;
	var dist = OEV.earth.radius * 0.75;
	var grounpNb = 20;
	var nbStars = 0;
	for( var i = 0; i < 200; i++ ){
		if( nbStars % grounpNb == 0 ){
			angleH = Math.random() * Math.PI;
			// angleV = Math.random() * Math.PI;
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
	this.starsMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 30, transparent: true, fog: false });
	this.stars = new THREE.Points( starsGeom, this.starsMat );
	this.stars.position.x = this.posCenter.x;
	this.stars.position.y = this.posCenter.y;
	this.stars.position.z = this.posCenter.z;
	OEV.scene.add( this.stars );
}



Sky.prototype.makeCloudsTest = function() {
	this.cloudsActiv = true;
	var ptDist = OEV.earth.radius * 0.8;
	var particleCount = 1000;
	var particles = new THREE.Geometry();
	if( this.pMaterial == undefined ){
		this.pMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 800, map: OEV.textures['cloud'] });
		this.pMaterial.alphaTest = 0.4;
		this.pMaterial.transparent = true;
	}

	var groupPos;
	var ptPos = new THREE.Vector3( 0, 0, 0 );
	var nbInGroup = 0;
	var groupHeight;
	var ptByGroup = 50;
	var groupLonSize;
	var groupLatSize;
	var groupAngle;
	for (var p = 0; p < particleCount; p++) {
		if( nbInGroup % ptByGroup == 0 ){
			// ptByGroup = Math.round( 30 + ( 20 * Math.random() ) );
			groupPos = new THREE.Vector2( ( Math.random() * 360 ) - 180, ( Math.random() * 160 ) - 80 );
			groupHeight = ( Math.random() * 20000 ) + 100000;
			groupAngle = 0;
			groupLonSize = 8;
			groupLatSize = 2;
		}
		nbInGroup ++;
		
		var curAngle = Math.random() * Math.PI;
		// var curAngle = 0;
		var curDist = Math.random() * 10;
		
		var pLon = groupPos.x + ( Math.cos( curAngle ) * ( Math.cos( groupAngle ) * curDist ) );
		var pLat = groupPos.y + ( Math.sin( curAngle ) * ( Math.sin( groupAngle ) * curDist ) );
		var pAlt = groupHeight + ( Math.random() * 200 ) - 100;
		var curCloudPos = OEV.earth.coordToXYZ( pLon, pLat, pAlt );
		
		var particle = new THREE.Vector3( curCloudPos.x, curCloudPos.y, curCloudPos.z );

		// add it to the geometry
		particles.vertices.push( particle );
	}

	// create the particle system
	this.particleSystem = new THREE.Points( particles, this.pMaterial );
	this.particleSystem.position.x = 0;
	this.particleSystem.position.y = 0;
	this.particleSystem.position.z = 0;
	OEV.scene.add( this.particleSystem );

	OEV.MUST_RENDER = true;
}


Sky.prototype.makeClouds = function() {
	this.cloudsActiv = true;
	var ptDist = OEV.earth.radius * 0.8;
	var particleCount = 1000;
	var particles = new THREE.Geometry();
	if( this.pMaterial == undefined ){
		this.pMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 800, map: OEV.textures['cloud'] });
		this.pMaterial.alphaTest = 0.4;
		this.pMaterial.transparent = true;
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

		// add it to the geometry
		particles.vertices.push( particle );
	}

	// create the particle system
	this.particleSystem = new THREE.Points( particles, this.pMaterial );
	this.particleSystem.position.x = this.posCenter.x;
	this.particleSystem.position.y = this.posCenter.y;
	this.particleSystem.position.z = this.posCenter.z;
	OEV.scene.add( this.particleSystem );

	OEV.MUST_RENDER = true;
}


Sky.prototype.construct = function() {
	if( this.fogActive ){
		OEV.scene.fog = new THREE.Fog( 0xc5d3ea, OEV.earth.radius , OEV.earth.radius * 2 );
	}
	this.colorsGradient = this.getImageData( OEV.textures['sky_gradient'].image );	
	this.sunPoint = new THREE.PointLight( 0xffffff, 1.0, OEV.earth.radius );
	OEV.scene.add( this.sunPoint );
	
	this.sunLightBack = new THREE.SpotLight( 0xffffff, 1, 0.0, 1.0, 20 );
	OEV.scene.add( this.sunLightBack );
	this.sunLightBackHelper = new THREE.SpotLightHelper( this.sunLightBack );

	this.sunSpriteMat = new THREE.SpriteMaterial( { map: OEV.textures['sun'], color: 0xffffff, blending: THREE.AdditiveBlending, fog: false } );
	this.sunSpriteObj = new THREE.Sprite( this.sunSpriteMat );
	var sunSpriteScale = 1000;
	this.sunSpriteObj.scale.x = sunSpriteScale;
	this.sunSpriteObj.scale.y = sunSpriteScale;
	this.sunSpriteObj.scale.z = sunSpriteScale;
	OEV.scene.add( this.sunSpriteObj );
	
	this.sunLightBack.target = this.sunSpriteObj;
	
	
	this.sunTargetCoord = new THREE.Vector3( 0, 0, 0 );
	
	var sunTargetGeo = new THREE.SphereGeometry( OEV.earth.meter * 100, 16, 7 ); 
	var debugMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
	this.sunTarget = new THREE.Mesh( sunTargetGeo, debugMat );
	var sunTargetPos = OEV.earth.coordToXYZ( this.sunTargetCoord.x, this.sunTargetCoord.y, this.sunTargetCoord.z );
	this.sunTarget.position.x = sunTargetPos.x;
	this.sunTarget.position.y = 0;
	this.sunTarget.position.z = sunTargetPos.z;
	OEV.scene.add( this.sunTarget );
	
	
	this.lightHemi = new THREE.HemisphereLight( 0xffffbb, 0x3992e5, this.hemiIntensity );
	OEV.scene.add( this.lightHemi );
	
	
	this.lightAmbiant = new THREE.AmbientLight( 0x111111 );
	OEV.scene.add( this.lightAmbiant );
	
	this.lightSunTarget = new THREE.Mesh( new THREE.Geometry() );
	this.lightSunTarget.position.x = this.posCenter.x;
	this.lightSunTarget.position.y = this.posCenter.y;
	this.lightSunTarget.position.z = this.posCenter.z;
	
	// this.lightSun = new THREE.DirectionalLight( 0xffffff, 1.1 );
	this.lightSun = new THREE.DirectionalLight( 0xffffff, 0 );
	// this.lightSun.target = this.lightSunTarget;
	// this.lightSun.target = OEV.camCtrl.pointer;
	this.lightSun.up = new THREE.Vector3( 0, 1, 0 );
	if( OEV.shadowsEnabled ){
		this.lightSun.castShadow = true;
		this.lightSun.shadowDarkness = 1
		this.lightSun.shadowCameraFar = OEV.earth.radius * OEV.earth.globalScale;
		this.lightSun.shadowCameraNear = 1;
		this.lightSun.shadowMapWidth = 2048;
		this.lightSun.shadowMapHeight = 2048;
		this.lightSun.shadowCameraLeft = ( OEV.earth.radius * OEV.earth.globalScale ) * -0.002;
		this.lightSun.shadowCameraRight = ( OEV.earth.radius * OEV.earth.globalScale ) * 0.002;
		this.lightSun.shadowCameraTop = ( OEV.earth.radius * OEV.earth.globalScale ) * 0.002;
		this.lightSun.shadowCameraBottom = ( OEV.earth.radius * OEV.earth.globalScale ) * -0.002;
	}
	OEV.scene.add( this.lightSun );
	this.sunHelper = new THREE.DirectionalLightHelper( this.lightSun, 1000 );
	// OEV.scene.add( this.sunHelper );
	
	this.initSunPos();
	if( this.cloudsActiv ){
		this.makeClouds();
	}
	this.makeStars();
	this.setSunTime( 0.5 );
	
	
	OEV.earth.evt.addEventListener( 'CURTILE_CHANGED', this, this.onCurTileChanged );
	
	
	if( this.rainEnabled ){
		OEV.earth.evt.addEventListener( 'LOD_CHANGED', this, this.onLodChanged );
		this.onLodChanged();
	}
}



Sky.prototype.onCurTileChanged = function() {
	if( this.weatherEnabled ){
		if( OEV.earth.CUR_ZOOM >= 11 ){
			var newTile = OEV.earth.coordsToTile( OEV.earth.coordDetails.x, OEV.earth.coordDetails.y, 11 );
			this.loadWeather( 11, newTile.x, newTile.y );
		}
	}
}



Sky.prototype.loadWeather = function( _zoom, _tileX, _tileY ) {
	debug( 'loadWeather ' + _zoom + ' / ' + _tileX + ' / ' + _tileY );
	OEV.earth.tilesWeatherMng.getDatas( this, _zoom+'/'+_tileX+'/'+_tileY, _tileX, _tileY, _zoom, 0 );
}

Sky.prototype.setWeather = function( _datas ) {
	debug( 'setWeather ' );
	debug( 'clouds: ' + _datas['clouds']['all'] );
	if( this.rainEnabled ){
		this.snowEmiter.setPercent( parseInt( _datas['clouds']['all'] ) );
	}
}


Sky.prototype.onLodChanged = function() {
	if( OEV.earth.curLOD == OEV.earth.LOD_STREET ){
		// this.snowEmiter = new SnowEmiter( this );
		this.snowEmiter = new RainEmiter( this );
	}else if( this.snowEmiter != undefined ){
		this.snowEmiter.dispose();
		this.snowEmiter = undefined;
	}
}



Sky.prototype.initSunPos = function() {
	var sunPos = OEV.earth.coordToXYZ( 0, 0, OEV.earth.radius );
	this.lightSun.position.x = sunPos.x;
	this.lightSun.position.y = sunPos.y;
	this.lightSun.position.z = sunPos.z;
}



Sky.prototype.activAtmosphere = function( _state ) {
	if( _state ){
		if( this.atmosphereMeshe == undefined ){
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
			this.atmosphereMeshe = new THREE.Mesh( skyGeo, skyMat );
		}
		OEV.scene.add( this.atmosphereMeshe );
	}else if( !_state && this.atmosphereMeshe != undefined ){
		OEV.scene.remove( this.atmosphereMeshe );
	}
}


Sky.prototype.activSky = function( _state ) {
	if( _state ){
		if( this.skyDome == undefined ){
			this.skyMat = new THREE.MeshPhongMaterial( { color: new THREE.Color("rgb(103,144,230)"), side: THREE.BackSide, fog:false } );
			this.skyDome = new THREE.Mesh( new THREE.SphereGeometry( OEV.earth.radius * 0.8, 32, 15 ), this.skyMat );
		}
		OEV.scene.add( this.skyDome );
	}else if( !_state && this.skyDome != undefined ){
		OEV.scene.remove( this.skyDome );
	}
}


Sky.prototype.updateSkyDome = function() {
	this.skyDome.position.x = this.posCenter.x;
	this.skyDome.position.y = this.posCenter.y;
	this.skyDome.position.z = this.posCenter.z;
	
	// var skyScale = this.globalScale / OEV.camCtrl.zoomCur;
	var skyScale = this.globalScale;
	
	this.skyDome.scale.set( skyScale, skyScale, skyScale );
	// this.skyDome.scale.set( this.globalScale, this.globalScale, this.globalScale );
}


Sky.prototype.setSunTime = function( _time ) {
	this.normalizedTime = _time;
	this.destTime = this.normalizedTime;
	
	
	this.updateSun();
}

Sky.prototype.updateSun = function() {
	if( this.skyDome != undefined ){
		this.updateSkyDome();
	}
	if( this.lightSun != undefined ){
		this.sunRotation = 2.0 + ( this.normalizedTime * 5 );
		
		var gradientValue = Math.round( ( Math.min( Math.max( this.normalizedTime, 0 ), 1 ) ) * 127 );
		var rampColorSky = this.getPixel( this.colorsGradient, 1, gradientValue );
		var rampColorClouds = this.getPixel( this.colorsGradient, 32, gradientValue );
		var rampColorLight = this.getPixel( this.colorsGradient, 60, gradientValue );
		var rampColorFog = this.getPixel( this.colorsGradient, 1, gradientValue );
		
		if( this.rainEnabled ){
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
		
		var cos = Math.abs( Math.cos( ( this.sunRotation / 2 ) - 0.75 ) ); 
		// normalizedTime 	: 	0 / 0.5 / 1
		// cos 				: 	1 / 0 / 1
		
		this.starsMat.opacity = cos;
		
		var sunCol = new THREE.Color("rgb("+rampColorLight.r+","+rampColorLight.g+","+rampColorLight.b+")");
		
		
		if( OEV.earth.projection == "PLANE" ){
			var sunPosX = this.posCenter.x - ( Math.cos( this.sunRotation ) * ( OEV.earth.radius / 4 ) );
			var sunPosY = this.posCenter.y + ( Math.sin( this.sunRotation ) * ( OEV.earth.radius / 4 ) );
			var sunPosZ = this.posCenter.z + ( Math.sin( this.sunRotation ) * ( OEV.earth.radius / 8 ) );
			
			this.lightSunTarget.position.x = this.posCenter.x;
			this.lightSunTarget.position.y = this.posCenter.y;
			this.lightSunTarget.position.z = this.posCenter.z;
			
			this.lightSun.color = sunCol;
			this.sunPoint.color = sunCol;
		
		}else{
			// var sunPosX = Math.cos( this.normalizedTime * 2 * Math.PI ) * ( OEV.earth.radius * 1.4 );
			// var sunPosY = 0;
			// var sunPosZ = Math.sin( this.normalizedTime * 2 * Math.PI ) * ( OEV.earth.radius * 1.4 );
			
			var sunPosX = OEV.camera.position.x;
			var sunPosY = OEV.camera.position.y;
			var sunPosZ = OEV.camera.position.z;
			
			this.lightSunTarget.position.x = 0;
			this.lightSunTarget.position.y = 0;
			this.lightSunTarget.position.z = 0;
		}
		
		
		this.lightSun.position.x = sunPosX;
		this.lightSun.position.y = sunPosY;
		this.lightSun.position.z = sunPosZ;
		
		// this.lightSunTarget.position.x = this.posCenter.x;
		// this.lightSunTarget.position.y = this.posCenter.y;
		// this.lightSunTarget.position.z = this.posCenter.z;
		
		
		this.sunPoint.position.x = sunPosX;
		this.sunPoint.position.y = sunPosY;
		this.sunPoint.position.z = sunPosZ;
		
		
		this.hemiIntensity = 0.35 - ( 0.3 * cos );
		
		this.lightHemi.intensity = this.hemiIntensity;
		this.lightHemi.color = sunCol;
		this.lightHemi.groundColor = new THREE.Color("rgb("+Math.round(200*cos)+","+Math.round(200*cos)+","+Math.round(255*cos)+")");
		
		
		this.lightHemi.position.x = sunPosX;
		this.lightHemi.position.y = sunPosY;
		this.lightHemi.position.z = sunPosZ;
		this.lightHemi.lookAt( new THREE.Vector3( this.posCenter.x, this.posCenter.y, this.posCenter.z ) );
		
		
		// var spotPosX = this.posCenter.x - ( Math.cos( this.sunRotation ) * ( OEV.earth.radius / 2 ) );
		// var spotPosY = this.posCenter.y + ( Math.sin( this.sunRotation ) * ( OEV.earth.radius / 2 ) );
		// var spotPosZ = this.posCenter.z + ( Math.sin( this.sunRotation ) * ( OEV.earth.radius / 4 ) );
		
		var sunBackCol = new THREE.Color("rgb("+rampColorFog.r+","+rampColorFog.g+","+rampColorFog.b+")");
		var spotAngle = ( Math.abs( this.normalizedTime - 0.5 ) + 0.5 );
		spotAngle = ( spotAngle - 0.5 ) * 3;
		this.sunLightBack.color = sunBackCol;
		this.sunLightBack.angle = spotAngle;
		this.sunLightBack.exponent = 20 - ( spotAngle * 10 );
		this.sunLightBack.position.x = sunPosX;
		this.sunLightBack.position.y = sunPosY;
		this.sunLightBack.position.z = sunPosZ;
		this.sunLightBackHelper.update();
		
		this.sunSpriteMat.color = new THREE.Color("rgb("+ Math.round( 255 - cos * 1 ) +", "+ Math.round( 255 - cos * 50 ) +", "+ Math.round( 255 - cos * 150 ) +")");
		
		var sunSpriteScale = 1000 * OEV.earth.globalScale;
		this.sunSpriteObj.scale.x = sunSpriteScale;
		this.sunSpriteObj.scale.y = sunSpriteScale;
		this.sunSpriteObj.scale.z = sunSpriteScale;
		
		
		if( OEV.earth.projection == "PLANE" ){
			var sunSpritePosX = this.posCenter.x - ( Math.cos( this.sunRotation ) * ( OEV.earth.radius * ( this.skyDome.scale.x * 0.6 ) ) );
			var sunSpritePosY = this.posCenter.y + ( Math.sin( this.sunRotation ) * ( OEV.earth.radius * ( this.skyDome.scale.x * 0.6 ) ) );
			var sunSpritePosZ = this.posCenter.z + ( Math.sin( this.sunRotation ) * ( OEV.earth.radius * ( this.skyDome.scale.x * 0.6 ) ) );
		}else{
			var sunSpritePosX = Math.cos( this.normalizedTime * 2 * Math.PI ) * ( OEV.earth.radius * 1.1 );
			var sunSpritePosY = 0;
			var sunSpritePosZ = Math.sin( this.normalizedTime * 2 * Math.PI ) * ( OEV.earth.radius * 1.1 );
		}
		
		
		this.sunSpriteObj.position.x = sunSpritePosX;
		this.sunSpriteObj.position.y = sunSpritePosY;
		this.sunSpriteObj.position.z = sunSpritePosZ;
		
		if( this.cloudsActiv ){
			this.pMaterial.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		}
		OEV.earth.forestMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		OEV.earth.vineyardMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		OEV.earth.grassMat.color = new THREE.Color("rgb("+rampColorClouds.r+","+rampColorClouds.g+","+rampColorClouds.b+")");
		this.skyMat.emissive = new THREE.Color("rgb("+rampColorSky.r+","+rampColorSky.g+","+rampColorSky.b+")");
		
		if( this.fogActive ){
			OEV.scene.fog.color = new THREE.Color("rgb("+rampColorFog.r+","+rampColorFog.g+","+rampColorFog.b+")");
		}
		
		this.sunHelper.update();
		
		OEV.MUST_RENDER = true;
		
		this.evt.fireEvent( "SUN_CHANGED" );
	}
}


Sky.prototype.getPixel = function( imagedata, x, y ) {
    var position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
    return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
}

Sky.prototype.getImageData = function( image ) {
	var canvas = document.createElement( 'canvas' );
    canvas.width = image.width;
    canvas.height = image.height;

    var context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0 );

    return context.getImageData( 0, 0, image.width, image.height );
}







var RainEmiter = function ( _sky ) {
	debug( 'RainEmiter' );
	this.sky = _sky;
	this.altitude = -30;
	this.maxParticleCount = 5000;
	this.partSpeed = [];
	var particles = new THREE.Geometry();
	this.pMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.4, map: OEV.textures['particleRain'] });
	this.pMaterial.alphaTest = 0.4;
	this.pMaterial.transparent = true;

	this.setPercent( 100 );
	
	this.wind = 0;
	
	OEV.addObjToUpdate( this );
}

RainEmiter.prototype.setPercent = function( _prct ) {
	
	if( this.particleSystem != undefined ){
		this.particleSystem.geometry.dispose();
		OEV.scene.remove( this.particleSystem );
	}
	
	var finalVertNb = Math.round( ( this.maxParticleCount * _prct ) / 100 );
	var particles = new THREE.Geometry();
	for (var p = 0; p < finalVertNb; p++) {
		this.partSpeed.push( Math.random() * 0.4 + 0.5 );
		var particle = this.getDropStartingPoint();
		particles.vertices.push( particle );
	}
	this.particleSystem = new THREE.Points( particles, this.pMaterial );
	this.particleSystem.position.x = this.sky.posCenter.x;
	this.particleSystem.position.y = this.altitude;
	this.particleSystem.position.z = this.sky.posCenter.z;
	OEV.scene.add( this.particleSystem );
}


RainEmiter.prototype.dispose = function() {
	OEV.scene.remove( this.particleSystem );
	this.pMaterial.dispose();
	OEV.removeObjToUpdate( this );
}


RainEmiter.prototype.getDropStartingPoint = function() {
	var pos = new THREE.Vector3( 0, 0, 0 );
	/*
	var angle = Math.random() * Math.PI * 2;
	var dist = Math.random() * 40;
	pos.x = Math.cos( angle ) * dist;
	pos.z = Math.sin( angle ) * dist;
	*/
	pos.x = Math.random() * ( 1 * 40 ) - 20;
	pos.z = Math.random() * ( 1 * 40 ) - 20;
	return pos;
}


RainEmiter.prototype.update = function() {
	this.particleSystem.position.x = OEV.camCtrl.posLookat.x;
	this.particleSystem.position.y = OEV.camCtrl.posLookat.y + this.altitude;
	this.particleSystem.position.z = OEV.camCtrl.posLookat.z;
	
	// this.wind += 0.005 + Math.random() * 0.005;
	this.wind += 0.002 + Math.random() * 0.008;
	var curWind = Math.cos( this.wind );
	
	var nb = this.particleSystem.geometry.vertices.length;
	for( var i = 0; i < nb; i ++ ){
		this.particleSystem.geometry.vertices[i].y += this.partSpeed[i] * ( Math.random() * 0.5 + 0.5 );
			this.particleSystem.geometry.vertices[i].x += curWind * 0.05;
		if( this.particleSystem.geometry.vertices[i].y > this.altitude * -1 ){
			
			var flakePos = this.getDropStartingPoint();
			this.particleSystem.geometry.vertices[i].x = flakePos.x;
			this.particleSystem.geometry.vertices[i].y = flakePos.y;
			this.particleSystem.geometry.vertices[i].z = flakePos.z;
			/*
			this.particleSystem.geometry.vertices[i].x = Math.random() * ( 1 * 40 ) - 20;
			this.particleSystem.geometry.vertices[i].y = 0;
			this.particleSystem.geometry.vertices[i].z = Math.random() * ( 1 * 40 ) - 20;
			*/
		}
	}
	this.particleSystem.geometry.verticesNeedUpdate = true;
	OEV.MUST_RENDER = true;
}





var SnowEmiter = function ( _sky ) {
	debug( 'SnowEmiter' );
	this.sky = _sky;
	this.altitude = -30;
	var maxParticleCount = 5000;
	this.partSpeed = [];
	var particles = new THREE.Geometry();
	this.pMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.2, map: OEV.textures['particleSnow'] });
	this.pMaterial.alphaTest = 0.4;
	this.pMaterial.transparent = true;

	var pos = new THREE.Vector3( 0, 0, 0 );
	for (var p = 0; p < maxParticleCount; p++) {
		this.partSpeed.push( Math.random() * 0.1 + 0.1 );
		/*
		var pX = pos.x + Math.random() * ( 1 * 40 ) - 20;
		var pY = pos.y;
		var pZ = pos.z + Math.random() * ( 1 * 40 ) - 20;
		
		var particle = new THREE.Vector3( pX, pY, pZ );
		*/
		var particle = this.getFlakeStartingPoint();
		particles.vertices.push( particle );
	}

	// create the particle system
	this.particleSystem = new THREE.Points( particles, this.pMaterial );
	this.particleSystem.position.x = this.sky.posCenter.x;
	this.particleSystem.position.y = this.altitude;
	this.particleSystem.position.z = this.sky.posCenter.z;
	OEV.scene.add( this.particleSystem );
	
	this.wind = 0;
	
	OEV.addObjToUpdate( this );
}

SnowEmiter.prototype.dispose = function() {
	OEV.scene.remove( this.particleSystem );
	this.pMaterial.dispose();
	OEV.removeObjToUpdate( this );
}


SnowEmiter.prototype.getFlakeStartingPoint = function() {
	var pos = new THREE.Vector3( 0, 0, 0 );
	// pos.x = Math.random() * ( 1 * 40 ) - 20;
	// pos.z = Math.random() * ( 1 * 40 ) - 20;
	
	var angle = Math.random() * Math.PI * 2;
	var dist = Math.random() * 40;
	pos.x = Math.cos( angle ) * dist;
	pos.z = Math.sin( angle ) * dist;
	return pos;
}


SnowEmiter.prototype.update = function() {
	this.particleSystem.position.x = OEV.camCtrl.posLookat.x;
	this.particleSystem.position.y = OEV.camCtrl.posLookat.y + this.altitude;
	this.particleSystem.position.z = OEV.camCtrl.posLookat.z;
	
	// this.wind += 0.005 + Math.random() * 0.005;
	this.wind += 0.002 + Math.random() * 0.008;
	var curWind = Math.cos( this.wind );
	
	var nb = this.particleSystem.geometry.vertices.length;
	for( var i = 0; i < nb; i ++ ){
		this.particleSystem.geometry.vertices[i].y += this.partSpeed[i] * ( Math.random() * 0.5 + 0.5 );
			this.particleSystem.geometry.vertices[i].x += curWind * 0.05;
		if( this.particleSystem.geometry.vertices[i].y > this.altitude * -1 ){
			
			var flakePos = this.getFlakeStartingPoint();
			this.particleSystem.geometry.vertices[i].x = flakePos.x;
			this.particleSystem.geometry.vertices[i].y = flakePos.y;
			this.particleSystem.geometry.vertices[i].z = flakePos.z;
			/*
			this.particleSystem.geometry.vertices[i].x = Math.random() * ( 1 * 40 ) - 20;
			this.particleSystem.geometry.vertices[i].y = 0;
			this.particleSystem.geometry.vertices[i].z = Math.random() * ( 1 * 40 ) - 20;
			*/
		}
	}
	this.particleSystem.geometry.verticesNeedUpdate = true;
	OEV.MUST_RENDER = true;
}
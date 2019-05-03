import Renderer from './oev/renderer.js';
import * as INPUT from './oev/input/input.js';
import GLOBE from './oev/globe.js';

let urlParams = [];
let htmlElmtLoadingDatas;
let lastTimeLoadingUpdated = 0;

export function initUi(){
	const elmtLoading = [
		'TILE2D', 
		'ELE', 
		'BUILDINGS', 
	];
	htmlElmtLoadingDatas = elmtLoading.map(id => document.getElementById('loading_' + id));
	document.getElementById( "contactLink" ).setAttribute('href', "mailto:val.poub@gmail.com");
	document.getElementById( "cfg_fog_near" ).addEventListener("input", onFogNearChanged );
	document.getElementById( "cfg_fog_far" ).addEventListener("input", onFogFarChanged );
	const domContainer = Renderer.domContainer();
	domContainer.addEventListener('mousedown',INPUT.Mouse.onMouseDown,false);
	domContainer.addEventListener('mouseup',INPUT.Mouse.onMouseUp,true);
	domContainer.addEventListener('contextmenu', function(e){e.preventDefault();}, true);
	if( location.hash != '' ){
		urlParams = location.hash.substr( location.hash.search( '=' ) + 1 ).split( '/' );
		if( urlParams[3] ){
			urlParams = urlParams[3].split( ',' );
			for( var p = 0; p < urlParams.length; p ++ ){
				console.log( 'param ' + p + ' : ' + urlParams[p] );
				if( urlParams[p] == 'buildings' ){
					Oev.Tile.Extension.activateExtension('BUILDINGS');
					document.getElementById( "cfg_load_buildings" ).checked = true;
				}else if( urlParams[p] == 'landuse' ){
					GLOBE.activLanduse( true );
					document.getElementById( "cfg_load_landuse" ).checked = true;
				}else if( urlParams[p] == 'elevation' ){
					GLOBE.activElevation( true );
					document.getElementById( "cfg_load_ele" ).checked = true;
				}
			}
		}
	}
}

function onFogNearChanged(){
	Renderer.scene.fog.near = ( ( ( GLOBE.radius / 4 ) * GLOBE.globalScale ) * ( this.value / 100 ) );
	if( Renderer.scene.fog.near > Renderer.scene.fog.far ){
		Renderer.scene.fog.far = Renderer.scene.fog.near;
	}
	Renderer.MUST_RENDER = true;
}

function onFogFarChanged(){
	Renderer.scene.fog.far = ( ( ( GLOBE.radius / 50 ) * GLOBE.globalScale ) * ( this.value / 100 ) );
	if( Renderer.scene.fog.far < Renderer.scene.fog.near ){
		Renderer.scene.fog.near = Renderer.scene.fog.far;
	}
	Renderer.MUST_RENDER = true;
}

export function updateLoadingDatas(_type, _nb){
	var curTime = OEV.clock.getElapsedTime();
	if (_nb > 0 && curTime - lastTimeLoadingUpdated <= 1) return false;
	lastTimeLoadingUpdated = curTime;
	htmlElmtLoadingDatas.filter(e => e.id == 'loading_' + _type).forEach(e => e.innerText = _nb + ' ' + _type + ' to load');
}
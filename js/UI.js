import Evt from './oev/event.js';
import * as INPUT from './oev/input/input.js';
import SKY from './oev/sky.js';
import GLOBE from './oev/globe.js';

let urlParams = [];
let htmlElmtLoadingDatas;
let lastTimeLoadingUpdated = 0;

export function initUi(){
	htmlElmtLoadingDatas = {
		'loading_OBJECTS' : document.getElementById( "loading_OBJECTS"), 
		'loading_TILE2D' : document.getElementById( "loading_TILE2D"), 
		'loading_ELE' : document.getElementById( "loading_ELE"), 
		'loading_MODELS' : document.getElementById( "loading_MODELS"), 
		'loading_BUILDINGS' : document.getElementById( "loading_BUILDINGS"), 
		'loading_SURFACE' : document.getElementById( "loading_SURFACE"), 
		'loading_NODES' : document.getElementById( "loading_NODES")
	};
	var elem = document.getElementsByName( "cfg_tile_layer" );
	for( var i = 0; i < elem.length; i ++ ){
		elem[i].addEventListener("click", changeTilesLayer );
	}
	document.getElementById( "contactLink" ).setAttribute('href', "mailto:val.poub@gmail.com");
	document.getElementById( "cfg_load_nodes" ).addEventListener("click", switchNodes );
	document.getElementById( "cfg_fog_near" ).addEventListener("input", onFogNearChanged );
	document.getElementById( "cfg_fog_far" ).addEventListener("input", onFogFarChanged );
	const domContainer = OEV.domContainer();
	domContainer.addEventListener('mousedown',INPUT.Mouse.onMouseDown,false);
	domContainer.addEventListener('mouseup',INPUT.Mouse.onMouseUp,true);
	domContainer.addEventListener('contextmenu', function(e){e.preventDefault();}, true);
	var elem = document.getElementsByClassName( "toolsBox" );
	for( var i = 0; i < elem.length; i ++ ){
		var title = elem[i].getElementsByTagName("h3")[0];
		if( title != undefined ){
			title.addEventListener("click", foldToolbox );
		}
	}
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

function foldToolbox(){
	var myIcon = document.getElementById( "expend_" + this.dataset.content );
	var myContent = document.getElementById( "toolsContent_" + this.dataset.content );
	setElementActiv([this, myContent, myIcon], !isElementActiv(myContent));
}

function isElementActiv( _elm ){
	if( _elm.className.indexOf( 'activ' ) < 0 ) return false;
	return true;
}

function setElementActiv( _elm, _state ){
	let elmArray;
	if( _elm.constructor === Array ){
		elmArray = _elm;
	}else{
		elmArray = [_elm];
	}
	elmArray.forEach(e => e.classList.toggle('activ', _state));
}

function onFogNearChanged(){
	OEV.scene.fog.near = ( ( ( GLOBE.radius / 4 ) * GLOBE.globalScale ) * ( this.value / 100 ) );
	if( OEV.scene.fog.near > OEV.scene.fog.far ){
		OEV.scene.fog.far = OEV.scene.fog.near;
	}
	OEV.MUST_RENDER = true;
}

function onFogFarChanged(){
	OEV.scene.fog.far = ( ( ( GLOBE.radius / 50 ) * GLOBE.globalScale ) * ( this.value / 100 ) );
	if( OEV.scene.fog.far < OEV.scene.fog.near ){
		OEV.scene.fog.near = OEV.scene.fog.far;
	}
	OEV.MUST_RENDER = true;
}

function changeTilesLayer(){
	GLOBE.setTilesProvider( this.value );
}

function switchNodes(){
	if( document.getElementById("cfg_load_nodes").checked ){
		GLOBE.activNodes( true );
	}else{
		GLOBE.activNodes( false );
	}
}

export function updateLoadingDatas(_type, _nb){
	var curTime = OEV.clock.getElapsedTime();
	if (curTime - lastTimeLoadingUpdated <= 1) return false;
	lastTimeLoadingUpdated = curTime;
	if (htmlElmtLoadingDatas['loading_' + _type] === undefined) {
		console.warn('not ', _type);
		return false;
	}
	htmlElmtLoadingDatas['loading_' + _type].innerHTML = _nb + " " + _type + " to load";
}
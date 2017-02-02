Oev.Input = (function(){
	'use strict';
	console.warn('Oev.Input.js');
	
	var mouseBtnLeftState = false;
	var mouseBtnMiddleState = false;
	var mouseBtnRightState = false;
	
	var api = {
		curMouseX : 0, 
		curMouseY : 0, 
		evt : new Oev.Utils.Evt(), 
		
		init : function() {
			// document.onmousemove = api.onMouseMove;
			document.addEventListener('mousewheel', api.onMouseWheel, false)
		}, 
		
		onMouseDown : function(evt) {
			var e = e || window.event;      
			var btnCode;
			if ('object' === typeof evt) {
				btnCode = evt.button;
				switch (btnCode) {
					case 0:
						mouseBtnLeftState = true;
						onMouseLeftClick();
						// UiObj.onMouseClick();
					break;
					case 1:
					   mouseBtnMiddleState = true;
					   // UiObj.onMouseClick();
					break;
					case 2:
						mouseBtnRightState = true;
						onMouseRightClick();
						// UiObj.onMouseClick();
					break;
					default:
						console.log('Unexpected code: ' + btnCode);
				}
			}
		}, 
		
		onMouseUp : function(evt) {
			var btnCode;
			if ('object' === typeof evt) {
				btnCode = evt.button;
				switch (btnCode) {
					case 0:
						mouseBtnLeftState = false;
						onMouseLeftUp();
						onMouseReleased();
					break;
					case 1:
						mouseBtnMiddleState = false;
						onMouseReleased();
					break;
					case 2:
						mouseBtnRightState = false;
						onMouseRightUp();
						onMouseReleased();
					break;
					default:
						console.log('Unexpected code: ' + btnCode);
				}
			}
		}, 
		
		onMouseMove : function(evt) {
			api.curMouseX = evt.clientX;
			api.curMouseY = evt.clientY;
		}, 
		
		onMouseWheel : function(evt) {
			var delta = evt.wheelDelta / 360;
			api.evt.fireEvent('MOUSE_WHEEL', [delta]);
			/*
			if( _value > 0 ){
				zoomIn( _value * 1 );
			}else{
				zoomOut( Math.abs( _value * 1 ) );
			}
			*/
		}, 
	};
	
	
	function onMouseClick() {
		/*
		if (mouseBtnLeftState == true) {
			var coordOnGround = OEV.checkMouseWorldPos();
			if (coordOnGround != undefined) {
				dragView = true;
				this.coordOnGround = coordOnGround;
				if (majActiv) {
					this.evt.fireEvent( 'ON_CLICK_GROUND' );
				}
			} else {
				dragSun = true;
			}
		}else if (mouseBtnRightState == true) {
			rotateView = true;
		}
		*/
	}
	function onMouseLeftClick() {
		api.evt.fireEvent('MOUSE_LEFT_DOWN');
	}
	function onMouseRightClick() {
		api.evt.fireEvent('MOUSE_RIGHT_DOWN');
	}
	
	function onMouseLeftUp() {
		api.evt.fireEvent('MOUSE_LEFT_UP');
	}
	function onMouseRightUp() {
		api.evt.fireEvent('MOUSE_RIGHT_UP');
	}
	
	function onMouseReleased(){
		// dragSun = false;
		// dragView = false;
		// rotateView = false;
		// showUICoords();
	}
	
	return api;
})();

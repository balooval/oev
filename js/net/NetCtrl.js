var NetCtrl = function () {
	this.socket = null;
	this.id = -1;
	this.remoteControlled = '';
	this.remoteControlling = '';
	this.users = {};
	this.oev = null;
	this.lastTimeSendCamPos = -1;
	this.console = document.getElementById( 'ws_status' );
}


NetCtrl.prototype.debug = function( _msg ) {
	this.console.innerHTML = _msg;
}

NetCtrl.prototype.updateUsersList = function( _oev ) {
	var html = '';
	for( var user in this.users ){
		if( this.users.hasOwnProperty( user ) ){
			var currentUserClass = '';
			if( this.id == this.users[user]['id'] ){
				currentUserClass = 'current_user';
			}
			/*
			var visibleName = this.users[user]['id'];
			if( this.users[user]['pseudo'] != '' ){
				visibleName = this.users[user]['pseudo'];
			}
			*/
			html += '<div onclick="OEV.netCtrl.openWsUserOptions(\''+this.users[user]['id']+'\');" class="ws_user_entry '+currentUserClass+'"><img src="img/ico_user.png" width="16" alt="user icon" title="utilisateur connecté"> ' + this.getUserName( this.users[user]['id'] ) + '</div>';
		}
	}
	document.getElementById( 'ws_users_list' ).innerHTML = html;
}

NetCtrl.prototype.setControllingRemote = function( _state, _uId ) {
	if( _state ){
		this.remoteControlling = _uId;
		var html = 'User ' + _uId + ' has accepted your remote control';
		showNotification( html );
		OEV.earth.evt.addEventListener( 'DATAS_TO_LOAD_CHANGED', this, this.onDatasToLoadChanged );
		Oev.Sky.evt.addEventListener( 'SUN_CHANGED', this, this.onSunChanged );
	}else{
		this.remoteControlling = '';
		var html = 'User ' + _uId + ' has rejected your remote control';
		showNotification( html );
		OEV.earth.evt.removeEventListener( 'DATAS_TO_LOAD_CHANGED', this, this.onDatasToLoadChanged );
		Oev.Sky.evt.removeEventListener( 'SUN_CHANGED', this, this.onSunChanged );
	}
}

NetCtrl.prototype.onSunChanged = function() {
	var msg = { 
		'type' : 'remoteCtrl', 
		'targetUID' : this.remoteControlling, 
		'step' : 'sunState', 
		'sunState' : Oev.Sky.normalizedTime 
	};
	this.send( JSON.stringify( msg ) );
}

NetCtrl.prototype.setRemoteSun = function( _remoteSunTime ) {
	Oev.Sky.setSunTime( _remoteSunTime );
}

NetCtrl.prototype.setRemoteDatasToLoad = function( _datasToLoad ) {
	OEV.earth.activElevation( _datasToLoad['elevation'] );
	OEV.earth.activBuildings( _datasToLoad['buildings'] );
	OEV.earth.activLanduse( _datasToLoad['landuses'] );
	OEV.earth.activNodes( _datasToLoad['nodes'] );
}

NetCtrl.prototype.onDatasToLoadChanged = function() {
	var msg = { 
		'type' : 'remoteCtrl', 
		'targetUID' : this.remoteControlling, 
		'step' : 'datasToLoad', 
		'datasState' : { 
			'elevation' : OEV.earth.eleActiv, 
			'buildings' : OEV.earth.loadBuildings, 
			'landuses' : OEV.earth.loadLanduse, 
			'nodes' : OEV.earth.loadNodes 
		}
	};
	this.send( JSON.stringify( msg ) );
}


NetCtrl.prototype.acceptRemoteCtrl = function( _uId ) {
	var msg = { 'type' : 'remoteCtrl', 'step' : 'accept', 'targetUID' : _uId };
	this.send( JSON.stringify( msg ) );
	this.users[this.id]['controlledByUid'] = _uId;
	this.remoteControlled = _uId;
	document.getElementById( 'threeContainer' ).classList.add( "controled" );
	closeModal();
}

NetCtrl.prototype.abortRemoteCtrl = function( _uId ) {
	var msg = { 'type' : 'remoteCtrl', 'step' : 'abort', 'targetUID' : _uId };
	this.send( JSON.stringify( msg ) );
	this.users[this.id]['controlledByUid'] = '';
	this.remoteControlled = '';
	document.getElementById( 'threeContainer' ).classList.remove( "controled" );
	closeModal();
}


NetCtrl.prototype.askUserControl = function( _uId ) {
	var msg = { 'type' : 'remoteCtrl', 'step' : 'ask', 'targetUID' : _uId };
	this.send( JSON.stringify( msg ) );
	showNotification( 'Waiting for user response ...' );
	closeModal();
}


NetCtrl.prototype.userChangePseudo = function( _uId, _pseudo ) {
	this.users[_uId]['pseudo'] = _pseudo;
	this.updateUsersList();
}


NetCtrl.prototype.getUserName = function( _uId ) {
	var name = this.users[_uId]['id'];
	if( this.users[_uId]['pseudo'] != '' ){
		name = this.users[_uId]['pseudo'];
	}
	return name;
}


NetCtrl.prototype.setPseudo = function() {
	var msg = { 'type' : 'setPseudo', 'pseudo' : document.getElementById( 'ws_pseudo_field' ).value };
	this.send( JSON.stringify( msg ) );
}

NetCtrl.prototype.openWsUserOptions = function( _uId ) {
	var html = '<img src="img/ico_user.png" alt="user icon">';
	if( this.id == _uId ){
		html += '<h3>You : ' + _uId + '</h3>';
		html += '<input type="text" id="ws_pseudo_field" placeholder="change your name"> <input type="submit" onclick="OEV.netCtrl.setPseudo();" value="save"><br><br>';
		
		if( this.remoteControlled != ''  ){
			html += 'Controlled by user '+ this.getUserName( this.remoteControlled ) +' <input type="submit" onclick="OEV.netCtrl.abortRemoteCtrl( \'' + this.remoteControlled + '\' )" value="Stop remote control"><br>';
		}
	}else{
		html += '<h3>' + this.getUserName( _uId ) + '</h3>';
		if( _uId == this.id && this.remoteControlled != ''  ){
			html += 'Controlled by user '+ this.remoteControlled +' <input type="submit" onclick="OEV.netCtrl.abortRemoteCtrl( \'' + this.remoteControlled + '\' )" value="Stop remote control"><br>';
		}
		html += '<input type="submit" onclick="OEV.netCtrl.askUserControl( \'' + _uId + '\' );" value="Remote control">';
	}
	openModal( html );
}


NetCtrl.prototype.init = function( _oev ) {
	this.oev = _oev;
	// this.oev.camCtrl.evt.addEventListener( "STOP_DRAG", this, this.onStopDrag );
	this.oev.camCtrl.evt.addEventListener( "CAM_UPDATED", this, this.onCamUpdated );
	
	this.host = "ws://ns378984.ip-5-196-69.eu:9000/echobot";
	var _self = this;
	try {
		this.socket = new WebSocket( this.host );
		this.debug( 'NetCtrl - status '+ this.socket.readyState );
		this.socket.onopen = function( msg ) {
			_self.debug( 'Connected' ); 
		};
		this.socket.onmessage = function( msg ){
			_self.onMessage( msg );
		};
		this.socket.onclose   = function( msg ){
			_self.debug( "onmessage.onclose - status "+ _self.socket.readyState );
		};
	}catch( ex ){ 
		this.debug( 'NetCtrl.init error : ' + ex );
	}
	
	document.getElementById( 'ws_chat_form' ).addEventListener( 'submit', onPostChatMsg );
}

NetCtrl.prototype.chatReceiveMsg = function( _msg, _fromUID ){
	var newMsg;
	if( _fromUID == this.id ){
		newMsg = '<div class="current_user">YOU : ' + _msg + '</div>';
	}else{
		newMsg = '<div>' + this.getUserName( _fromUID ) + ' : ' + _msg + '</div>';
	}
	var chatBox = document.getElementById( 'ws_chat_histo' );
	chatBox.innerHTML += newMsg;
	chatBox.scrollTop = chatBox.scrollHeight;
}

NetCtrl.prototype.chatSendMsg = function( _msg ){
	if( _msg != '' ){
		var msg = { 
			'type' : 'chatNewMsg', 
			'msg' : _msg
		};
		this.send( JSON.stringify( msg ) );
	}
}


NetCtrl.prototype.onCamUpdated = function(){
	// var d = new Date();
	// var curTime = d.getTime();
	// if( curTime - this.lastTimeSendCamPos > 500 ){
		// this.lastTimeSendCamPos = curTime;
		this.sendCamPosition();
	// }
}

NetCtrl.prototype.removeUser = function( _id ){
	if( this.users[_id]['mesh'] != undefined ){
		this.users[_id]['mesh'].geometry.dispose();
		this.users[_id]['mesh'].material.dispose();
		this.oev.scene.remove( this.users[_id]['mesh'] );
	}
	this.users[_id] = undefined;
	delete this.users[_id];
	this.oev.MUST_RENDER = true;
	this.updateUsersList();
}
	
NetCtrl.prototype.addUser = function( _id, _pseudo ){
	// this.debug( 'addUser ' + _id );
	this.users[_id] = { 
		'id' : _id, 
		'pseudo' : _pseudo, 
		'coords' : new THREE.Vector3( 0, 0, 0 ), 
		'mesh' : undefined, 
		'controlledByUid' : ''
	};
	
	
	if( this.id != _id ){
		
		var userMeshe = new THREE.Sprite( OEV.userMat );
		
		var wpScale = 50;
		userMeshe.scale.x = wpScale;
		userMeshe.scale.y = wpScale;
		userMeshe.scale.z = wpScale;
		
		/*
		var userMeshe = new THREE.Mesh( new THREE.SphereGeometry( this.oev.earth.meter * 200000, 16, 7 ), new THREE.MeshBasicMaterial({ color: 0xff0000 }) );
		*/
		userMeshe.position.x = 0;
		userMeshe.position.y = 0;
		userMeshe.position.z = 0;
		this.users[_id]['mesh'] = userMeshe;
		this.oev.scene.add( userMeshe );
	}
	
	this.updateUsersList();
}

NetCtrl.prototype.updateUserPos = function( _id, _pos ){
	// this.debug( 'updateUserPos ' + _id + ' / ' + _pos['z'] );
	if( _id != this.id ){
		this.users[_id]['coords'].x = _pos['x'];
		this.users[_id]['coords'].y = _pos['y'];
		this.users[_id]['coords'].z = _pos['z'];
		
		var pos = OEV.earth.coordToXYZ( this.users[_id]['coords'].x, this.users[_id]['coords'].y, 0 );
		this.users[_id]['mesh'].position.x = pos.x;
		// this.users[_id]['mesh'].position.y = pos.y;
		this.users[_id]['mesh'].position.y = -this.users[_id]['coords'].z;
		this.users[_id]['mesh'].position.z = pos.z;
		this.oev.MUST_RENDER = true;
	}
}

NetCtrl.prototype.updateCamControlled = function( _cameraValues ){
	this.oev.camCtrl.setLookAt( _cameraValues['coordLookat']['x'], _cameraValues['coordLookat']['y'] );
	// this.oev.camCtrl.coordLookat.x = _cameraValues['coordLookat']['x'];
	// this.oev.camCtrl.coordLookat.y = _cameraValues['coordLookat']['y'];
	// this.oev.camCtrl.coordLookat.z = _cameraValues['coordLookat']['z'];
	
	this.oev.camCtrl.camRotation.x = _cameraValues['camRotation']['x'];
	this.oev.camCtrl.camRotation.y = _cameraValues['camRotation']['y'];
	
	this.oev.camCtrl.setCurZoom( _cameraValues['zoom'] );
	
	// this.oev.camCtrl.updateCamera();
}

NetCtrl.prototype.sendCamPosition = function(){
	var msg = { 
		'type' : 'camPos', 
		'position' : { 
			'x' : this.oev.camCtrl.coordCam.x, 
			'y' : this.oev.camCtrl.coordCam.y, 
			'z' : this.oev.camCtrl.coordCam.z 
		} , 
		'cameraValues' : {
			'zoom' : this.oev.camCtrl.zoomCur, 
			'coordLookat' : {
				'x' : this.oev.camCtrl.coordLookat.x, 
				'y' : this.oev.camCtrl.coordLookat.y, 
				'z' : this.oev.camCtrl.coordLookat.z 
			}, 
			'camRotation' : {
				'x' : this.oev.camCtrl.camRotation.x, 
				'y' : this.oev.camCtrl.camRotation.y 
			}
		}
	};
	// console.log( msg );
	this.send( JSON.stringify( msg ) );
}



NetCtrl.prototype.onMessage = function( _msg ){
	// debug( '--------- NetCtrl.onMessage' );
	var datas = JSON.parse( _msg.data );
	if( datas['type'] == 'USERS_LIST' ){
		// debug( 'USERS_LIST' );
		this.id = datas['myId'];
		// this.debug( 'this.id : ' + this.id );
		for( var i = 0; i < datas['users'].length; i ++ ){
			if( this.users[datas['users'][i]['id']] == undefined ){
				this.addUser( datas['users'][i]['id'], datas['users'][i]['pseudo'] );
				this.updateUserPos( datas['users'][i]['id'], datas['users'][i]['pos'] );
			}
		}
		this.updateUsersList();
		this.sendCamPosition();
	}else if( datas['type'] == 'NEW_USER' ){
		// this.debug( 'NEW_USER' );
		this.addUser( datas['usersId'], datas['userPseudo'] );
	}else if( datas['type'] == 'REMOVE_USER' ){
		// this.debug( 'REMOVE_USER' );
		this.removeUser( datas['usersId'] );
	}else if( datas['type'] == 'CAM_POS' ){
		if( this.remoteControlled == datas['userId'] ){
			this.updateCamControlled( datas['cameraValues'] );
		}else{
			// debug( 'updateUserPos ' + datas['userId'] );
			this.updateUserPos( datas['userId'], datas['position'] );
		}
		
	}else if( datas['type'] == 'REMOTE_CTRL' ){
		if( datas['step'] == 'ask' ){
			var html = '<h3>Remote control</h3>';
			html += 'Accept remote control from user ' + datas['fromUID'] + ' ?<br>';
			html += '<input type="submit" onclick="OEV.netCtrl.acceptRemoteCtrl( \'' + datas['fromUID'] + '\' )" value="Accept"> <input type="submit" onclick="OEV.netCtrl.abortRemoteCtrl( \'' + datas['fromUID'] + '\' )" value="Refuse">';
			openModal( html );
		}else if( datas['step'] == 'abort' ){
			this.setControllingRemote( false, datas['fromUID'] );
		}else if( datas['step'] == 'accept' ){
			this.setControllingRemote( true, datas['fromUID'] );
		}else if( datas['step'] == 'datasToLoad' ){
			this.setRemoteDatasToLoad( datas['datasState'] );
		}else if( datas['step'] == 'sunState' ){
			this.setRemoteSun( datas['sunState'] );
		}
	}else if( datas['type'] == 'CHAT_NEW_MSG' ){
		this.chatReceiveMsg( datas['msg'], datas['fromUID'] );
	
	}else if( datas['type'] == 'USER_SET_PSEUDO' ){
		this.userChangePseudo( datas['fromUID'], datas['pseudo'] );
	}
}


NetCtrl.prototype.send = function( _msg ){
	try{
		this.socket.send( _msg );
	}catch(ex){
		this.debug( 'NetCtrl.send error : ' + ex );
	}
}
NetCtrl.prototype.quit = function(){
	if ( this.socket != null) {
		this.debug( 'NetCtrl.quit' );
		this.socket.close();
		this.socket = null;
	}
}

NetCtrl.prototype.reconnect = function() {
	this.quit();
	this.init();
}
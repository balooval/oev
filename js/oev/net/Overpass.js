Oev.Net.Overpass = (function(){
	'use strict';
	
	var nodeType = 'pylone';
	
	var servers = [
		'http://www.overpass-api.de/api', 
		'http://api.openstreetmap.fr/oapi/interpreter/'
	];
	
	
	var waitings = [];
	var isLoading = false;
	
	var api = {
		send : function(_tile, _datas) {
			var xhr = new XMLHttpRequest();
			xhr.open("POST", 'libs/remoteImg.php?sendOverpass', true);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.onreadystatechange = function() {
				if(xhr.readyState == 4) {
					if (xhr.status == 200) {
						console.log('send response', xhr.responseText);
					} else {
						console.log('send error', xhr.responseText);
					}
				}
			}
			xhr.send(JSON.stringify({
				type : nodeType, 
				tile : {
					x : _tile.tileX, 
					y : _tile.tileY, 
					z : _tile.zoom
				}, 
				response : _datas, 
			}));
		}, 
		
		load : function(_tile, _callback) {
			waitings.push({
				tile : _tile, 
				callback : _callback, 
			});
			// console.log('waitings', waitings.length);
			loadNext();
		}
	};
	
	function loadNext() {
		if (isLoading) {
			return false;
		}
		if (waitings.length == 0) {
			return false;
		}
		isLoading = true;
		var coords = extractCoords(waitings[0].tile);
		var coordStr = coords.south + ','+ coords.east + ',' + coords.north + ',' + coords.west;
		var query = buildQuery(coordStr);
		fetch(query)
		.then(function(response) {
			return response.json();
		})
		.then(function(json) {
			console.log('loaded', json.elements.length);
			var loaded = waitings.shift();
			loaded.callback(json.elements);
			isLoading = false;
			loadNext();
		});
	}
	
	function extractCoords(_tile) {
		var coords = {
			north : _tile.startCoord.y, 
			south : _tile.endCoord.y, 
			west : _tile.endCoord.x,
			east : _tile.startCoord.x, 
		};
		return coords;
	}
	
	function buildQuery(_coordStr) {
		var query = getServer() + '/interpreter?data=[out:json];(node(' + _coordStr + ')["power"="tower"];);out;';
		return query;
	}
	
	function getServer() {
		var id = Math.floor(Math.random() * servers.length);
		return servers[id];
	}
	
	return api;
})();
Oev.Net.OverpassProxy = (function(){
	'use strict';
	
	var waitings = [];
	
	var isLoading = false;
	
	var servers = [
		'http://www.overpass-api.de/api', 
		'http://api.openstreetmap.fr/oapi/interpreter/'
	];
	
	var typeSearchs = {
		pylone : ['"power"="tower"'], 
		tree : ['"natural"="tree"'], 
		eolienne : ['"power"="generator"', '"generator:source"="wind"'], 
	};
	
	var api = {
		abort : function(_tile, _nodeType) {
			for (var i = 1; i < waitings.length; i ++) { // start at 1 : 0 is loading
				if (waitings[i].tile == _tile && waitings[i].nodeType == _nodeType) {
					waitings.splice(i, 1);
					return true;
				}
			}
			return false;
		}, 
		
		send : function(_tile, _datas, _nodesType) {
			var xhr = new XMLHttpRequest();
			xhr.open("POST", 'libs/remoteImg.php?sendOverpass', true);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.onreadystatechange = function() {
				if(xhr.readyState == 4) {
					if (xhr.status == 200) {
						var responseJson = JSON.parse(xhr.response);
						console.log('Cache upload :', responseJson.success);
					} else {
						console.log('Cache upload error :', xhr.responseText);
					}
				}
			}
			xhr.send(JSON.stringify({
				type : _nodesType, 
				tile : {
					x : _tile.tileX, 
					y : _tile.tileY, 
					z : _tile.zoom
				}, 
				response : _datas, 
			}));
		}, 
		
		load : function(_tile, _callback, _nodeType) {
			waitings.push({
				tile : _tile, 
				callback : _callback, 
				nodeType : _nodeType, 
			});
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
		var query = buildQuery(waitings[0]);
		fetch(query)
		.then(function(response) {
			return response.json();
		})
		.then(function(json) {
			console.log('loaded', json.elements.length, ' nodes');
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
	
	function buildQuery(_waiting) {
		var coords = extractCoords(_waiting.tile);
		var coordStr = coords.south + ','+ coords.east + ',' + coords.north + ',' + coords.west;
		var subQuery = '';
		var search = typeSearchs[_waiting.nodeType];
		for (var i = 0; i < search.length; i ++) {
			subQuery += 'node(' + coordStr + ')[' + search[i] + '];';
		}
		var query = getServer() + '/interpreter?data=[out:json];(' + subQuery + ');out;';
		return query;
	}

	function getServer() {
		var id = Math.floor(Math.random() * servers.length);
		return servers[id];
	}
	
	return api;
})();
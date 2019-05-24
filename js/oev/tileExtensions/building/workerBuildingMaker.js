importScripts('./Earcut.js');
importScripts('../../../libs/simplify.js');

onmessage = function(_msg) {
	let buildings = _msg.data.buildingsDatas;
	if (_msg.data.bbox) {
		buildings = buildings.filter(b => bboxContainCoord(_msg.data.bbox, b.centroid));
	}
	buildings = buildings.filter(b => b.coords.length > 2);
	const wallsDatas = prepareWallsGeometry(buildings);
	const roofsDatas = prepareRoofsGeometry(buildings);
	postMessage({
		tileKey : _msg.data.tileKey, 
		result : {
			wallsBuffers : wallsDatas, 
			roofsBuffers : roofsDatas, 
		}, 
	});
}

function averagePos(_coords) {
	let lons = _coords.reduce((prev, cur) => prev + cur[0], 0);
	let lats = _coords.reduce((prev, cur) => prev + cur[1], 0);
	return [
		lons / _coords.length, 
		lats / _coords.length, 
	]
}

function prepareRoofPyramidal(_building) {
	console.log('prepareRoofPyramidal');
	const facesIndex = [];
	const centerId = _building.coords.length;
	let lastVertId = _building.coords.length - 1;
	_building.coords.forEach((coord, i) =>{
		facesIndex.push(lastVertId);
		facesIndex.push(i);
		facesIndex.push(centerId);
		lastVertId = i;
	});
	_building.coords.push(averagePos(_building.coords));
	const buildingNbVert = _building.coords.length;
	const bufferFaces = new Uint32Array(facesIndex.length);
	const bufferCoord = new Float32Array(buildingNbVert * 3);
	let bufferFaceIndex = 0;
	const colorVertices = [];
	for (let f = 0; f < facesIndex.length; f ++) {
		bufferFaces[bufferFaceIndex] = facesIndex[f];
		bufferFaceIndex ++;
	}
	const minAlt = _building.props.minAlt;
	const floorsNb = _building.props.floorsNb;
	const floorHeight = _building.props.floorHeight;
	let roofAlt = minAlt + (floorsNb * floorHeight)
	let bufferVertIndex = 0;
	for (let v = 0; v < buildingNbVert; v ++) {
		bufferCoord[bufferVertIndex + 0] = _building.coords[v][0];
		bufferCoord[bufferVertIndex + 1] = _building.coords[v][1];
		if (v == buildingNbVert - 1) roofAlt += _building.props.roofHeight;
		bufferCoord[bufferVertIndex + 2] = roofAlt;
		bufferVertIndex += 3;
		colorVertices.push(..._building.props.roofColor);
	}
	return {
		verticesNb : buildingNbVert, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function prepareRoofFlat(_building) {
	const buildingNbVert = _building.coords.length;
	const roofCoords = _building.coords.flat();
	const facesIndex = earcut(roofCoords);
	const bufferFaces = new Uint32Array(facesIndex.length);
	const bufferCoord = new Float32Array(buildingNbVert * 3);
	let bufferFaceIndex = 0;
	const colorVertices = [];
	for (let f = 0; f < facesIndex.length; f ++) {
		bufferFaces[bufferFaceIndex] = facesIndex[f];
		bufferFaceIndex ++;
	}
	const minAlt = _building.props.minAlt;
	const floorsNb = _building.props.floorsNb;
	const floorHeight = _building.props.floorHeight;
	const roofAlt = minAlt + (floorsNb * floorHeight)
	let bufferVertIndex = 0;
	for (let v = 0; v < buildingNbVert; v ++) {
		bufferCoord[bufferVertIndex + 0] = _building.coords[v][0];
		bufferCoord[bufferVertIndex + 1] = _building.coords[v][1];
		bufferCoord[bufferVertIndex + 2] = roofAlt;
		bufferVertIndex += 3;
		colorVertices.push(..._building.props.roofColor);
	}
	return {
		verticesNb : buildingNbVert, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function prepareRoofsGeometry(_buildings) {
	
	if (_buildings.length == 0) return null;
	const centroids = [];
	const buffers = [];
	for (let b = 0; b < _buildings.length; b ++) {
		const curBuilding = _buildings[b];
		centroids.push(curBuilding.centroid);
		let roofBuffers;
		if (curBuilding.props.roofShape == 'pyramidal') {
			roofBuffers = prepareRoofPyramidal(curBuilding);
		} else {
			roofBuffers = prepareRoofFlat(curBuilding);
		}
		buffers.push(roofBuffers);
	}
	return {
		buildingNb : _buildings.length, 
		centroids : centroids, 
		buffers : buffers, 
	};

	/*
	if (_buildings.length == 0) return null;
	let nbVertRoof = 0;
	let nbFaces = 0;
	const roofFacesIndex = [];
	const verticesNbs = [];
	const centers = [];
	for (let b = 0; b < _buildings.length; b ++) {
		const curBuilding = _buildings[b];
		centers.push(curBuilding.centroid);
		const buildingNbVert = curBuilding.coords.length + curBuilding.holesCoords.length;
		verticesNbs.push(buildingNbVert);
		nbVertRoof += buildingNbVert;
		const roofCoords = curBuilding.coords.flat();
		const roofHolesCoords = curBuilding.holesCoords.flat();
		const facesIndex = earcut(roofCoords.concat(roofHolesCoords), curBuilding.holesIndex);
		nbFaces += facesIndex.length;
		roofFacesIndex.push(facesIndex);
	}
	const bufferFaces = new Uint32Array(nbFaces);
	const bufferCoord = new Float32Array(nbVertRoof * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	const colorVertices = [];
	for (let b = 0; b < _buildings.length; b ++) {
		const curBuilding = _buildings[b];
		const minAlt = curBuilding.props.minAlt;
		const floorsNb = curBuilding.props.floorsNb;
		const floorHeight = curBuilding.props.floorHeight;
		const roofAlt = minAlt + (floorsNb * floorHeight)
		for (let f = 0; f < roofFacesIndex[b].length; f ++) {
			bufferFaces[bufferFaceIndex] = roofFacesIndex[b][f] + (bufferVertIndex / 3);
			bufferFaceIndex ++;
		}
		const roofCoords = curBuilding.coords.concat(curBuilding.holesCoords);
		for (let v = 0; v < verticesNbs[b]; v ++) {
			bufferCoord[bufferVertIndex + 0] = roofCoords[v][0];
			bufferCoord[bufferVertIndex + 1] = roofCoords[v][1];
			bufferCoord[bufferVertIndex + 2] = roofAlt;
			bufferVertIndex += 3;
			colorVertices.push(...curBuilding.props.roofColor);
		}
	}
	return {
		buildingNb : _buildings.length, 
		centroids : centers, 
		verticesNbs : verticesNbs, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
	*/
}

function prepareWallsGeometry(_buildings) {
	if (_buildings.length == 0) return null;
	const walls = _buildings.filter(b => {
		if (!b.props.wall) return true;
		if (b.props.wall == 'no') return false;
		return true;
	});
	let nbVertWall = 0;
	let nbFaces = 0;
	const centers = [];
	const verticesNbs = [];
	walls.forEach(building => {
		centers.push(building.centroid);
		let buildingCoordNb = building.coords.length;
		const buildingNbVert = buildingCoordNb * (building.props.floorsNb + 1);
		verticesNbs.push(buildingNbVert);
		nbVertWall += buildingNbVert;
		nbFaces += (buildingCoordNb * 2) * building.props.floorsNb;
	});
	const bufferCoord = new Float32Array(nbVertWall * 3);
	const bufferFaces = new Uint32Array(nbFaces * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	let pastFaceNb = 0;
	const colorVertices = [];
	walls.forEach(building => {
		let buildingCoordNb = building.coords.length;
		fondationsEle = 0;
		if (building.props.minAlt == 0) fondationsEle = -10;
		for (let floor = 0; floor < building.props.floorsNb + 1; floor ++) {
			for (let c = 0; c < buildingCoordNb; c ++) {
				colorVertices.push(...building.props.wallColor);
				if (floor > 0) {
					const faceTopLeft = buildingCoordNb + c;
					const faceBottomLeft = c;
					let faceBottomRight = c + 1;
					let faceTopRight = faceBottomRight + buildingCoordNb;
					if (faceBottomRight >= buildingCoordNb) {
						faceBottomRight = 0;
						faceTopRight = buildingCoordNb;
					}
					const tmp = (floor - 1) * buildingCoordNb;
					bufferFaces[bufferFaceIndex + 0] = faceTopLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 1] = faceBottomLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 2] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 3] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 4] = faceTopRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 5] = faceTopLeft + pastFaceNb + tmp;
					bufferFaceIndex += 6;
				}
				bufferCoord[bufferVertIndex + 0] = building.coords[c][0];
				bufferCoord[bufferVertIndex + 1] = building.coords[c][1];
				bufferCoord[bufferVertIndex + 2] = fondationsEle + building.props.minAlt + (floor * building.props.floorHeight);
				bufferVertIndex += 3;
			}
			fondationsEle = 0;
		}
		pastFaceNb += buildingCoordNb * (building.props.floorsNb + 1);
	});
	return {
		buildingNb : walls.length, 
		centroids : centers, 
		verticesNbs : verticesNbs, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function bboxContainCoord(_bbox, _coord) {
	if (_coord[0] < _bbox.minLon) return false;
	if (_coord[0] > _bbox.maxLon) return false;
	if (_coord[1] > _bbox.maxLat) return false;;
	if (_coord[1] < _bbox.minLat) return false;
	return true;
}
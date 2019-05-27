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
	const bufferFaces = Uint32Array.from(facesIndex);
	const bufferCoord = new Float32Array(buildingNbVert * 3);
	const colorVertices = [];
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


function prepareRoofDome(_building) {
	const coordCenter = averagePos(_building.coords);
	const directionToCenter = _building.coords.map(coord =>{
		const dist = Math.sqrt(Math.pow(coordCenter[0] - coord[0], 2) + Math.pow(coordCenter[1] - coord[1], 2));
		const angle = Math.atan2(coordCenter[1] - coord[1], coordCenter[0] - coord[0]);
		return {
			dist : dist, 
			cos : Math.cos(angle), 
			sin : Math.sin(angle), 
		}
	});
	const slicesVertices = [];
	slicesVertices.push(_building.coords);
	const sliceNb = 4;
	const angleStep = (Math.PI / 2) / sliceNb;
	for (let s = 0; s < sliceNb; s ++) {
		const ratio = Math.cos(angleStep * (s + 1)) * -1;
		const curSlice = directionToCenter.map(direction =>{
			return [
				coordCenter[0] + (direction.cos * direction.dist) * ratio, 
				coordCenter[1] + (direction.sin * direction.dist) * ratio, 
			];
		});
		slicesVertices.push(curSlice);
	}
	const facesIndex = [];
	for (let s = 0; s < sliceNb; s ++) {
		const sliceOffset = s * _building.coords.length;
		const sliceOffsetNext = (s + 1) * _building.coords.length;
		for (let v = 0; v < _building.coords.length; v ++) {
			if (v == _building.coords.length - 1) {
				facesIndex.push(sliceOffset + v);
				facesIndex.push(sliceOffset + 0);
				facesIndex.push(sliceOffsetNext + v);
			} else {
				facesIndex.push(sliceOffset + v);
				facesIndex.push(sliceOffset + v + 1);
				facesIndex.push(sliceOffsetNext + v);
			}
			if (v == _building.coords.length - 1) {
				facesIndex.push(sliceOffsetNext + v);
				facesIndex.push(sliceOffset);
				facesIndex.push(sliceOffsetNext);
			} else {
				facesIndex.push(sliceOffsetNext + v);
				facesIndex.push(sliceOffset + v + 1);
				facesIndex.push(sliceOffsetNext + v + 1);
			}
		}
	}
	const bufferFaces = Uint32Array.from(facesIndex);
	const buildingNbVert = _building.coords.length * slicesVertices.length;
	const bufferCoord = new Float32Array(buildingNbVert * 3);
	const colorVertices = [];
	const minAlt = _building.props.minAlt;
	const floorsNb = _building.props.floorsNb;
	const floorHeight = _building.props.floorHeight;
	let roofAlt = minAlt + (floorsNb * floorHeight)
	let bufferVertIndex = 0;
	const roofHeightStep = _building.props.roofHeight / sliceNb;
	for (let s = 0; s < slicesVertices.length; s ++) {
		for (let v = 0; v < slicesVertices[s].length; v ++) {
			bufferCoord[bufferVertIndex + 0] = slicesVertices[s][v][0];
			bufferCoord[bufferVertIndex + 1] = slicesVertices[s][v][1];
			bufferCoord[bufferVertIndex + 2] = roofAlt + (roofHeightStep * s);
			bufferVertIndex += 3;
			colorVertices.push(..._building.props.roofColor);
		}
	}
	return {
		verticesNb : buildingNbVert, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function prepareRoofFlat(_building) {
	const allCoords = _building.coords.concat(_building.holesCoords);
	const buildingNbVert = allCoords.length;
	const facesIndex = earcut(allCoords.flat(), _building.holesIndex);
	const bufferFaces = Uint32Array.from(facesIndex);
	const bufferCoord = new Float32Array(buildingNbVert * 3);
	const colorVertices = [];
	const minAlt = _building.props.minAlt;
	const floorsNb = _building.props.floorsNb;
	const floorHeight = _building.props.floorHeight;
	const roofAlt = minAlt + (floorsNb * floorHeight)
	let bufferVertIndex = 0;
	for (let v = 0; v < buildingNbVert; v ++) {
		bufferCoord[bufferVertIndex + 0] = allCoords[v][0];
		bufferCoord[bufferVertIndex + 1] = allCoords[v][1];
		bufferCoord[bufferVertIndex + 2] = roofAlt;
		bufferVertIndex += 3;
		colorVertices.push(..._building.props.roofColor);
	}
	return {
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
		} else if (curBuilding.props.roofShape == 'dome') {
			roofBuffers = prepareRoofDome(curBuilding);
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

	for (let i = 0; i < walls.length; i ++) {
		const building = walls[i];
		centers.push(building.centroid);
		let buildingCoordNb = building.coords.length;
		const buildingNbVert = buildingCoordNb * (building.props.floorsNb + 1);
		verticesNbs.push(buildingNbVert);
		nbVertWall += buildingNbVert;
		nbFaces += (buildingCoordNb * 2) * building.props.floorsNb;
	}
	const bufferCoord = new Float32Array(nbVertWall * 3);
	const bufferFaces = new Uint32Array(nbFaces * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	let pastFaceNb = 0;
	const colorVertices = [];
	for (let i = 0; i < walls.length; i ++) {
		const building = walls[i];
		let buildingCoordNb = building.coords.length;
		fixDirection(building.coords, building.id);
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
	}
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

function fixDirection(_way) {
	let curve = 0;
	for (let w = 1; w < _way.length; w ++) {
		const prevPoint = _way[w - 1];
		const curPoint = _way[w];
		curve += (curPoint[0] - prevPoint[0]) * (curPoint[1] + prevPoint[1]);
	}
	const prevPoint = _way[_way.length - 1];
	const curPoint = _way[0];
	curve += (curPoint[0] - prevPoint[0]) * (curPoint[1] + prevPoint[1]);
	if (curve > 0) _way.reverse();
}

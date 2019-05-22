importScripts('./Earcut.js');
importScripts('../../../libs/simplify.js');

onmessage = function(_msg) {
	let buildings = _msg.data.buildingsDatas;
	if (_msg.data.bbox) {
		buildings = buildings.filter(b => bboxContainCoord(_msg.data.bbox, b.centroid));
	}
	buildings = buildings.filter(b => b.coords.length > 2);
	const result = prepareWallsGeometry(buildings);
	const roofsDatas = prepareRoofsGeometry(buildings);
	postMessage({
		tileKey : _msg.data.tileKey, 
		result : {
			buildings : _msg.data.buildingsDatas, 
			geometry : result, 
			roofsGeometry : roofsDatas, 
		}, 
	});
}

function prepareRoofsGeometry(_buildings) {
	let nbVert = 0;
	let nbFaces = 0;
	const roofFacesIndex = [];
	for (let b = 0; b < _buildings.length; b ++) {
		const curBuilding = _buildings[b];
		curBuilding.nbVertRoof = curBuilding.coords.length + curBuilding.holesCoords.length;
		nbVert += curBuilding.nbVertRoof;
		const roofCoords = curBuilding.coords.flat();
		const roofHolesCoords = curBuilding.holesCoords.flat();
		const facesIndex = earcut(roofCoords.concat(roofHolesCoords), curBuilding.holesIndex);
		nbFaces += facesIndex.length;
		roofFacesIndex.push(facesIndex);
	}
	const bufferFaces = new Uint32Array(nbFaces);
	const bufferCoord = new Float32Array(nbVert * 3);
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
		for (let v = 0; v < curBuilding.nbVertRoof; v ++) {
			bufferCoord[bufferVertIndex + 0] = roofCoords[v][0];
			bufferCoord[bufferVertIndex + 1] = roofCoords[v][1];
			bufferCoord[bufferVertIndex + 2] = roofAlt;
			bufferVertIndex += 3;
			colorVertices.push(...curBuilding.props.roofColor);
		}
	}
	return {
		nbVert : nbVert, 
		nbFaces : nbFaces, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function prepareWallsGeometry(_buildings) {
	let nbVert = 0;
	let nbFaces = 0;
	const walls = _buildings.filter(b => {
		if (!b.props.wall) return true;
		if (b.props.wall == 'no') return false;
		return true;
	});
	walls.forEach(b => {
		let buildingCoordNb = b.coords.length;
		b.nbVert = buildingCoordNb * (b.props.floorsNb + 1)
		nbVert += b.nbVert;
		nbFaces += (buildingCoordNb * 2) * b.props.floorsNb;
	});
	const bufferCoord = new Float32Array(nbVert * 3);
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
		nbVert : nbVert, 
		nbFaces : nbFaces, 
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
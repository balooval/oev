onmessage = function(_evt) {
	const datas = readJson(_evt.data.json);
	postMessage(datas);
}

function readJson(_datas) {
	const json = JSON.parse(_datas);
	const nodesList = {};
	const jsonNodes = json.elements.filter(e => e.type == 'node');
	jsonNodes.forEach(n => {
		nodesList['NODE_' + n.id] = [
			parseFloat(n.lon), 
			parseFloat(n.lat)
		];
	});
	const landusesList = [];
	json.elements
	.filter(e => e.type == 'way')
	.forEach(w => {
		const props = cleanTags(w.tags);
		if (props.type == 'residential') return;
		const wayNodes = w.nodes.map(nodeId => nodesList['NODE_' + nodeId]);
		const centroid = getPolygonCentroid(wayNodes);
		landusesList.push({
			id : w.id, 
			props : props, 
			coords : wayNodes, 
			centroid : centroid, 
		});
	});
	return landusesList;
}

function cleanTags(_tags) {
	const tags = {};
	if (_tags.landuse) tags.type = _tags.landuse;
	if (_tags.natural) tags.type = _tags.natural;
	return tags;
}

function getPolygonCentroid(pts) {
	const first = pts[0];
	const last = pts[pts.length-1];
	if (first[0] != last[0] || first[1] != last[1]) pts.push(first);
	let twicearea = 0;
	let lon = 0;
	let lat = 0;
	const nPts = pts.length;
	for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
		const p1 = pts[i];
		const p2 = pts[j];
		const f = p1[0] * p2[1] - p2[0] * p1[1];
		twicearea += f;          
		lon += (p1[0] + p2[0]) * f;
		lat += (p1[1] + p2[1]) * f;
	}
	f = twicearea * 3;
	return [lon / f, lat / f];
}
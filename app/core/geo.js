import {
	Vector2,
} from '../vendor/three.module.js';
import MATH from './math.js';

class Geo {
	constructor() {
		
	}

	coordToCanvas(box, canvasSize, coords) {
		const points = new Array(coords.length);
		for (let i = 0; i < coords.length; i ++) {
			const coord = coords[i];
			const point = [
                MATH.mapValue(coord[0], box[0], box[1]) * canvasSize, 
                // canvasSize - MATH.mapValue(coord[1], box[2], box[3]) * canvasSize, 
                MATH.mapValue(coord[1], box[2], box[3]) * canvasSize, 
			];
			points[i] = point;
		}
		return points;
	}

	tileToCoords(tileX, tileY, zoom) {
		const p = [];
		const n = Math.PI - ((2.0 * Math.PI * tileY) / Math.pow(2.0, zoom));
		p[0] = ((tileX / Math.pow(2.0, zoom) * 360.0) - 180.0);
		p[1] = (180.0 / Math.PI * Math.atan(Math.sinh(n)));
		return p;
	}

	tileToCoordsVect(tileX, tileY, zoom){
		const res = this.tileToCoords(tileX, tileY, zoom);
		return new Vector2(res[0], res[1]);
	}

	coordDistance(_startLon, _startLat, _endLon, _endLat){
		const rayon = 6371000; // metres
		const sigma1 = MATH.radians(_startLat);
		const sigma2 = MATH.radians(_endLat);
		const deltaSigma = MATH.radians(_endLat - _startLat)
		const deltaTruc = MATH.radians(_endLon - _startLon);
		const a = Math.sin(deltaSigma / 2) * Math.sin(deltaSigma / 2) +
			Math.cos(sigma1) * Math.cos(sigma2) *
			Math.sin(deltaTruc / 2) * Math.sin(deltaTruc / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distance = rayon * c;
		return distance;
	}

	metersBetweenCoords(lon1, lat1, lon2, lat2) {
		const rayon = 6371000;
		const dLat = MATH.radians(lat2 - lat1);
		const dLon = MATH.radians(lon2 - lon1); 
		const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(MATH.radians(lat1)) * Math.cos(MATH.radians(lat2)) * 
			Math.sin(dLon / 2) * Math.sin(dLon / 2); 
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		const distance = rayon * c;
		return distance;
	}

	coordsToTile(_lon, _lat, _zoom) {
		const zoom = Math.floor(_zoom);
		return {
			x: Math.floor( (_lon + 180) / 360 * Math.pow( 2, zoom)),
			y: Math.floor((1 - Math.log(Math.tan(_lat * Math.PI / 180) + 1 / Math.cos(_lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow( 2, zoom)),
			z: zoom,
		};
	}

	// Return altitude in webgl unit
	getAltitude(zoomlevel, radius, projection) {
		return (radius * 6) / Math.pow(2, zoomlevel);
		if (projection === 'SPHERE') {
			return (radius * Math.PI * 2) / Math.pow(2, zoomlevel);
		}

		if (projection === 'PLANE') {
			return (radius * Math.PI * 2) / Math.pow(2, zoomlevel);
		}
	}
		
	mercatorLonToX(_lon) {
		const r_major = 6378137.000;
		return r_major * MATH.radians(_lon);
	}

	mercatorLatToY(_lat) {
		_lat = Math.max(-89.5, Math.min(89.5, _lat));
		const r_major = 6378137.000;
		const r_minor = 6356752.3142;
		const temp = r_minor / r_major;
		const es = 1.0 - (temp * temp);
		const eccent = Math.sqrt(es);
		const phi = MATH.radians(_lat);
		const sinphi = Math.sin(phi);
		let con = eccent * sinphi;
		const com = 0.5 * eccent;
		con = Math.pow((1.0 - con) / (1.0 + con), com);
		const ts = Math.tan(0.5 * (Math.PI*0.5 - phi)) / con;
		const y = 0 - r_major * Math.log(ts);
		return y;
	}
}

const geo = new Geo();

export {geo as default}
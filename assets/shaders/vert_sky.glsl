varying vec3 vNormal;
varying float darkening;
uniform vec3 cameraOrientation;


void main() {
	darkening = dot(cameraOrientation, normal) * -1.0;
	darkening = darkening + 0.5;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
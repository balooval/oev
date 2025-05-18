varying float vLightfactor;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vRayOrigin;
varying vec3 vRayDirection;

void main() {
	vUv = uv;
	vNormal = normal;
	vRayOrigin = position;

	vRayDirection = normalize(position - cameraPosition);

	vec3 lightPosition = vec3(0.0, 0.0, 1.0);
	vLightfactor = dot(normal, lightPosition);

	vec3 cameraToVertex = normalize(cameraPosition - position);
	vLightfactor = dot(normal, cameraToVertex);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
varying float vLightfactor;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vRayOrigin;
varying vec3 vRayDirection;

void main() {
	vUv = uv;
	vNormal = normal;
	// vRayOrigin = cameraPosition;
	vRayOrigin = vec3(0.0, 0.0, 5.0);

	float startX = -5000.0;
	float endX = 5000.0;
	float sizeX = endX - startX;
	float startY = 0.0;
	float endY = 10000.0;
	float sizeY = endY - startY;
	vRayOrigin = vec3((cameraPosition.x - startY) / sizeX, (cameraPosition.y - startY) / sizeY, cameraPosition.z / 5000.0);

	// vRayOrigin = vec3(0.0, 0.0, 5.0);
	vRayOrigin = vec3(uv.x, uv.y, cameraPosition.z / 5000.0);

	vRayDirection = normalize(position - cameraPosition);


	vec3 lightPosition = vec3(0.0, 0.0, 1.0);
	vLightfactor = dot(normal, lightPosition);

	vec3 cameraToVertex = normalize(cameraPosition - position);
	vLightfactor = dot(normal, cameraToVertex);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
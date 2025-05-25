varying vec3 vPosition;
uniform float skySphereRadius;

void main() {
    vPosition = position * skySphereRadius;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
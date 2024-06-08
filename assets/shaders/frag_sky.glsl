varying vec3 vNormal;
varying float darkening;
uniform vec3 diffuse;

void main() {
	// vec3 diffuse = vec3(vNormal.x, vNormal.y, vNormal.z);
	// vec3 diffuse = vec3(0.0, 0.0, 1.0);
	// vec3 diffuse = vec3(darkening, 0.0, 0.0);

	// gl_FragColor = vec4(diffuse.xyz, 1.0);
	gl_FragColor = vec4(diffuse.xyz, darkening);
}
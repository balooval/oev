uniform vec3 diffuse;
uniform vec3 sunPosition;
uniform float skySphereRadius;
uniform float sunInclinaison;
varying vec3 vPosition;


void main() {

    float distWithSun = length(vPosition - sunPosition);
    // float luminosity = smoothstep(4.0, 0.0, (distWithSun / (skySphereRadius * 2.0)));
    // float luminosity = 0.5 - (distWithSun / (skySphereRadius * 2.0));
    float test = 2.0 + (6.0 * max(sunInclinaison, 0.0));
    float luminosity = 0.5 - (distWithSun / (skySphereRadius * test));
    vec3 color = diffuse + (luminosity * 1.0);

	gl_FragColor = vec4(color, 1.0);
	// gl_FragColor = vec4(luminosity, luminosity, luminosity, 1.0);
	// gl_FragColor = vec4(diffuse, 1.0);
}
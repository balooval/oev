varying float vLightfactor;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vRayOrigin;
varying vec3 vRayDirection;
uniform float cutValue;
uniform int octavesCount;
uniform float persistence;
uniform float perlinScale;
uniform vec3 skyColor;
varying vec3 vSunPosition;
varying vec3 vSunDirection;
uniform vec3 sunPosition;

#define MAX_STEPS 100
const float MARCH_SIZE = 2000.0;



vec2 rand2d(vec2 uv) {
    return fract(sin(vec2(dot(uv, vec2(12.34, 45.67)),
        dot(uv, vec2(78.9, 3.14)))) * 12345.67) * 2.0 - 1.0;
}

float perlin(vec2 uv) {
    vec2 u = floor(uv);
    vec2 f = fract(uv);
    vec2 s = smoothstep(0.0, 1.0, f);
	
    vec2 a = rand2d(u);
    vec2 b = rand2d(u + vec2(1.0, 0.0));
    vec2 c = rand2d(u + vec2(0.0, 1.0));
    vec2 d = rand2d(u + vec2(1.0, 1.0));
	
    return mix(mix(dot(a, -f), dot(b, vec2(1.0, 0.0) - f), s.x),
        mix(dot(c, vec2(0.0, 1.0) - f), dot(d, vec2(1.0, 1.0) - f), s.x), s.y);
}

float perlinNormalized(vec2 uv) {
    return (perlin(uv) + 1.0) / 2.0;
}


float Perlin3D( vec3 P )
{
    //  https://github.com/BrianSharpe/Wombat/blob/master/Perlin3D.glsl

    // establish our grid cell and unit position
    vec3 Pi = floor(P);
    vec3 Pf = P - Pi;
    vec3 Pf_min1 = Pf - 1.0;

    // clamp the domain
    Pi.xyz = Pi.xyz - floor(Pi.xyz * ( 1.0 / 69.0 )) * 69.0;
    vec3 Pi_inc1 = step( Pi, vec3( 69.0 - 1.5 ) ) * ( Pi + 1.0 );

    // calculate the hash
    vec4 Pt = vec4( Pi.xy, Pi_inc1.xy ) + vec2( 50.0, 161.0 ).xyxy;
    Pt *= Pt;
    Pt = Pt.xzxz * Pt.yyww;
    const vec3 SOMELARGEFLOATS = vec3( 635.298681, 682.357502, 668.926525 );
    const vec3 ZINC = vec3( 48.500388, 65.294118, 63.934599 );
    vec3 lowz_mod = vec3( 1.0 / ( SOMELARGEFLOATS + Pi.zzz * ZINC ) );
    vec3 highz_mod = vec3( 1.0 / ( SOMELARGEFLOATS + Pi_inc1.zzz * ZINC ) );
    vec4 hashx0 = fract( Pt * lowz_mod.xxxx );
    vec4 hashx1 = fract( Pt * highz_mod.xxxx );
    vec4 hashy0 = fract( Pt * lowz_mod.yyyy );
    vec4 hashy1 = fract( Pt * highz_mod.yyyy );
    vec4 hashz0 = fract( Pt * lowz_mod.zzzz );
    vec4 hashz1 = fract( Pt * highz_mod.zzzz );

    // calculate the gradients
    vec4 grad_x0 = hashx0 - 0.49999;
    vec4 grad_y0 = hashy0 - 0.49999;
    vec4 grad_z0 = hashz0 - 0.49999;
    vec4 grad_x1 = hashx1 - 0.49999;
    vec4 grad_y1 = hashy1 - 0.49999;
    vec4 grad_z1 = hashz1 - 0.49999;
    vec4 grad_results_0 = inversesqrt( grad_x0 * grad_x0 + grad_y0 * grad_y0 + grad_z0 * grad_z0 ) * ( vec2( Pf.x, Pf_min1.x ).xyxy * grad_x0 + vec2( Pf.y, Pf_min1.y ).xxyy * grad_y0 + Pf.zzzz * grad_z0 );
    vec4 grad_results_1 = inversesqrt( grad_x1 * grad_x1 + grad_y1 * grad_y1 + grad_z1 * grad_z1 ) * ( vec2( Pf.x, Pf_min1.x ).xyxy * grad_x1 + vec2( Pf.y, Pf_min1.y ).xxyy * grad_y1 + Pf_min1.zzzz * grad_z1 );

    // Classic Perlin Interpolation
    vec3 blend = Pf * Pf * Pf * (Pf * (Pf * 6.0 - 15.0) + 10.0);
    vec4 res0 = mix( grad_results_0, grad_results_1, blend.z );
    vec4 blend2 = vec4( blend.xy, vec2( 1.0 - blend.xy ) );
    float final = dot( res0, blend2.zxzx * blend2.wwyy );
    return ( final * 1.1547005383792515290182975610039 );  // scale things to a strict -1.0->1.0 range  *= 1.0/sqrt(0.75)
}





float sdSphere(vec3 p) {
	float scale = perlinScale;
	p.y *= 5.0;

	float octaveScale = 1.0;
	float octaveAmplitude = 1.0;
	float res = 0.0;

	for (int o = 0; o < octavesCount; o ++) {
		res += Perlin3D(p * (0.0005 * octaveScale) * scale) * octaveAmplitude;
		octaveScale *= 2.0;
		octaveAmplitude *= persistence;
	}

	if (res < cutValue) {
		return 0.0;
	}

	return res;
}

float scene(vec3 p) {
  return sdSphere(p);
}

float raymarch(vec3 rayOrigin, vec3 rayDirection) {
  float depth = 0.0;
  vec3 p = rayOrigin + depth * rayDirection;
  float totalDensity = 0.0;
  float densityFactorByDistance = 0.04;

  for (int i = 0; i < MAX_STEPS; i++) {
    float density = scene(p);

	float groundAttenuation = smoothstep(1000.0, 10000.0, p.y);

    if (density > 0.0) {
		totalDensity += density * densityFactorByDistance * groundAttenuation;
    }

	// densityFactorByDistance *= 0.99;
    depth += MARCH_SIZE;
    p = rayOrigin + depth * rayDirection;
  }

	return totalDensity;
}


float raymarchSun(vec3 rayOrigin, vec3 rayDirection) {
	// Ca c'est joli
	// return 0.5 + smoothstep(-1.0, 1.0, dot(vRayDirection * -1.0, vSunDirection) * -1.0) * 2.0;
	
	return 0.5 + (dot(vRayDirection * -1.0, vSunDirection * -1.0) + 1.0) * 0.5;
}

void main() {

	float alpha = raymarch(vRayOrigin, vRayDirection);
	float luminosity = raymarchSun(vRayOrigin, vSunDirection);

	// gl_FragColor = vec4(alpha, alpha, alpha, 1.0);
	// gl_FragColor = vec4(skyColor, alpha);
	gl_FragColor = vec4(skyColor * luminosity, alpha);
	// gl_FragColor = vec4(vSunDirection, alpha);
}
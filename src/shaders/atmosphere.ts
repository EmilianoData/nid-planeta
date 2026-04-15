export const atmosphereVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// Cheap fake rim scattering — cheap but convincing for TV.
export const atmosphereFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uSunDir;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vWorldPos;

void main(){
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  // Backside rendering => dot(N,V) negative on outer rim; invert.
  float fresnel = pow(1.0 - abs(dot(N, V)), 2.2);
  float sun = max(dot(normalize(uSunDir), N), 0.0);
  float tint = mix(0.45, 1.0, sun);
  vec3 col = uColor * fresnel * uIntensity * tint;
  gl_FragColor = vec4(col, fresnel);
}
`;

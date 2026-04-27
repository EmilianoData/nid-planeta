// Atmosfera — scattering pseudo-Rayleigh.
// O limb iluminado pela estrela fica azul-esbranquiçado; o terminador fica
// laranja/avermelhado (wavelength shift); a sombra é só uma sobra fria da cor base.
// A API é idêntica ao shader anterior (uColor, uSunDir, uIntensity).

export const atmosphereVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main(){
  vNormal   = normalize(normalMatrix * normal);
  vec4 wp   = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const atmosphereFrag = /* glsl */ `
precision highp float;

uniform vec3  uColor;
uniform vec3  uSunDir;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vWorldPos;

void main(){
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDir);

  // backside rendering: fresnel é max no limb
  float fresnel = pow(1.0 - abs(dot(N, V)), 2.4);

  float sun = max(dot(L, N), 0.0);
  // lado dia → limb mais forte; lado noite → quase nada
  float dayFactor = smoothstep(-0.1, 0.4, dot(L, N));

  // Rayleigh-ish: azul no céu iluminado, vermelho no terminador (camada mais grossa).
  // Usamos VdotL pra saber se estamos olhando contra o sol (forward scatter).
  float vdotL = max(dot(V, L), 0.0);
  // tinte azulado em dia
  vec3 skyBlue = vec3(0.55, 0.78, 1.0);
  // tinte quente no terminador
  vec3 sunset  = vec3(1.0, 0.55, 0.35);
  // mistura dependendo da geometria
  float terminator = (1.0 - abs(dot(L, N) * 2.0 - 0.6));
  terminator = clamp(terminator * 0.6, 0.0, 1.0);

  // cor final do limb = mistura da cor base do planeta, azul do Rayleigh e sunset
  vec3 tint = mix(uColor, skyBlue, 0.35);
  tint = mix(tint, sunset, terminator * 0.7);

  // forward scatter (halo solar) dá leve brilho
  float fwd = pow(vdotL, 4.0) * 0.4;

  float alpha = fresnel * mix(0.3, 1.0, dayFactor);
  vec3 col = tint * fresnel * uIntensity * mix(0.4, 1.0, dayFactor) + vec3(1.0) * fwd * dayFactor;

  gl_FragColor = vec4(col, alpha);
}
`;

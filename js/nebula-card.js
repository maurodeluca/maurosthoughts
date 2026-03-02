const canvas = document.getElementById('nebula-preview');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

const QUAD_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
vUv = aPos * 0.5 + 0.5;
gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// ─── Pass 1: Star bake ────────────────────────────────────────────────────────
const STAR_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uRadius; // new: radius of circular star field
#define PI 3.14159265359

float hash1(float n) { return fract(sin(n) * 43758.5453); }

float spike(vec2 uv, float angle, float len, float w) {
    float c = cos(angle), s = sin(angle);
    vec2 r = vec2(c*uv.x + s*uv.y, -s*uv.x + c*uv.y);
    float fade = (1.0 - clamp(r.x/len, 0.0, 1.0));
    return smoothstep(w, 0.0, abs(r.y)) * fade * fade * step(0.0, r.x);
}

vec3 starColor(float seed) {
    float t = hash1(seed * 7.3);
    if (t < 0.3) return vec3(0.9, 0.95, 1.0);
    if (t < 0.6) return vec3(1.0, 0.97, 0.88);
    if (t < 0.8) return vec3(1.0, 0.7, 0.4);
    return vec3(0.9, 0.4, 0.3);
}

void main() {
    // Map vUv to [-2,2] space with aspect correction
    vec2 uv = vUv * 2.0 - 1.0;
    float maxSide = max(uRes.x, uRes.y);
    uv *= maxSide / min(uRes.x, uRes.y);

    // Compute distance from center
    float r = length(uv);
    float circleMask = smoothstep(uRadius, uRadius - 0.05, r); // 0 outside, 1 inside

    vec3 stars = vec3(0.0);

    for (int i = 0; i < 5000; i++) {
        float fi = float(i);
        vec2 sp = vec2(hash1(fi * 1.1) * 6.0 - 3.0,
                       hash1(fi * 2.3) * 6.0 - 3.0);
        sp.x *= uRes.x / uRes.y;

        vec2 d = uv - sp;
        float dist = length(d);
        float br = hash1(fi * 0.7);
        float sz = 0.0003 + br * br * 0.002;

        if (dist > sz * 12.0 && br < 0.75) continue;

        float core = exp(-dist * dist / (sz * sz * 2.0));
        vec3 sc = starColor(fi);

        if (br > 0.75) {
            float slen = 0.012 + br * 0.035;
            float sw = 0.0008;
            float spk = (spike(d, 0.0, slen, sw) +
                         spike(d, PI, slen, sw) +
                         spike(d, PI * 0.5, slen, sw) +
                         spike(d, PI * 1.5, slen, sw)) * br * br
                      + (spike(d, PI * 0.25, slen*0.6, sw*0.7) +
                         spike(d, PI * 0.75, slen*0.6, sw*0.7) +
                         spike(d, PI * 1.25, slen*0.6, sw*0.7) +
                         spike(d, PI * 1.75, slen*0.6, sw*0.7)) * br * 0.5;
            stars += sc * spk * (0.3 + br*0.7);
        }
        stars += sc * core * (0.5 + br*0.5);
    }

    gl_FragColor = vec4(stars * circleMask, 1.0); // apply circular mask
}`;
// ─── Pass 2: JWST-style Crab Nebula ──────────────────────────────────────────
// Key features from the image:
//   • Pale blue-grey misty fill throughout the whole interior (not black)
//   • Bright orange/amber looping ring-like filaments, especially lower-left
//   • Delicate pink/salmon thin threads lacing through everything
//   • Soft white-blue brighter core (not a harsh point)
//   • Large curling loop structures in the orange gas
//   • Everything is luminous and hazy, not web-like and dark
const MAIN_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform float uZoom;
uniform float uAngle;
uniform sampler2D uStarTex;
uniform float uRadius;

#define PI 3.14159265359

float hash(vec2 p){
  p = fract(p*vec2(127.1,311.7));
  p += dot(p,p.yx+19.19);
  return fract((p.x+p.y)*p.x);
}

float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 r=mat2(0.8,0.6,-0.6,0.8);
  for(int i=0;i<4;i++){
    v+=a*noise(p);
    p=r*p*2.0;
    a*=0.5;
  }
  return v;
}

void main(){
  vec2 uv=vUv*2.0-1.0;
  uv.x*=uRes.x/uRes.y;
  uv/=uZoom;

  float ca=cos(uAngle), sa=sin(uAngle);
  uv=vec2(ca*uv.x-sa*uv.y, sa*uv.x+ca*uv.y);

  float r=length(uv);

  // -------- RADIAL BURST DISTORTION ----------
  float burst = fbm(uv*3.0 + uTime*0.3);
  vec2 flow = uv + normalize(uv)*burst*0.15;

  // -------- EXPLOSIVE LAYERS ----------
  float l1 = fbm(flow*1.5 + uTime*0.05);
  float l2 = fbm(flow*3.0 - uTime*0.08);
  float l3 = fbm(flow*6.0 + uTime*0.1);

  float density = l1*1.0 + l2*0.7 + l3*0.4;

  // stronger radial falloff (explosion center)
  float radial = smoothstep(1.4,0.0,r);
  density *= radial;

  // extreme contrast
  density = pow(density,1.8);

  // -------- SHARP DUST TEARS ----------
  float dustNoise = fbm(flow * 1.5);
  float dust = smoothstep(0.5,0.65,dustNoise);

  // -------- STAR SAMPLING ----------
  vec2 starUV = uv / uRadius * 0.5 + 0.5;
  vec3 stars = texture2D(uStarTex, starUV).rgb;

  // -------- STRONGER LIGHTING ----------
  float e=0.0025;
  float dx = fbm((flow+vec2(e,0.0))*1.5) - fbm((flow-vec2(e,0.0))*1.5);
  float dy = fbm((flow+vec2(0.0,e))*1.5) - fbm((flow-vec2(0.0,e))*1.5);

  vec3 normal=normalize(vec3(dx,dy,0.02));
  vec3 lightDir=normalize(vec3(0.2,0.3,1.0));

  float lighting=clamp(dot(normal,lightDir),0.0,1.0);
  lighting=pow(lighting,1.8);

  // -------- FIERY COLOR RAMP ----------
 // -------- FIERY + NEON COLOR RAMP ----------
// Crab Nebula-inspired color palette
vec3 deepRed   = vec3(0.8, 0.05, 0.0);   // inner hot core
vec3 orange    = vec3(1.0, 0.4, 0.0);
vec3 yellow    = vec3(1.0, 0.8, 0.2);
vec3 pink      = vec3(1.0, 0.3, 0.5);     // filament
vec3 magenta   = vec3(0.8, 0.1, 0.9);
vec3 purple    = vec3(0.5, 0.0, 0.6);
vec3 cyan      = vec3(0.2, 0.8, 1.0);     // outer glow
vec3 paleBlue  = vec3(0.6, 0.8, 1.0);
vec3 white     = vec3(1.0, 1.0, 0.95);    // blinding core

vec3 col = deepRed * 0.1;
col = mix(col, orange, smoothstep(0.0,0.2,density));
col = mix(col, yellow, smoothstep(0.15,0.35,density));
col = mix(col, pink * 0.1, smoothstep(0.3,0.5,density));
col = mix(col, magenta * 0.1, smoothstep(0.45,0.6,density));
col = mix(col, purple * 0.1, smoothstep(0.55,0.7,density));
col = mix(col, cyan * 0.1, smoothstep(0.65,0.8,density));
col = mix(col, paleBlue * 0.1, smoothstep(0.75,0.9,density));
col = mix(col, white * 0.1, smoothstep(0.85,1.0,density));

col *= lighting * density * 2.0;

  // -------- BLINDING CORE ----------
  float core = exp(-r*r*10.0);
  col += white * core * 1.2;

  // -------- COMPOSITE ----------
  vec3 finalCol = vec3(0.003,0.0005,0.0008) + stars + col;
  finalCol = min(finalCol, 8.0);
  // ACES tone map
  finalCol = finalCol*(finalCol*2.51+0.03)/(finalCol*(finalCol*2.43+0.59)+0.14);
  finalCol = clamp(finalCol,0.0,1.0);

  // slightly hotter gamma
  finalCol = pow(finalCol,vec3(0.85));

  gl_FragColor=vec4(finalCol,1.0);
}
`;

// ─── GL helpers ──────────────────────────────────────────────────────────────
function mkShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
}
function mkProg(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, mkShader(vs, gl.VERTEX_SHADER));
    gl.attachShader(p, mkShader(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    return p;
}

const starProg = mkProg(QUAD_VS, STAR_FS);
const mainProg = mkProg(QUAD_VS, MAIN_FS);

const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

function bindQuad(prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    const l = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
}

// ─── Star FBO ─────────────────────────────────────────────────────────────────
let starFBO = null, starTex = null, starW = 0, starH = 0;

function createStarFBO(w, h) {
    if (starTex) gl.deleteTexture(starTex);
    if (starFBO) gl.deleteFramebuffer(starFBO);
    starW = w; starH = h;
    starTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, starTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    starFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, starFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, starTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function bakeStars() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, starFBO);
    gl.viewport(0, 0, starW, starH);
    gl.useProgram(starProg);
    bindQuad(starProg);
    gl.uniform2f(gl.getUniformLocation(starProg, 'uRes'), starW, starH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
    const dpr = window.devicePixelRatio || 1;

    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    // Compute maximum nebula radius in world space
    const aspect = canvas.width / canvas.height;

    // This matches your main shader:
    // uv.x *= aspect;
    // uv /= zoom;

    const maxX = aspect / zoom;
    const maxY = 1.0 / zoom;

    worldRadius = Math.sqrt(maxX * maxX + maxY * maxY);

    // Choose square resolution proportional to visible radius
    const baseRes = 240;
    const res = Math.floor(baseRes * worldRadius * 0.5);

    createStarFBO(res, res);

    gl.useProgram(starProg);

    gl.uniform2f(
        gl.getUniformLocation(starProg, "uRes"),
        res,
        res
    );

    gl.uniform1f(
        gl.getUniformLocation(starProg, "uRadius"),
        worldRadius
    );

    bakeStars();
}

window.addEventListener('resize', resize);

// ─── Uniform locations ────────────────────────────────────────────────────────
const uRes = gl.getUniformLocation(mainProg, 'uRes');
const uTime = gl.getUniformLocation(mainProg, 'uTime');
const uZoom = gl.getUniformLocation(mainProg, 'uZoom');
const uAngle = gl.getUniformLocation(mainProg, 'uAngle');
const uStarTx = gl.getUniformLocation(mainProg, 'uStarTex');

// ─── Interaction ──────────────────────────────────────────────────────────────
let zoom = 0.7, angle = 0.0, drag = false, px = 0, py = 0, velAngle = 0, worldRadius = 1;

canvas.addEventListener('mousedown', e => { drag = true; px = e.clientX; py = e.clientY; velAngle = 0; });
window.addEventListener('mouseup', () => drag = false);
window.addEventListener('mousemove', e => {
    if (!drag) return;
    const delta = ((e.clientX - px) / innerWidth) * Math.PI * 2.5;
    velAngle = delta; angle += delta; px = e.clientX; py = e.clientY;
});
canvas.addEventListener('wheel', e => {
    zoom = Math.max(0.7, Math.min(6, zoom * (1 - e.deltaY * 0.001)));
    e.preventDefault();
}, { passive: false });

let lastTD = null;
canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { drag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; velAngle = 0; }
    if (e.touches.length === 2) lastTD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
});
window.addEventListener('touchend', () => { drag = false; lastTD = null; });
window.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && drag) {
        const delta = ((e.touches[0].clientX - px) / innerWidth) * Math.PI * 2.5;
        velAngle = delta; angle += delta; px = e.touches[0].clientX; py = e.touches[0].clientY;
    }
    if (e.touches.length === 2 && lastTD) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoom = Math.max(0.4, Math.min(6, zoom * d / lastTD)); lastTD = d;
    }
});

// ─── Render loop ──────────────────────────────────────────────────────────────
const t0 = performance.now();
let animationId = null;

function frame() {
    animationId = requestAnimationFrame(frame);
    const t = (performance.now() - t0) * 0.001;
    if (!drag) { angle += velAngle; velAngle *= 0.92; }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(mainProg);
    bindQuad(mainProg);

    const uRadiusMain = gl.getUniformLocation(mainProg, 'uRadius');
    gl.uniform1f(uRadiusMain, worldRadius);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uZoom, zoom);
    gl.uniform1f(uAngle, angle);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, starTex);
    gl.uniform1i(uStarTx, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
resize();
frame();

export function stop() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}
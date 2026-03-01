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
uniform vec2 uRes;
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
if (t < 0.25) return vec3(0.85, 0.92, 1.0);
if (t < 0.55) return vec3(1.0, 0.98, 0.90);
if (t < 0.78) return vec3(1.0, 0.75, 0.45);
return vec3(0.95, 0.5, 0.35);
}

void main() {
// Bake covers world space [-2,2]
vec2 uv = (vUv * 2.0 - 1.0) * 2.0;
uv.x *= uRes.x / uRes.y;
vec3 stars = vec3(0.0);

for (int i = 0; i < 10000; i++) {
    float fi = float(i);
    vec2 sp = vec2(hash1(fi*1.1)*6.0 - 3.0, hash1(fi*2.3)*6.0 - 3.0);
    sp.x *= uRes.x / uRes.y;
    vec2  d    = uv - sp;
    float dist = length(d);
    float br   = hash1(fi * 0.7);
    float sz   = 0.0003 + br*br*0.0022;
    if (dist > sz * 14.0 && br < 0.75) continue;
    float core = exp(-dist*dist / (sz*sz*2.0));
    vec3  sc   = starColor(fi);
    if (br > 0.75) {
    float slen = 0.012 + br*0.038;
    float sw   = 0.0008;
    float spk  = (spike(d,0.0,slen,sw)+spike(d,PI,slen,sw)+
                    spike(d,PI*.5,slen,sw)+spike(d,PI*1.5,slen,sw))*br*br
                + (spike(d,PI*.25,slen*.6,sw*.7)+spike(d,PI*.75,slen*.6,sw*.7)+
                    spike(d,PI*1.25,slen*.6,sw*.7)+spike(d,PI*1.75,slen*.6,sw*.7))*br*.5;
    stars += sc * spk * (0.3 + br*0.7);
    }
    stars += sc * core * (0.5 + br*0.5);
}
gl_FragColor = vec4(stars, 1.0);
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

#define PI  3.14159265359
#define TAU 6.28318530718

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
}
float hash1(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),           hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p, int oct) {
    float v=0.0, a=0.5;
    mat2 rot = mat2(0.80,0.60,-0.60,0.80);
    for(int i=0;i<4;i++){
        if(i>=oct) break;
        v += a*noise(p); p=rot*p*2.07; a*=0.5;
    }
    return v;
}

// Single-warped wisp for filaments
float wisp(vec2 p, float sc, float t) {
    float ts = t*0.03;
    vec2 q = vec2(fbm(p*sc + vec2(0.0, ts), 3),
                  fbm(p*sc + vec2(5.2, 1.3-ts), 3));
    return fbm(p*sc + 3.5*q + vec2(1.7, 9.2+t*0.016), 3);
}

float ridge(float v, float w) {
    return smoothstep(0.0,w,v)*smoothstep(2.0*w,w,v);
}

void main() {
    // ── Coordinates ──
    vec2 uv = vUv*2.0 - 1.0;
    uv.x *= uRes.x/uRes.y;
    uv /= uZoom;
    float cosA=cos(uAngle), sinA=sin(uAngle);
    uv = vec2(cosA*uv.x - sinA*uv.y,
              sinA*uv.x + cosA*uv.y);

    // ── Stars ──
    float aspect = uRes.x/uRes.y;
    vec2 starTexUv = vec2(uv.x/aspect, uv.y)*0.25 + 0.5;
    vec3 stars = texture2D(uStarTex, starTexUv).rgb;
    float sPhase = noise(starTexUv*75.0);
    stars *= 0.65 + 0.35*sin(uTime*(2.5+4.5*sPhase)+sPhase*TAU);

    // ── Nebula geometry ──
    float r = length(uv);
    float theta = atan(uv.y, uv.x);
    float rot = uTime*0.005;
    vec2 ruv = vec2(cos(rot)*uv.x - sin(rot)*uv.y,
                    sin(rot)*uv.x + cos(rot)*uv.y);

    vec2 ovalUv = vec2(uv.x*0.92, uv.y); // slightly stretched horizontally
    float rOval = length(ovalUv);

    float deform = 0.14*fbm(vec2(theta*1.3, uTime*0.012+rOval),3)
                 + 0.06*fbm(vec2(theta*2.8+1.5, uTime*0.010),2);
    float shellR = 0.70*(1.0+deform);
    float normR = rOval/max(shellR,0.001);

    float bodyFull  = smoothstep(0.30, 1.15, rOval/0.7);
    float bodyOuter = smoothstep(0.65, 1.15, rOval/0.7);
    float outerRim  = smoothstep(0.88, 1.18, normR)*smoothstep(1.0, 1.6, normR);

    // ── Noise layers for filaments ──
    float w1 = wisp(ruv, 2.4, uTime);
    float w2 = wisp(ruv+vec2(1.6,0.5), 3.8, uTime*1.08);
    float w3 = wisp(ruv*1.2+vec2(2.5,1.3), 6.2, uTime*0.90);
    float w4 = wisp(ruv*0.75+vec2(-1.2,2.1), 3.1, uTime*1.20);
    float w5 = mix(w1,w3,0.50);
    float w6 = mix(w2,w4,0.46);

    float cloud1 = fbm(ruv*0.9 + vec2(0.5, uTime*0.008),3);
    float cloud2 = fbm(ruv*1.1 + vec2(3.2, uTime*0.007),3);

    // ── Misty blue-grey fill ──
    vec3 mistBlue = vec3(0.52, 0.68, 0.82);
    vec3 mistGrey = vec3(0.60, 0.66, 0.72);
    float mistDens = bodyFull*(0.5 + 0.5*cloud1*cloud2) + exp(-rOval*rOval*2.5)*0.6;

    // ── Orange→Amber→Gold multi-color loops ──
    vec3 orange  = vec3(0.82, 0.30, 0.05);
    vec3 amber   = vec3(0.92, 0.48, 0.08);
    vec3 gold    = vec3(0.95, 0.62, 0.10);

    // Recalculate orangeDens with body and rim
    float orangeDens = bodyOuter*(ridge(w1,0.055)*2.5 + ridge(w4,0.048)*2.0)
                     + outerRim*(0.7+0.4*w2)*(0.6+0.3*cloud1);
    orangeDens *= 0.9 + 0.1*fbm(ruv*20.0 + uTime*0.5,2);

    float colorMix1 = smoothstep(0.2, 0.8, w1);        // orange->amber
    float colorMix2 = smoothstep(0.3, 0.9, w4);        // amber->gold
    float orangeLayer = orangeDens * (0.5 + 0.5*fbm(ruv*5.0+uTime*0.3,3));
    float amberLayer  = orangeDens * (0.4 + 0.6*fbm(ruv*6.0+uTime*0.5,3));
    float goldLayer   = orangeDens * (0.3 + 0.7*fbm(ruv*7.0+uTime*0.7,3));

    // Spread colors
    vec3 orangeCol = mix(orange, amber, colorMix1) * orangeLayer * 1.5;
    vec3 amberCol  = mix(amber, gold, colorMix2)  * amberLayer * 1.2;
    vec3 goldCol   = gold * goldLayer * 0.9;

    // ── Pink/salmon threads ──
    vec3 salmon = vec3(0.85,0.55,0.48);
    vec3 pink   = vec3(0.80,0.45,0.52);
    float pinkRidge = ridge(w2,0.03)*2.0 + ridge(w5,0.025)*1.5 + ridge(w6,0.028)*1.3;
    float pinkDens = bodyFull * pinkRidge * 0.6;

    // ── Hazy elliptical core ──
    vec3 coreBlue  = vec3(0.72,0.84,0.96);
    vec3 coreWhite = vec3(0.90,0.94,1.00);
    vec2 cUv = vec2(uv.x*1.05, uv.y*0.85);
    float cR = length(cUv);
    float coreHaze = exp(-dot(cUv,cUv)*2.0)*0.7;
    float coreSpot = exp(-cR*cR*8.0);
    float sweep1 = exp(-abs(uv.y - uv.x*0.18)*9.0)*exp(-cR*cR*3.5)*(0.6+0.3*w3);
    float sweep2 = exp(-abs(uv.y + uv.x*0.30)*11.0)*exp(-cR*cR*3.5)*(0.5+0.4*w1);
    float sweeps = (sweep1+sweep2)*bodyFull;

    // ── Assemble ──
    vec3 nebCol = vec3(0.0);
    nebCol += mix(mistGrey, mistBlue, cloud1) * mistDens * 1.1;
    nebCol += orangeCol + amberCol + goldCol;             // multi-color filaments
    nebCol += mix(salmon, pink, w4) * pinkDens * 2.0;    // stronger pink threads
    nebCol += coreBlue  * coreHaze  * 0.4;
    nebCol += coreWhite * coreSpot * 0.35;
    nebCol += coreWhite * sweeps   * 0.35;

    vec3 bg = vec3(0.003,0.002,0.004);
    vec3 col = bg + stars + nebCol;

    col = col*(col*2.51+0.03)/(col*(col*2.43+0.59)+0.14); // ACES filmic
    col = clamp(col,0.0,1.0);
    col = pow(col, vec3(0.90));
    col *= max(1.0 - dot(vUv-0.5,vUv-0.5)*1.4, 0.0); // vignette

    gl_FragColor = vec4(col,1.0);
}`;

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
    createStarFBO(Math.max(1, canvas.width >> 1), Math.max(1, canvas.height >> 1));
    bakeStars();
    frame();
    gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', () => {
    resize();
    frame();
});

// ─── Uniform locations ────────────────────────────────────────────────────────
const uRes = gl.getUniformLocation(mainProg, 'uRes');
const uTime = gl.getUniformLocation(mainProg, 'uTime');
const uZoom = gl.getUniformLocation(mainProg, 'uZoom');
const uAngle = gl.getUniformLocation(mainProg, 'uAngle');
const uStarTx = gl.getUniformLocation(mainProg, 'uStarTex');

// ─── Interaction ──────────────────────────────────────────────────────────────
let zoom = 0.7, angle = 0.0, drag = false, px = 0, py = 0, velAngle = 0;

canvas.addEventListener('mousedown', e => { drag = true; px = e.clientX; py = e.clientY; velAngle = 0; });
window.addEventListener('mouseup', () => drag = false);
window.addEventListener('mousemove', e => {
    if (!drag) return;
    const delta = ((e.clientX - px) / innerWidth) * Math.PI * 2.5;
    velAngle = delta; angle += delta; px = e.clientX; py = e.clientY;
});
canvas.addEventListener('wheel', e => {
    zoom = Math.max(0.4, Math.min(6, zoom * (1 - e.deltaY * 0.001)));
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
function frame() {
    requestAnimationFrame(frame);
    const t = (performance.now() - t0) * 0.001;
    if (!drag) { angle += velAngle; velAngle *= 0.92; }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(mainProg);
    bindQuad(mainProg);

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uZoom, zoom);
    gl.uniform1f(uAngle, angle);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, starTex);
    gl.uniform1i(uStarTx, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
frame();
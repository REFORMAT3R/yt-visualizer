const app = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x1a0a33,
    antialias: true
});
app.view.id = "pixi";
document.body.appendChild(app.view);

// ---- Color: matiz que deriva y se acelera con el pulso ----
let matiz = 280;
function hslAHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

// Paleta compartida: un color principal y dos vecinos
const ARCO = 50;   // separación entre colores (menor = más cohesionado)
function colorA(luz = 60) { return hslAHex(matiz, 100, luz); }
function colorB(luz = 60) { return hslAHex(matiz + ARCO, 100, luz); }
function colorC(luz = 60) { return hslAHex(matiz - ARCO, 100, luz); }

// ---- Bola: halo borroso + dos canales de color + trazo blanco ----
const haloBola = new PIXI.Graphics();
haloBola.blendMode = PIXI.BLEND_MODES.ADD;
haloBola.filters = [new PIXI.BlurFilter(8)];
const colorBola = new PIXI.Graphics();
const nucleo = new PIXI.Graphics();
nucleo.blendMode = PIXI.BLEND_MODES.ADD;
app.stage.addChild(haloBola, colorBola, nucleo);

// Mezcla dos colores hex (t = 0 da a, t = 1 da b)
function mezclar(a, b, t) {
    const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t;
    const g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t;
    const bl = (a & 255) * (1 - t) + (b & 255) * t;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

// Dibuja el círculo en segmentos con degradado entre colorB y colorC
function circuloNeon(g, cx, cy, r, grosor, luz, alfa) {
    const SEG = 120;
    for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI * 2;
        const a1 = ((i + 1) / SEG) * Math.PI * 2;   // sin solape
        const t = Math.abs(((i / SEG) * 2) - 1);
        const col = mezclar(colorB(luz), colorC(luz), t);
        g.lineStyle(grosor, col, alfa);
        g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    }
}

const textoFps = new PIXI.Text("", { fill: 0xffffff, fontSize: 13, fontFamily: "Arial" });
textoFps.position.set(10, 10);
app.stage.addChild(textoFps);

let ultimoFrame = performance.now();
let fpsSuave = 60;

app.ticker.add(() => {
    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - ultimoFrame) / 1000);
    ultimoFrame = ahora;
    const factor = dt * 60;
    const activo = musicaIniciada && !audio.paused;

    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2, cy = h / 2;
    const radio = Math.min(w, h) * 0.23;

    // Detección y lógica (sin cambios)
    actualizarNiveles();
    medirPulsosBola(ahora, activo, factor);
    elegirGuia(ahora);
    const pulsoGuia = pulsoDeGuia();
    detectarOla(ahora, activo, factor);
    actualizarBola(pulsoGuia, ahora, factor, radio);
    actualizarGrosor(factor, activo);
    actualizarFondo(w, h, factor);
    actualizarAnillos(ahora, dt, factor, activo, radio, cx, cy);

    // Color y fondo
    matiz = (matiz + (0.12 + fuerzaPulso * 0.6) * factor) % 360;
    app.renderer.background.color = hslAHex(matiz + 250, 70, 14 + fuerzaPulso * 6);

    dibujarOla(cx, cy, radio, dt, factor, activo)

    // Círculo neón: halo + color + núcleo claro, con la paleta de las orejas
    haloBola.clear();
    colorBola.clear();
    nucleo.clear();
    circuloNeon(haloBola, cx, cy, radioSuave, grosorActual * 1.8, 55, 0.4);
    circuloNeon(colorBola, cx, cy, radioSuave, grosorActual, 60, 1);
    nucleo.lineStyle(grosorActual * 0.4, hslAHex(matiz, 30, 92), 0.9);
    nucleo.drawCircle(cx, cy, radioSuave);
});

// Cada oreja: halo borroso (detrás) + forma nítida (encima)
const haloIzq = new PIXI.Graphics();
const haloDer = new PIXI.Graphics();
const gOrejaIzq = new PIXI.Graphics();
const gOrejaDer = new PIXI.Graphics();

for (const g of [haloIzq, haloDer]) {
    g.blendMode = PIXI.BLEND_MODES.ADD;
    g.filters = [new PIXI.BlurFilter(40)];
}
for (const g of [gOrejaIzq, gOrejaDer]) {
    g.blendMode = PIXI.BLEND_MODES.ADD;
}
app.stage.addChildAt(gOrejaDer, 0);
app.stage.addChildAt(gOrejaIzq, 0);
app.stage.addChildAt(haloDer, 0);
app.stage.addChildAt(haloIzq, 0);

const MANCHAS = 6;
const manchas = [];
const contFondo = new PIXI.Container();
contFondo.filters = [new PIXI.BlurFilter(60)];
for (let i = 0; i < MANCHAS; i++) {
    const g = new PIXI.Graphics();
    g.blendMode = PIXI.BLEND_MODES.ADD;
    contFondo.addChild(g);
    manchas.push(g);
}
let tFondo = 0;

function actualizarFondo(w, h, factor) {
    tFondo += (0.004 + fuerzaPulso * 0.004) * factor;
    const grande = Math.max(w, h);
    for (let i = 0; i < MANCHAS; i++) {
        const fase = tFondo + i * 1.9;
        const x = w * (0.5 + 0.45 * Math.sin(fase * 0.9 + i));
        const y = h * (0.5 + 0.45 * Math.cos(fase * 0.7 + i * 2));
        const r = grande * (0.16 + 0.06 * Math.sin(fase + i));
        const col = [colorA, colorB, colorC][i % 3](45);
        manchas[i].clear();
        manchas[i].beginFill(col, 0.35 + fuerzaPulso * 0.15);
        manchas[i].drawCircle(x, y, r);
        manchas[i].endFill();
    }
}

const gAnillos = new PIXI.Graphics();
gAnillos.blendMode = PIXI.BLEND_MODES.ADD;
app.stage.addChildAt(gAnillos, 0);
app.stage.addChildAt(contFondo, 0);   // el fondo queda como primera capa
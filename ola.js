// ---- FRECUENCIA Y DISPARO ----
const FREC_OLA = 150;           // debe existir en bandas[] de deteccion.js
const OLA_VENTANA = 100;        // ms en los que se mide el salto
const OLA_SALTO_MIN = 0.1;      // salto mínimo para lanzar una ola
const OLA_REL = 1.8;            // el salto debe superar X veces su variación típica
const OLA_SALTO_MAX = 0.30;     // salto que da la altura máxima
const OLA_ALTURA_MIN = 0.07;    // altura mínima de cualquier ola
const OLA_INTERVALO = 100;      // ms mínimos entre olas

// ---- FORMA Y TIEMPOS ----
const OLA_SUBIDA_S = 0.08;      // segundos que tarda en subir
const OLA_BAJADA_S = 0.18;      // segundos que tarda en bajar
const OLA_ALTO = 0.7;           // altura máxima como proporción del radio
const OLA_ANGULO = -3 * Math.PI / 4;               // izquierda (-PI/2 = arriba)
const OLA_ANGULO_ESPEJO = -Math.PI - OLA_ANGULO;   // derecha (espejo)
const anchoOla = Math.PI / 2.7; // ancho angular de la ola

// ---- BARRAS ----
const OLA_BARRAS = 40;          // barras por oreja (10 = gruesas, 24 = finas)
const OLA_BARRA_ANCHO = 0.85;    // 0-1: proporción del hueco que ocupa cada barra
const OLA_HALO_EXTRA = 3;       // grosor extra del resplandor de color
const OLA_RADIAL = true;        // true = abanico hacia afuera, false = todas verticales

// ---- PAUSA ARRIBA SEGÚN EL RITMO ----
const OLA_PAUSA_LENTA = 80;     // ms arriba cuando hay pocas olas
const OLA_PAUSA_RAPIDA = 30;    // ms arriba cuando hay muchas olas
const OLA_RITMO_VENTANA = 1000; // ms para contar olas recientes
const OLA_RITMO_RAPIDO = 4;     // olas por segundo que cuentan como "muy rápido"

// ---- ESTADO ----
const histOla = [];
const tiemposOla = [];
let variacionOla = 0;
let olaActiva = false;
let alturaOla = 0;
let ultimaOla = 0;
let pausaActual = OLA_PAUSA_LENTA;
let faseOla = "subida";         // subida -> pausa -> bajada
let tFase = 0;                  // segundos dentro de la fase

// Detecta un salto brusco en la banda y lanza la ola
function detectarOla(ahora, activo, factor) {
    const nivelOla = nivelDe(FREC_OLA);
    histOla.push({ t: ahora, v: nivelOla });
    while (histOla.length && ahora - histOla[0].t > OLA_VENTANA) histOla.shift();
    let minimo = nivelOla;
    for (const h of histOla) if (h.v < minimo) minimo = h.v;
    const salto = nivelOla - minimo;

    const umbral = Math.max(OLA_SALTO_MIN, variacionOla * OLA_REL);
    if (
        activo &&
        ahora - inicioMusica > 1000 &&
        !olaActiva &&
        salto > umbral &&
        ahora - ultimaOla >= OLA_INTERVALO
    ) {
        ultimaOla = ahora;
        olaActiva = true;
        faseOla = "subida";
        tFase = 0;
        alturaOla = Math.max(OLA_ALTURA_MIN, Math.min(1, salto / OLA_SALTO_MAX));

        // Cuántas olas hay por segundo -> cuánto tiempo se queda arriba
        tiemposOla.push(ahora);
        while (tiemposOla.length && ahora - tiemposOla[0] > OLA_RITMO_VENTANA) tiemposOla.shift();
        const olasPorSeg = tiemposOla.length / (OLA_RITMO_VENTANA / 1000);
        const f = Math.min(1, olasPorSeg / OLA_RITMO_RAPIDO);
        pausaActual = OLA_PAUSA_LENTA + (OLA_PAUSA_RAPIDA - OLA_PAUSA_LENTA) * f;
    }
    variacionOla += (salto - variacionOla) * (1 - Math.pow(1 - 0.02, factor));
}

// Avanza las fases y dibuja las dos orejas (haloIzq, haloDer, gOrejaIzq, gOrejaDer vienen de main.js)
function dibujarOla(cx, cy, radio, dt, factor, activo) {
    haloIzq.clear();
    haloDer.clear();
    gOrejaIzq.clear();
    gOrejaDer.clear();
    if (!olaActiva) return;

    let p;
    tFase += dt;
    if (faseOla === "subida") {
        const x = Math.min(1, tFase / OLA_SUBIDA_S);
        p = 1 - Math.pow(1 - x, 3);
        if (x >= 1) { faseOla = "pausa"; tFase = 0; }
    } else if (faseOla === "pausa") {
        p = 1;
        if (tFase * 1000 >= pausaActual) { faseOla = "bajada"; tFase = 0; }
    } else {
        const x = Math.min(1, tFase / OLA_BAJADA_S);
        p = 1 - x * x;
        if (x >= 1) { olaActiva = false; return; }
    }

    const altura = p * alturaOla * radio * OLA_ALTO;
    trazarOreja(haloIzq, gOrejaIzq, cx, cy, OLA_ANGULO, altura, colorB(55));
    trazarOreja(haloDer, gOrejaDer, cx, cy, OLA_ANGULO_ESPEJO, altura, colorC(55));
}

// Cada oreja es una fila de barras; su largo sigue el perfil de la ola
function trazarOreja(gHalo, g, cx, cy, centro, altura, colHalo) {
    const a1 = centro + anchoOla / 2;
    const paso = anchoOla / OLA_BARRAS;
    const grosor = Math.max(2, radioSuave * paso * OLA_BARRA_ANCHO);
    const colBarra = hslAHex(matiz, 40, 88);

    for (let i = 0; i < OLA_BARRAS; i++) {
        const t = (i + 0.5) / OLA_BARRAS;
        const ang = a1 - t * anchoOla;
        const largo = Math.pow(Math.sin(t * Math.PI), 2.1) * altura;
        if (largo < 1) continue;

        const x0 = cx + Math.cos(ang) * radioSuave;
        const y0 = cy + Math.sin(ang) * radioSuave;
        let x1, y1;
        if (OLA_RADIAL) {
            x1 = cx + Math.cos(ang) * (radioSuave + largo);
            y1 = cy + Math.sin(ang) * (radioSuave + largo);
        } else {
            x1 = x0;
            y1 = y0 - largo;
        }

        // Resplandor de color
        gHalo.lineStyle(grosor + OLA_HALO_EXTRA, colHalo, 0.9);
        gHalo.moveTo(x0, y0);
        gHalo.lineTo(x1, y1);

        // Barra nítida casi blanca
        g.lineStyle({ width: grosor, color: colBarra, alpha: 0.95, cap: PIXI.LINE_CAP.ROUND });
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
    }
}

function resetearOla() {
    histOla.length = 0;
    tiemposOla.length = 0;
    variacionOla = 0;
    olaActiva = false;
    alturaOla = 0;
    ultimaOla = 0;
    pausaActual = OLA_PAUSA_LENTA;
    faseOla = "subida";
    tFase = 0;
}
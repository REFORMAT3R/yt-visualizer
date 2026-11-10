// Grosor del borde de la bola según el sub-grave (60 Hz)
const FREC_GROSOR = 60;          // debe existir en bandas[] de deteccion.js
const GROSOR_BASE = 16;           // grosor normal de la línea (px)
const GROSOR_EXTRA = 12;          // cuánto se suma como máximo (px)
const GROSOR_EXCESO = 25;         // sensibilidad: más alto = reacciona con menos energía
const GROSOR_PROM_VEL = 0.02;    // qué tan lento aprende el nivel "normal"
const GROSOR_ATAQUE = 0.2;      // subida (más alto = más rápido)
const GROSOR_CAIDA = 0.1;       // bajada (más bajo = más lento y suave)

let promedioGrosor = 0;
let grosorActual = GROSOR_BASE;

function actualizarGrosor(factor, activo) {
    const n = nivelDe(FREC_GROSOR);
    promedioGrosor += (n - promedioGrosor) * (1 - Math.pow(1 - GROSOR_PROM_VEL, factor));
    const exceso = activo ? Math.max(0, n - promedioGrosor) : 0;
    const objetivo = GROSOR_BASE + Math.min(1, exceso * GROSOR_EXCESO) * GROSOR_EXTRA;
    const vel = objetivo > grosorActual ? GROSOR_ATAQUE : GROSOR_CAIDA;
    grosorActual += (objetivo - grosorActual) * (1 - Math.pow(1 - vel, factor));
}

function resetearGrosor() {
    promedioGrosor = 0;
    grosorActual = GROSOR_BASE;
}
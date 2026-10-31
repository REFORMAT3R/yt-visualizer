// ---- BANDAS QUE USA LA BOLA ----
const BANDAS_BOLA = [150, 8000];
const idxBola = BANDAS_BOLA.map(f => indiceBanda(f));

// ---- DETECCIÓN DE PULSOS (de la bola) ----
const medias = BANDAS_BOLA.map(() => 0);
const previos = BANDAS_BOLA.map(() => 0);
const valores = BANDAS_BOLA.map(() => 0);
const ultimoPulsoBanda = BANDAS_BOLA.map(() => 0);
const pulsosBanda = BANDAS_BOLA.map(() => []);
const pps = BANDAS_BOLA.map(() => 0);
const hubo = BANDAS_BOLA.map(() => false);

const MEDIA_VEL = 0.015;
const EXCESO = 5;
const UMBRAL_EXCESO = 0.05;
const CAMBIO_MIN = 0.015;
const INTERVALO_MIN = 150;
const VENTANA_PPS = 2000;
const ARRANQUE_MS = 2000;

// ---- BANDA GUÍA ----
const PPS_MIN = 2.1;
const VENTAJA_CAMBIO = 1;
const ESPERA_CAMBIO = 1500;
let guia = -1;
let ultimoCambioGuia = 0;

// ---- BOLA ----
let fuerzaPulso = 0;
let tempoMs = 400;
const tiemposGuia = [];
const FACTOR_RELAJ = 1.7;
const CRECE_PROMEDIO = 0.08;
let radioSuave = 0;
const SUAVIZADO_BOLA = 0.35;

// Mide pulsos en las bandas de la bola usando los niveles de deteccion.js
function medirPulsosBola(ahora, activo, factor) {
    const rapidezMedia = ahora - inicioMusica < ARRANQUE_MS ? 0.15 : MEDIA_VEL;

    for (let j = 0; j < idxBola.length; j++) {
        const n = nivelDe(BANDAS_BOLA[j]);   // antes: nivel[idxBola[j]]
        medias[j] += (n - medias[j]) * (1 - Math.pow(1 - rapidezMedia, factor));
        const exceso = Math.max(0, n - medias[j]);

        const o = Math.min(1, exceso * EXCESO);
        valores[j] += (o - valores[j]) * (o > valores[j] ? 0.6 : 0.2);

        hubo[j] =
            activo &&
            ahora - inicioMusica > 500 &&
            exceso > UMBRAL_EXCESO &&
            n - previos[j] > CAMBIO_MIN &&
            ahora - ultimoPulsoBanda[j] >= INTERVALO_MIN;

        if (hubo[j]) {
            ultimoPulsoBanda[j] = ahora;
            pulsosBanda[j].push(ahora);
        }

        previos[j] = n;
        const lista = pulsosBanda[j];
        while (lista.length && ahora - lista[0] > VENTANA_PPS) lista.shift();
        pps[j] = lista.length / (VENTANA_PPS / 1000);
    }
}

// Elige como guía la banda viva con menos pulsos por segundo
function elegirGuia(ahora) {
    let mejor = -1;
    for (let j = 0; j < idxBola.length; j++) {
        if (pps[j] < PPS_MIN) continue;
        if (mejor === -1 || pps[j] < pps[mejor]) mejor = j;
    }
    const guiaMuerta = guia === -1 || pps[guia] < PPS_MIN;
    if (mejor !== -1 && mejor !== guia) {
        if (guiaMuerta) {
            guia = mejor;
            ultimoCambioGuia = ahora;
            tiemposGuia.length = 0;
        } else if (
            pps[mejor] < pps[guia] - VENTAJA_CAMBIO &&
            ahora - ultimoCambioGuia > ESPERA_CAMBIO
        ) {
            guia = mejor;
            ultimoCambioGuia = ahora;
            tiemposGuia.length = 0;
        }
    }
}

// true si la banda guía tuvo pulso en este frame
function pulsoDeGuia() {
    return guia !== -1 && hubo[guia] && pps[guia] >= PPS_MIN;
}

// Actualiza pulso, tempo y tamaño de la bola
function actualizarBola(pulsoGuia, ahora, factor, radio) {
    if (pulsoGuia) {
        fuerzaPulso = 1;
        tiemposGuia.push(ahora);
        while (tiemposGuia.length > 12) tiemposGuia.shift();
        if (tiemposGuia.length >= 5) {
            const ints = [];
            for (let i = 1; i < tiemposGuia.length; i++) {
                ints.push(tiemposGuia[i] - tiemposGuia[i - 1]);
            }
            ints.sort((a, b) => a - b);
            const mediana = ints[Math.floor(ints.length / 2)];
            tempoMs += (Math.min(900, Math.max(120, mediana)) - tempoMs) * 0.15;
        }
    }

    const framesPorPulso = (tempoMs / 1000) * 60;
    const decaimiento = Math.pow(0.05, 1 / (framesPorPulso * FACTOR_RELAJ));
    fuerzaPulso *= Math.pow(decaimiento, factor);

    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const radioObjetivo =
        radio * (1 + CRECE_PROMEDIO * promedio * 2) + fuerzaPulso * radio * 0.07;
    if (radioSuave === 0) radioSuave = radioObjetivo;
    radioSuave += (radioObjetivo - radioSuave) * (1 - Math.pow(1 - SUAVIZADO_BOLA, factor));
}

// Dibuja la línea de la bola con un efecto de anillo de fuego
function trazarCirculo(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
        const a = (i / 240) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function dibujarBola(bolaX, bolaY) {
    const d = 2 + fuerzaPulso * 4;   // separación de los canales de color
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = typeof grosorActual !== "undefined" ? grosorActual : 3;

    ctx.strokeStyle = tono(180, 55, 0.85);    // un canal hacia la izquierda
    trazarCirculo(bolaX - d, bolaY, radioSuave);
    ctx.stroke();

    ctx.strokeStyle = tono(300, 55, 0.85);    // otro hacia la derecha
    trazarCirculo(bolaX + d, bolaY, radioSuave);
    ctx.stroke();

    ctx.shadowColor = tono(240, 65, 1);       // el trazo central, blanco con resplandor
    ctx.shadowBlur = 10 + fuerzaPulso * 8;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    trazarCirculo(bolaX, bolaY, radioSuave);
    ctx.stroke();
    ctx.restore();
}

function resetearBola() {
    medias.fill(0);
    previos.fill(0);
    valores.fill(0);
    ultimoPulsoBanda.fill(0);
    pps.fill(0);
    hubo.fill(false);
    pulsosBanda.forEach(p => (p.length = 0));
    fuerzaPulso = 0;
    tempoMs = 400;
    tiemposGuia.length = 0;
    radioSuave = 0;
    guia = -1;
    ultimoCambioGuia = 0;
}
// ---- FRECUENCIA Y DISPARO ----
const FREC_OLA = 150;           // debe existir en bandas[] de deteccion.js
const OLA_VENTANA = 100;        // ms en los que se mide el salto
const OLA_SALTO_MIN = 0.1;      // salto mínimo para lanzar una ola
const OLA_REL = 1.8;            // el salto debe superar X veces su variación típica
const OLA_SALTO_MAX = 0.30;     // salto que da la altura máxima
const OLA_ALTURA_MIN = 0.05;     // altura mínima de cualquier ola
const OLA_INTERVALO = 100;      // ms mínimos entre olas

// ---- FORMA Y TIEMPOS ----
const OLA_SUBIDA_S = 0.08;      // segundos que tarda en subir
const OLA_BAJADA_S = 0.18;      // segundos que tarda en bajar
const OLA_ALTO = 0.7;           // altura máxima como proporción del radio
const OLA_ANGULO = -3 * Math.PI / 4; // posición fija (-PI/2 = arriba, -PI/4 = diagonal arriba-derecha)
const OLA_ANGULO_ESPEJO = -Math.PI - OLA_ANGULO;   // derecha (espejo) = -PI/4
const anchoOla = Math.PI / 2.7; // ancho angular de la ola

// ---- PAUSA ARRIBA SEGÚN EL RITMO ----
const OLA_PAUSA_LENTA = 80;    // ms arriba cuando hay pocas olas (música lenta)
const OLA_PAUSA_RAPIDA = 30;    // ms arriba cuando hay muchas olas (música rápida)
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
        const f = Math.min(1, olasPorSeg / OLA_RITMO_RAPIDO);   // 0 = lento, 1 = rápido
        pausaActual = OLA_PAUSA_LENTA + (OLA_PAUSA_RAPIDA - OLA_PAUSA_LENTA) * f;
    }
    variacionOla += (salto - variacionOla) * (1 - Math.pow(1 - 0.02, factor));
}

function dibujarOla(bolaX, bolaY, radio, dt, factor, activo) {
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
    dibujarForma(bolaX, bolaY, OLA_ANGULO, altura, 0);
    dibujarForma(bolaX, bolaY, OLA_ANGULO_ESPEJO, altura, 180);
}

function dibujarForma(bolaX, bolaY, centro, altura, desfase) {
    const a1 = centro + anchoOla / 2;
    const a2 = a1 - anchoOla;
    const pasos = 120;
    const rr = radioSuave + altura * 0.5;

    const grad = ctx.createLinearGradient(
        bolaX + Math.cos(a1) * rr, bolaY + Math.sin(a1) * rr,
        bolaX + Math.cos(a2) * rr, bolaY + Math.sin(a2) * rr
    );
    grad.addColorStop(0,    tono(desfase, 50));
    grad.addColorStop(0.33, tono(desfase + 70, 52));
    grad.addColorStop(0.66, tono(desfase + 140, 52));
    grad.addColorStop(1,    tono(desfase + 210, 50));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = tono(desfase + 100, 60, 0.9);
    ctx.shadowBlur = 30;

    // Relleno
    ctx.beginPath();
    for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const ang = a1 - t * anchoOla;
        const r = radioSuave + Math.pow(Math.sin(t * Math.PI), 2.1) * altura;
        const x = bolaX + Math.cos(ang) * r;
        const y = bolaY + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = pasos; i >= 0; i--) {
        const ang = a1 - (i / pasos) * anchoOla;
        ctx.lineTo(bolaX + Math.cos(ang) * radioSuave, bolaY + Math.sin(ang) * radioSuave);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Borde
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const ang = a1 - t * anchoOla;
        const r = radioSuave + Math.pow(Math.sin(t * Math.PI), 2.1) * altura;
        const x = bolaX + Math.cos(ang) * r;
        const y = bolaY + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = tono(desfase + 100, 65, 0.9);
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.restore();
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
const MOSTRAR_DEBUG = true;
let ultimoFrame = performance.now();

function dibujar() {
    const ahora = performance.now();
    const dt = Math.min(0.05, (ahora - ultimoFrame) / 1000);
    ultimoFrame = ahora;
    const factor = dt * 60;
    const activo = musicaIniciada && !audio.paused;

    // Geometría (va arriba porque el fondo la necesita)
    const bolaX = canvas.width / 2;
    const bolaY = canvas.height / 2;
    const radio = Math.min(canvas.width, canvas.height) * 0.23;

    // Detección
    actualizarNiveles();
    actualizarGrosor(factor, activo);
    medirPulsosBola(ahora, activo, factor);
    elegirGuia(ahora);
    const pulsoGuia = pulsoDeGuia();
    detectarOla(ahora, activo, factor);

    // Estado de las animaciones
    actualizarBola(pulsoGuia, ahora, factor, radio);
    actualizarColor(factor);

    // Dibujo (de atrás hacia adelante)
    dibujarFondo(bolaX, bolaY, radio);
    actualizarAnillos(ahora, dt, factor, activo, radio, bolaX, bolaY);
    dibujarOla(bolaX, bolaY, radio, dt, factor, activo);
    dibujarBola(bolaX, bolaY);

    if (MOSTRAR_DEBUG) {
        ctx.fillStyle = "#888";
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            guia === -1
                ? "sin banda guía"
                : `guía: ${BANDAS_BOLA[guia]} Hz · ${pps[guia].toFixed(1)} pulsos/s`,
            bolaX,
            bolaY + radio * 1.5
        );
    }

    if (MOSTRAR_DEBUG) {
    ctx.fillStyle = "#fff";
    ctx.font = "13px Arial";
    ctx.textAlign = "left";
    ctx.fillText(Math.round(1 / dt) + " fps", 10, 20);
}

    requestAnimationFrame(dibujar);
}
dibujar();
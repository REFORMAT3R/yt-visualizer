const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audio = document.getElementById("audio");
const boton = document.getElementById("reproducir");
const entradaUrl = document.getElementById("youtubeUrl");
const estado = document.getElementById("estado");
const volumen = document.getElementById("volumen");
const tiempoTxt = document.getElementById("tiempo");
const totalTxt = document.getElementById("total");
const barra = document.getElementById("barra");
const barraRelleno = document.getElementById("barraRelleno");

// TAMAÑO RESPONSIVE
function ajustarCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", ajustarCanvas);
ajustarCanvas();

let musicaIniciada = false;
let inicioMusica = 0;

// ANALIZADOR DE AUDIO
let contextoAudio = null;
let analizador = null;
let fuenteAudio = null;
let ganancia = null;
let datosFrecuencia = null;

async function prepararAudio() {
    if (!contextoAudio) {
        contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
        analizador = contextoAudio.createAnalyser();
        analizador.fftSize = 2048;
        analizador.smoothingTimeConstant = 0.5;
        datosFrecuencia = new Uint8Array(analizador.frequencyBinCount);
        fuenteAudio = contextoAudio.createMediaElementSource(audio);

        // El analizador lee la señal cruda; el volumen se aplica DESPUÉS
        fuenteAudio.connect(analizador);
        ganancia = contextoAudio.createGain();
        ganancia.gain.value = parseFloat(volumen.value);
        analizador.connect(ganancia);
        ganancia.connect(contextoAudio.destination);
    }
    if (contextoAudio.state === "suspended") {
        await contextoAudio.resume();
    }
}

volumen.addEventListener("input", () => {
    if (ganancia) ganancia.gain.value = parseFloat(volumen.value);
});

// Nivel (0-1) de una frecuencia central
function nivelEn(f) {
    if (!analizador || audio.paused) return 0;
    const ANCHO_BANDA = 1.25;
    const hzPorBin = contextoAudio.sampleRate / analizador.fftSize;
    const maxBin = datosFrecuencia.length - 1;
    const ini = Math.max(1, Math.floor((f / ANCHO_BANDA) / hzPorBin));
    const fin = Math.min(maxBin, Math.ceil((f * ANCHO_BANDA) / hzPorBin));
    if (ini > maxBin) return 0;
    let suma = 0;
    let n = 0;
    for (let i = ini; i <= fin; i++) {
        suma += datosFrecuencia[i];
        n++;
    }
    return n ? suma / n / 255 : 0;
}

// CONTROLES PROPIOS
function formatear(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

document.getElementById("playPausa").addEventListener("click", () => {
    if (!audio.src) return;
    if (audio.paused) audio.play();
    else audio.pause();
});

// Los controles aparecen al mover el mouse y se esconden a los 2.5 s
const panel = document.getElementById("reproductor");
let temporizadorPanel = null;
window.addEventListener("mousemove", () => {
    panel.classList.add("visible");
    clearTimeout(temporizadorPanel);
    temporizadorPanel = setTimeout(() => {
        panel.classList.remove("visible");
    }, 2500);
});

function duracionEfectiva() {
    if (isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    const s = audio.seekable;
    return s.length ? s.end(s.length - 1) : 0;
}

audio.addEventListener("timeupdate", () => {
    tiempoTxt.textContent = formatear(audio.currentTime);
    const d = duracionEfectiva();
    if (isFinite(audio.duration) && audio.duration > 0) {
        totalTxt.textContent = formatear(audio.duration);
    }
    if (d > 0) {
        barraRelleno.style.width = Math.min(100, (audio.currentTime / d) * 100) + "%";
    }
});

barra.addEventListener("click", e => {
    const d = duracionEfectiva();
    if (d <= 0) return;
    const r = barra.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * d;
});

// REPRODUCIR DESDE YOUTUBE
boton.addEventListener("click", async () => {
    const url = entradaUrl.value.trim();
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
        estado.textContent = "Introduce una URL válida de YouTube.";
        return;
    }
    try {
        boton.disabled = true;
        estado.textContent = "Cargando música...";
        await prepararAudio();
        audio.src = "/audio?url=" + encodeURIComponent(url);
        audio.load();
        await audio.play();
        musicaIniciada = true;
        inicioMusica = performance.now();
        resetearDeteccion();
        resetearBola();
        resetearOla();
        resetearAnillos();
        resetearGrosor();
        barraRelleno.style.width = "0%";
        totalTxt.textContent = "--:--";
        estado.textContent = "Música reproduciéndose.";
    } catch (error) {
        console.error(error);
        estado.textContent = "No se pudo reproducir. Revisa la URL y la consola del servidor.";
    } finally {
        boton.disabled = false;
    }
});
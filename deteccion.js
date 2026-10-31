// Solo capta el nivel (0-1) de cada banda. No mide pulsos ni nada más.
const bandas = [
    { f: 60,    etq: "60 Hz" },
    { f: 150,   etq: "150 Hz" },
    { f: 400,   etq: "400 Hz" },
    { f: 1000,  etq: "1 kHz" },
    { f: 2500,  etq: "2.5 kHz" },
    { f: 5000,  etq: "5 kHz" },
    { f: 8000,  etq: "8 kHz" },
    { f: 12000, etq: "12 kHz" },
    { f: 16000, etq: "16 kHz" }
];

// Índice de una banda por su frecuencia (para que otros archivos no dependan del orden)
function indiceBanda(f) {
    return bandas.findIndex(b => b.f === f);
}

// Devuelve un arreglo con el nivel (0-1) de cada banda
function leerBandas() {
    const salida = bandas.map(() => 0);
    if (!analizador || audio.paused) return salida;
    analizador.getByteFrequencyData(datosFrecuencia);
    bandas.forEach((b, k) => {
        salida[k] = nivelEn(b.f);
    });
    return salida;
}

// Último nivel leído de cada banda (se rellena en cada frame)
let niveles = bandas.map(() => 0);

// Lo llama main.js una vez por frame
function actualizarNiveles() {
    niveles = leerBandas();
}

// Nivel (0-1) de una banda por su frecuencia. Si no existe en `bandas`, la avisa.
function nivelDe(f) {
    const i = indiceBanda(f);
    if (i === -1) {
        console.warn("La frecuencia " + f + " Hz no está en bandas[] de deteccion.js");
        return 0;
    }
    return niveles[i];
}

// No hay nada que resetear: este archivo no guarda estado
function resetearDeteccion() {}
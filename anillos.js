const FREC_ANILLO = 5000;
const ANILLO_UMBRAL = 0.06;
const ANILLO_CAMBIO = 0.02;
const ANILLO_INTERVALO = 120;
const ANILLO_DURACION = 0.7;
const ANILLO_ALCANCE = 0.9;
const ANILLOS_MAX = 6;
const anillos = [];
let medioAnillo = 0;
let previoAnillo = 0;
let ultimoAnilloT = 0;

function actualizarAnillos(ahora, dt, factor, activo, radio, cx, cy) {
    gAnillos.clear();

    const n5 = nivelDe(FREC_ANILLO);
    const subida = n5 - previoAnillo;
    medioAnillo += (n5 - medioAnillo) * (1 - Math.pow(1 - 0.02, factor));
    const exceso = Math.max(0, n5 - medioAnillo);
    previoAnillo = n5;

    if (
        activo &&
        ahora - inicioMusica > 1000 &&
        exceso > ANILLO_UMBRAL &&
        subida > ANILLO_CAMBIO &&
        ahora - ultimoAnilloT >= ANILLO_INTERVALO &&
        anillos.length < ANILLOS_MAX
    ) {
        ultimoAnilloT = ahora;
        anillos.push({ t: 0, fuerza: Math.min(1, 0.5 + exceso * 3) });
    }

    for (let i = anillos.length - 1; i >= 0; i--) {
        const a = anillos[i];
        a.t += dt / ANILLO_DURACION;
        if (a.t >= 1) { anillos.splice(i, 1); continue; }
        const suave = 1 - Math.pow(1 - a.t, 2);
        const r = radioSuave + suave * radio * ANILLO_ALCANCE;
        const alfa = Math.pow(1 - a.t, 1.5) * 0.7 * a.fuerza;
        gAnillos.lineStyle(2.5 - a.t * 1.5, hslAHex(matiz + 200 + a.t * 120, 100, 70), alfa);
        gAnillos.drawCircle(cx, cy, r);
    }
}

function resetearAnillos() {
    anillos.length = 0;
    medioAnillo = 0;
    previoAnillo = 0;
    ultimoAnilloT = 0;
}
const MANCHAS = 6;
const FONDO_BRILLO = 0.3;
const FONDO_ESCALA = 0.20; 
let tFondo = 0;
let matiz = 280;   

const fondoCanvas = document.createElement("canvas");
const fctx = fondoCanvas.getContext("2d");

// --- OPTIMIZACIÓN: Tu función tono() ahora es mucho más limpia usando template literals modernos
function actualizarColor(factor) {
    matiz = (matiz + (0.12 + fuerzaPulso * 0.6) * factor) % 360;
}

function tono(desfase, luz = 60, alfa = 1) {
    return `hsla(${(matiz + desfase) % 360}, 100%, ${luz}%, ${alfa})`;
}

function dibujarFondo(bolaX, bolaY, radio) {
    tFondo += 0.004 + fuerzaPulso * 0.004;

    const w = Math.max(1, Math.round(canvas.width * FONDO_ESCALA));
    const h = Math.max(1, Math.round(canvas.height * FONDO_ESCALA));
    
    if (fondoCanvas.width !== w || fondoCanvas.height !== h) {
        fondoCanvas.width = w;
        fondoCanvas.height = h;
    }
    
    const grande = Math.max(w, h);
    const bx = (bolaX * FONDO_ESCALA) | 0;
    const by = (bolaY * FONDO_ESCALA) | 0;

    fctx.globalCompositeOperation = "source-over";
    
    // 1. Gradiente Base Optimizado
    const base = fctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, `hsl(${(matiz + 250) % 360}, 80%, 16%)`);   
    base.addColorStop(1, `hsl(${(matiz + 310) % 360}, 80%, 12%)`);   
    fctx.fillStyle = base;
    fctx.fillRect(0, 0, w, h);

    fctx.globalCompositeOperation = "lighter";
    
    // Cacheamos el cálculo del brillo para no repetirlo en el bucle
    const brilloCalculado = FONDO_BRILLO + fuerzaPulso * 0.2;

    // 2. Bucle de Manchas Optimizado (Redondeos directos a bits)
    for (let i = 0; i < MANCHAS; i++) {
        const fase = tFondo + i * 1.9;
        const x = (w * (0.5 + 0.45 * Math.sin(fase * 0.9 + i))) | 0;
        const y = (h * (0.5 + 0.45 * Math.cos(fase * 0.7 + i * 2))) | 0;
        const r = (grande * (0.28 + 0.12 * Math.sin(fase + i))) | 0;
        
        if (r <= 0) continue; // Seguridad matemática si el radio es negativo o cero

        const hue = (matiz + i * 55) % 360;
        
        // Creamos el gradiente radial de la mancha
        const g = fctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `hsla(${hue}, 100%, 60%, ${brilloCalculado})`);
        g.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
        
        fctx.fillStyle = g;
        fctx.fillRect(x - r, y - r, r * 2, r * 2);   
    }

    // 3. Destello Central Optimizado
    const radioDestello = (radio * FONDO_ESCALA * 2.2) | 0;
    if (radioDestello > 0) {
        const c = fctx.createRadialGradient(bx, by, 0, bx, by, radioDestello);
        const colorH = (matiz + 30) % 360;
        const alfaC = 0.3 + fuerzaPulso * 0.2;
        
        c.addColorStop(0, `hsla(${colorH}, 100%, 75%, ${alfaC})`);   
        c.addColorStop(1, `hsla(${colorH}, 100%, 70%, 0)`);
        fctx.fillStyle = c;
        fctx.fillRect(0, 0, w, h);
    }

    // Dibujo final en el lienzo principal (Súper veloz gracias a FONDO_ESCALA)
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fondoCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();
}

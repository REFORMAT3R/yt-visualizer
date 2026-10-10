const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

function obtenerStreamUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
        const ytDlp = spawn('yt-dlp', [
            '--cookies-from-browser', 'firefox',
            '-f', 'bestaudio',
            '-g', youtubeUrl
        ]);

        let salida = '';
        let error = '';

        ytDlp.stdout.on('data', data => {
            salida += data.toString();
        });

        ytDlp.stderr.on('data', data => {
            error += data.toString();
        });

        ytDlp.on('error', reject);

        ytDlp.on('close', codigo => {
            if (codigo !== 0) {
                reject(new Error(error || 'No se pudo obtener el audio'));
                return;
            }

            const streamUrl = salida.trim().split(/\r?\n/)[0];

            if (!streamUrl) {
                reject(new Error('No se obtuvo la URL del audio'));
                return;
            }

            resolve(streamUrl);
        });
    });
}

const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:3000');

    if (url.pathname === '/') {
        fs.readFile('index.html', (error, contenido) => {
            if (error) {
                res.writeHead(500);
                res.end('No se pudo abrir index.html');
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            res.end(contenido);
        });

        return;
    }

    if (url.pathname === '/audio') {
        const youtubeUrl = url.searchParams.get('url');

        if (
            !youtubeUrl ||
            !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)
        ) {
            res.writeHead(400);
            res.end('Introduce una URL válida de YouTube');
            return;
        }

        let ffmpeg;

        try {
            console.log('Obteniendo audio de YouTube...');

            const streamUrl = await obtenerStreamUrl(youtubeUrl);

            if (res.destroyed) return;

            console.log('Audio obtenido. Iniciando FFmpeg...');

            ffmpeg = spawn('ffmpeg', [
                '-hide_banner',
                '-loglevel', 'error',
                '-i', streamUrl,
                '-vn',
                '-f', 'mp3',
                '-ac', '2',
                '-ar', '44100',
                'pipe:1'
            ]);

            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked'
            });

            ffmpeg.stdout.pipe(res);

            ffmpeg.stderr.on('data', data => {
                console.error('FFmpeg:', data.toString());
            });

            ffmpeg.on('error', error => {
                console.error('Error de FFmpeg:', error.message);
                if (!res.destroyed) res.destroy();
            });

            ffmpeg.on('close', codigo => {
                console.log('FFmpeg terminó:', codigo);
                if (!res.destroyed) res.end();
            });

            req.on('close', () => {
                if (ffmpeg && !ffmpeg.killed) {
                    ffmpeg.kill();
                }
            });

        } catch (error) {
            console.error(error.message);

            if (!res.headersSent) {
                res.writeHead(500, {
                    'Content-Type': 'text/plain; charset=utf-8'
                });
                res.end('No se pudo obtener el audio. Revisa la URL y yt-dlp.');
            } else if (!res.destroyed) {
                res.destroy();
            }
        }

        return;
    }

    res.writeHead(404);
    res.end('No encontrado');
});

servidor.listen(3000, () => {
    console.log('Servidor iniciado en http://localhost:3000');
});
/**
 * Адаптировано для Render.com
 * Локальный запуск: node server.js → http://localhost:8080
 * На Render порт берётся из process.env.PORT
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ noServer: true });

const clients = new Set();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
    // '/' → index.html, иначе берём путь из URL
    const urlPath = req.url === '/' ? '/index.html' : req.url;

    // Защита от выхода за пределы корня (path traversal)
    const filePath = path.join(__dirname, path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, ''));

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

function accept(req, res) {
    // WebSocket-эндпоинт
    if (
        req.url === '/ws' &&
        req.headers.upgrade &&
        req.headers.upgrade.toLowerCase() === 'websocket' &&
        req.headers.connection &&
        req.headers.connection.match(/\bupgrade\b/i)
    ) {
        wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onSocketConnect);
        return;
    }

    // Всё остальное — статика (index.html, client.js, style.css и т.д.)
    serveStatic(req, res);
}

function onSocketConnect(ws) {
    clients.add(ws);
    log('новое подключение');

    ws.on('message', function (message) {
        const text = message.toString();
        log(`получено сообщение: ${text}`);

        const trimmed = text.slice(0, 50); // максимум 50 символов

        for (const client of clients) {
            // Отправляем только тем, кто ещё открыт
            if (client.readyState === WebSocket.OPEN) {
                client.send(trimmed);
            }
        }
    });

    ws.on('close', function () {
        log('подключение закрыто');
        clients.delete(ws);
    });

    ws.on('error', function (err) {
        log(`ошибка сокета: ${err.message}`);
        clients.delete(ws);
    });
}

let log;
if (!module.parent) {
    log = console.log;
    const port = process.env.PORT || 8080;
    http.createServer(accept).listen(port, '0.0.0.0', () => {
        log(`Сервер запущен на порту ${port}`);
    });
} else {
    log = function () {};
    exports.accept = accept;
}
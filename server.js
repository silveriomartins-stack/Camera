const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(req.headers['user-agent']);
  
  if (isMobile) {
    // Página do CELULAR - inicia câmera automático
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Camera</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #f0f0f0; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        video { width: 100%; border: 2px solid #333; border-radius: 5px; }
        .status { padding: 10px; background: #e3f2fd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📷 Celular</h1>
        <div class="status" id="status">Iniciando câmera...</div>
        <video id="localVideo" autoplay playsinline muted></video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const localVideo = document.getElementById('localVideo');
        const statusDiv = document.getElementById('status');
        
        let mediaStream = null;
        let intervaloEnvio = null;

        // INICIAR CÂMERA AUTOMATICAMENTE
        async function iniciarCamera() {
            try {
                statusDiv.innerHTML = '📷 Solicitando permissão...';
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 } 
                });
                
                mediaStream = stream;
                localVideo.srcObject = stream;
                
                statusDiv.innerHTML = '📷 Câmera ativa - Transmitindo...';
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const context = canvas.getContext('2d');
                
                // Enviar frames a cada 100ms
                intervaloEnvio = setInterval(() => {
                    if (mediaStream?.active) {
                        context.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                    }
                }, 100);
                
            } catch (err) {
                statusDiv.innerHTML = '❌ Erro: ' + err.message;
            }
        }
        
        // Iniciar quando a página carregar
        iniciarCamera();
    </script>
</body>
</html>
    `);
  } else {
    // Página do PC - recebe vídeo
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PC - Câmera</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        img { width: 100%; border: 2px solid #333; border-radius: 5px; }
        .status { padding: 10px; background: #e3f2fd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 PC - Câmera do Celular</h1>
        <div class="status" id="status">Aguardando celular...</div>
        <img id="remoteVideo">
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');

        socket.on('connect', () => {
            statusDiv.innerHTML = '✅ Conectado, aguardando celular...';
        });

        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            statusDiv.innerHTML = '📱 Recebendo vídeo do celular';
        });
    </script>
</body>
</html>
    `);
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado');
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

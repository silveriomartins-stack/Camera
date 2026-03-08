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
    // Página do CELULAR
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Celular</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #000; color: white; }
        video { width: 100%; border: 2px solid #4CAF50; border-radius: 10px; }
        .status { padding: 10px; background: #333; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📱 Celular</h1>
    <div class="status" id="status">Iniciando câmera...</div>
    <video id="localVideo" autoplay playsinline muted></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const localVideo = document.getElementById('localVideo');
        const statusDiv = document.getElementById('status');
        
        async function iniciarCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 },
                    audio: false
                });
                
                localVideo.srcObject = stream;
                statusDiv.innerHTML = '✅ Câmera ativa - Transmitindo...';
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const context = canvas.getContext('2d');
                
                // Enviar frames
                setInterval(() => {
                    if (stream.active) {
                        context.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                        console.log('Enviando frame...');
                    }
                }, 100);
                
            } catch (err) {
                statusDiv.innerHTML = '❌ Erro: ' + err.message;
            }
        }
        
        iniciarCamera();
    </script>
</body>
</html>
    `);
  } else {
    // Página do PC
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PC</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #000; color: white; }
        img { width: 100%; border: 2px solid #4CAF50; border-radius: 10px; }
        .status { padding: 10px; background: #333; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>💻 PC</h1>
    <div class="status" id="status">Aguardando celular...</div>
    <img id="remoteVideo">

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');

        socket.on('connect', () => {
            console.log('Conectado ao servidor');
            statusDiv.innerHTML = '✅ Conectado, aguardando celular...';
        });

        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            statusDiv.innerHTML = '📱 Recebendo vídeo do celular';
            console.log('Frame recebido');
        });
    </script>
</body>
</html>
    `);
  }
});

// Socket.IO - BROADCAST CORRETO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('frame', (frameData) => {
    // Envia para TODOS os outros clientes
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

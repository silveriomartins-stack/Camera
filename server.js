const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
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
        body { font-family: Arial; text-align: center; padding: 20px; background: #1a1a1a; color: white; }
        video { width: 100%; border: 2px solid #4CAF50; border-radius: 10px; background: black; }
        .status { padding: 15px; background: #333; border-radius: 5px; margin: 10px 0; font-size: 16px; }
        .info { background: #2196F3; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📱 CELULAR</h1>
    <div class="info" id="info">Conectando...</div>
    <div class="status" id="status">Iniciando câmera...</div>
    <video id="localVideo" autoplay playsinline muted></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const localVideo = document.getElementById('localVideo');
        const statusDiv = document.getElementById('status');
        const infoDiv = document.getElementById('info');

        socket.on('connect', () => {
            infoDiv.innerHTML = '✅ Conectado ao servidor! Socket ID: ' + socket.id;
            console.log('Conectado:', socket.id);
        });

        socket.on('disconnect', () => {
            infoDiv.innerHTML = '❌ Desconectado do servidor';
        });
        
        async function iniciarCamera() {
            try {
                statusDiv.innerHTML = '📷 Solicitando permissão...';
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: 'environment'
                    },
                    audio: false
                });
                
                localVideo.srcObject = stream;
                statusDiv.innerHTML = '✅ Câmera ativa! Transmitindo...';
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const context = canvas.getContext('2d');
                
                let frameCount = 0;
                
                // Enviar frames
                setInterval(() => {
                    if (stream.active) {
                        context.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                        
                        frameCount++;
                        if(frameCount % 10 === 0) {
                            console.log('Enviando frame:', frameCount);
                        }
                    }
                }, 100);
                
            } catch (err) {
                statusDiv.innerHTML = '❌ Erro: ' + err.message;
                console.error('Erro câmera:', err);
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
        body { font-family: Arial; text-align: center; padding: 20px; background: #1a1a1a; color: white; }
        img { width: 100%; border: 2px solid #4CAF50; border-radius: 10px; background: black; min-height: 240px; }
        .status { padding: 15px; background: #333; border-radius: 5px; margin: 10px 0; font-size: 16px; }
        .info { background: #2196F3; padding: 10px; border-radius: 5px; margin: 10px 0; }
        #debug { background: #000; padding: 10px; text-align: left; font-size: 12px; height: 100px; overflow: auto; }
    </style>
</head>
<body>
    <h1>💻 PC</h1>
    <div class="info" id="info">Conectando...</div>
    <div class="status" id="status">Aguardando celular...</div>
    <img id="remoteVideo">
    <div id="debug">Logs:</div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');
        const infoDiv = document.getElementById('info');
        const debugDiv = document.getElementById('debug');

        function addLog(msg) {
            debugDiv.innerHTML += '<br>' + msg;
            debugDiv.scrollTop = debugDiv.scrollHeight;
            console.log(msg);
        }

        socket.on('connect', () => {
            infoDiv.innerHTML = '✅ Conectado! Socket ID: ' + socket.id;
            addLog('Conectado ao servidor: ' + socket.id);
        });

        socket.on('disconnect', () => {
            infoDiv.innerHTML = '❌ Desconectado';
            addLog('Desconectado do servidor');
        });

        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            statusDiv.innerHTML = '📱 RECEBENDO VÍDEO DO CELULAR!';
            addLog('Frame recebido - ' + new Date().toLocaleTimeString());
        });

        // Tenta reconectar se perder conexão
        socket.on('connect_error', (err) => {
            addLog('Erro de conexão: ' + err.message);
        });
    </script>
</body>
</html>
    `);
  }
});

// Socket.IO - Log de tudo
io.on('connection', (socket) => {
  console.log('🔵 Cliente conectado:', socket.id);
  console.log('   IP:', socket.handshake.address);
  console.log('   User Agent:', socket.handshake.headers['user-agent']);
  
  socket.on('frame', (frameData) => {
    // Mostra log a cada 10 frames
    if(Math.random() < 0.1) {
      console.log('📸 Frame recebido de', socket.id, '- tamanho:', Math.round(frameData.length/1024), 'KB');
    }
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em:`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Rede: http://${require('os').networkInterfaces()['eth0']?.[0]?.address || '0.0.0.0'}:${PORT}`);
});

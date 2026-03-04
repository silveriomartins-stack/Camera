const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

// Configuração
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ========== HTML INLINE ==========
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>📷 Câmera em Tempo Real - Node.js</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.2em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .badge {
            font-size: 0.5em;
            background: #4CAF50;
            color: white;
            padding: 5px 15px;
            border-radius: 50px;
        }
        .status-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .status-item { 
            font-size: 1.1em;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .status-label { font-weight: bold; color: #555; }
        .status-value {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 500;
            background: #e0e0e0;
        }
        .led {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: inline-block;
            transition: all 0.3s;
        }
        .led-green {
            background-color: #4CAF50;
            box-shadow: 0 0 15px #4CAF50;
            animation: pulse 1.5s infinite;
        }
        .led-red {
            background-color: #f44336;
            box-shadow: 0 0 15px #f44336;
        }
        .led-yellow {
            background-color: #ffc107;
            box-shadow: 0 0 15px #ffc107;
            animation: pulse 1s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
        }
        .video-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .video-section, .photo-section {
            background: #f9f9f9;
            border-radius: 15px;
            padding: 20px;
        }
        .video-section h3, .photo-section h3 {
            margin-bottom: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .video-wrapper, .photo-wrapper {
            position: relative;
            width: 100%;
            background: #000;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        #remoteVideo, #localVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        #remoteVideo { display: none; }
        #localVideo { 
            display: none; 
            transform: scaleX(-1);
        }
        .video-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #333;
            color: #fff;
            font-size: 1.2em;
            flex-direction: column;
            gap: 10px;
            text-align: center;
            padding: 20px;
        }
        #remoteVideo[src] { display: block; }
        #localVideo[src] { display: block; }
        #remoteVideo[src] + .video-placeholder,
        #localVideo[src] + .video-placeholder { display: none; }
        
        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 15px 30px;
            font-size: 1.2em;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover:not(:disabled) { background: #5a67d8; transform: translateY(-2px); }
        .btn-secondary { background: #f44336; color: white; }
        .btn-secondary:hover:not(:disabled) { background: #d32f2f; transform: translateY(-2px); }
        .btn-success { background: #4CAF50; color: white; }
        .btn-success:hover:not(:disabled) { background: #45a049; transform: translateY(-2px); }
        
        .info-box {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #2196F3;
            margin-top: 20px;
        }
        .info-box h4 { color: #1976D2; margin-bottom: 15px; }
        .info-box ol { margin-left: 20px; color: #555; }
        .info-box li { margin: 10px 0; }
        .info-box a {
            color: #1976D2;
            font-weight: bold;
            text-decoration: none;
            background: white;
            padding: 8px 15px;
            border-radius: 5px;
            border: 2px solid #1976D2;
            display: inline-block;
            margin: 10px 0;
            word-break: break-all;
        }
        .debug-panel {
            background: #f0f0f0;
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .debug-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #ddd;
        }
        .debug-label { font-weight: bold; color: #555; }
        .debug-value { color: #2196F3; }
        .notificacao {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s;
        }
        .notificacao.sucesso { background: #4CAF50; }
        .notificacao.erro { background: #f44336; }
        .notificacao.info { background: #2196F3; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
            .container { padding: 20px; }
            .video-container { grid-template-columns: 1fr; }
            h1 { font-size: 1.8em; }
            .btn { width: 100%; justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            <span>📷</span>
            <span>Câmera em Tempo Real</span>
            <span class="badge">Node.js + Socket.IO</span>
        </h1>
        
        <div class="status-bar">
            <div class="status-item">
                <span class="status-label">Seu dispositivo:</span>
                <span id="deviceType" class="status-value">Não identificado</span>
            </div>
            <div class="status-item">
                <span class="status-label">Câmeras:</span>
                <span id="cameraCount" class="status-value">0</span>
                <span id="cameraLed" class="led led-red"></span>
            </div>
            <div class="status-item">
                <span class="status-label">Visualizadores:</span>
                <span id="viewerCount" class="status-value">0</span>
                <span id="streamLed" class="led led-red"></span>
            </div>
        </div>

        <div class="video-container">
            <div class="video-section">
                <h3>📱 <span id="localTitle">Visualização Local</span></h3>
                <div class="video-wrapper">
                    <video id="localVideo" autoplay playsinline muted></video>
                    <div id="localPlaceholder" class="video-placeholder">
                        <p>📱 Câmera desligada</p>
                        <p style="font-size:0.8em;">Clique em "Ligar Câmera" abaixo</p>
                    </div>
                </div>
                <div id="cameraControls" style="margin-top: 15px; text-align: center; display: none;">
                    <p style="color: #4CAF50; font-weight: bold;">✓ Você é a fonte da câmera</p>
                </div>
            </div>

            <div class="photo-section">
                <h3>📺 Visualização Remota</h3>
                <div class="video-wrapper">
                    <img id="remoteVideo" src="" alt="Feed remoto">
                    <div id="remotePlaceholder" class="video-placeholder">
                        <p>📡 Aguardando transmissão...</p>
                    </div>
                </div>
                <div id="viewerControls" style="margin-top: 15px; text-align: center; display: none;">
                    <p style="color: #2196F3;">👁️ Você é um visualizador</p>
                </div>
            </div>
        </div>

        <div class="controls">
            <button id="ligarCameraBtn" class="btn btn-primary">
                <span class="btn-icon">🎥</span> Ligar Câmera
            </button>
            <button id="desligarCameraBtn" class="btn btn-secondary" disabled>
                <span class="btn-icon">⏹️</span> Desligar Câmera
            </button>
            <button id="tirarFotoBtn" class="btn btn-success" disabled>
                <span class="btn-icon">📸</span> Tirar Foto
            </button>
        </div>

        <div class="info-box">
            <h4>📱 Como usar (AGORA FUNCIONA!):</h4>
            <ol>
                <li><strong>Neste dispositivo:</strong> Clique em "Ligar Câmera" e permita o acesso</li>
                <li><strong>Em outro dispositivo:</strong> Abra o <strong>MESMO LINK</strong></li>
                <li style="list-style: none; margin: 15px 0; text-align: center;">
                    <a href="#" id="urlDisplay" target="_blank">carregando...</a>
                </li>
                <li>A imagem aparece <strong>INSTANTANEAMENTE</strong> em todos!</li>
            </ol>
        </div>

        <div class="debug-panel">
            <h4>🔧 Status</h4>
            <div class="debug-item">
                <span class="debug-label">Socket ID:</span>
                <span id="socketId" class="debug-value">Conectando...</span>
            </div>
            <div class="debug-item">
                <span class="debug-label">Frames enviados:</span>
                <span id="frameCounter" class="debug-value">0</span>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        // ========== CONFIGURAÇÃO SOCKET.IO ==========
        const socket = io();
        let mediaStream = null;
        let intervaloEnvio = null;
        let cameraLigada = false;
        let framesEnviados = 0;
        let souCamera = false;

        // Elementos DOM
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const cameraLed = document.getElementById('cameraLed');
        const streamLed = document.getElementById('streamLed');
        const cameraCount = document.getElementById('cameraCount');
        const viewerCount = document.getElementById('viewerCount');
        const deviceType = document.getElementById('deviceType');
        const localTitle = document.getElementById('localTitle');
        const cameraControls = document.getElementById('cameraControls');
        const viewerControls = document.getElementById('viewerControls');
        const localPlaceholder = document.getElementById('localPlaceholder');
        const remotePlaceholder = document.getElementById('remotePlaceholder');
        const ligarBtn = document.getElementById('ligarCameraBtn');
        const desligarBtn = document.getElementById('desligarCameraBtn');
        const tirarFotoBtn = document.getElementById('tirarFotoBtn');
        const socketIdSpan = document.getElementById('socketId');
        const frameCounter = document.getElementById('frameCounter');
        const urlDisplay = document.getElementById('urlDisplay');

        // Mostra URL atual
        urlDisplay.textContent = window.location.href;
        urlDisplay.href = window.location.href;

        // ========== EVENTOS SOCKET.IO ==========
        socket.on('connect', () => {
            socketIdSpan.textContent = socket.id;
            mostrarNotificacao('🟢 Conectado ao servidor!', 'info');
            
            // Se tem câmera, identifica como visualizador primeiro
            socket.emit('identificar', 'visualizador');
            deviceType.textContent = 'Visualizador';
        });

        socket.on('status', (data) => {
            cameraCount.textContent = data.cameras;
            viewerCount.textContent = data.visualizadores;
            
            // Atualiza LEDs
            if (data.cameras > 0) {
                cameraLed.className = 'led led-green';
            } else {
                cameraLed.className = 'led led-red';
            }
            
            if (data.visualizadores > 0) {
                streamLed.className = 'led led-green';
            } else {
                streamLed.className = 'led led-red';
            }
        });

        socket.on('frame', (frameData) => {
            // Recebe frame da câmera
            remoteVideo.src = frameData;
            remoteVideo.style.display = 'block';
            remotePlaceholder.style.display = 'none';
        });

        socket.on('foto_recebida', (fotoData) => {
            // Recebe foto e salva
            const link = document.createElement('a');
            link.download = 'foto-' + Date.now() + '.jpg';
            link.href = fotoData;
            link.click();
            mostrarNotificacao('📸 Foto recebida!', 'sucesso');
        });

        // ========== FUNÇÕES DA CÂMERA ==========
        async function ligarCamera() {
            try {
                mostrarNotificacao('📱 Solicitando acesso à câmera...', 'info');
                
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Navegador não suporta câmera');
                }
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 640, 
                        height: 480,
                        facingMode: 'environment'
                    },
                    audio: false
                });
                
                mediaStream = stream;
                localVideo.srcObject = stream;
                localVideo.style.display = 'block';
                localPlaceholder.style.display = 'none';
                
                // Identifica como câmera
                socket.emit('identificar', 'camera');
                souCamera = true;
                deviceType.textContent = '📷 Fonte (câmera)';
                localTitle.textContent = 'Visualização Local (sua câmera)';
                cameraControls.style.display = 'block';
                viewerControls.style.display = 'none';
                
                localVideo.onloadedmetadata = () => {
                    localVideo.play();
                    iniciarEnvioFrames();
                };
                
                cameraLigada = true;
                ligarBtn.disabled = true;
                desligarBtn.disabled = false;
                tirarFotoBtn.disabled = false;
                
                mostrarNotificacao('✅ Câmera ligada! Transmitindo...', 'sucesso');
                
            } catch (err) {
                console.error(err);
                mostrarNotificacao('❌ Erro: ' + err.message, 'erro');
            }
        }

        function iniciarEnvioFrames() {
            if (intervaloEnvio) clearInterval(intervaloEnvio);
            
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const context = canvas.getContext('2d');
            
            intervaloEnvio = setInterval(() => {
                if (mediaStream?.active && localVideo.readyState === 4) {
                    try {
                        context.drawImage(localVideo, 0, 0, 640, 480);
                        const frameBase64 = canvas.toDataURL('image/jpeg', 0.5);
                        
                        socket.emit('frame', frameBase64);
                        
                        framesEnviados++;
                        frameCounter.textContent = framesEnviados;
                    } catch (e) {}
                }
            }, 200);
        }

        function desligarCamera() {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
                mediaStream = null;
            }
            
            if (intervaloEnvio) {
                clearInterval(intervaloEnvio);
                intervaloEnvio = null;
            }
            
            localVideo.srcObject = null;
            localVideo.style.display = 'none';
            localPlaceholder.style.display = 'flex';
            
            if (souCamera) {
                socket.emit('identificar', 'visualizador');
                souCamera = false;
                deviceType.textContent = 'Visualizador';
                localTitle.textContent = 'Visualização Local';
                cameraControls.style.display = 'none';
            }
            
            cameraLigada = false;
            ligarBtn.disabled = false;
            desligarBtn.disabled = true;
            tirarFotoBtn.disabled = true;
            
            mostrarNotificacao('⏹️ Câmera desligada', 'sucesso');
        }

        function tirarFoto() {
            if (!mediaStream) {
                mostrarNotificacao('❌ Câmera não ativa', 'erro');
                return;
            }
            
            socket.emit('tirar_foto');
            mostrarNotificacao('📸 Solicitando foto...', 'info');
            
            // Também salva localmente
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const context = canvas.getContext('2d');
            context.drawImage(localVideo, 0, 0, 640, 480);
            
            const link = document.createElement('a');
            link.download = 'foto-' + Date.now() + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        }

        function mostrarNotificacao(mensagem, tipo) {
            const notif = document.querySelector('.notificacao');
            if (notif) notif.remove();
            
            const div = document.createElement('div');
            div.className = `notificacao ${tipo}`;
            div.textContent = mensagem;
            document.body.appendChild(div);
            
            setTimeout(() => div.remove(), 3000);
        }

        // Event listeners
        ligarBtn.addEventListener('click', ligarCamera);
        desligarBtn.addEventListener('click', desligarCamera);
        tirarFotoBtn.addEventListener('click', tirarFoto);

        // Se não tem câmera, já é visualizador
        if (!navigator.mediaDevices) {
            deviceType.textContent = 'Visualizador';
            localTitle.textContent = 'Visualização Local (indisponível)';
        }
    </script>
</body>
</html>
`;

// ========== ROTAS HTTP ==========
app.get('/', (req, res) => {
  res.send(HTML_TEMPLATE);
});

app.get('/status', (req, res) => {
  res.json({
    cameras: usuariosConectados.cameras,
    visualizadores: usuariosConectados.visualizadores
  });
});

app.get('/debug', (req, res) => {
  const sockets = Array.from(io.sockets.sockets.values()).map(s => ({
    id: s.id,
    tipo: s.tipo || 'não identificado'
  }));
  
  res.json({
    usuarios: usuariosConectados,
    sockets: sockets
  });
});

// ========== SOCKET.IO ==========
let usuariosConectados = {
  cameras: 0,
  visualizadores: 0
};
let ultimoFrame = null;

io.on('connection', (socket) => {
  console.log(`🟢 Cliente conectado: ${socket.id}`);

  socket.on('identificar', (tipo) => {
    // Remove contagem anterior
    if (socket.tipo === 'camera') usuariosConectados.cameras--;
    if (socket.tipo === 'visualizador') usuariosConectados.visualizadores--;
    
    socket.tipo = tipo;
    
    if (tipo === 'camera') {
      usuariosConectados.cameras++;
      console.log(`📷 Câmera conectada. Total: ${usuariosConectados.cameras}`);
      
      // Envia último frame se houver
      if (ultimoFrame) {
        socket.emit('frame', ultimoFrame);
      }
      
    } else if (tipo === 'visualizador') {
      usuariosConectados.visualizadores++;
      console.log(`📺 Visualizador conectado. Total: ${usuariosConectados.visualizadores}`);
      
      // Envia último frame para o novo visualizador
      if (ultimoFrame) {
        socket.emit('frame', ultimoFrame);
      }
    }
    
    io.emit('status', usuariosConectados);
  });

  socket.on('frame', (frameData) => {
    if (socket.tipo === 'camera') {
      ultimoFrame = frameData;
      socket.broadcast.emit('frame', frameData);
    }
  });

  socket.on('tirar_foto', () => {
    const cameraSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.tipo === 'camera');
    
    if (cameraSocket) {
      cameraSocket.emit('capturar_foto');
    }
  });

  socket.on('foto_capturada', (fotoData) => {
    socket.broadcast.emit('foto_recebida', fotoData);
  });

  socket.on('disconnect', () => {
    if (socket.tipo === 'camera') {
      usuariosConectados.cameras--;
      if (usuariosConectados.cameras < 0) usuariosConectados.cameras = 0;
      console.log(`📷 Câmera desconectada. Restantes: ${usuariosConectados.cameras}`);
      
      if (usuariosConectados.cameras === 0) {
        ultimoFrame = null;
      }
    } else if (socket.tipo === 'visualizador') {
      usuariosConectados.visualizadores--;
      if (usuariosConectados.visualizadores < 0) usuariosConectados.visualizadores = 0;
      console.log(`📺 Visualizador desconectado. Restantes: ${usuariosConectados.visualizadores}`);
    }
    
    io.emit('status', usuariosConectados);
  });
});

// ========== INICIA SERVIDOR ==========
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('📷 SISTEMA DE CÂMERA EM TEMPO REAL (NODE.JS)');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`🌐 Railway: https://seu-projeto.up.railway.app`);
  console.log('='.repeat(60));
  console.log('✅ Socket.IO pronto para conexões em tempo real!');
  console.log('='.repeat(60));
});
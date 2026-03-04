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
const SENHA = "1234"; // 🔑 Mude para a senha que quiser

// ========== FUNÇÃO PARA DETECTAR DISPOSITIVO ==========
function detectarDispositivo(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Detecta se é celular ou tablet
  const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
  const isTablet = /ipad|tablet|kindle|silk|playbook/i.test(ua);
  
  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

app.get('/', (req, res) => {
  // Detecta o dispositivo do usuário
  const dispositivo = detectarDispositivo(req.headers['user-agent'] || '');
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>📷 Câmera Inteligente</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .status-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-label { font-weight: bold; color: #555; }
        .status-value {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 500;
        }
        .status-value.on { background: #4CAF50; color: white; }
        .status-value.off { background: #f44336; color: white; }
        .status-value.mobile { background: #FF9800; color: white; }
        
        .device-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 50px;
            font-weight: bold;
            margin: 10px 0;
        }
        .device-mobile { background: #FF9800; color: white; }
        .device-desktop { background: #2196F3; color: white; }
        .device-tablet { background: #9C27B0; color: white; }
        
        .video-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            position: relative;
        }
        
        .image-container {
            position: relative;
            width: 100%;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
        }
        
        .image-container h3 { margin-bottom: 15px; color: #333; }
        
        .camera-wrapper {
            position: relative;
            width: 100%;
            background: #000;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        
        #remoteVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        #passwordOverlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            border-radius: 10px;
            backdrop-filter: blur(5px);
        }
        
        .password-box {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 300px;
        }
        
        .password-box h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 20px;
        }
        
        .password-box input {
            width: 100%;
            padding: 12px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
            letter-spacing: 8px;
            font-weight: bold;
        }
        
        .password-box button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 25px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
        }
        
        .password-box button:hover { background: #5a67d8; }
        
        .password-error {
            color: #f44336;
            margin-top: 10px;
            font-size: 14px;
            display: none;
        }
        
        .local-container {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
        }
        
        .local-container h3 { margin-bottom: 15px; color: #333; }
        
        .local-wrapper {
            width: 100%;
            background: #000;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        
        #localVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
            display: block;
        }
        
        .info-box {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #2196F3;
            margin-top: 20px;
        }
        
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
        }
        
        .role-badge {
            text-align: center;
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            font-weight: bold;
        }
        .role-camera { background: #FFF3E0; color: #FF9800; border-left: 5px solid #FF9800; }
        .role-viewer { background: #E3F2FD; color: #2196F3; border-left: 5px solid #2196F3; }
        
        @media (max-width: 768px) {
            .video-container { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📷 Câmera Inteligente</h1>
        
        <div class="status-bar">
            <div class="status-item">
                <span class="status-label">Dispositivo:</span>
                <span id="deviceType" class="status-value">Detectando...</span>
            </div>
            <div class="status-item">
                <span class="status-label">Função:</span>
                <span id="deviceRole" class="status-value">Aguardando...</span>
            </div>
            <div class="status-item">
                <span class="status-label">Visualização:</span>
                <span id="remoteStatus" class="status-value off">🔒 Bloqueada</span>
            </div>
        </div>

        <!-- Badge de função -->
        <div id="roleBadge" class="role-badge"></div>

        <div class="video-container">
            <div class="local-container">
                <h3 id="localTitle">📱 Visualização Local</h3>
                <div class="local-wrapper">
                    <video id="localVideo" autoplay playsinline muted></video>
                </div>
                <div id="localMessage" style="text-align: center; margin-top: 10px;"></div>
            </div>

            <div class="image-container">
                <h3>📺 Visualização Remota</h3>
                <div class="camera-wrapper">
                    <img id="remoteVideo">
                    
                    <div id="passwordOverlay">
                        <div class="password-box">
                            <h3>🔒 Conteúdo Bloqueado</h3>
                            <p style="margin-bottom: 15px; color: #666;">Digite a senha para liberar</p>
                            <input type="password" id="senhaInput" maxlength="4" placeholder="****">
                            <button onclick="verificarSenha()">Liberar Visualização</button>
                            <div id="erroSenha" class="password-error">Senha incorreta!</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="info-box">
            <h4>📱 Como funciona (automático):</h4>
            <ol>
                <li><strong>No CELULAR:</strong> A câmera liga sozinha e transmite o vídeo</li>
                <li><strong>No COMPUTADOR:</strong> Apenas recebe e mostra o vídeo (sem tentar ligar câmera)</li>
                <li><strong>Senha padrão:</strong> <strong>"1234"</strong> para liberar a visualização remota</li>
            </ol>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "1234";
        
        // Elementos
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const deviceTypeSpan = document.getElementById('deviceType');
        const deviceRoleSpan = document.getElementById('deviceRole');
        const remoteStatus = document.getElementById('remoteStatus');
        const localTitle = document.getElementById('localTitle');
        const localMessage = document.getElementById('localMessage');
        const roleBadge = document.getElementById('roleBadge');
        
        // Estado
        let mediaStream = null;
        let visualizacaoLiberada = false;
        let isMobile = false;
        
        // ========== DETECÇÃO DE DISPOSITIVO ==========
        function detectarDispositivo() {
            const ua = navigator.userAgent.toLowerCase();
            const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
            const isTablet = /ipad|tablet|kindle|silk|playbook/i.test(ua);
            
            if (isTablet) {
                deviceTypeSpan.textContent = 'Tablet';
                deviceTypeSpan.className = 'status-value';
                return 'tablet';
            } else if (isMobile) {
                deviceTypeSpan.textContent = 'Celular';
                deviceTypeSpan.className = 'status-value mobile';
                return 'mobile';
            } else {
                deviceTypeSpan.textContent = 'Computador';
                deviceTypeSpan.className = 'status-value on';
                return 'desktop';
            }
        }
        
        // ========== CONFIGURAÇÃO BASEADA NO DISPOSITIVO ==========
        function configurarPorDispositivo() {
            const dispositivo = detectarDispositivo();
            isMobile = (dispositivo === 'mobile' || dispositivo === 'tablet');
            
            if (isMobile) {
                // 📱 É CELULAR: Liga a câmera automaticamente
                deviceRoleSpan.textContent = '🎥 Fonte (transmitindo)';
                deviceRoleSpan.className = 'status-value mobile';
                localTitle.innerHTML = '📱 Visualização Local (SUA CÂMERA)';
                roleBadge.innerHTML = '📱 Você é a FONTE - Transmitindo vídeo';
                roleBadge.className = 'role-badge role-camera';
                localMessage.innerHTML = '✅ Transmitindo ao vivo...';
                
                // Aguarda 1 segundo e liga a câmera
                setTimeout(() => {
                    ligarCameraCelular();
                }, 1000);
                
            } else {
                // 💻 É COMPUTADOR: Apenas visualiza
                deviceRoleSpan.textContent = '👁️ Visualizador (recebendo)';
                deviceRoleSpan.className = 'status-value on';
                localTitle.innerHTML = '📱 Visualização Local (indisponível no PC)';
                roleBadge.innerHTML = '💻 Você é VISUALIZADOR - Aguardando transmissão';
                roleBadge.className = 'role-badge role-viewer';
                localMessage.innerHTML = 'ℹ️ Este dispositivo é visualizador. A câmera não será ligada.';
                
                // Esconde o vídeo local (não tem câmera mesmo)
                document.querySelector('.local-wrapper').style.background = '#333';
                localVideo.style.display = 'none';
            }
        }
        
        // ========== FUNÇÃO PARA CELULAR (LIGA CÂMERA) ==========
        async function ligarCameraCelular() {
            try {
                console.log('📱 Celular detectado - ligando câmera...');
                
                // Solicita acesso à câmera
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 640, 
                        height: 480,
                        facingMode: 'environment' // Câmera traseira
                    },
                    audio: false
                });
                
                mediaStream = stream;
                
                // Mostra vídeo local
                localVideo.srcObject = stream;
                localVideo.style.display = 'block';
                
                // Garante que o vídeo está tocando
                await localVideo.play();
                
                // Canvas para capturar frames
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                
                // Função de captura
                const intervaloCaptura = setInterval(() => {
                    try {
                        ctx.drawImage(localVideo, 0, 0, 640, 480);
                        const frame = canvas.toDataURL('image/jpeg', 0.5);
                        socket.emit('frame', frame);
                    } catch (e) {
                        console.log('Erro na captura:', e);
                    }
                }, 200); // 5 fps
                
                console.log('✅ Câmera do celular ligada e transmitindo!');
                
            } catch (err) {
                console.error('Erro ao ligar câmera no celular:', err);
                localMessage.innerHTML = '❌ Erro: ' + err.message;
            }
        }
        
        // ========== VERIFICAÇÃO DE SENHA ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            if (senha === SENHA_CORRETA) {
                passwordOverlay.style.display = 'none';
                visualizacaoLiberada = true;
                remoteStatus.textContent = '🔓 Liberada';
                remoteStatus.className = 'status-value on';
            } else {
                document.getElementById('erroSenha').style.display = 'block';
            }
        };
        
        document.getElementById('senhaInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
        
        // ========== SOCKET.IO ==========
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
        });
        
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada) {
                remoteVideo.src = frameData;
            }
        });
        
        // ========== FUNÇÃO PARA TIRAR FOTO (APENAS NO CELULAR) ==========
        window.tirarFoto = function() {
            if (!mediaStream) {
                alert('Disponível apenas no celular que está transmitindo');
                return;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            canvas.getContext('2d').drawImage(localVideo, 0, 0, 640, 480);
            
            const link = document.createElement('a');
            link.download = 'foto-' + Date.now() + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        };
        
        // ========== INICIALIZAÇÃO ==========
        window.addEventListener('load', () => {
            console.log('📱 Página carregada, detectando dispositivo...');
            configurarPorDispositivo();
        });
        
        // Expõe função de foto globalmente
        window.tirarFoto = tirarFoto;
    </script>
</body>
</html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('📷 SISTEMA DE CÂMERA INTELIGENTE');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha: ${SENHA}`);
  console.log('📱 Detecta automaticamente:');
  console.log('   - Celular: liga câmera e transmite');
  console.log('   - Computador: apenas visualiza');
  console.log('='.repeat(60));
});

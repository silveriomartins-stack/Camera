const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// HTML para CELULAR - envia câmera + jogo
const mobileHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jogo da Velha</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #f0f0f0; }
        h2 { color: #333; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; width: 300px; margin: 20px auto; }
        .cell { background: white; border: 2px solid #999; height: 100px; font-size: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .status { font-size: 20px; margin: 20px; color: #666; }
        button { padding: 10px 30px; font-size: 18px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
        #cameraStatus { color: green; font-size: 14px; margin: 10px; }
    </style>
</head>
<body>
    <h2>Jogo da Velha</h2>
    <div id="cameraStatus">📷 Câmera ativada</div>
    <div class="status" id="status">Aguardando jogador no PC...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let board = ['', '', '', '', '', '', '', '', ''];
        let minhaVez = false;
        let meuSimbolo = '';
        
        // Cria o tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => jogar(i);
            document.getElementById('board').appendChild(cell);
        }
        
        // INICIA A CÂMERA (funciona automaticamente)
        async function iniciarCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true,
                    audio: true 
                });
                
                // Cria conexão WebRTC
                const peer = new RTCPeerConnection();
                
                // Adiciona video/audio à conexão
                stream.getTracks().forEach(track => peer.addTrack(track, stream));
                
                // Quando encontrar o PC, envia o video
                peer.onicecandidate = e => {
                    if(e.candidate) socket.emit('candidate', e.candidate);
                };
                
                // Cria oferta para conectar com PC
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('offer', offer);
                
                // Recebe resposta do PC
                socket.on('answer', async (answer) => {
                    await peer.setRemoteDescription(answer);
                });
                
                socket.on('candidate', async (candidate) => {
                    try { await peer.addIceCandidate(candidate); } catch(e) {}
                });
                
                document.getElementById('cameraStatus').innerHTML = '📷 Câmera ativa - transmitindo para o PC';
                
            } catch (error) {
                document.getElementById('cameraStatus').innerHTML = '❌ Erro na câmera: ' + error.message;
            }
        }
        
        // Inicia câmera automaticamente
        iniciarCamera();
        
        function jogar(pos) {
            if(!minhaVez || board[pos] !== '') return;
            socket.emit('jogada', pos);
        }
        
        function reiniciar() {
            socket.emit('reiniciar');
        }
        
        socket.on('inicio', (data) => {
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            document.getElementById('status').innerHTML = 
                meuSimbolo === 'X' ? 'Sua vez (X)' : 'Vez do PC (X)';
        });
        
        socket.on('jogada_feita', (data) => {
            board[data.pos] = data.simbolo;
            let cells = document.getElementsByClassName('cell');
            cells[data.pos].innerHTML = data.simbolo;
            
            minhaVez = (data.simbolo !== meuSimbolo);
            document.getElementById('status').innerHTML = 
                minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim_jogo', (data) => {
            document.getElementById('status').innerHTML = data.mensagem;
        });
        
        socket.on('reset', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            let cells = document.getElementsByClassName('cell');
            for(let i = 0; i < 9; i++) cells[i].innerHTML = '';
        });
    </script>
</body>
</html>
`;

// HTML para PC - recebe câmera + jogo
const desktopHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PC - Jogo da Velha</title>
    <style>
        body { font-family: Arial; padding: 20px; background: #f0f0f0; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1000px; margin: 0 auto; }
        .video-box { background: black; border-radius: 10px; overflow: hidden; }
        video { width: 100%; height: auto; }
        .game-box { text-align: center; }
        h2 { color: #333; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; width: 300px; margin: 20px auto; }
        .cell { background: white; border: 2px solid #999; height: 100px; font-size: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .status { font-size: 20px; margin: 20px; color: #666; }
        button { padding: 10px 30px; font-size: 18px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .controls { margin-top: 20px; }
        #videoStatus { color: green; }
    </style>
</head>
<body>
    <div class="container">
        <div class="video-box">
            <video id="videoCelular" autoplay playsinline></video>
            <p id="videoStatus">📱 Aguardando conexão do celular...</p>
        </div>
        
        <div class="game-box">
            <h2>Jogo da Velha</h2>
            <div class="status" id="status">Conectando...</div>
            <div class="board" id="board"></div>
            <div class="controls">
                <button onclick="reiniciar()">Reiniciar</button>
                <button onclick="toggleAudio()" id="audioBtn">🔊 Áudio</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let board = ['', '', '', '', '', '', '', '', ''];
        let minhaVez = true;
        let meuSimbolo = 'X';
        let audioAtivo = true;
        
        // Cria tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => jogar(i);
            document.getElementById('board').appendChild(cell);
        }
        
        // Configura WebRTC para receber video
        const peer = new RTCPeerConnection();
        const videoElement = document.getElementById('videoCelular');
        
        peer.ontrack = event => {
            videoElement.srcObject = event.streams[0];
            document.getElementById('videoStatus').innerHTML = '📱 Celular conectado - recebendo vídeo';
        };
        
        peer.onicecandidate = e => {
            if(e.candidate) socket.emit('candidate', e.candidate);
        };
        
        // Recebe oferta do celular
        socket.on('offer', async (offer) => {
            await peer.setRemoteDescription(offer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('answer', answer);
        });
        
        socket.on('candidate', async (candidate) => {
            try { await peer.addIceCandidate(candidate); } catch(e) {}
        });
        
        socket.on('inicio', () => {
            document.getElementById('status').innerHTML = 'Sua vez (X)';
        });
        
        function jogar(pos) {
            if(!minhaVez || board[pos] !== '') return;
            socket.emit('jogada', pos);
        }
        
        function reiniciar() {
            socket.emit('reiniciar');
        }
        
        function toggleAudio() {
            audioAtivo = !audioAtivo;
            videoElement.volume = audioAtivo ? 1 : 0;
            document.getElementById('audioBtn').innerHTML = audioAtivo ? '🔊 Áudio' : '🔇 Áudio';
        }
        
        socket.on('jogada_feita', (data) => {
            board[data.pos] = data.simbolo;
            let cells = document.getElementsByClassName('cell');
            cells[data.pos].innerHTML = data.simbolo;
            
            minhaVez = (data.simbolo !== meuSimbolo);
            document.getElementById('status').innerHTML = 
                minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim_jogo', (data) => {
            document.getElementById('status').innerHTML = data.mensagem;
        });
        
        socket.on('reset', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            let cells = document.getElementsByClassName('cell');
            for(let i = 0; i < 9; i++) cells[i].innerHTML = '';
            minhaVez = true;
        });
    </script>
</body>
</html>
`;

// Rotas
app.get('/', (req, res) => {
    const ua = req.headers['user-agent'].toLowerCase();
    if(ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        res.send(mobileHTML);
    } else {
        res.send(desktopHTML);
    }
});

// Lógica do jogo
let jogo = {
    board: Array(9).fill(''),
    vez: 'X',
    players: { mobile: null, desktop: null },
    ativo: false
};

function verificarVencedor() {
    const lines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    
    for(let l of lines) {
        if(jogo.board[l[0]] && 
           jogo.board[l[0]] === jogo.board[l[1]] && 
           jogo.board[l[0]] === jogo.board[l[2]]) {
            return jogo.board[l[0]];
        }
    }
    return null;
}

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Atribui jogadores
    if(!jogo.players.desktop) {
        jogo.players.desktop = socket.id;
        socket.emit('inicio', { simbolo: 'X' });
    } else if(!jogo.players.mobile) {
        jogo.players.mobile = socket.id;
        socket.emit('inicio', { simbolo: 'O' });
        jogo.ativo = true;
        io.emit('inicio');
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
        if(!jogo.ativo) return;
        
        let jogador = socket.id === jogo.players.desktop ? 'X' : 'O';
        if(jogador !== jogo.vez) return;
        if(jogo.board[pos] !== '') return;
        
        jogo.board[pos] = jogador;
        
        let vencedor = verificarVencedor();
        
        if(vencedor) {
            jogo.ativo = false;
            io.emit('fim_jogo', { mensagem: `Jogador ${vencedor} venceu!` });
        } else if(!jogo.board.includes('')) {
            jogo.ativo = false;
            io.emit('fim_jogo', { mensagem: 'Empate!' });
        } else {
            jogo.vez = jogo.vez === 'X' ? 'O' : 'X';
        }
        
        io.emit('jogada_feita', { pos, simbolo: jogador });
    });
    
    socket.on('reiniciar', () => {
        jogo.board = Array(9).fill('');
        jogo.vez = 'X';
        jogo.ativo = true;
        io.emit('reset');
    });
    
    socket.on('disconnect', () => {
        if(socket.id === jogo.players.desktop) jogo.players.desktop = null;
        if(socket.id === jogo.players.mobile) jogo.players.mobile = null;
        jogo.ativo = false;
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

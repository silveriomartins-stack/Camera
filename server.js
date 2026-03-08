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
  
  if (isMobile) {
    // CELULAR
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
        .cell.x { color: #ff4444; }
        .cell.o { color: #4444ff; }
        .status { background: #333; padding: 10px; border-radius: 5px; margin: 10px 0; }
        button { padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 18px; width: 100%; cursor: pointer; }
    </style>
</head>
<body>
    <h1>📱 Celular</h1>
    <div class="status" id="status">Aguardando PC...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = false;
        let meuSimbolo = '';
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                console.log('Célula clicada:', i, 'minhaVez:', minhaVez);
                if(minhaVez && cell.innerHTML === '') {
                    console.log('Enviando jogada:', i);
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
            document.getElementById('status').innerHTML = 'Conectado!';
        });
        
        socket.on('inicio', (data) => {
            console.log('Recebido inicio:', data);
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do PC (X)';
        });
        
        socket.on('jogada', (data) => {
            console.log('Recebido jogada:', data);
            let cell = document.getElementsByClassName('cell')[data.pos];
            cell.innerHTML = data.simbolo;
            cell.classList.add(data.simbolo.toLowerCase());
            
            minhaVez = data.proximaVez === meuSimbolo;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim', (data) => {
            console.log('Recebido fim:', data);
            document.getElementById('status').innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            console.log('Recebido reiniciar');
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            minhaVez = meuSimbolo === 'X';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        function reiniciar() {
            console.log('Botão reiniciar clicado');
            socket.emit('reiniciar');
        }
    </script>
</body>
</html>`);
  } else {
    // PC
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jogo - PC</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; text-align: center; padding: 20px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 300px; margin: 20px auto; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        .cell.x { color: #ff4444; }
        .cell.o { color: #4444ff; }
        .status { background: #333; padding: 10px; border-radius: 5px; margin: 10px 0; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>💻 PC</h1>
    <div class="status" id="status">Aguardando celular...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = true;
        let meuSimbolo = 'X';
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                console.log('Célula clicada:', i, 'minhaVez:', minhaVez);
                if(minhaVez && cell.innerHTML === '') {
                    console.log('Enviando jogada:', i);
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
            document.getElementById('status').innerHTML = 'Conectado!';
        });
        
        socket.on('inicio', () => {
            console.log('Recebido inicio');
            document.getElementById('status').innerHTML = 'Sua vez (X)';
        });
        
        socket.on('jogada', (data) => {
            console.log('Recebido jogada:', data);
            let cell = document.getElementsByClassName('cell')[data.pos];
            cell.innerHTML = data.simbolo;
            cell.classList.add(data.simbolo.toLowerCase());
            
            minhaVez = data.proximaVez === 'X';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', (data) => {
            console.log('Recebido fim:', data);
            document.getElementById('status').innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            console.log('Recebido reiniciar');
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            minhaVez = true;
            document.getElementById('status').innerHTML = 'Sua vez';
        });
        
        function reiniciar() {
            console.log('Botão reiniciar clicado');
            socket.emit('reiniciar');
        }
    </script>
</body>
</html>`);
  }
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let vez = 'X';
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
  console.log('Cliente conectado:', socket.id);
  
  // Atribuir jogadores
  if (!pc) {
    pc = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
    console.log('PC definido');
  } else if (!mobile) {
    mobile = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
    console.log('Celular definido');
  }
  
  socket.on('jogada', (pos) => {
    console.log('Jogada recebida de', socket.id, 'posição', pos);
    
    let jogador = socket.id === pc ? 'X' : 'O';
    console.log('Jogador:', jogador, 'Vez atual:', vez);
    
    if (jogador !== vez) {
      console.log('Não é a vez do jogador');
      return;
    }
    if (board[pos] !== '') {
      console.log('Posição já ocupada');
      return;
    }
    
    board[pos] = jogador;
    console.log('Board atualizado:', board);
    
    let winner = checkWinner();
    let proximaVez = vez === 'X' ? 'O' : 'X';
    
    if (winner) {
      console.log('Vencedor:', winner);
      io.emit('fim', { msg: winner + ' venceu!' });
    } else if (!board.includes('')) {
      console.log('Empate');
      io.emit('fim', { msg: 'Empate!' });
    } else {
      vez = proximaVez;
      console.log('Próxima vez:', vez);
    }
    
    io.emit('jogada', { pos, simbolo: jogador, proximaVez });
  });
  
  socket.on('reiniciar', () => {
    console.log('Reiniciar recebido');
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if (socket.id === pc) pc = null;
    if (socket.id === mobile) mobile = null;
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

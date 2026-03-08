const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const gameRooms = {};

// ====================== HTML + CSS + JS TUDO INLINE ======================
const fullHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jogo da Velha com Câmera</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#000; color:#fff; overflow:hidden; }
    #remote-video {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover; z-index: -1; filter: brightness(0.85);
    }
    #local-video {
      position: fixed; bottom: 20px; right: 20px;
      width: 140px; height: 140px; object-fit: cover;
      border: 4px solid #fff; border-radius: 15px;
      box-shadow: 0 0 20px rgba(0,255,255,0.5); z-index: 10;
    }
    #game-container {
      position: relative; z-index: 2; height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center;
    }
    #board {
      display: grid; grid-template-columns: repeat(3, 1fr);
      width: 320px; height: 320px; gap: 12px;
      background: rgba(0,0,0,0.6); padding: 15px; border-radius: 20px;
    }
    .cell {
      background: rgba(255,255,255,0.15); font-size: 90px; font-weight: bold;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; border-radius: 15px; transition: all 0.2s;
    }
    .cell.x { color: #ff3366; }
    .cell.o { color: #33ff99; }
    .cell:hover { background: rgba(255,255,255,0.3); }
    #status { margin-bottom: 15px; font-size: 1.4rem; }
    #turn { font-size: 1.3rem; margin: 15px 0; }
    .buttons button {
      margin: 8px; padding: 12px 20px; font-size: 1rem;
      border: none; border-radius: 50px; background: #00ccff; color: #000; cursor: pointer;
    }
    @media (max-width: 600px) {
      #board { width: 90vw; height: 90vw; }
      #local-video { width: 100px; height: 100px; }
    }
  </style>
</head>
<body>
  <div id="join-screen">
    <h1>🎮 Jogo da Velha com Vídeo</h1>
    <input id="room-code" placeholder="Código da sala (ex: abc123)" maxlength="10">
    <button onclick="joinRoom()">ENTRAR NA SALA</button>
    <p>Compartilhe o código com a outra pessoa!</p>
  </div>

  <div id="game-screen" class="hidden">
    <video id="remote-video" autoplay playsinline></video>
    <video id="local-video" autoplay playsinline muted></video>

    <div id="game-container">
      <h2 id="status">Aguardando oponente...</h2>
      <div id="board"></div>
      <p id="turn">Você é: <span id="my-symbol"></span></p>
      
      <div class="buttons">
        <button onclick="switchCamera()">📷 Trocar Câmera</button>
        <button onclick="toggleMute()">🎤 Mutar Áudio</button>
        <button onclick="leaveRoom()">Sair</button>
      </div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    let socket, roomCode, mySymbol, board = Array(9).fill(null);
    let peerConnection, localStream;
    let currentPlayer = 'X';
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    const remoteVideo = document.getElementById('remote-video');
    const localVideo = document.getElementById('local-video');

    async function joinRoom() {
      const code = document.getElementById('room-code').value.trim().toUpperCase();
      if (!code) return alert('Digite um código!');
      roomCode = code;
      socket = io();
      socket.emit('join-room', roomCode);
      setupListeners();
      document.getElementById('join-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      createBoard();
    }

    function setupListeners() {
      socket.on('role', data => { mySymbol = data.symbol; document.getElementById('my-symbol').textContent = mySymbol; });
      socket.on('waiting', () => { document.getElementById('status').innerHTML = \`Aguardando...<br>Código: <b>\${roomCode}</b>\`; });
      socket.on('game-start', () => { document.getElementById('status').textContent = 'Jogo iniciado!'; startVideoAndWebRTC(); });
      socket.on('initiate-webrtc', () => startVideoAndWebRTC(true));
      socket.on('move-made', data => { board = data.board; currentPlayer = data.currentPlayer; updateBoard(); checkGameEnd(); });
      socket.on('receive-offer', async data => {
        if (!peerConnection) await createPeer();
        await peerConnection.setRemoteDescription(data.sdp);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { sdp: answer, roomCode });
      });
      socket.on('receive-answer', data => { peerConnection.setRemoteDescription(data.sdp); });
      socket.on('ice-candidate', data => { if (peerConnection) peerConnection.addIceCandidate(data.candidate); });
      socket.on('opponent-left', () => alert('Oponente saiu da sala!'));
      socket.on('room-full', () => alert('Sala cheia! Tente outro código.'));
    }

    async function startVideoAndWebRTC(isInitiator = false) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
        localVideo.srcObject = localStream;
        await createPeer();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        if (isInitiator) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('offer', { sdp: offer, roomCode });
        }
      } catch (e) { alert('Não foi possível acessar câmera/microfone. Verifique as permissões.'); }
    }

    async function createPeer() {
      peerConnection = new RTCPeerConnection(config);
      peerConnection.onicecandidate = e => { if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomCode }); };
      peerConnection.ontrack = e => { remoteVideo.srcObject = e.streams[0]; };
    }

    function createBoard() {
      const boardEl = document.getElementById('board');
      boardEl.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.onclick = () => makeMove(i);
        boardEl.appendChild(cell);
      }
    }

    function updateBoard() {
      document.querySelectorAll('.cell').forEach((cell, i) => {
        cell.textContent = board[i] || '';
        cell.className = 'cell';
        if (board[i]) cell.classList.add(board[i].toLowerCase());
      });
    }

    function makeMove(index) {
      if (board[index] || currentPlayer !== mySymbol) return;
      socket.emit('make-move', { index, symbol: mySymbol, roomCode });
    }

    function checkGameEnd() {
      const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (let [a,b,c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          alert(\`🎉 Vitória do \${board[a]}!\`);
          return;
        }
      }
      if (!board.includes(null)) alert('Empate!');
    }

    async function switchCamera() {
      if (!localStream) return;
      const newMode = localStream.getVideoTracks()[0].getSettings().facingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode }, audio: true });
      localStream.getTracks().forEach(t => t.stop());
      localStream = newStream;
      localVideo.srcObject = newStream;
      const videoSender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) videoSender.replaceTrack(newStream.getVideoTracks()[0]);
    }

    function toggleMute() {
      if (localStream) {
        const audio = localStream.getAudioTracks()[0];
        audio.enabled = !audio.enabled;
      }
    }

    function leaveRoom() {
      if (peerConnection) peerConnection.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      socket.disconnect();
      location.reload();
    }

    window.onload = () => {};
  </script>
</body>
</html>
`;
// ====================== FIM DO HTML INLINE ======================

app.get('/', (req, res) => res.send(fullHTML));

const gameRooms = {}; // já declarado acima, mas ok

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('join-room', (roomCode) => {
    socket.roomCode = roomCode;
    socket.join(roomCode);

    if (!gameRooms[roomCode]) {
      gameRooms[roomCode] = { board: Array(9).fill(null), currentPlayer: 'X', host: socket.id };
      socket.emit('role', { symbol: 'X' });
      socket.emit('waiting', roomCode);
    } else {
      if (Object.keys(io.sockets.adapter.rooms.get(roomCode) || {}).length >= 3) return socket.emit('room-full');
      gameRooms[roomCode].guest = socket.id;
      socket.emit('role', { symbol: 'O' });
      io.to(roomCode).emit('game-start');
      socket.emit('initiate-webrtc');
    }
  });

  socket.on('make-move', (data) => {
    const room = gameRooms[data.roomCode];
    if (!room || room.board[data.index] || room.currentPlayer !== data.symbol) return;
    room.board[data.index] = data.symbol;
    room.currentPlayer = data.symbol === 'X' ? 'O' : 'X';
    io.to(data.roomCode).emit('move-made', { board: room.board, currentPlayer: room.currentPlayer });
  });

  socket.on('offer', (data) => socket.to(data.roomCode).emit('receive-offer', data));
  socket.on('answer', (data) => socket.to(data.roomCode).emit('receive-answer', data));
  socket.on('ice-candidate', (data) => socket.to(data.roomCode).emit('ice-candidate', data));

  socket.on('disconnect', () => {
    if (socket.roomCode && gameRooms[socket.roomCode]) {
      io.to(socket.roomCode).emit('opponent-left');
      delete gameRooms[socket.roomCode];
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));

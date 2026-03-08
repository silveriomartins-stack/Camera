// SUBSTITUA TODO O ARQUIVO server.js POR ESTE CÓDIGO ABAIXO
// (package.json continua o mesmo que eu te mandei antes)

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const gameRooms = {};

// ====================== HTML 100% AUTOMÁTICO ======================
const fullHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vídeo Celular → PC</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#000; color:#fff; overflow:hidden; }
    #remote-video { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; filter: brightness(0.9); }
    #local-video { position: fixed; bottom: 20px; right: 20px; width: 140px; height: 140px; object-fit: cover; border: 4px solid #0ff; border-radius: 15px; box-shadow: 0 0 20px #0ff; z-index: 10; }
    #container { position: relative; z-index: 2; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; }
    #status { font-size: 1.5rem; margin: 20px 0; text-shadow: 0 0 10px #000; }
    #sender-info {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); padding: 20px; border-radius: 20px;
      text-align: center; z-index: 30; max-width: 90%;
    }
    #sender-info h2 { font-size: 1.8rem; margin-bottom: 10px; }
    #full-link { font-size: 1.1rem; word-break: break-all; margin: 15px 0; }
    button { padding: 12px 25px; font-size: 1.1rem; margin: 10px; border: none; border-radius: 50px; background: #00ffcc; color: #000; cursor: pointer; }
    @media (max-width: 600px) { #local-video { width: 110px; height: 110px; } }
  </style>
</head>
<body>
  <video id="remote-video" autoplay playsinline></video>
  <video id="local-video" autoplay playsinline muted></video>
  
  <div id="container">
    <h2 id="status">Abrindo câmera...</h2>
  </div>

  <!-- Só aparece no CELULAR -->
  <div id="sender-info" class="hidden">
    <h2>📱 Seu código: <span id="code-display"></span></h2>
    <p id="full-link"></p>
    <button onclick="copyLink()">📋 Copiar link para o PC</button>
    <p style="margin-top:10px;font-size:0.9rem;">Abra este link no PC → vídeo aparece automático</p>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    let socket, roomCode, localStream, peerConnection, myRole = '';
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const remoteVideo = document.getElementById('remote-video');
    const localVideo = document.getElementById('local-video');

    function generateRandomCode() {
      return Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    async function joinRoom(code) {
      roomCode = code;
      socket = io();
      socket.emit('join-room', roomCode);
      setupListeners();
    }

    function setupListeners() {
      socket.on('role', async (data) => {
        myRole = data.type;
        if (myRole === 'sender') {
          document.getElementById('status').innerHTML = '📱 Câmera ligada<br>Enviando para o PC';
          document.getElementById('sender-info').classList.remove('hidden');
          showSenderInfo();
          await startLocalCamera();
        } else {
          document.getElementById('status').innerHTML = '📺 Recebendo vídeo do celular';
          localVideo.style.display = 'none'; // PC não mostra câmera própria
        }
      });

      socket.on('initiate-webrtc', () => {
        if (myRole === 'sender') startWebRTC(true);
      });

      socket.on('receive-offer', async (data) => {
        if (!peerConnection) await createPeer();
        await peerConnection.setRemoteDescription(data.sdp);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { sdp: answer, roomCode });
      });

      socket.on('receive-answer', (data) => {
        if (peerConnection) peerConnection.setRemoteDescription(data.sdp);
      });

      socket.on('ice-candidate', (data) => {
        if (peerConnection) peerConnection.addIceCandidate(data.candidate);
      });

      socket.on('opponent-left', () => {
        alert('Conexão perdida!');
        location.reload();
      });
    }

    async function startLocalCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        localVideo.srcObject = localStream;
      } catch (e) {
        alert('❌ Permissão da câmera negada ou não disponível.');
      }
    }

    async function createPeer() {
      peerConnection = new RTCPeerConnection(config);
      peerConnection.onicecandidate = e => {
        if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomCode });
      };
      peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
      };
    }

    async function startWebRTC(isInitiator) {
      if (!peerConnection) await createPeer();
      if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
      }
      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { sdp: offer, roomCode });
      }
    }

    function showSenderInfo() {
      document.getElementById('code-display').textContent = roomCode;
      const fullLink = window.location.origin + '?room=' + roomCode;
      document.getElementById('full-link').innerHTML = 
        'Link para o PC:<br><strong>' + fullLink + '</strong>';
    }

    function copyLink() {
      const fullLink = window.location.origin + '?room=' + roomCode;
      navigator.clipboard.writeText(fullLink);
      alert('✅ Link copiado! Cole no PC e abra.');
    }

    async function switchCamera() {
      if (!localStream || myRole !== 'sender') return;
      const newMode = localStream.getVideoTracks()[0].getSettings().facingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode }, audio: true });
      localStream.getTracks().forEach(t => t.stop());
      localStream = newStream;
      localVideo.srcObject = newStream;
      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newStream.getVideoTracks()[0]);
    }

    function toggleMute() {
      if (localStream) localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    }

    // ====================== INÍCIO AUTOMÁTICO ======================
    window.onload = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');

      if (roomFromUrl) {
        // PC → recebe automaticamente
        joinRoom(roomFromUrl.toUpperCase());
      } else {
        // CELULAR → envia automaticamente
        const newCode = generateRandomCode();
        joinRoom(newCode);
      }
    };
  </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(fullHTML));

io.on('connection', (socket) => {
  socket.on('join-room', (roomCode) => {
    socket.roomCode = roomCode;
    socket.join(roomCode);

    if (!gameRooms[roomCode]) {
      gameRooms[roomCode] = { host: socket.id };
      socket.emit('role', { type: 'sender' });
    } else {
      if (Object.keys(io.sockets.adapter.rooms.get(roomCode) || {}).length >= 3) {
        return socket.emit('room-full');
      }
      socket.emit('role', { type: 'receiver' });
      io.to(roomCode).emit('game-start');
      socket.to(roomCode).emit('initiate-webrtc'); // avisa o CELULAR para iniciar
    }
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
httpServer.listen(PORT, () => console.log(`🚀 Vídeo automático rodando na porta ${PORT}`));

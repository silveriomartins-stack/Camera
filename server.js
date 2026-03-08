const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// HTML completo para mobile
const mobileHTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Jogo da Velha Mobile</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:10px;}
        .container.mobile{max-width:100%;width:100%;background:rgba(255,255,255,0.95);border-radius:20px;padding:15px;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
        .video-section{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;}
        .video-container{position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:4/3;}
        .video-container.small{height:120px;position:absolute;top:80px;right:20px;width:100px;border:2px solid white;border-radius:8px;z-index:10;}
        .video-container video{width:100%;height:100%;object-fit:cover;}
        .video-label{position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.6);color:white;padding:4px 8px;border-radius:4px;font-size:12px;}
        .video-controls{position:absolute;bottom:5px;right:5px;display:flex;gap:5px;}
        .control-btn{background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:40px;height:40px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s;}
        .control-btn:active{transform:scale(0.95);background:rgba(0,0,0,0.8);}
        .game-section{text-align:center;}
        .game-header{margin-bottom:20px;}
        .game-header h2{color:#333;margin-bottom:10px;}
        .game-status{font-size:16px;color:#666;margin-bottom:5px;font-weight:600;}
        .game-id{background:#f0f0f0;padding:8px;border-radius:8px;font-family:monospace;font-size:14px;color:#333;}
        .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;aspect-ratio:1;}
        .cell{background:#f8f9fa;border:2px solid #dee2e6;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:bold;color:#495057;cursor:pointer;transition:all 0.3s;aspect-ratio:1;}
        .cell:active{background:#e9ecef;transform:scale(0.95);}
        .cell.x{color:#dc3545;}
        .cell.o{color:#28a745;}
        .cell.winning{background:#ffd700;animation:pulse 1s infinite;}
        @keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}
        .game-controls{display:flex;gap:10px;justify-content:center;margin-top:20px;}
        .reset-btn,.share-btn{padding:12px 24px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s;flex:1;}
        .reset-btn{background:#6c757d;color:white;}
        .reset-btn:enabled{background:#28a745;}
        .reset-btn:enabled:active{background:#218838;}
        .share-btn{background:#007bff;color:white;}
        .share-btn:active{background:#0056b3;}
        .reset-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:1000;color:white;}
        .loading-spinner{width:50px;height:50px;border:5px solid #f3f3f3;border-top:5px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px;}
        @keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
        .hidden{display:none;}
    </style>
</head>
<body>
    <div class="container mobile">
        <div class="video-section">
            <div class="video-container">
                <video id="localVideo" autoplay playsinline muted></video>
                <div class="video-label">Sua Câmera</div>
                <div class="video-controls">
                    <button id="switchCamera" class="control-btn">🔄</button>
                    <button id="toggleCamera" class="control-btn">📷</button>
                    <button id="toggleMic" class="control-btn">🎤</button>
                </div>
            </div>
            <div class="video-container small" id="remoteVideoContainer">
                <video id="remoteVideo" autoplay playsinline></video>
                <div class="video-label">Jogador PC</div>
            </div>
        </div>
        <div class="game-section">
            <div class="game-header">
                <h2>Jogo da Velha</h2>
                <div class="game-status" id="gameStatus">Gerando ID do jogo...</div>
                <div class="game-id" id="gameIdDisplay"></div>
            </div>
            <div class="board" id="board"></div>
            <div class="game-controls">
                <button id="resetGame" class="reset-btn" disabled>Reiniciar Jogo</button>
                <button id="shareGameId" class="share-btn">Compartilhar ID</button>
            </div>
        </div>
    </div>
    <div id="loadingOverlay" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div id="loadingMessage">Solicitando permissão da câmera...</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket=io();const localVideo=document.getElementById('localVideo');const remoteVideo=document.getElementById('remoteVideo');const boardElement=document.getElementById('board');const gameStatus=document.getElementById('gameStatus');const gameIdDisplay=document.getElementById('gameIdDisplay');const resetBtn=document.getElementById('resetGame');const shareBtn=document.getElementById('shareGameId');const toggleCameraBtn=document.getElementById('toggleCamera');const toggleMicBtn=document.getElementById('toggleMic');const switchCameraBtn=document.getElementById('switchCamera');const loadingOverlay=document.getElementById('loadingOverlay');const loadingMessage=document.getElementById('loadingMessage');
        let gameId=Math.random().toString(36).substring(2,8).toUpperCase();let board=Array(9).fill(null);let currentPlayer='X';let mySymbol=null;let gameActive=false;let localStream=null;let peerConnection=null;let cameraEnabled=true;let micEnabled=true;let currentFacingMode='environment';
        const configuration={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
        gameIdDisplay.textContent=\`ID: \${gameId}\`;createBoard();startCamera();socket.emit('join-game',{gameId:gameId,deviceType:'mobile'});
        function createBoard(){boardElement.innerHTML='';for(let i=0;i<9;i++){const cell=document.createElement('div');cell.className='cell';cell.dataset.index=i;cell.addEventListener('click',()=>makeMove(i));boardElement.appendChild(cell);}}
        async function startCamera(){try{loadingOverlay.classList.remove('hidden');const constraints={video:{facingMode:currentFacingMode,width:{ideal:1280},height:{ideal:720}},audio:true};localStream=await navigator.mediaDevices.getUserMedia(constraints);localVideo.srcObject=localStream;localStream.getAudioTracks().forEach(track=>{track.enabled=micEnabled;});loadingOverlay.classList.add('hidden');createPeerConnection();}catch(error){console.error('Erro ao acessar câmera:',error);loadingMessage.textContent='Erro ao acessar câmera. Verifique as permissões.';setTimeout(()=>loadingOverlay.classList.add('hidden'),3000);}}
        function createPeerConnection(){peerConnection=new RTCPeerConnection(configuration);localStream.getTracks().forEach(track=>{peerConnection.addTrack(track,localStream);});peerConnection.ontrack=(event)=>{if(remoteVideo.srcObject!==event.streams[0]){remoteVideo.srcObject=event.streams[0];}};peerConnection.onicecandidate=(event)=>{if(event.candidate){socket.emit('ice-candidate',{target:getOtherPlayerId(),candidate:event.candidate});}};peerConnection.onnegotiationneeded=async()=>{try{const offer=await peerConnection.createOffer();await peerConnection.setLocalDescription(offer);socket.emit('offer',{target:getOtherPlayerId(),offer:peerConnection.localDescription});}catch(error){console.error('Erro na negociação:',error);}};}
        function getOtherPlayerId(){return null;}
        function makeMove(position){if(!gameActive||mySymbol!==currentPlayer||board[position])return;socket.emit('make-move',{position:position});}
        function updateBoard(newBoard){board=newBoard;const cells=document.querySelectorAll('.cell');cells.forEach((cell,index)=>{cell.textContent=board[index]||'';cell.className='cell';if(board[index]){cell.classList.add(board[index].toLowerCase());}});}
        socket.on('player-joined',(data)=>{mySymbol=data.yourSymbol;updateBoard(data.board);currentPlayer=data.currentPlayer;gameActive=true;resetBtn.disabled=false;gameStatus.textContent=\`Conectado! Você é \${mySymbol}\`;if(data.players.length===2&&mySymbol==='O'){peerConnection.onnegotiationneeded();}});
        socket.on('game-start',(data)=>{gameActive=true;gameStatus.textContent='Jogo iniciado! Sua vez';});
        socket.on('move-made',(data)=>{updateBoard(data.board);currentPlayer=data.currentPlayer;if(mySymbol===currentPlayer){gameStatus.textContent='Sua vez';}else{gameStatus.textContent='Vez do oponente';}});
        socket.on('game-over',(data)=>{gameActive=false;if(data.winner==='draw'){gameStatus.textContent='Empate!';}else if(data.winner===mySymbol){gameStatus.textContent='Você venceu! 🎉';const winPatterns=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];for(let pattern of winPatterns){const[a,b,c]=pattern;if(data.board[a]&&data.board[a]===data.board[b]&&data.board[a]===data.board[c]){const cells=document.querySelectorAll('.cell');cells[a].classList.add('winning');cells[b].classList.add('winning');cells[c].classList.add('winning');break;}}}else{gameStatus.textContent='Você perdeu! 😢';}updateBoard(data.board);});
        socket.on('game-reset',(data)=>{updateBoard(data.board);currentPlayer=data.currentPlayer;gameActive=true;if(mySymbol===currentPlayer){gameStatus.textContent='Sua vez';}else{gameStatus.textContent='Vez do oponente';}});
        socket.on('player-disconnected',()=>{gameActive=false;resetBtn.disabled=true;gameStatus.textContent='Oponente desconectado';});
        socket.on('offer',async(data)=>{await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));const answer=await peerConnection.createAnswer();await peerConnection.setLocalDescription(answer);socket.emit('answer',{target:data.sender,answer:peerConnection.localDescription});});
        socket.on('answer',async(data)=>{await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));});
        socket.on('ice-candidate',async(data)=>{try{await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));}catch(error){console.error('Erro ao adicionar ICE candidate:',error);}});
        resetBtn.addEventListener('click',()=>{socket.emit('reset-game');});
        shareBtn.addEventListener('click',()=>{if(navigator.share){navigator.share({title:'Jogo da Velha',text:\`Venha jogar comigo! ID do jogo: \${gameId}\`,url:window.location.href});}else{navigator.clipboard.writeText(\`ID do jogo: \${gameId}\`);alert('ID copiado para a área de transferência!');}});
        toggleCameraBtn.addEventListener('click',()=>{cameraEnabled=!cameraEnabled;localStream.getVideoTracks().forEach(track=>{track.enabled=cameraEnabled;});toggleCameraBtn.textContent=cameraEnabled?'📷':'🚫';});
        toggleMicBtn.addEventListener('click',()=>{micEnabled=!micEnabled;localStream.getAudioTracks().forEach(track=>{track.enabled=micEnabled;});toggleMicBtn.textContent=micEnabled?'🎤':'🔇';});
        switchCameraBtn.addEventListener('click',async()=>{currentFacingMode=currentFacingMode==='user'?'environment':'user';localStream.getTracks().forEach(track=>track.stop());try{const constraints={video:{facingMode:currentFacingMode,width:{ideal:1280},height:{ideal:720}},audio:micEnabled};localStream=await navigator.mediaDevices.getUserMedia(constraints);localVideo.srcObject=localStream;const senders=peerConnection.getSenders();localStream.getTracks().forEach(track=>{const sender=senders.find(s=>s.track.kind===track.kind);if(sender){sender.replaceTrack(track);}});}catch(error){console.error('Erro ao trocar câmera:',error);}});
    </script>
</body>
</html>`;

// HTML completo para desktop
const desktopHTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jogo da Velha Desktop</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;}
        .container.desktop{max-width:1200px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:30px;background:rgba(255,255,255,0.95);border-radius:20px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
        .video-section{display:flex;flex-direction:column;gap:20px;}
        .video-container{position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:4/3;}
        .video-container video{width:100%;height:100%;object-fit:cover;}
        .video-label{position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.6);color:white;padding:5px 10px;border-radius:4px;font-size:14px;}
        .video-controls{position:absolute;bottom:10px;right:10px;display:flex;gap:10px;}
        .control-btn{background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:45px;height:45px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s;}
        .control-btn:hover{background:rgba(0,0,0,0.8);transform:scale(1.1);}
        .game-section{text-align:center;}
        .game-header{margin-bottom:30px;}
        .game-header h2{color:#333;margin-bottom:15px;font-size:28px;}
        .game-status{font-size:18px;color:#666;margin-bottom:10px;font-weight:600;}
        .game-id{background:#f0f0f0;padding:10px;border-radius:8px;font-family:monospace;font-size:16px;color:#333;}
        .board{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:30px 0;aspect-ratio:1;}
        .cell{background:#f8f9fa;border:2px solid #dee2e6;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:60px;font-weight:bold;color:#495057;cursor:pointer;transition:all 0.3s;aspect-ratio:1;}
        .cell:hover{background:#e9ecef;transform:scale(1.05);}
        .cell.x{color:#dc3545;}
        .cell.o{color:#28a745;}
        .cell.winning{background:#ffd700;animation:pulse 1s infinite;}
        @keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}
        .game-controls{display:flex;gap:15px;justify-content:center;margin:20px 0;}
        .reset-btn,.copy-btn,.join-btn{padding:12px 24px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s;}
        .reset-btn{background:#6c757d;color:white;}
        .reset-btn:enabled{background:#28a745;}
        .reset-btn:enabled:hover{background:#218838;}
        .copy-btn{background:#007bff;color:white;}
        .copy-btn:hover{background:#0056b3;}
        .reset-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .connection-section{display:flex;gap:10px;margin-top:20px;}
        .game-id-input{flex:1;padding:12px;border:2px solid #dee2e6;border-radius:8px;font-size:16px;}
        .join-btn{background:#28a745;color:white;padding:12px 24px;}
        .join-btn:hover{background:#218838;}
        .loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:1000;color:white;}
        .loading-spinner{width:50px;height:50px;border:5px solid #f3f3f3;border-top:5px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px;}
        @keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
        .hidden{display:none;}
    </style>
</head>
<body>
    <div class="container desktop">
        <div class="video-section">
            <div class="video-container">
                <video id="localVideo" autoplay playsinline muted></video>
                <div class="video-label">Sua Câmera</div>
                <div class="video-controls">
                    <button id="toggleCamera" class="control-btn">📷</button>
                    <button id="toggleMic" class="control-btn">🎤</button>
                </div>
            </div>
            <div class="video-container">
                <video id="remoteVideo" autoplay playsinline></video>
                <div class="video-label">Jogador Mobile</div>
            </div>
        </div>
        <div class="game-section">
            <div class="game-header">
                <h2>Jogo da Velha</h2>
                <div class="game-status" id="gameStatus">Aguardando jogador...</div>
                <div class="game-id" id="gameIdDisplay"></div>
            </div>
            <div class="board" id="board"></div>
            <div class="game-controls">
                <button id="resetGame" class="reset-btn" disabled>Reiniciar Jogo</button>
                <button id="copyGameId" class="copy-btn">Copiar ID do Jogo</button>
            </div>
            <div class="connection-section">
                <input type="text" id="gameIdInput" placeholder="Digite o ID do jogo" class="game-id-input">
                <button id="joinGame" class="join-btn">Conectar</button>
            </div>
        </div>
    </div>
    <div id="loadingOverlay" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div id="loadingMessage">Solicitando permissão da câmera...</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket=io();const localVideo=document.getElementById('localVideo');const remoteVideo=document.getElementById('remoteVideo');const boardElement=document.getElementById('board');const gameStatus=document.getElementById('gameStatus');const gameIdDisplay=document.getElementById('gameIdDisplay');const resetBtn=document.getElementById('resetGame');const copyBtn=document.getElementById('copyGameId');const joinBtn=document.getElementById('joinGame');const gameIdInput=document.getElementById('gameIdInput');const toggleCameraBtn=document.getElementById('toggleCamera');const toggleMicBtn=document.getElementById('toggleMic');const loadingOverlay=document.getElementById('loadingOverlay');const loadingMessage=document.getElementById('loadingMessage');
        let gameId=null;let board=Array(9).fill(null);let currentPlayer='X';let mySymbol=null;let gameActive=false;let localStream=null;let peerConnection=null;let cameraEnabled=true;let micEnabled=true;
        const configuration={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
        createBoard();startCamera();
        function createBoard(){boardElement.innerHTML='';for(let i=0;i<9;i++){const cell=document.createElement('div');cell.className='cell';cell.dataset.index=i;cell.addEventListener('click',()=>makeMove(i));boardElement.appendChild(cell);}}
        async function startCamera(){try{loadingOverlay.classList.remove('hidden');const constraints={video:true,audio:true};localStream=await navigator.mediaDevices.getUserMedia(constraints);localVideo.srcObject=localStream;localStream.getAudioTracks().forEach(track=>{track.enabled=micEnabled;});loadingOverlay.classList.add('hidden');}catch(error){console.error('Erro ao acessar câmera:',error);loadingMessage.textContent='Erro ao acessar câmera. Verifique as permissões.';setTimeout(()=>loadingOverlay.classList.add('hidden'),3000);}}
        function createPeerConnection(){peerConnection=new RTCPeerConnection(configuration);localStream.getTracks().forEach(track=>{peerConnection.addTrack(track,localStream);});peerConnection.ontrack=(event)=>{if(remoteVideo.srcObject!==event.streams[0]){remoteVideo.srcObject=event.streams[0];}};peerConnection.onicecandidate=(event)=>{if(event.candidate){socket.emit('ice-candidate',{target:getOtherPlayerId(),candidate:event.candidate});}};peerConnection.onnegotiationneeded=async()=>{try{const offer=await peerConnection.createOffer();await peerConnection.setLocalDescription(offer);socket.emit('offer',{target:getOtherPlayerId(),offer:peerConnection.localDescription});}catch(error){console.error('Erro na negociação:',error);}};}
        function getOtherPlayerId(){return null;}
        function makeMove(position){if(!gameActive||mySymbol!==currentPlayer||board[position])return;socket.emit('make-move',{position:position});}
        function updateBoard(newBoard){board=newBoard;const cells=document.querySelectorAll('.cell');cells.forEach((cell,index)=>{cell.textContent=board[index]||'';cell.className='cell';if(board[index]){cell.classList.add(board[index].toLowerCase());}});}
        function joinGame(id){gameId=id;gameIdDisplay.textContent=\`ID: \${gameId}\`;socket.emit('join-game',{gameId:gameId,deviceType:'desktop'});createPeerConnection();}
        socket.on('player-joined',(data)=>{mySymbol=data.yourSymbol;updateBoard(data.board);currentPlayer=data.currentPlayer;gameActive=true;resetBtn.disabled=false;gameStatus.textContent=\`Conectado! Você é \${mySymbol}\`;if(data.players.length===2&&mySymbol==='X'){peerConnection.onnegotiationneeded();}});
        socket.on('game-start',(data)=>{gameActive=true;gameStatus.textContent='Jogo iniciado! Aguardando sua vez';});
        socket.on('move-made',(data)=>{updateBoard(data.board);currentPlayer=data.currentPlayer;if(mySymbol===currentPlayer){gameStatus.textContent='Sua vez';}else{gameStatus.textContent='Vez do oponente';}});
        socket.on('game-over',(data)=>{gameActive=false;if(data.winner==='draw'){gameStatus.textContent='Empate!';}else if(data.winner===mySymbol){gameStatus.textContent='Você venceu! 🎉';const winPatterns=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];for(let pattern of winPatterns){const[a,b,c]=pattern;if(data.board[a]&&data.board[a]===data.board[b]&&data.board[a]===data.board[c]){const cells=document.querySelectorAll('.cell');cells[a].classList.add('winning');cells[b].classList.add('winning');cells[c].classList.add('winning');break;}}}else{gameStatus.textContent='Você perdeu! 😢';}updateBoard(data.board);});
        socket.on('game-reset',(data)=>{updateBoard(data.board);currentPlayer=data.currentPlayer;gameActive=true;if(mySymbol===currentPlayer){gameStatus.textContent='Sua vez';}else{gameStatus.textContent='Vez do oponente';}});
        socket.on('player-disconnected',()=>{gameActive=false;resetBtn.disabled=true;gameStatus.textContent='Oponente desconectado';});
        socket.on('offer',async(data)=>{await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));const answer=await peerConnection.createAnswer();await peerConnection.setLocalDescription(answer);socket.emit('answer',{target:data.sender,answer:peerConnection.localDescription});});
        socket.on('answer',async(data)=>{await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));});
        socket.on('ice-candidate',async(data)=>{try{await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));}catch(error){console.error('Erro ao adicionar ICE candidate:',error);}});
        resetBtn.addEventListener('click',()=>{socket.emit('reset-game');});
        copyBtn.addEventListener('click',()=>{if(gameId){navigator.clipboard.writeText(gameId);alert('ID copiado para a área de transferência!');}});
        joinBtn.addEventListener('click',()=>{const id=gameIdInput.value.trim().toUpperCase();if(id){joinGame(id);gameIdInput.disabled=true;joinBtn.disabled=true;}});
        toggleCameraBtn.addEventListener('click',()=>{cameraEnabled=!cameraEnabled;localStream.getVideoTracks().forEach(track=>{track.enabled=cameraEnabled;});toggleCameraBtn.textContent=cameraEnabled?'📷':'🚫';});
        toggleMicBtn.addEventListener('click',()=>{micEnabled=!micEnabled;localStream.getAudioTracks().forEach(track=>{track.enabled=micEnabled;});toggleMicBtn.textContent=micEnabled?'🎤':'🔇';});
    </script>
</body>
</html>`;

// Rotas
app.get('/', (req, res) => {
    const userAgent = req.headers['user-agent'].toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
        res.send(mobileHTML);
    } else {
        res.send(desktopHTML);
    }
});

app.get('/mobile', (req, res) => {
    res.send(mobileHTML);
});

app.get('/desktop', (req, res) => {
    res.send(desktopHTML);
});

// Gerenciamento de jogos
const games = new Map();
const users = new Map();

io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    socket.on('join-game', (data) => {
        const { gameId, deviceType } = data;
        
        if (!games.has(gameId)) {
            games.set(gameId, {
                players: [],
                board: Array(9).fill(null),
                currentPlayer: 'X',
                gameActive: true
            });
        }

        const game = games.get(gameId);
        
        if (game.players.length < 2) {
            game.players.push({
                id: socket.id,
                deviceType,
                symbol: game.players.length === 0 ? 'X' : 'O'
            });
            
            users.set(socket.id, { gameId, deviceType });
            socket.join(gameId);
            
            io.to(gameId).emit('player-joined', {
                players: game.players,
                board: game.board,
                currentPlayer: game.currentPlayer,
                yourSymbol: game.players.find(p => p.id === socket.id)?.symbol
            });
            
            if (game.players.length === 2) {
                io.to(gameId).emit('game-start', {
                    message: 'Jogo iniciado! X começa.',
                    board: game.board
                });
            }
        }
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', {
            offer: data.offer,
            sender: socket.id
        });
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', {
            answer: data.answer,
            sender: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    // Movimentos do jogo
    socket.on('make-move', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameId);
        if (!game) return;

        const player = game.players.find(p => p.id === socket.id);
        if (!player || player.symbol !== game.currentPlayer || !game.gameActive) return;

        if (data.position >= 0 && data.position < 9 && !game.board[data.position]) {
            game.board[data.position] = player.symbol;
            
            const winner = checkWinner(game.board);
            const isDraw = !game.board.includes(null) && !winner;
            
            if (winner) {
                game.gameActive = false;
                io.to(user.gameId).emit('game-over', {
                    winner: player.symbol,
                    board: game.board
                });
            } else if (isDraw) {
                game.gameActive = false;
                io.to(user.gameId).emit('game-over', {
                    winner: 'draw',
                    board: game.board
                });
            } else {
                game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
                io.to(user.gameId).emit('move-made', {
                    position: data.position,
                    symbol: player.symbol,
                    board: game.board,
                    currentPlayer: game.currentPlayer
                });
            }
        }
    });

    socket.on('reset-game', () => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameId);
        if (game) {
            game.board = Array(9).fill(null);
            game.currentPlayer = 'X';
            game.gameActive = true;
            
            io.to(user.gameId).emit('game-reset', {
                board: game.board,
                currentPlayer: game.currentPlayer
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const game = games.get(user.gameId);
            if (game) {
                io.to(user.gameId).emit('player-disconnected', {
                    playerId: socket.id
                });
                
                if (game.players.length <= 1) {
                    games.delete(user.gameId);
                } else {
                    game.players = game.players.filter(p => p.id !== socket.id);
                }
            }
            users.delete(socket.id);
        }
        console.log('Usuário desconectado:', socket.id);
    });
});

function checkWinner(board) {
    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    for (let pattern of winPatterns) {
        const [a,b,c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

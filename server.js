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
const SENHA = "1234"; // 🔑 Mude para a senha que quiser

// Armazenar estado da visualização
let visualizacaoAtiva = false;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>📷 Câmera Protegida</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .status-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-label { font-weight: bold; color: #555; }
        .status-value {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 500;
        }
        .status-value.on { background: #4CAF50; color: white; }
        .status-value.off { background: #f44336; color: white; }
        
        /* 🔒 TELA DE SENHA */
        #senhaOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .senha-box {
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        .senha-box h2 {
            color: #333;
            margin-bottom: 20px;
        }
        .senha-box input {
            width: 100%;
            padding: 15px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }
        .senha-box button {
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 10px;
            cursor: pointer;
            width: 100%;
        }
        .senha-box button:hover { background: #5a67d8; }
        .erro-senha {
            color: #f44336;
            margin-top: 10px;
            display: none;
        }
        
        /* 🎥 BOTÃO DE MOSTRAR/ESCONDER */
        .toggle-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 10px;
            cursor: pointer;
            margin: 20px 0;
            width: 100%;
        }
        .toggle-btn.off { background: #f44336; }
        
        .video-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .video-wrapper {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
        }
        .video-wrapper h3 { margin-bottom: 15px; color: #333; }
        video, img {
            width: 100%;
            border-radius: 10px;
            background: #000;
        }
        #localVideo { transform: scaleX(-1); }
        .hidden { display: none; }
        
        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin: 20px 0;
        }
        .btn {
            padding: 15px 30px;
            font-size: 18px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        }
        .btn-primary { background: #4CAF50; color: white; }
        .btn-secondary { background: #f44336; color: white; }
        .btn-success { background: #2196F3; color: white; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>
    <!-- 🔒 TELA DE SENHA -->
    <div id="senhaOverlay">
        <div class="senha-box">
            <h2>🔒 Área Restrita</h2>
            <p style="margin-bottom: 20px; color: #666;">Digite a senha para acessar a câmera</p>
            <input type="password" id="senhaInput" placeholder="Senha" maxlength="4">
            <button onclick="verificarSenha()">Acessar</button>
            <div id="erroSenha" class="erro-senha">Senha incorreta!</div>
        </div>
    </div>

    <div class="container" id="conteudoPrincipal" style="display: none;">
        <h1>📷 Sistema de Câmera Protegido</h1>
        
        <div class="status-bar">
            <div class="status-item">
                <span class="status-label">Câmera:</span>
                <span id="cameraStatus" class="status-value off">Desligada</span>
            </div>
            <div class="status-item">
                <span class="status-label">Visualização:</span>
                <span id="viewStatus" class="status-value off">Oculta</span>
            </div>
        </div>

        <!-- 🔘 BOTÃO PARA MOSTRAR/ESCONDER -->
        <button id="toggleViewBtn" class="toggle-btn off" onclick="toggleVisualizacao()">
            👁️ Mostrar Visualização
        </button>

        <!-- 📹 ÁREA DE VISUALIZAÇÃO (começa oculta) -->
        <div id="videoArea" class="hidden">
            <div class="video-container">
                <div class="video-wrapper">
                    <h3>📱 Local (seu celular)</h3>
                    <video id="localVideo" autoplay playsinline muted></video>
                </div>
                <div class="video-wrapper">
                    <h3>📺 Remoto (outro dispositivo)</h3>
                    <img id="remoteVideo">
                </div>
            </div>

            <div class="controls">
                <button id="ligarBtn" class="btn btn-primary" onclick="ligarCamera()">🎥 Ligar Câmera</button>
                <button id="desligarBtn" class="btn btn-secondary" onclick="desligarCamera()" disabled>⏹️ Desligar</button>
                <button id="fotoBtn" class="btn btn-success" onclick="tirarFoto()" disabled>📸 Foto</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "1234"; // 🔑 Mesma senha do servidor
        
        // Elementos
        const senhaOverlay = document.getElementById('senhaOverlay');
        const conteudoPrincipal = document.getElementById('conteudoPrincipal');
        const videoArea = document.getElementById('videoArea');
        const toggleBtn = document.getElementById('toggleViewBtn');
        const viewStatus = document.getElementById('viewStatus');
        
        // Estado
        let visualizacaoAtiva = false;
        let cameraLigada = false;
        let mediaStream = null;
        let intervaloEnvio = null;
        
        // ========== VERIFICAÇÃO DE SENHA ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            if (senha === SENHA_CORRETA) {
                senhaOverlay.style.display = 'none';
                conteudoPrincipal.style.display = 'block';
            } else {
                document.getElementById('erroSenha').style.display = 'block';
            }
        };
        
        // Enter no campo de senha
        document.getElementById('senhaInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
        
        // ========== MOSTRAR/ESCONDER VISUALIZAÇÃO ==========
        window.toggleVisualizacao = function() {
            visualizacaoAtiva = !visualizacaoAtiva;
            
            if (visualizacaoAtiva) {
                videoArea.classList.remove('hidden');
                toggleBtn.textContent = '👁️ Ocultar Visualização';
                toggleBtn.classList.remove('off');
                viewStatus.textContent = 'Visível';
                viewStatus.className = 'status-value on';
            } else {
                videoArea.classList.add('hidden');
                toggleBtn.textContent = '👁️ Mostrar Visualização';
                toggleBtn.classList.add('off');
                viewStatus.textContent = 'Oculta';
                viewStatus.className = 'status-value off';
            }
        };
        
        // ========== SOCKET.IO ==========
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
        });
        
        socket.on('frame', (frameData) => {
            document.getElementById('remoteVideo').src = frameData;
        });
        
        // ========== FUNÇÕES DA CÂMERA ==========
        window.ligarCamera = async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 } 
                });
                
                mediaStream = stream;
                document.getElementById('localVideo').srcObject = stream;
                
                cameraLigada = true;
                document.getElementById('cameraStatus').textContent = 'Ligada';
                document.getElementById('cameraStatus').className = 'status-value on';
                document.getElementById('ligarBtn').disabled = true;
                document.getElementById('desligarBtn').disabled = false;
                document.getElementById('fotoBtn').disabled = false;
                
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const context = canvas.getContext('2d');
                
                intervaloEnvio = setInterval(() => {
                    if (mediaStream?.active) {
                        context.drawImage(document.getElementById('localVideo'), 0, 0, 640, 480);
                        const frame = canvas.toDataURL('image/jpeg', 0.5);
                        socket.emit('frame', frame);
                    }
                }, 200);
                
            } catch (err) {
                alert('Erro: ' + err.message);
            }
        };
        
        window.desligarCamera = function() {
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
            }
            clearInterval(intervaloEnvio);
            document.getElementById('localVideo').srcObject = null;
            
            cameraLigada = false;
            document.getElementById('cameraStatus').textContent = 'Desligada';
            document.getElementById('cameraStatus').className = 'status-value off';
            document.getElementById('ligarBtn').disabled = false;
            document.getElementById('desligarBtn').disabled = true;
            document.getElementById('fotoBtn').disabled = true;
        };
        
        window.tirarFoto = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            canvas.getContext('2d').drawImage(document.getElementById('localVideo'), 0, 0, 640, 480);
            const link = document.createElement('a');
            link.download = 'foto-' + Date.now() + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        };
    </script>
</body>
</html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('📷 SISTEMA DE CÂMERA PROTEGIDO');
  console.log('='.repeat(50));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha: ${SENHA}`);
  console.log('='.repeat(50));
});

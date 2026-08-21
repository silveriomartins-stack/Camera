const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// ========== ARMAZENAMENTO ==========
const students = new Map(); // studentId -> { id, name, dupla, socketId, loginTime, totalTime, finished }
const answers = new Map(); // studentId -> { questionId, answer, timeSpent, isCorrect, timestamp }
const sessions = new Map(); // studentId -> { startTime, lastActivity, questionTimes }
const finishedStudents = new Set(); // studentId -> true (bloqueia reentrada)

// ========== ALUNOS CADASTRADOS ==========
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// >>>>>>>>>>>> ADICIONE OS ALUNOS AQUI (nome completo) >>>>>>>>>>>>>>>>>>>>>>
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
const REGISTERED_STUDENTS = new Set([
  'SILVERIO SANTOS MARTINS',
  'LUCAS SANTOS MARTINS',
  // ADICIONE MAIS ALUNOS AQUI, EXEMPLO:
  // 'MARIA JOSE SILVA',
  // 'JOAO PEDRO SOUZA',
]);
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// ========== QUESTÕES ==========
const questions = [
  {
    id: 1,
    question: "Calcule o valor de 25 + 37",
    answer: "62",
    options: ["61", "62", "63", "64"]
  },
  {
    id: 2,
    question: "Quanto é 15 × 8?",
    answer: "120",
    options: ["110", "115", "120", "125"]
  },
  {
    id: 3,
    question: "Qual é a raiz quadrada de 144?",
    answer: "12",
    options: ["10", "11", "12", "13"]
  },
  {
    id: 4,
    question: "Calcule 3² + 4²",
    answer: "25",
    options: ["24", "25", "26", "27"]
  },
  {
    id: 5,
    question: "Quanto é 2⁵?",
    answer: "32",
    options: ["16", "32", "64", "128"]
  },
  {
    id: 6,
    question: "Qual é o valor de π (pi) com duas casas decimais?",
    answer: "3.14",
    options: ["3.12", "3.14", "3.16", "3.18"]
  },
  {
    id: 7,
    question: "Calcule 45 ÷ 9",
    answer: "5",
    options: ["4", "5", "6", "7"]
  },
  {
    id: 8,
    question: "Quanto é 100 - 37?",
    answer: "63",
    options: ["62", "63", "64", "65"]
  },
  {
    id: 9,
    question: "Qual é o dobro de 128?",
    answer: "256",
    options: ["254", "255", "256", "257"]
  },
  {
    id: 10,
    question: "Calcule 7 × 7 - 10",
    answer: "39",
    options: ["38", "39", "40", "41"]
  }
];

// ========== ROTAS ==========

app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');

  if (isMobile) {
    // ========== PÁGINA DO ALUNO ==========
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>Prova Matemática</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a0a1a;
            color: #d4a0d4;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }
        .container {
            max-width: 500px;
            width: 100%;
            background: #1a0a1a;
            border: 2px solid #c084c0;
            border-radius: 15px;
            padding: 25px 20px;
            min-height: 90vh;
            box-shadow: 0 0 40px rgba(192, 132, 192, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 2px solid #c084c0;
            margin-bottom: 20px;
        }
        .header h1 {
            font-weight: 300;
            letter-spacing: 2px;
            font-size: 22px;
            color: #e8c8e8;
        }
        .header .sub {
            font-size: 12px;
            opacity: 0.5;
            margin-top: 5px;
            letter-spacing: 1px;
            color: #b888b8;
        }
        .login-area {
            padding: 10px 0;
        }
        .login-area h2 {
            text-align: center;
            font-weight: 300;
            letter-spacing: 2px;
            opacity: 0.6;
            margin-bottom: 20px;
            font-size: 16px;
            color: #d4a0d4;
        }
        .form-group { margin-bottom: 15px; }
        .form-group label {
            display: block;
            font-size: 12px;
            letter-spacing: 1px;
            opacity: 0.5;
            margin-bottom: 5px;
            color: #c084c0;
        }
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            background: #120a12;
            border: 1px solid #c084c0;
            border-radius: 8px;
            color: #e8c8e8;
            font-size: 15px;
            outline: none;
            transition: all 0.3s;
        }
        .form-group input:focus {
            border-color: #d4a0d4;
            box-shadow: 0 0 20px rgba(192, 132, 192, 0.1);
        }
        .form-group input::placeholder {
            color: #5a3a5a;
        }
        .login-btn {
            width: 100%;
            padding: 14px;
            background: #c084c0;
            color: #1a0a1a;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        .login-btn:hover {
            background: #d4a0d4;
            box-shadow: 0 0 30px rgba(192, 132, 192, 0.2);
        }
        .login-btn:disabled {
            background: #3a2a3a;
            color: #5a4a5a;
            cursor: not-allowed;
        }
        .error-msg {
            color: #ff6666;
            text-align: center;
            margin-top: 10px;
            font-size: 13px;
        }
        .exam-area { display: none; }
        .question-container {
            background: #120a12;
            border: 1px solid #c084c0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
        }
        .question-number {
            font-size: 12px;
            opacity: 0.4;
            letter-spacing: 2px;
            margin-bottom: 10px;
            color: #b888b8;
        }
        .question-text {
            font-size: 18px;
            margin-bottom: 20px;
            color: #e8c8e8;
            line-height: 1.5;
        }
        .options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .options button {
            padding: 12px;
            background: #1a0a1a;
            border: 1px solid #c084c0;
            border-radius: 8px;
            color: #d4a0d4;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .options button:hover {
            background: #2a1a2a;
            border-color: #d4a0d4;
        }
        .options button.selected {
            background: #c084c0;
            color: #1a0a1a;
            border-color: #c084c0;
        }
        .options button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .options button.correct {
            background: #66cc88;
            color: #1a0a1a;
            border-color: #66cc88;
        }
        .options button.wrong {
            background: #cc6666;
            color: #1a0a1a;
            border-color: #cc6666;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #c084c0;
            margin-bottom: 15px;
            font-size: 12px;
            opacity: 0.4;
            color: #b888b8;
        }
        .progress {
            text-align: center;
            padding: 10px;
            font-size: 13px;
            opacity: 0.3;
            letter-spacing: 2px;
            color: #b888b8;
        }
        .nav-btn {
            width: 100%;
            padding: 14px;
            background: #c084c0;
            color: #1a0a1a;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        .nav-btn:hover {
            background: #d4a0d4;
            box-shadow: 0 0 30px rgba(192, 132, 192, 0.2);
        }
        .nav-btn:disabled {
            background: #3a2a3a;
            color: #5a4a5a;
            cursor: not-allowed;
        }
        .finish-btn {
            width: 100%;
            padding: 14px;
            background: #cc6666;
            color: #1a0a1a;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 15px;
        }
        .finish-btn:hover {
            background: #ff6666;
            box-shadow: 0 0 30px rgba(204, 102, 102, 0.2);
        }
        .finish-btn:disabled {
            background: #3a2a3a;
            color: #5a4a5a;
            cursor: not-allowed;
        }
        .completion-area {
            display: none;
            text-align: center;
            padding: 30px 0;
        }
        .completion-area .icon {
            font-size: 48px;
            color: #c084c0;
            margin-bottom: 15px;
        }
        .completion-area h2 {
            font-weight: 300;
            letter-spacing: 3px;
            color: #e8c8e8;
            margin-bottom: 10px;
        }
        .completion-area .code {
            font-size: 28px;
            letter-spacing: 6px;
            padding: 15px;
            background: #120a12;
            border: 2px solid #c084c0;
            border-radius: 8px;
            margin: 15px 0;
            color: #d4a0d4;
        }
        .completion-area .info {
            opacity: 0.4;
            font-size: 13px;
            letter-spacing: 1px;
            margin: 8px 0;
            color: #b888b8;
        }
        .completion-area .score {
            font-size: 32px;
            color: #c084c0;
            margin: 15px 0;
        }
        .warning {
            color: #ff6666;
            font-size: 12px;
            text-align: center;
            padding: 8px;
            background: #1a0a0a;
            border: 1px solid #ff6666;
            border-radius: 6px;
            margin: 5px 0;
            display: none;
        }
        .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
        }
        .status-dot.online { background: #66cc88; }
        .blocked-msg {
            text-align: center;
            padding: 30px 0;
            color: #ff6666;
        }
        .blocked-msg h2 {
            font-weight: 300;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Prova Matemática</h1>
            <div class="sub">Professor Heber Lemos</div>
        </div>

        <!-- Login -->
        <div id="loginArea" class="login-area">
            <h2>Identificacao</h2>
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="studentName" placeholder="Digite seu nome completo">
            </div>
            <div class="form-group">
                <label>Dupla</label>
                <input type="text" id="studentDupla" placeholder="Nome da sua dupla">
            </div>
            <button class="login-btn" id="loginBtn">Iniciar Prova</button>
            <div class="error-msg" id="loginError"></div>
        </div>

        <!-- Prova -->
        <div id="examArea" class="exam-area">
            <div class="status-bar">
                <span id="timer">00:00</span>
                <span id="studentInfo">Aluno</span>
            </div>
            <div id="warning" class="warning"></div>
            <div id="questionContainer"></div>
            <div class="progress" id="progress">Questao 0 de 10</div>
            <button class="nav-btn" id="nextBtn">Avancar</button>
            <button class="finish-btn" id="finishBtn">Finalizar Prova</button>
        </div>

        <!-- Finalizacao -->
        <div id="completionArea" class="completion-area">
            <div class="icon">�</div>
            <h2>Prova Finalizada</h2>
            <div class="score" id="scoreDisplay">0/10</div>
            <div class="info">Codigo de Finalizacao</div>
            <div class="code" id="completionCode">XXXX-XXXX</div>
            <div class="info" id="completionStats"></div>
            <button class="login-btn" onclick="location.reload()" style="margin-top:20px;">Nova Prova</button>
        </div>

        <!-- Bloqueado -->
        <div id="blockedArea" class="blocked-msg" style="display:none;">
            <h2>Acesso Bloqueado</h2>
            <p>Esta prova ja foi finalizada.</p>
            <button class="login-btn" onclick="location.reload()" style="margin-top:20px;">Voltar</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({ transports: ['websocket', 'polling'], reconnection: true });
        let studentId = null;
        let studentName = null;
        let studentDupla = null;
        let isLoggedIn = false;
        let currentQuestion = 0;
        let answers = {};
        let startTime = null;
        let timerInterval = null;
        let elapsedSeconds = 0;
        let questionStartTime = null;
        let isFinished = false;
        let selectedAnswer = null;

        // Elementos
        const loginArea = document.getElementById('loginArea');
        const examArea = document.getElementById('examArea');
        const completionArea = document.getElementById('completionArea');
        const blockedArea = document.getElementById('blockedArea');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');
        const questionContainer = document.getElementById('questionContainer');
        const progress = document.getElementById('progress');
        const timer = document.getElementById('timer');
        const studentInfo = document.getElementById('studentInfo');
        const finishBtn = document.getElementById('finishBtn');
        const nextBtn = document.getElementById('nextBtn');
        const warning = document.getElementById('warning');
        const completionCode = document.getElementById('completionCode');
        const completionStats = document.getElementById('completionStats');
        const scoreDisplay = document.getElementById('scoreDisplay');

        // ===== LOGIN =====
        loginBtn.onclick = () => {
            const name = document.getElementById('studentName').value.trim().toUpperCase();
            const dupla = document.getElementById('studentDupla').value.trim().toUpperCase();
            
            if(!name || !dupla) {
                loginError.textContent = 'Preencha todos os campos';
                return;
            }

            // Verifica se o aluno está cadastrado
            const registeredStudents = ${JSON.stringify(Array.from(REGISTERED_STUDENTS))};
            if(!registeredStudents.includes(name)) {
                loginError.textContent = 'Aluno nao cadastrado';
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Conectando...';
            loginError.textContent = '';

            studentName = name;
            studentDupla = dupla;
            socket.emit('student_login', { name, dupla });
        };

        socket.on('login_success', (data) => {
            studentId = data.studentId;
            isLoggedIn = true;
            loginArea.style.display = 'none';
            examArea.style.display = 'block';
            studentInfo.textContent = studentName + ' | ' + studentDupla;
            startTime = Date.now();
            startTimer();
            renderQuestion(0);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Prova';
        });

        socket.on('login_error', (data) => {
            loginError.textContent = data.error || 'Erro ao logar';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Prova';
        });

        socket.on('already_finished', () => {
            loginArea.style.display = 'none';
            blockedArea.style.display = 'block';
        });

        // ===== TIMER =====
        function startTimer() {
            timerInterval = setInterval(() => {
                elapsedSeconds++;
                const minutes = Math.floor(elapsedSeconds / 60);
                const seconds = elapsedSeconds % 60;
                timer.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }, 1000);
        }

        // ===== RENDER QUESTION =====
        function renderQuestion(index) {
            const questionsData = ${JSON.stringify(questions)};
            if(index >= questionsData.length) {
                finishBtn.style.display = 'block';
                nextBtn.style.display = 'none';
                progress.textContent = 'Prova Completa! Finalize';
                return;
            }

            const q = questionsData[index];
            selectedAnswer = null;
            questionStartTime = Date.now();

            questionContainer.innerHTML = \`
                <div class="question-container">
                    <div class="question-number">Questao \${index + 1} de 10</div>
                    <div class="question-text">\${q.question}</div>
                    <div class="options" id="optionsContainer">
                        \${q.options.map(opt => \`
                            <button onclick="selectAnswer('\${opt}', \${q.id}, \${index})" id="opt_\${q.id}_\${opt.replace(/[^a-zA-Z0-9]/g, '_')}">
                                \${opt}
                            </button>
                        \`).join('')}
                    </div>
                </div>
            \`;

            progress.textContent = 'Questao ' + (index + 1) + ' de 10';
            finishBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            nextBtn.disabled = true;
        }

        // ===== SELECT ANSWER =====
        function selectAnswer(answer, questionId, index) {
            const timeSpent = (Date.now() - questionStartTime) / 1000;
            
            // Verifica tempo mínimo (5 segundos)
            if(timeSpent < 5) {
                showWarning('Aguarde 5 segundos para responder');
                return;
            }

            selectedAnswer = answer;
            
            // Atualiza visual
            const container = document.getElementById('optionsContainer');
            if(container) {
                const buttons = container.querySelectorAll('button');
                buttons.forEach(btn => {
                    btn.disabled = true;
                    if(btn.textContent === answer) {
                        btn.classList.add('selected');
                    }
                });
            }

            // Salva resposta
            answers[questionId] = {
                answer: answer,
                timeSpent: Math.round(timeSpent)
            };

            // Habilita próximo
            nextBtn.disabled = false;

            // Verifica se é correta
            const questionsData = ${JSON.stringify(questions)};
            const q = questionsData.find(q => q.id === questionId);
            const isCorrect = q.answer === answer;

            // Envia para o servidor
            socket.emit('answer_submitted', {
                studentId,
                questionId,
                answer,
                timeSpent: Math.round(timeSpent),
                isCorrect,
                questionNumber: index + 1
            });
        }

        // ===== NEXT QUESTION =====
        nextBtn.onclick = () => {
            if(selectedAnswer === null) return;
            currentQuestion++;
            if(currentQuestion >= ${JSON.stringify(questions)}.length) {
                renderQuestion(currentQuestion);
                finishBtn.style.display = 'block';
                nextBtn.style.display = 'none';
                progress.textContent = 'Prova Completa! Finalize';
            } else {
                renderQuestion(currentQuestion);
            }
        };

        // ===== FINISH EXAM =====
        finishBtn.onclick = () => {
            const totalQuestions = ${JSON.stringify(questions)}.length;
            const answered = Object.keys(answers).length;

            if(answered < totalQuestions) {
                showWarning('Responda todas as questoes antes de finalizar');
                return;
            }

            if(confirm('Finalizar prova?')) {
                isFinished = true;
                finishBtn.disabled = true;
                nextBtn.disabled = true;
                clearInterval(timerInterval);

                const totalTime = Math.round(elapsedSeconds);
                const completionCode = generateCode();

                // Calcula acertos
                const questionsData = ${JSON.stringify(questions)};
                let correctCount = 0;
                Object.keys(answers).forEach(qId => {
                    const q = questionsData.find(q => q.id === parseInt(qId));
                    if(q && answers[qId].answer === q.answer) {
                        correctCount++;
                    }
                });

                socket.emit('exam_finished', {
                    studentId,
                    answers,
                    totalTime,
                    completionCode,
                    studentName,
                    studentDupla,
                    correctCount
                });

                // Mostra finalizacao
                examArea.style.display = 'none';
                completionArea.style.display = 'block';
                completionCode.textContent = completionCode;
                scoreDisplay.textContent = correctCount + '/10';
                completionStats.textContent = 'Tempo total: ' + formatTime(totalTime);
            }
        };

        // ===== GENERATE CODE =====
        function generateCode() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for(let i = 0; i < 8; i++) {
                if(i === 4) code += '-';
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        }

        // ===== WARNING =====
        function showWarning(msg) {
            warning.textContent = msg;
            warning.style.display = 'block';
            setTimeout(() => {
                warning.style.display = 'none';
            }, 3000);
        }

        // ===== DETECT COPY/PASTE =====
        document.addEventListener('copy', (e) => {
            if(isLoggedIn && !isFinished) {
                socket.emit('copy_detected', { studentId, timestamp: new Date().toISOString() });
                showWarning('Copiar nao permitido');
            }
        });

        document.addEventListener('paste', (e) => {
            if(isLoggedIn && !isFinished) {
                socket.emit('paste_detected', { studentId, timestamp: new Date().toISOString() });
                showWarning('Colar nao permitido');
            }
        });

        // ===== SOCKET EVENTS =====
        socket.on('force_disconnect', () => {
            alert('Conexao encerrada');
            location.reload();
        });

        socket.on('connect', () => {
            console.log('Conectado');
        });

        socket.on('disconnect', () => {
            console.log('Desconectado');
        });
    </script>
</body>
</html>`);
  } else {
    // ========== PÁGINA DO PROFESSOR ==========
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Professor Heber Lemos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a0a1a;
            color: #d4a0d4;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            font-weight: 300;
            font-size: 24px;
            letter-spacing: 4px;
            text-align: center;
            margin-bottom: 25px;
            color: #e8c8e8;
        }
        h1 .sub {
            font-size: 13px;
            opacity: 0.4;
            display: block;
            margin-top: 5px;
            letter-spacing: 2px;
            color: #b888b8;
        }
        .login-panel {
            max-width: 400px;
            margin: 0 auto 20px;
            background: #120a12;
            border: 1px solid #c084c0;
            border-radius: 12px;
            padding: 25px;
        }
        .login-panel h2 {
            text-align: center;
            font-weight: 300;
            letter-spacing: 3px;
            opacity: 0.5;
            font-size: 16px;
            margin-bottom: 15px;
            color: #d4a0d4;
        }
        .form-group { margin-bottom: 12px; }
        .form-group label {
            display: block;
            font-size: 12px;
            letter-spacing: 1px;
            opacity: 0.4;
            margin-bottom: 3px;
            color: #c084c0;
        }
        .form-group input {
            width: 100%;
            padding: 10px 14px;
            background: #1a0a1a;
            border: 1px solid #c084c0;
            border-radius: 8px;
            color: #e8c8e8;
            font-size: 14px;
            outline: none;
        }
        .form-group input:focus {
            border-color: #d4a0d4;
            box-shadow: 0 0 20px rgba(192, 132, 192, 0.1);
        }
        .btn-primary {
            width: 100%;
            padding: 12px;
            background: #c084c0;
            color: #1a0a1a;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-primary:hover {
            background: #d4a0d4;
            box-shadow: 0 0 30px rgba(192, 132, 192, 0.2);
        }
        .error-msg {
            color: #ff6666;
            text-align: center;
            margin-top: 10px;
            font-size: 13px;
        }
        .main-grid {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 15px;
            height: calc(100vh - 220px);
        }
        .panel {
            background: #120a12;
            border: 1px solid #c084c0;
            border-radius: 12px;
            padding: 15px;
            overflow-y: auto;
        }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-track { background: #1a0a1a; }
        .panel::-webkit-scrollbar-thumb { background: #c084c0; border-radius: 2px; }
        .panel h2 {
            font-weight: 300;
            font-size: 13px;
            letter-spacing: 3px;
            margin-bottom: 12px;
            opacity: 0.5;
            border-bottom: 1px solid #c084c0;
            padding-bottom: 8px;
            color: #d4a0d4;
        }
        .panel h3 {
            font-weight: 300;
            font-size: 12px;
            letter-spacing: 2px;
            margin: 10px 0 5px;
            opacity: 0.3;
            color: #b888b8;
        }
        .student-item {
            padding: 10px;
            border: 1px solid #c084c0;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .student-item:hover { background: #1a0a1a; }
        .student-item.active { background: #1a0a1a; border-color: #d4a0d4; }
        .student-item .name { font-size: 14px; color: #e8c8e8; }
        .student-item .dupla { font-size: 11px; opacity: 0.4; color: #b888b8; }
        .student-item .status {
            font-size: 9px;
            padding: 2px 10px;
            border-radius: 4px;
            letter-spacing: 1px;
            display: inline-block;
            margin-top: 4px;
        }
        .status.online { background: #66cc88; color: #1a0a1a; }
        .status.offline { background: #3a2a3a; color: #5a4a5a; }
        .status.finished { background: #cc6666; color: #1a0a1a; }
        .detail-item {
            padding: 6px 0;
            border-bottom: 1px solid #c084c0;
            opacity: 0.5;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            transition: opacity 0.3s;
        }
        .detail-item:hover { opacity: 1; }
        .detail-item .label { opacity: 0.5; color: #b888b8; }
        .detail-item .value { color: #d4a0d4; }
        .detail-item .correct { color: #66cc88; }
        .detail-item .wrong { color: #cc6666; }
        .detail-item .warning-text { color: #ff8844; }
        .no-data { text-align: center; opacity: 0.2; padding: 20px; font-size: 13px; letter-spacing: 2px; color: #b888b8; }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 10px 0;
        }
        .stats-grid .stat {
            background: #1a0a1a;
            padding: 10px;
            border: 1px solid #c084c0;
            border-radius: 8px;
            text-align: center;
        }
        .stats-grid .stat .number {
            font-size: 24px;
            letter-spacing: 2px;
            color: #e8c8e8;
        }
        .stats-grid .stat .label {
            font-size: 9px;
            opacity: 0.3;
            letter-spacing: 1px;
            margin-top: 3px;
            color: #b888b8;
        }
        .code-display {
            background: #1a0a1a;
            padding: 10px;
            border: 1px solid #c084c0;
            border-radius: 8px;
            text-align: center;
            font-size: 20px;
            letter-spacing: 6px;
            margin: 10px 0;
            color: #d4a0d4;
        }
        .badge {
            background: #cc6666;
            color: #1a0a1a;
            font-size: 9px;
            padding: 2px 8px;
            border-radius: 4px;
            margin-left: 5px;
        }
        .badge.warning { background: #ff8844; }
        .badge.success { background: #66cc88; }
        @media (max-width: 900px) {
            .main-grid { grid-template-columns: 1fr; height: auto; }
            .panel { max-height: 400px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Professor Heber Lemos
            <span class="sub">Sistema de Monitoramento de Provas</span>
        </h1>

        <!-- Login do Professor -->
        <div id="teacherLogin" class="login-panel">
            <h2>Acesso Restrito</h2>
            <div class="form-group">
                <label>Senha</label>
                <input type="password" id="teacherPassword" placeholder="Digite a senha">
            </div>
            <button class="btn-primary" id="teacherLoginBtn">Acessar</button>
            <div class="error-msg" id="teacherLoginError"></div>
        </div>

        <!-- Painel Principal -->
        <div id="mainPanel" style="display:none;">
            <div class="main-grid">
                <!-- Lista de Alunos -->
                <div class="panel">
                    <h2>Alunos Ativos</h2>
                    <div id="studentList">
                        <div class="no-data">Aguardando alunos...</div>
                    </div>
                </div>

                <!-- Detalhes do Aluno -->
                <div class="panel">
                    <h2>Detalhes do Aluno</h2>
                    <div id="studentDetails">
                        <div class="no-data">Selecione um aluno</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentStudentId = null;
        let isLoggedIn = false;

        const teacherLogin = document.getElementById('teacherLogin');
        const mainPanel = document.getElementById('mainPanel');
        const teacherPassword = document.getElementById('teacherPassword');
        const teacherLoginBtn = document.getElementById('teacherLoginBtn');
        const teacherLoginError = document.getElementById('teacherLoginError');
        const studentList = document.getElementById('studentList');
        const studentDetails = document.getElementById('studentDetails');

        const TEACHER_PASSWORD = "heber123456";

        // ===== LOGIN DO PROFESSOR =====
        teacherLoginBtn.onclick = () => {
            const pass = teacherPassword.value.trim();
            if(!pass) { teacherLoginError.textContent = 'Digite a senha'; return; }
            if(pass === TEACHER_PASSWORD) {
                isLoggedIn = true;
                teacherLogin.style.display = 'none';
                mainPanel.style.display = 'block';
                loadStudents();
            } else {
                teacherLoginError.textContent = 'Senha incorreta';
                teacherPassword.value = '';
                teacherPassword.focus();
            }
        };

        teacherPassword.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') teacherLoginBtn.click();
        });

        // ===== CARREGAR ALUNOS =====
        async function loadStudents() {
            if(!isLoggedIn) return;
            const res = await fetch('/api/students');
            const students = await res.json();
            renderStudents(students);
        }

        function renderStudents(students) {
            if(students.length === 0) {
                studentList.innerHTML = '<div class="no-data">Nenhum aluno conectado</div>';
                return;
            }

            studentList.innerHTML = students.map(s => \`
                <div class="student-item \${currentStudentId === s.id ? 'active' : ''}" 
                     onclick="selectStudent('\${s.id}')">
                    <div class="name">\${s.name}</div>
                    <div class="dupla">Dupla: \${s.dupla}</div>
                    <div>
                        <span class="status \${s.online ? 'online' : s.finished ? 'finished' : 'offline'}">
                            \${s.online ? 'Online' : s.finished ? 'Finalizado' : 'Offline'}
                        </span>
                        <span class="badge">\${s.totalTime || 0}s</span>
                        <span class="badge warning">\${(s.warnings || []).length} Alertas</span>
                    </div>
                </div>
            \`).join('');
        }

        // ===== SELECIONAR ALUNO =====
        async function selectStudent(studentId) {
            if(!isLoggedIn) return;
            currentStudentId = studentId;
            loadStudents();
            const res = await fetch('/api/students/' + studentId);
            const student = await res.json();
            renderStudentDetails(student);
        }

        function renderStudentDetails(student) {
            if(!student) {
                studentDetails.innerHTML = '<div class="no-data">Aluno nao encontrado</div>';
                return;
            }

            const totalAnswers = student.answers ? Object.keys(student.answers).length : 0;
            const correctAnswers = student.answers ? 
                Object.values(student.answers).filter(a => a.isCorrect).length : 0;

            let answersHtml = '';
            if(student.answers) {
                const sorted = Object.keys(student.answers).sort((a,b) => parseInt(a) - parseInt(b));
                answersHtml = sorted.map(qId => {
                    const ans = student.answers[qId];
                    const question = ${JSON.stringify(questions)}.find(q => q.id === parseInt(qId));
                    const isCorrect = ans && ans.isCorrect;
                    const isFast = ans && ans.timeSpent < 5;
                    
                    return \`
                        <div class="detail-item">
                            <span class="label">Q\${qId}</span>
                            <span>
                                <span class="\${isCorrect ? 'correct' : 'wrong'}">\${isCorrect ? '✓' : '✗'}</span>
                                \${ans ? ans.answer : '---'}
                                <span style="opacity:0.3;font-size:10px;">\${ans ? ans.timeSpent + 's' : '---'}</span>
                                \${isFast ? '<span class="badge warning" style="font-size:8px;">Rapido</span>' : ''}
                            </span>
                        </div>
                    \`;
                }).join('');
            }

            const warnings = student.warnings || [];
            const warningsHtml = warnings.length > 0 ? 
                warnings.map(w => \`
                    <div class="detail-item">
                        <span class="label">\${w.type}</span>
                        <span class="warning-text">\${new Date(w.timestamp).toLocaleTimeString()}</span>
                    </div>
                \`).join('') : 
                '<div class="no-data" style="font-size:11px;">Nenhum alerta</div>';

            studentDetails.innerHTML = \`
                <div style="margin-bottom:15px;">
                    <div style="font-size:20px;letter-spacing:2px;color:#e8c8e8;">\${student.name}</div>
                    <div style="font-size:12px;opacity:0.4;">Dupla: \${student.dupla}</div>
                    <div style="font-size:12px;opacity:0.4;">Login: \${new Date(student.loginTime).toLocaleString()}</div>
                    \${student.completionCode ? \`
                        <div class="code-display">\${student.completionCode}</div>
                    \` : ''}
                </div>

                <div class="stats-grid">
                    <div class="stat">
                        <div class="number">\${totalAnswers}/10</div>
                        <div class="label">Respondidas</div>
                    </div>
                    <div class="stat">
                        <div class="number" style="color:\${correctAnswers >= 7 ? '#66cc88' : '#ff8844'}">
                            \${correctAnswers}
                        </div>
                        <div class="label">Acertos</div>
                    </div>
                    <div class="stat">
                        <div class="number">\${student.totalTime || 0}s</div>
                        <div class="label">Tempo Total</div>
                    </div>
                    <div class="stat">
                        <div class="number" style="color:#ff8844;">\${warnings.length}</div>
                        <div class="label">Alertas</div>
                    </div>
                </div>

                <h3>Respostas</h3>
                \${answersHtml || '<div class="no-data">Aguardando respostas</div>'}

                <h3>Alertas</h3>
                \${warningsHtml}
            \`;
        }

        // ===== SOCKET EVENTS =====
        socket.on('new_student', (data) => {
            if(isLoggedIn) loadStudents();
        });

        socket.on('student_answer', (data) => {
            if(isLoggedIn) {
                if(currentStudentId === data.studentId) {
                    fetch('/api/students/' + data.studentId)
                        .then(r => r.json())
                        .then(s => renderStudentDetails(s));
                }
                loadStudents();
            }
        });

        socket.on('student_warning', (data) => {
            if(isLoggedIn) {
                if(currentStudentId === data.studentId) {
                    fetch('/api/students/' + data.studentId)
                        .then(r => r.json())
                        .then(s => renderStudentDetails(s));
                }
                loadStudents();
            }
        });

        socket.on('student_finished', (data) => {
            if(isLoggedIn) {
                if(currentStudentId === data.studentId) {
                    fetch('/api/students/' + data.studentId)
                        .then(r => r.json())
                        .then(s => renderStudentDetails(s));
                }
                loadStudents();
            }
        });

        socket.on('student_status_change', (data) => {
            if(isLoggedIn) loadStudents();
        });

        // ===== INICIALIZAR =====
        if(isLoggedIn) loadStudents();
    </script>
</body>
</html>`);
  }
});

// ========== API REST ==========
app.use(express.json());

// ===== ALUNOS =====

app.post('/api/students', (req, res) => {
  const { name, dupla } = req.body;
  if(!name || !dupla) return res.status(400).json({ error: 'Nome e dupla obrigatorios' });
  
  // Verifica se o aluno está cadastrado
  if(!REGISTERED_STUDENTS.has(name)) {
    return res.status(403).json({ error: 'Aluno nao cadastrado' });
  }

  // Verifica se já finalizou
  const nameUpper = name.toUpperCase();
  for(let [id, s] of students) {
    if(s.name === nameUpper && s.finished) {
      return res.status(403).json({ error: 'Prova ja finalizada', alreadyFinished: true });
    }
  }

  // Verifica se já existe um aluno com esse nome
  let existingStudent = null;
  for(let [id, s] of students) {
    if(s.name === nameUpper) {
      existingStudent = s;
      break;
    }
  }

  let studentId;
  let student;

  if(existingStudent) {
    if(existingStudent.finished) {
      return res.status(403).json({ error: 'Prova ja finalizada', alreadyFinished: true });
    }
    studentId = existingStudent.id;
    student = existingStudent;
  } else {
    studentId = uuidv4();
    student = {
      id: studentId,
      name: nameUpper,
      dupla: dupla.toUpperCase(),
      socketId: null,
      online: false,
      finished: false,
      loginTime: new Date(),
      totalTime: 0,
      answers: {},
      warnings: [],
      completionCode: null,
      copyCount: 0,
      pasteCount: 0
    };
    students.set(studentId, student);
    answers.set(studentId, {});
    sessions.set(studentId, { startTime: Date.now(), lastActivity: Date.now() });
    io.emit('new_student', { studentId, name: nameUpper, dupla: dupla.toUpperCase() });
  }

  res.status(201).json({ ...student, alreadyFinished: false });
});

app.get('/api/students', (req, res) => {
  const list = Array.from(students.values());
  res.json(list);
});

app.get('/api/students/:id', (req, res) => {
  const s = students.get(req.params.id);
  if(!s) return res.status(404).json({ error: 'Nao encontrado' });
  res.json(s);
});

app.delete('/api/students/:id', (req, res) => {
  const s = students.get(req.params.id);
  if(!s) return res.status(404).json({ error: 'Nao encontrado' });
  if(s.socketId) {
    const sock = io.sockets.sockets.get(s.socketId);
    if(sock) sock.disconnect();
  }
  students.delete(req.params.id);
  answers.delete(req.params.id);
  sessions.delete(req.params.id);
  res.json({ success: true });
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  let currentStudentId = null;

  // ===== LOGIN DO ALUNO =====
  socket.on('student_login', ({ name, dupla }) => {
    const nameUpper = name.toUpperCase();
    const duplaUpper = dupla.toUpperCase();

    // Verifica se aluno está cadastrado
    if(!REGISTERED_STUDENTS.has(nameUpper)) {
      socket.emit('login_error', { error: 'Aluno nao cadastrado' });
      return;
    }

    // Verifica se já finalizou
    let existingStudent = null;
    for(let [id, s] of students) {
      if(s.name === nameUpper) {
        existingStudent = s;
        break;
      }
    }

    if(existingStudent && existingStudent.finished) {
      socket.emit('already_finished');
      return;
    }

    let studentId;
    let student;

    if(existingStudent) {
      studentId = existingStudent.id;
      student = existingStudent;
    } else {
      // Cria novo aluno
      studentId = uuidv4();
      student = {
        id: studentId,
        name: nameUpper,
        dupla: duplaUpper,
        socketId: null,
        online: false,
        finished: false,
        loginTime: new Date(),
        totalTime: 0,
        answers: {},
        warnings: [],
        completionCode: null,
        copyCount: 0,
        pasteCount: 0
      };
      students.set(studentId, student);
      answers.set(studentId, {});
      sessions.set(studentId, { startTime: Date.now(), lastActivity: Date.now() });
      io.emit('new_student', { studentId, name: nameUpper, dupla: duplaUpper });
    }

    // Desconectar sessão anterior
    if(student.socketId) {
      const old = io.sockets.sockets.get(student.socketId);
      if(old) { old.emit('force_disconnect', { reason: 'Nova conexao' }); old.disconnect(); }
    }

    student.socketId = socket.id;
    student.online = true;
    student.loginTime = new Date();
    currentStudentId = studentId;

    const studentAnswers = answers.get(studentId) || {};

    io.emit('student_status_change', { studentId, online: true, name: student.name });
    socket.emit('login_success', {
      studentId,
      name: student.name,
      dupla: student.dupla,
      answers: studentAnswers
    });

    console.log('✅ ' + student.name + ' logou');
  });

  // ===== RESPOSTA =====
  socket.on('answer_submitted', (data) => {
    const { studentId, questionId, answer, timeSpent, isCorrect, questionNumber } = data;
    
    const student = students.get(studentId);
    if(!student || student.finished) return;

    const studentAnswers = answers.get(studentId) || {};
    studentAnswers[questionId] = {
      answer,
      timeSpent,
      isCorrect,
      timestamp: new Date().toISOString(),
      questionNumber
    };
    answers.set(studentId, studentAnswers);
    student.answers = studentAnswers;

    // Verifica resposta rápida
    if(timeSpent < 5) {
      student.warnings.push({
        type: 'Resposta muito rapida',
        timestamp: new Date().toISOString(),
        details: 'Questao ' + questionId + ' - ' + timeSpent + 's'
      });
      io.emit('student_warning', { studentId, warning: 'Resposta muito rapida' });
    }

    const session = sessions.get(studentId);
    if(session) {
      student.totalTime = Math.round((Date.now() - session.startTime) / 1000);
    }

    students.set(studentId, student);
    io.emit('student_answer', { studentId, questionId, answer, isCorrect });
    console.log('📝 ' + student.name + ' - Q' + questionId + ': ' + answer);
  });

  // ===== COPIA =====
  socket.on('copy_detected', ({ studentId, timestamp }) => {
    const student = students.get(studentId);
    if(student && !student.finished) {
      student.copyCount = (student.copyCount || 0) + 1;
      student.warnings.push({
        type: 'Copia detectada',
        timestamp: timestamp || new Date().toISOString(),
        count: student.copyCount
      });
      students.set(studentId, student);
      io.emit('student_warning', { studentId, warning: 'Copia detectada' });
      console.log('📋 ' + student.name + ' - Copia detectada');
    }
  });

  // ===== COLA =====
  socket.on('paste_detected', ({ studentId, timestamp }) => {
    const student = students.get(studentId);
    if(student && !student.finished) {
      student.pasteCount = (student.pasteCount || 0) + 1;
      student.warnings.push({
        type: 'Cola detectada',
        timestamp: timestamp || new Date().toISOString(),
        count: student.pasteCount
      });
      students.set(studentId, student);
      io.emit('student_warning', { studentId, warning: 'Cola detectada' });
      console.log('📄 ' + student.name + ' - Cola detectada');
    }
  });

  // ===== FINALIZAR =====
  socket.on('exam_finished', (data) => {
    const { studentId, answers: studentAnswers, totalTime, completionCode, studentName, studentDupla, correctCount } = data;
    
    const student = students.get(studentId);
    if(!student || student.finished) return;

    student.finished = true;
    student.online = false;
    student.completionCode = completionCode;
    student.totalTime = totalTime;
    student.answers = studentAnswers;

    const savedAnswers = {};
    Object.keys(studentAnswers).forEach(qId => {
      savedAnswers[qId] = studentAnswers[qId];
    });
    answers.set(studentId, savedAnswers);

    const warningsCount = student.warnings.length;

    students.set(studentId, student);
    
    io.emit('student_finished', { 
      studentId, 
      completionCode,
      correctCount,
      totalTime,
      warnings: warningsCount,
      name: studentName,
      dupla: studentDupla
    });

    console.log('✅ ' + student.name + ' finalizou - Codigo: ' + completionCode);
  });

  // ===== DESCONEXÃO =====
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if(currentStudentId) {
      const student = students.get(currentStudentId);
      if(student && !student.finished) {
        student.online = false;
        const session = sessions.get(currentStudentId);
        if(session) {
          student.totalTime = Math.round((Date.now() - session.startTime) / 1000);
        }
        students.set(currentStudentId, student);
        io.emit('student_status_change', { 
          studentId: currentStudentId, 
          online: false, 
          name: student.name 
        });
        console.log('❌ ' + student.name + ' desconectado');
      }
    }
  });
});

// ========== INICIAR SERVIDOR ==========
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n● SISTEMA PROFESSOR HEBER LEMOS ●');
  console.log('   Porta: ' + PORT);
  console.log('   Professor: http://localhost:' + PORT);
  console.log('   Aluno: http://localhost:' + PORT);
  console.log('\n● Acesso:');
  console.log('   Senha Professor: heber123456');
  console.log('   Alunos Cadastrados:');
  console.log('   - SILVERIO SANTOS MARTINS');
  console.log('   - LUCAS SANTOS MARTINS');
  console.log('\n   Para adicionar mais alunos, edite a constante');
  console.log('   REGISTERED_STUDENTS no arquivo server.js');
  console.log('\n● Funcionalidades:');
  console.log('   ✓ 10 questoes de matematica');
  console.log('   ✓ Uma questao por vez');
  console.log('   ✓ Botao Avancar');
  console.log('   ✓ Correcao automatica');
  console.log('   ✓ Deteccao de copia/cola');
  console.log('   ✓ Deteccao de respostas rapidas');
  console.log('   ✓ Codigo de finalizacao');
  console.log('   ✓ Bloqueio de reentrada\n');
});

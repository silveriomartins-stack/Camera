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
const students = new Map(); // studentId -> { id, name, dupla, socketId, loginTime, totalTime }
const answers = new Map(); // studentId -> { questionId, answer, timeSpent, isCorrect, timestamp }
const sessions = new Map(); // studentId -> { startTime, lastActivity, questionTimes }
const finishedStudents = new Map(); // studentId -> { completionCode, finalTime }

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
    <title>● PROVA MATEMÁTICA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff41;
            min-height: 100vh;
            padding: 10px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: #0d0d0d;
            border: 2px solid #00ff41;
            border-radius: 5px;
            padding: 20px;
            min-height: 95vh;
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #00ff41;
            margin-bottom: 20px;
        }
        .header h2 {
            font-weight: normal;
            letter-spacing: 3px;
            font-size: 18px;
        }
        .header .sub {
            font-size: 10px;
            opacity: 0.3;
            margin-top: 5px;
            letter-spacing: 2px;
        }
        .login-area {
            padding: 20px 0;
        }
        .login-area h3 {
            text-align: center;
            font-weight: normal;
            letter-spacing: 2px;
            opacity: 0.5;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .form-group { margin-bottom: 15px; }
        .form-group label {
            display: block;
            font-size: 11px;
            letter-spacing: 2px;
            opacity: 0.3;
            margin-bottom: 5px;
        }
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 3px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            outline: none;
        }
        .form-group input:focus {
            box-shadow: 0 0 20px rgba(0,255,65,0.05);
        }
        .login-btn {
            width: 100%;
            padding: 14px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        .login-btn:hover {
            background: #00cc33;
            box-shadow: 0 0 30px rgba(0,255,65,0.1);
        }
        .login-btn:disabled {
            background: #1a1a1a;
            color: #00ff41;
            opacity: 0.2;
            cursor: not-allowed;
        }
        .error-msg {
            color: #ff0044;
            text-align: center;
            margin-top: 10px;
            font-size: 12px;
        }
        .exam-area {
            display: none;
        }
        .question-block {
            background: #0d0d0d;
            border: 1px solid #00ff41;
            border-radius: 3px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .question-block .q-number {
            font-size: 11px;
            opacity: 0.3;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }
        .question-block .q-text {
            font-size: 15px;
            margin-bottom: 12px;
        }
        .question-block .options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .question-block .options button {
            padding: 10px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 3px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .question-block .options button:hover {
            background: #00ff41;
            color: #0a0a0a;
        }
        .question-block .options button.selected {
            background: #00ff41;
            color: #0a0a0a;
        }
        .question-block .options button.correct {
            background: #00ff41;
            color: #0a0a0a;
            border-color: #00ff41;
        }
        .question-block .options button.wrong {
            background: #ff0044;
            color: #0a0a0a;
            border-color: #ff0044;
        }
        .question-block .options button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #00ff41;
            margin-bottom: 15px;
            font-size: 11px;
            opacity: 0.4;
        }
        .progress {
            text-align: center;
            padding: 10px;
            font-size: 12px;
            opacity: 0.3;
            letter-spacing: 2px;
        }
        .finish-btn {
            width: 100%;
            padding: 14px;
            background: #ff0044;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 20px;
        }
        .finish-btn:hover {
            background: #cc0033;
            box-shadow: 0 0 30px rgba(255,0,68,0.1);
        }
        .finish-btn:disabled {
            background: #1a1a1a;
            color: #ff0044;
            opacity: 0.2;
            cursor: not-allowed;
        }
        .completion-area {
            display: none;
            text-align: center;
            padding: 30px 0;
        }
        .completion-area .code {
            font-size: 24px;
            letter-spacing: 5px;
            padding: 15px;
            background: #111;
            border: 2px solid #00ff41;
            border-radius: 3px;
            margin: 15px 0;
        }
        .completion-area .info {
            opacity: 0.3;
            font-size: 12px;
            letter-spacing: 2px;
            margin: 10px 0;
        }
        .warning {
            color: #ff0044;
            font-size: 11px;
            text-align: center;
            padding: 8px;
            background: #1a0a0a;
            border: 1px solid #ff0044;
            border-radius: 3px;
            margin: 5px 0;
            display: none;
        }
        .status-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-right: 6px;
        }
        .status-dot.online { background: #00ff41; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>● PROVA MATEMÁTICA ●</h2>
            <div class="sub">PROFESSOR HÉBER LEMOS</div>
        </div>

        <!-- Login -->
        <div id="loginArea" class="login-area">
            <h3>› IDENTIFICAÇÃO ‹</h3>
            <div class="form-group">
                <label>NOME COMPLETO</label>
                <input type="text" id="studentName" placeholder="SEU NOME">
            </div>
            <div class="form-group">
                <label>DUPLA</label>
                <input type="text" id="studentDupla" placeholder="NOME DA DUPLA">
            </div>
            <button class="login-btn" id="loginBtn">► INICIAR PROVA</button>
            <div class="error-msg" id="loginError"></div>
        </div>

        <!-- Prova -->
        <div id="examArea" class="exam-area">
            <div class="status-bar">
                <span id="timer">⏱ 00:00</span>
                <span id="studentInfo">● ALUNO</span>
            </div>
            <div id="warning" class="warning"></div>
            <div id="questionsContainer"></div>
            <div class="progress" id="progress">QUESTÃO 0/10</div>
            <button class="finish-btn" id="finishBtn">■ FINALIZAR PROVA</button>
        </div>

        <!-- Finalização -->
        <div id="completionArea" class="completion-area">
            <div style="font-size:28px;">●</div>
            <h3 style="font-weight:normal;letter-spacing:3px;margin:15px 0;">PROVA FINALIZADA</h3>
            <div class="info">CÓDIGO DE FINALIZAÇÃO</div>
            <div class="code" id="completionCode">XXXX-XXXX</div>
            <div class="info" id="completionStats"></div>
            <button class="login-btn" onclick="location.reload()" style="margin-top:20px;">► NOVA PROVA</button>
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
        let questionTimes = {};
        let startTime = null;
        let timerInterval = null;
        let elapsedSeconds = 0;
        let warningShown = false;
        let questionStartTime = null;
        let isFinished = false;

        // Elementos
        const loginArea = document.getElementById('loginArea');
        const examArea = document.getElementById('examArea');
        const completionArea = document.getElementById('completionArea');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');
        const questionsContainer = document.getElementById('questionsContainer');
        const progress = document.getElementById('progress');
        const timer = document.getElementById('timer');
        const studentInfo = document.getElementById('studentInfo');
        const finishBtn = document.getElementById('finishBtn');
        const warning = document.getElementById('warning');
        const completionCode = document.getElementById('completionCode');
        const completionStats = document.getElementById('completionStats');

        // ===== LOGIN =====
        loginBtn.onclick = () => {
            const name = document.getElementById('studentName').value.trim();
            const dupla = document.getElementById('studentDupla').value.trim();
            
            if(!name || !dupla) {
                loginError.textContent = 'ERROR: PREENCHA TODOS OS CAMPOS';
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = '● CONECTANDO...';
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
            studentInfo.textContent = '● ' + studentName + ' | ' + studentDupla;
            startTime = Date.now();
            startTimer();
            renderQuestions();
            socket.emit('student_ready', { studentId });
            loginBtn.disabled = false;
            loginBtn.textContent = '► INICIAR PROVA';
        });

        socket.on('login_error', (data) => {
            loginError.textContent = 'ERROR: ' + (data.error || 'ACESSO NEGADO');
            loginBtn.disabled = false;
            loginBtn.textContent = '► INICIAR PROVA';
        });

        // ===== TIMER =====
        function startTimer() {
            timerInterval = setInterval(() => {
                elapsedSeconds++;
                const minutes = Math.floor(elapsedSeconds / 60);
                const seconds = elapsedSeconds % 60;
                timer.textContent = '⏱ ' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }, 1000);
        }

        // ===== RENDER QUESTIONS =====
        function renderQuestions() {
            const questionsData = ${JSON.stringify(questions)};
            
            questionsContainer.innerHTML = questionsData.map((q, index) => \`
                <div class="question-block" id="q_\${q.id}">
                    <div class="q-number">QUESTÃO \${index + 1}/10</div>
                    <div class="q-text">\${q.question}</div>
                    <div class="options" id="options_\${q.id}">
                        \${q.options.map(opt => \`
                            <button onclick="selectAnswer(\${q.id}, '\${opt}', \${index + 1})" 
                                    id="opt_\${q.id}_\${opt}">
                                \${opt}
                            </button>
                        \`).join('')}
                    </div>
                </div>
            \`).join('');

            progress.textContent = 'QUESTÃO 0/10';
        }

        // ===== SELECT ANSWER =====
        function selectAnswer(questionId, answer, questionNumber) {
            if(isFinished) return;

            const now = Date.now();
            const timeSpent = questionStartTime ? (now - questionStartTime) / 1000 : 0;

            // Verificar tempo mínimo (5 segundos)
            if(timeSpent < 5 && questionStartTime) {
                showWarning('⚠️ RESPOSTA MUITO RÁPIDA! AGUARDE 5 SEGUNDOS');
                return;
            }

            // Armazenar resposta
            answers[questionId] = {
                answer: answer,
                timeSpent: Math.round(timeSpent),
                timestamp: new Date().toISOString()
            };

            // Atualizar visual
            const options = document.getElementById('options_' + questionId);
            if(options) {
                const buttons = options.querySelectorAll('button');
                buttons.forEach(btn => {
                    btn.disabled = true;
                    if(btn.textContent === answer) {
                        btn.classList.add('selected');
                    }
                });
            }

            // Verificar se é a resposta correta
            const question = ${JSON.stringify(questions)}.find(q => q.id === questionId);
            const isCorrect = question.answer === answer;

            // Enviar para o servidor
            socket.emit('answer_submitted', {
                studentId,
                questionId,
                answer,
                timeSpent: Math.round(timeSpent),
                isCorrect,
                questionNumber
            });

            // Atualizar progresso
            const answered = Object.keys(answers).length;
            progress.textContent = 'QUESTÃO ' + answered + '/10';

            // Próxima questão
            questionStartTime = null;
            checkCompletion();
        }

        // ===== CHECK COMPLETION =====
        function checkCompletion() {
            const answered = Object.keys(answers).length;
            if(answered === 10) {
                finishBtn.disabled = false;
                progress.textContent = '✅ PROVA COMPLETA! FINALIZE';
            }
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
                showWarning('⚠️ COPIA DETECTADA!');
            }
        });

        document.addEventListener('paste', (e) => {
            if(isLoggedIn && !isFinished) {
                socket.emit('paste_detected', { studentId, timestamp: new Date().toISOString() });
                showWarning('⚠️ COLA DETECTADA!');
            }
        });

        // ===== FINISH EXAM =====
        finishBtn.onclick = () => {
            if(Object.keys(answers).length < 10) {
                showWarning('⚠️ RESPONDA TODAS AS QUESTÕES!');
                return;
            }

            if(confirm('● FINALIZAR PROVA? ●')) {
                isFinished = true;
                finishBtn.disabled = true;
                clearInterval(timerInterval);

                const totalTime = Math.round(elapsedSeconds);
                const completionCode = generateCode();

                socket.emit('exam_finished', {
                    studentId,
                    answers,
                    totalTime,
                    completionCode,
                    studentName,
                    studentDupla
                });

                // Mostrar finalização
                examArea.style.display = 'none';
                completionArea.style.display = 'block';
                completionCode.textContent = completionCode;
                completionStats.textContent = 'TEMPO TOTAL: ' + formatTime(totalTime) + ' | ACERTOS: ' + 
                    Object.values(answers).filter(a => a.isCorrect).length + '/10';
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

        // ===== DETECTA INPUT RÁPIDO =====
        document.addEventListener('click', (e) => {
            if(isLoggedIn && !isFinished) {
                const target = e.target;
                if(target.tagName === 'BUTTON' && target.closest('.question-block')) {
                    questionStartTime = Date.now();
                }
            }
        });

        // ===== KEYBOARD SHORTCUTS =====
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' && isLoggedIn && !isFinished) {
                // Detecta tecla Enter em campos de resposta
            }
        });

        // ===== SOCKET EVENTS =====
        socket.on('force_disconnect', () => {
            alert('● CONEXÃO ENCERRADA');
            location.reload();
        });

        socket.on('connect', () => {
            console.log('● CONECTADO');
        });

        socket.on('disconnect', () => {
            console.log('● DESCONECTADO');
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
    <title>● PROF. HÉBER LEMOS</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff41;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            font-weight: normal;
            font-size: 22px;
            letter-spacing: 4px;
            text-align: center;
            margin-bottom: 25px;
            text-shadow: 0 0 30px rgba(0,255,65,0.05);
        }
        h1 .sub {
            font-size: 12px;
            opacity: 0.3;
            display: block;
            margin-top: 5px;
            letter-spacing: 2px;
        }
        .login-panel {
            max-width: 400px;
            margin: 0 auto 20px;
            background: #0d0d0d;
            border: 1px solid #00ff41;
            border-radius: 5px;
            padding: 20px;
        }
        .login-panel h2 {
            text-align: center;
            font-weight: normal;
            letter-spacing: 3px;
            opacity: 0.5;
            font-size: 14px;
            margin-bottom: 15px;
        }
        .form-group { margin-bottom: 12px; }
        .form-group label {
            display: block;
            font-size: 10px;
            letter-spacing: 2px;
            opacity: 0.3;
            margin-bottom: 3px;
        }
        .form-group input {
            width: 100%;
            padding: 10px 12px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 3px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            outline: none;
        }
        .btn-primary {
            width: 100%;
            padding: 10px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-primary:hover { background: #00cc33; }
        .error-msg {
            color: #ff0044;
            text-align: center;
            margin-top: 10px;
            font-size: 12px;
        }
        .main-grid {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 15px;
            height: calc(100vh - 200px);
        }
        .panel {
            background: #0d0d0d;
            border: 1px solid #00ff41;
            border-radius: 5px;
            padding: 15px;
            overflow-y: auto;
        }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-track { background: #0a0a0a; }
        .panel::-webkit-scrollbar-thumb { background: #00ff41; border-radius: 2px; }
        .panel h2 {
            font-weight: normal;
            font-size: 12px;
            letter-spacing: 3px;
            margin-bottom: 12px;
            opacity: 0.5;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 8px;
        }
        .panel h3 {
            font-weight: normal;
            font-size: 11px;
            letter-spacing: 2px;
            margin: 10px 0 5px;
            opacity: 0.3;
        }
        .student-item {
            padding: 10px;
            border: 1px solid #00ff41;
            border-radius: 3px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .student-item:hover { background: #111; }
        .student-item.active { background: #111; border-color: #00ff41; }
        .student-item .name { font-size: 14px; }
        .student-item .dupla { font-size: 10px; opacity: 0.3; }
        .student-item .status {
            font-size: 8px;
            padding: 2px 8px;
            border-radius: 2px;
            letter-spacing: 1px;
            display: inline-block;
            margin-top: 4px;
        }
        .status.online { background: #00ff41; color: #0a0a0a; }
        .status.offline { background: #1a1a1a; color: #333; }
        .status.finished { background: #ff0044; color: #0a0a0a; }
        .detail-item {
            padding: 6px 0;
            border-bottom: 1px solid #00ff41;
            opacity: 0.1;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
        }
        .detail-item:hover { opacity: 0.5; }
        .detail-item .label { opacity: 0.5; }
        .detail-item .value { color: #00ff41; }
        .detail-item .correct { color: #00ff41; }
        .detail-item .wrong { color: #ff0044; }
        .detail-item .warning-text { color: #ff8800; }
        .no-data { text-align: center; opacity: 0.15; padding: 20px; font-size: 12px; letter-spacing: 2px; }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 10px 0;
        }
        .stats-grid .stat {
            background: #0a0a0a;
            padding: 10px;
            border: 1px solid #00ff41;
            border-radius: 3px;
            text-align: center;
        }
        .stats-grid .stat .number {
            font-size: 22px;
            letter-spacing: 2px;
        }
        .stats-grid .stat .label {
            font-size: 8px;
            opacity: 0.3;
            letter-spacing: 1px;
            margin-top: 3px;
        }
        .code-display {
            background: #111;
            padding: 10px;
            border: 1px solid #00ff41;
            border-radius: 3px;
            text-align: center;
            font-size: 18px;
            letter-spacing: 4px;
            margin: 10px 0;
        }
        .badge {
            background: #ff0044;
            color: #0a0a0a;
            font-size: 8px;
            padding: 2px 6px;
            border-radius: 2px;
            margin-left: 5px;
        }
        .badge.warning { background: #ff8800; }
        .badge.success { background: #00ff41; }
        @media (max-width: 900px) {
            .main-grid { grid-template-columns: 1fr; height: auto; }
            .panel { max-height: 400px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>● PROF. HÉBER LEMOS ●
            <span class="sub">SISTEMA DE MONITORAMENTO DE PROVAS</span>
        </h1>

        <!-- Login do Professor -->
        <div id="teacherLogin" class="login-panel">
            <h2>● ACESSO RESTRITO ●</h2>
            <div class="form-group">
                <label>SENHA</label>
                <input type="password" id="teacherPassword" placeholder="ENTER PASSWORD">
            </div>
            <button class="btn-primary" id="teacherLoginBtn">► ACESSAR</button>
            <div class="error-msg" id="teacherLoginError"></div>
        </div>

        <!-- Painel Principal -->
        <div id="mainPanel" style="display:none;">
            <div class="main-grid">
                <!-- Lista de Alunos -->
                <div class="panel">
                    <h2>● ALUNOS ATIVOS</h2>
                    <div id="studentList">
                        <div class="no-data">AGUARDANDO ALUNOS...</div>
                    </div>
                </div>

                <!-- Detalhes do Aluno -->
                <div class="panel">
                    <h2>● DETALHES DO ALUNO</h2>
                    <div id="studentDetails">
                        <div class="no-data">SELECIONE UM ALUNO</div>
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

        const TEACHER_PASSWORD = "heber2024";

        // ===== LOGIN DO PROFESSOR =====
        teacherLoginBtn.onclick = () => {
            const pass = teacherPassword.value.trim();
            if(!pass) { teacherLoginError.textContent = 'ENTER PASSWORD'; return; }
            if(pass === TEACHER_PASSWORD) {
                isLoggedIn = true;
                teacherLogin.style.display = 'none';
                mainPanel.style.display = 'block';
                loadStudents();
            } else {
                teacherLoginError.textContent = '● ACCESS DENIED ●';
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
                studentList.innerHTML = '<div class="no-data">NENHUM ALUNO CONECTADO</div>';
                return;
            }

            studentList.innerHTML = students.map(s => \`
                <div class="student-item \${currentStudentId === s.id ? 'active' : ''}" 
                     onclick="selectStudent('\${s.id}')">
                    <div class="name">\${s.name}</div>
                    <div class="dupla">DUPLA: \${s.dupla}</div>
                    <div>
                        <span class="status \${s.online ? 'online' : s.finished ? 'finished' : 'offline'}">
                            \${s.online ? '● ONLINE' : s.finished ? '■ FINALIZADO' : '○ OFFLINE'}
                        </span>
                        <span class="badge">\${s.totalTime || '0'}s</span>
                        <span class="badge warning">\${s.warnings || 0} ⚠️</span>
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
                studentDetails.innerHTML = '<div class="no-data">ALUNO NÃO ENCONTRADO</div>';
                return;
            }

            const totalAnswers = student.answers ? Object.keys(student.answers).length : 0;
            const correctAnswers = student.answers ? 
                Object.values(student.answers).filter(a => a.isCorrect).length : 0;

            let answersHtml = '';
            if(student.answers) {
                const sorted = Object.keys(student.answers).sort();
                answersHtml = sorted.map(qId => {
                    const ans = student.answers[qId];
                    const question = ${JSON.stringify(questions)}.find(q => q.id === parseInt(qId));
                    const isCorrect = ans && ans.isCorrect;
                    const isFast = ans && ans.timeSpent < 5;
                    const isCopied = ans && ans.copied;
                    const isPasted = ans && ans.pasted;
                    
                    return \`
                        <div class="detail-item">
                            <span class="label">Q\${qId}</span>
                            <span>
                                <span class="\${isCorrect ? 'correct' : 'wrong'}">\${isCorrect ? '✓' : '✗'}</span>
                                \${ans ? ans.answer : '—'}
                                <span style="opacity:0.3;font-size:9px;">\${ans ? ans.timeSpent + 's' : '—'}</span>
                                \${isFast ? '<span class="badge warning" style="font-size:7px;">⚡</span>' : ''}
                                \${isCopied ? '<span class="badge warning" style="font-size:7px;">📋</span>' : ''}
                                \${isPasted ? '<span class="badge warning" style="font-size:7px;">📄</span>' : ''}
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
                '<div class="no-data" style="font-size:10px;">NENHUM ALERTA</div>';

            studentDetails.innerHTML = \`
                <div style="margin-bottom:15px;">
                    <div style="font-size:18px;letter-spacing:2px;">\${student.name}</div>
                    <div style="font-size:11px;opacity:0.3;">DUPLA: \${student.dupla}</div>
                    <div style="font-size:11px;opacity:0.3;">LOGIN: \${new Date(student.loginTime).toLocaleString()}</div>
                    \${student.completionCode ? \`
                        <div class="code-display">● \${student.completionCode} ●</div>
                    \` : ''}
                </div>

                <div class="stats-grid">
                    <div class="stat">
                        <div class="number">\${totalAnswers}/10</div>
                        <div class="label">QUESTÕES RESPONDIDAS</div>
                    </div>
                    <div class="stat">
                        <div class="number" style="color:\${correctAnswers >= 7 ? '#00ff41' : '#ff8800'}">
                            \${correctAnswers}
                        </div>
                        <div class="label">ACERTOS</div>
                    </div>
                    <div class="stat">
                        <div class="number">\${student.totalTime || 0}s</div>
                        <div class="label">TEMPO TOTAL</div>
                    </div>
                    <div class="stat">
                        <div class="number" style="color:#ff8800;">\${warnings.length}</div>
                        <div class="label">ALERTAS</div>
                    </div>
                </div>

                <h3>● RESPOSTAS</h3>
                \${answersHtml || '<div class="no-data">AGUARDANDO RESPOSTAS</div>'}

                <h3>● ALERTAS</h3>
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
  if(!name || !dupla) return res.status(400).json({ error: 'Name and dupla required' });
  
  const id = uuidv4();
  const newStudent = {
    id,
    name,
    dupla,
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
  
  students.set(id, newStudent);
  answers.set(id, {});
  sessions.set(id, { startTime: Date.now(), lastActivity: Date.now() });
  
  io.emit('new_student', { studentId: id, name, dupla });
  res.status(201).json(newStudent);
});

app.get('/api/students', (req, res) => {
  const list = Array.from(students.values());
  res.json(list);
});

app.get('/api/students/:id', (req, res) => {
  const s = students.get(req.params.id);
  if(!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

app.delete('/api/students/:id', (req, res) => {
  const s = students.get(req.params.id);
  if(!s) return res.status(404).json({ error: 'Not found' });
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
  console.log('● CLIENTE CONECTADO:', socket.id);
  let currentStudentId = null;

  // ===== LOGIN DO ALUNO =====
  socket.on('student_login', ({ name, dupla }) => {
    // Verifica se já existe aluno com esse nome
    let existingStudent = null;
    for(let [id, s] of students) {
      if(s.name === name && s.dupla === dupla) {
        existingStudent = s;
        break;
      }
    }

    let studentId;
    let student;

    if(existingStudent) {
      studentId = existingStudent.id;
      student = existingStudent;
      
      // Se já finalizou, não pode refazer
      if(student.finished) {
        socket.emit('login_error', { error: 'PROVA JÁ FINALIZADA' });
        return;
      }
    } else {
      // Cria novo aluno
      studentId = uuidv4();
      student = {
        id: studentId,
        name,
        dupla,
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
      io.emit('new_student', { studentId, name, dupla });
    }

    // Desconectar sessão anterior
    if(student.socketId) {
      const old = io.sockets.sockets.get(student.socketId);
      if(old) { old.emit('force_disconnect', { reason: 'Nova conexão' }); old.disconnect(); }
    }

    student.socketId = socket.id;
    student.online = true;
    student.loginTime = new Date();
    currentStudentId = studentId;

    // Carregar respostas anteriores
    const studentAnswers = answers.get(studentId) || {};

    io.emit('student_status_change', { studentId, online: true, name: student.name });
    socket.emit('login_success', {
      studentId,
      name: student.name,
      dupla: student.dupla,
      answers: studentAnswers
    });

    console.log('✅ ' + student.name + ' (DUPLA: ' + student.dupla + ') LOGOU');
  });

  // ===== ALUNO PRONTO =====
  socket.on('student_ready', ({ studentId }) => {
    const session = sessions.get(studentId);
    if(session) {
      session.lastActivity = Date.now();
    }
  });

  // ===== RESPOSTA =====
  socket.on('answer_submitted', (data) => {
    const { studentId, questionId, answer, timeSpent, isCorrect, questionNumber } = data;
    
    const student = students.get(studentId);
    if(!student || student.finished) return;

    // Salvar resposta
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

    // Verificar se é uma resposta muito rápida
    if(timeSpent < 5) {
      student.warnings.push({
        type: 'RESPOSTA MUITO RÁPIDA',
        timestamp: new Date().toISOString(),
        details: `Questão ${questionId} - ${timeSpent}s`
      });
      io.emit('student_warning', { studentId, warning: 'RESPOSTA MUITO RÁPIDA' });
    }

    // Atualizar total de tempo
    const session = sessions.get(studentId);
    if(session) {
      student.totalTime = Math.round((Date.now() - session.startTime) / 1000);
    }

    students.set(studentId, student);
    io.emit('student_answer', { studentId, questionId, answer, isCorrect });
    console.log('📝 ' + student.name + ' - Q' + questionId + ': ' + answer + ' (' + (isCorrect ? '✓' : '✗') + ')');
  });

  // ===== COPIA DETECTADA =====
  socket.on('copy_detected', ({ studentId, timestamp }) => {
    const student = students.get(studentId);
    if(student && !student.finished) {
      student.copyCount = (student.copyCount || 0) + 1;
      student.warnings.push({
        type: 'COPIA DETECTADA',
        timestamp: timestamp || new Date().toISOString(),
        count: student.copyCount
      });
      students.set(studentId, student);
      io.emit('student_warning', { studentId, warning: 'COPIA DETECTADA' });
      console.log('📋 ' + student.name + ' - COPIA DETECTADA (#' + student.copyCount + ')');
    }
  });

  // ===== COLA DETECTADA =====
  socket.on('paste_detected', ({ studentId, timestamp }) => {
    const student = students.get(studentId);
    if(student && !student.finished) {
      student.pasteCount = (student.pasteCount || 0) + 1;
      student.warnings.push({
        type: 'COLA DETECTADA',
        timestamp: timestamp || new Date().toISOString(),
        count: student.pasteCount
      });
      students.set(studentId, student);
      io.emit('student_warning', { studentId, warning: 'COLA DETECTADA' });
      console.log('📄 ' + student.name + ' - COLA DETECTADA (#' + student.pasteCount + ')');
    }
  });

  // ===== FINALIZAR PROVA =====
  socket.on('exam_finished', (data) => {
    const { studentId, answers: studentAnswers, totalTime, completionCode, studentName, studentDupla } = data;
    
    const student = students.get(studentId);
    if(!student || student.finished) return;

    student.finished = true;
    student.online = false;
    student.completionCode = completionCode;
    student.totalTime = totalTime;
    student.answers = studentAnswers;

    // Salvar respostas
    const savedAnswers = {};
    Object.keys(studentAnswers).forEach(qId => {
      savedAnswers[qId] = studentAnswers[qId];
    });
    answers.set(studentId, savedAnswers);

    // Gerar estatísticas
    const correctCount = Object.values(studentAnswers).filter(a => a.isCorrect).length;
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

    console.log('✅ ' + student.name + ' FINALIZOU - CÓDIGO: ' + completionCode);
  });

  // ===== DESCONEXÃO =====
  socket.on('disconnect', () => {
    console.log('● CLIENTE DESCONECTADO:', socket.id);
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
        console.log('❌ ' + student.name + ' DESCONECTADO');
      }
    }
  });
});

// ========== INICIAR SERVIDOR ==========
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n● SISTEMA PROF. HÉBER LEMOS ●');
  console.log('   PORT: ' + PORT);
  console.log('   PROFESSOR: http://localhost:' + PORT);
  console.log('   ALUNO: http://localhost:' + PORT);
  console.log('\n● ACESSO:');
  console.log('   SENHA PROFESSOR: heber2024');
  console.log('   SENHA ALUNO: (nenhuma)');
  console.log('\n● FUNCIONALIDADES:');
  console.log('   ✓ 10 QUESTÕES DE MATEMÁTICA');
  console.log('   ✓ CORREÇÃO AUTOMÁTICA');
  console.log('   ✓ DETECÇÃO DE CÓPIA/COLA');
  console.log('   ✓ DETECÇÃO DE RESPOSTAS RÁPIDAS');
  console.log('   ✓ MONITORAMENTO EM TEMPO REAL');
  console.log('   ✓ CÓDIGO DE FINALIZAÇÃO');
  console.log('   ✓ HISTÓRICO COMPLETO\n');
});

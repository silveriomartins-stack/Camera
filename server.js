const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// ========== ARMAZENAMENTO PERSISTENTE ==========
const DATA_FILE = './data.json';

let students = new Map();
let answers = new Map();
let sessions = new Map();

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      students = new Map(Object.entries(data.students || {}));
      answers = new Map(Object.entries(data.answers || {}));
      sessions = new Map(Object.entries(data.sessions || {}));
      console.log('📂 Dados carregados com sucesso!');
    }
  } catch (e) {
    console.log('⚠️ Nenhum dado salvo encontrado');
  }
}

function saveData() {
  try {
    const data = {
      students: Object.fromEntries(students),
      answers: Object.fromEntries(answers),
      sessions: Object.fromEntries(sessions)
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Dados salvos com sucesso!');
  } catch (e) {
    console.log('❌ Erro ao salvar dados:', e);
  }
}

loadData();
setInterval(saveData, 30000);

// ============================================================
// >>>>>>>>>> CADASTRE AS DUPLAS AQUI >>>>>>>>>>>>>>>>>>>>>>>>>
// ============================================================
const DUPLAS = [
  {
    id: 'dupla1',
    nome: 'Dupla 1',
    alunos: ['SILVERIO SANTOS MARTINS', 'LUCAS SANTOS MARTINS']
  },
  {
    id: 'dupla2',
    nome: 'Dupla 2',
    alunos: ['MARIA JOSE SILVA', 'JOAO PEDRO SOUZA']
  },
  {
    id: 'dupla3',
    nome: 'Dupla 3',
    alunos: ['ANA BEATRIZ COSTA', 'CARLOS EDUARDO LIMA']
  },
  {
    id: 'dupla4',
    nome: 'Dupla 4',
    alunos: ['FERNANDA OLIVEIRA', 'ROBERTO ALMEIDA']
  }
];
// ============================================================

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

// ========== FUNÇÕES AUXILIARES ==========
function normalizeText(text) {
  return text.trim().toUpperCase();
}

function getDuplaByAluno(nome) {
  const nomeNormalizado = normalizeText(nome);
  for (const dupla of DUPLAS) {
    for (const aluno of dupla.alunos) {
      if (normalizeText(aluno) === nomeNormalizado) {
        return dupla;
      }
    }
  }
  return null;
}

// ========== ROTAS ==========

app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');

  // ========== PÁGINA DO CELULAR (ALUNO) ==========
  if (isMobile) {
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
            background: linear-gradient(135deg, #1a0a1a 0%, #2d1a2d 50%, #1a0a1a 100%);
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
            background: rgba(26, 10, 26, 0.95);
            border: 2px solid #c084c0;
            border-radius: 20px;
            padding: 30px 25px;
            min-height: 90vh;
            box-shadow: 0 0 60px rgba(192, 132, 192, 0.1);
            animation: fadeIn 0.6s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(192, 132, 192, 0.1); }
            50% { box-shadow: 0 0 40px rgba(192, 132, 192, 0.2); }
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(192, 132, 192, 0.3);
            margin-bottom: 25px;
        }
        .header h1 {
            font-weight: 300;
            letter-spacing: 3px;
            font-size: 24px;
            color: #e8c8e8;
        }
        .header .sub {
            font-size: 13px;
            opacity: 0.5;
            margin-top: 5px;
            letter-spacing: 2px;
            color: #b888b8;
        }
        .header .decor {
            width: 60px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #c084c0, transparent);
            margin: 10px auto 0;
        }
        .login-area { padding: 10px 0; }
        .login-area h2 {
            text-align: center;
            font-weight: 300;
            letter-spacing: 2px;
            opacity: 0.6;
            margin-bottom: 25px;
            font-size: 16px;
            color: #d4a0d4;
        }
        .form-group { margin-bottom: 18px; }
        .form-group label {
            display: block;
            font-size: 12px;
            letter-spacing: 1.5px;
            opacity: 0.5;
            margin-bottom: 6px;
            color: #c084c0;
        }
        .form-group input {
            width: 100%;
            padding: 14px 18px;
            background: rgba(18, 10, 18, 0.8);
            border: 1px solid rgba(192, 132, 192, 0.3);
            border-radius: 12px;
            color: #e8c8e8;
            font-size: 15px;
            outline: none;
            transition: all 0.4s;
        }
        .form-group input:focus {
            border-color: #c084c0;
            box-shadow: 0 0 30px rgba(192, 132, 192, 0.1);
        }
        .login-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #c084c0, #a060a0);
            color: #1a0a1a;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.4s;
            margin-top: 10px;
        }
        .login-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(192, 132, 192, 0.3); }
        .login-btn:disabled { background: #3a2a3a; color: #5a4a5a; cursor: not-allowed; }
        .error-msg { color: #ff6666; text-align: center; margin-top: 12px; font-size: 13px; }
        .exam-area { display: none; }
        .question-container {
            background: rgba(18, 10, 18, 0.8);
            border: 1px solid rgba(192, 132, 192, 0.3);
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 15px;
        }
        .question-number {
            font-size: 12px;
            opacity: 0.4;
            letter-spacing: 2px;
            margin-bottom: 12px;
            color: #b888b8;
        }
        .question-text {
            font-size: 19px;
            margin-bottom: 22px;
            color: #e8c8e8;
            line-height: 1.6;
            font-weight: 300;
        }
        .options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .options button {
            padding: 14px;
            background: rgba(26, 10, 26, 0.8);
            border: 2px solid rgba(192, 132, 192, 0.3);
            border-radius: 10px;
            color: #d4a0d4;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .options button:hover:not(:disabled) {
            background: rgba(42, 26, 42, 0.8);
            border-color: #d4a0d4;
        }
        .options button.selected {
            background: #c084c0;
            color: #1a0a1a;
            border-color: #c084c0;
            transform: scale(1.02);
        }
        .options button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(192, 132, 192, 0.2);
            margin-bottom: 18px;
            font-size: 12px;
            opacity: 0.5;
            color: #b888b8;
        }
        .status-bar .timer { font-weight: 600; color: #d4a0d4; }
        .progress {
            text-align: center;
            padding: 12px;
            font-size: 13px;
            opacity: 0.4;
            letter-spacing: 2px;
            color: #b888b8;
        }
        .nav-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #c084c0, #a060a0);
            color: #1a0a1a;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.4s;
            margin-top: 10px;
        }
        .nav-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(192, 132, 192, 0.3); }
        .nav-btn:disabled { background: #3a2a3a; color: #5a4a5a; cursor: not-allowed; }
        .finish-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #cc6666, #aa4444);
            color: #1a0a1a;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.4s;
            margin-top: 15px;
            display: none;
        }
        .finish-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(204, 102, 102, 0.3); }
        .completion-area {
            display: none;
            text-align: center;
            padding: 30px 0;
        }
        .completion-area .icon { font-size: 56px; color: #c084c0; margin-bottom: 15px; }
        .completion-area h2 { font-weight: 300; letter-spacing: 3px; color: #e8c8e8; margin-bottom: 10px; }
        .completion-area .code {
            font-size: 28px;
            letter-spacing: 6px;
            padding: 18px;
            background: rgba(18, 10, 18, 0.8);
            border: 2px solid #c084c0;
            border-radius: 12px;
            margin: 15px 0;
            color: #d4a0d4;
            animation: glow 2s infinite;
        }
        .completion-area .info { opacity: 0.4; font-size: 13px; letter-spacing: 1px; margin: 8px 0; color: #b888b8; }
        .completion-area .score { font-size: 38px; color: #c084c0; margin: 15px 0; }
        .warning {
            color: #ff6666;
            font-size: 12px;
            text-align: center;
            padding: 10px;
            background: rgba(26, 10, 10, 0.8);
            border: 1px solid #ff6666;
            border-radius: 8px;
            margin: 8px 0;
            display: none;
        }
        .blocked-msg { text-align: center; padding: 40px 0; color: #ff6666; }
        .blocked-msg h2 { font-weight: 300; letter-spacing: 2px; margin-bottom: 10px; }
        .dupla-info { font-size: 13px; opacity: 0.3; letter-spacing: 1px; color: #b888b8; margin-top: 3px; }
        .view-result-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #6688cc, #4466aa);
            color: #1a0a1a;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.4s;
            margin-top: 15px;
        }
        .view-result-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(102, 136, 204, 0.3); }
        .result-area { display: none; }
        .result-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(192, 132, 192, 0.1);
            font-size: 14px;
        }
        .result-item .correct { color: #66cc88; }
        .result-item .wrong { color: #cc6666; }
        .result-item .time { opacity: 0.3; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Prova Matemática</h1>
            <div class="sub">Professor Heber Lemos</div>
            <div class="decor"></div>
        </div>

        <div id="loginArea" class="login-area">
            <h2>Identificação</h2>
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="studentName" placeholder="Digite seu nome completo">
            </div>
            <div class="form-group">
                <label>Dupla</label>
                <input type="text" id="studentDupla" placeholder="Ex: Dupla 1, Dupla 2">
            </div>
            <button class="login-btn" id="loginBtn">Iniciar Prova</button>
            <div class="error-msg" id="loginError"></div>
        </div>

        <div id="examArea" class="exam-area">
            <div class="status-bar">
                <span class="timer" id="timer">00:00</span>
                <span id="studentInfo">Aluno</span>
            </div>
            <div id="warning" class="warning"></div>
            <div id="questionContainer"></div>
            <div class="progress" id="progress">Questão 0 de 10</div>
            <button class="nav-btn" id="nextBtn">Avançar</button>
            <button class="finish-btn" id="finishBtn">Finalizar Prova</button>
        </div>

        <div id="completionArea" class="completion-area">
            <div class="icon">✦</div>
            <h2>Prova Finalizada</h2>
            <div class="score" id="scoreDisplay">0/10</div>
            <div class="info">Código de Finalização</div>
            <div class="code" id="completionCode">XXXX-XXXX</div>
            <div class="info" id="completionStats"></div>
            <div class="dupla-info" id="completionDupla"></div>
            <button class="view-result-btn" id="viewResultBtn">Ver Respostas</button>
            <button class="login-btn" onclick="location.reload()" style="margin-top:10px;">Nova Prova</button>
        </div>

        <div id="resultArea" class="result-area">
            <h2 style="text-align:center;font-weight:300;letter-spacing:2px;margin-bottom:15px;">Suas Respostas</h2>
            <div id="resultList"></div>
            <button class="login-btn" onclick="location.reload()" style="margin-top:15px;">Voltar</button>
        </div>

        <div id="blockedArea" class="blocked-msg" style="display:none;">
            <h2>Acesso Bloqueado</h2>
            <p>Esta prova já foi finalizada.</p>
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
        let questionsData = ${JSON.stringify(questions)};

        const loginArea = document.getElementById('loginArea');
        const examArea = document.getElementById('examArea');
        const completionArea = document.getElementById('completionArea');
        const resultArea = document.getElementById('resultArea');
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
        const completionDupla = document.getElementById('completionDupla');
        const resultList = document.getElementById('resultList');
        const viewResultBtn = document.getElementById('viewResultBtn');

        // ===== LOGIN =====
        loginBtn.onclick = () => {
            const name = document.getElementById('studentName').value.trim();
            const dupla = document.getElementById('studentDupla').value.trim();
            
            if(!name || !dupla) {
                loginError.textContent = 'Preencha todos os campos';
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
            
            if(data.alreadyFinished) {
                loginArea.style.display = 'none';
                completionArea.style.display = 'block';
                completionCode.textContent = data.completionCode || 'XXXX-XXXX';
                scoreDisplay.textContent = data.correctCount + '/10';
                completionStats.textContent = 'Tempo total: ' + formatTime(data.totalTime || 0);
                completionDupla.textContent = 'Dupla: ' + data.dupla;
                viewResultBtn.style.display = 'block';
                window.savedAnswers = data.allAnswers || {};
                loginBtn.disabled = false;
                loginBtn.textContent = 'Iniciar Prova';
                return;
            }

            loginArea.style.display = 'none';
            examArea.style.display = 'block';
            studentInfo.textContent = data.name + ' | ' + data.dupla;
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
            completionArea.style.display = 'block';
            viewResultBtn.style.display = 'block';
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
            if(index >= questionsData.length) {
                finishBtn.style.display = 'block';
                nextBtn.style.display = 'none';
                progress.textContent = 'Prova Completa! Finalize';
                return;
            }

            const q = questionsData[index];
            selectedAnswer = null;
            questionStartTime = Date.now();

            const savedAnswer = answers[q.id] ? answers[q.id].answer : null;

            questionContainer.innerHTML = \`
                <div class="question-container">
                    <div class="question-number">Questão \${index + 1} de 10</div>
                    <div class="question-text">\${q.question}</div>
                    <div class="options" id="optionsContainer">
                        \${q.options.map(opt => \`
                            <button onclick="selectAnswer('\${opt}', \${q.id}, \${index})" 
                                    id="opt_\${q.id}_\${opt.replace(/[^a-zA-Z0-9]/g, '_')}"
                                    class="\${savedAnswer === opt ? 'selected' : ''}"
                                    \${savedAnswer ? 'disabled' : ''}>
                                \${opt}
                            </button>
                        \`).join('')}
                    </div>
                </div>
            \`;

            progress.textContent = 'Questão ' + (index + 1) + ' de 10';
            finishBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            nextBtn.disabled = savedAnswer ? false : true;

            if(savedAnswer) {
                selectedAnswer = savedAnswer;
            }
        }

        // ===== SELECT ANSWER =====
        function selectAnswer(answer, questionId, index) {
            const timeSpent = (Date.now() - questionStartTime) / 1000;
            
            if(timeSpent < 5) {
                showWarning('Aguarde 5 segundos para responder');
                return;
            }

            selectedAnswer = answer;
            
            const container = document.getElementById('optionsContainer');
            if(container) {
                const buttons = container.querySelectorAll('button');
                buttons.forEach(btn => {
                    btn.disabled = true;
                    btn.classList.remove('selected');
                    if(btn.textContent === answer) {
                        btn.classList.add('selected');
                    }
                });
            }

            answers[questionId] = {
                answer: answer,
                timeSpent: Math.round(timeSpent)
            };

            nextBtn.disabled = false;

            const q = questionsData.find(q => q.id === questionId);
            const isCorrect = q.answer === answer;

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
            if(currentQuestion >= questionsData.length) {
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
            const totalQuestions = questionsData.length;
            const answered = Object.keys(answers).length;

            if(answered < totalQuestions) {
                showWarning('Responda todas as questões antes de finalizar');
                return;
            }

            if(confirm('Finalizar prova?')) {
                isFinished = true;
                finishBtn.disabled = true;
                nextBtn.disabled = true;
                clearInterval(timerInterval);

                const totalTime = Math.round(elapsedSeconds);
                const completionCode = generateCode();

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

                examArea.style.display = 'none';
                completionArea.style.display = 'block';
                completionCode.textContent = completionCode;
                scoreDisplay.textContent = correctCount + '/10';
                completionStats.textContent = 'Tempo total: ' + formatTime(totalTime);
                completionDupla.textContent = 'Dupla: ' + studentDupla;
                viewResultBtn.style.display = 'block';
                window.savedAnswers = answers;
            }
        };

        // ===== VIEW RESULTS =====
        viewResultBtn.onclick = () => {
            const savedAnswers = window.savedAnswers || {};
            const totalQuestions = questionsData.length;
            
            let html = '';
            for(let i = 0; i < totalQuestions; i++) {
                const q = questionsData[i];
                const ans = savedAnswers[q.id];
                const isCorrect = ans && ans.answer === q.answer;
                const status = isCorrect ? '✓' : '✗';
                const statusClass = isCorrect ? 'correct' : 'wrong';
                
                html += \`
                    <div class="result-item">
                        <span>Q\${i+1}: \${q.question.substring(0, 30)}\${q.question.length > 30 ? '...' : ''}</span>
                        <span>
                            <span class="\${statusClass}">\${status}</span>
                            \${ans ? ans.answer : '—'}
                            <span class="time">\${ans ? ans.timeSpent + 's' : '—'}</span>
                        </span>
                    </div>
                \`;
            }
            
            resultList.innerHTML = html;
            completionArea.style.display = 'none';
            resultArea.style.display = 'block';
        };

        // ===== UTILITIES =====
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

        function showWarning(msg) {
            warning.textContent = msg;
            warning.style.display = 'block';
            setTimeout(() => {
                warning.style.display = 'none';
            }, 3000);
        }

        // ===== COPY/PASTE DETECTION =====
        document.addEventListener('copy', () => {
            if(isLoggedIn && !isFinished) {
                socket.emit('copy_detected', { studentId });
                showWarning('Copiar não permitido');
            }
        });

        document.addEventListener('paste', () => {
            if(isLoggedIn && !isFinished) {
                socket.emit('paste_detected', { studentId });
                showWarning('Colar não permitido');
            }
        });

        socket.on('force_disconnect', () => {
            alert('Conexão encerrada');
            location.reload();
        });
    </script>
</body>
</html>`);
  } else {
    // ========== PÁGINA DO PC (PROFESSOR + ALUNO) ==========
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
            background: linear-gradient(135deg, #1a0a1a 0%, #2d1a2d 50%, #1a0a1a 100%);
            color: #d4a0d4;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header-main {
            text-align: center;
            padding: 15px 0 25px;
        }
        .header-main h1 {
            font-weight: 300;
            font-size: 26px;
            letter-spacing: 4px;
            color: #e8c8e8;
        }
        .header-main .sub {
            font-size: 13px;
            opacity: 0.4;
            display: block;
            margin-top: 5px;
            letter-spacing: 2px;
            color: #b888b8;
        }
        .header-main .decor {
            width: 80px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #c084c0, transparent);
            margin: 10px auto 0;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .login-panel {
            max-width: 500px;
            margin: 0 auto 20px;
            background: rgba(18, 10, 18, 0.9);
            border: 1px solid rgba(192, 132, 192, 0.3);
            border-radius: 16px;
            padding: 25px 30px;
        }
        .login-panel h2 {
            text-align: center;
            font-weight: 300;
            letter-spacing: 3px;
            opacity: 0.5;
            font-size: 15px;
            margin-bottom: 15px;
            color: #d4a0d4;
        }
        .form-group { margin-bottom: 12px; }
        .form-group label {
            display: block;
            font-size: 11px;
            letter-spacing: 1.5px;
            opacity: 0.4;
            margin-bottom: 4px;
            color: #c084c0;
        }
        .form-group input {
            width: 100%;
            padding: 10px 14px;
            background: rgba(26, 10, 26, 0.8);
            border: 1px solid rgba(192, 132, 192, 0.3);
            border-radius: 10px;
            color: #e8c8e8;
            font-size: 14px;
            outline: none;
            transition: all 0.4s;
        }
        .form-group input:focus {
            border-color: #c084c0;
            box-shadow: 0 0 30px rgba(192, 132, 192, 0.1);
        }
        .btn-primary {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #c084c0, #a060a0);
            color: #1a0a1a;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.4s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(192, 132, 192, 0.25); }
        .btn-aluno {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #6688cc, #4466aa);
            color: #1a0a1a;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.4s;
            margin-top: 8px;
        }
        .btn-aluno:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(102, 136, 204, 0.25); }
        .btn-aluno:disabled { background: #3a2a3a; color: #5a4a5a; cursor: not-allowed; }
        .error-msg { color: #ff6666; text-align: center; margin-top: 10px; font-size: 12px; }
        .main-grid {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 20px;
            height: calc(100vh - 340px);
        }
        .panel {
            background: rgba(18, 10, 18, 0.9);
            border: 1px solid rgba(192, 132, 192, 0.2);
            border-radius: 16px;
            padding: 18px;
            overflow-y: auto;
        }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-track { background: rgba(26, 10, 26, 0.5); border-radius: 2px; }
        .panel::-webkit-scrollbar-thumb { background: #c084c0; border-radius: 2px; }
        .panel h2 {
            font-weight: 300;
            font-size: 13px;
            letter-spacing: 3px;
            margin-bottom: 12px;
            opacity: 0.5;
            border-bottom: 1px solid rgba(192, 132, 192, 0.15);
            padding-bottom: 8px;
            color: #d4a0d4;
        }
        .panel h3 {
            font-weight: 300;
            font-size: 11px;
            letter-spacing: 2px;
            margin: 10px 0 5px;
            opacity: 0.3;
            color: #b888b8;
        }
        .student-item {
            padding: 10px 12px;
            border: 1px solid rgba(192, 132, 192, 0.2);
            border-radius: 10px;
            margin-bottom: 6px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .student-item:hover { background: rgba(26, 10, 26, 0.8); border-color: rgba(192, 132, 192, 0.4); }
        .student-item.active { background: rgba(26, 10, 26, 0.9); border-color: #c084c0; }
        .student-item .name { font-size: 14px; color: #e8c8e8; }
        .student-item .dupla { font-size: 11px; opacity: 0.4; color: #b888b8; margin-top: 2px; }
        .student-item .status {
            font-size: 8px;
            padding: 2px 10px;
            border-radius: 20px;
            letter-spacing: 1px;
            display: inline-block;
            margin-top: 3px;
        }
        .status.online { background: #66cc88; color: #1a0a1a; }
        .status.offline { background: rgba(58, 42, 58, 0.6); color: #5a4a5a; }
        .status.finished { background: #cc6666; color: #1a0a1a; }
        .detail-item {
            padding: 6px 0;
            border-bottom: 1px solid rgba(192, 132, 192, 0.08);
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s;
        }
        .detail-item:hover { opacity: 1; }
        .detail-item .label { opacity: 0.4; color: #b888b8; font-size: 11px; }
        .detail-item .value { color: #d4a0d4; }
        .detail-item .correct { color: #66cc88; font-weight: bold; }
        .detail-item .wrong { color: #cc6666; font-weight: bold; }
        .detail-item .warning-text { color: #ff8844; }
        .detail-item .time-badge { font-size: 9px; opacity: 0.3; margin-left: 8px; }
        .no-data { text-align: center; opacity: 0.2; padding: 20px; font-size: 12px; letter-spacing: 2px; color: #b888b8; }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 6px;
            margin: 8px 0;
        }
        .stats-grid .stat {
            background: rgba(26, 10, 26, 0.6);
            padding: 10px 6px;
            border: 1px solid rgba(192, 132, 192, 0.15);
            border-radius: 8px;
            text-align: center;
        }
        .stats-grid .stat .number { font-size: 20px; letter-spacing: 2px; color: #e8c8e8; }
        .stats-grid .stat .label { font-size: 7px; opacity: 0.3; letter-spacing: 1px; margin-top: 2px; color: #b888b8; }
        .code-display {
            background: rgba(26, 10, 26, 0.8);
            padding: 10px;
            border: 1px solid #c084c0;
            border-radius: 8px;
            text-align: center;
            font-size: 20px;
            letter-spacing: 6px;
            margin: 8px 0;
            color: #d4a0d4;
            animation: pulse 2s infinite;
        }
        .badge {
            background: #cc6666;
            color: #1a0a1a;
            font-size: 8px;
            padding: 2px 8px;
            border-radius: 20px;
            margin-left: 4px;
            display: inline-block;
        }
        .badge.warning { background: #ff8844; }
        .badge.success { background: #66cc88; }
        .badge.info { background: #6688cc; }
        .divider {
            border: none;
            border-top: 1px solid rgba(192, 132, 192, 0.2);
            margin: 15px 0;
        }
        .aluno-section {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(192, 132, 192, 0.2);
        }
        .aluno-section h3 {
            text-align: center;
            font-weight: 300;
            letter-spacing: 2px;
            opacity: 0.4;
            font-size: 13px;
            color: #b888b8;
            margin-bottom: 12px;
        }
        @media (max-width: 900px) {
            .main-grid { grid-template-columns: 1fr; height: auto; }
            .panel { max-height: 400px; }
            .stats-grid { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-main">
            <h1>Professor Heber Lemos</h1>
            <span class="sub">Sistema de Monitoramento de Provas</span>
            <div class="decor"></div>
        </div>

        <!-- Login Unificado (Professor + Aluno) -->
        <div id="loginUnified" class="login-panel">
            <h2>Professor - Acesso Restrito</h2>
            <div class="form-group">
                <label>Senha</label>
                <input type="password" id="teacherPassword" placeholder="Digite a senha">
            </div>
            <button class="btn-primary" id="teacherLoginBtn">Acessar como Professor</button>
            <div class="error-msg" id="teacherLoginError"></div>
            
            <hr class="divider">
            
            <div class="aluno-section">
                <h3>Aluno - Acessar Prova</h3>
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" id="alunoName" placeholder="Digite seu nome">
                </div>
                <div class="form-group">
                    <label>Dupla</label>
                    <input type="text" id="alunoDupla" placeholder="Ex: Dupla 1">
                </div>
                <button class="btn-aluno" id="alunoLoginBtn">Iniciar Prova</button>
                <div class="error-msg" id="alunoLoginError"></div>
            </div>
        </div>

        <!-- Painel do Professor -->
        <div id="mainPanel" style="display:none;">
            <div class="main-grid">
                <div class="panel">
                    <h2>Alunos</h2>
                    <div id="studentList">
                        <div class="no-data">Nenhum aluno conectado</div>
                    </div>
                </div>

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

        const loginUnified = document.getElementById('loginUnified');
        const mainPanel = document.getElementById('mainPanel');
        const teacherPassword = document.getElementById('teacherPassword');
        const teacherLoginBtn = document.getElementById('teacherLoginBtn');
        const teacherLoginError = document.getElementById('teacherLoginError');
        const studentList = document.getElementById('studentList');
        const studentDetails = document.getElementById('studentDetails');
        
        const alunoName = document.getElementById('alunoName');
        const alunoDupla = document.getElementById('alunoDupla');
        const alunoLoginBtn = document.getElementById('alunoLoginBtn');
        const alunoLoginError = document.getElementById('alunoLoginError');

        const TEACHER_PASSWORD = "heber123456";

        // ===== LOGIN PROFESSOR =====
        teacherLoginBtn.onclick = () => {
            const pass = teacherPassword.value.trim();
            if(!pass) { teacherLoginError.textContent = 'Digite a senha'; return; }
            if(pass === TEACHER_PASSWORD) {
                isLoggedIn = true;
                loginUnified.style.display = 'none';
                mainPanel.style.display = 'block';
                loadStudents();
                teacherLoginError.textContent = '';
            } else {
                teacherLoginError.textContent = 'Senha incorreta';
                teacherPassword.value = '';
                teacherPassword.focus();
            }
        };

        teacherPassword.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') teacherLoginBtn.click();
        });

        // ===== LOGIN ALUNO PELO PC =====
        alunoLoginBtn.onclick = () => {
            const name = alunoName.value.trim();
            const dupla = alunoDupla.value.trim();
            
            if(!name || !dupla) {
                alunoLoginError.textContent = 'Preencha todos os campos';
                return;
            }

            alunoLoginBtn.disabled = true;
            alunoLoginBtn.textContent = 'Abrindo Prova...';
            alunoLoginError.textContent = '';

            // Abrir a prova em uma nova aba/janela
            window.open('/', '_blank');
            
            setTimeout(() => {
                alunoLoginBtn.disabled = false;
                alunoLoginBtn.textContent = 'Iniciar Prova';
                alunoName.value = '';
                alunoDupla.value = '';
            }, 3000);
        };

        // ===== CARREGAR ALUNOS =====
        async function loadStudents() {
            if(!isLoggedIn) return;
            try {
                const res = await fetch('/api/students');
                const students = await res.json();
                renderStudents(students);
            } catch(e) {
                console.log('Erro ao carregar alunos');
            }
        }

        function renderStudents(students) {
            if(students.length === 0) {
                studentList.innerHTML = '<div class="no-data">Nenhum aluno cadastrado</div>';
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
                        <span class="badge info">\${s.totalTime || 0}s</span>
                        <span class="badge warning">\${(s.warnings || []).length}</span>
                        \${s.finished ? '<span class="badge success">✓</span>' : ''}
                    </div>
                </div>
            \`).join('');
        }

        // ===== SELECIONAR ALUNO =====
        async function selectStudent(studentId) {
            if(!isLoggedIn) return;
            currentStudentId = studentId;
            loadStudents();
            try {
                const res = await fetch('/api/students/' + studentId);
                const student = await res.json();
                renderStudentDetails(student);
            } catch(e) {
                console.log('Erro ao carregar detalhes');
            }
        }

        function renderStudentDetails(student) {
            if(!student) {
                studentDetails.innerHTML = '<div class="no-data">Aluno não encontrado</div>';
                return;
            }

            const totalAnswers = student.answers ? Object.keys(student.answers).length : 0;
            const correctAnswers = student.answers ? 
                Object.values(student.answers).filter(a => a && a.isCorrect).length : 0;
            const totalTime = student.totalTime || 0;

            let answersHtml = '';
            if(student.answers && Object.keys(student.answers).length > 0) {
                const sorted = Object.keys(student.answers).sort((a,b) => parseInt(a) - parseInt(b));
                answersHtml = sorted.map(qId => {
                    const ans = student.answers[qId];
                    const isCorrect = ans && ans.isCorrect;
                    const timeSpent = ans ? ans.timeSpent : 0;
                    
                    return \`
                        <div class="detail-item">
                            <span class="label">Questão \${qId}</span>
                            <span>
                                <span class="\${isCorrect ? 'correct' : 'wrong'}">\${isCorrect ? '✓' : '✗'}</span>
                                \${ans ? ans.answer : '—'}
                                <span class="time-badge">\${timeSpent}s</span>
                                \${timeSpent < 5 && ans ? '<span class="badge warning" style="font-size:7px;">Rápido</span>' : ''}
                            </span>
                        </div>
                    \`;
                }).join('');
            } else {
                answersHtml = '<div class="no-data" style="font-size:11px;">Aguardando respostas...</div>';
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
                <div style="margin-bottom:12px;">
                    <div style="font-size:18px;letter-spacing:2px;color:#e8c8e8;">\${student.name}</div>
                    <div style="font-size:12px;opacity:0.4;">Dupla: \${student.dupla}</div>
                    <div style="font-size:11px;opacity:0.3;">Login: \${new Date(student.loginTime).toLocaleString()}</div>
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
                        <div class="number">\${totalTime}s</div>
                        <div class="label">Tempo Total</div>
                    </div>
                    <div class="stat">
                        <div class="number" style="color:#ff8844;">\${warnings.length}</div>
                        <div class="label">Alertas</div>
                    </div>
                </div>

                <h3>Respostas</h3>
                \${answersHtml}

                <h3>Alertas</h3>
                \${warningsHtml}
            \`;
        }

        // ===== SOCKET EVENTS =====
        socket.on('new_student', () => { if(isLoggedIn) loadStudents(); });
        socket.on('student_answer', () => { 
            if(isLoggedIn) {
                loadStudents();
                if(currentStudentId) {
                    fetch('/api/students/' + currentStudentId)
                        .then(r => r.json())
                        .then(s => renderStudentDetails(s));
                }
            }
        });
        socket.on('student_warning', () => { if(isLoggedIn) loadStudents(); });
        socket.on('student_finished', () => { 
            if(isLoggedIn) {
                loadStudents();
                if(currentStudentId) {
                    fetch('/api/students/' + currentStudentId)
                        .then(r => r.json())
                        .then(s => renderStudentDetails(s));
                }
            }
        });
        socket.on('student_status_change', () => { if(isLoggedIn) loadStudents(); });

        if(isLoggedIn) loadStudents();
    </script>
</body>
</html>`);
  }
});

// ========== API REST ==========
app.use(express.json());

app.post('/api/students', (req, res) => {
  const { name, dupla } = req.body;
  if(!name || !dupla) return res.status(400).json({ error: 'Nome e dupla obrigatorios' });
  
  const nameNormalizado = normalizeText(name);
  const duplaNormalizada = normalizeText(dupla);

  const duplaEncontrada = getDuplaByAluno(nameNormalizado);
  if(!duplaEncontrada) {
    return res.status(403).json({ error: 'Aluno não cadastrado' });
  }

  if(normalizeText(duplaEncontrada.nome) !== duplaNormalizada) {
    return res.status(403).json({ error: 'Dupla incorreta para este aluno' });
  }

  let existingStudent = null;
  for(let [id, s] of students) {
    if(s.name === nameNormalizado) {
      existingStudent = s;
      break;
    }
  }

  let studentId;
  let student;

  if(existingStudent) {
    if(existingStudent.finished) {
      return res.status(403).json({ 
        error: 'Prova já finalizada', 
        alreadyFinished: true,
        completionCode: existingStudent.completionCode,
        correctCount: existingStudent.correctCount || 0,
        totalTime: existingStudent.totalTime || 0,
        dupla: existingStudent.dupla,
        allAnswers: existingStudent.answers || {}
      });
    }
    studentId = existingStudent.id;
    student = existingStudent;
  } else {
    studentId = uuidv4();
    student = {
      id: studentId,
      name: nameNormalizado,
      dupla: duplaNormalizada,
      socketId: null,
      online: false,
      finished: false,
      loginTime: new Date().toISOString(),
      totalTime: 0,
      answers: {},
      warnings: [],
      completionCode: null,
      correctCount: 0,
      copyCount: 0,
      pasteCount: 0
    };
    students.set(studentId, student);
    answers.set(studentId, {});
    sessions.set(studentId, { startTime: Date.now(), lastActivity: Date.now() });
    io.emit('new_student', { studentId, name: nameNormalizado, dupla: duplaNormalizada });
    saveData();
  }

  res.status(201).json({ 
    ...student, 
    alreadyFinished: false,
    allAnswers: student.answers || {}
  });
});

app.get('/api/students', (req, res) => {
  const list = Array.from(students.values());
  res.json(list);
});

app.get('/api/students/:id', (req, res) => {
  const s = students.get(req.params.id);
  if(!s) return res.status(404).json({ error: 'Não encontrado' });
  res.json(s);
});

app.delete('/api/students/:id', (req, res) => {
  const s = students.get(req.params.id);
  if(!s) return res.status(404).json({ error: 'Não encontrado' });
  if(s.socketId) {
    const sock = io.sockets.sockets.get(s.socketId);
    if(sock) sock.disconnect();
  }
  students.delete(req.params.id);
  answers.delete(req.params.id);
  sessions.delete(req.params.id);
  saveData();
  res.json({ success: true });
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  let currentStudentId = null;

  socket.on('student_login', ({ name, dupla }) => {
    const nameNormalizado = normalizeText(name);
    const duplaNormalizada = normalizeText(dupla);

    console.log('Tentativa login:', nameNormalizado, '| Dupla:', duplaNormalizada);

    const duplaEncontrada = getDuplaByAluno(nameNormalizado);
    if(!duplaEncontrada) {
      socket.emit('login_error', { error: 'Aluno não cadastrado' });
      return;
    }

    if(normalizeText(duplaEncontrada.nome) !== duplaNormalizada) {
      socket.emit('login_error', { error: 'Dupla incorreta para este aluno' });
      return;
    }

    let existingStudent = null;
    for(let [id, s] of students) {
      if(s.name === nameNormalizado) {
        existingStudent = s;
        break;
      }
    }

    if(existingStudent && existingStudent.finished) {
      socket.emit('login_success', {
        studentId: existingStudent.id,
        name: existingStudent.name,
        dupla: existingStudent.dupla,
        alreadyFinished: true,
        completionCode: existingStudent.completionCode,
        correctCount: existingStudent.correctCount || 0,
        totalTime: existingStudent.totalTime || 0,
        allAnswers: existingStudent.answers || {}
      });
      return;
    }

    let studentId;
    let student;

    if(existingStudent) {
      studentId = existingStudent.id;
      student = existingStudent;
    } else {
      studentId = uuidv4();
      student = {
        id: studentId,
        name: nameNormalizado,
        dupla: duplaNormalizada,
        socketId: null,
        online: false,
        finished: false,
        loginTime: new Date().toISOString(),
        totalTime: 0,
        answers: {},
        warnings: [],
        completionCode: null,
        correctCount: 0,
        copyCount: 0,
        pasteCount: 0
      };
      students.set(studentId, student);
      answers.set(studentId, {});
      sessions.set(studentId, { startTime: Date.now(), lastActivity: Date.now() });
      io.emit('new_student', { studentId, name: nameNormalizado, dupla: duplaNormalizada });
      saveData();
    }

    if(student.socketId) {
      const old = io.sockets.sockets.get(student.socketId);
      if(old) { old.emit('force_disconnect', { reason: 'Nova conexão' }); old.disconnect(); }
    }

    student.socketId = socket.id;
    student.online = true;
    student.loginTime = new Date().toISOString();
    currentStudentId = studentId;

    const studentAnswers = answers.get(studentId) || {};

    io.emit('student_status_change', { studentId, online: true, name: student.name });
    socket.emit('login_success', {
      studentId,
      name: student.name,
      dupla: student.dupla,
      answers: studentAnswers,
      alreadyFinished: false
    });

    console.log('✅ ' + student.name + ' logou | Dupla: ' + student.dupla);
    saveData();
  });

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

    if(timeSpent < 5) {
      student.warnings.push({
        type: 'Resposta muito rápida',
        timestamp: new Date().toISOString(),
        details: 'Questão ' + questionId + ' - ' + timeSpent + 's'
      });
      io.emit('student_warning', { studentId, warning: 'Resposta muito rápida' });
    }

    const session = sessions.get(studentId);
    if(session) {
      student.totalTime = Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000);
    }

    students.set(studentId, student);
    io.emit('student_answer', { studentId, questionId, answer, isCorrect });
    console.log('📝 ' + student.name + ' - Q' + questionId + ': ' + answer + ' (' + (isCorrect ? '✓' : '✗') + ')');
    saveData();
  });

  socket.on('copy_detected', ({ studentId }) => {
    const student = students.get(studentId);
    if(student && !student.finished) {
      student.copyCount = (student.copyCount || 0) + 1;
      student.warnings.push({
        type: 'Cópia detectada',
        timestamp: new Date().toISOString(),
        count: student.copyCount
      });
      students.set(studentId, student);
      io.emit('student_warning', { studentId, warning: 'Cópia detectada' });
      console.log('📋 ' + student.name + ' - Cópia detectada');
      saveData();
    }
  });

  socket.on('paste_detected', ({ studentId }) => {
    const student = students.get(studentId);
    if(student && !student.finished) {
      student.pasteCount = (student.pasteCount || 0) + 1;
      student.warnings.push({
        type: 'Cola detectada',
        timestamp: new Date().toISOString(),
        count: student.pasteCount
      });
      students.set(studentId, student);
      io.emit('student_warning', { studentId, warning: 'Cola detectada' });
      console.log('📄 ' + student.name + ' - Cola detectada');
      saveData();
    }
  });

  socket.on('exam_finished', (data) => {
    const { studentId, answers: studentAnswers, totalTime, completionCode, studentName, studentDupla, correctCount } = data;
    
    const student = students.get(studentId);
    if(!student || student.finished) return;

    student.finished = true;
    student.online = false;
    student.completionCode = completionCode;
    student.totalTime = totalTime;
    student.answers = studentAnswers;
    student.correctCount = correctCount;

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

    console.log('✅ ' + student.name + ' finalizou | Código: ' + completionCode + ' | Acertos: ' + correctCount + '/10');
    saveData();
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if(currentStudentId) {
      const student = students.get(currentStudentId);
      if(student && !student.finished) {
        student.online = false;
        const session = sessions.get(currentStudentId);
        if(session) {
          student.totalTime = Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000);
        }
        students.set(currentStudentId, student);
        io.emit('student_status_change', { 
          studentId: currentStudentId, 
          online: false, 
          name: student.name 
        });
        console.log('❌ ' + student.name + ' desconectado');
        saveData();
      }
    }
  });
});

// ========== INICIAR SERVIDOR ==========
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✦ SISTEMA PROFESSOR HEBER LEMOS ✦');
  console.log('   Porta: ' + PORT);
  console.log('   Professor: http://localhost:' + PORT);
  console.log('   Aluno: http://localhost:' + PORT);
  console.log('\n● Acesso:');
  console.log('   Senha Professor: heber123456');
  console.log('\n● Duplas Cadastradas:');
  DUPLAS.forEach(d => {
    console.log('   ' + d.nome + ':');
    d.alunos.forEach(a => console.log('      - ' + a));
  });
  console.log('\n   Para adicionar mais duplas, edite a constante DUPLAS');
  console.log('   no arquivo server.js');
  console.log('\n● Funcionalidades:');
  console.log('   ✓ Login Professor + Aluno na mesma página');
  console.log('   ✓ Validação de aluno + dupla (case insensitive)');
  console.log('   ✓ Alternativa fica marcada ao clicar');
  console.log('   ✓ Dados permanentes (salvos em data.json)');
  console.log('   ✓ Professor vê: resposta, certo/errado, tempo, alertas');
  console.log('   ✓ Uma chance por dupla (bloqueio após finalizar)');
  console.log('   ✓ Aluno pode fazer prova pelo PC ou Celular\n');
});

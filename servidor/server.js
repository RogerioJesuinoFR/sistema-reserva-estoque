const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const app = express();
app.use(express.json());

// Configuração estrita de CORS conforme exigido pelo protocolo
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==============================================================
// MIDDLEWARE DE LOGS (Exibe Requisições e Respostas no Terminal)
// ==============================================================
app.use((req, res, next) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    console.log(`\n[${dataHora}] === NOVA REQUISIÇÃO RECEBIDA ===`);
    console.log(`-> Método: ${req.method} | Rota: ${req.url}`);
    
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log(`-> Dados (Body):`, req.body);
    }
    
    if (req.headers['authorization']) {
        console.log(`-> Header Authorization: ${req.headers['authorization']}`);
    }

    const originalJson = res.json;
    res.json = function (body) {
        console.log(`<- Resposta Enviada (Status ${res.statusCode}):`);
        console.log(body);
        console.log(`=================================================\n`);
        return originalJson.call(this, body);
    };

    next();
});

// ==============================================================
// BANCO DE DADOS EM MEMÓRIA E REGRAS DO PROTOCOLO
// ==============================================================
let users = [];
let sessions = []; // Guarda objeto: { id: sessionId, token: token, userId: userId }
let nextUserId = 1;

// Validações de Dados (Schemas do Swagger)
const validateNome = (nome) => {
    if (!nome || typeof nome !== 'string') return false;
    const trimmed = nome.trim();
    return trimmed.length >= 3 && trimmed.length <= 50;
};

const validateEmail = (email) => {
    if (!email || typeof email !== 'string' || email.length < 5 || email.length > 30) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validateSenha = (senha) => {
    if (!senha || typeof senha !== 'string' || senha.length < 6 || senha.length > 20) return false;
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(senha);
};

// Middleware de Autenticação por Token
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensagem: 'Token ausente ou inválido.' });
    }

    const token = authHeader.split(' ')[1];
    const session = sessions.find(s => s.token === token);
    
    if (!session) {
        return res.status(401).json({ mensagem: 'Token ausente ou inválido.' });
    }

    req.session = session;
    req.userId = session.userId;
    next();
};

// ==============================================================
// ROTAS OFICIAIS DO PROTOCOLO (/api/v1)
// ==============================================================

// Health Check / Ping
app.get('/api/v1/ping', (req, res) => {
    res.status(200).json({ mensagem: 'Servidor ativo e respondendo!' });
});

// 1. Cadastrar Usuário: POST /api/v1/users
app.post('/api/v1/users', (req, res) => {
    const { nome, email, senha } = req.body || {};

    if (!validateNome(nome) || !validateEmail(email) || !validateSenha(senha)) {
        return res.status(400).json({ mensagem: 'Requisição inválida ou corpo mal formatado (viola alguma restrição de dado).' });
    }

    const emailExists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
        return res.status(409).json({ mensagem: 'E-mail já cadastrado.' });
    }

    const newUser = {
        id: nextUserId++,
        nome: nome.trim(),
        email: email.toLowerCase(),
        senha: senha
    };

    users.push(newUser);

    // Retorno 201 conforme a especificação do Swagger
    res.status(201).json({
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email
    });
});

// 2. Criar Sessão (Login): POST /api/v1/sessions
app.post('/api/v1/sessions', (req, res) => {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Corpo mal formatado, ou e-mail/senha ausentes.' });
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha);
    if (!user) {
        return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
    }

    const sessionId = uuidv4();
    const token = uuidv4();

    const newSession = {
        id: sessionId,
        token: token,
        userId: user.id
    };

    sessions.push(newSession);

    res.status(201).json({
        id: sessionId,
        token: token,
        usuario: {
            id: user.id,
            nome: user.nome,
            email: user.email
        }
    });
});

// 3. Encerrar Sessão (Logout): DELETE /api/v1/sessions/{id}
app.delete('/api/v1/sessions/:id', authMiddleware, (req, res) => {
    const sessionId = req.params.id;
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
        return res.status(404).json({ mensagem: 'Sessão não encontrada.' });
    }

    if (session.userId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id da sessão não pertence ao dono do token enviado.' });
    }

    // Remove a sessão da whitelist
    sessions = sessions.filter(s => s.id !== sessionId);

    // Retorno 204 No Content
    res.status(204).send();
});

// 4. Buscar Usuário por ID: GET /api/v1/users/{id}
app.get('/api/v1/users/:id', authMiddleware, (req, res) => {
    const paramId = parseInt(req.params.id, 10);
    if (isNaN(paramId)) {
        return res.status(400).json({ mensagem: 'O id informado na URL não é um número inteiro válido.' });
    }

    if (paramId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id do usuário não pertence ao dono do token enviado.' });
    }

    const user = users.find(u => u.id === paramId);
    if (!user) {
        return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    res.status(200).json({
        id: user.id,
        nome: user.nome,
        email: user.email
    });
});

// 5. Atualizar Usuário Parcialmente: PATCH /api/v1/users/{id}
app.patch('/api/v1/users/:id', authMiddleware, (req, res) => {
    const paramId = parseInt(req.params.id, 10);
    if (isNaN(paramId)) {
        return res.status(400).json({ mensagem: 'O id informado na URL não é um número inteiro válido.' });
    }

    if (paramId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id do usuário não pertence ao dono do token enviado.' });
    }

    const userIndex = users.findIndex(u => u.id === paramId);
    if (userIndex === -1) {
        return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    const { nome, email, senha } = req.body || {};

    if (!nome && !email && !senha) {
        return res.status(400).json({ mensagem: 'Corpo mal formatado ou corpo vazio.' });
    }

    if (nome && !validateNome(nome)) return res.status(400).json({ mensagem: 'Nome inválido.' });
    if (email && !validateEmail(email)) return res.status(400).json({ mensagem: 'E-mail inválido.' });
    if (senha && !validateSenha(senha)) return res.status(400).json({ mensagem: 'Senha inválida.' });

    if (email && email.toLowerCase() !== users[userIndex].email) {
        const emailExists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            return res.status(409).json({ mensagem: 'O e-mail informado já está cadastrado por outro usuário.' });
        }
        users[userIndex].email = email.toLowerCase();
    }

    if (nome) users[userIndex].nome = nome.trim();
    if (senha) users[userIndex].senha = senha;

    res.status(200).json({
        id: users[userIndex].id,
        nome: users[userIndex].nome,
        email: users[userIndex].email
    });
});

// 6. Remover Usuário: DELETE /api/v1/users/{id}
app.delete('/api/v1/users/:id', authMiddleware, (req, res) => {
    const paramId = parseInt(req.params.id, 10);
    if (isNaN(paramId)) {
        return res.status(400).json({ mensagem: 'O id informado na URL não é um número inteiro válido.' });
    }

    if (paramId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id do usuário não pertence ao dono do token enviado.' });
    }

    const userIndex = users.findIndex(u => u.id === paramId);
    if (userIndex === -1) {
        return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    // Remove o usuário
    users.splice(userIndex, 1);

    // Remove TODAS as sessões ativas deste usuário (derruba da whitelist)
    sessions = sessions.filter(s => s.userId !== paramId);

    // Retorno 204 No Content
    res.status(204).send();
});

// ==============================================================
// INICIALIZAÇÃO
// ==============================================================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Digite a porta para iniciar o servidor (ex: 3000): ', (portInput) => {
    const PORT = portInput || 3000;
    app.listen(PORT, () => {
        console.log(`\n✅ Servidor ativo e escutando na porta ${PORT}...`);
        console.log(`📍 Base URL: http://localhost:${PORT}/api/v1\n`);
    });
    rl.close();
});
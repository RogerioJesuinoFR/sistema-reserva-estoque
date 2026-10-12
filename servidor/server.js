const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());

// Configuração de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Criação das tabelas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            token TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

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

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ mensagem: 'Token ausente ou inválido.' });
        }

        const token = authHeader.split(' ')[1];
        const session = await dbGet('SELECT * FROM sessions WHERE token = ?', [token]);
        
        if (!session) {
            return res.status(401).json({ mensagem: 'Token ausente ou inválido.' });
        }

        req.session = session;
        req.userId = session.user_id;
        next();
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
};

app.get('/api/v1/ping', (req, res) => {
    res.status(200).json({ mensagem: 'Servidor ativo e respondendo!' });
});

app.post('/api/v1/users', async (req, res) => {
    const { nome, email, senha } = req.body || {};

    if (!validateNome(nome) || !validateEmail(email) || !validateSenha(senha)) {
        return res.status(400).json({ mensagem: 'Requisição inválida ou corpo mal formatado (viola alguma restrição de dado).' });
    }

    try {
        const emailExists = await dbGet('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (emailExists) {
            return res.status(409).json({ mensagem: 'E-mail já cadastrado.' });
        }

        const result = await dbRun(
            'INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)',
            [nome.trim(), email.toLowerCase(), senha]
        );

        res.status(201).json({
            id: result.lastID,
            nome: nome.trim(),
            email: email.toLowerCase()
        });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

app.post('/api/v1/sessions', async (req, res) => {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Corpo mal formatado, ou e-mail/senha ausentes.' });
    }

    try {
        const user = await dbGet('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND senha = ?', [email, senha]);
        if (!user) {
            return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
        }

        const sessionId = uuidv4();
        const token = uuidv4();

        await dbRun(
            'INSERT INTO sessions (id, token, user_id) VALUES (?, ?, ?)',
            [sessionId, token, user.id]
        );

        res.status(201).json({
            id: sessionId,
            token: token,
            usuario: {
                id: user.id,
                nome: user.nome,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

app.delete('/api/v1/sessions/:id', authMiddleware, async (req, res) => {
    const sessionId = req.params.id;

    try {
        const session = await dbGet('SELECT * FROM sessions WHERE id = ?', [sessionId]);

        if (!session) {
            return res.status(404).json({ mensagem: 'Sessão não encontrada.' });
        }

        if (session.user_id !== req.userId) {
            return res.status(403).json({ mensagem: 'O id da sessão não pertence ao dono do token enviado.' });
        }

        await dbRun('DELETE FROM sessions WHERE id = ?', [sessionId]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

app.get('/api/v1/users/:id', authMiddleware, async (req, res) => {
    const paramId = parseInt(req.params.id, 10);
    if (isNaN(paramId)) {
        return res.status(400).json({ mensagem: 'O id informado na URL não é um número inteiro válido.' });
    }

    if (paramId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id do usuário não pertence ao dono do token enviado.' });
    }

    try {
        const user = await dbGet('SELECT id, nome, email FROM users WHERE id = ?', [paramId]);
        if (!user) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        res.status(200).json({
            id: user.id,
            nome: user.nome,
            email: user.email
        });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

app.patch('/api/v1/users/:id', authMiddleware, async (req, res) => {
    const paramId = parseInt(req.params.id, 10);
    if (isNaN(paramId)) {
        return res.status(400).json({ mensagem: 'O id informado na URL não é um número inteiro válido.' });
    }

    if (paramId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id do usuário não pertence ao dono do token enviado.' });
    }

    const { nome, email, senha } = req.body || {};

    if (!nome && !email && !senha) {
        return res.status(400).json({ mensagem: 'Corpo mal formatado ou corpo vazio.' });
    }

    if (nome && !validateNome(nome)) return res.status(400).json({ mensagem: 'Nome inválido.' });
    if (email && !validateEmail(email)) return res.status(400).json({ mensagem: 'E-mail inválido.' });
    if (senha && !validateSenha(senha)) return res.status(400).json({ mensagem: 'Senha inválida.' });

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [paramId]);
        if (!user) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        if (email && email.toLowerCase() !== user.email) {
            const emailExists = await dbGet('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
            if (emailExists) {
                return res.status(409).json({ mensagem: 'O e-mail informado já está cadastrado por outro usuário.' });
            }
        }

        const newNome = nome ? nome.trim() : user.nome;
        const newEmail = email ? email.toLowerCase() : user.email;
        const newSenha = senha ? senha : user.senha;

        await dbRun(
            'UPDATE users SET nome = ?, email = ?, senha = ? WHERE id = ?',
            [newNome, newEmail, newSenha, paramId]
        );

        res.status(200).json({
            id: paramId,
            nome: newNome,
            email: newEmail
        });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

app.delete('/api/v1/users/:id', authMiddleware, async (req, res) => {
    const paramId = parseInt(req.params.id, 10);
    if (isNaN(paramId)) {
        return res.status(400).json({ mensagem: 'O id informado na URL não é um número inteiro válido.' });
    }

    if (paramId !== req.userId) {
        return res.status(403).json({ mensagem: 'O id do usuário não pertence ao dono do token enviado.' });
    }

    try {
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [paramId]);
        if (!user) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        // Apaga o usuário (as sessões serão apagadas automaticamente pela chave estrangeira ON DELETE CASCADE)
        await dbRun('DELETE FROM users WHERE id = ?', [paramId]);
        await dbRun('DELETE FROM sessions WHERE user_id = ?', [paramId]);

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Digite a porta para iniciar o servidor (ex: 3000): ', (portInput) => {
    const PORT = portInput || 3000;
    app.listen(PORT, () => {
        console.log(`\n✅ Servidor ativo com SQLite e escutando na porta ${PORT}...`);
        console.log(`📍 Base URL: http://localhost:${PORT}/api/v1\n`);
    });
    rl.close();
});
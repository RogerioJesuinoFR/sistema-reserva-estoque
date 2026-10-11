const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const app = express();
app.use(express.json());
app.use(cors());

// Bancos de dados em memória
let users = [];
let whitelist = []; // Mantém os tokens de usuários logados

// Validações
const validateEmail = (email) => {
    // Tamanho entre 5 e 30[cite: 1], obrigatório ter @ e domínio[cite: 1]
    if (!email || email.length < 5 || email.length > 30) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validatePassword = (password) => {
    // Tamanho entre 6 e 20[cite: 2], alfanumérica[cite: 2], sem caracteres especiais[cite: 2]
    if (!password || password.length < 6 || password.length > 20) return false;
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(password);
};

// Middleware de Autenticação (Whitelist)
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

    const bearerToken = token.split(' ')[1]; // formato: "Bearer token"
    
    // Verifica se o token está na whitelist[cite: 2]
    const session = whitelist.find(w => w.token === bearerToken);
    if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login.' });

    req.userId = session.userId;
    req.token = bearerToken;
    next();
};

// 1. Cadastro de Usuário (C)
app.post('/usuarios', (req, res) => {
    const { nome, email, password } = req.body;

    if (!validateEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Senha inválida. Use 6 a 20 caracteres alfanuméricos.' });

    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.status(409).json({ error: 'Usuário já existe. Por favor, faça login.' });
    }

    const newUser = { id: uuidv4(), nome, email, password };
    users.push(newUser);
    res.status(201).json({ message: 'Cadastro realizado com sucesso!' });
});

// 2. Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = uuidv4();
    whitelist.push({ token, userId: user.id });

    res.status(200).json({ token, message: 'Login realizado com sucesso!' });
});

// 3. Logout
app.post('/logout', authMiddleware, (req, res) => {
    // Remove o token da whitelist[cite: 2]
    whitelist = whitelist.filter(w => w.token !== req.token);
    res.status(200).json({ message: 'Logout realizado com sucesso.' });
});

// 4. Leitura do Perfil (R)
app.get('/usuarios/me', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    
    res.status(200).json({ id: user.id, nome: user.nome, email: user.email });
});

// 5. Atualização do Perfil (U)
app.put('/usuarios/me', authMiddleware, (req, res) => {
    const { nome, password } = req.body;
    const userIndex = users.findIndex(u => u.id === req.userId);

    if (password && !validatePassword(password)) {
        return res.status(400).json({ error: 'Senha inválida.' });
    }

    users[userIndex].nome = nome || users[userIndex].nome;
    if (password) users[userIndex].password = password;

    res.status(200).json({ message: 'Dados atualizados com sucesso!' });
});

// 6. Deleção do Perfil (D)
app.delete('/usuarios/me', authMiddleware, (req, res) => {
    // Remove o usuário
    users = users.filter(u => u.id !== req.userId);
    // Remove a sessão
    whitelist = whitelist.filter(w => w.token !== req.token);

    res.status(200).json({ message: 'Cadastro apagado com sucesso.' });
});

// Configuração para pedir a porta ao usuário no terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Digite a porta para iniciar o servidor (ex: 3000): ', (portInput) => {
    const PORT = portInput || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Servidor rodando. Escutando na porta ${PORT}...`);
    });
    rl.close();
});
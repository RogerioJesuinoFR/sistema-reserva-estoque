// Configuração persistente de IP e Porta (localStorage)
document.addEventListener('DOMContentLoaded', () => {
    const ipInput = document.getElementById('server-ip');
    const portInput = document.getElementById('server-port');
    
    if (ipInput && portInput) {
        // Carrega os valores salvos ou coloca o padrão
        ipInput.value = localStorage.getItem('serverIp') || '127.0.0.1';
        portInput.value = localStorage.getItem('serverPort') || '3000';
        
        // Salva sempre que o usuário digitar algo novo
        ipInput.addEventListener('input', (e) => localStorage.setItem('serverIp', e.target.value));
        portInput.addEventListener('input', (e) => localStorage.setItem('serverPort', e.target.value));
    }

    // Identifica se está no dashboard e carrega os dados
    if (window.location.pathname.includes('dashboard.html')) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Acesso negado. Faça login!');
            window.location.href = 'login.html';
        } else {
            carregarDadosUsuario();
        }
    }
});

const getBaseUrl = () => {
    const ip = localStorage.getItem('serverIp') || '127.0.0.1';
    const port = localStorage.getItem('serverPort') || '3000';
    return `http://${ip}:${port}`;
};

// ================= FUNCIONALIDADES =================

// CADASTRO (cadastro.html)
async function cadastrarUsuario() {
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const password = document.getElementById('cad-password').value;

    try {
        const res = await fetch(`${getBaseUrl()}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, password })
        });
        const data = await res.json();
        
        alert(data.message || data.error);
        if (res.ok) window.location.href = 'login.html'; // Redireciona para o login
    } catch (err) { alert("Erro ao conectar com o servidor."); }
}

// LOGIN (login.html)
async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${getBaseUrl()}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token); // Salva o token
            window.location.href = 'dashboard.html'; // Vai para o sistema
        } else {
            alert(data.error);
        }
    } catch (err) { alert("Erro ao conectar com o servidor."); }
}

// CARREGAR DADOS (dashboard.html)
async function carregarDadosUsuario() {
    try {
        const res = await fetch(`${getBaseUrl()}/usuarios/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('user-name').innerText = data.nome;
            document.getElementById('user-email').innerText = data.email;
        } else {
            alert(data.error);
            fazerLogout(true);
        }
    } catch (err) { alert("Erro ao carregar dados."); }
}

// ATUALIZAR DADOS (dashboard.html)
async function atualizarUsuario() {
    const nome = document.getElementById('upd-nome').value;
    const password = document.getElementById('upd-password').value;
    const payload = {};
    if (nome) payload.nome = nome;
    if (password) payload.password = password;

    try {
        const res = await fetch(`${getBaseUrl()}/usuarios/me`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message || data.error);
        if (res.ok) {
            document.getElementById('upd-nome').value = '';
            document.getElementById('upd-password').value = '';
            carregarDadosUsuario();
        }
    } catch (err) { alert("Erro ao atualizar dados."); }
}

// APAGAR CONTA (dashboard.html)
async function deletarUsuario() {
    const confirmacao = confirm("Tem certeza absoluta que deseja apagar seu cadastro?");
    if (confirmacao) {
        try {
            const res = await fetch(`${getBaseUrl()}/usuarios/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            alert(data.message || data.error);
            if (res.ok) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
        } catch (err) { alert("Erro ao apagar conta."); }
    }
}

// LOGOUT (dashboard.html)
async function fazerLogout(localOnly = false) {
    if (!localOnly) {
        try {
            await fetch(`${getBaseUrl()}/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (err) { console.error("Erro no logout no servidor"); }
    }
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
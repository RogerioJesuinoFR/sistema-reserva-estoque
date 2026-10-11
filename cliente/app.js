let currentToken = null;

// Função para montar a URL baseada nas entradas do cliente
const getBaseUrl = () => {
    const ip = document.getElementById('server-ip').value || '127.0.0.1';
    const port = document.getElementById('server-port').value || '3000';
    return `http://${ip}:${port}`;
};

// Exibição condicional de telas
const toggleView = (isLogged) => {
    document.getElementById('auth-section').style.display = isLogged ? 'none' : 'block';
    document.getElementById('dashboard-section').style.display = isLogged ? 'block' : 'none';
    if (isLogged) carregarDadosUsuario();
};

// CADASTRO
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
    } catch (err) {
        alert("Erro ao conectar com o servidor.");
    }
}

// LOGIN
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
            currentToken = data.token;
            alert(data.message);
            toggleView(true);
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert("Erro ao conectar com o servidor.");
    }
}

// LER DADOS (Requisita dados do servidor)
async function carregarDadosUsuario() {
    try {
        const res = await fetch(`${getBaseUrl()}/usuarios/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('user-name').innerText = data.nome;
            document.getElementById('user-email').innerText = data.email;
        } else {
            alert(data.error);
            fazerLogout(true); // Força logout se token falhou
        }
    } catch (err) {
        alert("Erro ao carregar dados.");
    }
}

// ATUALIZAR DADOS
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
                'Authorization': `Bearer ${currentToken}` 
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message || data.error);
        if (res.ok) carregarDadosUsuario();
    } catch (err) {
        alert("Erro ao atualizar dados.");
    }
}

// APAGAR CONTA
async function deletarUsuario() {
    // Solicitando confirmação antes de apagar, conforme exigido.
    const confirmacao = confirm("Tem certeza absoluta que deseja apagar seu cadastro? Esta ação não pode ser desfeita.");
    
    if (confirmacao) {
        try {
            const res = await fetch(`${getBaseUrl()}/usuarios/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const data = await res.json();
            alert(data.message || data.error);
            if (res.ok) {
                currentToken = null;
                toggleView(false);
            }
        } catch (err) {
            alert("Erro ao apagar conta.");
        }
    }
}

// LOGOUT
async function fazerLogout(localOnly = false) {
    if (!localOnly) {
        try {
            await fetch(`${getBaseUrl()}/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
        } catch (err) {
            console.error("Erro na chamada de logout no servidor");
        }
    }
    currentToken = null;
    alert("Logout efetuado com sucesso.");
    toggleView(false);
}
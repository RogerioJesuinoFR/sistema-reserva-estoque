let isInternalNavigation = false;

document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (anchor) isInternalNavigation = true;
});

window.addEventListener('pagehide', () => {
    if (!isInternalNavigation) {
        const token = sessionStorage.getItem('token');
        const sessionId = sessionStorage.getItem('sessionId');
        const ip = localStorage.getItem('serverIp');
        const port = localStorage.getItem('serverPort');

        if (token && sessionId && ip && port) {
            fetch(`http://${ip}:${port}/api/v1/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                keepalive: true
            });
            sessionStorage.clear();
        }
    }
});

function navegarPara(pagina) {
    isInternalNavigation = true;
    window.location.href = pagina;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        const ip = localStorage.getItem('serverIp');
        const port = localStorage.getItem('serverPort');
        if (!ip || !port) {
            alert("Você precisa configurar o servidor primeiro.");
            navegarPara('index.html');
            return;
        }
    }

    if (window.location.pathname.includes('dashboard.html')) {
        const token = sessionStorage.getItem('token');
        if (!token) {
            alert('Acesso negado. Faça login!');
            navegarPara('login.html');
        } else {
            carregarDadosUsuario();
        }
    }
});

const getBaseUrl = () => {
    const ip = localStorage.getItem('serverIp');
    const port = localStorage.getItem('serverPort');
    return `http://${ip}:${port}/api/v1`;
};

// CADASTRO: POST /api/v1/users
async function cadastrarUsuario() {
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const senha = document.getElementById('cad-password').value;

    try {
        const res = await fetch(`${getBaseUrl()}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        const data = await res.json();
        
        if (res.status === 201) {
            alert("Cadastro realizado com sucesso! Faça login para continuar.");
            navegarPara('login.html');
        } else {
            alert(data.mensagem || "Erro ao realizar cadastro.");
        }
    } catch (err) { alert(`Erro de conexão com o servidor.`); }
}

// LOGIN: POST /api/v1/sessions
async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${getBaseUrl()}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();
        
        if (res.status === 201) {
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('sessionId', data.id);
            sessionStorage.setItem('userId', data.usuario.id);
            navegarPara('dashboard.html');
        } else {
            alert(data.mensagem || "Erro ao efetuar login.");
        }
    } catch (err) { alert(`Erro de conexão com o servidor.`); }
}

async function carregarDadosUsuario() {
    const userId = sessionStorage.getItem('userId');
    const token = sessionStorage.getItem('token');

    try {
        const res = await fetch(`${getBaseUrl()}/users/${userId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            document.getElementById('user-name').innerText = data.nome;
            document.getElementById('user-email').innerText = data.email;
        } else {
            const data = await res.json();
            alert(data.mensagem || "Erro ao carregar perfil.");
            fazerLogout(true);
        }
    } catch (err) { alert("Erro ao carregar dados do servidor."); }
}

async function atualizarUsuario() {
    const userId = sessionStorage.getItem('userId');
    const token = sessionStorage.getItem('token');
    const nome = document.getElementById('upd-nome').value;
    const senha = document.getElementById('upd-password').value;

    const payload = {};
    if (nome) payload.nome = nome;
    if (senha) payload.senha = senha;

    try {
        const res = await fetch(`${getBaseUrl()}/users/${userId}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            alert("Dados atualizados com sucesso!");
            document.getElementById('upd-nome').value = '';
            document.getElementById('upd-password').value = '';
            carregarDadosUsuario();
        } else {
            alert(data.mensagem || "Erro ao atualizar dados.");
        }
    } catch (err) { alert("Erro ao atualizar dados."); }
}

async function deletarUsuario() {
    const confirmacao = confirm("Tem certeza absoluta que deseja apagar seu cadastro?");
    if (confirmacao) {
        const userId = sessionStorage.getItem('userId');
        const token = sessionStorage.getItem('token');

        try {
            const res = await fetch(`${getBaseUrl()}/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 204) {
                alert("Cadastro excluído com sucesso.");
                sessionStorage.clear();
                navegarPara('login.html');
            } else {
                const data = await res.json();
                alert(data.mensagem || "Erro ao apagar conta.");
            }
        } catch (err) { alert("Erro ao apagar conta."); }
    }
}

async function fazerLogout(localOnly = false) {
    if (!localOnly) {
        const sessionId = sessionStorage.getItem('sessionId');
        const token = sessionStorage.getItem('token');

        try {
            await fetch(`${getBaseUrl()}/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) { console.error("Erro ao realizar logout no servidor"); }
    }
    sessionStorage.clear();
    navegarPara('login.html');
}
⚡ Sistema de Reserva de Estoque e Pedidos para E-commerce

Este repositório contém o trabalho prático da disciplina de Tecnologias Cliente-Servidor. O projeto simula o fluxo de autenticação e gerenciamento de usuários para uma plataforma de vendas relâmpago ou venda de ingressos para eventos (ex.: Ticketmaster, Amazon Prime Day).

O projeto é dividido em duas partes independentes:

Servidor (Backend): Desenvolvido em Node.js com banco de dados SQLite, aderindo 100% ao protocolo de comunicação (OpenAPI/Swagger) estipulado para a disciplina.

Cliente (Frontend): Desenvolvido em HTML, CSS e JavaScript puros (Vanilla), com interface interativa e responsiva.

📋 Pré-requisitos

Para rodar este projeto, você precisará ter instalado em sua máquina:

Git (para clonar o repositório)

Node.js (versão LTS recomendada - inclui o npm)

Um navegador web atualizado (Chrome, Edge, Firefox, etc.)

🚀 Como Baixar e Instalar

Abra o terminal (PowerShell, CMD ou terminal do VS Code) e siga os passos abaixo:

1. Clonar o Repositório

git clone https://github.com/RogerioJesuinoFR/sistema-reserva-estoque.git
cd sistema-reserva-estoque


2. Configurar e Iniciar o Servidor

O servidor utiliza o SQLite como banco de dados. Nenhuma configuração externa de SGBD é necessária, o arquivo do banco (database.sqlite) será criado automaticamente ao iniciar.

# Navegue até a pasta do servidor
cd servidor

# Instale as dependências necessárias
npm install

# Inicie o servidor
node server.js


Nota para usuários de Windows (PowerShell): Se ocorrer um erro informando que "a execução de scripts está desabilitada" ao rodar o npm install, execute o comando Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass e tente novamente.

Ao rodar node server.js, o terminal pedirá que você digite a porta (ex: 3000). Pressione Enter, e o servidor estará ativo aguardando conexões.

💻 Como Utilizar o Cliente (Frontend)

O cliente não necessita de instalação ou de servidores web para rodar, basta abrir o arquivo diretamente no navegador.

Navegue até a pasta /cliente no gerenciador de arquivos do seu sistema.

Dê um duplo clique no arquivo index.html (ou arraste-o para dentro do seu navegador).

Tela de Configuração: Logo na primeira tela, insira o IP e a Porta do servidor que deseja acessar.

Para testar na sua própria máquina: Use o IP 127.0.0.1 e a porta que você digitou no terminal.

Para testar com outro aluno: Insira o IP da máquina do seu colega e a porta do servidor dele.

Clique em "Testar Conexão e Entrar". Se o servidor estiver online, você será redirecionado para a área de Login/Cadastro.

🌐 Testando em Rede com Outros Alunos

O sistema foi arquitetado para interoperabilidade. Você pode usar o seu Cliente para acessar o Servidor de outro aluno, e vice-versa, graças ao cumprimento estrito do protocolo Swagger.

Para que outros acessem o seu servidor:

Mantenha o seu servidor rodando no terminal (node server.js).

Descubra o IP da sua máquina na rede local da faculdade:

No Windows, abra o terminal e digite ipconfig.

Procure pela linha Endereço IPv4 (ex: 192.168.0.15).

Informe esse IP e a porta que você escolheu para o seu colega ou professor digitar na tela inicial (index.html) do cliente deles.

⚙️ Tecnologias Utilizadas

Servidor:

Node.js & Express (Roteamento e API)

SQLite3 (Persistência de Dados em arquivo local)

CORS & UUID (Segurança e identificação única)

Cliente:

HTML5 & CSS3 (Design moderno focado em E-commerce)

JavaScript ES6 (Fetch API, manipulação de DOM e Storage local)

Autor: Rogério Jesuino Ferraz Rocha

Disciplina: Tecnologias Cliente-Servidor
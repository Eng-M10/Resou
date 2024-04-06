const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(cors()); // Habilitar CORS para a API HTTP

let recursos = [];

// Configuração do servidor WebSocket
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Permitir solicitações de qualquer origem
    methods: ['GET', 'POST'] // Permitir métodos GET e POST
  }
});

// Socket.io - Manipulação de eventos
io.on('connection', socket => {
  console.log('Novo cliente conectado');

  // Enviar lista de recursos para o cliente
  socket.emit('recursos', recursos);

  // Manipular evento de reservar recurso
  socket.on('reservarRecurso', id => {
    const recurso = recursos.find(r => r.id === id);
    if (recurso && recurso.disponivel) {
      recurso.disponivel = false;
      io.emit('recursos', recursos);
    }
  });

  // Manipular evento de devolver recurso
  socket.on('devolverRecurso', id => {
    const recurso = recursos.find(r => r.id === id);
    if (recurso && !recurso.disponivel) {
      recurso.disponivel = true;
      io.emit('recursos', recursos);
    }
  });
});

// Rotas da API HTTP
app.get('/', (req, res) => {
  res.send("Bem-vindo à API de gerenciamento de recursos");
});

// Listar todos os recursos
app.get('/recursos', (req, res) => {
  res.json(recursos);
});

// Adicionar um novo recurso
app.post('/recursos', (req, res) => {
  const { nome } = req.body;
  const novoRecurso = { id: recursos.length + 1, nome, disponivel: true };
  recursos.push(novoRecurso);
  res.status(201).json({ message: `${novoRecurso.nome} adicionado com sucesso!`, recurso: novoRecurso });
});

// Reservar um recurso pelo ID
app.put('/recursos/:id/reservar', (req, res) => {
  const id = parseInt(req.params.id);
  const recurso = recursos.find(r => r.id === id);
  if (recurso && recurso.disponivel) {
    recurso.disponivel = false;
    res.json({ message: `${recurso.nome} reservado com sucesso!`, recurso });
  } else {
    res.status(400).json({ message: 'Recurso não encontrado ou já reservado' });
  }
});

// Devolver um recurso pelo ID
app.put('/recursos/:id/devolver', (req, res) => {
  const id = parseInt(req.params.id);
  const recurso = recursos.find(r => r.id === id);
  if (recurso && !recurso.disponivel) {
    recurso.disponivel = true;
    res.json({ message: `${recurso.nome} devolvido com sucesso!`, recurso });
  } else {
    res.status(400).json({ message: 'Recurso não encontrado ou já disponível' });
  }
});

// Iniciar o servidor
server.listen(port, () => {
  console.log(`Servidor rodando em https://resources-2ndh.onrender.com:${port}`);
});

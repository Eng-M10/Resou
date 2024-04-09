const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressWs = require('express-ws');

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: true, // Permitir todas as origens
};

app.use(bodyParser.json());
app.use(cors(corsOptions)); // Habilitar CORS para a API HTTP

let recursos = [];
let reservas = {}; // Mapa de ID do recurso para ID do cliente que o reservou

// Inicialize o WebSocket no servidor Express
expressWs(app);

// Configuração do servidor WebSocket
app.ws('/ws', function (ws, req) {
  console.log('Novo cliente conectado');

  // Enviar lista de recursos para o cliente
  ws.send(JSON.stringify({ type: 'recursos', data: recursos }));

  // Manipular mensagem de reserva de recurso
  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);
    if (data.type === 'reservarRecurso') {
      const id = data.id;
      const recurso = recursos.find(r => r.id === id);
      if (recurso && recurso.disponivel) {
        recurso.disponivel = false;
        reservas[id] = ws.id; // Armazenar reserva associada ao ID do cliente
        // Enviar atualização para todos os clientes
        app.getWss().clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'recursos', data: recursos }));
          }
        });
      }
    } else if (data.type === 'devolverRecurso') {
      const id = data.id;
      const recurso = recursos.find(r => r.id === id);
      if (recurso && !recurso.disponivel && reservas[id] === ws.id) { // Verificar se o cliente atual reservou este recurso
        recurso.disponivel = true;
        delete reservas[id]; // Remover reserva associada ao ID do cliente
        // Enviar atualização para todos os clientes
        app.getWss().clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'recursos', data: recursos }));
          }
        });
      }
    }
  });
});

// Rotas da API HTTP
app.get('/', (req, res) => {
  res.send("Bem-vindo à API de gerenciamento de recursos em producao");
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
    reservas[id] = req.headers['x-client-id']; // Armazenar reserva associada ao ID do cliente
    res.json({ message: `${recurso.nome} reservado com sucesso!`, recurso });
  } else {
    res.status(400).json({ message: 'Recurso não encontrado ou já reservado' });
  }
});

// Devolver um recurso pelo ID
app.put('/recursos/:id/devolver', (req, res) => {
  const id = parseInt(req.params.id);
  const recurso = recursos.find(r => r.id === id);
  if (recurso && !recurso.disponivel && reservas[id] === req.headers['x-client-id']) { // Verificar se o cliente atual reservou este recurso
    recurso.disponivel = true;
    delete reservas[id]; // Remover reserva associada ao ID do cliente
    res.json({ message: `${recurso.nome} devolvido com sucesso!`, recurso });
  } else {
    res.status(400).json({ message: 'Recurso não encontrado ou não reservado por este cliente' });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

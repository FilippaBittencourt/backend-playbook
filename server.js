// server.js
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { encontrarUsuario } = require('./usuarios');
const { PrismaClient } = require('@prisma/client');

console.log('🔍 DATABASE_URL =', process.env.DATABASE_URL);

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

const allowedOrigins = ['http://localhost:8080', 'https://playbook-polar.vercel.app'];

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // permite requests sem origin (ex: Postman)
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('O CORS não permite acesso deste domínio.'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(bodyParser.json());

app.use(session({
  secret: 'segredoPolar',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // não usar "secure: true" sem HTTPS
}));

// LOGIN
app.post('/login', (req, res) => {
  const { login, senha } = req.body;
  const usuario = encontrarUsuario(login, senha);

  if (usuario) {
    req.session.usuario = usuario.login;
    return res.json({ sucesso: true });
  }

  res.status(401).json({ sucesso: false, mensagem: 'Login ou senha incorretos.' });
});

// VERIFICA AUTENTICAÇÃO
app.get('/verificar-autenticacao', (req, res) => {
  if (req.session.usuario) {
    return res.json({ autenticado: true, usuario: req.session.usuario });
  }
  res.json({ autenticado: false });
});

// LOGOUT
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ sucesso: true });
  });
});

// ATUALIZA conteúdo
app.put('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;
  const { valor, pai, ordem } = req.body;

  try {
    const resultado = await prisma.conteudo.upsert({
      where: { chave },
      update: { 
        valor, 
        pai, 
        ordem: ordem ?? undefined, 
        createdAt: new Date() // força atualização sempre que editar
      },
      create: { 
        chave, 
        valor, 
        pai, 
        ordem: ordem ?? 0,
        createdAt: new Date()
      },
    });

    res.json({ sucesso: true, resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao salvar o conteúdo' });
  }
});

// BUSCA conteúdo
app.get('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;

  try {
    const resultado = await prisma.conteudo.findUnique({
      where: { chave },
    });

    if (!resultado) {
      return res.status(404).json({ erro: 'Conteúdo não encontrado' });
    }

    res.json({ chave: resultado.chave, valor: resultado.valor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar o conteúdo' });
  }
});

// CRIA novo conteúdo
app.post('/conteudo', async (req, res) => {
  const { chave, valor, pai, ordem } = req.body;

  try {
    const existente = await prisma.conteudo.findUnique({
      where: { chave },
    });

    if (existente) {
      return res.status(400).json({ erro: 'Chave já existe. Use PUT para atualizar.' });
    }

    const novo = await prisma.conteudo.create({
      data: {
        chave,
        valor,
        pai: pai ?? null,
        ordem: ordem ?? 0,
        createdAt: new Date()
      },
    });

    res.status(201).json({ sucesso: true, conteudo: novo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar o conteúdo' });
  }
});

// LISTA todos os conteúdos (sem ordenação)
app.get('/conteudos', async (req, res) => {
  try {
    const conteudos = await prisma.conteudo.findMany();
    res.json(conteudos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar os conteúdos' });
  }
});

// DELETA conteúdo por chave (e filhos)
app.delete('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;

  try {
    const existente = await prisma.conteudo.findUnique({
      where: { chave },
    });

    if (!existente) {
      return res.status(404).json({ erro: 'Conteúdo não encontrado' });
    }

    // Deleta todos os filhos
    await prisma.conteudo.deleteMany({
      where: { pai: chave },
    });

    // Deleta o próprio conteúdo
    await prisma.conteudo.delete({
      where: { chave },
    });

    res.json({ sucesso: true, mensagem: `Conteúdo '${chave}' e seus filhos foram deletados com sucesso.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao deletar o conteúdo' });
  }
});

// Health check e teste de conexão ao banco
app.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send('🎉 Backend conectado ao DB com sucesso!');
  } catch (e) {
    console.error('❌ Erro de conexão com o DB:', e);
    res.status(500).send('❌ Falha na conexão com o DB');
  }
});

// INICIA O SERVIDOR
app.listen(PORT, () => {
  console.log(`🔐 Backend rodando em http://localhost:${PORT}`);
});
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
const PORT = process.env.PORT || 3001;

// Necessário em plataformas com proxy (Render) para cookies funcionarem corretamente
app.set('trust proxy', 1);

// Ajuste CORS: inclua aqui depois a URL do seu serviço no Render
const allowedOrigins = [
  'http://localhost:8080',
  'https://playbook-polar.vercel.app',
  // 'https://SEU-SERVICO.onrender.com'  // <- adicione a URL real do backend no Render
];

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

// Sessão: cookie seguro em produção (HTTPS no Render) + sameSite none
app.use(session({
  secret: process.env.SESSION_SECRET || 'segredoPolar',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
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

// ATUALIZA conteúdo (upsert)
app.put('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;
  const { valor, pai, ordem } = req.body;

  try {
    const dataToUpdate = {
      createdAt: new Date(),
    };

    if (valor !== undefined) dataToUpdate.valor = valor;
    if (pai !== undefined) dataToUpdate.pai = pai;
    if (ordem !== undefined) dataToUpdate.ordem = ordem;

    const resultado = await prisma.conteudo.upsert({
      where: { chave },
      update: dataToUpdate,
      create: {
        chave,
        valor: valor ?? "",
        pai: pai ?? null,
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

// BUSCA conteúdo por chave
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

// LISTA todos os conteúdos (ordenados por 'ordem' asc)
app.get('/conteudos', async (req, res) => {
  try {
    const conteudos = await prisma.conteudo.findMany({
      orderBy: { ordem: 'asc' }
    });
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

    await prisma.conteudo.deleteMany({ where: { pai: chave } });
    await prisma.conteudo.delete({ where: { chave } });

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

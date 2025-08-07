const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { encontrarUsuario } = require('./usuarios');
const { PrismaClient } = require('@prisma/client');
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Detecta se está em produção (ex: Railway)
const isProduction = process.env.NODE_ENV === 'production';

// Frontend permitido
const FRONTEND_ORIGIN = isProduction
  ? 'https://seu-front.vercel.app' // 🔁 Altere aqui para seu domínio real (ex: Vercel)
  : 'http://localhost:8080';

// Middlewares
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

app.use(bodyParser.json());

// Sessão com cookie de produção seguro
app.use(session({
  secret: 'segredoPolar',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction, // true em produção (HTTPS), false local
    sameSite: isProduction ? 'none' : 'lax', // 'none' para cross-site cookies
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
    res.clearCookie('connect.sid', {
      path: '/',
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction
    });
    res.json({ sucesso: true });
  });
});

// CRUD: Conteúdos
app.put('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;
  const { valor } = req.body;

  try {
    const resultado = await prisma.conteudo.upsert({
      where: { chave },
      update: { valor },
      create: { chave, valor },
    });
    res.json({ sucesso: true, resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao salvar o conteúdo' });
  }
});

app.get('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;
  try {
    const resultado = await prisma.conteudo.findUnique({ where: { chave } });
    if (!resultado) return res.status(404).json({ erro: 'Conteúdo não encontrado' });
    res.json({ chave: resultado.chave, valor: resultado.valor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar o conteúdo' });
  }
});

app.post('/conteudo', async (req, res) => {
  const { chave, valor } = req.body;
  try {
    const existente = await prisma.conteudo.findUnique({ where: { chave } });
    if (existente) return res.status(400).json({ erro: 'Chave já existe. Use PUT para atualizar.' });

    const novo = await prisma.conteudo.create({ data: { chave, valor } });
    res.status(201).json({ sucesso: true, conteudo: novo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar o conteúdo' });
  }
});

app.get('/conteudos', async (req, res) => {
  try {
    const conteudos = await prisma.conteudo.findMany({ orderBy: { chave: 'asc' } });
    res.json(conteudos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar os conteúdos' });
  }
});

app.delete('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;
  try {
    const existente = await prisma.conteudo.findUnique({ where: { chave } });
    if (!existente) return res.status(404).json({ erro: 'Conteúdo não encontrado' });

    await prisma.conteudo.delete({ where: { chave } });
    res.json({ sucesso: true, mensagem: `Conteúdo '${chave}' deletado com sucesso.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao deletar o conteúdo' });
  }
});

// Health Check
app.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send('🎉 Backend conectado ao DB com sucesso!');
  } catch (e) {
    console.error('Erro de conexão:', e);
    res.status(500).send('❌ Falha na conexão com o DB');
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🔐 Backend rodando em http://localhost:${PORT}`);
});

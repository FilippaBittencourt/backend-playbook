const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { encontrarUsuario } = require('./usuarios');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

console.log('🔍 DATABASE_URL =', process.env.DATABASE_URL);
const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

const IS_PROD = process.env.NODE_ENV === 'production';
const FRONT_ORIGIN = IS_PROD
  ? 'https://seu-dominio-frontend.com'
  : 'http://localhost:8080';

// Middlewares
app.use(cors({
  origin: FRONT_ORIGIN,
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'segredoPolar',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax'
  }
}));

// LOGIN
app.post('/login', (req, res) => {
  const { login, senha } = req.body;
  const usuario = encontrarUsuario(login, senha);

  if (usuario) {
    const token = uuidv4();

    req.session.usuario = usuario.login;
    req.session.token = token;

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return res.json({
      sucesso: true,
      token,
      usuario: usuario.login,
    });
  }

  res.status(401).json({ sucesso: false, mensagem: 'Login ou senha incorretos.' });
});

// 🔒 Middleware: exige cookie + sessão válidos
function requerAuth(req, res, next) {
  const tokenDoCookie = req.cookies?.authToken;
  const tokenDaSessao = req.session?.token;
  const usuario = req.session?.usuario;

  if (usuario && tokenDoCookie && tokenDaSessao && tokenDoCookie === tokenDaSessao) {
    return next();
  }
  return res.status(401).json({ autenticado: false, mensagem: 'Não autenticado' });
}

// LOGOUT
app.post('/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
  });
  req.session.destroy(() => {
    res.json({ sucesso: true });
  });
});

// 🔐 Rota protegida de teste
app.get('/segredo', requerAuth, (req, res) => {
  res.json({ ok: true, msg: `Olá, ${req.session.usuario}! Aqui é área protegida.` });
});

// ATUALIZA conteúdo
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

// BUSCA conteúdo
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

// CRIA novo conteúdo
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

// LISTA todos os conteúdos
app.get('/conteudos', async (req, res) => {
  try {
    const conteudos = await prisma.conteudo.findMany({ orderBy: { chave: 'asc' } });
    res.json(conteudos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar os conteúdos' });
  }
});

// DELETA conteúdo por chave
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

// Health check
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

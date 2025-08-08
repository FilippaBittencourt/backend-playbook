const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { encontrarUsuario } = require('./usuarios');
const { PrismaClient } = require('@prisma/client'); // Importado aqui em cima

console.log('🔍 DATABASE_URL =', process.env.DATABASE_URL);

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

// Middlewares
app.use(cors({
  origin: 'http://localhost:8080', // endereço do seu Vite
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
  const { valor, pai } = req.body;

  try {
    const resultado = await prisma.conteudo.upsert({
      where: { chave },
      update: { valor, pai },
      create: { chave, valor, pai },
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
  const { chave, valor, pai } = req.body;

  try {
    const existente = await prisma.conteudo.findUnique({
      where: { chave },
    });

    if (existente) {
      return res.status(400).json({ erro: 'Chave já existe. Use PUT para atualizar.' });
    }

    const novo = await prisma.conteudo.create({
      data: { chave, valor },
    });


    res.status(201).json({ sucesso: true, conteudo: novo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar o conteúdo' });
  }
});

// LISTA todos os conteúdos
app.get('/conteudos', async (req, res) => {
  try {
    const conteudos = await prisma.conteudo.findMany({
      orderBy: { chave: 'asc' } // opcional: ordena alfabeticamente
    });

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
    const existente = await prisma.conteudo.findUnique({
      where: { chave },
    });

    if (!existente) {
      return res.status(404).json({ erro: 'Conteúdo não encontrado' });
    }

    await prisma.conteudo.delete({
      where: { chave },
    });


    res.json({ sucesso: true, mensagem: `Conteúdo '${chave}' deletado com sucesso.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao deletar o conteúdo' });
  }
});


app.get('/', async (req, res) => {
  try {
    // Apenas um teste de conexão simples ao banco
    await prisma.$queryRaw`SELECT 1`;
    res.send('🎉 Backend conectado ao DB com sucesso!');
  } catch (e) {
    console.error('Erro de conexão:', e);
    res.status(500).send('❌ Falha na conexão com o DB');
  }
});

// Health check e teste de conexão ao banco
app.get('/', async (req, res) => {
  try {
    // Executa uma query simples só para testar a conexão
    await prisma.$queryRaw`SELECT 1`;
    res.send('🎉 Backend conectado ao DB com sucesso!');
  } catch (e) {
    console.error('❌ Erro de conexão com o DB:', e);
    res.status(500).send('❌ Falha na conexão com o DB');
  }
});

// INICIA O SERVIDOR (deve ficar por último!)
app.listen(PORT, () => {
  console.log(`🔐 Backend rodando em http://localhost:${PORT}`);
});
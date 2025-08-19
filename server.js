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

// ============ AUTENTICAÇÃO ============
app.post('/login', (req, res) => {
  const { login, senha } = req.body;
  const usuario = encontrarUsuario(login, senha);

  if (usuario) {
    req.session.usuario = usuario.login;
    return res.json({ sucesso: true });
  }

  res.status(401).json({ sucesso: false, mensagem: 'Login ou senha incorretos.' });
});

app.get('/verificar-autenticacao', (req, res) => {
  if (req.session.usuario) {
    return res.json({ autenticado: true, usuario: req.session.usuario });
  }
  res.json({ autenticado: false });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ sucesso: true });
  });
});

// ============ CONTEÚDO ============

// ATUALIZA (upsert) conteúdo por chave
app.put('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;
  const { valor, pai } = req.body;

  try {
    const resultado = await prisma.conteudo.upsert({
      where: { chave },
      update: { valor, pai: pai ?? null },
      create: { chave, valor, pai: pai ?? null }
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
      where: { chave }
    });

    if (!resultado) {
      return res.status(404).json({ erro: 'Conteúdo não encontrado' });
    }

    // devolve todos os campos úteis
    res.json({
      id: resultado.id,
      chave: resultado.chave,
      valor: resultado.valor,
      pai: resultado.pai,
      createdAt: resultado.createdAt,
      ordem: resultado.ordem
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar o conteúdo' });
  }
});

// CRIA novo conteúdo (com ordem sequencial por nível)
app.post('/conteudo', async (req, res) => {
  const { chave, valor, pai } = req.body;

  try {
    const existente = await prisma.conteudo.findUnique({
      where: { chave }
    });

    if (existente) {
      return res.status(400).json({ erro: 'Chave já existe. Use PUT para atualizar.' });
    }

    // calcula próxima ordem por nível (pai)
    let proximaOrdem = 0;
    if (pai ?? null) {
      const maior = await prisma.conteudo.aggregate({
        _max: { ordem: true },
        where: { pai: pai }
      });
      proximaOrdem = (maior._max.ordem ?? -1) + 1;
    } else {
      const maiorTopo = await prisma.conteudo.aggregate({
        _max: { ordem: true },
        where: { pai: null }
      });
      proximaOrdem = (maiorTopo._max.ordem ?? -1) + 1;
    }

    const novo = await prisma.conteudo.create({
      data: {
        chave,
        valor,
        pai: pai ?? null,
        ordem: proximaOrdem
      }
    });

    res.status(201).json({ sucesso: true, conteudo: novo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar o conteúdo' });
  }
});

// LISTA todos os conteúdos (ordenados por topo->createdAt) — preserva ordem de criação
app.get('/conteudos', async (req, res) => {
  try {
    const conteudos = await prisma.conteudo.findMany({
      orderBy: [
        { pai: 'asc' },        // agrupa topo (null) primeiro
        { createdAt: 'asc' }   // ordem de criação
      ]
    });
    res.json(conteudos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar os conteúdos' });
  }
});

// LISTA por pai (filhos) já ordenados — GET /conteudos-por-pai?pai=MINHA_SECAO
// Para topo, use sem ?pai= (ou ?pai=__null)
app.get('/conteudos-por-pai', async (req, res) => {
  try {
    const rawPai = req.query.pai;
    const where = (rawPai === undefined || rawPai === '' || rawPai === '__null')
      ? { pai: null }
      : { pai: String(rawPai) };

    const itens = await prisma.conteudo.findMany({
      where,
      orderBy: [
        { createdAt: 'asc' }, // ordem de criação
        { ordem: 'asc' }      // se quiser priorizar ordem manual, troque a sequência
      ]
    });

    res.json(itens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar por pai' });
  }
});

// (Opcional) MENU em árvore já ordenado — GET /menu
app.get('/menu', async (req, res) => {
  try {
    const todos = await prisma.conteudo.findMany({
      orderBy: [
        { createdAt: 'asc' },
        { ordem: 'asc' }
      ]
    });

    const porChave = new Map(todos.map(i => [i.chave, { ...i, filhos: [] }]));
    const raiz = [];

    for (const item of porChave.values()) {
      if (item.pai == null) {
        raiz.push(item);
      } else {
        const pai = porChave.get(item.pai);
        if (pai) {
          pai.filhos.push(item);
        } else {
          // órfãos (pai inexistente): mantém no topo para não perder
          raiz.push(item);
        }
      }
    }

    // garante ordenação consistente por nível
    const ordenar = (nodos) => {
      nodos.sort((a, b) => {
        if (a.ordem !== b.ordem) return a.ordem - b.ordem;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      nodos.forEach(n => ordenar(n.filhos));
    };
    ordenar(raiz);

    res.json(raiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao montar menu' });
  }
});

// DELETA conteúdo por chave (e filhos)
app.delete('/conteudo/:chave', async (req, res) => {
  const { chave } = req.params;

  try {
    const existente = await prisma.conteudo.findUnique({
      where: { chave }
    });

    if (!existente) {
      return res.status(404).json({ erro: 'Conteúdo não encontrado' });
    }

    // Deleta todos os filhos
    await prisma.conteudo.deleteMany({
      where: { pai: chave }
    });

    // Deleta o próprio conteúdo
    await prisma.conteudo.delete({
      where: { chave }
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

// Encerramento gracioso
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { encontrarUsuario } = require('./usuarios');

const app = express();
const PORT = 3001;

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

// INICIA O SERVIDOR
app.listen(PORT, () => {
  console.log(`🔐 Backend rodando em http://localhost:${PORT}`);
});

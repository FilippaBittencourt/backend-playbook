const usuarios = [
  { login: 'admin', senha: '4dm1nP0l4r!?' },
  { login: 'anyelle.santos@ambar.tech', senha: 'doq3K722Nj' },
  { login: 'caio.pacheco@ambar.tech', senha: 'zbR2f70TC7' },
  { login: 'chrystian.andrade@ambar.tech', senha: 'bH2B0r6FO7' },
  { login: 'deyvison.santos@ambar.tech', senha: 'm2s30Z2Liq'},
  { login: 'edilberto.rasche@ambar.tech', senha: 'j7Q6921wCr' },
  { login: 'edson.coura@ambar.tech', senha: 'hxXJ20C9x8' },
  { login: 'fabiano.lopez@ambar.tech', senha: 'dFeUU648X5'},
  { login: 'felipe.fabres@ambar.tech', senha: 'KW4i59aCye' },
  { login: 'fernando.silva@ambar.tech', senha: 'd4RkY06U97' },
  { login: 'filippa.bittencourt@ambar.tech', senha: 'miku3bM2r3' },
  { login: 'francisco.franciulli@ambar.tech', senha: '7oXQv6S42k' },
  { login: 'gabriel.naum@ambar.tech', senha: '5cDaE0yHB0' },
  { login: 'gustavo.lanzarini@ambar.tech', senha: 't5oVe7e6dk' },
  { login: 'heraldo.almeida@ambar.tech', senha: '24aCis6tei' },
  { login: 'jade.succhy@ambar.tech', senha: 'G2D55aQ8zu' },
  { login: 'joao.araujo@ambar.tech', senha: 'sjfopsW615' },
  { login: 'jorge.castro@ambar.tech', senha: 'u15h6O0cap' },
  { login: 'lais.vendrasco@ambar.tech', senha: 'hE1gg3h0m6' },
  { login: 'luana.domingues@ambar.tech', senha: 'hukKL765fY' },
  { login: 'luis.santos@ambar.tech', senha: 'KKg23866WG' },
  { login: 'pedro.nathan@ambar.tech', senha: 'E5Sc3A83SO' },
  { login: 'pedro.silva@ambar.tech', senha: 'bE9X731p46' },
  { login: 'priscila.dutra@ambar.tech', senha: '04m0fSjNuu' },
  { login: 'pryscilla.pequeno@ambar.tech', senha: '55Kv27YzHu' },
  { login: 'rafael.xerez@ambar.tech', senha: '1DOn7O99m9' },
  { login: 'robertt.amorim@ambar.tech', senha: 'pUC959iN8o' },
  { login: 'vitor.vitorello@ambar.tech', senha: 'AmnKEt6040' },
  { login: 'waldir.oliveira@ambar.tech', senha: 'Cdm7YC164t' },
];

function encontrarUsuario(login, senha) {
  return usuarios.find((u) => u.login === login && u.senha === senha);
}

module.exports = {
  usuarios,
  encontrarUsuario
};

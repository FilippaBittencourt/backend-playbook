const usuarios = [
  { login: 'admin', senha: 'adminPolar' },
  { login: 'renan_batista', senha: 'renanPolar2025!' },
  { login: 'felipe_fabres', senha: 'fePolar2025@' },
  { login: 'heraldo_almeida', senha: 'heraldoPolar2025#' },
  { login: 'waldir_oliveira', senha: 'waldirPolar2025$' },
  { login: 'gustavo_lanzarini', senha: 'gustavoPolar2025%' },
  { login: 'edson_coura', senha: 'edsonPolar2025*' },
  { login: 'jorge_castro', senha: 'jorgePolar2025?' },
  { login: 'robertt_amorim', senha: 'roberttPolar2025!' },
  { login: 'rafael_xerez', senha: 'rafaelPolar2025@' },
  { login: 'gabriel_naum', senha: 'gabrielPolar2025#' },
  { login: 'edilberto_rasche', senha: 'edilbertoPolar2025$' },
  { login: 'pryscilla_pequeno', senha: 'pryscillaPolar2025%' },
  { login: 'vitor_vitorello', senha: 'vitorPolar2025&' },
  { login: 'priscila_dutra', senha: 'priscillaPolar2025*' },
  { login: 'caio_pacheco', senha: 'caioPolar2025?' },
  { login: 'joao_araujo', senha: 'joaoPolar2025!' },
  { login: 'luis_santos', senha: 'luisPolar2025@' },
  { login: 'francisco_franciulli', senha: 'chicoPolar2025#' },
  { login: 'filippa', senha: 'ninipolar2025' }
];

function encontrarUsuario(login, senha) {
  return usuarios.find((u) => u.login === login && u.senha === senha);
}

module.exports = {
  usuarios,
  encontrarUsuario
};

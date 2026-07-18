export function makeAuth({ ready = true, perfis = [], permissoes = [] } = {}) {
  return {
    isReady: () => ready,
    hasPerfil: (nome) => perfis.includes(nome),
    hasPermission: (chave) => permissoes.includes(chave),
  };
}

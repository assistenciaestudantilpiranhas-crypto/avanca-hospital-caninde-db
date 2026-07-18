export const authUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "teste.auth@gsi.local",
};

export const validSession = {
  access_token: "TESTE_ACCESS_TOKEN",
  user: authUser,
};

export const usuarios = {
  ativo: {
    id: authUser.id,
    nome: "TESTE Usuario Ativo",
    email: authUser.email,
    categoria_profissional: "Médico",
    ativo: true,
  },
  inativo: {
    id: authUser.id,
    nome: "TESTE Usuario Inativo",
    email: authUser.email,
    categoria_profissional: "Recepção",
    ativo: false,
  },
};

export const perfis = {
  recepcao: { id: "perfil-recepcao", nome: "Recepção", descricao: "Recepção" },
  medico: { id: "perfil-medico", nome: "Médico", descricao: "Médico" },
  enfermeiro: { id: "perfil-enfermeiro", nome: "Enfermeiro", descricao: "Enfermeiro" },
};

export const permissoes = {
  pacienteCriar: {
    chave: "paciente.criar",
    modulo: "pacientes",
    descricao: "Cadastrar paciente",
  },
  consultaIniciar: {
    chave: "consulta.iniciar",
    modulo: "consulta",
    descricao: "Iniciar consulta",
  },
  consultaConduta: {
    chave: "consulta.registrar_conduta",
    modulo: "consulta",
    descricao: "Registrar conduta",
  },
};

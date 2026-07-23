export const securityUsers = {
  anonymous: { role: "anon", perfil: null, ativo: false, permissoes: [] },
  authenticatedWithoutProfile: { role: "authenticated", perfil: null, ativo: true, permissoes: [] },
  inactiveReception: {
    role: "authenticated",
    perfil: "Recepcao",
    ativo: false,
    permissoes: ["paciente.criar"],
  },
  reception: {
    role: "authenticated",
    perfil: "Recepcao",
    ativo: true,
    permissoes: ["paciente.criar", "atendimento.abrir"],
  },
  nurse: {
    role: "authenticated",
    perfil: "Enfermeiro",
    ativo: true,
    permissoes: [
      "triagem.classificar",
      "transferencia.confirmar_checklist",
      "transferencia.confirmar_saida",
    ],
  },
  doctor: {
    role: "authenticated",
    perfil: "Medico",
    ativo: true,
    permissoes: ["consulta.iniciar", "consulta.registrar_conduta", "transferencia.solicitar"],
  },
  admin: {
    role: "authenticated",
    perfil: "Administracao",
    ativo: true,
    permissoes: ["configuracoes.gerenciar"],
  },
};

export const expectedRolePolicies = {
  reception: ["pacientes_insert_recepcao_admin", "atendimentos_insert_recepcao_admin"],
  nurse: ["triagens_write_enfermagem_admin", "transferencias_update_regulacao_admin"],
  doctor: ["consultas_write_medico_admin", "transferencias_insert_medico_regulacao_admin"],
  admin: ["configuracoes_sistema_insert_admin", "configuracoes_sistema_update_admin"],
};

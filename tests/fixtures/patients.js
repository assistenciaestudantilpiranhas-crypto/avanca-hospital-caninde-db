export const patientLocal = {
  id: "local-p1",
  nome: "TESTE_PACIENTE_NOVO",
  nascimento: "10/05/1990",
  cpf: "111.222.333-44",
  sus: "700 0000 0000 001",
  telefone: "(79) 99999-0001",
  municipio: "Canindé de São Francisco",
  perfil: "Sede",
  queixa: "TESTE_QUEIXA",
  horaChegadaTs: Date.UTC(2026, 6, 19, 10, 0, 0),
};

export const patientReal = {
  id: "paciente-real-1",
  nome: "TESTE_PACIENTE_REAL",
  data_nascimento: "1990-05-10",
  cpf: "111.222.333-44",
  cartao_sus: "700 0000 0000 001",
  telefone: "(79) 99999-0001",
  municipio: "Canindé de São Francisco",
  perfil_residencia: "Sede",
};

export const otherPatientReal = {
  ...patientReal,
  id: "paciente-real-2",
  nome: "TESTE_OUTRO_PACIENTE_REAL",
  cpf: "99988877766",
};

const GsiApi = (() => {
  const STORAGE_PREFIX = "gsi_saude_";

  const initialData = {
    pacientes: [
      { id: "p1", nome: "Maria José da Silva", nascimento: "12/03/1974", cpf: "123.456.789-00", sus: "700 0000 0000 001", telefone: "(79) 90000-1001", municipio: "Canindé de São Francisco", queixa: "Dor torácica", classificacao: "Amarelo", status: "Aguardando consulta", perfil: "Residente de Canindé de São Francisco" },
      { id: "p2", nome: "João Victor Santos", nascimento: "21/08/2016", cpf: "234.567.891-00", sus: "700 0000 0000 002", telefone: "(79) 90000-1002", municipio: "Canindé de São Francisco", queixa: "Febre e tosse", classificacao: "Verde", status: "Aguardando triagem", perfil: "Residente de Canindé de São Francisco" },
      { id: "p3", nome: "Ana Clara Oliveira", nascimento: "05/11/1999", cpf: "345.678.912-00", sus: "700 0000 0000 003", telefone: "(79) 90000-1003", municipio: "Piranhas", queixa: "Dor abdominal", classificacao: "Laranja", status: "Em atendimento", perfil: "Residente de outro município" },
      { id: "p4", nome: "Pedro Henrique Lima", nascimento: "17/01/1988", cpf: "456.789.123-00", sus: "700 0000 0000 004", telefone: "(79) 90000-1004", municipio: "Poço Redondo", queixa: "Dor lombar", classificacao: "Azul", status: "Alta", perfil: "Residente de outro município", desfecho: "Alta após consulta" },
      { id: "p5", nome: "Raimundo Alves Ferreira", nascimento: "02/07/1957", cpf: "567.891.234-00", sus: "700 0000 0000 005", telefone: "(79) 90000-1005", municipio: "Canindé de São Francisco", queixa: "Mal-estar intenso", classificacao: "Vermelho", status: "Sala de estabilização", perfil: "Residente de povoado/zona rural", desfecho: "Sala de estabilização" },
      { id: "p6", nome: "Francisca Maria Santos", nascimento: "29/05/1966", cpf: "678.912.345-00", sus: "700 0000 0000 006", telefone: "(79) 90000-1006", municipio: "Canindé de São Francisco", queixa: "Tontura", classificacao: "Amarelo", status: "Em observação clínica", perfil: "Residente de Canindé de São Francisco", desfecho: "Observação Clínica" },
      { id: "p7", nome: "Patricia Oliveira", nascimento: "14/09/1994", cpf: "789.123.456-00", sus: "700 0000 0000 007", telefone: "(79) 90000-1007", municipio: "Canindé de São Francisco", queixa: "Dor baixo ventre, 32 semanas de gestação", classificacao: "Amarelo", status: "Em observação obstétrica", perfil: "Residente de Canindé de São Francisco" },
      { id: "p8", nome: "Carlos Roberto Andrade Souza", nascimento: "08/02/1979", cpf: "812.345.678-00", sus: "700 0000 0000 008", telefone: "(79) 90000-1008", municipio: "Piranhas", queixa: "Febre e mal-estar", classificacao: "Verde", status: "Alta", perfil: "Residente de outro município", desfecho: "Medicação e alta" },
      { id: "p9", nome: "Marta Helena Vasconcelos", nascimento: "23/06/1982", cpf: "823.456.789-00", sus: "700 0000 0000 009", telefone: "(79) 90000-1009", municipio: "Canindé de São Francisco", queixa: "Dor abdominal intensa", classificacao: "Laranja", status: "Transferência regulada", perfil: "Residente de Canindé de São Francisco", desfecho: "Transferência regulada" },
      { id: "p10", nome: "Eduardo Lima Bastos", nascimento: "30/09/1991", cpf: "834.567.891-00", sus: "700 0000 0000 010", telefone: "(79) 90000-1010", municipio: "Delmiro Gouveia", queixa: "Dor lombar", classificacao: "Amarelo", status: "Evasão/desistência", perfil: "Residente de outro município", desfecho: "Evasão/desistência" },
      { id: "p11", nome: "Beatriz Conceição Farias", nascimento: "11/04/1975", cpf: "845.678.912-00", sus: "700 0000 0000 011", telefone: "(79) 90000-1011", municipio: "Canindé de São Francisco", queixa: "Tontura e fraqueza", classificacao: "Amarelo", status: "Alta da observação", perfil: "Residente de Canindé de São Francisco", desfecho: "Alta da observação" }
    ],
    atendimentos: [
      { id: "a1", pacienteId: "p5", chegada: "07:42", profissional: "Dra. Camila Araujo", status: "Em atendimento", espera: "00:06", motivo: "Crise hipertensiva", local: "Zona rural", periodo: "Dia normal" },
      { id: "a2", pacienteId: "p3", chegada: "08:05", profissional: "Dr. Marcos Vieira", status: "Aguardando consulta", espera: "00:28", motivo: "Dor abdominal", local: "Centro", periodo: "Fim de semana" },
      { id: "a3", pacienteId: "p1", chegada: "08:18", profissional: "Enf. Joana Matos", status: "Aguardando consulta", espera: "00:35", motivo: "Dor torácica", local: "Centro", periodo: "Dia normal" },
      { id: "a4", pacienteId: "p6", chegada: "08:26", profissional: "Tec. Erick Gomes", status: "Em observação", espera: "00:48", motivo: "Outro", local: "Não informado", periodo: "Feriado" },
      { id: "a5", pacienteId: "p2", chegada: "08:52", profissional: "Enf. Paula Santos", status: "Aguardando triagem", espera: "00:12", motivo: "Febre", local: "Residência de familiar", periodo: "Dia normal" }
    ],
    chamadas: [],
    exames: [
      { id: "e1", pacienteId: "p3", paciente: "Ana Clara Oliveira", exame: "Hemograma completo", tipo: "Laboratorio", origem: "Consulta Médica", solicitante: "Dra. Camila Araujo", horario: "08:50", status: "Solicitado", prioridade: "Urgente", resultado: "Pendente" },
      { id: "e2", pacienteId: "p5", paciente: "Raimundo Alves Ferreira", exame: "Troponina", tipo: "Laboratorio", origem: "Sala de Estabilização", solicitante: "Dr. Marcos Vieira", horario: "09:05", status: "Em execucao", prioridade: "Emergência", resultado: "Pendente" },
      { id: "e3", pacienteId: "p1", paciente: "Maria José da Silva", exame: "Raio-X de torax", tipo: "Raio-X", origem: "Consulta Médica", solicitante: "Dra. Livia Ramos", horario: "09:18", status: "Solicitado", prioridade: "Urgente", resultado: "Aguardando imagem" }
    ],
    prescricoes: [
      { id: "rx1", paciente: "Helena Costa Menezes", medicamento: "Ceftriaxona", dose: "1g 12/12h", via: "EV", horario: "09:00", prescritor: "Dra. Camila Araujo", status: "Pendente" },
      { id: "rx2", paciente: "Mário Sérgio Nascimento", medicamento: "Dipirona", dose: "1g se dor", via: "EV", horario: "09:20", prescritor: "Dr. Marcos Vieira", status: "Separado" },
      { id: "rx3", paciente: "Renata Alves Prado", medicamento: "Salbutamol spray", dose: "4 jatos", via: "Inalatória", horario: "09:40", prescritor: "Dra. Livia Ramos", status: "Em falta" }
    ],
    transferencias: [
      { id: "t1", pacienteId: "p5", paciente: "Raimundo Alves Ferreira", motivo: "UTI", destino: "Propriá", status: "Aguardando vaga", acompanhante: "Enf. Joana Matos", checklist: "Completo", saida: "--", tipoTransporte: "Ambulância avançada/SAMU", usouAmbulancia: "Sim" },
      { id: "t2", pacienteId: "p7", paciente: "Patricia Oliveira", motivo: "Obstetricia", destino: "Aracaju", status: "Em analise", acompanhante: "Tec. Erick Gomes", checklist: "Pendente", saida: "--", tipoTransporte: "Ambulância básica", usouAmbulancia: "Sim" }
    ],
    estoque: [
      { id: "s1", nome: "Ceftriaxona 1g", quantidade: "18 amp", minimo: "25 amp", situacao: "Critico", validade: "10/2026", local: "Armário A2" },
      { id: "s2", nome: "Dipirona 1g/2ml", quantidade: "124 amp", minimo: "40 amp", situacao: "Adequado", validade: "02/2027", local: "Armário B1" },
      { id: "s3", nome: "Salbutamol spray", quantidade: "02 un", minimo: "12 un", situacao: "Critico", validade: "08/2026", local: "Prateleira P3" }
    ]
  };

  const key = (resource) => `${STORAGE_PREFIX}${resource}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  function ensure(resource) {
    if (!localStorage.getItem(key(resource))) {
      localStorage.setItem(key(resource), JSON.stringify(initialData[resource] || []));
    }
  }

  function mergeMissingSeed(resource) {
    const stored = list(resource);
    const storedIds = new Set(stored.map((item) => item.id));
    const missing = (initialData[resource] || []).filter((item) => !storedIds.has(item.id));
    if (missing.length) {
      save(resource, [...stored, ...missing]);
    }
  }

  function list(resource) {
    ensure(resource);
    return JSON.parse(localStorage.getItem(key(resource))) || [];
  }

  function save(resource, rows) {
    localStorage.setItem(key(resource), JSON.stringify(rows));
    return clone(rows);
  }

  function create(resource, item) {
    const rows = list(resource);
    const record = { id: item.id || uid(resource.slice(0, 2)), ...item };
    rows.unshift(record);
    save(resource, rows);
    return clone(record);
  }

  function update(resource, id, patch) {
    const rows = list(resource).map((item) => item.id === id ? { ...item, ...patch } : item);
    save(resource, rows);
    return clone(rows.find((item) => item.id === id));
  }

  function resetDemoData() {
    Object.keys(initialData).forEach((resource) => save(resource, initialData[resource]));
  }

  // Futuro backend:
  // Trocar estas funcoes por chamadas fetch/REST ou GraphQL autenticadas.
  // Aqui tambem entram integracoes futuras com banco de dados, API municipal,
  // faturamento SUS, RNDS e demais sistemas oficiais, sem alterar a camada visual.
  return {
    list,
    create,
    update,
    resetDemoData,
    seed() {
      Object.keys(initialData).forEach((resource) => {
        ensure(resource);
        mergeMissingSeed(resource);
      });
    }
  };
})();

GsiApi.seed();

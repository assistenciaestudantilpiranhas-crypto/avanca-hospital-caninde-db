import { describe, expect, it } from "vitest";
import { createPermissionChecker } from "../../src/permissions/permission-rules.js";
import { createTransferFlow } from "../../src/transfers/transfer-flow.js";
import { createTransferService } from "../../src/transfers/transfer-service.js";
import { makeAuth } from "../fixtures/permissions.js";
import {
  completeChecklist,
  incompleteChecklist,
  makeTables,
  makeTransfer,
  makeTransferRequest,
} from "../fixtures/transfers.js";
import { createMockSupabaseQuery, mockQueryError } from "../helpers/mock-supabase-query.js";

const NOW = "2026-07-19T12:00:00.000Z";

function allTransferAuth() {
  return makeAuth({
    permissoes: [
      "transferencia.solicitar",
      "transferencia.aprovar_vaga",
      "transferencia.confirmar_checklist",
      "transferencia.confirmar_saida",
    ],
  });
}

function setup({ tables = {}, auth = allTransferAuth() } = {}) {
  const mock = createMockSupabaseQuery(makeTables(tables));
  const permissions = createPermissionChecker(auth);
  const service = createTransferService(mock.client, { now: () => NOW });
  return { ...mock, flow: createTransferFlow({ transferService: service, permissions }) };
}

describe("transfer regulated integrated flow", () => {
  it("1. solicitacao valida cria transferencia com status inicial", async () => {
    const { flow, tables } = setup();
    const result = await flow.request(makeTransferRequest());
    expect(result.ok).toBe(true);
    expect(tables.transferencias.rows[0].status_id).toBe("transfer-status-analysis");
  });

  it("2. falta de destino bloqueia criacao", async () => {
    const { flow, tables } = setup();
    await expect(flow.request(makeTransferRequest({ destino: "" }))).rejects.toThrow("Destino");
    expect(tables.transferencias.rows).toHaveLength(0);
  });

  it("3. falta de atendimento real interrompe fluxo", async () => {
    const { flow } = setup();
    await expect(flow.request(makeTransferRequest({ atendimentoId: null }))).rejects.toThrow(
      "Atendimento real"
    );
  });

  it("4. aprovacao de vaga atualiza status", async () => {
    const { flow, tables } = setup({ tables: { transferencias: { rows: [makeTransfer()] } } });
    await flow.approve("transfer-1");
    expect(tables.transferencias.rows[0].status_id).toBe("transfer-status-approved");
  });

  it("5. aprovacao duplicada nao duplica operacao", async () => {
    const { flow, tables } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    const result = await flow.approve("transfer-1");
    expect(result.idempotent).toBe(true);
    expect(tables.transferencias.rows).toHaveLength(1);
  });

  it("6. checklist incompleto bloqueia saida", async () => {
    const { flow } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    await expect(
      flow.depart({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: incompleteChecklist(),
      })
    ).rejects.toThrow("Checklist incompleto");
  });

  it("7. checklist completo permite saida", async () => {
    const { flow } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    await expect(
      flow.depart({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: completeChecklist(),
      })
    ).resolves.toMatchObject({ ok: true });
  });

  it("8. confirmacao de saida conclui transferencia e preenche hora_saida_ts", async () => {
    const { flow, tables } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    await flow.depart({
      transferenciaId: "transfer-1",
      atendimentoId: "attendance-1",
      checklist: completeChecklist(),
    });
    expect(tables.transferencias.rows[0].status_id).toBe("transfer-status-done");
    expect(tables.transferencias.rows[0].hora_saida_ts).toBe(NOW);
  });

  it("9. atendimento apos saida recebe desfecho regulado", async () => {
    const { flow, tables } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    await flow.depart({
      transferenciaId: "transfer-1",
      atendimentoId: "attendance-1",
      checklist: completeChecklist(),
    });
    expect(tables.atendimentos.rows[0]).toMatchObject({
      status_id: "attendance-status-outcome",
      desfecho_id: "outcome-transfer",
      hora_desfecho_ts: NOW,
    });
  });

  it("10. etapa e setor finais ficam corretos", async () => {
    const { flow, tables } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    await flow.depart({
      transferenciaId: "transfer-1",
      atendimentoId: "attendance-1",
      checklist: completeChecklist(),
    });
    expect(tables.atendimentos.rows[0].etapa_atual).toBe("Transferencia concluida");
    expect(tables.atendimentos.rows[0].setor_atual).toBe("Transferencia regulada");
  });

  it("11. saida sem vaga aprovada e bloqueada", async () => {
    const { flow } = setup({ tables: { transferencias: { rows: [makeTransfer()] } } });
    await expect(
      flow.depart({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: completeChecklist(),
      })
    ).rejects.toThrow("Vaga");
  });

  it("12. saida sem checklist e bloqueada", async () => {
    const { flow } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
      },
    });
    await expect(
      flow.depart({ transferenciaId: "transfer-1", atendimentoId: "attendance-1", checklist: {} })
    ).rejects.toThrow("Checklist incompleto");
  });

  it("13. usuario sem permissao nao executa acao", async () => {
    const { flow, tables } = setup({ auth: makeAuth() });
    await expect(flow.request(makeTransferRequest())).rejects.toThrow("sem permissao");
    expect(tables.transferencias.rows).toHaveLength(0);
  });

  it("14. regulacao pode aprovar conforme regra atual", async () => {
    const { flow } = setup({
      auth: makeAuth({ permissoes: ["transferencia.aprovar_vaga"] }),
      tables: { transferencias: { rows: [makeTransfer()] } },
    });
    await expect(flow.approve("transfer-1")).resolves.toMatchObject({ ok: true });
  });

  it("15. enfermeiro pode confirmar checklist conforme regra atual", async () => {
    const { flow } = setup({
      auth: makeAuth({ permissoes: ["transferencia.confirmar_checklist"] }),
      tables: { transferencias: { rows: [makeTransfer()] } },
    });
    await expect(flow.checklist("transfer-1", completeChecklist())).resolves.toMatchObject({
      ok: true,
    });
  });

  it("16. perfil nao autorizado e bloqueado", async () => {
    const { flow } = setup({ auth: makeAuth({ perfis: ["Tecnico em Enfermagem"] }) });
    await expect(flow.approve("transfer-1")).rejects.toThrow("sem permissao");
  });

  it("17. erro ao criar solicitacao interrompe fluxo", async () => {
    const { flow, tables } = setup({
      tables: { transferencias: { rows: [], insertError: mockQueryError("criacao falhou") } },
    });
    await expect(flow.request(makeTransferRequest())).rejects.toThrow("criacao falhou");
    expect(tables.atendimentos.rows[0].status_id).toBe("attendance-status-transfer");
  });

  it("18. erro ao aprovar vaga nao avanca para checklist", async () => {
    const { flow, tables } = setup({
      tables: {
        transferencias: { rows: [makeTransfer()], updateError: mockQueryError("aprovar falhou") },
      },
    });
    await expect(
      flow.runComplete({
        requestPayload: makeTransferRequest(),
        checklistPayload: completeChecklist(),
      })
    ).rejects.toThrow("aprovar falhou");
    expect(tables.checklist_transferencia_itens.rows).toHaveLength(0);
  });

  it("19. erro ao persistir checklist nao confirma saida", async () => {
    const { flow, tables } = setup({
      tables: {
        checklist_transferencia_itens: {
          rows: [],
          insertError: mockQueryError("checklist falhou"),
        },
      },
    });
    await expect(
      flow.runComplete({
        requestPayload: makeTransferRequest(),
        checklistPayload: completeChecklist(),
      })
    ).rejects.toThrow("checklist falhou");
    expect(tables.transferencias.rows[0].hora_saida_ts).toBeUndefined();
  });

  it("20. erro ao atualizar transferencia na saida nao conclui atendimento", async () => {
    const { flow, tables } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
          updateError: mockQueryError("saida falhou"),
        },
      },
    });
    await expect(
      flow.depart({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: completeChecklist(),
      })
    ).rejects.toThrow("saida falhou");
    expect(tables.atendimentos.rows[0].desfecho_id).toBeUndefined();
  });

  it("21. transferencia atualizada mas atendimento falha retorna falha parcial", async () => {
    const { flow } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
          ],
        },
        atendimentos: {
          rows: [{ id: "attendance-1" }],
          updateError: mockQueryError("atendimento falhou"),
        },
      },
    });
    const result = await flow.depart({
      transferenciaId: "transfer-1",
      atendimentoId: "attendance-1",
      checklist: completeChecklist(),
    });
    expect(result.ok).toBe(false);
    expect(result.falhaParcial).toBe(true);
  });

  it("22. chamada repetida de saida gera erro controlado", async () => {
    const { flow } = setup({
      tables: {
        transferencias: {
          rows: [
            makeTransfer({
              status_id: "transfer-status-done",
              hora_aprovacao_vaga_ts: NOW,
              hora_saida_ts: NOW,
            }),
          ],
        },
      },
    });
    await expect(
      flow.depart({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: completeChecklist(),
      })
    ).rejects.toThrow("concluida");
  });

  it("23. id local sem id Supabase gera erro claro", async () => {
    const { flow } = setup();
    await expect(flow.approve(null)).rejects.toThrow("Transferencia real");
  });

  it("24. atendimento encerrado impede nova conclusao indevida", async () => {
    const { flow } = setup({ tables: { transferencias: { rows: [] } } });
    await expect(
      flow.request(
        makeTransferRequest({ horaDesfechoTs: NOW, statusAtendimentoCodigo: "desfecho_registrado" })
      )
    ).rejects.toThrow("encerrado");
  });

  it("25. payload incompleto gera erro controlado", async () => {
    const { flow } = setup();
    await expect(flow.request({ atendimentoId: "attendance-1" })).rejects.toThrow("Paciente");
  });
});

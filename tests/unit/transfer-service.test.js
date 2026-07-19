import { describe, expect, it } from "vitest";
import { createTransferService } from "../../src/transfers/transfer-service.js";
import { createMockSupabaseQuery, mockQueryError } from "../helpers/mock-supabase-query.js";
import {
  completeChecklist,
  incompleteChecklist,
  makeTables,
  makeTransfer,
  makeTransferRequest,
} from "../fixtures/transfers.js";

const NOW = "2026-07-19T12:00:00.000Z";

function setup(overrides = {}) {
  const mock = createMockSupabaseQuery(makeTables(overrides));
  return { ...mock, service: createTransferService(mock.client, { now: () => NOW }) };
}

describe("transfer service", () => {
  it("localiza status de transferencia", async () => {
    const { service } = setup();
    await expect(service.findTransferStatus("em_analise")).resolves.toMatchObject({
      id: "transfer-status-analysis",
    });
  });

  it("falha quando status de transferencia nao existe", async () => {
    const { service } = setup();
    await expect(service.findTransferStatus("inexistente")).rejects.toThrow(
      "Status de transferencia"
    );
  });

  it("localiza status de atendimento", async () => {
    const { service } = setup();
    await expect(service.findAttendanceStatus("desfecho_registrado")).resolves.toMatchObject({
      id: "attendance-status-outcome",
    });
  });

  it("localiza desfecho transferencia_regulada", async () => {
    const { service } = setup();
    await expect(service.findOutcome("transferencia_regulada")).resolves.toMatchObject({
      id: "outcome-transfer",
    });
  });

  it("insere solicitacao e atualiza atendimento", async () => {
    const { service, tables } = setup();
    const result = await service.requestTransfer(makeTransferRequest());
    expect(result.ok).toBe(true);
    expect(tables.transferencias.rows).toHaveLength(1);
    expect(tables.atendimentos.rows[0].status_id).toBe("attendance-status-transfer");
  });

  it("retorna falha parcial se atendimento falha apos solicitacao", async () => {
    const { service, tables } = setup({
      atendimentos: {
        rows: [{ id: "attendance-1" }],
        updateError: mockQueryError("atendimento falhou"),
      },
    });
    const result = await service.requestTransfer(makeTransferRequest());
    expect(result.ok).toBe(false);
    expect(result.falhaParcial).toBe(true);
    expect(tables.transferencias.rows).toHaveLength(1);
  });

  it("propaga erro ao inserir solicitacao", async () => {
    const { service } = setup({
      transferencias: { rows: [], insertError: mockQueryError("insert falhou") },
    });
    await expect(service.requestTransfer(makeTransferRequest())).rejects.toThrow("insert falhou");
  });

  it("aprova vaga", async () => {
    const { service, tables } = setup({ transferencias: { rows: [makeTransfer()] } });
    const result = await service.approveVacancy("transfer-1");
    expect(result.ok).toBe(true);
    expect(tables.transferencias.rows[0].status_id).toBe("transfer-status-approved");
    expect(tables.transferencias.rows[0].hora_aprovacao_vaga_ts).toBe(NOW);
  });

  it("aprovacao duplicada e idempotente", async () => {
    const { service, tables } = setup({
      transferencias: {
        rows: [
          makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
        ],
      },
    });
    const result = await service.approveVacancy("transfer-1");
    expect(result.idempotent).toBe(true);
    expect(tables.transferencias.rows).toHaveLength(1);
  });

  it("propaga erro ao aprovar vaga", async () => {
    const { service } = setup({
      transferencias: { rows: [makeTransfer()], updateError: mockQueryError("aprovacao falhou") },
    });
    await expect(service.approveVacancy("transfer-1")).rejects.toThrow("aprovacao falhou");
  });

  it("confirma checklist completo", async () => {
    const { service, tables } = setup({
      transferencias: { rows: [makeTransfer({ status_id: "transfer-status-approved" })] },
    });
    const result = await service.confirmChecklist("transfer-1", completeChecklist());
    expect(result.ok).toBe(true);
    expect(tables.checklist_transferencia_itens.rows.length).toBeGreaterThan(0);
    expect(tables.transferencias.rows[0].checklist_confirmado_em).toBe(NOW);
  });

  it("bloqueia checklist incompleto", async () => {
    const { service } = setup();
    await expect(service.confirmChecklist("transfer-1", incompleteChecklist())).rejects.toThrow(
      "Checklist incompleto"
    );
  });

  it("propaga erro nos itens do checklist", async () => {
    const { service } = setup({
      checklist_transferencia_itens: { rows: [], insertError: mockQueryError("itens falharam") },
    });
    await expect(service.confirmChecklist("transfer-1", completeChecklist())).rejects.toThrow(
      "itens falharam"
    );
  });

  it("confirma saida e atualiza atendimento", async () => {
    const { service, tables } = setup({
      transferencias: {
        rows: [
          makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
        ],
      },
    });
    const result = await service.confirmDeparture({
      transferenciaId: "transfer-1",
      atendimentoId: "attendance-1",
      checklist: completeChecklist(),
    });
    expect(result.ok).toBe(true);
    expect(tables.transferencias.rows[0].status_id).toBe("transfer-status-done");
    expect(tables.atendimentos.rows[0].status_id).toBe("attendance-status-outcome");
  });

  it("bloqueia saida sem checklist", async () => {
    const { service } = setup({
      transferencias: {
        rows: [
          makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
        ],
      },
    });
    await expect(
      service.confirmDeparture({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: incompleteChecklist(),
      })
    ).rejects.toThrow("Checklist incompleto");
  });

  it("propaga erro ao atualizar transferencia na saida", async () => {
    const { service } = setup({
      transferencias: {
        rows: [
          makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
        ],
        updateError: mockQueryError("saida falhou"),
      },
    });
    await expect(
      service.confirmDeparture({
        transferenciaId: "transfer-1",
        atendimentoId: "attendance-1",
        checklist: completeChecklist(),
      })
    ).rejects.toThrow("saida falhou");
  });

  it("retorna falha parcial se atendimento falha apos saida", async () => {
    const { service, tables } = setup({
      transferencias: {
        rows: [
          makeTransfer({ status_id: "transfer-status-approved", hora_aprovacao_vaga_ts: NOW }),
        ],
      },
      atendimentos: {
        rows: [{ id: "attendance-1" }],
        updateError: mockQueryError("desfecho falhou"),
      },
    });
    const result = await service.confirmDeparture({
      transferenciaId: "transfer-1",
      atendimentoId: "attendance-1",
      checklist: completeChecklist(),
    });
    expect(result.ok).toBe(false);
    expect(result.falhaParcial).toBe(true);
    expect(tables.transferencias.rows[0].status_id).toBe("transfer-status-done");
  });
});

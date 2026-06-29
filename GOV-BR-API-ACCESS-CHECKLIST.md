# GOV-BR-API-ACCESS-CHECKLIST.md

## 1. Objetivo do checklist

Este documento organiza as informações institucionais, técnicas, operacionais e de segurança necessárias antes de solicitar acesso a APIs governamentais, iniciando pelo CNS/CADSUS, em complemento ao roadmap `GOV-BR-API-ROADMAP.md`.

Importante:

- Este checklist **não autoriza** integração imediata.
- Este checklist **não substitui** os manuais oficiais do DATASUS/gov.br.
- Requisitos específicos devem ser confirmados no **Portal de Serviços DATASUS**.
- **Nenhuma credencial, certificado ou chave** deve ser registrada neste repositório.

---

## 2. Identificação institucional

| Campo | Valor | Status | Observação |
|---|---|---|---|
| Nome do estabelecimento | | Pendente | |
| CNES | | Pendente | |
| CNPJ | | Pendente | |
| Município/UF | | Pendente | |
| Telefone institucional | | Pendente | |
| E-mail institucional | | Pendente | |
| Secretaria ou órgão responsável | | Pendente | |
| Natureza jurídica, se exigida | | Pendente | A confirmar no Portal de Serviços DATASUS |
| Situação do estabelecimento no CNES | | Pendente | A confirmar no Portal de Serviços DATASUS |
| Observações | | — | |
| Responsável pela informação | | Pendente | |

---

## 3. Responsável institucional / gestor

| Campo | Valor | Status | Pendência |
|---|---|---|---|
| Nome completo | | Pendente | |
| CPF ou CNS | | Pendente | |
| Cargo/função | | Pendente | |
| E-mail institucional | | Pendente | |
| Telefone | | Pendente | |
| Órgão/setor | | Pendente | |
| Confirmação de vínculo no CNES | | Pendente | A confirmar no Portal de Serviços DATASUS |
| Documento de designação, se exigido | | Pendente | A confirmar no Portal de Serviços DATASUS |
| Responsável pela solicitação | | Pendente | |

**Observação:** a exigência de vínculo formal, documento de designação ou perfil específico de gestor deve ser confirmada no Portal de Serviços DATASUS.

---

## 4. Certificado digital

| Campo | Valor | Status |
|---|---|---|
| Tipo de certificado (`.cer` ou A1 `.pfx`) | | A confirmar no Portal de Serviços DATASUS |
| Titular do certificado | | Pendente |
| CPF/CNPJ do titular | | Pendente |
| Validade | | Pendente |
| Estabelecimento vinculado | | Pendente |
| Responsável pela custódia | | Pendente |
| Local seguro de armazenamento | | Pendente |
| Data de emissão | | Pendente |
| Data de vencimento | | Pendente |
| Ambiente de uso (homologação/produção) | | Pendente |
| Status | | Pendente |

**Observações obrigatórias:**

- Não armazenar chave privada no repositório.
- Não versionar arquivo `.pfx`.
- Não expor senha de certificado.
- Não colocar certificado no front-end.
- Certificados e senhas devem ficar em ambiente seguro, fora do Git (cofre de segredos ou equivalente).
- Requisitos específicos do tipo de certificado exigido devem ser confirmados no Portal de Serviços DATASUS.

---

## 5. Sistema solicitante

| Campo | Valor |
|---|---|
| Nome do sistema | GSI ONE |
| Ecossistema | GSI HealthTech |
| Programa/case | Avança Hospital |
| Versão do sistema | A confirmar internamente |
| Linguagem predominante | HTML, CSS, JavaScript (front-end estático); Supabase (banco/backend) |
| Arquitetura | A confirmar/documentar antes da solicitação |
| Banco de dados | Supabase (PostgreSQL) |
| Versão do banco | A confirmar no ambiente Supabase |
| URL da aplicação / ambiente | A confirmar (produção, homologação ou local) |
| Ambiente (desenvolvimento/homologação/produção) | Pendente de definição |
| Faixa de IP público, se exigida | A confirmar no Portal de Serviços DATASUS |
| Responsável técnico | Pendente |
| E-mail técnico | Pendente |
| Telefone técnico | Pendente |
| Repositório privado/público, se aplicável | Pendente de confirmação institucional |
| Observações | — |

**Orientação obrigatória:** o front-end do GSI ONE não deve consumir diretamente APIs governamentais. Deve existir backend intermediário ou serviço seguro responsável por toda comunicação externa.

---

## 6. Uso previsto da integração

| Campo | Valor |
|---|---|
| API/sistema solicitado | |
| Finalidade da integração | |
| Módulo do GSI ONE impactado | |
| Tipo de operação (consulta/validação/envio/recebimento) | |
| Tipo de dado envolvido | |
| Base legal/finalidade assistencial ou administrativa | |
| Quantidade mínima de atendimentos/dia | |
| Quantidade máxima de atendimentos/dia | |
| Quantidade estimada de acessos no pico | |
| Períodos de maior acesso | |
| Data estimada de início | |
| Data estimada de fim, se aplicável | |
| Responsável pela justificativa | |
| Status | Pendente |

### CNS/CADSUS

**Finalidade provável:**

- Validação cadastral do paciente.
- Qualificação do cadastro do usuário no Cadastro de Pacientes do GSI ONE.
- Apoio à identificação do usuário SUS.

**Detalhes operacionais (volume de consultas, limites de requisição, SLA, formato de resposta):** A confirmar no Portal de Serviços DATASUS.

---

## 7. Homologação

| Item | Status |
|---|---|
| Solicitação de homologação enviada | Pendente |
| Protocolo da solicitação | Pendente |
| Credencial de homologação aprovada | Pendente |
| Ambiente de homologação configurado | Pendente |
| Certificado de homologação validado, se exigido | A confirmar no Portal de Serviços DATASUS |
| Testes realizados | Pendente |
| Evidência de Request salva | Pendente |
| Evidência de Response salva | Pendente |
| Evidências em PDF ou PNG | Pendente |
| Data dos testes | Pendente |
| Responsável pelos testes | Pendente |
| Resultado dos testes | Pendente |
| Pendências encontradas | Pendente |
| Aprovação para solicitar produção | Pendente |

**Observação:** as evidências de teste não devem conter dados reais de pacientes sem autorização institucional e finalidade definida. Utilizar exclusivamente dados fictícios em ambiente de homologação, salvo autorização formal em contrário.

---

## 8. Produção

| Item | Status |
|---|---|
| Solicitação de produção enviada | Pendente |
| Evidências de homologação anexadas | Pendente |
| Aprovação recebida | Pendente |
| Credencial de produção recebida | Pendente |
| Certificado de produção validado, se exigido | A confirmar no Portal de Serviços DATASUS |
| Data de início de uso em produção | Pendente |
| Responsável institucional pela produção | Pendente |
| Responsável técnico pela produção | Pendente |
| Plano de contingência | Pendente |
| Plano de revogação de credencial | Pendente |
| Monitoramento ativo | Pendente |
| Status | Pendente |

**Alerta:** a produção só deve ser ativada após autorização institucional formal, validação de segurança da informação e confirmação das regras oficiais vigentes no Portal de Serviços DATASUS.

---

## 9. Segurança e LGPD

- [ ] Credenciais fora do front-end.
- [ ] Certificado fora do repositório.
- [ ] Chave privada fora do Git.
- [ ] Token não exposto no navegador.
- [ ] Senhas em cofre seguro ou variável de ambiente protegida (fora do versionamento).
- [ ] Backend intermediário obrigatório implementado.
- [ ] Log interno de consulta implementado.
- [ ] Finalidade da consulta registrada em log.
- [ ] Controle de acesso por perfil de usuário.
- [ ] Auditoria preservada.
- [ ] Princípio de menor privilégio aplicado.
- [ ] Registro de quem consultou.
- [ ] Registro de quando consultou.
- [ ] Registro de qual finalidade da consulta.
- [ ] Política de retenção de logs definida.
- [ ] Revisão pelo responsável LGPD/DPO ou equivalente realizada.
- [ ] Plano de resposta a incidente definido.
- [ ] Proibição de uso de dados reais em ambiente de teste sem autorização, formalizada.

---

## 10. Pendências

| Item | Descrição | Responsável | Prazo | Status | Observação |
|---|---|---|---|---|---|
| 1 | Confirmar requisitos atualizados no Portal de Serviços DATASUS | Pendente | Pendente | Pendente | |
| 2 | Confirmar documentação oficial CNS/CADSUS | Pendente | Pendente | Pendente | |
| 3 | Confirmar tipo de certificado exigido | Pendente | Pendente | Pendente | A confirmar no Portal de Serviços DATASUS |
| 4 | Confirmar necessidade de CNES ativo | Pendente | Pendente | Pendente | |
| 5 | Confirmar responsável institucional aceito | Pendente | Pendente | Pendente | |
| 6 | Confirmar ambiente de homologação | Pendente | Pendente | Pendente | |
| 7 | Confirmar critérios para produção | Pendente | Pendente | Pendente | A confirmar no Portal de Serviços DATASUS |
| 8 | Confirmar política de logs | Pendente | Pendente | Pendente | |
| 9 | Confirmar responsável LGPD/DPO ou equivalente | Pendente | Pendente | Pendente | |
| 10 | Confirmar se há necessidade de ofício institucional | Pendente | Pendente | Pendente | A confirmar no Portal de Serviços DATASUS |

---

## 11. Ordem prática recomendada

1. Validar CNES e dados institucionais.
2. Identificar responsável institucional.
3. Identificar responsável técnico.
4. Levantar documentação oficial atualizada.
5. Confirmar exigência de certificado digital.
6. Preparar ambiente de homologação.
7. Definir backend intermediário.
8. Definir logs e auditoria.
9. Solicitar homologação.
10. Executar testes.
11. Salvar evidências.
12. Solicitar produção.
13. Validar produção com monitoramento.
14. Registrar política de uso e revisão periódica.

---

## 12. Observação final

Este checklist é preparatório e deve ser revisado antes de qualquer solicitação formal. A integração com APIs governamentais deve respeitar a LGPD, o sigilo assistencial, as normas do DATASUS/gov.br, as políticas internas da instituição e a autorização formal do gestor responsável.

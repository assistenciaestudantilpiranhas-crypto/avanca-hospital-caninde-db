-- Migration: renomear perfis para a nomenclatura oficial - GSI ONE
-- Etapa de consolidacao de perfis oficiais. Apenas renomeia perfis_acesso.nome
-- (UPDATE), preservando id, permissoes vinculadas (perfil_permissao) e
-- usuarios vinculados (usuario_perfil) - ambas as tabelas referenciam
-- perfil_id (uuid), nunca o nome, logo nenhum vinculo e afetado.
-- Nao cria, nao apaga, nao duplica perfis. Nao altera permissoes nem
-- usuarios. Nao altera RLS nem auth.users. Nao roda nesta fase - apenas
-- criada, para aplicacao posterior autorizada.
--
-- Renomeacoes:
--   Enfermagem               -> Tecnico em Enfermagem
--   Diagnóstico/Exames       -> Tecnico em RX
--   Regulação/Transferências -> Regulação de Transferência
--
-- perfis_acesso.nome tem constraint UNIQUE (migration 20260623100004_acesso.sql,
-- linha 5). Cada UPDATE abaixo só executa se: (a) o nome antigo existir, e
-- (b) o nome novo ainda NAO existir - evita tanto falha por violação de
-- UNIQUE quanto duplicidade lógica. Idempotente: se já tiver sido aplicada
-- (nome antigo não existe mais), a migration não faz nada e não falha.
--
-- TODO (fase posterior, fora do escopo desta migration): as seguintes
-- funcoes/policies de RLS comparam o NOME do perfil como string literal e
-- precisarao ser atualizadas (CREATE OR REPLACE) para os novos nomes na
-- mesma janela em que o frontend (script.js) for atualizado - caso
-- contrario, usuarios desses perfis perdem acesso silenciosamente entre a
-- aplicacao desta migration e a atualizacao da RLS/frontend:
--   - supabase/migrations/20260623100012_rls_policies.sql:
--       has_perfil('Enfermagem')               (linhas 343, 349, 380, 408, 409, 435, 436, 453, 454)
--       has_perfil('Regulação/Transferências')  (linhas 345, 351)
--   - supabase/migrations/20260623100015_regras_fluxo_assistencial.sql:
--       has_perfil('Enfermagem')               (linhas 24, 31, 150)
--       has_perfil('Regulação/Transferências')  (linhas 26, 33)
--   - has_perfil('Diagnóstico/Exames'): nenhuma ocorrencia encontrada em
--     RLS - todo o gate de exames usa has_permission(), nao o nome do
--     perfil diretamente, entao este caso nao tem pendencia de RLS.

do $$
begin
  if exists (select 1 from public.perfis_acesso where nome = 'Enfermagem')
     and not exists (select 1 from public.perfis_acesso where nome = 'Técnico em Enfermagem')
  then
    update public.perfis_acesso
    set nome = 'Técnico em Enfermagem'
    where nome = 'Enfermagem';
  elsif exists (select 1 from public.perfis_acesso where nome = 'Técnico em Enfermagem') then
    raise notice 'renomear_perfis_oficiais: perfil "Técnico em Enfermagem" ja existe - nenhuma alteracao feita (idempotente).';
  else
    raise notice 'renomear_perfis_oficiais: perfil "Enfermagem" nao encontrado - nenhuma alteracao feita.';
  end if;
end $$;

do $$
begin
  if exists (select 1 from public.perfis_acesso where nome = 'Diagnóstico/Exames')
     and not exists (select 1 from public.perfis_acesso where nome = 'Técnico em RX')
  then
    update public.perfis_acesso
    set nome = 'Técnico em RX'
    where nome = 'Diagnóstico/Exames';
  elsif exists (select 1 from public.perfis_acesso where nome = 'Técnico em RX') then
    raise notice 'renomear_perfis_oficiais: perfil "Técnico em RX" ja existe - nenhuma alteracao feita (idempotente).';
  else
    raise notice 'renomear_perfis_oficiais: perfil "Diagnóstico/Exames" nao encontrado - nenhuma alteracao feita.';
  end if;
end $$;

do $$
begin
  if exists (select 1 from public.perfis_acesso where nome = 'Regulação/Transferências')
     and not exists (select 1 from public.perfis_acesso where nome = 'Regulação de Transferência')
  then
    update public.perfis_acesso
    set nome = 'Regulação de Transferência'
    where nome = 'Regulação/Transferências';
  elsif exists (select 1 from public.perfis_acesso where nome = 'Regulação de Transferência') then
    raise notice 'renomear_perfis_oficiais: perfil "Regulação de Transferência" ja existe - nenhuma alteracao feita (idempotente).';
  else
    raise notice 'renomear_perfis_oficiais: perfil "Regulação/Transferências" nao encontrado - nenhuma alteracao feita.';
  end if;
end $$;

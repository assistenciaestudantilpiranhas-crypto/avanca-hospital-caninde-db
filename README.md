# GSI Saude - Prototipo

Protótipo visual de sistema de gestão hospitalar, em HTML, CSS e JavaScript puro (sem backend, sem banco de dados real). Todos os dados são fictícios e ficam salvos apenas no `localStorage` do navegador.

## Módulos incluídos

Dashboard, Pacientes, Atendimentos, Painel de Chamada, Classificação de Risco, Triagem, Consulta, Enfermagem, Farmácia, Exames, Sala de Estabilização, Observação (Clínica/Pediátrica/Obstétrica), Transferências, Indicadores, Relatórios e Configurações.

## Executar localmente

Basta abrir `index.html` em um navegador, ou servir a pasta com qualquer servidor estático:

```
npx serve .
```

## Publicar no Netlify

1. Crie um repositório com esses arquivos (`index.html`, `style.css`, `script.js`, `api.js`, `netlify.toml`).
2. No Netlify, escolha "Add new site" → "Import an existing project" e selecione o repositório.
3. Build command: vazio. Publish directory: `.` (raiz do projeto) — já configurado em `netlify.toml`.
4. Deploy. O site é 100% estático, sem variáveis de ambiente necessárias.

Alternativa rápida: arraste a pasta do projeto na área de "Deploys" do Netlify (drag and drop).

## Restaurar dados de demonstração

Na tela Pacientes, use o botão "Restaurar dados demo" para limpar o `localStorage` e voltar aos dados fictícios originais.

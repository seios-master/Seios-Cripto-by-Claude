# SEIOS — STATUS E ROADMAP
### fechamento da sessão de 15/08/2026 (noite) · para abrir a próxima

---

## COMO USAR ESTE DOCUMENTO

Suba este arquivo no início da próxima conversa junto com o `index.html` atual.
Ele substitui, para efeito de contexto, tudo que estiver escrito em outro lugar
sobre o estado do sistema — inclusive a `SEIOS-MEMORIA.md`, que contém **duas
afirmações comprovadamente falsas** (item 3 abaixo).

Primeira instrução para o Claude da próxima sessão: **confira o
`BUILD_VERSION` no arquivo antes de propor qualquer numeração ou roadmap.**

---

## 1. ESTADO ATUAL — verificado em 15/08/2026, 23:16

| | |
|---|---|
| **Build** | `2026-08-15.100-finito-nao-e-valido` |
| **Modelo** | `m5-2026-08-15` (bumpado na v93; nenhuma mudança de score desde) |
| **Arquivo** | `index.html`, ~10.350 linhas |
| **Hospedagem** | Vercel · **https://seios-master.com** |
| **Rotas de servidor** | `api/fred.js` · `api/gdelt.js` (nova hoje) |
| **Série viva** | 12 leituras sob m5 · **11 janelas independentes** · 1,4% de 777 |
| **Score na última leitura** | 11,01 · Neutro · Observar · cobertura 72,9% |
| **Bateria de testes** | 10 verificadores, ~110 testes, **todos verdes** |

### Motores (peso efetivo na última leitura)
Macro 35,9% (nominal 28) · Derivativos 16,0% · Ativos Globais 10,3% ·
On-chain 9,6% · Técnico 5,1% · Eventos 5,1% · Institucional 4,8% ·
Sentimento 3,2% · Geopolítico 1,7%

> A distância entre nominal e efetivo é estrutural (tetos de família +
> cobertura parcial), não defeito. Está declarada na tela.

---

## 2. O QUE MUDOU NESTA SESSÃO (v93 → v100)

| Build | O quê | Origem |
|---|---|---|
| **v93** | Janela de calendário ao vivo — "90 dias" eram até **130** em séries de dias úteis. Modelo m4→m5 | auditoria |
| **v94** | Uma contagem só de observações independentes (`ret8h` já existia desde a v81) | interna |
| **v94.1** | A contagem passou a excluir leituras de modelo anterior | **bug meu da v94** |
| **v95** | Funding entrou na tabela canônica + distribuição medida (0 de 168 dias cruzam ±15) | auditoria |
| **v96** | `funding_percentil ⚗` como variável de laboratório, percentil expandido sem look-ahead | auditoria |
| **v97** | **Backtest passou a usar o agregador do vivo.** `aggregateScore`/`scoreWithoutMotor` REMOVIDAS | auditoria (achado nº 1) |
| **v98** | Rota própria do GDELT + o replay declara "dimensão não testada" | interna |
| **v98.1–98.4** | 429 sem retry no cliente · orçamento de tempo · User-Agent · prazo por consulta | **bugs meus da v98** |
| **v99** | `realtime_end` no relógio do FRED (UTC−6) — depois das 21h apagava os 12 vintages | interna |
| **v99.1** | Lista de falhas de vintage deixou de acumular entre rodadas | **bug meu da v99** |
| **v100** | **Contrato de plausibilidade do bruto.** MVRV zero pontuava **+80** | interna |

**Bancos de prova novos:** `harness-v93` a `harness-v100` (~60 testes). Cada um
falha inteiro contra a build anterior — foi verificado, um por um.

---

## 3. CORREÇÕES À MEMÓRIA ANTERIOR — leia antes de confiar nela

1. **"Backtest não usa o agregador do live — ✅ resolvido na v92"** → **FALSO.**
   Só foi resolvido na v97, cinco builds depois. Todos os números do laboratório
   citados antes disso foram produzidos pelo modelo m1.
2. **"`ret8h` pendente"** → **FALSO.** Existe desde a v81 como `retornos.prox`.
   O que faltava era *contar* por ele, feito na v94.

**Conclusão operacional:** linha marcada ✅ vale re-verificação contra o código
antes de ser citada. Escrever que está feito não faz estar.

---

## 4. RESULTADOS QUE VIRARAM EVIDÊNCIA (não são pendências)

- **A escada de ação está fora do alcance do backtest.** Com o modelo real, o
  maior score em módulo em 285 dias foi **18,5**. Os cortes 40, 15 e −55 nunca
  foram atingidos. Cobertura reconstruível: ~56%. A tela declara isso em vermelho.
- **Conclusões antigas invalidadas:** "Reduzir acertou por 8,4pp" e "Entrar
  parcialmente bateu a referência" eram artefato do agregador antigo. **Não citar.**
- **Funding não se promove.** A escala absoluta nunca sai de ±10 (máximo do ano:
  9,8). A relativa fala, mas fraco, invertido e em 11 dias. Nenhuma das duas
  justifica peso.
- **`FUNDING_ESTICADO` (0,015%) está no percentil 100** do período — os dois
  gatilhos construídos sobre ele são constantes.

---

## 5. ROADMAP — em ordem

### P0 · Abrir a próxima sessão com isto
**Ler `LINHA-DE-BASE.md`, `ROADMAP.md` e `SEIOS-CONTEXTO.md` do repositório.**
Não foram abertos hoje. Se descrevem o sistema anterior à v92, são três fontes
de verdade contraditórias no repositório. Corrigir ou arquivar (**arquivar, não
apagar**).

### P1 · O período em formação (v101)
Três indicadores comparam um período **incompleto** contra completos:
- **hash rate** — `series[último]` é o dia corrente. A variação de 90d andou
  −2,8% → −8,6% → −10,8% em duas horas.
- **volumeSpike (GDELT)** — dia parcial contra média de 14d deu −58%, que virou
  **+38 de bullish**.
- **activeAddresses** — janela ainda contada por índice de registro, não por
  calendário (mesma doença que a v93 curou no FRED).

Fecha a família aberta pela v100. Muda score → **bump m5→m6 com justificativa
escrita antes**.

### P2 · O cache de borda do GDELT
Tom e volume falham em rodadas alternadas com 504. O cache de 15/30 min deveria
ter evitado idas ao GDELT e não evitou. Investigar antes de mexer em prazo de novo.

### P3 · Prêmio Coinbase sincronizado
Coinbase vs CoinGecko sem timestamp comum; o ruído tem a ordem de grandeza do
sinal. Trocar por Coinbase vs Binance no mesmo instante (é a definição padrão do
índice). Único indicador automático de um motor de 15%. Muda score → bump.

### P4 · Renomear a escada de ação
"Reforçar / Sair / Avaliar posição vendida" numa interface sem sizing, margem ou
stop. As duas auditorias pediram. Vira "viés de exposição". **Não muda score.**

### P5 · Só depois de P1–P4
Freio duplo do Geopolítico · put/call por vencimento · os 17 clamps lineares
restantes · "convicção" que é `50 + score/2` · DXY+euro contando duas vezes ·
`cmNuplByDate` morto no backtest.

### Fora do arquivo único (exige backend)
Purged walk-forward com embargo · custos e slippage · PBO/Deflated Sharpe ·
ETF flow automático · basis · superfície de opções · CVD · COT.

---

## 6. REGRAS NOVAS, APRENDIDAS HOJE

- **Finito não é válido.** Todo bruto precisa de faixa de plausibilidade sobre a
  *grandeza*. MVRV é razão de capitalizações: nunca é zero.
- **O último ponto de uma série precisa ser um período fechado.**
- **Toda defesa contra falha custa tempo, e esse tempo tem teto.** Escrever o
  teto ao lado da defesa.
- **Erro que não distingue causas é bug, não detalhe de apresentação.** O GDELT
  deu três diagnósticos diferentes em vinte minutos, cada um só visível depois
  que o anterior parou de esconder.
- **Diagnóstico que só acumula deixa de ser diagnóstico.** Acumulador dentro do
  `S` vai para o localStorage e sobrevive ao conserto.
- **O relógio que vale é o da fonte**, não o do usuário nem o de Greenwich.

---

## 7. O QUE SUBIR NA PRÓXIMA SESSÃO

`index.html` (v100) · este documento · `AUDITORIA-INTERNA-2026-08-15.md` ·
e, se possível, os três `.md` do repositório do item P0.

---

## 8. ONDE O PROJETO ESTÁ, SEM ADOÇAR

O SEIOS **não sabe ainda se prevê alguma coisa**. São 11 janelas independentes
de ~777. Isso não mudou hoje e não muda por build nenhuma — muda por tempo.

O que mudou é que três coisas que a tela mostrava ontem eram falsas e nenhuma
delas daria erro: o backtest media com uma matemática que o sistema não usa; o
"90 dias" eram 130; um campo vazio empurrava um motor de 15% para o teto
bullish. Agora existem ~110 testes que quebram se qualquer uma voltar, e uma
tela que diz "não testei isto" em vez de mostrar uma linha bonita.

O instrumento não ficou mais inteligente. Ficou menos capaz de mentir — e sem
isso as próximas 766 observações seriam lixo caro.

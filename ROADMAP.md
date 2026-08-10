# SEIOS Prediction — Roadmap

> **Este arquivo é a rota. Quem decide o caminho é o Claude (arquiteto); o usuário
> executa (copiloto).** Nenhuma sessão começa com "o que você quer fazer?". Cada
> sessão tem um número, um objetivo, passos concretos e um critério de pronto.
>
> Documento irmão: `SEIOS-CONTEXTO.md` (o mapa completo — premissas, matemática,
> histórico de auditorias, o que não fazer). Os dois sobem juntos no repositório.
>
> **Estado atual: nada da Fase 0 foi feito ainda. Próximo passo = Sessão 1.**

---

## Os dois sistemas

| | **SEIOS Market State** | **SEIOS Prediction** |
|---|---|---|
| O que é | O `index.html` de hoje, v53 | O sistema novo |
| Pergunta que responde | "Como o mercado está agora?" | "O que provavelmente acontece depois?" |
| Onde roda | Navegador, arquivo único | Postgres + Python + GitHub Actions |
| Status | **Em produção. Não para.** | A construir |
| Papel no futuro | Vira o **baseline** (Model A) | O sistema principal |

O Market State continua rodando todo dia durante toda a construção. Cada registro
que ele grava é dado de validação que só se obtém esperando.

---

## Módulos novos — o que o Prediction terá e o Market State não tem

Esta é a diferença estrutural entre os dois sistemas. Nenhum destes existe hoje.

| # | Módulo | O que faz | Por que não existe hoje |
|---|---|---|---|
| M1 | **Feature Store** | Guarda toda feature com dois carimbos: quando o dado *se refere* e quando ele *ficou conhecido* | Hoje só existe o estado do momento; não há histórico consultável |
| M2 | **Target Builder** | Define o que estamos prevendo: direção 1d/3d/7d/30d, magnitude, drawdown máximo | O Market State **não tem alvo nenhum**. Ele descreve, não prevê |
| M3 | **Regime Engine** | Classifica o mercado em regimes (tendência × volatilidade) | Hoje todo indicador vale igual em qualquer mercado |
| M4 | **Forecast Engine** | Produz probabilidade **calibrada**, não score | Hoje produz "convicção" heurística, declaradamente não-probabilística |
| M5 | **Calibration Engine** | Brier score, log loss, curva de confiabilidade | Nunca medimos se as previsões acertam |
| M6 | **Walk-Forward Harness** | Treina numa janela, testa na seguinte, avança. Período final intocado | Hoje o backtest ajusta e avalia no mesmo período |
| M7 | **Similar Case Engine** | "Nas 20 situações mais parecidas com hoje, o que aconteceu?" | O Case Engine atual agrupa por recomendação, não por semelhança de contexto |
| M8 | **Model Registry** | Versiona modelos; registra qual modelo gerou qual previsão | Não há modelos, há uma fórmula |
| M9 | **Shadow Mode Runner** | Modelo novo roda e registra sem influenciar decisão, até provar valor | — |
| M10 | **Ensemble Engine** | Combina saídas de vários modelos; discordância vira "não operar" | — |
| M11 | **Cost & Execution Model** | Aplica taxa, spread e slippage realistas ao resultado | O backtest atual ignora custo |
| M12 | **Drift Monitor** | Detecta quando a relação feature→alvo muda (não-estacionariedade) | — |
| M13 | **Pattern Discovery + Falsification** | Procura padrões que não programamos; tenta destruí-los | — (só com trava dura, Fase 6) |
| M14 | **API Layer** | Serve previsões ao painel | O painel calcula tudo sozinho hoje |

---

## Decisões de arquitetura — já tomadas, não reabrir

Tomadas pelo arquiteto com base no perfil do projeto e do usuário.

| Decisão | Escolha | Motivo |
|---|---|---|
| Linguagem | **Python 3.11+** | Ecossistema de dados; o usuário já ouviu falar |
| Banco | **Postgres no Neon** | Cria pelo navegador, camada gratuita, sem administrar nada |
| Agendador | **GitHub Actions** | Grátis, o usuário já sabe usar GitHub, zero servidor |
| Servidor | **Nenhum. Sem VPS.** | Administrar Linux não agrega e é onde ele travaria sozinho |
| Front-end | **Cópia do `index.html` atual** | Não é página em branco; a explicabilidade já está construída |
| Repositório | **Novo: `seios-prediction`** | O que está no ar não pode quebrar |
| Schema | **Bitemporal desde o dia 1** | Torna look-ahead impossível por construção, não evitável por cuidado |
| Ordem dos dados | **Grátis primeiro, pago depois** | Pipeline sólido antes de gastar; se travar, trava com custo zero |

---

# FASE 0 — A máquina funciona
*Objetivo: provar que a mecânica toda funciona nas mãos do usuário, com custo zero.*

## Sessão 1 — Repositório, banco e o primeiro dado
**Tempo estimado: 1h30. Custo: zero.**

Passos, na ordem:

1. Criar repositório novo no GitHub, **privado**, nome `seios-prediction`.
2. Criar conta no **Neon** (neon.tech), plano gratuito. Criar um projeto chamado
   `seios`. Copiar a *connection string* que aparece.
3. Guardar essa string como **GitHub Secret** no repositório, com o nome
   `DATABASE_URL`. *(Nunca colar senha dentro de arquivo de código.)*
4. Criar `requirements.txt` e `coletores/preco.py` — um script que busca o preço do
   BTC no CoinGecko e grava numa tabela.
5. Criar `.github/workflows/coletor.yml` — a Action que roda o script de hora em hora.
6. Rodar a Action manualmente uma vez, pelo botão do GitHub.
7. Abrir o Neon e **ver as linhas na tabela**.

**Pronto quando:** o usuário vê linhas aparecendo no banco sem ter rodado nada
manualmente na segunda hora.

**Se travar:** travou com custo zero, e sabemos exatamente onde antes de gastar.

## Sessão 2 — O Feature Store de verdade (M1)
**Tempo: 1h30.**

1. Criar o schema bitemporal definitivo. Toda linha:
   `ativo · nome_da_feature · valor · ts_referencia · ts_conhecido · fonte · versao_coletor`
2. Índices por `(nome_da_feature, ts_referencia)`.
3. Migrar o coletor da Sessão 1 para esse schema.
4. Criar a função de leitura `as_of(momento)` — devolve só o que era conhecido
   naquele instante. **Esta função é a defesa estrutural contra look-ahead.**
5. Teste: pedir o CPI "as of" uma data anterior à divulgação e conferir que volta
   vazio, não o valor.

**Pronto quando:** o teste de look-ahead passa.

## Sessão 3 — Todos os coletores grátis
**Tempo: 2h, possivelmente dividida em duas.**

Portar para Python os coletores que o Market State já usa e já sabemos que funcionam:
CoinGecko (preço diário), Binance (funding, OI, long/short, taker, livro, klines
semanais), Alternative.me (Fear & Greed), CoinMetrics (MVRV), mempool.space (hash
rate), Deribit (put/call), FRED (macro e ativos globais), GDELT.

Cada coletor: um arquivo, uma Action, escreve no Feature Store.

**Aqui já entram, prontas, as correções que custaram caro no Market State:**
granularidade diária garantida, defasagem de publicação do CPI/M2, último valor
conhecido em fim de semana, carimbo de frescor por indicador.

**Pronto quando:** o banco tem todas as features do Market State, atualizadas de hora em hora.

## Sessão 4 — Backfill histórico do que é grátis
**Tempo: 1h + tempo de máquina.**

Script separado que puxa o máximo de histórico gratuito disponível e grava com
`ts_conhecido` correto. Roda uma vez.

**Pronto quando:** sabemos exatamente quantos dias temos de cada feature — e essa
tabela vira a base da decisão de compra da Fase 3.

---

# FASE 1 — Medir antes de modelar
*Objetivo: saber o quanto o baseline acerta. Sem isso, nada depois significa nada.*

## Sessão 5 — Target Builder (M2)
Definir formalmente o que estamos prevendo:
- direção em 1d, 3d, 7d, 30d (sobe ou desce)
- magnitude (retorno)
- drawdown máximo dentro da janela

Tabela de alvos, calculada a partir do preço histórico. **É a primeira vez que o
projeto tem um alvo explícito.**

## Sessão 6 — Baseline portado
Portar o motor de score do Market State para Python, sem mudar uma vírgula da
lógica. Rodar sobre o histórico. Produzir uma previsão por dia.

## Sessão 7 — Calibration Engine (M5)
Brier score, log loss e curva de confiabilidade do baseline.

**Este é o primeiro número honesto do projeto.** A expectativa é que mostre que a
"convicção" atual tem pouco ou nenhum valor informativo — e é exatamente isso que
precisamos saber antes de construir qualquer coisa em cima.

## Sessão 8 — Walk-Forward Harness (M6)
Treina/valida/testa com separação temporal estrita. **Um período final é isolado e
ninguém olha até o fim do projeto.** Escrito agora, antes de existir tentação.

### 🚦 PORTÃO 1
> O baseline bate "sempre neutro" no Brier score, em dado out-of-sample?
> **Se não bater, o problema é do baseline** — e o sistema novo tem uma barra baixa
> para superar, o que é informação valiosa. Seguimos ou revisamos o baseline.

---

# FASE 2 — Ganhos baratos, sem dado pago, sem ML
*Objetivo: extrair tudo que ainda dá para extrair do dado grátis.*

## Sessão 9 — Similar Case Engine (M7)
Vizinhos mais próximos sobre o vetor de features. Sem treino, sem biblioteca,
degrada bem com pouco dado, explicável por natureza.

Saída: *"20 situações mais parecidas com hoje: 14 subiram em 7 dias, mediana +4,1%,
pior caso −7,8%."*

**É o melhor retorno por esforço de todo o roadmap.** Por isso vem primeiro nesta fase.

## Sessão 10 — Velocidade e aceleração
Cada feature relevante ganha Δx e Δ²x. Funding a +0,01 é irrelevante; funding indo
de −0,01 a +0,01 em dois dias é evento.

## Sessão 11 — Detector de divergências
Preço ↓ com prêmio Coinbase ↑. Preço ↑ com OI ↓. Preço ↑ com CVD spot ↓.
Custo zero de dado novo, e é sinal genuinamente antecipatório.

## Sessão 12 — Regime Engine simples (M3)
Quatro regimes **por regra**, não aprendidos: tendência (alta/baixa) × volatilidade
(alta/baixa). Depois, medir a eficácia de cada feature **dentro de cada regime**.

Hipótese a testar: o "Técnico invertido" que a calibração mostra pode ser RSI
contrário funcionando em range e falhando em tendência — a média dos dois dá "invertido".

## Sessão 13 — Reavaliação
Rodar calibração de novo com tudo da Fase 2. Comparar com o baseline puro.

### 🚦 PORTÃO 2
> A Fase 2 melhorou o Brier score de forma mensurável, out-of-sample?
> **Se não melhorou, não adianta comprar dado — o problema não é falta de dado.**
> Esse é o momento de decidir se a Fase 3 se justifica.

---

# FASE 3 — Dado pago e Feature Store profundo
*Só depois do Portão 2. Antes disso, comprar dado é comprar esperança.*

## Sessão 14 — Orçamento real
Levantar preços de 3 fornecedores por categoria. Montar três cenários: mínimo
viável, recomendado, completo — com o que cada um permite e exclui.

**Ordem de valor por real gasto** (definida pelo arquiteto):
1. Derivativos históricos — funding, OI, liquidações, desde ~2019
2. **Opções — IV, skew, term structure.** O dado mais genuinamente prospectivo que
   existe, porque é expectativa precificada, não histórico
3. On-chain profundo — desde 2011
4. Order book histórico
5. Consenso macro (para o surprise index)

## Sessões 15–17 — Assinar, integrar, fazer backfill
Uma categoria por sessão. Cada uma termina com o dado no Feature Store e um número
novo: quantas observações independentes ganhamos.

---

# FASE 4 — Modelagem
*Só com Feature Store profundo. Antes disso, XGBoost memoriza em vez de aprender.*

- Regressão logística como baseline estatístico
- Gradient boosting (LightGBM), com SHAP para explicar
- Modelos **diferentes por horizonte** — o que prevê 72h não é o que prevê 6 meses
- Model Registry (M8) e Shadow Mode (M9)
- Ensemble (M10) — discordância entre modelos vira "não operar"
- Cost & Execution Model (M11) — taxa, spread, slippage
- Drift Monitor (M12)

### 🚦 PORTÃO 3
> O edge sobrevive a custo e slippage realistas?

### 🚦 PORTÃO 4
> Funciona no período final, que ninguém olhou? **Uma única vez.**
> Segunda tentativa já é overfitting.

---

# FASE 5 — Integração
- API Layer (M14)
- O painel do Market State passa a consumir a API; se ela cair, volta a calcular local
- Previsão com probabilidade calibrada substitui a convicção heurística na tela

# FASE 6 — Descoberta
Pattern Discovery + Falsification (M13), **só com trava dura**: mínimo de ocorrências
independentes, e o número de regras testadas declarado na tela. Nunca deixar o
aprendizado alterar pesos automaticamente antes disso.

---

## Regras de condução

1. **Uma sessão, um objetivo, um critério de pronto.** Se não couber, quebrar em duas.
2. **Nenhuma sessão termina sem algo visível.** Se não produz nada que o usuário
   possa ver e conferir, está mal desenhada.
3. **O arquiteto decide o próximo passo.** O usuário não escolhe entre opções
   técnicas; ele executa e reporta o que viu.
4. **Ao fim de cada sessão, atualizar `STATUS.md`** — onde paramos, o que funciona,
   o que falta, qual a próxima sessão.
5. **Portão reprovado é resultado, não fracasso.** "Não há edge detectável" é
   conclusão científica legítima e impede operar achando que tem vantagem.
6. **O Market State roda todo dia**, em paralelo, do começo ao fim.

---

## Onde estamos

```
FASE 0  ▓░░░░░░░░░  Sessão 1 — não iniciada  ← PRÓXIMO PASSO
FASE 1  ░░░░░░░░░░
FASE 2  ░░░░░░░░░░
FASE 3  ░░░░░░░░░░
FASE 4  ░░░░░░░░░░
FASE 5  ░░░░░░░░░░
FASE 6  ░░░░░░░░░░
```

**Próxima ação do usuário:** abrir a aba `SEIOS Prediction`, subir
`SEIOS-CONTEXTO.md`, `ROADMAP.md` e `index.html`, e dizer apenas: *"vamos começar
a Sessão 1"*. O Claude de lá tem tudo que precisa para conduzir.

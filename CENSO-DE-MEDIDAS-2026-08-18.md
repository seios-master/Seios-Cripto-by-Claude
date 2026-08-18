# CENSO DE MEDIDAS — SEIOS v106.1 (m9)
### 18/08/2026 · o que cada indicador realmente mede, e quantos dados entram nisso

---

## Por que este documento existe

As builds v100–v106 encontraram defeitos **um a um**, cada um por acidente:
o MVRV zero apareceu numa leitura noturna, o bucket aberto do hash rate apareceu
numa auditoria, o book imbalance apareceu porque Jorge estava olhando a tela
quando ele saltou 120 pontos, o `activeAddresses` apareceu porque Jorge mandou
dois diagnósticos separados por 10 horas.

Isso é caro e é lento: cada descoberta custa uma build, e a fila de classe A não
encolhe — ela é redescoberta. Pior: não sabemos **quantos** defeitos faltam, então
não sabemos quando dá para congelar o modelo.

O censo troca "descobrir por acidente" por "conhecer por inteiro".

---

## Método

**Coluna N (estática).** Quantos pontos de dado entram no número que vira score.
Lida direto do código, indicador por indicador. Um `clamp(pct*5)` onde `pct` vem
de `(hoje − há 90 dias)/há 90 dias` tem **N = 2**: dois dias decidem uma medida
que se apresenta como trimestral.

**Coluna Δ10h (empírica).** Movimento observado do score entre as duas leituras
reais de Jorge — 17/08 22:29 e 18/08 08:27, dez horas de intervalo, madrugada
sem evento macro.

**Coluna IMPACTO.** `peso efetivo do indicador × Δ10h ÷ 100` = pontos de score
geral movidos por aquele indicador naquela janela.

Peso efetivo por indicador = peso efetivo do motor ÷ nº de votantes com dado.

---

## A tabela

| # | Indicador | N | Forma da medida | Peso % | Δ 10h | Impacto |
|---|---|---:|---|---:|---:|---:|
| 1 | `onchain.activeAddresses` | **2** | ponto-a-ponto 90d | 3.2 | **114.7** | **3.67** |
| 2 | `derivativos.takerRatio` | **1** | INSTANTE (janela 1h) | 3.2 | **24.8** | **0.79** |
| 3 | `tecnico.momentum` | 2 | ponto-a-ponto 24h | 1.3 | 9.4 | 0.12 |
| 4 | `derivativos.longShort` | **1** | INSTANTE (janela 1h) | 3.2 | 3.1 | 0.10 |
| 5 | `derivativos.openInterest` | 2 | ponto-a-ponto 24h | 3.2 | 2.6 | 0.08 |
| 6 | `derivativos.funding` | 1 | nível (última taxa 8h) | 3.2 | 2.0 | 0.06 |
| 7 | `institucional.coinbasePremium` | **2** | INSTANTE (2 tickers) | 4.8 | 1.1 | 0.05 |
| 8 | `onchain.mvrv` | 1 | nível do dia | 3.2 | 1.2 | 0.04 |
| 9 | `tecnico.rsi` | 15 | média de 14 | 1.3 | 0.5 | 0.01 |
| 10 | `tecnico.mediaMovel` | 51 | preço vs média de 50 | 1.3 | 0.4 | 0.01 |
| 11 | `tecnico.tendencia` | 2 | ponto-a-ponto 30d | 1.3 | 0.2 | 0.00 |
| 12 | `derivativos.putCall` | 1 | INSTANTE (soma de OI) | 3.2 | 0.1 | 0.00 |
| — | `tecnico.bookImbalance` | 1 | INSTANTE (snapshot) | *0 (sensor)* | **78.8** | 0.00 |
| 13 | `macro.juros` | 2 | ponto-a-ponto 90d | 7.2 | 0.0 | 0.00 |
| 14 | `macro.inflacao` | 2 | ponto-a-ponto ~3m | 7.2 | 0.0 | 0.00 |
| 15 | `macro.liquidez` | **120** | percentil expandido | 7.2 | 0.0 | 0.00 |
| 16 | `macro.dxy` | 2 | ponto-a-ponto 90d | 7.2 | 0.0 | 0.00 |
| 17 | `macro.curva` | 1 | nível | 7.2 | 0.0 | 0.00 |
| 18 | `onchain.hashrate` | 2 | ponto-a-ponto 90d | 3.2 | 0.0 | 0.00 |
| 19 | `sentimento.fearGreed` | 1 | nível do dia | 3.2 | 0.0 | 0.00 |
| 20 | `geopolitico.gdelt` | **1** | **ÚLTIMO BUCKET de 3d** | 1.7 | 0.0 | 0.00 |
| 21 | `geopolitico.epu` | 2 | ponto-a-ponto 90d | 1.7 | 0.0 | 0.00 |
| 22 | `ativosGlobais.petroleo` | 2 | ponto-a-ponto 90d | 1.7 | 0.0 | 0.00 |
| — | `ativosGlobais.ouro` | 2 | ponto-a-ponto 90d | *0 (sensor)* | 0.0 | 0.00 |
| 23 | `ativosGlobais.euro` | 2 | ponto-a-ponto 90d | 1.7 | 0.0 | 0.00 |
| 24 | `ativosGlobais.sp500` | 2 | ponto-a-ponto 90d | 1.7 | 0.0 | 0.00 |
| 25 | `ativosGlobais.cobre` | 2 | ponto-a-ponto ~3m | 1.7 | 0.0 | 0.00 |
| 26 | `ativosGlobais.vix` | 1 | nível | 1.7 | 0.0 | 0.00 |
| 27 | `ativosGlobais.juros10a` | 2 | ponto-a-ponto 90d | 1.7 | 0.0 | 0.00 |

**Total de score movido em 10h: 4.94 pontos** — dos quais **3.67 (74%) vêm de um
único indicador**, e 4.46 (90%) vêm de dois.

---

## O que o censo achou

### 1. A raiz é uma só, e ela é estrutural

**24 dos 27 indicadores votantes têm N ≤ 2. Eles somam 78,6% do peso.**

Só três medidas no sistema inteiro usam mais de dois pontos de dado: o percentil
do M2 (N=120, construído na v105), o RSI (N=15) e a média móvel (N=51). São
justamente os três que não se mexeram por ruído — e o RSI é, junto com o
`coinbasePremium` e o `activeAddresses`, um dos poucos que **separam** na
calibração histórica.

Isto não é coincidência estatística que eu esteja lendo com boa vontade: é
aritmética. Uma diferença de dois pontos de uma série ruidosa carrega o ruído dos
dois pontos inteiro. Uma média de 14 divide o ruído por √14.

O sistema não tem "alguns indicadores com defeito". Ele tem **uma forma de medir
que se repete 24 vezes**, e que às vezes cai numa série lisa (juros do Fed) e às
vezes numa série ruidosa (endereços ativos). Onde caiu em série lisa, ninguém
percebeu. Onde caiu em série ruidosa, virou classe A.

### 2. Classe A confirmada, por ordem de dano

- **`onchain.activeAddresses`** — 115 pontos em 10h, 74% de todo o movimento.
  A leitura crua foi de −15,3% para +7,7% num "trimestre" quando a janela andou
  **um dia**. Fórmula `pct×5` satura em ±20%, e endereços ativos oscilam mais que
  isso entre dois dias quaisquer.
- **`derivativos.takerRatio`** — 25 pontos em 10h. Janela de 1h da Binance,
  N=1. Mesma família do book imbalance, que virou sensor na v106.
- **`geopolitico.gdelt`** — **defeito novo, achado por este censo.**
  `fetchGdeltTone` faz `points[points.length - 1]`: lê o **último bucket da linha
  do tempo de 3 dias**, que é o bucket em formação. É exatamente o defeito que a
  v101 corrigiu no `volumeSpike` (`todos.slice(0, -1)`) e que **não foi aplicado
  ao tom**. Passou porque a v101 tratou os consumidores que a auditoria listou, e
  o tom não estava na lista. Δ10h = 0 apenas porque a fonte falhou nas duas
  leituras (429), então a tela mostrou valor velho — não é evidência de estabilidade.

### 3. Suspeitos que o censo NÃO conseguiu julgar

`hashrate`, `longShort`, `putCall`, `openInterest`, `coinbasePremium`, `momentum`,
`tendencia` — todos N ≤ 2, todos com Δ pequeno *nesta janela*. Δ pequeno em uma
janela de dez horas não é evidência de estabilidade. Precisam da distribuição
histórica, não de uma amostra de um.

---

## O que este censo NÃO diz

- **A coluna Δ10h é uma amostra de tamanho um.** Uma madrugada, um regime, sem
  evento macro. Ela ordena o que gritou; não absolve o que ficou quieto.
- **Δ = 0 em quase todo o Macro e Ativos Globais é artefato de cadência**, não
  robustez: FRED atualiza uma vez por dia útil e a série mensal, uma vez por mês.
  Em 10h eles não tinham como se mover. O `macro.juros` tem N=2 e 7,2% de peso —
  o maior peso individual do sistema — e continua não testado.
- **N baixo não é defeito por si.** `macro.curva` tem N=1 e está certo: o spread
  10y−2y é um nível, e o zero dele significa inversão. O defeito é usar N baixo
  numa série ruidosa e chamar o resultado de tendência de trimestre.
- **Nada aqui diz que os indicadores não informam.** `activeAddresses` separa
  1,9pp na calibração; o que está errado é a medida, não o indicador.

---

## Fila revisada

| Prioridade | O quê | Classe | Muda score? |
|---|---|---|---|
| **v107** | Medir a distribuição das variações diárias de `activeAddresses` e `hashrate` nos 500 dias já baixados do CoinMetrics — responder com número se 23pp num dia é cauda ou rotina | A (medição) | não |
| **v108** | Trocar ponto-a-ponto por média-contra-média nos N=2 de série ruidosa, com a medição da v107 publicada na tela | A | **sim** → m10 |
| **v109** | `fetchGdeltTone` descarta o bucket em formação (o que a v101 fez no volume) | A | sim |
| **v110** | `takerRatio` e `longShort`: instantâneos de 1h → sensor ou janela agregada | A | sim |
| depois | prêmio Coinbase sincronizado (Coinbase vs Binance no mesmo instante) | A | sim |

O prêmio Coinbase **desce na fila**: impacto medido de 0,05 ponto, contra 3,67 do
`activeAddresses`. Ele continua sendo classe A — dois preços de fontes diferentes
sem timestamp comum — mas não é onde o dano está.

---

## A regra que este censo produz

> **Toda medida que se apresenta como variação de um período tem que usar mais de
> dois pontos desse período.** Se a série for lisa o bastante para dois pontos
> bastarem, isso precisa ser medido e escrito, não presumido.

Candidata a virar teste de arquitetura no harness: nenhum `setAuto` novo pode
nascer de uma diferença de dois pontos sem uma linha declarando a distribuição
medida da série.

---

*Gerado contra `2026-08-18.106.1-sensor-alias` · `m9-2026-08-18` · bateria 238 · 0*

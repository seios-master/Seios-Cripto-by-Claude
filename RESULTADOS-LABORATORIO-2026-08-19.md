# RESULTADOS DAS MEDIÇÕES — 18/19 de agosto de 2026
## Anexo ao SEIOS-MEMORIA · três laboratórios isolados · 92 testes · nenhum aprovado

> **Leia antes de propor qualquer coisa desta lista.** O que está aqui já foi medido,
> com regra declarada antes e reserva temporal separada. Repropor sem dado novo é
> desperdício de tempo — e pior, é a porta de entrada do teste-até-passar.

---

## Como foi medido, nas três rodadas

**Regra, declarada antes de cada rodada:** partição temporal (estudo → reserva), corte
`|t| ≥ 2,576` (1%) exigido **nas duas fases**, com **o mesmo sinal**. Sinal que inverte
entre estudo e reserva é ruído ou regime, não previsão.

Os arquivos ficaram fora do sistema — HTML isolado, sem gravar nada, sem tocar no
`index.html`. Nenhuma dessas medições alterou o `m11`.

---

## RODADA 1 — microestrutura horária (`medicao-microestrutura.html`)

**Pergunta:** a agressão compradora (taker buy / volume total, reconstruída das velas)
prevê o retorno da hora seguinte?

**Amostra:** 8.998 horas · 375 dias · estudo 5.398 / reserva 3.600.

| Medida | r estudo | r reserva |
|---|---|---|
| Agressão da hora | +0,0024 | −0,0106 |
| Agressão média 8h | +0,0065 | −0,0051 |
| Agressão vs. normalidade 24h | −0,0048 | −0,0133 |

**Resultado: nada.** Todos os sinais invertem entre as fases. **Descartado qualquer
efeito acima de r ≈ 0,027** neste horizonte — é a rejeição mais forte que o projeto
produziu, porque o N é grande.

**Consequência prática:** o `takerRatio`, demotado na v111 por cadência, foi testado na
versão reformulada que eu mesmo havia sugerido como caminho futuro (normalizado por
notional, agregado em 8h). **Não há o que promover de volta.** Assunto encerrado.

---

## RODADA 2 — agressão no horizonte natural (`medicao-microestrutura-2.html`)

**Pergunta:** e se a agressão for medida contra o horizonte dela, e não contra 1h?

| Teste | r estudo | r reserva |
|---|---|---|
| Agressão 8h → retorno 8h | +0,022 (N=673) | −0,045 (N=450) |
| Agressão 24h → retorno 24h | +0,068 (N=223) | −0,028 (N=150) |

**Resultado: nada, e com poder fraco.** O r mínimo detectável subiu para 0,10–0,12.
**Isto é decisão de parar, não prova de ausência** — um efeito de r ≈ 0,06 poderia
existir e não ter sido visto. A regra encerrou o assunto para não virar teste-até-passar.

---

## RODADA 3 — laboratório histórico, variáveis soltas (`laboratorio-historico.html`)

**Amostra:** 3.289 dias (2017-08 a 2026-08) · estudo 2.328 / reserva 961 (era do ETF).
23 variáveis × 3 horizontes = **69 testes**.

**Resultado: nenhum passou.** Os poucos |t| perto de 2 invertem o sinal entre as fases:
Fed Funds −0,012 → +0,107 · Cobre +0,130 → −0,180 · M2 +0,120 → −0,079.

Com 69 testes, ~3 resultados a p<0,05 são esperados **por acaso**. Foi o que apareceu.

**Descartado:** nenhuma das 23 variáveis, sozinha, tem |r| acima de ~0,053 contra o
retorno do dia seguinte, em 2.328 dias.

**Inclui os seis sensores que nunca tinham sido medidos contra nada:**
stablecoins (30d e 7d), balanço do Fed (WALCL 30d), juro real 10a (nível e 90d), euro.
Todos entre −0,06 e +0,07 em **todas** as eras. **Não há motivo para promover nenhum
deles.** Essa pergunta estava na fila para dezembro e foi respondida em vinte minutos.

**O único padrão consistente da tabela — e o sistema vota ao contrário:**
`momentum 24h` deu **sinal negativo** no estudo (−0,048), na reserva (−0,059) e em três
das quatro eras. Isso é **reversão**: dia que sobe tende a devolver. O sistema faz
`clamp(change24h * 12)` — subiu hoje, pontua bullish. Não passa no corte (t = −1,82 na
reserva), então **não autoriza mudança**. Mas é a primeira explicação com dado para o
"Técnico aparece invertido" que aparece nos backtests desde sempre. **Hipótese registrada.**

---

## RODADA 4 — o score agregado (`laboratorio-historico-2.html`)

Reconstrução com as fórmulas canônicas reais (`escalaSuave`, `scoreDoPercentil`, `clamp`)
e os pesos nominais do m11. **Cobertura média 81%** — bem acima dos 56% do backtest
interno. Fidelidade conferida contra a leitura ao vivo de 18/08 20:43: curva 20,89 vs
20,89 · F&G 18,00 vs 18,00 · VIX 11,15 vs 11,19 · MVRV 31,20 vs 31,05.

### O score

| Fase | N | r | t |
|---|---|---|---|
| Estudo (até 2023) | 2.328 | **+0,0709** | 3,43 |
| Reserva (2024+) | 960 | **−0,0194** | −0,60 |

**Não passa — e inverte o sinal.** O estudo sozinho passaria com folga. Se a partição
fosse aleatória em vez de temporal, isto teria virado "descoberta". **É o exemplo mais
claro do projeto de por que a reserva tem que ser o futuro do estudo.**

### Os indicadores que faltavam

| Indicador | r estudo | r reserva |
|---|---|---|
| **Prêmio Coinbase** | **+0,096 (t=4,64)** | **+0,057 (t=1,78)** |
| Funding | +0,016 | −0,025 |
| Hash rate 90d | −0,114 (N=44) | +0,019 |
| M2 percentil (régua v105) | +0,064 | −0,016 |
| MVRV | falha de coleta | falha de coleta |
| Endereços ativos | falha de coleta | falha de coleta |

**O prêmio Coinbase é o único sobrevivente parcial de 92 testes.** Não passa no corte de
1%, mas é a **única linha que não inverteu**. É fluxo institucional americano — a
variável que a mudança de comprador (varejo → ETF → instituições) deveria ter tornado
mais relevante, e o dado é consistente com isso. **Candidato mais forte que o projeto
já teve. Continua sendo hipótese.**

### A descoberta sobre a escada de ação

| | |
|---|---|
| Distribuição do score | mín −27,7 · p05 −12,4 · mediana 1,0 · p95 16,0 · máx 26,9 |
| `\|score\| ≥ 15` | **8,3% dos dias** |
| `\|score\| ≥ 40` | **0,0% dos dias** |

**Isto corrige uma conclusão anterior do projeto.** O backtest interno dizia que o score
nunca cruzava ±15 e atribuía isso ao amortecimento. **Estava errado: era falta de
cobertura.** Com 81% da massa, o score cruza ±15 em 8,3% dos dias.

**E prevê o experimento ao vivo:** em 777 janelas, ~65 disparariam "Entrar/Reduzir" e
**nenhuma** disparará "Reforçar". O nível de +40 é inalcançável para este modelo.

---

## O que NÃO foi testado — e por que isso importa

Tudo acima é **linear, contemporâneo e univariado** (mais um agregado). **Não foi testado:**

- **interações** entre variáveis (as constelações da auditoria externa);
- **precedência** temporal (A muda, depois B, depois o preço);
- **não-linearidade** e limiares (talvez só os extremos informem);
- **condicionamento por regime** (a variável só fala em risk-off?);
- **profundidade de livro, spread, liquidações** — não reconstruíveis, nenhum histórico
  público guarda foto de livro;
- **fluxo de ETF**, tensão manual, put/call, GDELT histórico.

**"Nada encontrado" NÃO é "nada existe".** Mas testar as combinações exige muito mais
dado do que temos, e cada combinação nova aumenta a chance de achar padrão por acaso.
Ver a seção de erros a não cometer no `SEIOS-MEMORIA`.

---

## Falhas técnicas a corrigir se estas medições forem refeitas

- CoinMetrics não respondeu no formato esperado — MVRV e endereços ativos ficaram sem
  medição histórica. É a lacuna mais séria que sobrou.
- `mempool.space/api/v1/mining/hashrate/3y` só cobriu a reserva; o estudo ficou com N=44.
- Séries do FRED entraram com valor **revisado**, não o da divulgação original —
  look-ahead residual em CPI e M2.

---

*Registrado em 19/08/2026, com o `m11-2026-08-18` congelado e a série em 4 janelas de 777.*

# RESULTADOS DAS MEDIÇÕES — 18/19 de agosto de 2026
## Anexo ao SEIOS-MEMORIA · oito laboratórios isolados · ~110 testes · nenhum aprovado

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

## RODADA 5 — o que ANDA JUNTO com o BTC (`btc-anda-com-o-que.html`)

**Pergunta diferente de todas as anteriores:** não "o que prevê", mas "o que se move
junto". Variação contra variação — nunca nível contra variação, que foi o defeito das
duas primeiras versões desta página, corrigido por insistência do Jorge.

**21 variáveis · 3.289 dias · quatro escalas (dia, semana, mês, trimestre) · quatro eras.**

### O resultado, na escala mensal

| Variável | r | Estabilidade nas 4 eras |
|---|---|---|
| **Fear & Greed** | +0,493 | **NÃO CONTA** — o índice é construído a partir do momentum e da volatilidade do próprio BTC. É o preço correlacionado consigo mesmo. |
| **S&P 500** | **+0,351** | 0,32 · 0,40 · 0,34 · 0,41 — **a mais estável da tabela** |
| Endereços ativos | +0,303 | reflexivo: 0,012 no dia, 0,433 no trimestre — atividade sobe *porque* o preço subiu |
| **VIX** | **−0,282** | −0,31 · −0,32 · −0,25 · −0,31 — igualmente estável |
| Hash rate | +0,179 | fraca |
| Stablecoins (oferta) | −0,166 | **inverte por era**: −0,26 → +0,46. O agregado esconde uma virada |
| Cobre | +0,156 | fraca |
| **Dólar amplo** | **−0,141** | bem mais fraco que a narrativa; na era do ETF vira +0,06 |
| Petróleo | +0,126 | fraca |
| Treasury 10a | +0,103 | fraca |
| Euro, ouro, juro real, Fed Funds, curva, CPI, M2, balanço do Fed, **liquidez líquida**, EPU | **−0,06 a +0,08** | **indiferentes** |

**Cuidado de leitura:** cobre, CPI e M2 têm r = 0,000 nas escalas de dia e semana porque
são séries mensais — não variam nesse prazo. Zero por construção, não por indiferença.

### A conclusão que vale ouro

**O BTC é um ativo de risco.** Sobe com ações, cai com medo. Não é ouro digital (ouro:
+0,021), não é hedge cambial (euro: +0,075), não responde a liquidez (liquidez líquida
do Fed: −0,029).

**E o sistema pesa exatamente ao contrário:** Macro 28% para os que dão ~0,05; Ativos
Globais 8% para S&P e VIX, os únicos estáveis e moderados.

---

## RODADA 6 — a escada bate comprar e segurar? (`tres-testes.html`, teste 1)

Política declarada antes: score ≥ +15 → 100% · entre −15 e +15 → 50% · ≤ −15 → 0%.
Custo 0,1% sobre o giro. Referência: 100% comprado do primeiro ao último dia.

| Período | Sistema (0,1%) | Sem custo | Comprar e segurar | Giros | Queda máx. sist. | Queda máx. B&H |
|---|---|---|---|---|---|---|
| tudo 2017–2026 | **20,78×** | 28,10× | 15,09× | 603 | **51,7%** | 83,2% |
| estudo (até 2023) | **14,12×** | 18,03× | 9,86× | 488 | **51,7%** | 83,2% |
| **era ETF (2024+)** | **1,44×** | 1,52× | **1,46×** | 116 | **26,9%** | 53,0% |

**Não passou pela regra:** bateu no total e no estudo, **empatou/perdeu na era do ETF**.
É o padrão de algo que funcionou num mercado que não existe mais.

**MAS — e é o único achado que atravessou as duas janelas:** a escada **cortou a queda
máxima pela metade em todas as janelas**, inclusive naquela em que empatou em retorno.
Isso não é previsão; é **reduzir exposição em regime ruim**.

**E o custo é brutal:** 603 giros comeram 26% do resultado (28,10× → 20,78×).

---

## RODADA 7 — precedência: alguma variável se move ANTES? (`tres-testes.html`, teste 2)

Defasagens de −10 a +10 dias. Positiva = a variável se move primeiro.

| Variável | Pico | r | t | Reserva |
|---|---|---|---|---|
| S&P 500 | **0 dias** | +0,250 | 12,44 | +0,356 |
| VIX | **0 dias** | −0,219 | −10,82 | −0,329 |
| Dólar amplo | **0 dias** | −0,132 | −6,43 | −0,111 |
| Treasury 10a | +4 d | −0,058 | −2,79 | −0,033 (some) |
| Juro real | +7 d | −0,061 | −2,93 | +0,011 (inverte) |
| Petróleo | +9 d | −0,049 | −2,36 | −0,045 |
| Endereços ativos | −1 d | +0,040 | 1,93 | +0,005 |
| Hash rate | −8 d | −0,057 | −2,73 | −0,015 |
| *Preço Coinbase* | *0 dias* | *+0,990* | *333* | *+1,000* |

**Nada antecede.** As três relações reais (S&P, VIX, dólar) têm pico **exatamente em zero**
— simultâneas. Quando você sabe, já aconteceu. As que deram defasagem positiva têm
r ≤ 0,06 e somem ou invertem na reserva.

**O Preço Coinbase foi um controle acidental que funcionou:** é o preço do BTC em outra
bolsa. Deu r ≈ 1,0 em defasagem 0, como tinha que dar. Se tivesse dado outra coisa,
seria prova de erro no alinhamento temporal de todo o teste.

---

## RODADA 8 — cripto-nativos por faixa (`tres-testes.html`, teste 3)

| Variável | Estudo (q1 → q5) | Reserva (q1 → q5) | t efetivo |
|---|---|---|---|
| **Prêmio Coinbase** | 2,00% → **11,97%** monotônico | 0,21% → 1,11% (q5 com 17 dias) | **0,93** |
| Endereços ativos 90d | 1,44% → **12,45%** monotônico | achatado em ~2% | 1,12 |
| Funding | 9,47% → 0,94% | sem ordem | −0,91 |
| Hash rate 90d | sem ordem | sem ordem | −0,21 |

**O prêmio Coinbase morreu.** Era o único sobrevivente parcial de 92 medições — padrão
lindo e monotônico no estudo, achatado na reserva. Endereços ativos têm a mesma
assinatura. **É reflexividade: no bull de 2017–2021, tudo que sobe junto com o preço
"prevê" o preço.**

---

## RODADA 9 — a distribuição do CVD de 24h (`medicao-cvd.html`)

Feita logo depois de o CVD nascer sensor (v124), para responder o que a primeira leitura
ao vivo deixou em aberto: **+8,3% de compra líquida a mercado é muito, pouco ou normal?**

**Amostra:** 8.976 janelas deslizantes de 24h · 374 dias · aritmética idêntica à do
sistema (conferida em cinco casos antes de rodar).

### Onde o CVD realmente vive

| Faixa | CVD 24h (% do volume) |
|---|---|
| mínimo | −28,8% |
| p05 | −11,4% |
| p25 | −5,8% |
| **mediana** | **−2,1%** |
| p75 | +1,8% |
| p95 | +7,1% |
| máximo | +19,5% |

### Três achados, em ordem de importância

**1. O NORMAL DO BTC É VENDA LÍQUIDA A MERCADO.** A mediana é **−2,1%** e o p75 é apenas
+1,8% — em três quartos das janelas o fluxo agressor é neutro ou vendedor. Faz sentido
estrutural: quem compra para segurar usa ordem limitada, quem vende com pressa usa ordem
a mercado. **Não sabíamos disso, e agora sabemos.**

**2. O dia 19/08 foi excepcional, e eu li errado ao vivo.** Os +8,3% medidos às 17:06
estão no **percentil 97** — só 3% das janelas do ano tiveram compra líquida mais forte.
Na leitura ao vivo eu disse que "8% é modesto para um dia de +6%". **Era o contrário: foi
um dos dias de compra mais agressiva do ano.** Sem a distribuição, o número era literal e
não era interpretável — que era exatamente a razão de medir.

**3. O corte de ±15 é largo demais para este indicador.** Ele cruza em **1,8%** das
janelas, e nunca chega a ±40. Não é o caso extremo do funding (0% em 167 dias), mas é
perto: **o CVD será neutro em ~98% das leituras.** O corte que separaria os extremos
seria ~±7 — e com ele o dia de hoje teria marcado ALTA em vez de neutro.

### O que NÃO foi feito, e por quê

**O corte não foi alterado.** Trocar régua com base na distribuição que acabou de revelar
o problema é calibrar com o dado que apontou o defeito. É o que a v108 recusou fazer com
os endereços ativos e o que a v109 estabeleceu como não justificável.

**Pergunta registrada para a série:** *o CVD acima do percentil 90 (≈ +5%) antecede
alguma coisa?* Se sim, ±7 vira decisão fundamentada numa próxima geração de modelo. Se
não, o corte largo nunca importou.

### O padrão que isto revela — e é maior que o CVD

**Quatro indicadores do sistema têm escala mal dimensionada**, e o motivo é comum:

| Indicador | Sintoma | Medido em |
|---|---|---|
| `funding` | 0% dos dias cruzam ±15 — a escala não sai do centro | v-anterior, 167 dias |
| `activeAddresses` | 82% dos dias cruzam ±15 — ruído puro, satura em 200 pontos | v107, 409 dias |
| `hashrate` | 86% dos dias cruzam ±15 | v107, 409 dias |
| `cvd24h` | 1,8% dos dias cruzam ±15 | **v125, 8.976 janelas** |

**Dois quase nunca saem do neutro; dois quase nunca ficam nele.** A causa é a mesma: o
corte de ±15 foi herdado de um indicador para todos os outros, e **nunca foi medido por
indicador**. Não é acaso — é uma decisão de projeto que nunca foi verificada.

Isto **não autoriza** mexer em nada agora. Fica como o achado estrutural mais forte sobre
a arquitetura de escalas, para uma eventual próxima geração.

---

## RODADA 10 — fluxo de ETF (`medicao-etf-liquidacoes.html`, teste 1)

**Fonte:** `tftc.io/bitcoin-etf-flows/data.json` — CC BY 4.0, histórico completo desde
11/01/2024, compilado de SoSoValue e Farside Investors. **Gratuita, sem chave.**

**Amostra:** 669 dias casados com preço · estudo até 31/12/2025 (511) · reserva 2026 (158).

| Horizonte | r estudo | t estudo | r reserva | t reserva | Veredito |
|---|---|---|---|---|---|
| 1 dia | +0,025 | 0,56 | +0,139 | 1,75 | não |
| 3 dias | −0,050 | −0,66 | **+0,325** | 2,43 | **não — INVERTE** |
| 7 dias | −0,118 | −1,00 | — | — | não |

**Nenhum passou.** E o horizonte de 3 dias faz o movimento clássico do projeto: negativo
no estudo, positivo na reserva. **Se a partição fosse aleatória em vez de temporal, o
+0,325 com t = 2,43 teria virado "descoberta".**

### A leitura direta, que é mais informativa que os coeficientes

| Quando o fluxo foi… | Dias | BTC no dia seguinte | Subiu em |
|---|---|---|---|
| **entrada** (positivo) | 387 | **+0,15%** | 51% |
| **saída** (negativo) | 266 | **−0,23%** | 45% |

A diferença existe, tem **o sinal certo** e vale 0,38 ponto percentual. É pequena demais
para passar no corte e some quando se olha por horizonte — mas é a primeira relação do
projeto cuja direção não inverteu na leitura simples.

**Conclusão:** o fluxo de ETF **não antecede o preço**. Isso derruba a hipótese que eu
classifiquei como a mais promissora de todas no inventário da CoinGlass — era fluxo de
dinheiro real, diário, cobrindo exatamente o regime em que tudo parou de funcionar.

**Mas vale coletar assim mesmo**, e por motivo que não é previsão: `institucional.etfFlow`
está declarado e vazio desde sempre, e o motor pesa 15% rodando com **um único
indicador**. Ter o dado é diferente de ter sinal.

---

## O que ficou pendente: liquidações

A chave gratuita da Coinalyze foi recusada com **401 direto na fonte** — testada fora da
nossa rota, então não é defeito do código. A rota `api/coinalyze.js` está escrita e
funcional (o CORS foi resolvido; o Safari bloqueava a chamada direta, mesmo caso do FRED
na v89 e do GDELT na v104).

**Se a chave for regularizada, a medição é um clique.** O prior declarado antes continua:
liquidação é **reativa por construção** — acontece porque o preço se moveu. É a hipótese
com menor chance de anteceder de tudo que já listamos.

---

## SÍNTESE — o que ~110 testes produziram

**1. Zero previsão, por seis caminhos independentes.** Microestrutura horária, variáveis
soltas, score agregado, precedência, faixas macro, faixas cripto. O padrão é sempre o
mesmo: **o que funcionava até 2023 desaparece ou inverte na era do ETF.**

**2. O sistema pesa o mundo errado para DESCREVER.** S&P e VIX são as únicas relações
estáveis e moderadas, e vivem num motor de 8%. O Macro pesa 28% para variáveis com
r ≈ 0,05.

**3. O único resultado que atravessou as duas janelas é redução de queda**, não previsão.

**4. Três crenças do projeto foram corrigidas:** o amortecimento não impedia o score de
cruzar ±15 (era cobertura — cruza em 8,3% dos dias, mas ±40 em 0,0%); o momentum de 24h
aparece com sinal invertido em três das quatro eras; e os seis sensores nunca testados
não merecem promoção.

**5. As 777 podem estar subdimensionadas.** Se os componentes vivem entre 0,02 e 0,07, o
agregado dificilmente passa de ~0,05, e 777 observações só detectam 0,10. **O desfecho
provável em abril é "inconclusivo", não "não existe".**

**6. O que continua sem teste:** interações entre variáveis, condicionamento por regime,
livro de ofertas, fluxo de ETF, put/call, GDELT histórico. **"Nada encontrado" não é
"nada existe"** — mas testar isso exige mais dado do que temos.

---

## Erros meus nestas rodadas, para o próximo Claude não repetir

- **Comparei nível com variação** nas duas primeiras versões do teste de co-movimento.
  Jorge corrigiu três vezes até eu acertar. Se ele não tivesse insistido, a tabela do
  item 2 acima não existiria.
- **Construí a série sintética errada** ao validar a precedência (nível `50×(1+mov)` em
  vez de série cumulativa) e quase "consertei" código que estava certo.
- **Meu teste de monotonia aprovava `[1,1,9,1,1]`** — um pico isolado no meio, que é
  justamente o que o acaso produz.
- **Um laço passava do fim do vetor** com defasagem negativa; teria derrubado o teste 2
  no navegador.
- Em todos os casos, quem pegou foi **executar o teste**, não reler o código.

---

*Registrado em 19/08/2026, com o `m11-2026-08-18` congelado e a série em 4 janelas de 777.
Atualizado no mesmo dia com as rodadas 5 a 8.*

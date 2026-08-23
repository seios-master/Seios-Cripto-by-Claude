# SEIOS CRIPTO — ONDE VIEMOS, ONDE ESTAMOS, PARA ONDE VAMOS
## Relatório de estado · 19 de agosto de 2026 · `m12-2026-08-19` · build `v123-serie-camadas`

> Documento de continuidade. Escrito para que qualquer pessoa — inclusive um Claude de
> outra sessão — entenda o que este projeto sabe, o que ele não sabe, e por que as duas
> listas têm o tamanho que têm.
>
> Leia junto: `CONGELAMENTO-m12-2026-08-19.md` (o que não pode mudar),
> `RESULTADOS-LABORATORIO-2026-08-19.md` (as ~110 medições) e `SEIOS-MEMORIA-2026-08-19.md`
> (como trabalhar).

---

# PARTE I — DE ONDE VIEMOS

## O projeto começou com uma tese, e a tese foi refutada

O SEIOS nasceu para **prever**: agregar 30+ indicadores em oito motores ponderados,
produzir um score direcional e disparar uma escada de ação — Reforçar, Entrar
parcialmente, Observar, Reduzir, Sair.

Em 18 e 19 de agosto de 2026, sete laboratórios isolados e ~110 testes, todos com regra
declarada antes de medir e reserva temporal separada, produziram **zero aprovações**.

**A tese preditiva está refutada dentro do que conseguimos medir.** Não com uma medição
frouxa que "não achou" — com medições que **descartam** efeitos acima de um tamanho
declarado.

## As sete rodadas, e o que cada uma estabeleceu

| Rodada | Amostra | Resultado |
|---|---|---|
| Microestrutura 1h | 8.998 obs | **Descarta** efeito acima de r ≈ 0,027 |
| Microestrutura 8h/24h | 673 / 223 obs | Nada, com poder fraco (r mín 0,10–0,12) |
| 23 variáveis × 3 horizontes | 3.289 dias | 69 testes, nenhum passou |
| Score agregado | 2.328 / 960 dias | Estudo **+0,071 (t=3,43)** → reserva **−0,019: INVERTE** |
| Co-movimento (anda junto) | 3.289 dias, 4 escalas | S&P +0,351 · VIX −0,282 estáveis; macro ~0,05 |
| Escada vs. comprar e segurar | 3.289 dias | Bateu no total, **empatou na era do ETF** |
| Precedência (−10 a +10 dias) | 3.289 dias | **Todos os picos em defasagem ZERO** |
| Cripto-nativos por faixa | 2.328 / 960 dias | Prêmio Coinbase morreu na reserva |

## O momento que define o método

O score agregado deu **r = +0,071 com t = 3,43** no estudo — passaria com folga em
qualquer corte razoável. Na reserva (era do ETF, 2024+), deu **−0,019**. Não perdeu força:
**inverteu o sinal.**

Se a partição fosse aleatória em vez de temporal, isso teria virado "o sistema funciona".
**É a demonstração mais clara do projeto de por que a reserva tem que ser o futuro do
estudo**, e por que "descoberta" e "confirmação" não podem sair da mesma amostra.

## O modelo mudou uma vez, e só uma

O `m11` foi congelado em 18/08 e reaberto no mesmo dia — com a série em **4 janelas**, o
momento mais barato que existiria — para corrigir três coisas que as medições
estabeleceram:

1. **Macro 28% → 15%, Ativos Globais 8% → 21%.** O peso do Macro representava a premissa
   de que o BTC responde a liquidez. A premissa foi refutada: M2 +0,067, Fed Funds −0,057,
   curva −0,008, liquidez líquida do Fed −0,029. Enquanto S&P (+0,351) e VIX (−0,282),
   as duas relações estáveis nas quatro eras, viviam num motor de 8%.
2. **Momentum 24h → sensor.** Única variável com sinal consistente contra retorno futuro,
   e é **negativo** (−0,048 estudo, −0,059 reserva, negativo em 3 de 4 eras). O sistema
   votava bullish. **Não invertemos** — rebaixamos, porque a direção é desconhecida.
3. **"Reforçar" (≥ +40) declarado inatingível.** Em 3.289 dias, o score máximo em módulo
   foi 27,7.

**Foi a última mudança de modelo.** A partir daqui, "os dados sugerem" não é argumento.

---

# PARTE II — O QUE SABEMOS COM CERTEZA

## Certezas duras (medidas, com reserva separada)

**1. Nada que medimos antecede o preço.** As três relações reais — S&P, VIX, dólar — têm
pico de correlação em **defasagem exatamente zero**, com t de 12,44 · −10,82 · −6,43. As
que deram defasagem positiva têm r ≤ 0,06 e somem ou invertem na reserva.

**2. O BTC é um ativo de risco, não um fenômeno macro-monetário.** S&P +0,351 e VIX
−0,282 são as únicas relações estáveis nas quatro eras (varejo, institucional, pré-ETF,
ETF). Ouro +0,021. Euro +0,075. Liquidez líquida do Fed −0,029.

**3. A calibração histórica de 285 dias nunca teve poder.** Horizonte de 30 dias em 285
dias = ~9,5 observações independentes. **Nenhuma decisão pode se apoiar nela.**

**4. A microestrutura reconstruível não carrega sinal.** 8.998 observações horárias,
r entre −0,013 e +0,007, sinais trocando entre estudo e reserva.

**5. O score cruza ±15 em 8,3% dos dias e ±40 em 0,0%.** Isto corrigiu uma crença antiga
do projeto: o backtest interno culpava o amortecimento, e o motivo real era **cobertura**
(56% contra 81% na reconstrução).

## O que confirmamos ao vivo em 19/08

O BTC saiu de ~62k e bateu 68,7k (+6% no dia). Nenhum sensor "avisou": às 09:53, com o
movimento já em curso, book estava em **−10**, taker em **−7,4**, OI em **−4,0**, prêmio
Coinbase em **−3,7**. Todos viraram positivos **depois** que o preço subiu.

**Não foi previsão. Foi reflexo.** É a terceira confirmação independente do mesmo fato.

---

# PARTE III — O QUE MUDOU DE VERDADE: A LEITURA EM TRÊS CAMADAS

## O diagnóstico que gerou a mudança

Em 19/08, num dia de +6%, o score foi de 10,16 para 11,89 — **+1,7 pontos**. Dois motores
se moveram (Técnico +11,8, Derivativos +9,6) e quatro **não tinham como**: o FRED atualiza
uma vez por dia útil, o M2 uma vez por mês, On-chain e Ativos Globais leem janelas de 90
dias.

**O erro nunca foi medir coisas lentas. Foi somá-las com coisas rápidas e chamar o
resultado de score único.**

## A regra: cadência da fonte, não horizonte

Cada indicador pertence à camada da **frequência com que a fonte realmente muda**.
Cadência ≠ horizonte: o RSI vem de fechamentos diários (lento) mas fala do momento; o MVRV
atualiza todo dia e fala do ciclo.

**As camadas não se chamam curto/médio/longo prazo** — esses nomes prometeriam previsão.

| Camada | Janela | Indicadores | O que responde |
|---|---|---|---|
| **AGORA** | 24h | 7 — momentum, book, taker, long/short, funding, OI, put/call | o que está acontecendo neste instante |
| **A SEMANA** | 7d | 7 — RSI, MM50, tendência 30d, prêmio Coinbase, F&G, GDELT tom, GDELT volume | o que se formou nos últimos dias |
| **O TERRENO** | 30d | 14 — MVRV, endereços, hash, Macro (5), Ativos Globais (5), EPU | em que ambiente isso acontece |

**Fora das três:** euro (dupla contagem do dólar) e ouro (t = 0,43; −0,02 contra retorno
futuro) — motivos que não dependem de relógio.

## O que a divisão revelou, e ninguém tinha visto

**Dos sete indicadores da camada AGORA, QUATRO estão fora do score.** Momentum, book,
taker e long/short são sensores. **A camada que lê o instante estava com 3 de 7 votando.**

É a explicação aritmética de por que o sistema pareceu surdo num dia de +6%.

**Nesta leitura os sensores votam** — o motivo do rebaixamento foi "janela de 1h num
relógio de 8h", e aqui a pergunta **é** o instante. Eles continuam sensores **para o
score**.

## Como cada camada decide

**Proporção** (quantos concordam) **e força média** (com que convicção), lado a lado —
porque **podem discordar, e a discordância é informação**. Com +80, +5, +3, −70: proporção
diz 75% alta; força diz +4,5.

Classificação por indicador: **≥ +15 alta · ≤ −15 baixa · entre os dois neutro · sem dado
fora da conta**. Nenhum corte inventado.

**Seis rótulos:** ALTA · ALTA PARCIAL · DIVIDIDO · PARADO · BAIXA PARCIAL · BAIXA.
"Dividido" é conflito; "parado" é ausência de movimento; "parcial" é metade apontando e
ninguém do outro lado. **A média confundia os três.**

## O que a leitura em camadas mostrou em 19/08 que o score não mostrou

| Hora | Preço | Score | AGORA | book | taker |
|---|---|---|---|---|---|
| 12:44 | 68.673 | 11,89 | ALTA (71%, força +26) | +45 | +27 |
| 14:29 | 67.900 | 11,41 | PARADO | +13 | −2 |
| 15:04 | 68.172 | 11,15 | ALTA PARCIAL (43%, força +7,5) | **−48** | −1 |
| 16:18 | 68.127 | 11,01 | **ALTA (71%, força +24)** | **+55** | +15 |

O score andou 0,88 ponto o dia inteiro. **A camada AGORA descreveu a pressão compradora
sumindo e voltando** — o book virou 103 pontos entre 15:04 e 16:18 com o preço parado.

**Isso é leitura de mercado. O score não dá.**

---

# PARTE IV — O QUE NÃO SABEMOS

## Dúvidas honestas, sem resposta hoje

**O momentum aponta reversão ou continuação?** −0,048 no estudo, −0,059 na reserva,
negativo em 3 de 4 eras — mas t = −1,82, **abaixo do corte de 2,576**. Não há prova de que
é negativo; há ausência de base para afirmar que é positivo. **Por isso virou sensor e não
teve o sinal invertido.**

**O book vira antes do preço?** Em 19/08 ele virou de +45 para −48 e voltou para +55, com
o preço quase parado. Pode ser sinal; pode ser exatamente o ruído que o fez ser rebaixado
(120 pontos em 25 minutos). **A série decide.**

**A leitura em camadas é melhor que o score?** Não há critério de validade para ela. O
score tem as 777. **Descrever bem é mais fácil de sustentar que prever — mas ainda precisa
de teste, e não temos um bom para propor.**

**As 777 são suficientes?** Elas detectam r ≈ 0,10. Todos os componentes medidos vivem
entre 0,02 e 0,07. **O desfecho provável em abril é "inconclusivo", não "não existe".**

## O padrão das escalas mal dimensionadas (medido em 19/08)

Quatro indicadores têm corte de ±15 que não corresponde à distribuição deles:

| Indicador | % dos dias que cruzam ±15 | Efeito |
|---|---|---|
| `funding` | **0%** | nunca sai do neutro |
| `cvd24h` | **1,8%** | quase nunca sai do neutro |
| `activeAddresses` | **82%** | quase nunca fica no neutro |
| `hashrate` | **86%** | quase nunca fica no neutro |

**A causa é comum:** o corte de ±15 foi herdado de um indicador para todos os outros e
**nunca foi medido por indicador**. Dois nunca falam, dois falam sempre.

Isto está registrado, não corrigido — trocar régua com a distribuição que revelou o
problema é calibrar com o dado que apontou o defeito. É material para uma próxima
geração, não para um remendo no m12.

**E um fato novo sobre o mercado, que só apareceu ao medir:** a mediana do CVD de 24h é
**−2,1%**. O normal do BTC é **venda líquida a mercado** — quem compra para segurar usa
ordem limitada; quem vende com pressa usa ordem a mercado. O dia 19/08, com +8,3%, ficou
no **percentil 97**.

## O que nunca foi testado

Interações entre variáveis (as constelações), precedência de segunda ordem,
não-linearidade e limiares, condicionamento por regime, profundidade de livro, spread,
liquidações, fluxo de ETF, put/call histórico, GDELT histórico.

**"Nada encontrado" não é "nada existe".** Mas testar isso exige mais dado do que temos,
e cada combinação nova aumenta a chance de achar padrão por acaso.

---

# PARTE V — O QUE TEM ZERO RELAÇÃO COM O BTC

Medido em 3.289 dias, quatro escalas de tempo, quatro eras. **Nenhum destes merece
promoção, e a pergunta está encerrada:**

| Variável | r mensal | Observação |
|---|---|---|
| Ouro (PAXG) | **+0,021** | não é "ouro digital" |
| Juro real 10a | **−0,034** | sensor, nunca votou |
| Balanço do Fed | **+0,014** | sensor, nunca votou |
| Liquidez líquida (WALCL−TGA−RRP) | **−0,029** | a tese macro mais elegante, e é zero |
| Curva 10a−2a | **−0,008** | vota no score |
| CPI | **−0,027** | vota no score |
| Fed Funds | **−0,057** | vota no score |
| M2 | **+0,067** | vota no score |
| EPU | **−0,055** | vota no score |
| Euro | **+0,075** | sensor desde a v111 |
| Dólar amplo | **−0,141** | bem mais fraco que a narrativa; **+0,06 na era do ETF** |

**Cuidado com dois números altos que não contam:** Fear & Greed (+0,493) é construído a
partir do momentum e da volatilidade do próprio BTC — é o preço correlacionado consigo
mesmo. Endereços ativos (+0,303) é reflexivo: 0,012 no dia, 0,433 no trimestre.

**E stablecoins invertem por era:** −0,26 no início, **+0,46 agora**. O agregado de −0,166
esconde uma virada que pode ser real e merece observação.

---

# PARTE VI — PARA ONDE VAMOS

## O que está acontecendo a partir de agora

**Coletar. Três leituras por dia, espaçadas ~8 horas.** Cada leitura grava:

- score, composites, pesos efetivos, cobertura, ação — a série das 777
- **os três rótulos das camadas** com proporção, força e cobertura (desde a v123)
- ~45 observações point-in-time com valor bruto, fonte, série e instantes

Hoje: **9 leituras · 8 janelas de 777 · 1.971 observações · 46 indicadores**.

## As perguntas que SÓ as coletas respondem

**1. O score tem informação direcional em 8h?** Marcos declarados em 18/08, antes de
existir dado: **85 · 194 · 347 · 783 janelas**, corte |t| ≥ 2,576 (1%, por causa das quatro
conferências). Detectam r ≈ 0,30 · 0,20 · 0,15 · 0,10.

**2. Quando o AGORA diz ALTA, o preço sobe depois?** Só existe resposta a partir da v123 —
antes o rótulo não ficava salvo. **Esta é a pergunta mais promissora do projeto**, porque
a camada AGORA é a única com cadência compatível com o horizonte de 8h.

**3. O book vira antes do preço?** Agora há série com rótulo, força e preço no mesmo
registro.

**4. As stablecoins mudaram de sinal de verdade?** −0,26 → +0,46 entre eras é grande
demais para ignorar e pequeno demais para agir.

**5. O momentum é reversão?** 3 de 4 eras dizem que sim, e o corte diz que não sabemos.

**6. A escada de ação funciona?** O score cruza ±15 em ~8% dos dias. Em 777 janelas, ~65
eventos. **Nunca cruzará ±40.**

## Como ler os marcos quando chegarem

**Se passar:** não é licença para mudar peso. É **hipótese confirmada em dado que a
hipótese não viu** — e a decisão que vier dela é uma nova geração de modelo, não um
remendo.

**Se não passar aos 783:** a resposta é **não, acima de r = 0,10**. Não é "zero" — é
"menor do que 777 observações conseguem ver". Terá custado oito meses para ser sabido com
honestidade, em vez de nunca ser sabido com conforto.

## O que fazer com os sensores acumulados

Treze sensores gravam valor bruto sem votar: ouro, euro, momentum, book, taker,
long/short, stablecoins (3), juro real (2), liquidez líquida (2). ~43 leituras cada, hoje.

**Três erros a não cometer** quando houver dado para cruzar:

1. **Testar 45 variáveis contra o mesmo retorno.** Com 45 testes a 5%, esperam-se ~2
   falsos positivos sem sinal nenhum. **Declare antes quais serão testadas.**
2. **Estimar peso com os dados que revelaram o sinal.** Sinal justifica **promover**, não
   calibrar. Peso por argumento estrutural; validação com dado novo.
3. **Reponderar os nove motores.** 777 observações estimam **uma** correlação. Nove
   parâmetros da mesma amostra é encaixe no passado.

## O que continua livre, sem tocar no modelo

Painéis, relatórios, exportação, skins, infraestrutura, medições em modo laboratório, e
qualquer coisa que **acrescente** dado à série.

## O que reabriria o modelo — e só isto

1. Defeito que corrompe dado acumulado
2. Fonte que morre de vez
3. Um marco falando com significância

**Não reabre:** achar que um peso deveria ser outro; a calibração sugerir algo; um
indicador ir mal por semanas; vontade de melhorar.

---

# PARTE VII — O QUE ESTE PROJETO É, HONESTAMENTE

**O que ele NÃO é:** um previsor. Não avisa antes. Não diz quando comprar. A hipótese de
que indicadores públicos e lentos preveem o BTC em horas é, honestamente, improvável — é
a informação que todo mundo tem, no ativo mais observado do mundo.

**O que ele É:** um instrumento honesto de descrição de estado, com rastreabilidade rara.
Ele mede em vez de opinar, explicita premissas, mostra o que ficou de fora do score com o
número do que custaria, separa três velocidades em vez de misturá-las, e **não mente**.
Em 19/08, num dia de +6%, ele disse "Neutro" e não fingiu ter visto o que não viu.

**O único resultado que atravessou as duas janelas do backtest:** a escada cortou a
**queda máxima pela metade** — 51,7% contra 83,2% no total, 26,9% contra 53,0% na era do
ETF, inclusive onde empatou em retorno. Isso é gestão de risco, não previsão. É a pista
mais interessante que sobrou, e continua não confirmada.

---

> *O valor deste projeto até aqui não veio de builds que melhoraram o sistema —
> veio de builds que removeram mentiras dele.*

*19/08/2026 · `m12-2026-08-19` congelado · v123 · 505 testes · 0 falhas ·
série em 8 de 777 · 1.971 observações point-in-time*

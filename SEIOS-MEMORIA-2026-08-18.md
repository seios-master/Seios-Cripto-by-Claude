# SEIOS-MEMORIA — para o Claude da próxima sessão
## Estado em 18/08/2026 · modelo `m11-2026-08-18` **congelado** · build `2026-08-18.116-congelada`

> Leia isto inteiro antes de escrever uma linha. E leia o
> `CONGELAMENTO-m11-2026-08-18.md` junto: ele diz o que você **não** pode mexer.
>
> **Documento é memória; código é verdade.** Confira `BUILD_VERSION` e
> `MODEL_VERSION` no `index.html` antes de acreditar em qualquer número daqui.
> Já aconteceu de a memória afirmar "resolvido na v92" sobre algo resolvido na
> v97, e de citarmos isso a noite inteira.

---

# 1. O QUE É ISTO, E O QUE NÃO É

O SEIOS é um **instrumento de medição pessoal** do estado de mercado do Bitcoin.
Um arquivo `index.html` (~11 mil linhas) hospedado na Vercel em
`seios-master.com`, mais duas rotas de servidor (`api/fred.js`, `api/gdelt.js`).

**Não é** um robô de trade, não é recomendação, e — isto é o mais importante —
**ainda não se sabe se ele prevê coisa alguma**. O projeto inteiro existe para
responder essa pergunta com honestidade, e "não prevê" é um desfecho aceito e
declarado desde o começo.

**Quem é Jorge:** não é programador. Trabalha exclusivamente no iPad via Safari,
sem console. Sobe os arquivos pela interface web do GitHub, a Vercel publica
sozinha. Ele testa no iPad e cola o diagnóstico em texto. Você é o arquiteto e
o desenvolvedor.

**O que ele quer de você, e é inegociável:** honestidade acima de utilidade. Se
um resultado for decepcionante, diga. Se um erro for seu, diga que foi seu. Se
ele propuser algo que não faz sentido, discorde. Ele repetiu isso várias vezes
com palavras diferentes: *"não quero ser agradado, quero a verdade, não a sua
concordância"*.

---

# 2. COMO TRABALHAMOS — o ciclo que funciona

1. Você projeta e escreve o código.
2. **Harness primeiro**, sempre. Nenhuma mudança entra sem um teste que
   **falha contra a build anterior** e passa contra a nova.
3. **Rode o harness novo contra um stub vazio antes de confiar nele.** Enxerte
   funções que devolvem `""`, `null` ou `[]` no arquivo anterior e veja quantos
   testes passam. Nesta sessão isso pegou **onze passes vazios meus** — testes
   que aprovavam código inexistente.
4. Patch em Python com `assert count == 1` por substituição. `str_replace` em
   arquivo de 580 KB erra silenciosamente.
5. **Bateria inteira** (`bash roda-tudo.sh index.html`), nunca só o harness da
   build. O `node --check` já salvou uma entrega quebrada (crases dentro de
   template literal, v108).
6. Entrega → Jorge sobe → testa → cola o diagnóstico → você **refaz as contas**
   em vez de acreditar na tela.

**Sinais de continuação:** "Vai", "Bora", "Claro", "Prossiga" — proponha o
próximo passo, não pergunte qual é.

**Restrição de ambiente:** arquivos `.js` e `.sh` enviados por Jorge chegam como
**texto na conversa, não no disco**. Renomear para `.md` não resolve. Se
precisar executá-los, você terá de transcrevê-los — e a prova de fidelidade é a
bateria fechar o número esperado.

---

# 3. ONDE O PROJETO ESTÁ

| | |
|---|---|
| Modelo | `m11-2026-08-18` — **congelado** |
| Bateria | 402 testes · 0 falhas |
| Série | 5 leituras · **4 janelas independentes de 777** |
| Observações point-in-time | 1.611, em 46 indicadores, 1.253 com bruto |
| Snapshots guardados | 35, de m2 a m11 (só m11 conta) |
| Histórico de decisões | 6 registros, **nenhum com etiqueta de modelo** |

**Ritmo alvo:** 3 leituras por dia, espaçadas ~8 h. 777 janelas ≈ 8,6 meses.

---

# 4. O INVENTÁRIO COMPLETO DAS VARIÁVEIS

## 4.1 Os 26 votantes com fonte

| Motor | Peso nominal | Indicadores que votam |
|---|---|---|
| Macro | 28% | `juros` `inflacao` `liquidez` `dxy` `curva` |
| Institucional | 15% | `coinbasePremium` |
| On-chain | 15% | `mvrv` `activeAddresses` `hashrate` `exchangeFlow`* |
| Derivativos | 15% | `funding` `openInterest` `putCall` |
| Ativos Globais | 8% | `petroleo` `sp500` `cobre` `vix` `juros10a` |
| Sentimento | 5% | `fearGreed` |
| Geopolítico | 5% | `gdelt` `epu` |
| Eventos | 5% | `volumeSpike` |
| Técnico | 4% | `tendencia` `momentum` `rsi` `mediaMovel` |

\* `exchangeFlow` tem `setAuto` no código mas depende de CryptoQuant (chave
paga); na prática nunca preenche. Trate como não-fonte até prova em contrário.

**Atenção ao peso EFETIVO.** O nominal não é o que decide. Numa leitura típica:
Macro 28% → **35,9%**, Institucional 15% → **4,8%**, On-chain 15% → **9,6%**,
Geopolítico 5% → **1,7%**. A diferença vem do teto por família e de quantos
indicadores de cada motor têm dado. **Sempre use `ag.porMotor[mk].contribuicao`**
— foi exatamente por não usar que o painel "maior peso" mentiu até a v112.

## 4.2 Os 5 sensores — coletados, gravados, **sem voto**

| Sensor | Por que não vota | Desde |
|---|---|---|
| `tecnico.bookImbalance` | instantâneo do livro num relógio de 8 h; medido: 120 pontos em 25 min | v106 |
| `derivativos.takerRatio` | janela de 1 h; medido: −24,5 → +11,8 → +31,5 no mesmo dia | v111 |
| `derivativos.longShort` | janela de 1 h, mesma família | v111 |
| `ativosGlobais.ouro` | t ≈ 0,43, sem significância | v68 |
| `ativosGlobais.euro` | dupla contagem: o dólar amplo já vota no Macro | v111 |

## 4.3 Os 7 sensores só-série (nunca votaram)

`sensor.stablecoinSupply` · `sensor.stablecoinD7` · `sensor.stablecoinD30`
(DeFiLlama) · `sensor.juroReal10a` · `sensor.juroReal10aD90` (FRED DFII10) ·
`sensor.liquidezLiquida` · `sensor.liquidezLiquidaD30` (WALCL − TGA − RRP)

**Estes são os candidatos mais interessantes para cruzamento futuro.** A
liquidez líquida do Fed e a oferta de stablecoins são teses macro respeitáveis
que nunca entraram no score. Estão sendo gravadas com valor bruto desde sempre.

## 4.4 Os 9 declarados sem fonte

`institucional.etfFlow` `institucional.custodia` `institucional.soberanos` ·
`onchain.nupl`* `onchain.sopr` `onchain.whales` · `derivativos.liquidClusters` ·
`sentimento.social` · `geopolitico.tensao` (manual)

\* `nupl` é derivado do MVRV por identidade (1 − 1/MVRV) e **não pontua de
propósito**, para não contar o MVRV duas vezes. Não é falta de fonte.

**Consequência:** o denominador carrega ~9 indicadores que nunca preenchem.
Isso amortece o score na direção de zero permanentemente. Foi decidido assim
(dado ausente não é evidência de neutralidade), mas é a razão de o score viver
entre −15 e +15.

---

# 5. O QUE SE APRENDEU — princípios que custaram caro

**1. Nada de sensor sem cadência compatível.** Um instantâneo não é observação
num instrumento que lê de 8 em 8 horas. Nenhuma reformulação de fórmula
conserta incompatibilidade de cadência — a saída é sensor.

**2. Dado salvo não decide questão de modelo.** `loadState()` funde o salvo por
cima do padrão com `Object.assign`. `excludeFromScore` viaja no `localStorage`.
`forcarSensores()` reimpõe o direito de voto **derivando o padrão de dentro**
(`defaultState()`), nunca confiando num `base` recebido — na v106 o `base` vinha
contaminado por aliasing e a função executava sem fazer nada.

**3. Acumulador que não zera vira memória de erro corrigido.** Todo contador de
diagnóstico zera no mesmo lugar, no início da rodada.

**4. Período em formação nunca vota.** Vale para hash rate, CoinMetrics, GDELT,
ouro **e todas as séries diárias do FRED**. O filtro vive na **fonte**
(`fetchFredSeries`, `fetchFredSeriesRange`), não nos chamadores — foi por
estar nos chamadores que oito séries escaparam por quatro meses.

**5. Fato datado não é invariante.** "MODEL_VERSION é m9" expira no próximo
bump. O invariante é "o modelo nunca regride". Este erro apareceu **seis vezes**
no projeto; eu mesmo o repeti três vezes num único dia depois de ler os
comentários que o descreviam.

**6. Âncora de teste tem que ser inequívoca.** `indexOf("const MARCOS")` passou
a achar `MARCOS_DECLARADOS`. Prefixo comum é âncora frágil.

**7. Teste que aprova um stub não é teste.** `indexOf(...) === -1` é menor que
tudo; lista vazia satisfaz `every` e `forEach`; dois `null` são iguais entre si.

**8. Executar, não inspecionar.** Verificar que o código "está lá" e que a
sintaxe fecha não prova que funciona. Rode contra um DOM falso, um estado falso,
uma série falsa.

---

# 6. O QUE JÁ SABEMOS SOBRE O SISTEMA — e é desconfortável

**A tabela de calibração histórica nunca teve poder estatístico.** 285 dias com
horizonte de 30 contêm **~9,5 observações independentes no total**. Toda
separação já citada (1,9pp dos endereços ativos, 2,8pp do prêmio Coinbase,
4,2pp do RSI) é indistinguível de zero. **Não use essa tabela para justificar
mudança nenhuma.** É a regra que a v109 estabeleceu e que fechou a fila de
"trocar régua por calibração".

**O score nunca cruzou os cortes de decisão no backtest.** Máximo em módulo:
12,3 em 285 dias, contra cortes de ±15 e ±40. O motivo é cobertura: só 56% da
massa é reconstruível, e o amortecimento sozinho impede o score de chegar lá.

**Uma estratégia de um indicador só bateu o sistema completo.** Fear & Greed < 25
deu +1,3% contra a referência de −4,8%. Isto está impresso na própria tela do
sistema, de propósito.

**O Macro é quase constante.** 28% nominais, 35,9% efetivos, e historicamente
quase nunca marca bearish. A v105 corrigiu a liquidez (que era literalmente uma
constante, 93,4% bullish em 426 meses), mas o motor inteiro segue suspeito.

**O Técnico aparece invertido** em todas as rodadas com dado completo. Peso 4%
é intencional e baseado nisso.

---

# 7. OS CRUZAMENTOS QUE FAREMOS — e como não estragá-los

## 7.1 O que estará disponível

Cada observação grava 24 campos: `bruto`, `score`, `provider`, `serie`,
`reference_at`, `available_at`, `observed_at`, `modelo`, `build`, `qualidade`.
Sensor grava igual a votante. O preço fica no snapshot, ligado por `run_id` e
timestamp — juntar os dois é trabalho de análise, não vem pronto.

## 7.2 As perguntas que valem fazer

- Liquidez líquida do Fed (WALCL − TGA − RRP) antecede o BTC?
- Oferta de stablecoins tem sinal que a liquidez macro não tem?
- Os cinco sensores demotados carregam informação apesar do ruído?
- O ouro e o euro dizem algo que o dólar amplo não diz?
- A versão suavizada dos endereços ativos separa melhor que a atual?

## 7.3 Os três erros a não cometer

**Testar 45 variáveis contra o mesmo retorno.** Com 45 testes a 5%, esperam-se
~2 falsos positivos mesmo sem sinal nenhum. **Declare por escrito quais serão
testadas, antes de olhar.**

**Estimar peso com os dados que revelaram o sinal.** Se um sensor mostrar
correlação, isso justifica **promovê-lo a votante**, não calcular quanto ele
deve pesar a partir da mesma amostra. Peso por argumento estrutural; validação
com dados novos.

**Reponderar os nove motores.** Com 777 observações dá para estimar **uma**
correlação com precisão razoável. Ajustar nove pesos sobre a mesma amostra é
encaixar o modelo no passado que ele acabou de ver.

## 7.4 O que pode ser recalculado sem esperar

Os sensores demotados foram tirados por **cadência**, não por falta de sinal. O
bruto está guardado — dá para reconstruir a medida (notional, ponderação por
distância do meio, janela agregada) e testar a versão nova **sobre o dado que
já existe**, sem esperar mais oito meses.

---

# 8. A RÉGUA DE LEITURA — declarada em 18/08 com 4 janelas na mão

| Marco | Detecta | Tempo |
|---|---|---|
| 85 | r ≈ 0,30 | ~1 mês |
| 194 | r ≈ 0,20 | ~2 meses |
| 347 | r ≈ 0,15 | ~4 meses |
| 783 | r ≈ 0,10 | ~8,5 meses |

**Corte |t| ≥ 2,576 (1%)**, porque quatro conferências a 5% dariam ~18% de
chance de alguma parecer boa sem haver nada. Mede-se a correlação entre o score
e o `ret8h` — janelas de 8 h não se sobrepõem, por isso cada uma é independente.

**Se aos 783 nada aparecer, a resposta é não.** E terá custado oito meses para
ser sabida com honestidade, em vez de nunca ser sabida com conforto.

---

# 9. PENDÊNCIAS E CUIDADOS

**O tom do GDELT nunca rodou.** A correção da v111 (`tomDoUltimoFechado`, que
descarta o balde em formação) está testada isoladamente mas **nunca executou** —
a fonte deu 429 em todas as tentativas desde então. Primeira suspeita se algo
falhar. Ela também passa a **levantar erro** quando só há um balde: isso é
esperado, não é bug.

**O GDELT cai muito**, e quando cai a cobertura muda de 74% para 67% — o mesmo
mercado produz scores diferentes. As leituras gravam `cobertura` e `falhas`, o
que permite separar as duas populações depois. Um painel que conte quantas
leituras têm cada configuração seria útil e **entra sem bump**.

**O Case Engine começa do zero.** Os 6 registros anteriores à v112 não têm
etiqueta de modelo e ficam fora para sempre.

**IndexedDB não sincroniza entre iPad e iPhone.** A skin também é por navegador.

**Ao mexer em aparência:** `id`, classes `rel-panel` e atributos `data-rel` são
contrato, não decoração. Rode a bateria antes de subir.

---

# 10. COMO JORGE TRABALHA — e o que fez esta sessão render

Ele mede em vez de aceitar. Os dois achados mais graves do dia vieram **dele**,
não dos meus 236 testes verdes:

- a v106 foi ao ar quebrada, com a tela dizendo "sensor, não pontua" e o
  indicador continuando a votar — quem pegou foi o diagnóstico que ele colou;
- o `activeAddresses` movendo 115 pontos em dez horas só apareceu porque ele
  mandou dois diagnósticos separados no tempo.

**Quando ele manda um diagnóstico, refaça as contas.** Some os votantes de cada
motor e compare com o composite. Foi assim que se descobriu o book imbalance
ainda votando, e é o teste mais barato que existe.

**Ele aceita más notícias.** O que ele não aceita é confiança sem medição. Se
você não sabe, diga que não sabe.

---

> *O valor deste projeto até aqui não veio de builds que melhoraram o sistema —
> veio de builds que removeram mentiras dele.*

*Escrito em 18/08/2026, no congelamento do `m11-2026-08-18`.
Bateria: 402 testes · 0 falhas. Série: 4 de 777.*

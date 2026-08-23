# SEIOS-MEMORIA — para o Claude da próxima sessão
## Estado em 19/08/2026 · modelo `m12-2026-08-19` **congelado** · build `2026-08-19.118-textos-m12`

> ## ⚠ PENDÊNCIA ABERTA — v136, a fazer na próxima sessão
>
> **O herói é o que deixa a página grande, não os painéis.** A auditoria de
> 23/08 encontrou isto depois de TRÊS builds mexendo no lugar errado: as onze
> seções de relatório (ajustes, cenários, premissas, decisão, série, backtest,
> histórico, memória, case engine) já nascem `hidden` desde builds antigas —
> nunca estiveram na tela. Só duas seções são visíveis, e ambas já foram
> dobradas nas v132–v135.
>
> O que ocupa a altura é o **bloco do herói**, que fica FORA do `#app`: veredito
> em 64px, os cinco itens do regime um por linha, a ação em 30px, o parágrafo do
> cenário, o preço em 38px, o gráfico e as três médias móveis. Tudo sempre
> visível, antes de qualquer dobra.
>
> **A correção:** o herói fica com veredito, ação e preço. Os cinco itens do
> regime vão para dentro da dobra **Ciclo** (é onde são explicados). O parágrafo
> do cenário e as médias móveis viram a sétima dobra: **Contexto**.
>
> ---
>
> ## ACHADO DE 23/08 — o primeiro resultado forte do projeto
>
> **Seis variáveis DESCREVEM alta e baixa** em defasagem zero, e sobrevivem ao
> corte de robustez das últimas 72h — o mesmo corte que derrubou o open interest
> em 21/08 (r = +0,355 → +0,013). Medido em 2.999 horas:
>
> | variável | estudo | reserva | sem 72h |
> |---|---|---|---|
> | Vendidos − Comprados | +0,663 | +0,626 | **+0,539** |
> | Open interest 1h | +0,590 | +0,638 | **+0,573** |
> | Proporção de vendidos | +0,515 | +0,487 | **+0,502** |
> | Liquidação de vendidos | +0,469 | +0,548 | **+0,460** |
> | Liquidação de comprados | −0,553 | −0,360 | **−0,347** |
> | Agressão compradora | +0,440 | +0,368 | **+0,397** |
>
> **Separação direta:** a proporção de liquidação de vendidos fica em **71,4%
> nas altas contra 32,6% nas baixas**, t = 18,46. Open interest 1h: +0,24% nas
> altas contra −0,21% nas baixas, t = 15,30.
>
> **REPROVARAM:** funding (r = 0,004), long/short (0,007), volume e liquidação
> total (invertem entre as fases). A **agressão passou mas ficou de fora** por
> decisão declarada antes de medir: é quase a definição de preço subindo.
>
> **ISTO NÃO É PREVISÃO.** É defasagem ZERO. A previsão foi testada em ~170
> medições e é zero. Correlação contemporânea de 0,66 é compatível com previsão
> nula — e aqui sabemos que é nula, porque medimos.
>
> ---
>
> **Leia `ESTADO-DO-PROJETO-2026-08-19.md` primeiro** — é o relatório completo de onde
> viemos, o que sabemos, o que não sabemos e o que as coletas vão responder.
>
> **E `RESULTADOS-LABORATORIO-2026-08-19.md`** antes de propor qualquer
> medição ou mudança. ~110 testes já foram feitos, com regra declarada antes e
> reserva temporal. Nenhum foi aprovado. Repropor sem dado novo é desperdício.

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
| Modelo | `m12-2026-08-19` — **congelado** |
| Bateria | 611 testes · 0 falhas |
| Série | 9 leituras · 8 janelas de 777 · 1.971 observações |
| Sistema paralelo | **leitura em três camadas** (AGORA/SEMANA/TERRENO), com série própria desde a v123 |
| Observações point-in-time | 1.611, em 46 indicadores, 1.253 com bruto |
| Snapshots guardados | 35, de m2 a m11 (só m11 conta) |
| Histórico de decisões | 6 registros, **nenhum com etiqueta de modelo** |

**Ritmo alvo:** 3 leituras por dia, espaçadas ~8 h. 777 janelas ≈ 8,6 meses.

---

# 4. O INVENTÁRIO COMPLETO DAS VARIÁVEIS

## 4.1 Os 26 votantes com fonte

| Motor | Peso nominal | Indicadores que votam |
|---|---|---|
| **Ativos Globais** | **21%** | `petroleo` `sp500` `cobre` `vix` `juros10a` |
| Macro | **15%** | `juros` `inflacao` `liquidez` `dxy` `curva` |
| Institucional | 15% | `coinbasePremium` |
| On-chain | 15% | `mvrv` `activeAddresses` `hashrate` `exchangeFlow`* |
| Derivativos | 15% | `funding` `openInterest` `putCall` |
| Sentimento | 5% | `fearGreed` |
| Geopolítico | 5% | `gdelt` `epu` |
| Eventos | 5% | `volumeSpike` |
| Técnico | 4% | `tendencia` `rsi` `mediaMovel` |

\* `exchangeFlow` tem `setAuto` no código mas depende de CryptoQuant (chave
paga); na prática nunca preenche. Trate como não-fonte até prova em contrário.

**Atenção ao peso EFETIVO.** O nominal não é o que decide. Na primeira leitura do
m12: Ativos Globais 21% → **24,2%**, Macro 15% → **19,8%**, Institucional 15% →
**4,9%**, On-chain 15% → **9,9%**, Geopolítico 5% → **3,5%**.

**E cuidado com um atalho que eu mesmo errei:** contribuição do motor **não** é
`composite × peso efetivo`. O agregador soma **por indicador**, com peso fixo
`peso_do_motor ÷ nº de votantes declarados` — então um motor com votantes ausentes
contribui menos do que o atalho sugere. Em 19/08 isso me fez ver um rombo de 0,48
que não existia. Reconstrua com `contribuicoesCanonicas()` antes de acusar defeito. A diferença vem do teto por família e de quantos
indicadores de cada motor têm dado. **Sempre use `ag.porMotor[mk].contribuicao`**
— foi exatamente por não usar que o painel "maior peso" mentiu até a v112.

## 4.1b A leitura em três camadas (v121–v123)

Sistema **paralelo** ao score, na tela principal. Cada indicador entra na camada da
**cadência da fonte**: AGORA (7, janela 24h) · A SEMANA (7, janela 7d) · O TERRENO (14,
janela 30d). Sem média entre camadas. Os sensores **votam** aqui — o motivo do
rebaixamento era cadência, e aqui a pergunta é o instante. Score, pesos e a série das 777
**não são afetados**, e há quatro testes que quebram se forem.

**O achado que a divisão revelou:** dos 7 indicadores do AGORA, **4 estão fora do score**.
É a explicação de por que o sistema pareceu surdo no dia de +6%.

Desde a v123 os três rótulos são gravados em cada snapshot (~429 bytes). **Antes disso não
ficavam salvos** — as 8 primeiras leituras do m12 não têm o campo e nunca terão.

## 4.2 Os 6 sensores — coletados, gravados, **sem voto**

| Sensor | Por que não vota | Desde |
|---|---|---|
| `tecnico.bookImbalance` | instantâneo do livro num relógio de 8 h; medido: 120 pontos em 25 min | v106 |
| `derivativos.takerRatio` | janela de 1 h; medido: −24,5 → +11,8 → +31,5 no mesmo dia | v111 |
| `derivativos.longShort` | janela de 1 h, mesma família | v111 |
| `ativosGlobais.ouro` | t ≈ 0,43, sem significância | v68 |
| `ativosGlobais.euro` | dupla contagem: o dólar amplo já vota no Macro | v111 |
| `tecnico.momentum` | direção **não verificada**: nove anos mostram reversão (−0,048 estudo, −0,059 reserva), o sistema votava alta. Não invertemos — rebaixamos | **m12** |

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

**O BTC é um ativo de risco, não um fenômeno macro-monetário.** Medido em 3.289
dias e quatro eras: S&P **+0,351** e VIX **−0,282** são as únicas relações estáveis
do conjunto; M2 +0,067, Fed Funds −0,057, curva −0,008, liquidez líquida do Fed
−0,029. Foi por isso que o m12 moveu 13 pontos do Macro para Ativos Globais.
**Ressalva: essa relação é contemporânea — S&P e VIX têm pico em defasagem ZERO e
não anteciparam nada.**

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

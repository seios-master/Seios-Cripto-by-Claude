# SEIOS — STATUS, ROADMAP E MEMÓRIA
### fechamento da sessão de 16–17/08/2026 · builds v101 → v105
### escrito por Claude, para o Claude da próxima sessão

---

## 0. COMO USAR ESTE DOCUMENTO

Suba este arquivo no início da próxima conversa, junto com o `index.html` atual,
os `harness-v*.js` e o `roda-tudo.sh`.

**Ele substitui, para efeito de contexto, tudo que estiver escrito em outro
lugar sobre o estado do sistema** — inclusive `SEIOS-MEMORIA.md` (parada na
v92.1) e `SEIOS-STATUS-E-ROADMAP-2026-08-15.md` (parado na v100).

**Primeira instrução para o próximo Claude:** confira `BUILD_VERSION` e
`MODEL_VERSION` no arquivo **antes** de propor qualquer numeração, roadmap ou
conclusão. Documento é memória; código é verdade. Quando discordarem, o código
ganha e o documento está errado.

**Segunda instrução:** rode `bash roda-tudo.sh index.html` antes de mexer em
qualquer coisa. Se não vier `220 testes · 0 arquivo(s) com falha`, descubra o
porquê antes de escrever uma linha.

---

## 1. ESTADO ATUAL — verificado em 17/08/2026, 19:54

| | |
|---|---|
| **Build** | `2026-08-16.105-liquidez-relativa` |
| **Modelo** | `m7-2026-08-16` |
| **Arquivo** | `index.html`, ~10.500 linhas · ~560 KB |
| **Hospedagem** | Vercel · **https://seios-master.com** |
| **Rotas de servidor** | `api/fred.js` · `api/gdelt.js` |
| **Série viva** | **1 leitura sob m7 · 0 janelas independentes · 23 de modelo anterior** |
| **Última leitura** | score 2,25 · Neutro · Observar · cobertura 72,9% |
| **Bateria** | **15 harnesses + 2 verificadores · 220 testes · todos verdes** |

### Motores (peso efetivo na última leitura)
Macro 35,9% (nominal 28) · Derivativos 16,0% · Ativos Globais 10,3% ·
On-chain 9,6% · Técnico 5,1% · Eventos 5,1% · Institucional 4,8% ·
Sentimento 3,2% · Geopolítico 1,7%

> A distância entre nominal e efetivo é estrutural (tetos de família + cobertura
> parcial), não defeito. Está declarada na tela.

### Backtest (não mudar de conclusão sem rodar de novo)
`Observar · 285 dias · −4,9% · 42% subiu · igual à referência`
**Maior score em módulo: 12,5** (era 18,5 até a v104).
Cobertura reconstruível: 56% na mediana. **Nenhum corte da escada de ação é
atingido** — nem ±15. A tela declara isso em vermelho.

---

## 2. O QUE MUDOU NESTA SESSÃO (v101 → v105)

| Build | O quê | Muda score? |
|---|---|---|
| **v101** `periodo-fechado` | O último ponto de uma série precisa ser período **fechado**. Corrigiu hash rate, endereços ativos, volume GDELT e ouro/PAXG. Trocou janela por registro (`rows.length-91`) por `janelaCalendario`. | **sim → m6** |
| **v102** `uma-regua-por-vez` | Nenhuma comparação atravessa modelos. Delta de score e detector de congelados passaram por `separarPorModelo`. Delta deixou de assumir posição na lista. | não |
| **v103** `orcamento-escrito` | Orçamento explícito de 2 pedidos/rodada ao GDELT. As defesas multiplicavam: até 16 pedidos por rodada contra limite de 1/5s. Diagnóstico de cache no log. | não |
| **v104** `o-normal-nao-e-zero` | Mediu a distribuição do M2 em 426 meses desde 1991 contra a régua em uso. **Nada corrigido de propósito.** | não |
| **v105** `liquidez-relativa` | `macro.liquidez` deixou de ser nível com centro em zero e virou **percentil expandido** (mín. 120 meses, sem look-ahead, sentido direto). | **sim → m7** |

**Tema da sequência v100–v105: remover mentira, não melhorar previsão.**
Nenhuma dessas builds fez o SEIOS prever melhor. Elas removeram sinal fabricado.
Somadas, moveram o score em poucos pontos — porque o que removeram era ruído com
cara de sinal.

---

## 3. AS DESCOBERTAS QUE MAIS IMPORTAM

### 3.1 O M2 era uma constante ocupando 35,9% do peso
Medido, não suposto: em **426 meses desde 1991**, a régua antiga
(`tanh(YoY/6,67)`, centro fixo em zero) produzia **398 bullish (93,4%)**, 13
neutro, 15 bearish. Para marcar bearish, a oferta monetária dos EUA teria que
**encolher mais de 1,01% ao ano** — o que ocorreu uma vez na série do FRED.

O caso que fechou o argumento: o M2 de hoje cresce +5,2%, que é o **percentil 48**
da própria série (abaixo do normal), e a régua pontuava isso como **+64,8**.

Um indicador que responde a mesma coisa a qualquer pergunta não separa nada —
**por aritmética, não por falta de dados**, independentemente de a teoria estar
certa.

### 3.2 O problema seguinte, que a correção revelou (NÃO RESOLVIDO)
Com a régua nova, a liquidez no backtest de 285 dias ficou **bearish em 259 dias
e bullish em zero**. Não é defeito da régua — em 426 meses ela dá 42,7% / 14,8% /
42,5%, distribuição correta.

É outra coisa, e é estrutural:

> **O M2 é mensal e lentíssimo.** Em qualquer janela de 285 dias ele assume ~9
> valores. Qualquer régua aplicada a ele será quase constante nesse horizonte.
> Uma variável que muda 12 vezes por ano carrega **35,9% do peso** num sistema
> que lê três vezes por dia.

Isto é **classe C** (mudança de peso/arquitetura) e **não deve ser mexido sem
evidência das 777 observações**. Está registrado aqui para não se perder.

### 3.3 O erro da v55, cometido pela quinta vez
Cinco aparições da mesma falha de raciocínio — **defesa projetada sem medir o
orçamento em que ela roda**:

| onde | o quê |
|---|---|
| v55 | prazo de 8s matando uma fonte que leva 20 |
| v98.3 | 3 tentativas × 25s contra teto de 60s da função |
| v98.4 | prazo único para consultas de 3d e de 14d |
| **v103** | defesas **multiplicando**: `comSegundaChance` (×2) · retry do `smartFetch` (×2) · `BACKOFF` do servidor (×2) = **até 8 por indicador, 16 por rodada**, contra limite de 1 consulta/5s |
| **v105 (`api/gdelt.js`)** | o laço de tentativas tinha `try/finally` **sem `catch`** — quando o `fetch` levantava (que é o modo de falha real: `UND_ERR_CONNECT_TIMEOUT`), a exceção escapava do laço na primeira tentativa. O `BACKOFF` só cobria falhas com **status HTTP** |

**A regra, agora com cinco cicatrizes:** toda defesa contra falha tem um custo, e
esse custo tem um teto. Escrever o teto ao lado da defesa, na mesma linha. E
conferir se a defesa cobre o modo de falha que **realmente acontece**, não o que
se imaginou.

### 3.4 Fato datado escrito como invariante
Quatro harnesses afirmavam `MODEL_VERSION === "mN"`. Isso não é invariante: é um
fato sobre o instante em que aquele harness nasceu, e expira no primeiro bump
legítimo. Convertidos para a invariante real: **o modelo nunca regride**.

Mesma família: o bloco A do `harness-v104` afirmava propriedades da régua antiga
do M2. Depois da v105 ele exigiria o defeito de volta. Foi invertido — passa a
afirmar que a régua antiga sumiu do caminho que decide — **com os números
medidos preservados em comentário**.

**Editar teste é como regressão se esconde.** Toda edição de teste existente
nesta sessão está justificada dentro do próprio arquivo, com o motivo escrito.

---

## 4. DEFEITOS ABERTOS — classificados

A classificação existe por um motivo aritmético: **cada mudança de score zera a
série de observações**. Consertar um defeito por build faz o contador nunca sair
de zero.

### CLASSE A — envenena o dado que está sendo acumulado. Corrigir antes de congelar.

1. **Book imbalance** (`tecnico.bookImbalance`, 5,1% do peso)
   Medido ao vivo nesta sessão: **+27,95 → +66,38 → −54,16 → −78,33** em poucas
   horas. Uma oscilação de 120 pontos em 25 minutos, que sozinha jogou o motor
   Técnico de +9,86 para −14,50. Soma quantidade dos 100 níveis do livro sem
   converter em notional nem ponderar distância do meio. É spoofável e mede
   segundos, não dias. **As duas auditorias externas mandaram rebaixar.**
   → **Próximo da fila.**

2. **Prêmio Coinbase** (`institucional.coinbasePremium`)
   Compara Coinbase BTC-USD com preço CoinGecko **sem timestamp comum**. O ruído
   tem a ordem de grandeza do sinal. É o **único indicador automático** de um
   motor de 15% nominal. A definição padrão do índice é Coinbase vs Binance no
   mesmo instante.

3. **DXY + euro contando a mesma coisa duas vezes**
   `macro.dxy` (DTWEXBGS) e `ativosGlobais.euro` (DEXUSEU) medem largamente o
   mesmo fenômeno cambial, em motores diferentes, somando peso.

### CLASSE B — apresentação. Corrigir quando der, sem bump.

4. **A falha do GDELT não mostra o estado do cache.** Prometi na v103 e o teste
   passou verde — porque conferia **o local da chamada**, não o efeito. Quando o
   `smartFetch` levanta, os cabeçalhos nunca são lidos e `GDELT_DIAG.ultimo` fica
   nulo. Justamente na falha, que é quando o dado importa, a tela cala.
   **Teste que verifica a chamada em vez do efeito é teste que mente educadamente.**

5. **O M2 aparece com dois valores na mesma tela.** `+5,2%` no bloco de
   distribuição (série *point-in-time*, via vintage) e `+5,5%` no indicador ao
   vivo (série *revisada*). As duas estão certas; a tela não diz por quê.

6. **Mensagem do 429 promete o que não sabe.** "a próxima leitura provavelmente
   passa" — não passou por 20 horas seguidas.

7. **"Convicção" dos cenários é `50 + score/2`** — transformação linear
   apresentada com cara de probabilidade. As duas auditorias pediram renomear.

8. **Escada de ação com nomes de ordem** ("Reforçar / Sair / viés vendido") numa
   interface sem sizing, margem ou stop. Deveria ser "viés de exposição".

### CLASSE C — nova fonte, novo peso, nova arquitetura. Só com evidência.

9. **O peso do M2 num sistema de 3 leituras/dia** (ver 3.2).
10. **Freio duplo do Geopolítico** — EPU marca ±78, o motor satura em 30 (teto),
    peso efetivo 1,7%. Dois freios em série sobre o mesmo sinal, nenhum medido.
11. **Put/call agregando vencimentos** — proteção de 2 dias e call de 6 meses no
    mesmo número.
12. **Os 17 clamps lineares restantes** — a v58 corrigiu 11 com `escalaSuave`.
13. **Motor Técnico com direção invertida** no backtest (−9,6% quando bullish,
    −1,2% quando bearish). Medido repetidamente; nunca investigado.
14. **Fontes que exigem backend**: ETF flow automático, superfície de opções
    (Deribit DVOL/skew), basis, CVD multi-exchange, COT da CFTC.

### EM OBSERVAÇÃO (não classificado — pode ser dado real)

- **`activeAddresses` foi de +0,0% para −15,3% em 24 horas**, numa janela de 90
  dias. Uma variação de 90d não deveria andar 15pp num dia. Pode ser revisão do
  CoinMetrics no último dia fechado. **Conferir nas próximas leituras.**
- **GDELT**: o orçamento da v103 resolveu o volume; o tom ainda falha em parte
  das rodadas. Nunca observamos `cache HIT` — mas as duas leituras bem-sucedidas
  eram MISS esperados. **Ainda não sabemos se a borda retém.**

---

## 5. RESULTADOS QUE VIRARAM EVIDÊNCIA (não são pendências)

- **A escada de ação está fora do alcance do backtest.** Maior score em módulo em
  285 dias: **12,5**. Os cortes 40, 15 e −55 nunca foram atingidos. Não é o
  sistema errando — é o teste dizendo que não tem cobertura para testar o que se
  propõe a testar.
- **Conclusões antigas invalidadas:** "Reduzir acertou por 8,4pp" e "Entrar
  parcialmente bateu a referência" foram medidas com o agregador antigo (m1).
  **Não citar.**
- **Funding não se promove.** 0 de 167 dias cruzam ±15; o máximo do ano dá 9,8. A
  régua relativa fala, mas fraco, invertido e em poucos dias. Nenhuma das duas
  versões justifica peso.
- **`FUNDING_ESTICADO` (0,015%) está no percentil 100** do período — os gatilhos
  construídos sobre ele são constantes.
- **Ouro registra sem votar.** Laboratório achou separação de t≈0,43, abaixo de
  significância.

---

## 6. REGRAS — o que esta sessão acrescentou

- **O último ponto de uma série precisa ser um período FECHADO.** (v101)
- **Finito não é válido**: todo bruto precisa de faixa de plausibilidade sobre a
  *grandeza*. (v100)
- **Nenhuma comparação atravessa modelos.** Delta, contagem, congelados — tudo
  filtra por `MODEL_VERSION` antes de subtrair. (v102, v94.1)
- **Toda defesa custa, e o custo tem teto — escrito na mesma linha.** E a defesa
  precisa cobrir o modo de falha que acontece, não o imaginado. (v103, v105)
- **Constante ≠ sensor.** Um indicador que nunca muda de lado tem informação
  zero, por aritmética. (v104/v105)
- **`sentido` declarado**: `scoreDoPercentil` nasceu contrária (funding).
  Reaproveitá-la sem parâmetro inverteria o indicador de maior peso **em
  silêncio, sem erro**. (v105)
- **Medir antes de corrigir.** A v104 existiu só para produzir o número que
  justificou a v105. O número foi ao ar antes da mudança.
- **Asserção presa a uma versão não é invariante.** Escreva o que vale para
  sempre. (v105)
- **Teste que verifica a chamada não verifica o efeito.** (defeito B4)
- **Assertar sobre o arquivo inteiro, não sobre o trecho que acabei de mexer.**
  Foi assim que apareceram o quarto caso do período em formação (ouro) e o
  quinto leitor cruzando modelos (eu mesmo, na própria v102).

---

## 7. ROADMAP

### P0 — próxima build
**v106: book imbalance.** Classe A, o mais volátil dos três. Decidir entre
rebaixar peso, refazer com notional + distância do meio + múltiplos snapshots,
ou rebaixar a sensor sem voto. Muda score → **bump m8**.

### P1 — em seguida, na ordem
- **v107: prêmio Coinbase sincronizado** (Coinbase vs Binance, mesmo instante).
  Muda score → bump.
- **v108: DXY + euro.** Decidir qual fica. Muda score → bump.

### P2 — CONGELAR
Depois de A1–A3, **congelar o modelo** e deixar o tempo correr. A partir daí:
- só classe B (não muda score, não zera série)
- classe C só depois de haver observação suficiente
- **três leituras por dia, espaçadas ~8h**

### P3 — acumular
777 janelas independentes ≈ **8,5 meses** a 3 leituras/dia. Marco intermediário:
**130 observações** (~6 semanas), onde vantagem grande começaria a aparecer.

### P4 — avaliar, com os portões já escritos
1. Brier score fora da amostra tem que **bater "sempre neutro"**
2. Calibração real (reliability curve), não linear disfarçada
3. Vantagem tem que **sobreviver a custo e slippage**
4. Resultado tem que **valer num período final que ninguém olhou**

### Fora do arquivo único (exige backend)
Purged walk-forward com embargo · PBO/Deflated Sharpe · ETF flow · basis ·
superfície de opções · CVD · COT.

---

## 8. MÉTODO — como esta dupla trabalha

**Jorge:** copiloto e deployer. Não é programador. Trabalha só no iPad via
Safari, sem console. Sobe pela interface do GitHub, a Vercel publica sozinha.
Sinaliza continuidade com "Bora", "Prossiga", "Vai". **Espera que o Claude
proponha o próximo passo, não que pergunte qual é.** Quer avaliação honesta,
inclusive resultado decepcionante.

**Claude:** arquiteto, piloto e desenvolvedor principal.

**O ciclo de uma build:**
1. Identificar defeito **com evidência do diagnóstico ao vivo**, não por teoria
2. Escrever script Python de substituição (`patch-vNNN.py`), cada troca
   **assertando exatamente 1 ocorrência** antes de executar
3. Escrever `harness-vNNN.js` que **falha inteiro contra a build anterior** —
   e verificar isso rodando contra o arquivo antigo
4. `bash roda-tudo.sh index.html` — bateria completa + `node --check`
5. Apresentar os arquivos; Jorge sobe; testa no iPad; manda diagnóstico de volta

**Bateria atual:** `harness-v91` a `harness-v105` · `checa-campos.js` ·
`checa-paineis.js` · `node --check` = **220 testes**.
O `harness.js` grande (102 testes, até a v78) **está fora da bateria** — nunca
foi recuperado. Se aparecer, reintegrar.

---

## 9. ONDE O PROJETO ESTÁ, SEM ADOÇAR

**O SEIOS não sabe se prevê alguma coisa.** São 0 janelas independentes sob m7 de
~777. Isso não muda por build nenhuma — muda por tempo.

Em duas sessões, o que mudou é que **oito coisas que a tela mostrava eram falsas
e nenhuma delas dava erro**: o backtest media com uma matemática que o sistema
não usa; "90 dias" eram 130; um campo vazio empurrava um motor de 15% para o teto
bullish; o dia pela metade virava sinal; o indicador de maior peso era uma
constante; a diferença entre duas leituras cruzava modelos; as defesas contra
falha causavam a falha; e uma faixa de plausibilidade estava declarada para a
grandeza errada.

Agora existem 220 testes que quebram se qualquer uma voltar.

**O instrumento não ficou mais inteligente. Ficou menos capaz de mentir** — e sem
isso as próximas 777 observações seriam lixo caro.

**A expectativa honesta, registrada para ser cobrada:** a chance de encontrar
vantagem durável de 60%+ é **baixa**. O provável é algo entre 53% e 57% em
regimes específicos, se houver alguma coisa. E "não há vantagem" é um resultado
legítimo do projeto — não um fracasso dele.

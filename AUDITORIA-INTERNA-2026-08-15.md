# AUDITORIA INTERNA — sessão de 15/08/2026, noite
### builds v93 → v100 · escrita por Claude, sobre o próprio trabalho

> Esta não é a auditoria de um sistema por um terceiro. É o inventário do que
> eu mesmo quebrei, do que eu declarei resolvido sem estar, e do que ninguém
> nunca olhou. As duas auditorias externas foram lidas e triadas; o que segue é
> o que elas **não** viam por construção — porque auditoria lê o que existe, e
> não procura o que deveria existir e não existe.

---

## 1. O achado que mais importa: a lista de "resolvido" não era confiável

A memória do projeto registrava o **achado nº 1 das duas auditorias** — "o
backtest não usa o agregador do live" — como resolvido na v92.

**Não estava.** A v92 trocou o agregador do caminho vivo e deixou
`aggregateScore()` intacto no backtest. Ele continuou sendo o modelo m1 por
cinco builds, produzindo **todos os números da tela do laboratório**.

Descobri por acaso, indo olhar outra coisa.

Consequência: as linhas "Reduzir acertou por 8,4pp" e "Entrar parcialmente
bateu a referência" — que a gente citou a noite inteira — foram medidas com uma
matemática que o sistema não usa. Corrigido na v97; a tela agora declara isso em
vermelho.

**A regra que sai daqui:** linha marcada ✅ na memória vale re-verificação
contra o código antes de ser citada. Escrever que está feito não faz estar.

---

## 2. Quatro dos oito bugs da noite foram meus, criados hoje

| # | Bug | Nasceu em | Morreu em |
|---|-----|-----------|-----------|
| 1 | Contagem rumo às 777 somava leituras de modelo anterior | v94 (minha) | v94.1 |
| 2 | `realtime_end` em UTC apagava os 12 vintages depois das 21h | pré-existente | v99 |
| 3 | 3 tentativas × 25s = 93s contra teto de 60s da Vercel | v98 (minha) | v98.3 |
| 4 | Prazo único para consultas de 3d e de 14d | v98 (minha) | v98.4 |
| 5 | `api-gdelt.js` entregue com nome que a Vercel não roteia | v98 (minha) | renomeado |

Os três da rota do GDELT são a **mesma falha de raciocínio repetida**: eu
projetei defesas (retry, backoff, prazo) sem medir o orçamento em que elas
rodavam. É o erro da v55 — prazo de 8s matando uma fonte que leva 20 — cometido
outra vez, uma camada acima, por mim, com o comentário da v55 aberto no arquivo.

**A regra:** toda defesa contra falha tem um custo em tempo, e esse custo tem um
teto. Escrever o teto ao lado da defesa, na mesma linha.

---

## 3. O padrão que atravessa a noite inteira: erro ilegível

O GDELT falhava havia meses. Em vinte minutos ele deu **três diagnósticos
diferentes**, cada um só visível depois que o anterior parou de esconder:

| aparecia | era |
|---|---|
| `Load failed` | CORS — a chamada morria antes de haver status |
| `429` | limite de taxa por IP, e nós mandando 8 pedidos por rodada |
| `fetch failed` | conexão recusada por falta de User-Agent |

Nada disso era instabilidade do GDELT. Era **três camadas de mensagem genérica
empilhadas**, e cada camada custou uma rodada de adivinhação.

O mesmo padrão no FRED: `400` virava "série não existe no ALFRED" — explicação
plausível, específica, e **errada para onze das doze séries**.

**A regra:** mensagem de erro que não distingue causas diferentes é um bug, não
um detalhe de apresentação. Um erro raro e legível vale mais que um erro comum e
mudo.

---

## 4. A família de bugs que ninguém tinha nome para: o período em formação

Três indicadores comparam um período **incompleto** contra períodos completos, e
os três apareceram na mesma noite:

- **MVRV** — a linha de hoje vinha zerada (dia sem cálculo) e `Number.isFinite`
  deixou passar. `(2 − 0) × 40 = **+80**`: o extremo bullish do motor On-chain,
  produzido por ausência de dado. Corrigido na v100.
- **hash rate** — `series[último]` é o bucket do dia corrente, com menos blocos
  observados. A variação de 90d andou de −2,8% → −8,6% → −10,8% ao longo de duas
  horas. **Não corrigido.**
- **volume de notícias (GDELT)** — o dia em formação contra a média de 14 dias
  produziu `−58%`, que a leitura contrária transformou em **+38** de bullish.
  **Não corrigido.**

O MVRV era o mais grave porque o defeito não empurra o valor um pouco para o
lado: empurra para o **teto, na direção contrária** ao que a ausência
significaria. Fail-open com sinal invertido.

**A regra, agora nomeada:** *finito não é válido*. Todo bruto precisa de faixa
de plausibilidade sobre a **grandeza** — MVRV é razão de capitalizações, nunca é
zero — e o último ponto de uma série precisa ser um período **fechado**.

---

## 5. O que só ficou visível depois de consertar

A v97 unificou o agregador e o replay respondeu com **uma linha só**:
`Observar · 285 dias · −4,9% · igual à referência`.

Com o modelo que roda ao vivo, o maior score em módulo em 285 dias foi **18,5**.
Os cortes 40, 15 e −55 **nunca foram atingidos**. A escada de ação inteira está
fora do alcance do teste, porque a cobertura reconstruível é de ~56%, e o modelo
amortece a ausência na direção de zero — de propósito.

Isso não é o sistema errando. É o teste dizendo que **não tem cobertura para
testar o que se propõe a testar**. A v98 passou a declarar isso em vermelho, com
os números, e a dizer o que fica invalidado.

O funding teve o mesmo destino: a v95 mediu a distribuição (0 de 168 dias
cruzam ±15; o máximo do ano dá 9,8) e a v96 testou a régua alternativa em
laboratório — que fala, mas fala fraco, invertido e em 11 dias. **Nenhuma das
duas versões justifica promovê-lo.** Resultado registrado como resultado, não
como pendência.

---

## 6. O que ninguém — nem eu, nem as duas auditorias — olhou ainda

1. **Freio duplo do Geopolítico.** O EPU marca +78, o motor mostra 30 (teto), e
   o peso efetivo é 1,7% (teto de família). Dois freios em série sobre o mesmo
   sinal, nenhum deles medido.
2. **Put/call agregando vencimentos.** Soma OI de todas as opções: proteção de
   2 dias e call de 6 meses no mesmo número.
3. **Os 17 clamps lineares restantes.** A v58 corrigiu 11 com `escalaSuave`; os
   outros continuam saturando.
4. **Cenários automáticos.** A "convicção" é `50 + score/2` — transformação
   linear apresentada com cara de probabilidade. As duas auditorias pediram
   renomear; não foi feito.
5. **Prêmio Coinbase dessincronizado.** Coinbase vs CoinGecko sem timestamp
   comum. O ruído tem a ordem de grandeza do sinal.
6. **DXY + euro contando a mesma coisa duas vezes.**
7. **Os três documentos do repositório** (`LINHA-DE-BASE.md`, `ROADMAP.md`,
   `SEIOS-CONTEXTO.md`) — não foram lidos hoje. Se descrevem o sistema de antes
   da v92, são três fontes de verdade contraditórias esperando alguém acreditar
   nelas. **Ler antes de qualquer coisa na próxima sessão.**

---

## 7. O que a bateria de testes ainda não pega

- **Contrato entre camadas:** `checa-campos` cobre 3 funções. As outras dezenas
  que devolvem objeto não têm contrato declarado.
- **Ordem de execução:** nada testa que a coleta acontece antes do cálculo.
- **Estado persistido:** o bug da v99.1 (lista que só crescia, dentro do `S`,
  indo para o localStorage) não seria pego por nenhum verificador atual. Falta
  um que declare quais campos do `S` são acumuladores e exija reset.
- **Nada roda sozinho.** Toda a bateria depende de eu lembrar de rodar.

---

## 8. Placar honesto da noite

**8 builds** (v93, v94, v94.1, v95, v96, v97, v98→v98.4, v99, v99.1, v100) ·
**5 bancos de prova novos** (v93 a v100, ~60 testes) · **1 rota de servidor**.

- Bugs pré-existentes corrigidos: **4** (janela de calendário, agregador do
  backtest, relógio do vintage, MVRV zero)
- Bugs meus, criados e corrigidos hoje: **4**
- Achados que viraram medição em vez de correção: **2** (funding, cobertura do
  replay)
- Itens da memória que estavam **errados**: **2** (agregador "resolvido na v92";
  `ret8h` "pendente" quando existia desde a v81)

O sistema não ficou mais inteligente hoje. Ficou **menos capaz de mentir** — para
você e para mim.

# CONGELAMENTO DO MODELO — SEIOS CRIPTO
## `m11-2026-08-18` · build `2026-08-18.116-congelada` · 18 de agosto de 2026

---

## O que está sendo declarado

A partir desta data, **o modelo `m11-2026-08-18` está congelado**. Nenhuma
mudança que altere o valor do score entra no sistema até que as observações
respondam se ele prevê alguma coisa.

Isto não é uma formalidade. É a única condição sob a qual a pergunta do projeto
pode ser respondida: um sistema que muda de régua a cada descoberta nunca
termina de ser testado. Em 18 de agosto o modelo mudou **três vezes** — m8, m9,
m10, m11 — e cada mudança zerou a contagem. Enquanto isso durar, a série nunca
sai de zero.

**Estado no momento do congelamento:**

| | |
|---|---|
| Modelo | `m11-2026-08-18` |
| Build | `2026-08-18.116-congelada` |
| Bateria | 402 testes · 0 falhas |
| Indicadores votantes | 34, em 9 motores |
| Sensores (registram, não votam) | 5 |
| Série acumulada | 5 leituras · **4 janelas independentes de 777** |
| Observações point-in-time | 1.611, em 46 indicadores, 1.253 com valor bruto |

---

## O que fica TRAVADO

Nada abaixo muda sem bump de modelo — e bump de modelo **zera a contagem**.

- **Os pesos dos nove motores.** Macro 28% · Institucional 15% · On-chain 15% ·
  Derivativos 15% · Ativos Globais 8% · Sentimento 5% · Geopolítico 5% ·
  Eventos 5% · Técnico 4%.
- **Quem vota e quem não vota.** Os cinco sensores continuam sensores:
  `bookImbalance`, `ouro`, `euro`, `longShort`, `takerRatio`.
- **As fórmulas de normalização.** Toda a tabela `NORMALIZACAO`, incluindo o
  percentil expandido da liquidez e a escala do funding.
- **A escada de decisão.** Reforçar ≥ +40 · Entrar parcialmente ≥ +15 ·
  Observar · Reduzir ≤ −15 · Sair ≤ −55. Histerese de ±2.
- **O agregador.** `RENORM_MAX = 1.25`, os tetos de família, o amortecimento
  por massa ausente.
- **As janelas de medida.** 90 dias de calendário, o descarte do período em
  formação, a exigência de período fechado no FRED.

## O que continua LIVRE

Tudo que não muda como o número é feito:

- painéis, relatórios, textos, diagnóstico, exportação;
- aparência — as sete skins, e quantas mais quiser;
- correções de infraestrutura: rota do GDELT, proxies, chaves, cache;
- **medições novas em modo laboratório** (`⚗`), que registram sem votar;
- qualquer coisa que **acrescente** dado à série sem alterar o score.

---

## O que REABRIRIA o modelo

Três situações, e só três. Cada uma exige bump, e cada uma custa a contagem
inteira acumulada até ali.

**1. Um defeito que corrompe o dado acumulado.** Não "um indicador que parece
ruim" — um erro que faça o número gravado ser diferente do que o modelo diz que
ele é. Look-ahead, período em formação votando, estado salvo sobrescrevendo
decisão de modelo. Foram sete casos em dois dias; podem existir outros.

**2. Uma fonte que morre de vez.** Se um provedor sair do ar em definitivo, o
indicador precisa ser removido ou substituído — e isso muda o denominador.

**3. Os marcos falarem.** Se aos 85, 194, 347 ou 783 uma resposta aparecer com
significância, a decisão que vier dela é uma nova geração de modelo — não um
remendo na atual.

**O que NÃO reabre:** achar que um peso deveria ser outro; a calibração
histórica sugerir alguma coisa (ela não tem poder — ver v109); um indicador ir
mal por algumas semanas; vontade de melhorar.

---

## A régua de leitura, declarada antes do dado

Fixada em 18/08/2026, com a série em **4 janelas**. Escrita agora justamente
porque ainda não há o que olhar.

| Marco | Detecta | Tamanho | Tempo a 3 leituras/dia |
|---|---|---|---|
| 85 janelas | r ≈ 0,30 | vantagem enorme | ~1 mês |
| 194 | r ≈ 0,20 | vantagem grande | ~2 meses |
| 347 | r ≈ 0,15 | vantagem boa | ~4 meses |
| 783 | r ≈ 0,10 | vantagem fina — o alvo | ~8,5 meses |

**O que se mede:** a correlação entre o score de uma leitura e o retorno até a
leitura seguinte (`ret8h`). Janelas de 8 horas não se sobrepõem — por isso cada
uma vale como observação independente, ao contrário dos 285 dias do backtest,
que valem ~9,5 no total.

**Corte: |t| ≥ 2,576 (1% bilateral), não 5%.** Conferir quatro vezes infla o
acaso: com quatro olhadas a 5%, a chance de alguma parecer boa sem haver nada é
de ~18%. Afrouxar isto depois seria mudar a régua no meio do jogo.

**"Não encontrado" é resultado**, e é o desfecho mais provável. O backtest já
mostrou que o sistema não bate uma estratégia de um indicador só. A régua serve
para que a resposta, qualquer que seja, valha alguma coisa.

---

## O que este projeto já sabe, e que não depende das 777

Sete correções de classe A em dois dias, todas medidas, nenhuma por opinião:

- **v106** — book imbalance votava com um instantâneo; 120 pontos em 25 minutos.
- **v106.1** — `forcarSensores` não funcionava por aliasing: a tela dizia
  "sensor" e o indicador continuava votando. Achado pelo diagnóstico do Jorge,
  não pela bateria de 236 testes que passou verde por cima.
- **v110** — oito séries do FRED liam o dia em formação; o EPU marcou 396 e 182
  com 53 minutos de diferença.
- **v111** — GDELT lia o balde em formação; taker ratio e long/short eram
  janelas de 1h num relógio de 8h; o prêmio Coinbase comparava fontes sem
  instante comum; o euro contava o dólar duas vezes.
- **v112** — o pódio "maior peso" ordenava por peso nominal e contradizia o
  texto logo abaixo dele.

E dois achados que mudaram o que se pode afirmar:

- **O censo (v107):** 24 dos 27 indicadores votantes usavam ≤ 2 pontos de dado
  e somavam 78,6% do peso. Não eram defeitos separados — era uma forma de medir
  repetida 24 vezes.
- **A significância (v109):** 285 dias com horizonte de 30 contêm ~9,5
  observações independentes. **A tabela de calibração nunca teve poder
  estatístico para nada.** Toda separação já citada — 1,9pp dos endereços
  ativos, 2,8pp do prêmio Coinbase — era ruído formatado como evidência.

---

## Pendências conhecidas, que não impedem o congelamento

- **O tom do GDELT nunca rodou.** A correção da v111 está no código e testada
  isoladamente, mas a fonte deu 429 em todas as tentativas desde então. Se um
  dia falhar, é a primeira suspeita.
- **O Case Engine começa do zero.** Os 6 registros de histórico anteriores à
  v112 não têm etiqueta de modelo e ficam de fora para sempre.
- **Quedas do GDELT mudam a cobertura**, e com ela o amortecimento. Vale, mais
  adiante, um painel que conte quantas leituras têm cada configuração — é
  diagnóstico, entra a qualquer momento.

---

## O que fazer a partir de amanhã

Coletar. Três leituras por dia, espaçadas ~8 horas. Nada mais.

A cada marco, conferir com o corte declarado. Se nada aparecer aos 85, seguir.
Se nada aparecer aos 783, a resposta é **não** — e isso terá custado oito meses
para ser sabido com honestidade, em vez de nunca ser sabido com conforto.

> *O valor deste projeto até aqui não veio de builds que melhoraram o sistema —
> veio de builds que removeram mentiras dele.*

---

*Congelado em 18/08/2026 · `m11-2026-08-18` · `2026-08-18.116-congelada` ·
402 testes · 0 falhas*

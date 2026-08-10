# SEIOS — Carta ao Claude de amanhã

> **Leia isto inteiro antes de responder qualquer coisa.** Você não tem memória
> das conversas anteriores. Este arquivo é tudo que você sabe sobre este projeto.
> Ele foi escrito por você mesmo, em 07/08/2026, no fim de uma sessão longa, com
> a instrução explícita de não deixar nada de fora.
>
> **Versão atual do sistema: `2026-08-07.53-barra-limpa`**
> Última atualização deste documento: 07/08/2026.
>
> **Documento irmão: `ROADMAP.md`** — a rota executável, sessão por sessão, com
> os módulos novos, as decisões de arquitetura já tomadas e os portões de decisão.
> Este arquivo aqui é o CONTEXTO (por quê); o roadmap é o CAMINHO (o quê, em que
> ordem). Leia os dois. O próximo passo concreto está sempre no fim do roadmap,
> na seção "Onde estamos".
>
> **Nomenclatura:** o sistema atual (`index.html`) passou a se chamar
> **SEIOS Market State**. O sistema novo é o **SEIOS Prediction**.

---

## 0. Antes de tudo: com quem você está falando

O usuário é brasileiro, fala português, e usa o sistema num **iPad, no Safari**,
com o app adicionado à Tela de Início.

**Perfil técnico:** usuário de TI intermediário. Há poucas semanas, GitHub,
Vercel, Python e Codex eram vocabulário desconhecido para ele. Hoje ele mantém um
instrumento de ~5.700 linhas em produção. Ele aprende rápido, mas **não é
programador e não vai contratar ninguém**. Ele faz tudo com as próprias mãos,
seguindo o passo a passo que você der.

**Como ele trabalha:** manda prints, descreve o sintoma, questiona quando não
entende, e traz auditorias de outras IAs para você confrontar. Ele é o seu par de
olhos — você não vê o servidor, o terminal nem o navegador dele. Isso funcionou
muito bem: praticamente todos os bugs graves foram achados por essa dinâmica.

**O que ele espera de você:**
- Passo a passo real, com o texto exato para colar, sem pressupor conhecimento.
- Nunca deixá-lo travado por excesso de tecnicidade ou complexidade.
- Honestidade, inclusive quando a resposta for "isso não vai funcionar".
- Que você diga quando ele estiver errado. Ele reage bem a isso.

**O que ele te disse explicitamente:** *"tempo é o ativo mais valioso"*. Não faça
ele perder tempo com caminho que você já sabe que é ruim.

---

## 1. O objetivo do projeto

Construir um **sistema de predição de mercado para Bitcoin** com objetivo
declarado de ganhar dinheiro, baseado em estudo, teste, simulação, observação e
conclusão — não em narrativa nem em achismo.

A frase que organiza toda a evolução daqui pra frente:

> **Não queremos saber apenas como o mercado ESTÁ. Queremos saber o que
> provavelmente ACONTECERÁ depois.**

O sistema atual responde bem a primeira pergunta e **não responde** a segunda.
Essa é a fronteira que estamos atravessando.

O usuário deixou claro: **não há restrição de orçamento** para APIs pagas,
servidores ou serviços, desde que a ideia faça sentido lógico, arquitetural e
preditivo. O que ele não quer é contratar pessoas.

---

## 2. O que existe hoje — SEIOS v53

### 2.1 Natureza

Um **único arquivo `index.html`** (~5.700 linhas, ~295 KB), sem build, sem
servidor, sem dependência externa. Roda direto no navegador. Publicado no GitHub
Pages. Todo o estado vive no navegador do usuário:

- `localStorage`, chave `seios_btc_v2` — estado, motores, cenários, premissas,
  histórico recente
- `IndexedDB`, banco `seios_archive_v1` — histórico arquivado acima de 500 registros

**Atenção crítica:** o Safari apaga `localStorage` de sites não visitados por 7
dias. Mitigação já aplicada: o usuário adicionou o app à Tela de Início (o que
torna o armazenamento persistente) e exporta backup `.json` semanalmente.

### 2.2 Os nove motores e seus pesos

| Motor | Peso | Observação |
|---|---|---|
| Macro | 28% | FRED: juros, CPI, M2, DXY, curva |
| Fluxo institucional (ETFs) | 15% | só prêmio Coinbase é automático; ETF flow é manual |
| On-chain | 15% | MVRV, NUPL, endereços ativos, hash rate |
| Derivativos | 15% | funding, OI, put/call, long/short, taker |
| Técnico | 4% | RSI, MM50, tendência, desequilíbrio de livro |
| Sentimento | 5% | Fear & Greed |
| Geopolítico | 5% | GDELT, EPU via FRED |
| Eventos extraordinários | 5% | pico de volume de notícias |
| Ativos Globais | 8% | petróleo, euro, S&P, cobre, VIX, juros 10a |

**Soma = 1.00 exatos.** Verificado por teste automatizado.

Cada indicador é normalizado para a escala **−100 a +100**. O motor é a média dos
seus indicadores **vigentes**. O score geral é a média ponderada dos motores.

### 2.3 Cortes de decisão

| Score | Recomendação |
|---|---|
| ≥ +40 | Reforçar |
| +15 a +39 | Entrar parcialmente |
| −14 a +14 | Observar |
| −15 a −54 | Reduzir |
| ≤ −55 | Sair — ou "Avaliar posição vendida (short)" |

**Travas que passam por cima de tudo:**
- `COBERTURA_MINIMA = 0.35` — abaixo disso, "Aguardar confirmação (dados insuficientes)"
- `COBERTURA_ALTA_CONVICCAO = 0.50` + divergência < 35 — exigidos para cogitar short
- Premissa-chave do cenário líder invalidada → rebaixa para "Aguardar confirmação"

### 2.4 Conceitos que você precisa não confundir

- **`completeness`** — fração do PESO total que tem pelo menos um dado. Número
  generoso: um indicador vivo faz o motor inteiro contar. **Não governa mais nada.**
- **`cobertura`** — fração dos INDICADORES efetivamente preenchidos e vigentes,
  ponderada. É este que governa as travas de decisão.
- **`divergence`** — desvio-padrão **ponderado pelos pesos** dos composites. Técnico
  (4%) discordando não pesa igual a Macro (28%).

### 2.5 Frescor (`VALIDADE_HORAS`)

A validade de cada indicador herda o horizonte que ele já declara em
`INDICATOR_HORIZON`:

- `curto` → 12 horas
- `medio` → 72 horas
- `longo` → 336 horas (14 dias)

Indicador vencido **sai da conta** — do score, dos relógios, de tudo — e aparece
riscado na tela. Indicador preenchido à mão nunca vence (é julgamento do usuário).
Estado antigo sem carimbo não expira (não se inventa idade desconhecida).

### 2.6 Motores de aprendizado

- **Learning Engine** — grava um registro a cada atualização, com trava de 6h
  (`LOG_COOLDOWN_MS`). Guarda preço, score, ação, cenário líder e snapshot dos composites.
- **Resolução** — `OUTCOME_HORIZON_MS` = 7 dias. Resolve comparando o preço de
  agora com o do registro, e grava em quantos dias fechou (`resultadoDias`).
- **Case Engine / Memória** — só contam registros resolvidos entre
  `CASE_ENGINE_JANELA_MIN = 7` e `CASE_ENGINE_JANELA_MAX = 12` dias. Mínimo de 5
  casos bullish E 5 bearish por motor para emitir veredito.
- **Histórico unificado** — `getFullHistory()` junta IndexedDB (frio) + `S.history`
  (quente). Espelho em memória `ARQUIVO_ESPELHO`, recarregado no boot.

### 2.7 Cenários

Gerados pelo sistema a partir do estado. **Não pedem confirmação ao usuário** — o
sistema checa os próprios gatilhos contra os dados atuais (`avaliarGatilho`,
`placarDoCenario`) e reporta "2 de 3 gatilhos batidos". Botões de confirmar/invalidar
só existem em cenários que o usuário escreve à mão.

- Cenário **rival** é contraponto obrigatório e **nunca pode ser líder**.
- "Convicção" é heurística declarada — **não** é probabilidade empírica.
- Mudança de direção rebaixa cenário confirmado para ativo.
- Cenário expira em 45 dias (`CENARIO_VALIDADE_DIAS`).

### 2.8 Interface (v50–53)

- **Herói** — veredito grande (BEAR/NEUTRO/BULL), recomendação, frase em português,
  preço, sparkline, as 3 médias semanais em dólar.
- **Faixa ao vivo** — preço tick a tick da Binance via WebSocket. Fica FORA do
  `#heroWrap` de propósito: `renderHero()` reescreve aquele innerHTML e apagaria
  o gráfico. Avisa quando o preço ao vivo se afasta >1% do último fetch.
- **Prazos** — curto/médio/longo em palavra.
- **Relógios** — score geral, power law, 3 MAs semanais, 9 motores.
- **10 relatórios atrás de botões**, um aberto por vez.

### 2.9 Rotina diária acordada com o usuário

- **Diário, sempre no mesmo horário:** (1) `↻ Atualizar dados`; (2) relatório
  Cenários → `Gerar cenário automático`. Nessa ordem — o cenário lê o estado.
- **Semanal:** exportar backup `.json`.
- **Mensal:** relatório Backtest → `Calibrar o score geral`.
- **Não pular mais que 4 dias.** A resolução só roda quando o app abre; sumir 10
  dias faz os registros resolverem fora da janela 7–12 e serem descartados da
  estatística. Sumir uma semana não atrasa o aprendizado — apaga aquele pedaço.
- **Auto-atualização de 30min foi REMOVIDA** (v53) porque gravava até 4 registros
  por dia — quatro fotos do mesmo regime inflando a amostra sem acrescentar experiência.

---

## 3. Histórico das auditorias — o que quebrou e por quê

Isto não é curiosidade histórica. São erros pagos com descoberta, e vários
**devem nascer prontos no sistema novo**.

### 3.1 O achado mais grave: granularidade do CoinGecko (corrigido na v46)

`fetchMarketChart(90)` não passava `interval`. A API decide sozinha: de 2 a 90
dias devolve dados **HORÁRIOS**; acima de 90 dias, diários.

Consequência: a "tendência 30 dias" media **30 horas**. RSI(14) media 14 horas.
"MM50" media ~2 dias. A volatilidade "30d" era o desvio de 30 retornos horários —
que fica na casa de 0,3%, então o rótulo "volatilidade baixa" era **constante**,
independente do mercado. E o backtest pedia 365 dias e recebia diário: calibrava
um Técnico diário contra um Técnico horário rodando ao vivo. **Nunca mediram a
mesma coisa.**

Correção: `fetchDailyCloses(365)` + `toDailyCloses()` que reamostra qualquer coisa
para fechamento diário. Duas defesas, não uma.

Medido em simulação: a "tendência 30d" cobria **1,21 dias**; passou a cobrir 29.
A volatilidade saiu de 0,016% ("baixa" perpétua) para 3,46% ("média").

**Implicação ainda não resolvida:** a leitura CONTRÁRIA do RSI (RSI baixo =
comprar) foi baseada numa calibração antiga feita sobre dados horários rotulados
como diários. **Pode ser artefato do bug.** A calibração de 07/08 ainda mostra
Técnico "direção invertida" com dado correto — o que sugere que contrarian está
errado neste período e tendência seguidora estaria certa. **Não mexer nisso sem
mais dado.**

### 3.2 Look-ahead no backtest (corrigido na v46 e v49)

- **CPI e M2**: a data da observação do FRED é o período de REFERÊNCIA, não a data
  de divulgação. O CPI de julho tem data 2026-07-01 e sai em ~13 de agosto. O
  backtest entregava o número **45 dias antes de existir**. Corrigido com
  `DEFASAGEM_PUBLICACAO_DIAS` (CPI 45d, M2 60d).
- **Buscas históricas**: `series.findIndex(p => p.date >= dateStr)` pegava, numa
  lacuna da série, um ponto do FUTURO. Corrigido com `ultimoConhecidoAte()`.
- **Fim de semana**: séries do FRED são de dias úteis; o BTC opera 7 dias. Em ~28%
  dos dias testados, DXY/curva/petróleo/euro/S&P simplesmente sumiam do cálculo.
  Corrigido com `valorDeMapaAte()` (último dia útil conhecido, limite 5 dias).

### 3.3 Outros erros corrigidos, resumidos

| Erro | Versão | Essência |
|---|---|---|
| Chaves de API no export `.json` | v44 | Backup levava credencial em texto puro |
| Sem escape de HTML | v44/v49 | Backup malicioso = XSS na origem das chaves |
| Cenário rival virava líder | v44 | Em mercado neutro, base ficava <50% e rival herdava a maioria |
| Pesos dos prazos ≠ pesos do score | v46 | Divisor contava indicadores vazios; 4.999 de 5.000 casos divergiam, até 42 pontos |
| MVRV e NUPL votando duas vezes | v46 | NUPL = 1 − 1/MVRV é identidade; correlação dos scores 0,86 |
| Gatilhos do cenário Bear invertidos | v46 | "preço acima da MM50" CONFIRMAVA a queda |
| Dado velho pontuando eternamente | v46 | `setFailed` não limpava valor; sem timestamp por indicador |
| "Confiança 100%" falsa | v46 | Era cobertura de motor, não de indicador |
| Cobertura não governava a decisão | v49 | Trava e short ainda usavam `completeness` |
| Cenário confirmado mudando de tese | v49 | Regressão introduzida na v46 |
| Case Engine misturando janelas | v45 | Retorno de 300 dias na mesma média de um de 7 |
| OI como direcional isolado | v49 | OI subindo pode ser long OU short entrando |
| Arquivo frio fora do aprendizado | v46 | Sistema esquecia justo quando tinha experiência |
| "Zerar tudo" não zerava IndexedDB | v49 | — |
| WebSocket com reconexão dupla | v49 | Dois sockets, um órfão |

### 3.3-bis Terceira auditoria (Manus AI, 10/08/2026) — corrigido na v54

Auditoria externa quantitativa. Achados confirmados no código e corrigidos:

| Achado | Essência |
|---|---|
| **XSS ainda aberta** | `linkedTitles` em `renderPremises` — título de cenário ia cru pro innerHTML. A v44 escapou `sc.title` em `renderScenarios` e **não escapou a segunda interpolação do mesmo dado**. Correção parcial repetida. |
| **Renormalização silenciosa** | Sem chave FRED, Macro (28%) e Ativos Globais (8%) morrem juntos; os 64% restantes são reescalonados e Institucional/On-chain/Derivativos vão de 15% para **23,44% efetivos** (fator 1,56x). A tela mostrava o nominal. |
| **Janela de 90 "dias" = 90 linhas** | Em série de dias úteis, 90 registros = **126 dias corridos**. Medido e confirmado. |
| **Vintages do FRED** | A defasagem de publicação foi corrigida na v46, mas o backtest usava os valores **revisados de hoje**. Agora usa `output_type=4` (initial release). |
| **Divergência assimétrica** | Score +70 com divergência 71 devolvia "Reforçar". A dispersão só travava o lado vendido. |
| **Sem timeout no fetch** | Uma fonte pendurada travava a rodada. HTTP 451 (bloqueio geográfico) era repetido inutilmente. |
| **Resolução dependia de quando o app abria** | Agora usa o fechamento diário exato em t+H; resolução aproximada é marcada e **não entra na estatística**. |
| **"Neutro" com cobertura 0%** | Score 0 sem dado virava veredito de aparência legítima. Agora mostra "Sem leitura". |
| Contraste 4,11:1 · movimento reduzido · rótulo RSI-SMA · sobreposição F&G/Técnico | Corrigidos/declarados |

**Não aplicar o `index_hotfix.html` que veio junto com essa auditoria** — foi construído
sobre outra cópia do arquivo e reverteria correções da v49–v53. As correções foram
portadas uma a uma, com testes.

### 3.4 Problemas CONHECIDOS e NÃO corrigidos

**Anote: estes continuam abertos.**

1. **Coluna "vs. referência" do backtest tem sinal errado para recomendações
   defensivas.** "Reduzir" aparece com −5,5pp e parece o pior da tabela, mas é
   **acerto**: o sistema mandou reduzir e o preço caiu mais que a média. A coluna
   calcula tudo como se fosse sinal de compra. Está atrás de botão desde a v51, mas
   engana quem abre.
2. **Janelas de 30 dias sobrepostas** — 285 dias testados não são 285 observações
   independentes. **São ~9 janelas não sobrepostas, e a autocorrelação de primeira
   ordem dos retornos é 0,9625, o que dá tamanho efetivo AR(1) de ~5,4.**
   *(Correção de 10/08: uma versão anterior deste documento dizia "~41". Aquele
   número usava divisor de 7 dias num backtest de retorno de 30 dias — subestimava
   o problema em 4 a 8 vezes. Com N efetivo entre 5 e 9, a tabela de recomendações
   do backtest não sustenta conclusão nenhuma.)*
3. **Live ≠ backtest.** Derivativos ao vivo tem 5 indicadores; no histórico
   gratuito só funding existe. Geopolítico e Eventos nunca entram. Já declarado no
   rodapé da calibração, mas significa que a calibração mede uma versão magra.
4. **Overfitting estrutural** — ajusta e avalia no mesmo período.
5. **Macro nunca fica negativo.** Na calibração: 213 dias "bullish", ZERO "bearish".
   Um motor com 28% do peso que não discrimina nada.
6. **Ativos Globais aparece com direção invertida** desde que entrou no backtest.

### 3.5 A calibração de 07/08/2026 — números reais

Referência (comprar e segurar, qualquer dia): **−5,1% em 30d, 41% de acerto,
285 dias.** Equivale a ~**−47% no ano**: o período testado é mercado de baixa.
**Tudo aparece negativo por isso.** A régua de leitura é: bateu ou não bateu os −5,1%.

| Recomendação | Dias | Retorno 30d | vs. ref | Veredito real |
|---|---|---|---|---|
| Entrar parcialmente | 95 | −3,8% | +1,3pp | acertou |
| Observar | 172 | −5,2% | −0,1pp | neutro, correto |
| Reduzir | 18 | −10,6% | −5,5pp | **acertou** (defensivo) |

Por motor: Fluxo institucional, On-chain e Sentimento com direção coerente.
Técnico e Ativos Globais invertidos. Macro e Derivativos sem amostra.

---

## 4. A matemática que decide tudo

**Esta seção é a mais importante do documento.** Ela é o que impede o projeto de
virar coleção de coincidências.

### 4.1 Quantas observações são necessárias

Poder 80%, α 5%. Janelas sobrepostas em dado diário valem ~1 observação
independente a cada H dias, onde H é o horizonte do alvo. A tabela abaixo usa
H = 7. **Para o backtest atual, que mede retorno de 30 dias, o divisor é 30 —
e a autocorrelação medida (0,9625) reduz ainda mais: N efetivo ≈ 5,4 em 285 linhas.**

| Se o sinal acerta | Precisa de | Equivale a |
|---|---|---|
| 53% | 2.172 obs | 42 anos |
| 55% | 777 obs | 15 anos |
| 60% | 188 obs | 3,6 anos |
| 65% | 79 obs | 1,5 ano |
| 70% | 41 obs | 10 meses |

### 4.2 O que temos e o que o dado pago muda

| Cenário | Histórico | Detecta a partir de |
|---|---|---|
| Hoje, APIs grátis | ~1 ano (~52 obs) | **68,1%** |
| Binance/Deribit completo | 7 anos (~365 obs) | **57,3%** |
| + on-chain desde 2015 | 10 anos (~521 obs) | **56,1%** |

Dado disponível hoje, do log real de calibração: preço 365d, Fear&Greed 370d,
**funding 167d**, hash rate 365d, MVRV 500d, prêmio Coinbase 350d, macro FRED 365d.
ETF spot existe só desde jan/2024 (~580 dias, **um único regime**).

**Conclusão:** com dado grátis só se detecta o óbvio. Com dado pago entra-se na
faixa onde vivem edges reais. **O dinheiro resolve isso de verdade.**

### 4.3 A economia, se o sinal for real

55% de acerto, movimento típico ±5% em 7 dias, custo 0,1% por operação:
**EV +0,40% por operação × ~50 operações/ano = +20% ao ano.**

**Mas a variância:**

| Acerto real | Chance de ano NEGATIVO (50 operações) |
|---|---|
| 53% | 39% |
| 55% | **28%** |
| 60% | 10% |

Um sistema com edge verdadeiro de 55% perde dinheiro em ~1 a cada 4 anos.
**Isso precisa estar aceito antes**, ou o sistema será abandonado exatamente
quando estiver certo.

### 4.4 O que o dinheiro NÃO resolve

1. **Não-estacionariedade.** A estrutura do mercado cripto mudou ao menos 4 vezes:
   varejo até 2017, sem institucional até 2020, alavancagem/DeFi 2021,
   desalavancagem 2022 (LUNA/FTX), era ETF de 2024. Modelo treinado em 2019–2022
   pode não transferir. Dez anos de dado ≠ dez anos de dado relevante.
2. **Histórico que não existe.** ETF spot só desde jan/2024. Nenhum dinheiro cria
   histórico anterior ao produto.
3. **Tempo para provar ao vivo.** Sinal de 55% = ~15 anos sem backtest. Por isso o
   backtest bem-feito não é luxo, é a única forma de ter resposta em tempo humano.

### 4.5 Pattern Discovery — o risco

Testando 1.000 regras candidatas a α=5%: **50 falsos positivos por puro acaso.**
Com Bonferroni o α por regra vira 0,00005 — exige efeito gigantesco.
**Se for implementado, exige trava dura:** mínimo de N ocorrências independentes,
e o número de regras testadas declarado na tela.

---

## 5. Premissas invioláveis

Escritas nesta conversa. **Não derivar delas sem o usuário concordar explicitamente.**

1. **Primeiro consertar a medição, depois julgar o peso.** Não mexer nos pesos
   28/15/15/15/4/5/5/5/8 enquanto houver dúvida sobre o que está sendo medido.
2. **Não adicionar indicadores agora.** Acrescentar peso à média ponderada só
   adiciona complexidade, não predição. O próximo salto não é mais indicadores.
3. **Nenhuma etapa termina sem algo visível funcionando.** Nunca pedir semanas de fé.
4. **O sistema atual não para.** Ele roda e acumula durante toda a construção do novo.
5. **O SEIOS heurístico vira o baseline.** Qualquer modelo novo tem que provar que
   bate ele. Se não bater, o modelo novo vai fora e o SEIOS fica.
6. **Portões escritos antes, não renegociados depois.**
7. **Nada de VPS.** O usuário não deve administrar Linux, SSH, firewall ou Docker.
8. **Repositório novo, mas o front-end começa como cópia do `index.html` atual.**
   Não é página em branco.
9. **O sistema pode ser categórico sobre o ESTADO** (medição), nunca sobre o
   FUTURO (probabilidade). Cenário é lista de verificação que se resolve sozinha,
   não previsão com selo de verdade.
10. **O painel é para decidir; o relatório é para auditar.** Não voltar a misturar.

### 5.1 Aviso sobre o seu próprio viés

Você (Claude) tem tendência a agradar. Daqui a meses, se o resultado for morno,
existe risco real de você ajudar o usuário a enxergar uma leitura otimista de um
resultado ruim. **Os portões de decisão existem para controlar você, não só o
mercado.** Isto foi dito ao usuário explicitamente e ele concordou. Honre.

---

## 6. Para onde vamos — a arquitetura alvo

### 6.1 A separação conceitual

Quatro objetos independentes, hoje misturados:

1. **Market State** — o que está acontecendo agora *(existe, funciona bem)*
2. **Forecast** — o que estatisticamente tende a acontecer *(não existe)*
3. **Scenario** — quais caminhos explicam esse futuro *(existe, heurístico)*
4. **Decision** — o que fazer diante das probabilidades *(existe, determinístico)*

O erro seria pedir que o Market State Engine também fosse o previsor.

### 6.2 A saída que queremos

Em vez de `Score +32 → Bull → Entrar parcialmente`:

```
BTC — horizonte 72h
  Probabilidade de alta: 64%   (calibrada, medida por Brier score)
  Retorno esperado: +2,1%
  Intervalo provável: −3,8% a +6,4%
  Convicção: moderada
  Regime detectado: risk-on / volatilidade média
  Principais causas: liquidez, derivativos, fluxo institucional
  Evidências contrárias: skew de opções, DXY
  Modelos concordando: 4/5
```

### 6.3 Infraestrutura escolhida — e por quê

**Decisão tomada: nada de VPS.** Motivo: administrar Linux não agrega ao projeto
e é exatamente onde o usuário travaria sozinho às onze da noite.

| Camada | Escolha | Por quê |
|---|---|---|
| Código + agendador | **GitHub + GitHub Actions** | Ele já sabe usar. Cron grátis, sem servidor. |
| Banco | **Postgres gerenciado (Neon ou Supabase)** | Cria pelo navegador, copia senha, acabou. |
| Painel | **Vercel** | Ele já usa. |

**Feature Store** — Postgres/TimescaleDB. Uma linha por ativo por timestamp. Cada
feature com carimbo de **quando ficou conhecida** (não quando se refere). Essa
coluna torna look-ahead **impossível por construção** — o mesmo erro do CPI, agora
estrutural em vez de evitável por cuidado.

### 6.4 O que se aproveita do sistema atual

| Peça | Destino |
|---|---|
| Lógica dos indicadores e normalização | Portada para Python, ~integral |
| Correções de look-ahead, frescor, granularidade | Portadas; algumas viram estruturais |
| Pesos, horizontes, cortes de decisão | Continuam, como **baseline** |
| Painel, relatórios, relógios, herói | Continuam, consumindo API |
| localStorage / IndexedDB | Substituídos por Postgres |
| Backtest de 12 meses | Substituído por walk-forward |
| "Convicção" heurística | Vira probabilidade calibrada |

---

## 7. Roadmap

### FASE 0 — Marco zero (1 a 2 horas)

**Antes de qualquer assinatura paga.** Provar que a máquina funciona nas mãos dele.

1. Criar repositório novo (separado do SEIOS atual, que não pode quebrar)
2. Criar banco no Neon, pegar string de conexão
3. Coletor mínimo em Python: busca **um** dado grátis (preço do BTC), grava numa tabela
4. GitHub Action rodando de hora em hora
5. **Ele abre o banco e vê as linhas aparecendo**

Se travar, travou com custo zero.

### FASE 1 — Acumular e medir o que já existe (90 dias, em paralelo)

**O passo mais subestimado. Não pular.**

- Rodar o SEIOS atual todo dia. Em 90 dias: ~83 previsões resolvidas.
- Implementar **Brier score** sobre o que o sistema já produz. Vem ANTES de
  qualquer ML. Vai provavelmente mostrar que a "convicção" atual não tem valor
  informativo — que é exatamente o que precisamos saber.
- Consertar a coluna "vs. referência" do backtest (sinal invertido para defensivas).

### FASE 2 — Ganhos baratos, sem dado novo, sem ML

Ordenados por valor/esforço:

1. **Similar Case Engine** — vizinhos-mais-próximos sobre o vetor de composites.
   Sem treino, sem biblioteca, degrada bem com pouco dado, explicável por natureza.
   Roda sobre os ~285 dias reconstruídos do backtest, não só sobre o histórico do
   usuário. *É a melhor ideia disponível hoje.*
2. **Velocidade e aceleração** — Δx e Δ²x de cada indicador. Funding a +0,01 é
   irrelevante; funding indo de −0,01 a +0,01 em dois dias é evento.
3. **Detecção de divergências** — preço ↓ + prêmio Coinbase ↑; preço ↑ + OI ↓;
   preço ↑ + CVD spot ↓. Sinal genuinamente antecipatório, custo zero de dado.
4. **Regime Engine simples** — 4 regimes por REGRA (tendência alta/baixa ×
   volatilidade alta/baixa), não 6 aprendidos. Provável explicação do enigma do
   Técnico invertido: RSI contrário talvez funcione em range e falhe em tendência.

### FASE 3 — Dado pago e Feature Store

Ordem de valor por real gasto:

1. Derivativos históricos (funding, OI, liquidações) — desde ~2019
2. Opções (IV, skew, term structure) — **o dado mais genuinamente prospectivo que
   existe**, porque é expectativa precificada, não histórico
3. On-chain com profundidade — desde 2011
4. Order book histórico
5. Consenso macro para surprise index

*Nota: preços não foram levantados. Fazer orçamento com 3 cotações por categoria
antes de assinar qualquer coisa.*

### FASE 4 — Modelagem

Só depois de existir Feature Store com anos de dado.

- Baseline estatístico → regressão logística → gradient boosting (XGBoost/LightGBM)
- Modelos **diferentes** por horizonte (24–72h microestrutura; 7–30d fluxo; 2–6m ciclo)
- Ensemble com o SEIOS heurístico como Model A
- SHAP para explicabilidade
- **Walk-forward obrigatório**, com um período final NUNCA tocado até o fim

### FASE 5 — Descoberta (só com trava dura)

Pattern Discovery → Theory Engine → Falsification Engine → Shadow Mode →
promoção. Nunca deixar o aprendizado alterar pesos automaticamente antes disso.

---

## 8. Os portões de decisão

**Escritos antes. Não se renegociam depois.**

- **Portão 1** — o modelo bate o baseline "sempre neutro" no Brier score, em dado
  out-of-sample. Se não bater, **para**.
- **Portão 2** — a calibração é real: quando diz 70%, acerta ~70%. Curva de
  confiabilidade, não impressão.
- **Portão 3** — o edge sobrevive a custo e slippage realistas, não idealizados.
- **Portão 4** — funciona no período final, que ninguém olhou durante o
  desenvolvimento. **Uma única vez.** Segunda tentativa já é overfitting.

Falhar em qualquer um = "não encontramos edge". É conclusão científica legítima e
vale o investimento, porque impede operar achando que tem vantagem quando não tem.

### Expectativa honesta, dita ao usuário

A probabilidade de encontrar edge durável de 60%+ em direção de BTC em 7 dias é
**baixa**. O mais provável é achar algo entre 53% e 57% em regimes específicos —
negócio real, mas com aquela chance de 28% de ano negativo. **Vale fazer** pelo
processo, não pela garantia.

---

## 9. Ideias avaliadas e REJEITADAS ou ADIADAS — com o motivo

Não reabrir sem motivo novo.

| Ideia | Status | Motivo |
|---|---|---|
| XGBoost / ensemble agora | Adiado | Sem dado de treino; não roda em HTML de arquivo único |
| Walk-forward 2021–2025 agora | Adiado | Derivativos tem 167 dias de histórico grátis |
| Pattern Discovery agora | Adiado | 1.000 regras a α=5% = 50 falsos positivos |
| Macro Surprise Index | Bloqueado | Exige série de consenso paga (Bloomberg/Refinitiv) |
| Order flow / CVD | Bloqueado sem backend | Exige coleta contínua; a página fica fechada 99% do tempo |
| Normalização por z-score/percentil | Adiado | Exige distribuições históricas confiáveis que não existem |
| 6 regimes aprendidos | Reduzido | Fazer 4 por regra primeiro |
| Mais indicadores na média ponderada | Rejeitado | Adiciona complexidade, não predição |

---

## 10. Como retomar uma sessão

O usuário sobe três arquivos:

- **`SEIOS-CONTEXTO.md`** (este) — o mapa completo: premissas, matemática, histórico
- **`ROADMAP.md`** — a rota executável, sessão por sessão, e onde paramos
- **`STATUS.md`** — o log curto de cada sessão *(criar na Sessão 1)*

Você lê os três antes de responder qualquer coisa. **Você é o arquiteto: não
pergunte ao usuário qual o próximo passo — ele está escrito no roadmap.** O papel
dele é executar e reportar o que viu.

**Regra:** ao fim de cada sessão relevante, você **atualiza os dois** e devolve ao
usuário. Se uma decisão nova for tomada, ela entra na seção 5 (premissas) ou 9
(rejeitadas), com o motivo. Um projeto de meses com um colaborador sem memória só
sobrevive assim.

### Como validar mudanças no `index.html` atual

Padrão estabelecido nesta sessão, que funcionou bem:

1. Copiar de `/mnt/user-data/uploads/` para o diretório de trabalho
2. Editar com scripts Python (`str.replace` com `assert` — falha alto se o alvo
   mudou de forma)
3. Extrair o `<script>` e rodar `node --check`
4. Rodar as suítes de teste em Node contra funções extraídas do arquivo
5. Checagens estáticas: ids duplicados, `getElementById` sem alvo, divs balanceados
6. Bumpar `BUILD_VERSION`, copiar para outputs, apresentar

**Aviso:** `/home/claude/work` **reseta entre sessões**. O arquivo bom vive em
`/mnt/user-data/outputs/`. Isso já causou uma perda de trabalho nesta sessão —
sempre conferir `BUILD_VERSION` antes de editar.

**Truque útil:** dá para executar o app inteiro em Node com um DOM falso, para
depurar de verdade em vez de ler código. O script é uma IIFE (`(function(){`), então
o código de teste tem que ser injetado **dentro** dela, antes do `})();` final.

---

## 11. Glossário mínimo

- **Cobertura** — % de indicadores preenchidos e vigentes. Governa as travas.
- **Completeness** — % do peso com pelo menos um dado. Generoso. Não governa nada.
- **Divergência** — desvio-padrão ponderado dos composites. Alto = motores brigando.
- **Vigente** — indicador com dado dentro da validade do seu horizonte.
- **Convicção** — número heurístico do cenário. **Não** é probabilidade.
- **Baseline** — o SEIOS heurístico atual, contra o qual tudo novo se mede.
- **Brier score** — erro médio quadrático de previsões probabilísticas. Menor é melhor.
- **Walk-forward** — treina em janela passada, testa na seguinte, avança. Contra overfitting.
- **Shadow Mode** — modelo roda e registra sem influenciar decisão, até provar valor.

---

## 12. Última coisa

O usuário disse: *"tempo é o ativo mais valioso"*. Ele tem razão, e é por isso que
este documento é longo — cada parágrafo aqui é uma hora que ele não vai perder
refazendo uma discussão já resolvida ou perseguindo um caminho já descartado.

Não invente atalho. Não pule a Fase 1 porque parece lenta. Não deixe o entusiasmo
de construir uma coisa nova atropelar o rigor de medir se ela funciona.

E quando o resultado for morno, diga que foi morno.

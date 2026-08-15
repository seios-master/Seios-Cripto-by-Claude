# Linha de base — `m2-2026-08-15`

> Medida em 15/08/2026, build `2026-08-15.86-backtest-completo`.
> **Substitui** a linha de base `m1`, que foi medida sobre um sistema incompleto.
> Este documento não se edita. Quando o modelo mudar, cria-se outro ao lado.

---

## Por que esta substitui a anterior

A linha de base `m1`, medida às 07:25 do mesmo dia, tinha dois defeitos que só
ficaram visíveis depois:

1. **Media 80% do sistema.** Cobre, VIX, Treasury 10a e EPU não entravam no
   backtest — não por serem irrelevantes, mas por ninguém ter escrito o
   código. Ativos Globais era julgado com metade dos indicadores.
2. **Media outro modelo.** O `m1` renormalizava peso integralmente quando um
   indicador faltava; o `m2` fixa o coeficiente e trata ausência como massa
   não observada.

O que a `m1` afirmava sobre "o sistema" era afirmação sobre um subconjunto,
sob regras que não valem mais.

---

## Condições da medição

| | |
|---|---|
| Modelo | `m2-2026-08-15` |
| Build | `2026-08-15.86-backtest-completo` |
| Amostra | 285 dias classificados, 12 meses de preço |
| Séries FRED | 12/12 |
| Datas de divulgação | 111 observações com data REAL do FRED, 0 estimadas |
| Manuais preenchidos | nenhum |
| Cobertura do teste | ~92% do peso (Eventos fora; Geopolítico, Institucional e Derivativos parciais) |

**Regime:** os 285 dias foram de mercado em queda. Tudo abaixo é específico
deste regime.

---

## Referência a bater

**Comprar e segurar: −5,0% em 30 dias · 42% de altas.**

| Estratégia de 1 indicador | Retorno 30d | Acerto | Dias |
|---|---|---|---|
| RSI < 30 | −4,2% | 38% | 53 |
| **Fear & Greed < 25** | **+1,3%** | **64%** | **171** |

O Fear & Greed puro continua sendo o número mais duro do documento.

---

## Desempenho do sistema

| Recomendação | Dias | Retorno 30d | vs. referência | % de altas |
|---|---|---|---|---|
| Entrar parcialmente | 31 | −4,6% | **+0,4pp** | 48% |
| Observar | 246 | −4,8% | +0,2pp | 42% |
| Reduzir | 8 | −13,4% | **−8,4pp** ✓ | 13% |

**Mudança em relação à `m1`:** o lado comprado saiu de −0,5pp para +0,4pp. A
inversão de sinal veio de reclassificação (motores completos mudaram o score de
vários dias), não de melhora de modelo. Com 31 dias, continua indistinguível de
ruído.

O sistema disse "Observar" em 86% dos dias.

---

## Motor por motor

| Motor | Peso | Bullish | Bearish | Veredito |
|---|---|---|---|---|
| Macro | 28% | −3,8% (193d) | — | **nunca marcou bearish** |
| Fluxo institucional | 15% | −3,6% (116d) | −6,3% (134d) | ✓ coerente · *parcial* |
| On-chain | 15% | −3,8% (69d) | −7,2% (105d) | ✓ coerente |
| Derivativos | 15% | — | — | sem amostra · *só funding* |
| Técnico | 4% | −9,9% (36d) | −1,2% (122d) | ⚠ **invertido** |
| Sentimento | 5% | −3,5% (259d) | −17,9% (7d) | amostra insuficiente |
| Ativos Globais | 8% | −4,8% (88d) | +14,5% (5d) | amostra insuficiente |

### Correção importante em relação à `m1`

Na `m1`, Ativos Globais aparecia como **direção invertida** (−5,3% bullish
contra −1,2% bearish). Com os seis indicadores, a inversão **desapareceu**: os
dias bearish caíram de 87 para 5 e o retorno virou positivo.

**O veredito anterior era artefato de motor incompleto.** O número novo, com 5
ocorrências, também não prova nada — mas o antigo estava errado.

O **Técnico** continua invertido, e é o único motor **completo** no teste. Esse
achado sobreviveu à correção e é o mais sólido dos três.

---

## As três perguntas em aberto

1. **Por que o Macro nunca marcou bearish em 285 dias?** Maior peso do sistema,
   193 dias bullish, zero bearish. Não investigado.
2. **O Técnico está mesmo invertido?** Motor completo, 36 vs. 122 dias.
   Sobreviveu à correção do backtest.
3. **O lado defensivo é real?** "Reduzir" bateu a referência em 8,4pp, mas com
   8 ocorrências. Precisa de mercado que dê ocasião — pode levar mais de um ano.

---

## Ressalvas

1. **Sem vintage** em SP500, DTWEXBGS, DCOILWTICO, DEXUSEU — entraram com valor
   revisado. CPI, M2 e cobre usam data real de publicação.
2. **Retornos sobrepostos** — 285 janelas de 30 dias em 365 dias. Tamanho
   amostral efetivo é uma fração disto.
3. **Um regime só** — mercado em queda do início ao fim.
4. **Eventos fora do teste**; Geopolítico, Institucional e Derivativos parciais.
5. **Sem custo** — nada de spread, slippage ou funding.
6. **Travas desligadas** — ao vivo o sistema diria "Aguardar" mais vezes.

---

## Regra de promoção

Nenhuma mudança de peso, corte ou fórmula pode ser adotada por melhorar
**estes** números. Para substituir esta linha de base, uma versão nova precisa:

1. Superar o Fear & Greed puro (+1,3% · 64%) fora da amostra;
2. Superar comprar e segurar em folds que não viu;
3. Manter a vantagem depois de custos;
4. Ser medida sob replay point-in-time.

**E uma lição desta revisão:** antes de aceitar qualquer veredito sobre um
motor, verificar com quantos indicadores ele foi testado. Metade dos vereditos
da `m1` não sobreviveu a essa pergunta.

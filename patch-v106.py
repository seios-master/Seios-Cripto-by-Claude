# -*- coding: utf-8 -*-
"""patch-v106.py — book imbalance vira sensor, e o estado salvo para de
decidir questão de modelo. Cada troca exige EXATAMENTE 1 ocorrência."""
import io, sys

CAMINHO = "index.html"
h = io.open(CAMINHO, encoding="utf-8").read()

def troca(velho, novo, rotulo):
    global h
    n = h.count(velho)
    if n != 1:
        sys.exit("ABORTADO — %s: %d ocorrência(s), esperava 1" % (rotulo, n))
    h = h.replace(velho, novo)
    print("  ✓ %s" % rotulo)

# ---------------------------------------------------------------- 1. VERSÕES
troca('const MODEL_VERSION = "m7-2026-08-16";',
      'const MODEL_VERSION = "m8-2026-08-17";',
      "MODEL_VERSION m7 → m8")

troca('const BUILD_VERSION = "2026-08-16.105-liquidez-relativa";',
      'const BUILD_VERSION = "2026-08-17.106-book-sensor";',
      "BUILD_VERSION v105 → v106")

# ------------------------------------------------- 2. O INDICADOR VIRA SENSOR
troca('''        bookImbalance: ind("Desequilíbrio do livro de ofertas (Binance)", "auto")''',
      '''        /* v106 — BOOK IMBALANCE vira SENSOR, como o ouro na v68. Continua
           sendo coletado e gravado na série todo dia; para de entrar no score.
           MEDIDO ao vivo, não suposto: +27,95 → +66,38 → −54,16 → −78,33 em
           poucas horas — 120 pontos em 25 minutos, sozinho jogando o motor
           Técnico de +9,86 para −14,50.
           Três defeitos empilhados: soma quantidade dos 100 níveis sem
           converter em notional; pesa igual o topo do livro e o nível a 3% do
           meio; e, o que nenhuma fórmula conserta, mede UM INSTANTE num
           sistema que lê de 8 em 8 horas.
           Isto NÃO afirma que a microestrutura não informa nada. Afirma que
           um instantâneo não é observação no relógio deste instrumento. A
           série de sensor decide, com as 777 janelas. Refazer com notional,
           distância do meio e vários snapshots é classe C — depois. */
        bookImbalance: ind("Desequilíbrio do livro de ofertas (Binance) · sensor, não pontua", "auto", "", true)''',
      "bookImbalance declarado como sensor")

# ------------------------------- 3. A NOTA QUE VAI À TELA COM CADA LEITURA
troca('''      setAuto("tecnico","bookImbalance", clamp(imb, -100, 100), `desequilíbrio do book ${imb>=0?"+":""}${imb.toFixed(1)}%`, { bruto: imb });''',
      '''      setAuto("tecnico","bookImbalance", clamp(imb, -100, 100),
        `desequilíbrio do book ${imb>=0?"+":""}${imb.toFixed(1)}% — sensor, não pontua `
        + `(oscilou 120 pontos em 25min; instantâneo demais para leituras de 8 em 8h — `
        + `pode ter sinal, a série decide)`, { bruto: imb });''',
      "nota da leitura declara sensor + a medição")

# ---------------------- 4. DADO SALVO NÃO DECIDE QUESTÃO DE MODELO (o buraco)
troca('''function loadState(){''',
      '''/* v106 — DADO SALVO NÃO DECIDE QUESTÃO DE MODELO.
   `loadState()` funde o salvo por cima do padrão com
   `Object.assign({}, base.ind, parsed.ind)`. `excludeFromScore` é campo do
   indicador e viaja no localStorage — então trocar o padrão para `true` não
   teria efeito NENHUM num navegador que já rodou a build anterior: o `false`
   gravado venceria o código novo, a tela diria "sensor, não pontua" e o
   indicador continuaria votando. Erro sem exceção, sem log, só no resultado.

   Quem vota é decisão de MODELO, versionada junto com o MODEL_VERSION —
   nunca preferência do usuário nem herança de estado. O padrão manda, sempre.
   (O ouro, sensor desde a v68, estava exposto ao mesmo buraco.)

   Mesma família da v99.1 — acumulador que não zera — e da v102 — leitura de
   régua antiga decidindo sob régua nova. */
function forcarSensores(merged, base){
  if(!merged || !base || !merged.motors || !base.motors) return merged;
  Object.keys(base.motors).forEach(function(mk){
    const bm = base.motors[mk], mm = merged.motors[mk];
    if(!bm || !bm.indicators || !mm || !mm.indicators) return;
    Object.keys(bm.indicators).forEach(function(ik){
      if(!mm.indicators[ik]) return;
      // só o direito de voto é reimposto — valor, nota e bruto salvos ficam
      mm.indicators[ik].excludeFromScore = !!bm.indicators[ik].excludeFromScore;
    });
  });
  return merged;
}

function loadState(){''',
      "forcarSensores() declarada")

troca('''    merged.apiKeys = Object.assign({}, base.apiKeys, parsed.apiKeys || {});
    return merged;''',
      '''    merged.apiKeys = Object.assign({}, base.apiKeys, parsed.apiKeys || {});
    /* v106 — DEPOIS do merge, e por isso funciona: o Object.assign acima
       acabou de deixar o salvo sobrescrever o padrão. */
    forcarSensores(merged, base);
    return merged;''',
      "loadState chama o reforço depois do merge")

# ------------------------------------------- 5. O TETO QUE FICOU SEM INQUILINO
troca('''  microestrutura:     0.05    // book imbalance oscilou 43 pontos numa hora''',
      '''  /* v106 — a família ficou SEM VOTANTE: o book imbalance era o único membro
     e virou sensor. O teto continua declarado para o dia em que a
     microestrutura voltar a votar com uma medida que caiba no relógio de 8h. */
  microestrutura:     0.05''',
      "teto da microestrutura anotado")

io.open(CAMINHO, "w", encoding="utf-8").write(h)
print("\npatch-v106 aplicado.")

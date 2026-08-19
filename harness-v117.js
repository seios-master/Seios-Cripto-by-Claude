/* =====================================================================
   harness-v117.js — m12: corrigir premissas que a medição refutou
   =====================================================================
   ÚLTIMA mudança de modelo. Feita no momento mais barato que vai existir:
   a série tinha 4 janelas de 777 quando isto foi decidido. Daqui em diante,
   "os dados sugerem" deixa de ser argumento — senão o congelamento nunca
   acontece de verdade.

   O que muda, e o teste que cada mudança teve que passar (estrutural? /
   sobreviveria a dado diferente? / corrige erro ou otimiza?):

   1. MACRO 28% → 15% · ATIVOS GLOBAIS 8% → 21%
      O peso de 28% do Macro não veio de calibração: veio da premissa de que
      o BTC responde a liquidez e condições monetárias. Medido em 3.289 dias
      e quatro eras: M2 +0,067 · Fed Funds −0,057 · curva −0,008 · CPI −0,027
      · dólar −0,141 · liquidez líquida do Fed −0,029. A premissa não se
      sustenta.
      S&P +0,351 e VIX −0,282 são as duas relações estáveis do conjunto
      (0,32/0,40/0,34/0,41 e −0,31/−0,32/−0,25/−0,31 nas quatro eras) e
      viviam num motor de 8%.
      Os 13 pontos migram inteiros. Não há número "afinado" aqui: 21 = 8 + 13.
      RESSALVA REGISTRADA: esta mudança é informada por dado. Eu não a
      proporia se o S&P tivesse dado 0,05. Não é o caso limpo do euro (v111),
      e isso está escrito para quem ler depois julgar.

   2. MOMENTUM 24h → SENSOR
      Única variável com sinal consistente contra o retorno futuro, e é
      NEGATIVO: −0,048 no estudo, −0,059 na reserva, negativo em três das
      quatro eras. O sistema vota `clamp(change24h*12)` — subiu, bullish.
      NÃO invertemos o sinal: inverter seria usar o dado para escolher a
      direção. Rebaixamos porque a direção é desconhecida, e indicador de
      direção desconhecida não vota. Mesmo argumento do book imbalance (v106).
      O t na reserva é −1,82, abaixo do corte: não há prova de que é
      negativo; há ausência de base para afirmar que é positivo.

   3. "REFORÇAR" (≥ +40) DECLARADO INATINGÍVEL
      Em 3.289 dias com 81% de cobertura, o score máximo em módulo foi 27,7.
      O patamar existe na escada e a aritmética do agregador nunca o produz.
      A escada NÃO muda — o nível é declarado na tela. Mudar a escada seria
      calibrar cortes com o mesmo dado; declarar é informar.

   Uso:  node harness-v117.js index.html
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");
function bloco(ini){
  const abre = HTML.indexOf("{", ini);
  let n=0,str=null,esc=false;
  for(let i=abre;i<HTML.length;i++){
    const c=HTML[i];
    if(esc){esc=false;continue;}
    if(c==="\\"){esc=true;continue;}
    if(str){ if(c===str) str=null; continue; }
    if(c==='"'||c==="'"||c==="`"){ str=c; continue; }
    if(c==="{") n++; else if(c==="}"){ n--; if(!n) return HTML.slice(ini,i+1); }
  }
  throw new Error("bloco não fecha");
}
function declDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const ctx = { S:null };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    /* degrauCru usa constantes do módulo — sem elas o teste falha por
       ambiente, não por defeito, e mascara o que deveria medir. */
    "const DIVERGENCIA_ALTA = " + (/const DIVERGENCIA_ALTA = (\d+)/.exec(HTML)||[0,35])[1] + ";",
    declDe("ind"), declDe("defaultState"), declDe("indicadoresVotantes"),
    declDe("forcarSensores"), declDe("degrauCru"),
    "return { defaultState, indicadoresVotantes, forcarSensores, degrauCru };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

console.log("\nBLOCO A — os 13 pontos migram inteiros, e nada mais se mexe");

t("Macro 15% · Ativos Globais 21%", ()=>{
  const S = API.defaultState();
  eq(S.motors.macro.weight, 0.15, "macro:");
  eq(S.motors.ativosGlobais.weight, 0.21, "ativosGlobais:");
});

t("os outros sete motores continuam idênticos", ()=>{
  const S = API.defaultState();
  const esperado = { institucional:0.15, onchain:0.15, derivativos:0.15,
                     sentimento:0.05, geopolitico:0.05, eventos:0.05, tecnico:0.04 };
  Object.keys(esperado).forEach(function(k){
    eq(S.motors[k].weight, esperado[k], k + ":");
  });
});

t("a soma continua exatamente 1", ()=>{
  const S = API.defaultState();
  const soma = Object.keys(S.motors).reduce(function(a,k){ return a + S.motors[k].weight; }, 0);
  if(Math.abs(soma - 1) > 1e-9) throw new Error("soma dos pesos = " + soma);
});

t("a migração é exata: o que saiu do Macro entrou em Ativos Globais", ()=>{
  /* 28 → 15 tira 13; 8 → 21 põe 13. Se um dia alguém "afinar" um dos dois,
     este teste quebra — e afinar é encaixe no passado. */
  const S = API.defaultState();
  const saiu = 0.28 - S.motors.macro.weight;
  const entrou = S.motors.ativosGlobais.weight - 0.08;
  if(Math.abs(saiu - entrou) > 1e-9)
    throw new Error("saiu " + saiu.toFixed(4) + " do Macro e entrou " + entrou.toFixed(4));
  if(Math.abs(saiu - 0.13) > 1e-9) throw new Error("a migração não é de 13 pontos");
});

console.log("\nBLOCO B — momentum vira sensor, sem inverter sinal");

t("momentum nasce sensor", ()=>{
  const S = API.defaultState();
  eq(S.motors.tecnico.indicators.momentum.excludeFromScore, true, "momentum:");
});

t("Técnico fica com três votantes, e os outros não foram derrubados junto", ()=>{
  ctx.S = API.defaultState();
  const v = API.indicadoresVotantes("tecnico");
  if(v.indexOf("momentum") !== -1) throw new Error("momentum continua votando");
  ["tendencia","rsi","mediaMovel"].forEach(function(k){
    if(v.indexOf(k) === -1) throw new Error("a demoção derrubou junto: " + k);
  });
  eq(v.length, 3, "votantes do Técnico:");
});

t("O SINAL NÃO FOI INVERTIDO — a fórmula continua a mesma", ()=>{
  /* inverter seria usar o dado para escolher a direção, que é calibração.
     A demoção existe porque a direção é desconhecida. */
  const limpo = semComentarios(HTML);
  if(!/clamp\(\s*S\.market\.change24h\s*\*\s*12/.test(limpo.replace(/\s+/g," ")) &&
     !/change24h \* 12/.test(limpo))
    throw new Error("a fórmula do momentum foi alterada");
  if(/change24h \* -12|-\(S\.market\.change24h \* 12\)/.test(limpo))
    throw new Error("o sinal foi invertido — isso não foi autorizado");
});

t("continua sendo coletado e explica na tela por que não pontua", ()=>{
  const limpo = semComentarios(HTML);
  if(!/setAuto\("tecnico","momentum"/.test(limpo))
    throw new Error("a coleta sumiu: sem série, a direção nunca será conhecida");
  const i = limpo.search(/momentum:\s*ind\(/);
  if(i === -1) throw new Error("não achei a declaração");
  const trecho = limpo.slice(i, i + 260);
  if(!/sensor, não pontua/.test(trecho)) throw new Error("não avisa na tela");
  if(!/direção/.test(trecho)) throw new Error("não diz que o motivo é direção desconhecida");
});

console.log("\nBLOCO C — a escada NÃO mudou; o +40 foi declarado");

t("os cortes da escada continuam 40 / 15 / −15 / −55", ()=>{
  eq(API.degrauCru(45, 0, false).action, "Reforçar", "score 45:");
  eq(API.degrauCru(20, 0, false).action, "Entrar parcialmente", "score 20:");
  eq(API.degrauCru(0, 0, false).action, "Observar", "score 0:");
  eq(API.degrauCru(-20, 0, false).action, "Reduzir", "score -20:");
});

t("a tela declara que o +40 é inatingível, com o número medido", ()=>{
  const limpo = semComentarios(HTML);
  if(!/27[.,]7/.test(limpo))
    throw new Error("o máximo histórico medido (27,7) não aparece");
  if(!/nunca|inating/i.test(limpo.slice(Math.max(0,limpo.indexOf("27,7")-500), limpo.indexOf("27,7")+500)))
    throw new Error("não declara que o patamar nunca foi alcançado");
});

console.log("\nBLOCO D — o estado salvo não ressuscita o momentum");

t("forcarSensores impõe os seis, mesmo com false gravado", ()=>{
  const salvo = API.defaultState();
  ["derivativos.takerRatio","derivativos.longShort","tecnico.bookImbalance",
   "tecnico.momentum","ativosGlobais.ouro","ativosGlobais.euro"].forEach(function(id){
    const p = id.split(".");
    salvo.motors[p[0]].indicators[p[1]].excludeFromScore = false;
  });
  API.forcarSensores(salvo);
  ["derivativos.takerRatio","derivativos.longShort","tecnico.bookImbalance",
   "tecnico.momentum","ativosGlobais.ouro","ativosGlobais.euro"].forEach(function(id){
    const p = id.split(".");
    eq(salvo.motors[p[0]].indicators[p[1]].excludeFromScore, true, id + ":");
  });
});

console.log("\nBLOCO E — a mudança está declarada e é a última");

t("MODEL_VERSION foi para m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 12) throw new Error("continua m" + m[1] + ": dois pesos e um voto mudaram sem bump");
});

t("as fórmulas dos que continuam votando estão intactas", ()=>{
  [/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/,
   /"macro\.liquidez":\s*rank\s*=>\s*scoreDoPercentil\(rank, \+1\)/,
   /"derivativos\.funding":\s*rate\s*=>\s*clamp\(-rate \* 100000/].forEach(function(re){
    if(!re.test(HTML)) throw new Error("uma fórmula que vota foi alterada: " + re);
  });
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.116-/.test(m[1])) throw new Error("continua a v116: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v117 verde — m12: premissa refutada corrigida, direção desconhecida sem voto.");

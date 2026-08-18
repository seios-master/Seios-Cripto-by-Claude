/* =====================================================================
   harness-v111.js — a última build que muda o modelo
   =====================================================================
   Quatro defeitos, um bump só. O critério para entrar aqui é o que a v109
   estabeleceu: só o que se demonstra SEM a tabela de calibração, porque
   aquela tabela não tem poder estatístico para nada (285 dias com horizonte
   de 30 = ~9,5 observações independentes no total).

   1. GDELT tom — lia `points[points.length-1]`, o bucket EM FORMAÇÃO da
      linha do tempo de 3 dias. É a v101 não aplicada ao tom: aquela build
      corrigiu o volume (`todos.slice(0,-1)`) e parou na lista da auditoria.

   2. takerRatio e longShort — janelas de 1h da Binance num sistema que lê
      de 8 em 8 horas. Mesmo argumento do book imbalance, que virou sensor
      na v106: um instantâneo não é observação no relógio do instrumento.
      MEDIDO nesta sessão: takerRatio foi de −22,96 a +1,81 a −24,54 em
      leituras do mesmo dia.

   3. Prêmio Coinbase — comparava o ticker da Coinbase (agora) contra
      `S.market.price`, que vem do CoinGecko e tem carimbo de tempo próprio,
      desconhecido. Dois preços de fontes diferentes sem instante comum não
      medem prêmio; medem prêmio MAIS a defasagem entre as duas fontes.

   4. Euro — o dólar amplo (DTWEXBGS) já vota no Macro, e o euro é o maior
      componente dele. O mesmo movimento cambial votava duas vezes, em dois
      motores. Isso é composição do índice, não estatística: verificável sem
      calibração nenhuma.

   Uso:  node harness-v111.js index.html
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
  let i = HTML.indexOf("async function " + nome + "(");
  if(i === -1) i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const ctx = { S: null };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    declDe("ind"), declDe("defaultState"), declDe("indicadoresVotantes"),
    declDe("forcarSensores"), declDe("tomDoUltimoFechado"),
    "return { defaultState, indicadoresVotantes, forcarSensores, tomDoUltimoFechado };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function estoura(fn,m){ let d=false; try{ fn(); }catch(e){ d=true; } if(!d) throw new Error(m||"deveria falhar"); }

console.log("\nBLOCO A — GDELT: o bucket em formação para de decidir o tom");

t("o tom usa o último bucket FECHADO, não o que ainda está enchendo", ()=>{
  const pts = [{value:-1}, {value:-2}, {value:-3}, {value:-99}]; // o último é o parcial
  eq(API.tomDoUltimoFechado(pts), -3, "tom usado:");
});

t("com um bucket só, não há fechado — falha em vez de usar o parcial", ()=>{
  estoura(()=> API.tomDoUltimoFechado([{value:-1}]), "usou o bucket em formação");
  estoura(()=> API.tomDoUltimoFechado([]), "aceitou lista vazia");
  estoura(()=> API.tomDoUltimoFechado(null), "aceitou nulo");
});

t("aceita os nomes alternativos de campo do GDELT", ()=>{
  eq(API.tomDoUltimoFechado([{Value:-4}, {Value:-5}, {Value:-9}]), -5, "campo Value:");
});

t("valor não numérico é recusado, não vira zero", ()=>{
  estoura(()=> API.tomDoUltimoFechado([{value:"abc"}, {value:"xyz"}, {value:1}]), "texto virou tom");
});

t("fetchGdeltTone passa pela função e não lê mais o último ponto cru", ()=>{
  const f = semComentarios(declDe("fetchGdeltTone"));
  if(/points\[points\.length - 1\]/.test(f))
    throw new Error("continua lendo o bucket em formação");
  if(!/tomDoUltimoFechado\(points\)/.test(f))
    throw new Error("não usa a função que descarta o parcial");
});

console.log("\nBLOCO B — microestrutura de 1h deixa de votar");

t("takerRatio e longShort nascem SENSORES", ()=>{
  const S = API.defaultState();
  eq(S.motors.derivativos.indicators.takerRatio.excludeFromScore, true, "takerRatio:");
  eq(S.motors.derivativos.indicators.longShort.excludeFromScore, true, "longShort:");
});

t("Derivativos fica com os três que sobram, e o motor não foi compensado", ()=>{
  ctx.S = API.defaultState();
  const v = API.indicadoresVotantes("derivativos");
  ["takerRatio","longShort"].forEach(function(k){
    if(v.indexOf(k) !== -1) throw new Error(k + " continua votando");
  });
  ["funding","openInterest","putCall"].forEach(function(k){
    if(v.indexOf(k) === -1) throw new Error("a demoção derrubou junto: " + k);
  });
  eq(ctx.S.motors.derivativos.weight, 0.15, "peso nominal de Derivativos:");
});

t("os dois continuam sendo COLETADOS — sensor não é indicador apagado", ()=>{
  const limpo = semComentarios(HTML);
  ["takerRatio","longShort"].forEach(function(k){
    if(!new RegExp('setAuto\\("derivativos","' + k + '"').test(limpo))
      throw new Error("a coleta de " + k + " sumiu: sem série, nunca saberemos se informava");
  });
});

t("a tela diz que não pontuam, e por quê", ()=>{
  const limpo = semComentarios(HTML);
  ["takerRatio","longShort"].forEach(function(k){
    const i = limpo.indexOf(k + ": ind(");
    if(i === -1) throw new Error("não achei a declaração de " + k);
    if(!/sensor, não pontua/.test(limpo.slice(i, i + 220)))
      throw new Error(k + " não avisa na tela que saiu do score");
  });
  if(!/janela de 1h/.test(limpo))
    throw new Error("a tela não nomeia o defeito (janela de 1h num relógio de 8h)");
});

console.log("\nBLOCO C — prêmio Coinbase: dois preços, um instante");

t("o prêmio compara Coinbase contra BINANCE, não contra o preço do CoinGecko", ()=>{
  const f = semComentarios(declDe("fetchCoinbasePremium"));
  if(/S\.market\.price/.test(f))
    throw new Error("continua usando o preço de referência do CoinGecko, de instante desconhecido");
  if(!/api\.binance\.com/.test(f))
    throw new Error("não busca o par da Binance para comparar");
});

t("os dois preços são pedidos JUNTOS, não um agora e outro de antes", ()=>{
  const f = semComentarios(declDe("fetchCoinbasePremium"));
  if(!/Promise\.all/.test(f))
    throw new Error("as duas pontas não são buscadas no mesmo instante");
});

t("preço ausente ou zero em qualquer ponta é falha, não prêmio de 100%", ()=>{
  const f = semComentarios(declDe("fetchCoinbasePremium"));
  if(!/!cbPrice \|\| !bnPrice/.test(f))
    throw new Error("uma das pontas pode entrar zerada e produzir prêmio absurdo");
});

console.log("\nBLOCO D — o euro para de votar duas vezes");

t("euro nasce SENSOR — o dólar amplo já vota no Macro", ()=>{
  const S = API.defaultState();
  eq(S.motors.ativosGlobais.indicators.euro.excludeFromScore, true, "euro:");
  eq(S.motors.macro.indicators.dxy.excludeFromScore, false, "o dxy CONTINUA votando:");
});

t("Ativos Globais fica com cinco votantes", ()=>{
  ctx.S = API.defaultState();
  const v = API.indicadoresVotantes("ativosGlobais");
  if(v.indexOf("euro") !== -1) throw new Error("o euro continua votando");
  if(v.indexOf("ouro") !== -1) throw new Error("o ouro voltou a votar");
  eq(v.length, 5, "votantes:");
});

t("a tela explica que é dupla contagem, não desprezo pelo euro", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("euro:    ind(");
  if(i === -1) throw new Error("não achei a declaração do euro");
  const trecho = limpo.slice(i, i + 260);
  if(!/sensor, não pontua/.test(trecho)) throw new Error("não avisa que saiu do score");
  if(!/DTWEXBGS|dólar amplo/.test(limpo.slice(i - 500, i + 260)))
    throw new Error("não diz que o motivo é o dólar amplo já votar");
});

console.log("\nBLOCO E — o estado salvo não ressuscita nenhum dos três");

t("forcarSensores impõe os três, mesmo com `false` gravado", ()=>{
  /* a v106 mostrou que trocar o padrão não basta: `loadState` funde o salvo
     por cima. Sem isto, as três demoções não teriam efeito no iPad. */
  const salvo = API.defaultState();
  salvo.motors.derivativos.indicators.takerRatio.excludeFromScore = false;
  salvo.motors.derivativos.indicators.longShort.excludeFromScore = false;
  salvo.motors.ativosGlobais.indicators.euro.excludeFromScore = false;
  API.forcarSensores(salvo);
  eq(salvo.motors.derivativos.indicators.takerRatio.excludeFromScore, true, "takerRatio:");
  eq(salvo.motors.derivativos.indicators.longShort.excludeFromScore, true, "longShort:");
  eq(salvo.motors.ativosGlobais.indicators.euro.excludeFromScore, true, "euro:");
});

console.log("\nBLOCO F — a mudança está declarada");

t("MODEL_VERSION foi para m11", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(!m) throw new Error("MODEL_VERSION fora do formato mN-data");
  if(Number(m[1]) < 11)
    throw new Error("continua m" + m[1] + ": quatro mudanças de valor sem bump");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.110-/.test(m[1])) throw new Error("continua a v110: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v111 verde — os quatro defeitos de construção saíram.");

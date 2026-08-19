/* =====================================================================
   harness-v124.js — CVD: quem está executando a mercado, acumulado
   =====================================================================
   MODEL_VERSION continua m12. O CVD nasce SENSOR: não vota no score.

   O QUE É. O `takerRatio` mede a razão comprador/vendedor agressor de UMA
   janela de 1h — foi rebaixado na v111 por isso. O CVD (cumulative volume
   delta) é o mesmo dado ACUMULADO: quanto dinheiro entrou comprando a
   mercado menos quanto saiu vendendo a mercado, somado ao longo da janela.
   Uma razão instantânea diz "agora está comprador"; o acumulado diz "nas
   últimas 24h entraram X milhões líquidos".

   RECONSTRUÍVEL. Cada vela da Binance traz o volume comprador agressor
   separado do total, então o CVD existe para trás e não depende de o app
   estar aberto. Foi por isso que ele entra e as LIQUIDAÇÕES não: a Binance
   só publica liquidação por WebSocket ao vivo, e um app aberto três vezes
   ao dia capturaria segundos de fluxo e perderia o resto — um número pior
   que nenhum, porque pareceria uma medida.

   NORMALIZAÇÃO. O valor bruto está em dólares e não é comparável entre
   janelas nem entre regimes de volume. O que entra na tela é a PROPORÇÃO:
   delta líquido ÷ volume total da janela, em [-100, +100]. +30 significa
   "30% do volume da janela foi compra líquida a mercado".

   EXPECTATIVA, declarada antes: em 18/08 medimos que a agressão horária não
   antecede o retorno da hora seguinte — r ≈ 0,027 em 8.998 observações,
   descartado. O CVD é da mesma família. Ele entra para DESCREVER a camada
   AGORA ("essa alta veio com compra a mercado ou não"), não porque se
   espere previsão.

   Uso:  node harness-v124.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v123 ou anterior?)");
  return bloco(i);
}
function cstArr(n){
  const i = HTML.indexOf("const " + n + " ="); if(i === -1) throw new Error("sem " + n);
  const ch = HTML.indexOf("{", i), co = HTML.indexOf("[", i);
  const arr = co !== -1 && (ch === -1 || co < ch);
  const ab = arr ? "[" : "{", fe = arr ? "]" : "}";
  const a = arr ? co : ch;
  let d=0,s=null,e=false;
  for(let k=a;k<HTML.length;k++){ const c=HTML[k];
    if(e){e=false;continue;} if(c==="\\"){e=true;continue;}
    if(s){ if(c===s) s=null; continue; }
    if(c==='"'||c==="'"||c==="`"){ s=c; continue; }
    if(c===ab) d++; else if(c===fe){ d--; if(!d) return HTML.slice(i,k+1)+";"; } }
  return HTML.slice(i, HTML.indexOf(";", i)+1);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const ctx = { S:null };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    cstArr("CAMADAS"),
    declDe("ind"), declDe("defaultState"), declDe("indicadoresVotantes"),
    declDe("cvdDeVelas"),
    "return { defaultState, indicadoresVotantes, cvdDeVelas, CAMADAS };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function perto(a,b,m,tol){ if(Math.abs(a-b) > (tol===undefined?0.05:tol))
  throw new Error((m||"")+" esperado ~"+b+", veio "+a); }

/* vela da Binance: [0]abertura … [7]volume em USD … [10]parte comprada a mercado */
function vela(quoteVol, takerBuyQuote){
  return [0,"0","0","0","0","0",0, String(quoteVol), 0, "0", String(takerBuyQuote)];
}

console.log("\nBLOCO A — a aritmética do CVD");

t("tudo comprador dá +100; tudo vendedor dá −100", ()=>{
  perto(API.cvdDeVelas([vela(1000, 1000)]).proporcao, 100, "100% comprador:");
  perto(API.cvdDeVelas([vela(1000, 0)]).proporcao, -100, "100% vendedor:");
});

t("metade e metade dá zero", ()=>{
  perto(API.cvdDeVelas([vela(1000, 500)]).proporcao, 0, "equilibrado:");
});

t("O ACUMULADO É SOMA, não média de proporções", ()=>{
  /* uma vela grande equilibrada e uma pequena muito compradora NÃO dão +50.
     Média de proporções ignoraria o tamanho — e o ponto do CVD é o tamanho. */
  const r = API.cvdDeVelas([vela(1000000, 500000), vela(1000, 1000)]);
  const esperado = ((2*501000 - 1001000) / 1001000) * 100;   // ≈ 0,1%
  perto(r.proporcao, esperado, "acumulado ponderado por volume:", 0.01);
  if(r.proporcao > 5) throw new Error("virou média de proporções: " + r.proporcao);
});

t("o valor bruto em dólares vem junto", ()=>{
  const r = API.cvdDeVelas([vela(1000, 750)]);
  perto(r.liquido, 500, "delta líquido em USD:");   // 750 comprados − 250 vendidos
  perto(r.volume, 1000, "volume total:");
});

t("volume zero não vira divisão por zero", ()=>{
  const r = API.cvdDeVelas([vela(0, 0)]);
  eq(r.proporcao, null, "proporção:");
  eq(r.liquido, 0, "líquido:");
});

t("lista vazia ou inválida devolve nulo, não zero", ()=>{
  /* zero significaria "equilibrado", que é uma afirmação. Ausência não é. */
  eq(API.cvdDeVelas([]).proporcao, null, "vazia:");
  eq(API.cvdDeVelas(null).proporcao, null, "nula:");
});

t("vela malformada é ignorada, não contamina a soma", ()=>{
  const r = API.cvdDeVelas([vela(1000, 1000), [0,"0","0","0","0","0",0,"abc",0,"0","xyz"]]);
  perto(r.proporcao, 100, "só a vela boa conta:");
});

console.log("\nBLOCO B — o CVD nasce SENSOR e não muda o score");

t("cvd24h existe e NÃO vota", ()=>{
  const S = API.defaultState();
  const ind = S.motors.derivativos.indicators.cvd24h;
  if(!ind) throw new Error("o indicador não existe");
  eq(ind.excludeFromScore, true, "excludeFromScore:");
});

t("os votantes de Derivativos continuam os mesmos", ()=>{
  ctx.S = API.defaultState();
  const v = API.indicadoresVotantes("derivativos");
  if(v.indexOf("cvd24h") !== -1) throw new Error("o CVD entrou no voto");
  ["funding","openInterest","putCall"].forEach(function(k){
    if(v.indexOf(k) === -1) throw new Error("sumiu do voto: " + k);
  });
  eq(v.length, 4, "votantes declarados de Derivativos:");
});

t("a tela diz que é sensor e por quê", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.search(/cvd24h:\s*ind\(/);
  if(i === -1) throw new Error("não achei a declaração");
  const trecho = limpo.slice(i, i + 300);
  if(!/sensor, não pontua/.test(trecho)) throw new Error("não avisa que não pontua");
});

console.log("\nBLOCO C — o CVD entra na camada AGORA");

t("o AGORA passa a ter oito indicadores", ()=>{
  const agora = API.CAMADAS.filter(function(c){ return c.id === "agora"; })[0];
  eq(agora.indicadores.length, 8, "indicadores do AGORA:");
  if(agora.indicadores.indexOf("derivativos.cvd24h") === -1)
    throw new Error("o CVD não entrou na camada AGORA");
});

t("e continua em UMA camada só", ()=>{
  const vistos = {}, rep = [];
  API.CAMADAS.forEach(function(c){ c.indicadores.forEach(function(id){
    if(vistos[id]) rep.push(id); vistos[id] = 1; }); });
  if(rep.length) throw new Error("em duas camadas: " + rep.join(", "));
});

console.log("\nBLOCO D — liquidações ficaram DE FORA, e o motivo está escrito");

t("não há ouvinte de liquidação ligado", ()=>{
  /* a Binance só publica liquidação por WebSocket ao vivo. Um app aberto três
     vezes ao dia capturaria segundos de fluxo — um número pior que nenhum,
     porque pareceria uma medida. */
  const limpo = semComentarios(HTML);
  if(/forceOrder/.test(limpo))
    throw new Error("apareceu ouvinte de liquidação: ele mediria segundos por dia");
});

t("o motivo da ausência está declarado no código", ()=>{
  const bruto = HTML;
  if(!/liquida[çc]/i.test(bruto))
    throw new Error("nada explica por que liquidações não entraram");
});

console.log("\nBLOCO E — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("os pesos e os seis sensores anteriores estão intactos", ()=>{
  const S = API.defaultState();
  eq(S.motors.macro.weight, 0.15, "macro:");
  eq(S.motors.ativosGlobais.weight, 0.21, "ativosGlobais:");
  [["derivativos","longShort"],["derivativos","takerRatio"],["tecnico","bookImbalance"],
   ["tecnico","momentum"],["ativosGlobais","ouro"],["ativosGlobais","euro"]].forEach(function(p){
    eq(S.motors[p[0]].indicators[p[1]].excludeFromScore, true, p.join(".") + ":");
  });
});

t("a coleta do CVD não derruba a rodada se falhar", ()=>{
  const f = semComentarios(declDe("coletarCVD"));
  if(!/catch/.test(f)) throw new Error("sem catch: a Binance fora do ar quebraria a coleta");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.123/.test(m[1])) throw new Error("continua a v123: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v124 verde — CVD medindo execução acumulada, sem votar.");

/* =====================================================================
   harness-v119.js — a calibração para de afirmar que sensor vota
   =====================================================================
   Build de apresentação: MODEL_VERSION continua m12, nenhuma fórmula muda.

   O DEFEITO: a tabela "Calibração por INDICADOR" lista `ativosGlobais.euro`
   e `tecnico.momentum` sem marca nenhuma — e os dois são SENSORES, que não
   votam no score. Pior: o texto acima da tabela diz "a linha marcada com ⚗
   é variável de laboratório: não vota no score". Por contraste, o leitor
   conclui que as linhas SEM marca votam. O painel afirmava algo falso.

   Não foi o m12 que criou isto: o euro já era sensor desde a v111 e a
   auditoria da v112 não pegou, porque olhou o pódio e as tabelas por motor,
   não a lista por indicador.

   A distinção que a tela passa a fazer:
     ⚗ laboratório — NUNCA votou, existe só para comparação
     ◉ sensor      — votava e foi REBAIXADO, continua sendo coletado
     (sem marca)   — vota no score

   Os outros quatro sensores (ouro, bookImbalance, longShort, takerRatio)
   não aparecem na tabela porque não têm fonte histórica reconstruível —
   isso é correto, e agora está declarado em vez de silencioso.

   Uso:  node harness-v119.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v118 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const ctx = { S:null };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    declDe("ind"), declDe("defaultState"), declDe("marcaDoIndicadorCalib"),
    "return { defaultState, marcaDoIndicadorCalib };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — a marca sai do estado, não de uma lista escrita à mão");

t("os dois sensores que aparecem na tabela são marcados", ()=>{
  ctx.S = API.defaultState();
  eq(API.marcaDoIndicadorCalib("ativosGlobais.euro"), "◉", "euro:");
  eq(API.marcaDoIndicadorCalib("tecnico.momentum"), "◉", "momentum:");
});

t("quem vota continua sem marca", ()=>{
  ctx.S = API.defaultState();
  ["ativosGlobais.sp500","tecnico.rsi","macro.dxy","onchain.mvrv",
   "derivativos.funding","geopolitico.epu"].forEach(function(id){
    eq(API.marcaDoIndicadorCalib(id), "", id + ":");
  });
});

t("a linha de laboratório continua com ⚗ e não vira sensor", ()=>{
  ctx.S = API.defaultState();
  ["funding_percentil ⚗","activeAddresses_suave ⚗","hashrate_suave ⚗"].forEach(function(id){
    eq(API.marcaDoIndicadorCalib(id), "⚗", id + ":");
  });
});

t("id desconhecido não vira marca por acidente", ()=>{
  ctx.S = API.defaultState();
  eq(API.marcaDoIndicadorCalib("motorInexistente.xpto"), "", "id órfão:");
  eq(API.marcaDoIndicadorCalib("semponto"), "", "id sem ponto:");
  eq(API.marcaDoIndicadorCalib(null), "", "nulo:");
});

t("SE UM SENSOR FOR PROMOVIDO UM DIA, a marca some sozinha", ()=>{
  /* a marca lê excludeFromScore do estado. Uma lista escrita à mão ficaria
     desatualizada em silêncio — que é exatamente o defeito que esta build
     conserta, em outra forma. */
  ctx.S = API.defaultState();
  ctx.S.motors.ativosGlobais.indicators.euro.excludeFromScore = false;
  eq(API.marcaDoIndicadorCalib("ativosGlobais.euro"), "", "euro promovido:");
});

t("e se um votante for rebaixado, ganha a marca sozinho", ()=>{
  ctx.S = API.defaultState();
  ctx.S.motors.ativosGlobais.indicators.sp500.excludeFromScore = true;
  eq(API.marcaDoIndicadorCalib("ativosGlobais.sp500"), "◉", "sp500 rebaixado:");
});

console.log("\nBLOCO B — a tabela usa a marca, e a legenda explica as três");

t("a linha da tabela passa pela função", ()=>{
  const limpo = semComentarios(HTML);
  if(!/marcaDoIndicadorCalib\(id\)/.test(limpo))
    throw new Error("a tabela não chama a função ao montar a linha");
});

t("a legenda distingue laboratório de sensor", ()=>{
  const limpo = semComentarios(HTML);
  /* a âncora estava em CAIXA ALTA; no HTML o texto está em caixa baixa e quem
     maiúscula é o CSS (text-transform). Terceira âncora errada minha na sessão:
     o teste acusava defeito onde não havia. */
  const i = limpo.indexOf("Calibração por INDICADOR");
  if(i === -1) throw new Error("não achei o painel");
  const trecho = limpo.slice(i, i + 3000);
  if(!/◉/.test(trecho)) throw new Error("a legenda não menciona a marca de sensor");
  if(!/rebaixad/i.test(trecho))
    throw new Error("a legenda não explica que sensor é indicador REBAIXADO");
  if(!/nunca votou|não vota no score/i.test(trecho))
    throw new Error("a legenda não explica o laboratório");
});

t("a tela declara os quatro sensores que NÃO aparecem na tabela", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("Calibração por INDICADOR");
  if(i === -1) throw new Error("não achei o painel");
  const trecho = limpo.slice(i, i + 3200);
  ["ouro","book","long/short","taker"].forEach(function(nome){
    if(trecho.toLowerCase().indexOf(nome.toLowerCase()) === -1)
      throw new Error("não declara a ausência de " + nome);
  });
});

console.log("\nBLOCO C — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 12) throw new Error("modelo regrediu para m" + m[1]);
  if(Number(m[1]) > 12)
    throw new Error("m" + m[1] + ": build de apresentação não bumpa e não zera contagem");
});

t("os seis sensores continuam sensores", ()=>{
  const S = API.defaultState();
  [["derivativos","longShort"],["derivativos","takerRatio"],["tecnico","bookImbalance"],
   ["tecnico","momentum"],["ativosGlobais","ouro"],["ativosGlobais","euro"]].forEach(function(p){
    eq(S.motors[p[0]].indicators[p[1]].excludeFromScore, true, p.join(".") + ":");
  });
});

t("os pesos do m12 estão intactos", ()=>{
  const S = API.defaultState();
  eq(S.motors.macro.weight, 0.15, "macro:");
  eq(S.motors.ativosGlobais.weight, 0.21, "ativosGlobais:");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.118-/.test(m[1])) throw new Error("continua a v118: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v119 verde — a calibração para de afirmar que sensor vota.");

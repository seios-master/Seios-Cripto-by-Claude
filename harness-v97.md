/* =====================================================================
   harness-v97.js — o backtest roda o modelo do vivo, não o m1
   =====================================================================
   Uso:  node harness-v97.js index.html
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
function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v96 ou anterior?)");
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome);
  const abre = HTML.indexOf("{", i), pv = HTML.indexOf(";", i);
  if(abre === -1 || abre > pv) return HTML.slice(i, pv + 1);
  return bloco(i) + ";";
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}

const ctx = { S: null, FAM: {} };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    constDe("RENORM_MAX"), constDe("FAMILIA_TETO"), constDe("TETO_POSITIVO"),
    "function familiaDoIndicador(mk, ik){ return ctx.FAM[mk+'.'+ik] || 'sem_familia'; }",
    fonteDe("indicadoresVotantes"), fonteDe("aplicarTetoPuro"),
    fonteDe("agregarCanonico"), fonteDe("vetorCanonicoHistorico"),
    "return { vetorCanonicoHistorico, agregarCanonico };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

/* estado de teste: dois motores de 50%, dois indicadores cada */
function estado(){
  const ind = () => ({ excludeFromScore:false });
  return { motors: {
    a: { label:"A", weight:0.5, indicators:{ um: ind(), dois: ind() } },
    b: { label:"B", weight:0.5, indicators:{ um: ind(), dois: ind() } }
  }};
}

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function perto(a,b,m){ if(Math.abs(a-b)>1e-9) throw new Error((m||"")+" "+a+" ≠ "+b); }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

console.log("\nBLOCO A — a ausência histórica fica no denominador (v97)");

t("cobertura cheia: o score é a média ponderada, sem amortecimento", ()=>{
  ctx.S = estado();
  const v = API.vetorCanonicoHistorico({ "a.um":40, "a.dois":40, "b.um":-20, "b.dois":-20 });
  const ag = API.agregarCanonico(v);
  perto(ag.massaObservada, 1, "massa observada:");
  perto(ag.score, 10, "score:");
  perto(ag.amortecimento, 1, "amortecimento:");
});

t("METADE dos indicadores ausentes AMORTECE — o m1 não fazia isso", ()=>{
  ctx.S = estado();
  const v = API.vetorCanonicoHistorico({ "a.um":40, "b.um":-20 });
  const ag = API.agregarCanonico(v);
  perto(ag.massaObservada, 0.5, "massa observada:");
  const m1 = 10;
  perto(ag.mediaObservada, 10, "a média do que existe continua 10:");
  if(!(Math.abs(ag.score) < Math.abs(m1)))
    throw new Error("score " + ag.score + " não amorteceu: continua sendo o m1");
  perto(ag.score, 10 * (0.5 / (1/1.25)), "score amortecido pelo piso:");
});

t("um motor inteiro ausente não redistribui peso para o outro", ()=>{
  ctx.S = estado();
  const v = API.vetorCanonicoHistorico({ "a.um":50, "a.dois":50 });
  const ag = API.agregarCanonico(v);
  if(Math.abs(ag.score - 50) < 1)
    throw new Error("score " + ag.score + " ≈ 50: o motor ausente foi redistribuído (m1)");
  perto(ag.massaObservada, 0.5, "massa observada:");
  perto(ag.score, 50 * (0.5/0.8), "score:");
});

t("nada presente: score zero, sem divisão por zero", ()=>{
  ctx.S = estado();
  const ag = API.agregarCanonico(API.vetorCanonicoHistorico({}));
  eq(ag.score, 0, "score:"); eq(ag.nItens, 0, "itens:");
});

t("valor não numérico não vira item", ()=>{
  ctx.S = estado();
  const v = API.vetorCanonicoHistorico({ "a.um":40, "a.dois":NaN, "b.um":null, "b.dois":undefined });
  eq(v.itens.length, 1, "itens:");
  eq(v.nominais.length, 4, "nominais:");
});

t("indicador que não vota no vivo não vota no histórico", ()=>{
  ctx.S = estado();
  ctx.S.motors.a.indicators.dois.excludeFromScore = true;   // sensor
  const v = API.vetorCanonicoHistorico({ "a.um":40, "a.dois":100, "b.um":0, "b.dois":0 });
  if(v.itens.some(function(i){ return i.indicador === "dois" && i.motor === "a"; }))
    throw new Error("o sensor entrou no vetor");
  perto(v.nominais.filter(function(n){ return n.motor === "a"; })[0].peso, 0.5, "peso do único votante de A:");
});

t("o peso do indicador é FIXO: não cresce quando o vizinho falta", ()=>{
  ctx.S = estado();
  const cheio = API.vetorCanonicoHistorico({ "a.um":10, "a.dois":10, "b.um":10, "b.dois":10 });
  const meio  = API.vetorCanonicoHistorico({ "a.um":10, "b.um":10 });
  const pA = function(v){ return v.itens.filter(function(i){ return i.id === "a.um"; })[0].peso; };
  perto(pA(cheio), pA(meio), "peso de a.um mudou com a ausência do vizinho:");
});

console.log("\nBLOCO B — o segundo agregador não existe mais");

t("aggregateScore foi REMOVIDA, não só desligada", ()=>{
  const limpo = semComentarios(HTML);
  if(/function aggregateScore\s*\(/.test(limpo))
    throw new Error("a função continua no arquivo, esperando um chamador");
});

t("scoreWithoutMotor também", ()=>{
  const limpo = semComentarios(HTML);
  if(/function scoreWithoutMotor\s*\(/.test(limpo)) throw new Error("continua no arquivo");
});

t("o backtest chama o agregador canônico", ()=>{
  const limpo = semComentarios(HTML);
  if(!/agregarCanonico\(vetorCanonicoHistorico\(valoresDia\)\)/.test(limpo))
    throw new Error("o backtest não passa pelo agregador do vivo");
});

t("completeness deixa de ser peso de motor presente", ()=>{
  const limpo = semComentarios(HTML);
  if(/completeness = weightUsed/.test(limpo)) throw new Error("ainda mede presença de motor");
  if(!/massaObservada \/ agHist\.massaTotal/.test(limpo))
    throw new Error("completeness não vem da massa");
});

t("o mapa do dia é zerado a cada dia", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("for(let i=50; i<closes.length-forwardDays; i++)");
  const trecho = limpo.slice(i, i + 300);
  if(!/valoresDia = \{\}/.test(trecho))
    throw new Error("o dia herda os valores do dia anterior — dado velho pontuando no passado");
});

t("a variável de laboratório não entra no vetor que decide", ()=>{
  const limpo = semComentarios(HTML);
  if(!/id\.indexOf\("⚗"\) === -1/.test(limpo))
    throw new Error("o funding_percentil pode estar votando no backtest");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v97 verde — um agregador, vivo e histórico.");

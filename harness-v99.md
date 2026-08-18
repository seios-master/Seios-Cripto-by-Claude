/* =====================================================================
   harness-v99.js — o relógio do vintage é o do FRED, não o do usuário
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v98 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([fonteDe("dataFredHoje"), fonteDe("fredRealtime"),
    "return { dataFredHoje, fredRealtime };"].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

function em(iso, fn){
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try { return fn(); } finally { Date.now = real; }
}

console.log("\nBLOCO A — o instante exato que quebrou (v99)");

t("21:07 em Brasília (00:07 UTC do dia seguinte) NÃO pede uma data futura", ()=>{
  const d = em("2026-08-16T00:07:00Z", ()=> API.dataFredHoje());
  eq(d, "2026-08-15", "data enviada ao FRED:");
  const antiga = em("2026-08-16T00:07:00Z", ()=> new Date(Date.now()).toISOString().slice(0,10));
  eq(antiga, "2026-08-16", "o que a v98.1 mandava:");
});

t("19:49 em Brasília continua igual — o bug tinha horário de expediente", ()=>{
  eq(em("2026-08-15T22:49:00Z", ()=> API.dataFredHoje()), "2026-08-15");
});

t("meio-dia em qualquer fuso devolve o dia corrente", ()=>{
  eq(em("2026-08-15T18:00:00Z", ()=> API.dataFredHoje()), "2026-08-15");
  eq(em("2026-08-15T12:00:00Z", ()=> API.dataFredHoje()), "2026-08-15");
});

t("nunca fica À FRENTE do relógio do FRED, em nenhuma hora do dia", ()=>{
  for(let h = 0; h < 24; h++){
    const iso = "2026-08-16T" + String(h).padStart(2,"0") + ":30:00Z";
    const nosso = em(iso, ()=> API.dataFredHoje());
    const central = new Date(new Date(iso).getTime() - 5*3600e3).toISOString().slice(0,10);
    if(nosso > central) throw new Error(iso + ": pedimos " + nosso + ", o FRED está em " + central);
  }
});

t("no máximo um dia atrás — não vira janela cega", ()=>{
  for(let h = 0; h < 24; h++){
    const iso = "2026-08-16T" + String(h).padStart(2,"0") + ":30:00Z";
    const nosso = new Date(em(iso, ()=> API.dataFredHoje()) + "T00:00:00Z").getTime();
    const central = new Date(new Date(iso).getTime() - 5*3600e3).toISOString().slice(0,10);
    const alvo = new Date(central + "T00:00:00Z").getTime();
    const dif = (alvo - nosso) / 86400000;
    if(dif > 1) throw new Error(iso + ": " + dif + " dias atrás do FRED");
  }
});

console.log("\nBLOCO B — a janela de vintage usa essa data, e só ela");

t("fredRealtime devolve início pedido e fim no relógio do FRED", ()=>{
  const r = em("2026-08-16T00:07:00Z", ()=> API.fredRealtime("2025-08-01"));
  eq(r.realtime_start, "2025-08-01", "início:");
  eq(r.realtime_end, "2026-08-15", "fim:");
});

t("nenhum outro ponto do código monta realtime_end por conta própria", ()=>{
  const limpo = semComentarios(HTML);
  const calculando = [...limpo.matchAll(/realtime_end:\s*([^,\n}]+)/g)]
    .map(m => m[1].trim())
    .filter(v => v !== "dataFredHoje()");
  if(calculando.length)
    throw new Error("realtime_end calculado fora da função: " + calculando.join(" | "));
  if(!/realtime_end:\s*dataFredHoje\(\)/.test(limpo))
    throw new Error("a janela não usa dataFredHoje()");
});

console.log("\nBLOCO C — diagnóstico não acumula entre rodadas (v99.1)");

t("a lista de séries sem vintage é zerada no início de cada backtest", ()=>{
  const f = semComentarios(fonteDe("fetchMacroHistoryMaps"));
  if(!/S\.market\.fredSemVintage = \[\]/.test(f))
    throw new Error("a lista sobrevive à rodada seguinte");
});

t("os três acumuladores do relatório zeram no MESMO lugar", ()=>{
  const f = semComentarios(fonteDe("fetchMacroHistoryMaps"));
  ["FRED_DIAG.ok = \\[\\]", "VINTAGE_USO.medido = 0", "S.market.fredSemVintage = \\[\\]"]
    .forEach(function(p){
      if(!new RegExp(p).test(f)) throw new Error("faltou zerar: " + p);
    });
});

t("a lista é gravada dentro do estado — por isso o reset importa", ()=>{
  const limpo = semComentarios(HTML);
  if(!/S\.market\.fredSemVintage\.push/.test(limpo))
    throw new Error("mudou de lugar; reconferir se ainda persiste no localStorage");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v99 verde — o vintage passa a depender do relógio certo.");

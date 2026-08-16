/* =====================================================================
   harness-v96.js — o percentil expandido não pode olhar para frente
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v95 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([fonteDe("percentilExpandido"), fonteDe("scoreDoPercentil"),
    "return { percentilExpandido, scoreDoPercentil };"].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,m){ if(Math.abs(a-b)>1e-9) throw new Error((m||"")+" "+a+" ≠ "+b); }
const cem = Array.from({length:100}, (_,i)=> i/100);

console.log("\nBLOCO A — o percentil é do passado, e só dele (v96)");

t("abaixo do mínimo de amostra devolve null em vez de um número frágil", ()=>{
  eq(API.percentilExpandido(0.5, cem.slice(0,59), 60), null, "59 dias:");
  if(API.percentilExpandido(0.5, cem.slice(0,60), 60) === null)
    throw new Error("60 dias deveria bastar");
});

t("a mediana da amostra dá rank 0,5 e score 0", ()=>{
  perto(API.percentilExpandido(0.50, cem, 60), 0.5, "rank:");
  perto(API.scoreDoPercentil(0.5), 0, "score:");
});

t("os extremos dão ±100, e a leitura é CONTRÁRIA como a escala absoluta", ()=>{
  perto(API.scoreDoPercentil(API.percentilExpandido(-1, cem, 60)), 100, "abaixo de tudo:");
  perto(API.scoreDoPercentil(API.percentilExpandido(99, cem, 60)), -100, "acima de tudo:");
});

t("valor futuro NÃO entra na própria distribuição", ()=>{
  const anteriores = [1,2,3,4].concat(Array(60).fill(2));
  const r1 = API.percentilExpandido(5, anteriores, 60);
  const r2 = API.percentilExpandido(5, anteriores.concat([5]), 60);
  if(r1 === r2) throw new Error("incluir o próprio valor não mudou nada; o teste não separa");
  if(!(r1 > r2)) throw new Error("incluir o próprio valor deveria REDUZIR o rank");
});

t("empates não inflam o rank: conta estritamente menores", ()=>{
  const iguais = Array(80).fill(0.5);
  perto(API.percentilExpandido(0.5, iguais, 60), 0, "todos iguais:");
});

t("entrada não numérica não vira score", ()=>{
  eq(API.percentilExpandido(NaN, cem, 60), null, "NaN:");
  eq(API.percentilExpandido(0.5, null, 60), null, "sem histórico:");
  eq(API.scoreDoPercentil(null), null, "score de null:");
});

console.log("\nBLOCO B — laboratório é laboratório: não vota, não pesa");

t("o percentil do funding entra na calibração, e só nela", ()=>{
  const limpo = semComentarios(HTML);
  if(!/registraIndicador\("funding_percentil ⚗", fundingPct, fwdInd\)/.test(limpo))
    throw new Error("não entra na tabela de calibração");
});

t("fundingPct aparece em exatamente três lugares", ()=>{
  const limpo = semComentarios(HTML);
  const n = (limpo.match(/fundingPct/g) || []).length;
  if(n !== 3) throw new Error("fundingPct aparece " + n + " vez(es), esperava 3");
});

t("a linha que define o composto de Derivativos não conhece o percentil", ()=>{
  const linha = semComentarios(HTML).split("\n")
    .find(l => /const derivativos = fr !== undefined/.test(l));
  if(!linha) throw new Error("não achei a linha do composto");
  if(/fundingPct|percentil/i.test(linha)) throw new Error("o laboratório vazou para o composto");
  if(!/norm\("derivativos\.funding", fr\)/.test(linha)) throw new Error("o composto não usa a porta canônica");
});

t("a distribuição acumulada é alimentada DEPOIS de calcular o percentil", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("fundingPct = scoreDoPercentil");
  const j = limpo.indexOf("fundingAnteriores.push(fr)");
  if(i === -1 || j === -1) throw new Error("não achei as duas linhas");
  if(!(i < j)) throw new Error("empurra o valor do dia antes de medir o dia — look-ahead de um dia");
});

/* v101 — idem v95: a asserção sobre `MODEL_VERSION` começar com "m5" era um
   fato datado, não uma invariante, e expirou no bump para m6. O que a v96
   precisa garantir é que o laboratório não vazou para a fórmula que vota. */
t("o percentil não mexeu na fórmula que vota", ()=>{
  const limpo = semComentarios(HTML);
  if(!/"derivativos\.funding":\s*rate\s*=>\s*clamp\(-rate \* 100000/.test(limpo))
    throw new Error("a fórmula que vota foi alterada");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v96 verde — régua nova no laboratório, régua velha no score.");

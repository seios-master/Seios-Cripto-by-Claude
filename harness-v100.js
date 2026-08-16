/* =====================================================================
   harness-v100.js — finito não é válido
   =====================================================================
   O teste que dói: contra a v99.1, MVRV zero pontuava +80 — o extremo
   bullish do motor On-chain, produzido por dado ausente.
   Uso:  node harness-v100.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v99 ou anterior?)");
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome);
  return bloco(i) + ";";
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([constDe("BRUTO_PLAUSIVEL"), fonteDe("brutoValido"), fonteDe("clamp"),
    "return { brutoValido, BRUTO_PLAUSIVEL, clamp };"].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function estoura(fn, msg){
  let deu = false;
  try{ fn(); }catch(e){ deu = true; }
  if(!deu) throw new Error(msg || "deveria ter levantado erro");
}

console.log("\nBLOCO A — o caso real das 23:04 (v100)");

t("MVRV zero LEVANTA erro em vez de virar +80", ()=>{
  estoura(()=> API.brutoValido("onchain.mvrv", 0), "MVRV 0 passou");
  // e o que a v99.1 fazia com ele:
  const scoreAntigo = API.clamp((2 - 0) * 40, -100, 100);
  if(scoreAntigo !== 80) throw new Error("a fórmula mudou; revisar este teste");
});

t("MVRV negativo e absurdo também", ()=>{
  estoura(()=> API.brutoValido("onchain.mvrv", -1), "negativo passou");
  estoura(()=> API.brutoValido("onchain.mvrv", 999), "absurdo passou");
});

t("MVRV de verdade passa sem ser tocado", ()=>{
  [0.6, 1.19, 2.0, 3.8].forEach(function(v){
    if(API.brutoValido("onchain.mvrv", v) !== v) throw new Error("alterou " + v);
  });
});

t("NUPL nunca mais recebe divisão por zero", ()=>{
  // 1 − 1/MVRV com o mínimo da faixa continua finito
  const nupl = 1 - 1/API.BRUTO_PLAUSIVEL["onchain.mvrv"].min;
  if(!Number.isFinite(nupl)) throw new Error("NUPL infinito no limite da faixa");
});

t("endereços ativos: zero é defeito, milhão é leitura", ()=>{
  estoura(()=> API.brutoValido("onchain.activeAddresses", 0), "zero passou");
  if(API.brutoValido("onchain.activeAddresses", 850000) !== 850000) throw new Error("leitura real recusada");
});

t("as razões de derivativos não aceitam zero", ()=>{
  ["derivativos.putCall","derivativos.longShort","derivativos.takerRatio"].forEach(function(id){
    estoura(()=> API.brutoValido(id, 0), id + " aceitou zero");
    if(API.brutoValido(id, 1.05) !== 1.05) throw new Error(id + " recusou leitura real");
  });
});

t("id sem faixa declarada só exige que seja número", ()=>{
  if(API.brutoValido("nao.declarado", 42) !== 42) throw new Error("recusou número sem faixa");
  estoura(()=> API.brutoValido("nao.declarado", NaN), "NaN passou");
  estoura(()=> API.brutoValido("nao.declarado", Infinity), "Infinity passou");
});

console.log("\nBLOCO B — o dia em formação não vira zero");

t("o parser do CoinMetrics converte zero em null, por métrica", ()=>{
  const f = semComentarios(fonteDe("fetchCoinMetricsOnchain"));
  if(!/n > 0\) \? n : null/.test(f)) throw new Error("zero continua virando número");
  if(/Number\.isFinite\(r\.mvrv\) \|\| Number\.isFinite\(r\.addr\)/.test(f))
    throw new Error("o filtro antigo continua aceitando zero");
});

t("cada métrica busca a última linha QUE TEM aquela métrica", ()=>{
  const limpo = semComentarios(HTML);
  if(!/const ultimoCom = function\(campo\)/.test(limpo))
    throw new Error("voltou a usar rows[length-1] para tudo");
  if(!/ultimoCom\("mvrv"\)/.test(limpo) || !/ultimoCom\("addr"\)/.test(limpo))
    throw new Error("alguma métrica não busca a própria linha");
});

t("o MVRV passa pelo contrato antes de virar score", ()=>{
  const limpo = semComentarios(HTML);
  if(!/brutoValido\("onchain\.mvrv", latest\.mvrv\)/.test(limpo))
    throw new Error("o MVRV entra no score sem validação");
});

t("dado implausível cai no MESMO caminho da fonte fora do ar", ()=>{
  /* brutoValido levanta erro; o catch do bloco chama setFailed nos três
     indicadores. Sem isso, o dado ruim viraria silêncio em vez de falha
     declarada — e silêncio não aparece em "FALHAS NESTA RODADA". */
  const limpo = semComentarios(HTML);
  // a chamada aparece na definição e no uso; o bloco que interessa é o do
  // laço de coleta, que é o ÚLTIMO — a definição vem antes no arquivo
  const i = limpo.lastIndexOf("await fetchCoinMetricsOnchain()");
  const trecho = limpo.slice(i, i + 3000);
  if(!/setFailed\("onchain","mvrv"/.test(trecho))
    throw new Error("o erro não marca a fonte como falha");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v100 verde — zero deixou de ser leitura.");

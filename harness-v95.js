/* =====================================================================
   harness-v95.js — o funding entra na tabela canônica
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");

function bloco(ini){
  const abre = HTML.indexOf("{", ini);
  let n = 0, str = null, esc = false;
  for(let i = abre; i < HTML.length; i++){
    const c = HTML[i];
    if(esc){ esc = false; continue; }
    if(c === "\\"){ esc = true; continue; }
    if(str){ if(c === str) str = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ str = c; continue; }
    if(c === "{") n++; else if(c === "}"){ n--; if(!n) return HTML.slice(ini, i+1); }
  }
  throw new Error("bloco não fecha");
}
function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome);
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
  return String(t).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

let API;
try{
  API = new Function([
    fonteDe("clamp"), fonteDe("escalaSuave"),
    constDe("NORMALIZACAO"), fonteDe("norm"), constDe("FUNDING_ESTICADO"),
    "return { norm, NORMALIZACAO, FUNDING_ESTICADO };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok = 0, bad = 0; const falhas = [];
function t(nome, fn){
  try{ fn(); ok++; console.log("  ✓ " + nome); }
  catch(e){ bad++; falhas.push(nome + ": " + e.message); console.log("  ✗ " + nome + "  — " + e.message); }
}
function perto(a,b,m){ if(Math.abs(a-b) > 1e-9) throw new Error((m||"") + " " + a + " ≠ " + b); }
function eq(a,b,m){ if(a !== b) throw new Error((m||"") + " esperado " + b + ", veio " + a); }

console.log("\nBLOCO A — o funding passa pela porta canônica (v95)");

t("existe fórmula canônica para derivativos.funding", ()=>{
  if(typeof API.NORMALIZACAO["derivativos.funding"] !== "function")
    throw new Error("o funding continua fora da tabela — é a v94 ou anterior");
});

t("os números NÃO mudaram: é a mesma conta, num lugar só", ()=>{
  [0.00001, 0.000015, 0.0001, 0.0005, -0.0003, 0.002, -0.005].forEach(r=>{
    perto(API.norm("derivativos.funding", r), Math.max(-100, Math.min(100, -r*100000)),
          "taxa " + r + ":");
  });
});

t("satura em ±100 e não passa disso", ()=>{
  eq(API.norm("derivativos.funding", 0.01), -100, "funding altíssimo:");
  eq(API.norm("derivativos.funding", -0.01), 100, "funding muito negativo:");
});

t("a leitura é contrária: funding positivo puxa o score pra baixo", ()=>{
  if(!(API.norm("derivativos.funding", 0.0005) < 0)) throw new Error("sinal invertido");
  if(!(API.norm("derivativos.funding", -0.0005) > 0)) throw new Error("sinal invertido");
});

t("nem o vivo nem o backtest escrevem a fórmula à mão", ()=>{
  const limpo = semComentarios(HTML)
    .replace(semComentarios(constDe("NORMALIZACAO")), " ")
    .replace(semComentarios(constDe("INDICATOR_SPECS")), " ");
  const sobrou = [...limpo.matchAll(/clamp\(\s*-\s*\w+\s*\*\s*100000/g)];
  if(sobrou.length) throw new Error(sobrou.length + " cópia(s) executável(is) da fórmula ainda no código");
  if(!/setAuto\("derivativos","funding", norm\("derivativos\.funding"/.test(limpo))
    throw new Error("o vivo não usa norm()");
  if(!/norm\("derivativos\.funding", fr\)/.test(limpo))
    throw new Error("o backtest não usa norm()");
});

console.log("\nBLOCO B — a distribuição é medida, não escolhida");

t("o relatório mede a distribuição a partir do histórico já baixado", ()=>{
  const limpo = semComentarios(HTML);
  if(!/Distribuição do funding/.test(limpo)) throw new Error("o bloco não existe");
  const i = limpo.indexOf("Distribuição do funding");
  const trecho = limpo.slice(i - 1800, i + 1800);
  if(!/Object\.keys\(fundingMap\)/.test(trecho))
    throw new Error("não lê o histórico real — de onde vem o número?");
  if(!/percentil/.test(trecho)) throw new Error("não posiciona o limiar na distribuição");
});

t("a distribuição NÃO altera nenhum score: é só leitura", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("Distribuição do funding");
  const trecho = limpo.slice(i - 1800, i + 2200);
  if(/setAuto\(|FUNDING_ESTICADO\s*=/.test(trecho))
    throw new Error("o bloco de medição está escrevendo estado");
});

t("o limiar provisório continua provisório", ()=>{
  eq(API.FUNDING_ESTICADO, 0.015, "FUNDING_ESTICADO:");
  perto(Math.abs(API.norm("derivativos.funding", API.FUNDING_ESTICADO/100)), 15, "cruzamento:");
});

/* v101 — este teste dizia `MODEL_VERSION começa com "m5"`. Isso não é uma
   invariante: é um fato sobre o instante em que a v95 nasceu, e ele expirou
   no primeiro bump legítimo (m6, v101). O que a v95 queria proteger é que ELA
   não mexeu na fórmula que vota. É isso que passa a ser afirmado. */
t("a v95 não mexeu na fórmula que vota — só no lugar onde ela mora", ()=>{
  const limpo = semComentarios(HTML);
  if(!/"derivativos\.funding":\s*rate\s*=>\s*clamp\(-rate \* 100000/.test(limpo))
    throw new Error("a fórmula canônica do funding foi alterada");
  [0.0001, -0.0003, 0.002].forEach(r=>{
    perto(API.norm("derivativos.funding", r), Math.max(-100, Math.min(100, -r*100000)),
          "taxa " + r + ":");
  });
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  " + f)); process.exit(1); }
console.log("v95 verde — a última fórmula solta entrou, e a escala virou medida.");

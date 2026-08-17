/* =====================================================================
   harness-v104.js — o normal não é zero
   =====================================================================
   Contra a v103 falha inteiro: `M2_LONGO` não existe lá, e a distribuição
   do M2 nunca foi medida. O que este banco prova não é que a régua mudou —
   ela NÃO mudou de propósito. Prova que a MEDIÇÃO existe, que ela não
   escreve estado, e que o defeito que ela mede é o que eu disse que era.

   Uso:  node harness-v104.js index.html
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
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome + " (é a v103 ou anterior?)");
  const abre = HTML.indexOf("{", i), pv = HTML.indexOf(";", i);
  if(abre === -1 || abre > pv) return HTML.slice(i, pv + 1);
  return bloco(i) + ";";
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    constDe("M2_LONGO"), declDe("clamp"), declDe("escalaSuave"),
    constDe("NORMALIZACAO"), declDe("norm"),
    "return { M2_LONGO, norm, escalaSuave };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,tol,m){ if(Math.abs(a-b)>(tol||0.05)) throw new Error((m||"")+" "+a+" ≠ "+b); }

console.log("\nBLOCO A — o defeito, medido pela própria fórmula do arquivo");

t("a régua da liquidez tem centro em ZERO", ()=>{
  eq(API.norm("macro.liquidez", 0), 0, "M2 parado:");
});

t("o M2 precisa ENCOLHER mais de 1% ao ano para marcar bearish", ()=>{
  /* o limiar exato é −1,008%. Um M2 encolhendo 1,0% ao ano AINDA é neutro
     para este sistema. (A primeira versão deste teste tinha a comparação
     invertida e acusou o código; o código estava certo.) */
  if(API.norm("macro.liquidez", -1.0) <= -15)
    throw new Error("−1,0% marcou bearish; o limiar mudou, revisar este teste");
  if(API.norm("macro.liquidez", -1.05) > -15)
    throw new Error("−1,05% não marcou bearish: a fórmula não é a que este teste descreve");
  // o corredor neutro é simétrico, e tem dois pontos de largura
  if(API.norm("macro.liquidez", 1.0) >= 15)
    throw new Error("o corredor neutro não é simétrico como se supõe");
  if(API.norm("macro.liquidez", 1.05) < 15)
    throw new Error("o outro lado do corredor não fecha onde deveria");
});

t("o crescimento NORMAL do M2 é lido como extremo bullish", ()=>{
  /* mediana histórica do M2 YoY fica perto de +6%. Se o normal pontua acima
     de 70, o indicador não está medindo desvio nenhum — está medindo que a
     economia existe. */
  const normal = API.norm("macro.liquidez", 6.3);
  if(!(normal > 70)) throw new Error("o normal deu " + normal + ", esperava >70");
  const hoje = API.norm("macro.liquidez", 5.5);
  perto(hoje, 67.76, 0.5, "leitura de hoje:");
});

t("recentrar na mediana move o número em dezenas de pontos", ()=>{
  /* não é proposta — é a ordem de grandeza do defeito */
  const comZero    = API.norm("macro.liquidez", 5.5);
  const comMediana = API.escalaSuave(5.5 - 6.3, 6.67);
  if(Math.abs(comZero - comMediana) < 50)
    throw new Error("a diferença é de só " + Math.abs(comZero-comMediana) + " pontos");
  if(!(Math.abs(comMediana) < 15))
    throw new Error("recentrado deveria cair na faixa neutra, deu " + comMediana);
});

t("os OUTROS quatro do Macro medem variação, e por isso zero é centro legítimo", ()=>{
  /* este teste existe para impedir a correção de vazar para quem não tem o
     defeito: juros, inflação e dxy são DELTAS; curva é nível, mas o zero
     dela é a inversão, um marco real. */
  ["macro.juros","macro.inflacao","macro.dxy","macro.curva"].forEach(function(id){
    eq(API.norm(id, 0), 0, id + " em repouso:");
  });
  // e nenhum deles vira extremo com o valor típico de repouso
  if(Math.abs(API.norm("macro.juros", 0)) >= 15) throw new Error("juros extremo em repouso");
  if(Math.abs(API.norm("macro.dxy", 0)) >= 15) throw new Error("dxy extremo em repouso");
});

console.log("\nBLOCO B — a medição existe, e é só medição");

t("M2_LONGO nasce vazio e declara o próprio erro", ()=>{
  eq(Array.isArray(API.M2_LONGO.yoy), true, "yoy é lista:");
  eq(API.M2_LONGO.yoy.length, 0, "nasce vazio:");
  eq(API.M2_LONGO.erro, null, "erro:");
});

t("a série longa é zerada a cada rodada — não acumula entre backtests", ()=>{
  /* a regra da v99.1: acumulador que não zera vira memória de erro corrigido */
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(!/M2_LONGO\.yoy = \[\]; M2_LONGO\.erro = null/.test(f))
    throw new Error("a série longa sobrevive à rodada seguinte");
});

t("a busca longa NÃO alimenta maps — não toca em score nenhum", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  const i = f.indexOf('fetchFredSeriesRange("M2SL", "1990-01-01")');
  if(i === -1) throw new Error("não busca a série longa");
  /* a janela tem que parar ANTES do bloco seguinte, que é o que alimenta
     `maps.liquidez` de verdade. 700 caracteres invadiam o vizinho e o teste
     acusava o código por um `maps.` que não era dele. */
  const fim = f.indexOf("fetchFredSeriesRange(\"M2SL\", startMonthly)", i);
  const trecho = f.slice(i, fim > i ? fim : i + 700);
  if(/maps\./.test(trecho))
    throw new Error("a leitura de 35 anos está escrevendo em maps — vira score");
  if(/setAuto|norm\(/.test(trecho))
    throw new Error("a leitura está pontuando");
});

t("a busca longa não derruba o backtest se falhar", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  const i = f.indexOf('fetchFredSeriesRange("M2SL", "1990-01-01")');
  const trecho = f.slice(i - 200, i + 900);
  if(!/catch\(e\)\{ M2_LONGO\.erro/.test(trecho))
    throw new Error("sem catch próprio: 35 anos de M2 fora do ar matariam a calibração inteira");
});

t("o backtest continua usando a janela CURTA para pontuar", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(!/fetchFredSeriesRange\("M2SL", startMonthly\)/.test(f))
    throw new Error("a janela do score mudou junto — isto mudaria o histórico em silêncio");
});

console.log("\nBLOCO C — o que a tela diz, e o que ela se recusa a dizer");

t("a tabela exige amostra antes de aparecer", ()=>{
  const limpo = semComentarios(HTML);
  if(!/if\(!S2 \|\| S2\.length < 60\) return ""/.test(limpo))
    throw new Error("a distribuição apareceria com meia dúzia de meses");
});

t("a tela conta quantos meses marcariam cada lado", ()=>{
  const limpo = semComentarios(HTML);
  ["produziriam leitura BEARISH", "Distribuição do M2"].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("falta na tela: " + s);
  });
});

t("a tela declara que a ilustração NÃO é proposta", ()=>{
  const limpo = semComentarios(HTML);
  if(!/não proposta|não é proposta/.test(limpo))
    throw new Error("o número recentrado apareceria como recomendação");
  if(!/Nenhuma das três entra sem bump declarado/.test(limpo))
    throw new Error("não declara que trocar a régua exige bump");
});

t("as três alternativas ficam nomeadas, nenhuma escolhida", ()=>{
  const limpo = semComentarios(HTML);
  ["mediana", "percentil expandido", "z-score por regime"].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("alternativa não nomeada: " + s);
  });
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m6 — a série NÃO zera nesta build", ()=>{
  const m = /const MODEL_VERSION = "([^"]+)"/.exec(HTML);
  if(m[1] !== "m6-2026-08-16") throw new Error("modelo bumpado numa build de medição: " + m[1]);
});

t("a fórmula da liquidez continua exatamente a mesma", ()=>{
  const limpo = semComentarios(HTML);
  if(!/"macro\.liquidez":\s*yoy\s*=>\s*escalaSuave\(yoy, 6\.67\)/.test(limpo))
    throw new Error("a régua foi alterada numa build que se propôs a só medir");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.103-/.test(m[1])) throw new Error("continua a v103: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v104 verde — o defeito está medido, e a régua intacta.");

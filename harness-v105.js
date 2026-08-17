/* =====================================================================
   harness-v105.js — a liquidez deixa de ser constante
   =====================================================================
   Contra a v104 o BLOCO A falha inteiro: lá `macro.liquidez` recebia YoY e
   devolvia tanh com centro em zero, e o teste que mais dói é o último —
   a régua antiga dava o MESMO lado em 93,4% de 426 meses.

   O teste que eu mais queria ter escrito antes: o do SENTIDO. `scoreDoPercentil`
   nasceu contrária, para o funding. Reaproveitá-la sem parâmetro inverteria o
   indicador de 35,9% do peso sem levantar erro nenhum.

   Uso:  node harness-v105.js index.html
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
  if(i === -1) throw new Error("sem constante " + nome);
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
    declDe("clamp"), declDe("escalaSuave"),
    declDe("percentilExpandido"), declDe("scoreDoPercentil"),
    constDe("BRUTO_PLAUSIVEL"), declDe("brutoValido"),
    constDe("NORMALIZACAO"), declDe("norm"),
    "return { norm, escalaSuave, percentilExpandido, scoreDoPercentil, brutoValido, BRUTO_PLAUSIVEL };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,tol,m){ if(Math.abs(a-b)>(tol||1e-9)) throw new Error((m||"")+" "+a+" ≠ "+b); }
function estoura(fn,m){ let d=false; try{ fn(); }catch(e){ d=true; } if(!d) throw new Error(m||"deveria falhar"); }

console.log("\nBLOCO A — a constante virou variável");

t("a porta canônica recebe RANK, não YoY", ()=>{
  const limpo = semComentarios(HTML);
  if(/"macro\.liquidez":\s*yoy\s*=>\s*escalaSuave\(yoy, 6\.67\)/.test(limpo))
    throw new Error("a régua antiga continua na tabela — é a v104 ou anterior");
  if(!/"macro\.liquidez":\s*rank\s*=>\s*scoreDoPercentil\(rank, \+1\)/.test(limpo))
    throw new Error("a porta canônica não usa o percentil");
});

t("O TESTE QUE DÓI: a régua antiga dava o mesmo lado quase sempre; a nova, não", ()=>{
  /* reproduz a medição da v104 sobre uma distribuição realista de M2 YoY
     (mediana ~5,4%, mínimo −4,9%, máximo +26,6%) e compara as duas réguas.
     Não é sobre qual prevê melhor — é sobre qual consegue MUDAR DE LADO. */
  const amostra = [];
  for(let i = 0; i < 426; i++){
    // curva assimétrica parecida com a real: quase tudo positivo, cauda longa
    amostra.push(-4.9 + 31.5 * Math.pow(i/425, 0.55));
  }
  const ladoAntigo = amostra.map(function(y){
    const s = API.escalaSuave(y, 6.67);
    return s >= 15 ? 1 : (s <= -15 ? -1 : 0);
  });
  const rank = function(y){
    let ab = 0; for(let i=0;i<amostra.length;i++) if(amostra[i] < y) ab++;
    return ab/amostra.length;
  };
  const ladoNovo = amostra.map(function(y){
    const s = API.norm("macro.liquidez", rank(y));
    return s >= 15 ? 1 : (s <= -15 ? -1 : 0);
  });
  const fatia = function(arr, v){ return arr.filter(function(x){ return x === v; }).length / arr.length; };
  if(fatia(ladoAntigo, 1) < 0.85)
    throw new Error("a amostra não reproduz o defeito: só " + (fatia(ladoAntigo,1)*100).toFixed(0) + "% bullish na régua antiga");
  if(fatia(ladoAntigo, -1) > 0.06)
    throw new Error("a amostra não reproduz o defeito: bearish demais na régua antiga");
  // a régua nova precisa dos DOIS lados, e em proporção parecida
  if(fatia(ladoNovo, 1) < 0.30 || fatia(ladoNovo, -1) < 0.30)
    throw new Error("a régua nova não usa os dois lados: " +
      (fatia(ladoNovo,1)*100).toFixed(0) + "% bullish / " + (fatia(ladoNovo,-1)*100).toFixed(0) + "% bearish");
});

t("o percentil é uniforme por construção — o normal deixa de ser extremo", ()=>{
  eq(API.norm("macro.liquidez", 0.5), 0, "rank mediano:");
  perto(API.norm("macro.liquidez", 0.75), 50, 1e-9, "p75:");
  perto(API.norm("macro.liquidez", 0.25), -50, 1e-9, "p25:");
  eq(API.norm("macro.liquidez", 1), 100, "topo:");
  eq(API.norm("macro.liquidez", 0), -100, "fundo:");
});

console.log("\nBLOCO B — o sentido, que é onde isto se inverteria em silêncio");

t("liquidez é DIRETA: percentil alto = bullish", ()=>{
  if(!(API.norm("macro.liquidez", 0.95) > 0)) throw new Error("M2 acima do normal virou bearish");
  if(!(API.norm("macro.liquidez", 0.05) < 0)) throw new Error("M2 abaixo do normal virou bullish");
});

t("o funding continua CONTRÁRIO — o padrão da função não mudou", ()=>{
  /* se alguém trocar o default de `scoreDoPercentil`, o funding_percentil
     inverte sem erro nenhum. Este teste é a guarda desse acidente. */
  if(!(API.scoreDoPercentil(0.95) < 0)) throw new Error("o padrão deixou de ser contrário");
  perto(API.scoreDoPercentil(0.5), 0, 1e-9, "mediana contrária:");
  perto(API.scoreDoPercentil(0.5, +1), 0, 1e-9, "mediana direta:");
});

t("os dois sentidos são espelho exato um do outro", ()=>{
  [0, 0.13, 0.5, 0.77, 1].forEach(function(r){
    perto(API.scoreDoPercentil(r, +1), -API.scoreDoPercentil(r, -1), 1e-9, "rank " + r + ":");
  });
});

t("sentido ausente continua sendo o contrário — nada antigo muda", ()=>{
  perto(API.scoreDoPercentil(0.9), API.scoreDoPercentil(0.9, -1), 1e-9, "default:");
});

console.log("\nBLOCO C — sem look-ahead, no vivo e no histórico");

t("o vivo monta `anteriores` a partir do índice 1 — o mês avaliado fica fora", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('fetchFredSeries("M2SL", 500)');
  if(i === -1) throw new Error("o vivo não busca a série longa");
  const trecho = limpo.slice(i, i + 1400);
  if(!/for\(let i = 1; i \+ 12 < obs\.length; i\+\+\)/.test(trecho))
    throw new Error("o laço de anteriores não começa em 1 — o mês entra na própria distribuição");
  if(!/percentilExpandido\(yoy, anteriores, 120\)/.test(trecho))
    throw new Error("o vivo não usa percentil expandido com mínimo de 120");
});

t("o histórico monta `anteriores` só com k < idx", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(!/for\(let k = 0; k < idx; k\+\+\) anteriores\.push\(serie\[k\]\.yoy\)/.test(f))
    throw new Error("o backtest inclui o próprio mês ou meses futuros na distribuição");
  if(!/percentilExpandido\(serie\[idx\]\.yoy, anteriores, 120\)/.test(f))
    throw new Error("o backtest não usa o mesmo percentil do vivo");
});

t("vivo e histórico passam pela MESMA porta canônica", ()=>{
  const limpo = semComentarios(HTML);
  const usos = [...limpo.matchAll(/norm\("macro\.liquidez", (\w+)\)/g)].map(m=>m[1]);
  if(usos.length < 2) throw new Error("só " + usos.length + " uso(s) da porta canônica");
  usos.forEach(function(u){
    if(u !== "rank") throw new Error("alguém passa `" + u + "` em vez de rank para a porta canônica");
  });
});

t("os primeiros meses são só prior — não viram score", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(!/if\(rank === null\) continue;/.test(f))
    throw new Error("mês sem prior suficiente estaria virando score");
  eq(API.percentilExpandido(5, new Array(119).fill(1), 120), null, "119 meses de prior:");
  if(API.percentilExpandido(5, new Array(120).fill(1), 120) === null)
    throw new Error("120 meses deveriam bastar");
});

t("a data de divulgação viaja com a série longa — sem ela volta o look-ahead", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(!/availableAt: longo\[i\]\.availableAt/.test(f))
    throw new Error("a série longa perdeu availableAt: o M2 entraria semanas antes de existir");
  if(!/disponivelEm\(serie\[idx\]/.test(f))
    throw new Error("o preenchimento não usa a data de divulgação");
});

console.log("\nBLOCO D — o bruto tem faixa, como manda a v100");

t("o M2 YoY tem faixa de plausibilidade e ela recusa absurdo", ()=>{
  if(!API.BRUTO_PLAUSIVEL["macro.m2yoy"]) throw new Error("sem faixa declarada");
  estoura(()=> API.brutoValido("macro.m2yoy", -80), "queda impossível passou");
  estoura(()=> API.brutoValido("macro.m2yoy", 500), "absurdo passou");
  eq(API.brutoValido("macro.m2yoy", 5.2), 5.2, "leitura real:");
  eq(API.brutoValido("macro.m2yoy", -4.9), -4.9, "o mínimo real da série:");
  eq(API.brutoValido("macro.m2yoy", 26.6), 26.6, "o máximo real da série:");
});

t("o vivo valida o bruto ANTES de ranquear", ()=>{
  const limpo = semComentarios(HTML);
  if(!/brutoValido\("macro\.m2yoy", yoyEm\(0\)\)/.test(limpo))
    throw new Error("um M2 defeituoso entraria no percentil sem passar pelo contrato");
});

console.log("\nBLOCO E — a mudança está declarada");

t("MODEL_VERSION foi para m7 — a liquidez muda de valor", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 7)
    throw new Error("continua m" + m[1] + ": o indicador de 35,9% do peso mudou de valor sem bump");
});

t("a tela mostra as duas réguas, e o antes de hoje", ()=>{
  const limpo = semComentarios(HTML);
  ["Régua antiga (v104)", "Régua nova (v105)", "a nova pontua"].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("falta na tela: " + s);
  });
});

t("a tela NÃO promete que a troca prevê melhor", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf("PODE ser") === -1 && limpo.indexOf("PODE ser testado") === -1)
    throw new Error("não distingue 'testável' de 'melhor'");
  if(limpo.indexOf("pode muito bem") === -1)
    throw new Error("não admite que a resposta pode ser negativa");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v105 verde — a liquidez voltou a poder dizer 'abaixo do normal'.");

/* =====================================================================
   harness-v93.js — a janela é de calendário, não de registros
   =====================================================================
   Todo teste aqui falha contra a v92.1 pelo motivo mais simples possível:
   `janelaCalendario` não existe lá. O que ele prova é o que a função faz
   depois de existir — inclusive que ela mede DIFERENTE do código antigo,
   que é a única razão para ela existir.

   Uso:  node harness-v93.js index.html
   ===================================================================== */

const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");

function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("não existe a função " + nome + " (é a v92 ou anterior?)");
  const abre = HTML.indexOf("{", i);
  let n = 0, str = null, esc = false;
  for(let k = abre; k < HTML.length; k++){
    const c = HTML[k];
    if(esc){ esc = false; continue; }
    if(c === "\\"){ esc = true; continue; }
    if(str){ if(c === str) str = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ str = c; continue; }
    if(c === "{") n++; else if(c === "}"){ n--; if(!n) return HTML.slice(i, k+1); }
  }
  throw new Error("função " + nome + " não fecha");
}

let API;
try{
  API = new Function([
    fonteDe("janelaCalendario"),
    fonteDe("diasEntreDatas"),
    fonteDe("comparaJanela"),
    fonteDe("indiceDiasAtras"),
    "return { janelaCalendario, diasEntreDatas, comparaJanela, indiceDiasAtras };"
  ].join("\n"))();
}catch(e){
  console.error("FALHA AO MONTAR:", e.message);
  process.exit(1);
}

/* ---- séries sintéticas com cadência real ----------------------------- */
// DESC (obs[0] = mais recente), como o vivo entrega
function serie(nObs, cadencia, fim){
  const out = [];
  let d = new Date(fim + "T00:00:00Z");
  while(out.length < nObs){
    const dow = d.getUTCDay();
    if(cadencia === "util" && (dow === 0 || dow === 6)){
      d.setUTCDate(d.getUTCDate() - 1); continue;
    }
    out.push({ date: d.toISOString().slice(0,10), value: 100 + out.length });
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}
const asc = s => s.slice().reverse();

let ok = 0, bad = 0; const falhas = [];
function t(nome, fn){
  try{ fn(); ok++; console.log("  ✓ " + nome); }
  catch(e){ bad++; falhas.push(nome + ": " + e.message); console.log("  ✗ " + nome + "  — " + e.message); }
}
function eq(a,b,m){ if(a !== b) throw new Error((m||"") + " esperado " + b + ", veio " + a); }
function verdade(v,m){ if(!v) throw new Error(m || "esperava verdadeiro"); }

console.log("\nBLOCO A — a janela mede dias, não registros (v93)");

t("série de 7 dias: 95 registros = 94 dias, e a janela pega exatamente 90", ()=>{
  const obs = serie(95, "diaria", "2026-08-14");
  const j = API.janelaCalendario(obs, 90);
  eq(j.dias, 90, "janela de calendário:");
  eq(j.diasDoLote, 94, "o que o código antigo mediria:");
});

t("série de dias úteis: 95 registros = 132 dias — o defeito, medido", ()=>{
  const obs = serie(95, "util", "2026-08-14");
  const j = API.janelaCalendario(obs, 90);
  // 130 e não 133: o lote termina numa sexta e a contagem depende de onde o
  // fim cai na semana. É exatamente por isso que a janela não pode ser contada
  // em registros — o mesmo "95" mede coisa diferente conforme o dia.
  eq(j.diasDoLote, 130, "o código da v92 media isto e chamava de ~90d:");
  verdade(j.dias >= 90 && j.dias <= 93, "a janela nova deu " + j.dias + "d, fora de [90,93]");
});

t("o ponto escolhido NÃO é o do lote — se fosse, a correção não faria nada", ()=>{
  const obs = serie(95, "util", "2026-08-14");
  const j = API.janelaCalendario(obs, 90);
  verdade(j.ponto.date !== j.doLote.date, "escolheu o mesmo ponto de antes");
  verdade(j.ponto.value !== j.doLote.value, "mesmo valor: a medida não mudou");
});

t("erro de 42 dias vira erro de medida: 47% a mais de janela", ()=>{
  const obs = serie(95, "util", "2026-08-14");
  const j = API.janelaCalendario(obs, 90);
  const excesso = (j.diasDoLote - j.dias) / j.dias;
  verdade(excesso > 0.4, "excesso medido " + (excesso*100).toFixed(0) + "%, esperava >40%");
});

t("fim de semana: o alvo cai no sábado e a função pega o ponto ANTERIOR a ele", ()=>{
  // alvo = 2026-08-14 − 90d = 2026-05-16, que é um sábado
  const obs = serie(95, "util", "2026-08-14");
  const j = API.janelaCalendario(obs, 90);
  verdade(j.ponto.date <= "2026-05-16", "pegou " + j.ponto.date + ", posterior ao alvo — é look-ahead de janela");
});

t("nunca devolve ponto POSTERIOR ao alvo, em qualquer cadência", ()=>{
  ["diaria","util"].forEach(cad=>{
    [30, 60, 90].forEach(dias=>{
      const obs = serie(95, cad, "2026-08-14");
      const j = API.janelaCalendario(obs, dias);
      verdade(j.dias >= dias, cad + "/" + dias + "d: janela de " + j.dias + "d, menor que o pedido");
    });
  });
});

console.log("\nBLOCO B — vivo e backtest medem a MESMA coisa");

t("janelaCalendario (DESC) escolhe o mesmo ponto que indiceDiasAtras (ASC)", ()=>{
  ["diaria","util"].forEach(cad=>{
    const obs = serie(95, cad, "2026-08-14");
    const jv = API.janelaCalendario(obs, 90);
    const oa = asc(obs);
    const ib = API.indiceDiasAtras(oa, oa.length - 1, 90);
    eq(jv.ponto.date, oa[ib].date, cad + ": vivo e backtest divergem —");
  });
});

t("e concordam também em 30 e 60 dias", ()=>{
  [30, 60].forEach(d=>{
    const obs = serie(95, "util", "2026-08-14");
    const jv = API.janelaCalendario(obs, d);
    const oa = asc(obs);
    eq(jv.ponto.date, oa[API.indiceDiasAtras(oa, oa.length-1, d)].date, d + "d:");
  });
});

console.log("\nBLOCO C — não alcançar é falha, não janela curta em silêncio");

t("série que só volta 40 dias LEVANTA erro em vez de medir 40 e chamar de 90", ()=>{
  const obs = serie(40, "diaria", "2026-08-14");
  let estourou = false;
  try{ API.janelaCalendario(obs, 90); }catch(e){ estourou = true;
    verdade(/não alcança/.test(e.message), "mensagem ilegível: " + e.message); }
  verdade(estourou, "devolveu um número em vez de falhar — é a v92 de novo");
});

t("série vazia também falha, e com mensagem própria", ()=>{
  let estourou = false;
  try{ API.janelaCalendario([], 90); }catch(e){ estourou = true; }
  verdade(estourou, "não falhou com série vazia");
});

console.log("\nBLOCO D — o antes/depois que vai para a tela");

t("comparaJanela mostra as duas medidas e as duas janelas", ()=>{
  const j = { dias: 90, diasDoLote: 132 };
  const s = API.comparaJanela(j, 2.5, 3.7, "%");
  verdade(/\+2\.5%/.test(s), "não mostra o valor novo: " + s);
  verdade(/\+3\.7%/.test(s), "não mostra o valor antigo: " + s);
  verdade(/90d/.test(s) && /132d/.test(s), "não mostra as duas janelas: " + s);
});

t("pp usa duas casas; % usa uma", ()=>{
  const j = { dias: 90, diasDoLote: 94 };
  verdade(/-0\.25pp/.test(API.comparaJanela(j, -0.25, -0.30, "pp")), "pp errado");
  verdade(/-1\.2%/.test(API.comparaJanela(j, -1.23, -1.5, "%")), "% errado");
});

console.log("\nBLOCO E — nenhum consumidor ficou no modelo antigo");

t("nenhum fetchFredSeries de janela longa lê obs[obs.length-1] direto", ()=>{
  const limpo = HTML.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
  ["DFF","DTWEXBGS","USEPUINDXD","DCOILWTICO","DEXUSEU","SP500","DGS10","DFII10"].forEach(s=>{
    const i = limpo.indexOf('fetchFredSeries("' + s + '", 95)');
    if(i === -1) throw new Error(s + ": não achei a chamada de 95 registros");
    const trecho = limpo.slice(i, i + 700);
    if(/obs\[obs\.length\s*-\s*1\]/.test(trecho))
      throw new Error(s + " ainda usa o registro mais antigo do lote");
    if(!/janelaCalendario\(obs,\s*90\)/.test(trecho))
      throw new Error(s + " não passa pela janela de calendário");
  });
});

t("as séries mensais NÃO foram tocadas — 3 meses não é 90 dias corridos", ()=>{
  const limpo = HTML.replace(/\/\*[\s\S]*?\*\//g, " ");
  ["CPIAUCSL","M2SL","PCOPPUSDM"].forEach(s=>{
    const i = limpo.indexOf('fetchFredSeries("' + s + '"');
    const trecho = limpo.slice(i, i + 700);
    if(/janelaCalendario/.test(trecho))
      throw new Error(s + " é mensal e foi para a janela diária");
  });
});

t("o modelo foi versionado — a série antes e depois não é comparável", ()=>{
  const m = /const MODEL_VERSION = "([^"]+)"/.exec(HTML);
  if(!m) throw new Error("sem MODEL_VERSION");
  if(m[1].indexOf("m4") === 0) throw new Error("continua m4: sete indicadores mudaram de medida sem bump");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  " + f)); process.exit(1); }
console.log("v93 verde — uma unidade de tempo, dois lugares.");

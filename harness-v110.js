/* =====================================================================
   harness-v110.js — o dia em formação também existe no FRED
   =====================================================================
   Contra a v109 falha: `fetchFredSeries` devolve o lote cru, com `obs[0]`
   podendo ser o ponto de HOJE, provisório.

   MEDIDO AO VIVO, entre duas leituras de Jorge separadas por 53 minutos:

       geopolitico.epu   −50,49 → +87,86     (138 pontos de score)
       EPU bruto            396 → 182        (o índice caiu pela metade)

   O ponto mais recente de uma série diária do FRED pode ser provisório e
   ser revisado no mesmo dia. `obs[0]` estava lendo esse ponto.

   É A v101 DE NOVO. Aquela build criou `soPeriodosFechados` e aplicou aos
   quatro consumidores que a auditoria listou — hash rate, CoinMetrics,
   GDELT e ouro. Nenhuma série do FRED estava na lista, e ninguém foi
   conferir. Oito séries ficaram de fora: DFF, DTWEXBGS, USEPUINDXD,
   DCOILWTICO, DEXUSEU, SP500, DGS10 e DFII10 — juros, dólar, EPU,
   petróleo, euro, S&P, 10 anos e o sensor de juro real. Somadas, ~30% do
   peso do sistema.

   A correção vai na FONTE, não nos oito chamadores: quem filtra é
   `fetchFredSeries`. Consumidor novo nasce protegido, e um nono não pode
   escapar por não estar numa lista.

   Uso:  node harness-v110.js index.html
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
  if(i === -1) throw new Error("sem constante " + nome + " (é a v109 ou anterior?)");
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
    declDe("dataUTCDe"), declDe("hojeUTC"), declDe("soPeriodosFechados"),
    constDe("FRED_FORMACAO"), declDe("fredSoFechados"),
    "return { soPeriodosFechados, fredSoFechados, FRED_FORMACAO };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function estoura(fn,m){ let d=false; try{ fn(); }catch(e){ d=true; } if(!d) throw new Error(m||"deveria falhar"); }
function em(iso, fn){
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try { return fn(); } finally { Date.now = real; }
}
/* lote do FRED: DESC, obs[0] = mais recente */
function lote(fim, n){
  const out = []; let d = new Date(fim + "T00:00:00Z");
  for(let i=0;i<n;i++){ out.push({ date: d.toISOString().slice(0,10), value: 100 + i });
    d.setUTCDate(d.getUTCDate()-1); }
  return out;
}

console.log("\nBLOCO A — o caso real do EPU, reproduzido");

t("O TESTE QUE DÓI: o ponto provisório de HOJE não chega ao score", ()=>{
  /* o lote de 13:05 UTC trazia o dia corrente com valor provisório 396;
     o ponto fechado de ontem valia 182. `obs[0]` pegava o errado. */
  const obs = [{ date:"2026-08-18", value:396 },   // provisório, hoje
               { date:"2026-08-17", value:182 },
               { date:"2026-08-16", value:180 }];
  const f = em("2026-08-18T13:05:00Z", ()=> API.fredSoFechados(obs, "USEPUINDXD"));
  eq(f[0].value, 182, "valor que vira score:");
  eq(f[0].date, "2026-08-17", "data do ponto usado:");
  eq(obs[0].value, 396, "o lote original não pode ser alterado:");
});

t("sem ponto de hoje no lote, nada é descartado", ()=>{
  const obs = lote("2026-08-17", 95);
  const f = em("2026-08-18T13:05:00Z", ()=> API.fredSoFechados(obs, "DFF"));
  eq(f.length, 95, "pontos mantidos:");
});

t("a hora do dia não muda a régua — às 00:01 ou às 23:59", ()=>{
  const obs = lote("2026-08-18", 95);
  ["2026-08-18T00:01:00Z","2026-08-18T12:00:00Z","2026-08-18T23:59:00Z"].forEach(function(iso){
    eq(em(iso, ()=> API.fredSoFechados(obs, "DFF")).length, 94, iso + ":");
  });
});

t("série que fica VAZIA depois do filtro falha, não devolve lote mudo", ()=>{
  const so = [{ date:"2026-08-18", value:396 }];
  estoura(()=> em("2026-08-18T13:05:00Z", ()=> API.fredSoFechados(so, "USEPUINDXD")),
          "devolveu série vazia em silêncio");
});

t("séries MENSAIS não são tocadas — o mês corrente já vem datado no dia 1", ()=>{
  const mensal = [{ date:"2026-08-01", value:5.2 }, { date:"2026-07-01", value:5.0 }];
  const f = em("2026-08-18T13:05:00Z", ()=> API.fredSoFechados(mensal, "M2SL"));
  eq(f.length, 2, "pontos mensais mantidos:");
});

console.log("\nBLOCO B — o filtro está na FONTE, e o descarte é declarado");

t("fetchFredSeries filtra — não são os oito chamadores que filtram", ()=>{
  const f = semComentarios(declDe("fetchFredSeries"));
  if(!/fredSoFechados\(obs, seriesId\)/.test(f))
    throw new Error("a fonte devolve o lote cru: um nono consumidor nasceria desprotegido");
});

t("NENHUM chamador lê obs[0] sem que a fonte tenha filtrado", ()=>{
  /* asserção sobre o arquivo inteiro, no espírito da v101 que achou o ouro:
     se alguém voltar a chamar a rota crua do FRED, quebra aqui. */
  const limpo = semComentarios(HTML);
  /* a asserção certa não é sobre CADA montagem — uma delas é sondagem que não
     devolve nada, e filtrar ali seria teatro. É sobre quem RETORNA. */
  ["fetchFredSeries", "fetchFredSeriesRange"].forEach(function(fn){
    const f = semComentarios(declDe(fn));
    if(!/fredSoFechados/.test(f))
      throw new Error(fn + " devolve lote do FRED sem passar pelo filtro");
  });
  const cruas = [...limpo.matchAll(/data\.observations \|\| \[\]/g)];
  if(!cruas.length) throw new Error("não achei nenhuma montagem de observações do FRED");
  /* fetchFredSeriesRange alimenta o BACKTEST. Se o vivo descarta o dia em
     formação e o histórico não, os dois voltam a medir coisas diferentes com
     o mesmo nome — que é o defeito que a v93 e a v101 já corrigiram duas
     vezes, em consumidores diferentes. */
  if(cruas.length < 3)
    throw new Error("só " + cruas.length + " lote(s) do FRED encontrados; o range do backtest sumiu?");
});

t("o que foi descartado aparece, por série", ()=>{
  const limpo = semComentarios(HTML);
  if(!/FRED_FORMACAO\.series\.push/.test(limpo))
    throw new Error("o descarte é silencioso — não dá pra saber que houve");
  if(!/FRED_FORMACAO\.descartados = 0/.test(limpo))
    throw new Error("o acumulador não zera entre rodadas (regra da v99.1)");
});

t("o diagnóstico imprime o descarte", ()=>{
  const f = semComentarios(declDe("relatorioTexto"));
  if(!/FRED_FORMACAO/.test(f))
    throw new Error("o relatório não mostra quais séries tiveram ponto em formação");
});

console.log("\nBLOCO C — a mudança está declarada");

t("MODEL_VERSION foi para m10 — oito indicadores mudam de valor", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(!m) throw new Error("MODEL_VERSION fora do formato mN-data");
  if(Number(m[1]) < 10)
    throw new Error("continua m" + m[1] + ": ~30% do peso muda de valor sem bump");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.109-/.test(m[1])) throw new Error("continua a v109: " + m[1]);
});

t("a tela conta o que aconteceu, com o número medido", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf("396") === -1 || limpo.indexOf("182") === -1)
    throw new Error("o caso que motivou a build (EPU 396 → 182) não está na tela");
  if(!/dia em formação/.test(limpo))
    throw new Error("não nomeia o defeito");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v110 verde — nenhum período aberto do FRED vota.");

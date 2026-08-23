/* =====================================================================
   harness-v145.js — a rodada termina, mesmo quando um sensor quebra
   =====================================================================
   Coleta e ligação. MODEL_VERSION continua m12, score intocado.

   O DEFEITO: `results` é declarado dentro de `refreshMarketData`.
   `coletarLiquidacoes` é irmã, não filha — ler `results` lá é ReferenceError,
   e sempre foi, desde a v130. Ficou catorze builds escondido atrás de
   `if(!chave) return;`, porque a chave nunca chegou a ser salva (o botão morto
   da v144). No primeiro salvamento que funcionou, a rodada morreu:
   "interrompido — Can't find variable: results".

   E o modo de falha era o pior possível: o estouro acontece DENTRO do `try`,
   o `catch` pega, e a primeira linha do `catch` é `results.fail.push` — que
   estoura de novo, agora sem ninguém para pegar. A exceção sobe e leva junto o
   apetite, as velas e a gravação das observações point-in-time daquela leitura.

   ESTE HARNESS EXECUTA a função com talos. Variável livre não aparece lendo o
   código — aparece quando alguém chama.

   Uso:  node harness-v145.js index.html
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
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}

/* ---- monta coletarLiquidacoes com talos ------------------------------- */
function montar(resposta){
  const logs = [];
  const S = { apiKeys:{ coinalyze:"chave-de-teste-123" }, market:{} };
  const fn = new Function("S","logStep","logDone","smartFetch","percentilDeApetite","Date",
    declDe("coletarLiquidacoes") + "\nreturn coletarLiquidacoes;")(
    S,
    function(t){ logs.push(["step", t]); return { t: t }; },
    function(l, ok, det){ logs.push(["done", ok, det]); },
    async function(){ return resposta; },
    function(){ return 50; },
    Date);
  return { fn, S, logs };
}
/* uma hora de liquidação: `l` comprados, `s` vendidos. A última é descartada
   (regra da hora em formação, v110), por isso vão três. */
const respostaBoa = {
  ok:true, status:200,
  json: async () => ([{ history: [
    { t:1, l:1000000, s:2000000 },
    { t:2, l:1200000, s:2400000 },
    { t:3, l:900000,  s:2600000 }
  ]}])
};

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
async function ta(n,f){ try{ await f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

(async function(){

console.log("\nBLOCO A — a coleta roda sem estourar");

await ta("SUCESSO com results passado: grava e reporta ok", async ()=>{
  /* falha contra a v144 com ReferenceError: results is not defined */
  const m = montar(respostaBoa);
  const results = { ok:[], fail:[] };
  await m.fn(results);
  if(results.fail.length) throw new Error("reportou falha: " + results.fail.join(","));
  eq(results.ok.indexOf("liquidações") !== -1, true, "reportou sucesso:");
  const L = m.S.market.liquidacoes;
  if(!L) throw new Error("não gravou as liquidações");
  eq(Math.round(L.proporcaoVendidos), 67, "proporção de vendidos:");
});

await ta("CHAMADA SEM ARGUMENTO não derruba nada", async ()=>{
  /* a defesa que impede o defeito de voltar por outra porta: quem chamar
     solto recebe um `results` de mentira em vez de um ReferenceError. */
  const m = montar(respostaBoa);
  await m.fn();
  if(!m.S.market.liquidacoes) throw new Error("não gravou");
});

await ta("FALHA DA FONTE reporta e não estoura", async ()=>{
  /* era aqui que a segunda explosão acontecia: o `catch` fazia
     `results.fail.push` e estourava de novo, sem ninguém para pegar. */
  const m = montar({ ok:false, status:401, json: async()=>({error:"chave recusada"}) });
  const results = { ok:[], fail:[] };
  await m.fn(results);
  eq(results.fail.indexOf("liquidações") !== -1, true, "reportou falha:");
  eq(m.S.market.liquidacoes, null, "não deixou valor velho:");
});

await ta("SEM CHAVE continua saindo cedo, sem log", async ()=>{
  const m = montar(respostaBoa);
  m.S.apiKeys.coinalyze = "";
  const results = { ok:[], fail:[] };
  await m.fn(results);
  eq(results.ok.length + results.fail.length, 0, "nada reportado:");
  eq(m.logs.length, 0, "nada no log:");
});

console.log("\nBLOCO B — `results` deixa de ser variável livre");

t("a função DECLARA o que precisa", ()=>{
  const d = semComentarios(declDe("coletarLiquidacoes"));
  if(!/^async function coletarLiquidacoes\(results\)/.test(d.trim()))
    throw new Error("results continua vindo do nada");
  if(!/results = results \|\|/.test(d))
    throw new Error("sem padrão para chamada sem argumento");
});

t("o chamador PASSA o results", ()=>{
  const limpo = semComentarios(HTML);
  if(/coletarLiquidacoes\(\)\s*;/.test(limpo))
    throw new Error("ainda há chamada sem argumento no app");
  if(!/coletarLiquidacoes\(results\)/.test(limpo))
    throw new Error("o chamador não passa results");
});

console.log("\nBLOCO C — sensor não derruba a rodada");

t("os quatro opcionais rodam protegidos", ()=>{
  /* o `coletarSensoresExploratorios` já vinha com rede desde a v82, com a
     justificativa escrita ao lado. A regra valia para um só. */
  const r = semComentarios(declDe("refreshMarketData"));
  const i = r.indexOf("const opcionais");
  if(i === -1) throw new Error("os opcionais não foram agrupados");
  const trecho = r.slice(i, i + 1400);
  ["coletarVelasCamadas","coletarCVD","coletarLiquidacoes","coletarApetite"]
    .forEach(function(f){
      if(trecho.indexOf(f) === -1) throw new Error("ficou de fora da rede: " + f);
    });
  if(!/try\{[\s\S]*?catch/.test(trecho)) throw new Error("sem try/catch no laço");
});

t("a falha de um opcional APARECE — não some em silêncio", ()=>{
  /* trocar "derruba a rodada" por "some sem avisar" seria repetir o defeito
     da v130 pelo outro lado. */
  const r = semComentarios(declDe("refreshMarketData"));
  const i = r.indexOf("const opcionais");
  const trecho = r.slice(i, i + 1400);
  if(!/logFinal/.test(trecho)) throw new Error("a falha não vai para o log");
  if(!/results\.fail\.push/.test(trecho)) throw new Error("a falha não entra em FALHAS");
});

t("nenhum dos quatro vota no score", ()=>{
  /* a rede só é aceitável porque nenhum deles decide. Se um dia um destes
     virar votante, este teste tem que falhar e forçar a discussão. */
  ["coletarVelasCamadas","coletarCVD","coletarLiquidacoes","coletarApetite"]
    .forEach(function(f){
      const d = semComentarios(declDe(f));
      if(/S\.motors\[[^\]]+\]\.indicators\[[^\]]+\]\.value\s*=/.test(d))
        throw new Error(f + " escreve em indicador votante — a rede deixa de ser segura");
    });
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.144/.test(m[1])) throw new Error("continua a v144: " + m[1]);
});
t("a gravação das observações continua DEPOIS dos opcionais", ()=>{
  /* foi o que mais custou quando a rodada morreu: a leitura inteira ficou
     sem observações point-in-time. */
  const r = semComentarios(declDe("refreshMarketData"));
  if(r.indexOf("gravarObservacoesDaRodada") < r.indexOf("const opcionais"))
    throw new Error("a gravação passou para antes dos opcionais");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v145 verde — a rodada termina, e a liquidação chega.");
})();

/* =====================================================================
   harness-v103.js — o orçamento de pedidos ao GDELT
   =====================================================================
   Contra a v102 falha inteiro: `pedirGdelt` e `GDELT_ORCAMENTO` não existem
   lá, e o pior caso era 8 pedidos por indicador — comSegundaChance (×2) ·
   retry do smartFetch (×2) · BACKOFF do servidor (×2) — contra um limite de
   1 consulta a cada 5 segundos por IP.

   O teste que mais importa não é o do teto: é o do RESET. Um orçamento por
   rodada que não zera mata a fonte de vez, em silêncio, e só aparece na
   segunda atualização — quando ninguém está mais olhando para esta build.

   Uso:  node harness-v103.js index.html
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
  const i = HTML.indexOf("function " + nome + "(") >= 0
    ? HTML.indexOf("function " + nome + "(")
    : HTML.indexOf("async function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v102 ou anterior?)");
  return HTML.slice(i, i + bloco(i).length + (HTML.slice(i).startsWith("async") ? 0 : 0));
}
function corpoDe(nome){
  let i = HTML.indexOf("async function " + nome + "(");
  if(i === -1) i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v102 ou anterior?)");
  return bloco(i).replace(/^[\s\S]*?\{/, "{");
}
function declDe(nome){
  let i = HTML.indexOf("async function " + nome + "(");
  if(i === -1) i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v102 ou anterior?)");
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

/* ambiente falso: `smartFetch` vira um contador de idas à fonte */
const ctx = { chamadas: [], resposta: null };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    'const GDELT_ROTA = "/api/gdelt";',
    "async function smartFetch(url, extra){ ctx.chamadas.push({url:url, extra:extra}); " +
      "if(ctx.erro) throw new Error(ctx.erro); return ctx.resposta; }",
    constDe("GDELT_ORCAMENTO"), constDe("GDELT_DIAG"),
    declDe("zerarOrcamentoGdelt"), declDe("pedirGdelt"), declDe("textoCacheGdelt"),
    "return { pedirGdelt, zerarOrcamentoGdelt, textoCacheGdelt, GDELT_DIAG, GDELT_ORCAMENTO };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

function respostaCom(h){
  const m = {};
  Object.keys(h).forEach(function(k){ m[k.toLowerCase()] = h[k]; });
  return { headers: { get: function(k){ const v = m[String(k).toLowerCase()]; return v === undefined ? null : v; } } };
}

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
/* `t` é síncrono: passar uma função async para ele faz o teste "passar"
   antes de rodar, e o erro vira rejeição solta no console. Testes que
   tocam a rede falsa precisam deste, que espera de verdade. */
async function ta(n,f){ try{ await f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
async function estoura(fn, msg){
  let deu = false;
  try{ await fn(); }catch(e){ deu = true; }
  if(!deu) throw new Error(msg || "deveria ter levantado erro");
}
function nova(){ ctx.chamadas = []; ctx.erro = null; API.zerarOrcamentoGdelt(); }

(async function(){

console.log("\nBLOCO A — o teto existe e é contado");

t("o orçamento declarado é 2 — um pedido por indicador", ()=>{
  eq(API.GDELT_ORCAMENTO, 2);
});

  nova(); ctx.resposta = respostaCom({ "x-vercel-cache": "MISS" });
await ta("dois pedidos passam; o terceiro é recusado ANTES de ir à fonte", async ()=>{
    await API.pedirGdelt("/api/gdelt?a=1");
    await API.pedirGdelt("/api/gdelt?b=2");
    eq(ctx.chamadas.length, 2, "idas à fonte:");
    await estoura(()=> API.pedirGdelt("/api/gdelt?c=3"), "o terceiro passou");
    eq(ctx.chamadas.length, 2, "o recusado NÃO foi à fonte:");
});

t("a recusa explica por que insistir piora", ()=>{
  const f = semComentarios(declDe("pedirGdelt"));
  if(!/renova o limite de taxa/.test(f))
    throw new Error("a mensagem não diz o motivo — vira mais um erro mudo");
  if(!/GDELT_DIAG\.pedidos >= GDELT_ORCAMENTO/.test(f))
    throw new Error("o teto não é conferido antes de gastar o pedido");
});

console.log("\nBLOCO B — o RESET, que é onde isto mata a fonte se faltar");

  nova(); ctx.resposta = respostaCom({ "x-vercel-cache": "HIT" });
await ta("depois de zerar, a rodada seguinte tem o orçamento inteiro de volta", async ()=>{
    await API.pedirGdelt("/api/gdelt?a=1");
    await API.pedirGdelt("/api/gdelt?b=2");
    await estoura(()=> API.pedirGdelt("/api/gdelt?c=3"), "esgotou?");
    API.zerarOrcamentoGdelt();
    await API.pedirGdelt("/api/gdelt?a=1");   // não pode estourar
    eq(API.GDELT_DIAG.pedidos, 1, "pedidos na rodada nova:");
});

t("zerar também limpa o diagnóstico da rodada anterior", ()=>{
  API.zerarOrcamentoGdelt();
  eq(API.GDELT_DIAG.ultimo, null, "sobrou leitura da rodada passada:");
  eq(API.textoCacheGdelt(), "", "texto de cache de rodada velha:");
});

t("a coleta CHAMA o reset — sem isto o GDELT morre na segunda atualização", ()=>{
  const f = semComentarios(declDe("refreshMarketData"));
  if(!/zerarOrcamentoGdelt\(\)/.test(f))
    throw new Error("a rodada não zera o orçamento: o GDELT roda uma vez e cala para sempre");
  const limpo = semComentarios(HTML);
  const iReset = limpo.indexOf("zerarOrcamentoGdelt()", limpo.indexOf("async function refreshMarketData"));
  const iUso   = limpo.indexOf("fetchGdeltTone()", limpo.indexOf("async function refreshMarketData"));
  if(!(iReset > -1 && iUso > -1 && iReset < iUso))
    throw new Error("o reset acontece depois do uso, ou não acontece");
});

console.log("\nBLOCO C — o cliente parou de multiplicar");

t("nenhuma leitura do GDELT passa por comSegundaChance", ()=>{
  const limpo = semComentarios(HTML);
  if(/comSegundaChance\(fetchGdelt/.test(limpo))
    throw new Error("a segunda chance do cliente continua dobrando os pedidos");
});

t("os dois fetchers vão pelo orçamento, não pelo smartFetch cru", ()=>{
  ["fetchGdeltTone", "fetchGdeltVolumeSpike"].forEach(function(fn){
    const f = semComentarios(declDe(fn));
    if(!/pedirGdelt\(url\)/.test(f)) throw new Error(fn + " não passa pelo orçamento");
    if(/smartFetch\(url\)/.test(f)) throw new Error(fn + " ainda chama smartFetch direto");
  });
});

t("o pedido declara semRetry — o retry interno do smartFetch não vale aqui", ()=>{
  const f = semComentarios(declDe("pedirGdelt"));
  if(!/semRetry:\s*true/.test(f)) throw new Error("o pedido não desliga a insistência do cliente");
  const sf = semComentarios(declDe("smartFetch"));
  if(!/extra && extra\.semRetry/.test(sf)) throw new Error("smartFetch ignora o pedido de não insistir");
});

console.log("\nBLOCO D — a discussão sobre o cache passa a ter número");

  nova();
  ctx.resposta = respostaCom({ "x-vercel-cache": "HIT", "age": "420",
                               "x-seios-buscado-em": "2026-08-16T20:00:00Z", "x-seios-fonte": "gdelt" });
await ta("a resposta da borda é lida e guardada", async ()=>{
    await API.pedirGdelt("/api/gdelt?a=1");
    eq(API.GDELT_DIAG.ultimo.cache, "HIT", "cache:");
    eq(API.GDELT_DIAG.ultimo.idadeS, 420, "idade:");
    eq(API.GDELT_DIAG.ultimo.fonte, "gdelt", "fonte:");
});

  nova();
  ctx.resposta = respostaCom({ "x-vercel-cache": "HIT", "age": "420" });
await ta("o log mostra HIT, idade em minutos e o consumo do orçamento", async ()=>{
    await API.pedirGdelt("/api/gdelt?a=1");
    const s = API.textoCacheGdelt();
    if(!/HIT/.test(s)) throw new Error("não mostra o estado do cache: " + s);
    if(!/7min de idade/.test(s)) throw new Error("não converte a idade: " + s);
    if(!/1\/2 pedidos/.test(s)) throw new Error("não mostra o consumo: " + s);
});

  nova();
  ctx.resposta = respostaCom({});   // sem cabeçalho de cache nenhum
await ta("sem cabeçalho de cache, diz que não veio — não inventa HIT", async ()=>{
    await API.pedirGdelt("/api/gdelt?a=1");
    eq(API.GDELT_DIAG.ultimo.cache, "sem cabeçalho", "cache:");
    eq(API.GDELT_DIAG.ultimo.idadeS, null, "idade:");
});

t("a falha do GDELT também imprime o estado do cache", ()=>{
  const limpo = semComentarios(HTML);
  const alvos = [...limpo.matchAll(/logDone\(line, false, \(e && e\.message\) \+ textoCacheGdelt\(\)\)/g)];
  if(alvos.length < 2)
    throw new Error("só " + alvos.length + " das 2 falhas do GDELT mostram o cache");
});

console.log("\nBLOCO E — a mensagem que descrevia a defesa errada");

t("o 429 não promete mais 3 tentativas onde o servidor faz 2", ()=>{
  const f = semComentarios(declDe("erroRotaPropria"));
  if(/tentou 3×/.test(f)) throw new Error("continua dizendo 3×");
  if(!/tentou 2×/.test(f)) throw new Error("não diz quantas são");
});

/* v105 — mesma correção do harness-v102: de fato datado para invariante. */
t("MODEL_VERSION nunca regride — a v103 nasceu no m6", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(!m) throw new Error("MODEL_VERSION fora do formato mN-data");
  if(Number(m[1]) < 6) throw new Error("modelo regrediu para m" + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v103 verde — o orçamento está escrito ao lado da defesa.");
})();

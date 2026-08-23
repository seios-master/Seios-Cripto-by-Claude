/* =====================================================================
   harness-v149.js — quanto do score vem de régua que acabou
   =====================================================================
   Diagnóstico e tela. MODEL_VERSION continua m12, score intocado.

   MEDIDO nas leituras m12 acumuladas: `tecnico.mediaMovel` saturou em ~76%
   delas, `onchain.activeAddresses` e `onchain.hashrate` em ~35% cada. Um
   indicador saturado não é leitura forte — é uma escala que parou de medir.
   A nota já diz "[TETO]", mas some no meio de 46 linhas e não existe somada.

   O CASO QUE ESTÁ ACONTECENDO AGORA, e é pior que a soma: o On-chain tem três
   votantes — MVRV +21,69, endereços +100, hash −100. Os dois saturados se
   cancelam EXATAMENTE e o composto sai 21,69 ÷ 3 = 7,23. O On-chain de hoje é
   o MVRV dividido por três. Não é "dois sinais discordando": são duas réguas
   cegas se anulando, e a tela não distinguia uma coisa da outra.

   A CONTA VEM DO VETOR CANÔNICO, não de atalho: peso por indicador, teto de
   família e translação de motor já estão embutidos ali. Refazer fora seria a
   segunda régua que a v92 existiu para eliminar.

   Uso:  node harness-v149.js index.html
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

/* --- monta contribuicoesCanonicas com talos --------------------------- */
let S = { motors:{} };
const FAM = {};
const API = new Function("getS","valorVigente","indicadoresVotantes","familiaDoIndicador",
  "aplicarTeto","motorComposite","FAMILIA_TETO",
  (declDe("contribuicoesCanonicas") + "\nreturn { contribuicoesCanonicas };")
    .replace(/\bS\.motors\b/g, "getS().motors"))(
  function(){ return S; },
  function(mk, ik){
    const i = S.motors[mk] && S.motors[mk].indicators[ik];
    return (i && i.value !== undefined && i.value !== null) ? i.value : null;
  },
  function(mk){ return Object.keys(S.motors[mk].indicators || {}); },
  function(mk, ik){ return mk; },
  function(mk, bruto){ return bruto; },
  function(mk){ return 0; },
  {});

function motor(label, weight, inds){
  const indicators = {};
  Object.keys(inds).forEach(function(k){
    indicators[k] = { label:k, value: inds[k].v,
                      saturado: !!inds[k].sat };
  });
  return { label:label, weight:weight, indicators:indicators };
}
/* o estado real de 23/08 11:35, nos motores que interessam */
function estadoReal(){
  return {
    onchain: motor("On-chain", 0.15, {
      mvrv:            { v: 21.69 },
      activeAddresses: { v: 100,  sat:true },
      hashrate:        { v:-100,  sat:true } }),
    tecnico: motor("Técnico", 0.04, {
      tendencia:  { v: 83.21 },
      momentum:   { v: 5.12 },
      rsi:        { v:-66.99 },
      mediaMovel: { v: 100, sat:true } }),
    macro: motor("Macro", 0.15, {
      juros:{v:-0.4}, inflacao:{v:10.15}, liquidez:{v:-5.13},
      dxy:{v:2.55}, curva:{v:19.74} })
  };
}

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function perto(a,b,tol,m){ if(Math.abs(a-b) > (tol||0.001)) throw new Error((m||"")+" esperado ~"+b+", veio "+a); }

console.log("\nBLOCO A — a massa clipada sai do vetor canônico");

t("com o estado real, três indicadores no teto", ()=>{
  /* falha contra a v148: lá `clipados` não existe. */
  S = { motors: estadoReal() };
  const v = API.contribuicoesCanonicas();
  if(!v.clipados) throw new Error("o vetor não devolve os clipados");
  eq(v.clipados.length, 3, "quantos no teto:");
  const ids = v.clipados.map(c=>c.id).sort();
  eq(ids.join(","), "onchain.activeAddresses,onchain.hashrate,tecnico.mediaMovel", "quais:");
});

t("a fração usa o PESO do vetor, não a contagem de indicadores", ()=>{
  /* contar 3 de 12 daria 25%. O certo é somar pesos: onchain vale 15% em 3
     votantes (5% cada) e técnico 4% em 4 (1% cada). */
  S = { motors: estadoReal() };
  const v = API.contribuicoesCanonicas();
  perto(v.massaClipada, 0.05 + 0.05 + 0.01, 1e-9, "massa clipada:");
  perto(v.fracaoClipada, 0.11/0.34, 1e-9, "fração:");
  if(Math.abs(v.fracaoClipada - 3/12) < 1e-6)
    throw new Error("caiu na contagem simples de indicadores");
});

t("massaTotal e massaObservada NÃO mudaram", ()=>{
  /* a build não pode ter mexido no que decide. */
  S = { motors: estadoReal() };
  const v = API.contribuicoesCanonicas();
  perto(v.massaTotal, 0.34, 1e-9, "massa total:");
  perto(v.massaObservada, 0.34, 1e-9, "massa observada:");
  eq(v.itens.length, 12, "itens no vetor:");
});

t("indicador ausente NÃO conta como clipado, nem que esteja marcado", ()=>{
  /* `saturado` é um campo persistido: pode sobrar de uma leitura anterior num
     indicador que hoje não tem valor. Só entra quem está no vetor. */
  S = { motors: { onchain: motor("On-chain", 0.15, {
        mvrv:{v:21.69}, activeAddresses:{v:null, sat:true}, hashrate:{v:-100, sat:true} }) } };
  const v = API.contribuicoesCanonicas();
  eq(v.clipados.length, 1, "clipados:");
  eq(v.clipados[0].indicador, "hashrate", "qual:");
});

t("nada no teto: fração ZERO, não NaN", ()=>{
  S = { motors: { macro: estadoReal().macro } };
  const v = API.contribuicoesCanonicas();
  eq(v.clipados.length, 0, "clipados:");
  eq(v.massaClipada, 0, "massa:");
  eq(v.fracaoClipada, 0, "fração:");
});

t("sem massa observada, a fração é zero e não divide por zero", ()=>{
  S = { motors: { onchain: motor("On-chain", 0.15, { mvrv:{v:null} }) } };
  const v = API.contribuicoesCanonicas();
  eq(v.massaObservada, 0, "observada:");
  eq(v.fracaoClipada, 0, "fração:");
  if(Number.isNaN(v.fracaoClipada)) throw new Error("NaN");
});

console.log("\nBLOCO B — o caso do cancelamento fica explícito");

t("os dois tetos opostos do On-chain são detectáveis", ()=>{
  /* +100 e −100 no MESMO motor: o composto sai moderado por anulação, não por
     discordância medida. */
  S = { motors: estadoReal() };
  const v = API.contribuicoesCanonicas();
  const doOnchain = v.clipados.filter(c=>c.motor === "onchain");
  eq(doOnchain.length, 2, "clipados no on-chain:");
  if(!(doOnchain.some(c=>c.valor > 0) && doOnchain.some(c=>c.valor < 0)))
    throw new Error("não dá para ver que apontam para lados opostos");
});

t("o composto do On-chain É o MVRV dividido por três", ()=>{
  /* a aritmética que justifica o aviso, conferida e não afirmada de memória */
  S = { motors: estadoReal() };
  const v = API.contribuicoesCanonicas();
  const oc = v.itens.filter(i=>i.motor === "onchain");
  const media = oc.reduce((a,i)=>a+i.valor,0)/oc.length;
  perto(media, 21.69/3, 0.001, "composto do on-chain:");
  perto(media, 7.23, 0.01, "bate com o diagnóstico:");
});

t("a tela mostra o aviso de cancelamento", ()=>{
  const r = semComentarios(declDe("renderState"));
  if(!/cancelando/.test(r)) throw new Error("não detecta cancelamento");
  if(!/réguas cegas se cancelando/.test(r)) throw new Error("não explica o que isso significa");
});

console.log("\nBLOCO C — aparece no resumo e no diagnóstico");

t("o resumo dos Motores traz a fração no teto", ()=>{
  const r = semComentarios(declDe("renderState"));
  if(!/no teto/.test(r)) throw new Error("o resumo não declara");
  if(!/fracaoClipada/.test(r)) throw new Error("não lê a fração do vetor");
  if(!/\+clip\b/.test(r.replace(/\s/g,""))) throw new Error("clip não entra no resumo");
});

t("o diagnóstico traz MASSA NO TETO com os indicadores", ()=>{
  const d = semComentarios(declDe("relatorioTexto"));
  if(!/MASSA NO TETO/.test(d)) throw new Error("não aparece no diagnóstico");
  if(!/nenhum indicador no teto/.test(d)) throw new Error("sem o caminho de zero");
});

t("a conta NÃO é refeita fora do vetor canônico", ()=>{
  /* refazer peso por indicador na tela é a segunda régua que a v92 eliminou */
  const r = semComentarios(declDe("renderState"));
  const i = r.indexOf("clip");
  const trecho = r.slice(Math.max(0,i-200), i+2500);
  if(/motor\.weight\s*\/|weight\s*\/\s*votantes/.test(trecho))
    throw new Error("a tela voltou a calcular peso por indicador");
  if(!/contribuicoesCanonicas\(\)/.test(trecho))
    throw new Error("não usa o vetor canônico");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.148/.test(m[1])) throw new Error("continua a v148: " + m[1]);
});
t("o vetor histórico do backtest NÃO foi tocado", ()=>{
  /* `vetorCanonicoHistorico` tem o mesmo fim de função e o script quase
     trocou o bloco errado — o assert pegou. Este teste guarda a fronteira. */
  const vh = semComentarios(declDe("vetorCanonicoHistorico"));
  if(/massaClipada|clipados/.test(vh))
    throw new Error("a massa clipada vazou para o vetor histórico");
});
t("o painel não escreve no estado", ()=>{
  const f = semComentarios(declDe("contribuicoesCanonicas"));
  if(/saveState\(|\.value\s*=|MODEL_VERSION\s*=/.test(f))
    throw new Error("o vetor passou a escrever");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v149 verde — a régua que acabou passa a ser declarada.");

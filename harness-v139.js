/* =====================================================================
   harness-v139.js — a linha que sumia em silêncio
   =====================================================================
   Só apresentação. MODEL_VERSION continua m12, score intocado.

   O QUE O JORGE VIU E EU NÃO: a v137 tirou do herói a lista de itens do
   regime porque ela era cópia literal da dobra Ciclo. O painel LOGO ABAIXO
   tinha exatamente o mesmo defeito, e eu passei por cima dele duas vezes:

     · a tabela dos três componentes (CVD · open interest · funding) estava
       dentro do corpo da dobra "Pressão" E solta abaixo dela, sempre visível,
       sempre a mesma coisa. ~150px permanentes.
     · o aviso de "base curta" flutuava fora da dobra que mostra os percentis
       de que ele fala.

   E a cópia solta era a única que tinha CABEÇALHO: dentro da dobra as quatro
   colunas estavam sem rótulo, e o número do meio não dizia que era percentil.
   Apagar a de fora sem trazer o `thead` teria piorado a leitura.

   O DEFEITO REAL, achado ao escrever o teste: `A.baseCurta` e `A.pct` são
   lidos sem verificar `A`. A guarda da v131 deixa passar o caso "apetite
   ausente, regime presente" — e o `try/catch` do renderAll então zera o painel
   INTEIRO. Ciclo, Pressão e Live somem juntos, em silêncio. É o modo de falha
   que o render isolado deveria evitar e que, aqui, ele escondia.

   Este harness EXECUTA `blocoApetite` com talos, em vez de reler o código —
   metade das vezes o defeito é meu erro de leitura, e a outra metade só
   aparece rodando. Foi assim que este apareceu.

   Uso:  node harness-v138.js index.html
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

/* ---- montagem: blocoApetite roda de verdade, com talos ------------------ */
const guardado = {};
const localStorage = {
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(guardado,k)?guardado[k]:null; },
  setItem:function(k,v){ guardado[k]=String(v); },
  removeItem:function(k){ delete guardado[k]; }
};
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
  return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]; }); }

let montar;
try{
  montar = new Function("S", "calcularRegime", "estadoDeFluxo", "estadoDeRegime",
                        "blocoLiquidacoes", "localStorage", "esc",
    [ declDe("dobra"), declDe("blocoApetite"), "return blocoApetite;" ].join("\n"));
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

const CORES = { cor:"#33FF6E", nome:"NEUTRO" };
function rodar(A, R, liq){
  const S = { market: { apetite: A, liquidacoes: liq || null } };
  return montar(S,
    function(){ return R; },
    function(){ return CORES; },
    function(){ return CORES; },
    function(){ return liq ? '<details data-dobra="liquidacoes"></details>' : ""; },
    localStorage, esc)();
}
/* v139 — a partir daqui o blocoLiquidacoes REAL entra na montagem: o talo
   escondia justamente o caminho que estava com defeito. */
let montarReal;
try{
  montarReal = new Function("S", "calcularRegime", "estadoDeFluxo", "estadoDeRegime",
                            "localStorage", "esc",
    [ declDe("dobra"), declDe("blocoLiquidacoes"), declDe("blocoApetite"),
      "return blocoApetite;" ].join("\n"));
}catch(e){ console.error("FALHA AO MONTAR (real):", e.message); process.exit(1); }

function rodarChave(A, R, liq, chave){
  const S = { market: { apetite: A, liquidacoes: liq || null },
              apiKeys: { coinalyze: chave } };
  return montarReal(S,
    function(){ return R; },
    function(){ return CORES; },
    function(){ return CORES; },
    localStorage, esc)();
}

const A_CHEIO = { valor:62, componentes:3, baseCurta:false,
  pct:{cvd:71, oi:48, funding:22}, bruto:{cvd:1.23, oi:-0.44, funding:0.000123} };
const R_CHEIO = { valor:60, alta:3, itens:[
  {rot:"Preço vs MA200", voto:1, v:42.1},
  {rot:"Preço vs MA100", voto:1, v:18.4},
  {rot:"Preço vs MA50",  voto:-1, v:-3.2}] };

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function conta(s, agulha){ return s.split(agulha).length - 1; }

console.log("\nBLOCO A — a tabela aparece UMA vez");

t("os três componentes são desenhados uma vez só", ()=>{
  /* falha contra a v137: lá `CVD 24h` sai duas vezes — dentro da dobra e na
     cópia solta abaixo dela. */
  const h = rodar(A_CHEIO, R_CHEIO, null);
  eq(conta(h, "CVD 24h"), 1, "CVD 24h:");
  eq(conta(h, "Open interest 4h"), 1, "open interest:");
  eq(conta(h, "Funding invertido"), 1, "funding:");
});

t("há UMA tabela, e ela está DENTRO da dobra", ()=>{
  const h = rodar(A_CHEIO, R_CHEIO, null);
  eq(conta(h, "<table"), 1, "tabelas:");
  const iCorpo = h.indexOf("dobra-corpo");
  const iTab   = h.indexOf("<table");
  if(iTab < iCorpo) throw new Error("a tabela está fora do corpo da dobra");
});

t("o CABEÇALHO da tabela sobreviveu à remoção", ()=>{
  /* a cópia solta era a única com `thead`: apagar sem trazer o cabeçalho
     deixaria quatro colunas sem rótulo e o percentil sem nome. */
  const h = rodar(A_CHEIO, R_CHEIO, null);
  eq(conta(h, "<thead"), 1, "cabeçalhos:");
  ["Componente","bruto","percentil","leitura"].forEach(function(col){
    if(h.indexOf(">"+col+"<") === -1) throw new Error("coluna sem rótulo: " + col);
  });
});

t("o aviso de base curta aparece uma vez, dentro da dobra", ()=>{
  const A = Object.assign({}, A_CHEIO, { baseCurta:true });
  const h = rodar(A, R_CHEIO, null);
  eq(conta(h, "Base curta."), 1, "avisos:");
  if(h.indexOf("Base curta.") < h.indexOf("dobra-corpo"))
    throw new Error("o aviso está fora da dobra que mostra os percentis");
});

t("sem base curta, o aviso não aparece", ()=>{
  eq(conta(rodar(A_CHEIO, R_CHEIO, null), "Base curta."), 0, "avisos:");
});

console.log("\nBLOCO B — o painel não morre inteiro por causa de uma fonte");

t("APETITE AUSENTE, REGIME PRESENTE: o painel continua de pé", ()=>{
  /* falha contra a v137 com TypeError: lá `A.pct` é lido num objeto nulo,
     o renderAll engole a exceção e Ciclo, Pressão e Live somem juntos. */
  let h;
  try{ h = rodar(null, R_CHEIO, null); }
  catch(e){ throw new Error("estourou: " + e.message); }
  if(h.indexOf("Ciclo") === -1) throw new Error("o Ciclo sumiu junto com o apetite");
  if(h.indexOf("Pressão") !== -1) throw new Error("a Pressão apareceu sem dado de apetite");
});

t("APETITE AUSENTE, SÓ LIQUIDAÇÕES: o painel continua de pé", ()=>{
  let h;
  try{ h = rodar(null, null, { proporcaoVendidos: 71 }); }
  catch(e){ throw new Error("estourou: " + e.message); }
  if(h.indexOf('data-dobra="liquidacoes"') === -1) throw new Error("a Live sumiu");
});

t("TUDO AUSENTE: devolve vazio, sem inventar painel", ()=>{
  eq(rodar(null, null, null).trim(), "", "vazio:");
});

t("REGIME AUSENTE, APETITE PRESENTE: só a Pressão", ()=>{
  const h = rodar(A_CHEIO, { valor:null }, null);
  if(h.indexOf("Ciclo") !== -1) throw new Error("o Ciclo apareceu sem valor de regime");
  if(h.indexOf("Pressão") === -1) throw new Error("a Pressão sumiu");
});

console.log("\nBLOCO C — o que já valia continua valendo");

t("as duas dobras nascem FECHADAS", ()=>{
  /* o teste ingênuo `h.indexOf(" open")` casa com " open interest" no texto
     explicativo e passa/falha por motivo nenhum — mesma família do
     `Number(null)`. A abertura mora na TAG, então é lá que se lê. */
  const h = rodar(A_CHEIO, R_CHEIO, null);
  eq(/<details[^>]*\sopen>/.test(h), false, "alguma nasce aberta:");
  eq(conta(h, "<details"), 2, "quantas dobras:");
});

t("os itens do regime continuam na dobra Ciclo", ()=>{
  const h = rodar(A_CHEIO, R_CHEIO, null);
  if(h.indexOf("Preço vs MA200") === -1) throw new Error("os itens sumiram");
  eq(conta(h, "Preço vs MA200"), 1, "itens duplicados:");
});

t("o aviso de que não é previsão continua no texto", ()=>{
  const h = rodar(A_CHEIO, R_CHEIO, null);
  if(h.indexOf("não é previsão") === -1) throw new Error("o aviso sumiu");
});

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.138/.test(m[1])) throw new Error("continua a v138: " + m[1]);
});

t("o herói da v137 continua enxuto", ()=>{
  const hero = semComentarios(declDe("renderHero"));
  const cartao = hero.slice(hero.indexOf("wrap.innerHTML"), hero.indexOf("`;", hero.indexOf("wrap.innerHTML")));
  if(/REG\.itens\.map/.test(cartao)) throw new Error("os itens voltaram ao herói");
  if(/\$\{linhasMA\}/.test(cartao)) throw new Error("as médias voltaram ao herói");
});

console.log("\nBLOCO D — v139: a linha Live existe mesmo sem número");

t("SEM CHAVE: a linha aparece e diz por quê", ()=>{
  /* falha contra a v138: lá `blocoLiquidacoes` devolve "" e o painel some sem
     linha de log, sem entrada em FALHAS, sem nada no diagnóstico. Medido no
     estado real de 23/08: seis painéis desenham, Live não, e não havia como
     saber que a causa era a chave ausente. */
  const h = rodarChave(A_CHEIO, R_CHEIO, null, "");
  if(h.indexOf('data-dobra="liquidacoes"') === -1)
    throw new Error("a linha Live continua sumindo");
  if(h.indexOf("falta a chave") === -1)
    throw new Error("a linha não diz que o motivo é a chave ausente");
  if(h.indexOf("coinalyze.net/account/api-key/") === -1)
    throw new Error("não diz onde pegar a chave");
});

t("COM CHAVE E SEM NÚMERO: o motivo é OUTRO, e é dito", ()=>{
  /* chave salva + coleta falhada não pode ser confundido com chave ausente:
     um se resolve colando a chave, o outro não. */
  const h = rodarChave(A_CHEIO, R_CHEIO, null, "abc12345");
  if(h.indexOf("a coleta falhou") === -1)
    throw new Error("não distingue coleta falhada de chave ausente");
  if(h.indexOf("falta a chave") !== -1)
    throw new Error("manda colar chave que já está colada");
});

t("SEM NÚMERO, NENHUM NÚMERO É INVENTADO", ()=>{
  /* a linha declara o estado; ela não simula leitura. Nada de 0%, nada de
     barra vazia com cara de medição. */
  const h = rodarChave(A_CHEIO, R_CHEIO, null, "");
  const i = h.indexOf('data-dobra="liquidacoes"');
  const trecho = h.slice(i);
  if(/VENDIDOS SENDO ESTOURADOS|COMPRADOS SENDO ESTOURADOS|EQUILIBRADO/.test(trecho))
    throw new Error("inventou veredito sem dado");
  if(/\d+% /.test(trecho.slice(0, 400)))
    throw new Error("inventou proporção sem dado");
});

t("COM NÚMERO: nada mudou", ()=>{
  const h = rodarChave(A_CHEIO, R_CHEIO, { proporcaoVendidos: 71, longs: 1e6, shorts: 2.4e6, total: 3.4e6, pctProporcao: 88 }, "abc12345");
  if(h.indexOf("VENDIDOS SENDO ESTOURADOS") === -1)
    throw new Error("o caminho normal quebrou");
  if(h.indexOf("falta a chave") !== -1 || h.indexOf("a coleta falhou") !== -1)
    throw new Error("mostrou aviso tendo número");
});

t("TUDO AUSENTE continua devolvendo vazio — com a função REAL", ()=>{
  /* a linha Live existir sem número não pode fazer o painel inteiro nascer
     num estado sem dado nenhum (o pré-visualizador, por exemplo). */
  eq(rodarChave(null, null, null, "").trim(), "", "vazio:");
  eq(rodarChave(null, null, null, "abc12345").trim(), "", "vazio com chave:");
});

t("a linha nasce FECHADA como as outras", ()=>{
  const h = rodarChave(A_CHEIO, R_CHEIO, null, "");
  if(/<details[^>]*\sopen>/.test(h)) throw new Error("alguma nasce aberta");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v139 verde — nenhum painel some sem dizer por quê.");

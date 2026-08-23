/* =====================================================================
   harness-v144.js — o Salvar da Coinalyze CLICA de verdade
   =====================================================================
   Só ligação de interface. MODEL_VERSION continua m12, score intocado.

   O DEFEITO: o bloco inteiro da Coinalyze — status, registro do ouvinte e a
   chamada inicial — estava DENTRO do corpo do ouvinte de clique do Salvar do
   CryptoQuant. O `btnSaveCzKey` só ganhava ouvinte depois de alguém clicar no
   Salvar de uma chave paga que o Jorge não tem. Na prática: nunca.

   POR QUE SOBREVIVEU A TRÊS BUILDS: eu li este trecho na v139 para escrever a
   mensagem "falta a chave", e de novo na v143. Nas duas vezes li o CONTEÚDO
   do bloco e não a POSIÇÃO dele. Somado a isso, o `if(bt)` transformava a
   ausência em silêncio e o status ficava com texto VAZIO — não havia nem o
   "sem chave" para estranhar.

   POR ISSO ESTE HARNESS CLICA. Verificação por leitura já falhou duas vezes
   no mesmo trecho; defeito de posição não se confere lendo.

   Uso:  node harness-v144.js index.html
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");

/* recorta a região das três chaves e roda com um DOM de mentira */
const iReg = HTML.indexOf('document.getElementById("btnSaveCgKey")');
const fReg = HTML.indexOf("// consentimento explícito pro proxy CORS");
if(iReg === -1 || fReg === -1) throw new Error("não achei a região das chaves");
const REGIAO = HTML.slice(iReg, fReg);

function montar(){
  const els = {};
  const cliques = {};
  function el(id){
    if(els[id]) return els[id];
    return els[id] = {
      id, value:"", placeholder:"", textContent:"", checked:false,
      addEventListener(ev, fn){ (cliques[id] = cliques[id] || {})[ev] = fn; }
    };
  }
  ["btnSaveCgKey","btnSaveCqKey","btnSaveCzKey","cgApiKeyInput","cqApiKeyInput",
   "czApiKeyInput","cgKeyStatus","cqKeyStatus","czKeyStatus","chkProxyComChave",
   "proxyChaveAviso","fredKeyStatus"].forEach(el);

  const S = { apiKeys: { coingecko:"", cryptoquant:"", coinalyze:"" } };
  const salvo = { vezes: 0 };
  const erros = [];
  const document = { getElementById: id => els[id] || null };
  const console2 = { error: (...a)=>erros.push(a.join(" ")), log(){}, warn(){} };

  /* `renderCgKeyStatus` e `renderCqKeyStatus` são declaradas ANTES da região
     recortada. Injetá-las como talos é o mínimo para o trecho rodar isolado —
     e elas não fazem parte do que está sendo testado. */
  new Function("document","S","saveState","refreshMarketData","console","localStorage",
               "renderCgKeyStatus","renderCqKeyStatus","renderFredKeyStatus",
               REGIAO)(
    document, S,
    function(){ salvo.vezes++; },
    function(){ return { catch:function(){} }; },
    console2,
    { getItem:()=>null, setItem(){}, removeItem(){} },
    function(){ els["cgKeyStatus"].textContent = S.apiKeys.coingecko ? "salva" : "sem"; },
    function(){ els["cqKeyStatus"].textContent = S.apiKeys.cryptoquant ? "salva" : "sem"; },
    function(){});

  return { els, cliques, S, salvo, erros,
           clicar: id => { const h = cliques[id] && cliques[id].click;
                           if(!h) throw new Error("o botão " + id + " NÃO tem ouvinte de clique");
                           h({}); } };
}

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — o botão responde SEM ninguém clicar em outro antes");

t("o Salvar da Coinalyze tem ouvinte assim que a página monta", ()=>{
  /* ESTE é o teste que falha contra a v143: lá o ouvinte só nascia dentro do
     clique do CryptoQuant. */
  const a = montar();
  if(!a.cliques["btnSaveCzKey"] || !a.cliques["btnSaveCzKey"].click)
    throw new Error("o botão nasce SEM ouvinte — colar a chave e apertar não faz nada");
});

t("colar e apertar Salvar grava a chave no estado", ()=>{
  const a = montar();
  a.els["czApiKeyInput"].value = "  chave-gratuita-abc123  ";
  a.clicar("btnSaveCzKey");
  eq(a.S.apiKeys.coinalyze, "chave-gratuita-abc123", "chave gravada:");
  if(a.salvo.vezes < 1) throw new Error("não chamou saveState");
});

t("o campo é limpo e o placeholder confirma", ()=>{
  const a = montar();
  a.els["czApiKeyInput"].value = "abc12345";
  a.clicar("btnSaveCzKey");
  eq(a.els["czApiKeyInput"].value, "", "campo limpo:");
  if(!/salva \(oculta\)/.test(a.els["czApiKeyInput"].placeholder))
    throw new Error("o placeholder não confirma que salvou");
});

t("o status ao lado do campo é escrito NA MONTAGEM", ()=>{
  /* na v143 ele ficava vazio, e texto vazio não dá o que estranhar: foi metade
     do motivo de o defeito durar. */
  const a = montar();
  eq(a.els["czKeyStatus"].textContent, "sem chave — liquidações desligadas", "status inicial:");
  a.els["czApiKeyInput"].value = "abc12345";
  a.clicar("btnSaveCzKey");
  if(!/chave salva/.test(a.els["czKeyStatus"].textContent))
    throw new Error("o status não muda depois de salvar");
});

console.log("\nBLOCO B — as outras duas chaves continuam funcionando");

t("CryptoQuant continua salvando", ()=>{
  const a = montar();
  a.els["cqApiKeyInput"].value = "cq-abc123";
  a.clicar("btnSaveCqKey");
  eq(a.S.apiKeys.cryptoquant, "cq-abc123", "cryptoquant:");
});

t("clicar no CryptoQuant NÃO registra o ouvinte da Coinalyze duas vezes", ()=>{
  /* era o efeito colateral do aninhamento: cada clique no cq empilhava mais
     um ouvinte no cz, e um dia a chave seria gravada N vezes por clique. */
  const a = montar();
  a.clicar("btnSaveCqKey");
  a.clicar("btnSaveCqKey");
  a.els["czApiKeyInput"].value = "abc12345";
  a.clicar("btnSaveCzKey");
  eq(a.S.apiKeys.coinalyze, "abc12345", "coinalyze:");
  eq(a.salvo.vezes, 3, "saveState chamado uma vez por clique:");
});

t("CoinGecko continua salvando", ()=>{
  const a = montar();
  a.els["cgApiKeyInput"].value = "CG-xyz";
  a.clicar("btnSaveCgKey");
  eq(a.S.apiKeys.coingecko, "CG-xyz", "coingecko:");
});

console.log("\nBLOCO C — a ausência para de ser silenciosa");

t("botão que não existe GRITA no console", ()=>{
  /* o `if(bt)` sozinho é o que transforma defeito de montagem em silêncio. */
  const semBotao = REGIAO;
  if(!/btnSaveCzKey não existe/.test(semBotao))
    throw new Error("a ausência do botão continua muda");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.143/.test(m[1])) throw new Error("continua a v143: " + m[1]);
});
t("o bloco da Coinalyze NÃO está mais dentro de outro ouvinte", ()=>{
  /* medir por PROFUNDIDADE de chaves, não por fatia entre duas âncoras: na
     v143 o `renderCqKeyStatus();` aparecia logo no início do handler e a
     fatia terminava antes do trecho aninhado — o teste passava contra a build
     defeituosa. Âncora frágil de novo, e de novo no meu teste. */
  const iCq = HTML.indexOf('document.getElementById("btnSaveCqKey")');
  /* a âncora é a DECLARAÇÃO da função de status: ela é a primeira coisa do
     bloco da Coinalyze, sem chave própria antes. Ancorar no `{ const bt =`
     daria profundidade 1 mesmo estando correto — o bloco tem chave própria. */
  const iCz = HTML.indexOf("function renderCzKeyStatus()", iCq);
  if(iCq === -1 || iCz === -1) throw new Error("não achei os dois botões");
  let prof = 0, dentroStr = null, escapa = false;
  for(let i = iCq; i < iCz; i++){
    const c = HTML[i];
    if(escapa){ escapa = false; continue; }
    if(c === "\\"){ escapa = true; continue; }
    if(dentroStr){ if(c === dentroStr) dentroStr = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ dentroStr = c; continue; }
    if(c === "{") prof++; else if(c === "}") prof--;
  }
  if(prof > 0)
    throw new Error("o registro da Coinalyze está " + prof + " nível(is) aninhado dentro do handler do CryptoQuant");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v144 verde — apertar Salvar salva.");

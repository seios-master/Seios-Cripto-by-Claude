/* =====================================================================
   harness-v130.js — as variáveis que DESCREVEM entram no sistema
   =====================================================================
   MODEL_VERSION continua m12. Nada vota. Nenhum peso muda.

   O PROBLEMA, medido em 23/08: o sistema coleta 31 indicadores e NENHUM
   descreve alta e baixa. Na alta de 69.386 → 77.704 (+8.318 dólares), as que
   mais oscilaram foram book imbalance (146 pontos, terminou NEGATIVO em −49),
   hash rate (81, régua quebrada), taker (+42 → −4, CONTRA a alta), Fear &
   Greed (→ −44, CONTRA), e tendência/média móvel/momentum — que são o preço
   com outro nome. Oito não se mexeram: cobre, euro, petróleo, put/call,
   dólar, inflação, juros, liquidez.

   O TESTE (23/08, 2.999 horas, defasagem ZERO, com corte de robustez das
   últimas 72h — o mesmo que matou o OI em 21/08):

     variável                  estudo  reserva  sem 72h
     Vendidos − Comprados      +0,663   +0,626   +0,539
     Open interest 1h          +0,590   +0,638   +0,573
     Proporção de vendidos     +0,515   +0,487   +0,502
     Liquidação de vendidos    +0,469   +0,548   +0,460
     Liquidação de comprados   −0,553   −0,360   −0,347

   Separação direta: proporção de vendidos em 71,4% nas altas contra 32,6%
   nas baixas, t = 18,46.

   REPROVADOS: funding (r = 0,004), long/short (0,007), volume e liquidação
   TOTAL (invertem entre as fases). A agressão PASSOU e fica fora por decisão
   declarada antes de medir: é quase a definição de preço subindo.

   Uso:  node harness-v130.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v129 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — a coleta usa PROPORÇÃO, não valor bruto");

t("a proporção é calculada, e o bruto é guardado ao lado", ()=>{
  /* em dia calmo o total é de dezenas de milhões; em dia de pânico, bilhões.
     Valor bruto não é comparável entre regimes — foi a lição do CVD (v124). */
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(!/proporcaoVendidos/.test(f)) throw new Error("não calcula a proporção");
  if(!/longs:|shorts:/.test(f)) throw new Error("não guarda o bruto para auditoria");
});

t("a hora em formação é descartada", ()=>{
  /* regra da v110: o último ponto de uma série intradiária está incompleto e
     sempre parece menor — viés de direção fixa. */
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(!/hist\.pop\(\)/.test(f)) throw new Error("a hora em formação entra na conta");
});

t("sem chave, é silêncio — não é falha", ()=>{
  /* a Coinalyze é opcional: quem não tem chave não deve ver erro na tela */
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(!/if\(!chave\) return/.test(f)) throw new Error("sem chave gera erro");
});

t("a coleta não derruba a rodada", ()=>{
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(!/catch/.test(f)) throw new Error("sem catch");
});

console.log("\nBLOCO B — os cortes vêm da MEDIÇÃO, não de julgamento");

t("os cortes do painel são 65 e 40, e o motivo está escrito", ()=>{
  /* 71,4% nas altas e 32,6% nas baixas: os cortes ficam entre as duas médias,
     não em números redondos escolhidos por gosto. */
  const f = semComentarios(declDe("blocoLiquidacoes"));
  if(!/>= 65/.test(f) || !/<= 40/.test(f))
    throw new Error("os cortes não são os medidos");
  const bruto = declDe("blocoLiquidacoes");
  if(!/71,4|71\.4/.test(bruto)) throw new Error("a medição não está declarada no código");
});

t("o painel mostra o percentil dos últimos 7 dias", ()=>{
  const f = semComentarios(declDe("blocoLiquidacoes"));
  if(!/pctProporcao/.test(f)) throw new Error("não mostra o percentil");
});

console.log("\nBLOCO C — o que ficou de fora, e por quê");

t("FUNDING E LONG/SHORT não entram nas liquidações", ()=>{
  /* funding r = 0,004 e long/short r = 0,007 — zero perfeito contra o retorno
     do mesmo período. Não descrevem o momento. */
  const f = semComentarios(declDe("coletarLiquidacoes")) + semComentarios(declDe("blocoLiquidacoes"));
  if(/fundingRate|lsr|longShortRatio/.test(f))
    throw new Error("entrou uma variável que reprovou no teste de descrição");
});

t("a AGRESSÃO fica de fora, apesar de ter passado", ()=>{
  /* passou com +0,397, mas é quase a definição de preço subindo: incluí-la
     faria o medidor dizer "está subindo" quando está subindo. Decisão
     declarada ANTES de medir. */
  const f = semComentarios(declDe("blocoLiquidacoes"));
  if(/agressao|takerRatio|agr\b/.test(f))
    throw new Error("a agressão entrou — ela é o preço com outro nome");
});

t("o painel declara que NÃO é previsão", ()=>{
  const f = semComentarios(declDe("blocoLiquidacoes"));
  if(!/não é previsão|não prevê/i.test(f))
    throw new Error("o painel não separa descrição de previsão");
  if(!/170|defasagem zero/i.test(f))
    throw new Error("a evidência não está citada na tela");
});

console.log("\nBLOCO D — a chave, e o estado");

t("a chave da Coinalyze existe no estado E na exportação", ()=>{
  /* nas duas: sem a segunda, o backup perderia a chave silenciosamente */
  const n = (HTML.match(/coinalyze:""/g) || []).length;
  if(n < 2) throw new Error("a chave está em " + n + " estrutura(s), deveria estar em 2");
});

t("a chave é lida de S.apiKeys, onde as outras vivem", ()=>{
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(!/S\.apiKeys && S\.apiKeys\.coinalyze/.test(f))
    throw new Error("a chave não vem de S.apiKeys");
});

t("a chave vai pela rota própria, não direto do navegador", ()=>{
  /* a Coinalyze não devolve cabeçalho de origem cruzada: o Safari bloqueia a
     chamada direta com "Load failed" (medido em 20/08). */
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(!/\/api\/coinalyze/.test(f)) throw new Error("chamada direta — o CORS bloqueia");
});

console.log("\nBLOCO E — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("as liquidações NÃO votam no score", ()=>{
  const f = semComentarios(declDe("coletarLiquidacoes"));
  if(/setAuto\(/.test(f)) throw new Error("virou indicador votante");
  if(/excludeFromScore/.test(f)) throw new Error("mexe em direito de voto");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.129/.test(m[1])) throw new Error("continua a v129: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v130 verde — as que descrevem entram; as que reprovaram ficam fora.");

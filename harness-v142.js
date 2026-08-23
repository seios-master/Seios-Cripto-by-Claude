/* =====================================================================
   harness-v142.js — contar as configurações de cobertura
   =====================================================================
   Só diagnóstico. MODEL_VERSION continua m12, score intocado.

   A PENDÊNCIA, declarada no congelamento do m12: "quedas do GDELT mudam a
   cobertura, e com ela o amortecimento. Vale um painel que conte quantas
   leituras têm cada configuração."

   POR QUE IMPORTA: o agregador amortece o score na direção de zero pela massa
   ausente, de propósito. O mesmo mercado produz scores diferentes conforme as
   fontes respondem — e a série das 777 não registrava isso em lugar nenhum.

   O TESTE RODA COM A SÉRIE REAL do export de 23/08, não com talo inventado.
   Um talo escrito por mim teria a forma que eu ACHO que os snapshots têm; foi
   assim que o `pesosEfetivos` inexistente sobreviveu builds inteiras.

   Uso:  node harness-v142.js index.html
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");
const EXPORT = "/mnt/user-data/uploads/seios-btc-export-2026-08-23.json";

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
  if(i === -1) throw new Error("sem função " + nome + " (é a v141 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const guardado = {};
const localStorage = {
  getItem:k=>Object.prototype.hasOwnProperty.call(guardado,k)?guardado[k]:null,
  setItem:(k,v)=>{guardado[k]=String(v);}, removeItem:k=>{delete guardado[k];}
};
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

const MODELO = (/const MODEL_VERSION = "([^"]+)"/.exec(HTML) || [])[1];
let API;
try{
  API = new Function("localStorage","esc","separarPorModelo",
    [ declDe("dobra"), declDe("configuracoesDeCobertura"), declDe("blocoCobertura"),
      "return { configuracoesDeCobertura, blocoCobertura };" ].join("\n"))(
    localStorage, esc,
    /* o filtro por modelo é da casa; aqui ele é reproduzido pelo campo, para
       que o teste continue valendo quando o MODEL_VERSION mudar */
    function(snaps){
      const atual = [], legado = [];
      (snaps||[]).forEach(function(s){ (s.modelo === MODELO ? atual : legado).push(s); });
      return { atual: atual, legado: legado };
    });
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let SERIE = null;
try{ SERIE = JSON.parse(fs.readFileSync(EXPORT,"utf8"))._serie; }catch(e){}

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — a conta, com a série REAL de 23/08");

t("só o modelo vigente entra na conta", ()=>{
  if(!SERIE) throw new Error("export não encontrado");
  const cfg = API.configuracoesDeCobertura(SERIE);
  const doModelo = SERIE.filter(s=>s.modelo === MODELO).length;
  eq(cfg.total, doModelo, "leituras contadas:");
  if(cfg.total === SERIE.length)
    throw new Error("contou leituras de modelo anterior como progresso");
});

t("encontra QUATRO configurações na série real", ()=>{
  const cfg = API.configuracoesDeCobertura(SERIE);
  eq(cfg.grupos.length, 4, "configurações:");
  eq(cfg.completas, 10, "leituras completas:");
  eq(cfg.incompletas, 19, "leituras incompletas:");
});

t("o GDELT é apontado como a causa", ()=>{
  const cfg = API.configuracoesDeCobertura(SERIE);
  eq(cfg.porFonte["gdelt"], 17, "leituras sem o tom do GDELT:");
  eq(cfg.porFonte["gdelt volume"], 6, "leituras sem o volume do GDELT:");
});

t("a configuração mais comum vem primeiro", ()=>{
  const cfg = API.configuracoesDeCobertura(SERIE);
  eq(cfg.grupos[0].chave, "gdelt", "maior grupo:");
  eq(cfg.grupos[0].n, 13, "tamanho:");
  for(let i=1;i<cfg.grupos.length;i++)
    if(cfg.grupos[i].n > cfg.grupos[i-1].n) throw new Error("fora de ordem");
});

t("a faixa de cobertura de cada grupo é a OBSERVADA", ()=>{
  /* duas ausências diferentes podem dar a mesma porcentagem: o grupo é o
     conjunto de fontes fora, e a cobertura entra como faixa. */
  const cfg = API.configuracoesDeCobertura(SERIE);
  const g = cfg.grupos.find(x=>x.chave === "(nenhuma)");
  eq(Math.round(g.cobMin*1000)/10, 73.3, "cobertura mínima das completas:");
  eq(Math.round(g.cobMax*1000)/10, 73.3, "cobertura máxima das completas:");
  const p = cfg.grupos.find(x=>x.chave === "gdelt + gdelt volume");
  eq(Math.round(p.cobMin*1000)/10, 66.7, "pior configuração:");
});

t("o score médio é por grupo, e não some quando falta", ()=>{
  const cfg = API.configuracoesDeCobertura(SERIE);
  const c = cfg.grupos.find(x=>x.chave === "(nenhuma)");
  if(c.scoreMedio === null) throw new Error("média perdida");
  if(Math.abs(c.scoreMedio - 8.16) > 0.05)
    throw new Error("média das completas mudou: " + c.scoreMedio.toFixed(2));
  const semScore = API.configuracoesDeCobertura(
    [{modelo:MODELO, falhas:[], cobertura:0.7}]);
  eq(semScore.grupos[0].scoreMedio, null, "sem score:");
});

console.log("\nBLOCO B — a linha diz a resposta fechada");

t("o resumo carrega quantas configurações e quantas completas", ()=>{
  const h = API.blocoCobertura(API.configuracoesDeCobertura(SERIE));
  if(h.indexOf("4 configurações") === -1) throw new Error("não diz quantas configurações");
  if(h.indexOf("10 de 29") === -1) throw new Error("não diz quantas completas");
  if(h.indexOf("gdelt fora em 17") === -1) throw new Error("não aponta a fonte culpada");
});

t("o resumo aparece FORA do corpo — fechada, informa", ()=>{
  const h = API.blocoCobertura(API.configuracoesDeCobertura(SERIE));
  if(h.indexOf("4 configurações") > h.indexOf("dobra-corpo"))
    throw new Error("o resumo está dentro do corpo");
});

t("a coluna do score médio vem com o AVISO de que não é evidência", ()=>{
  /* sem isto o painel vira a tabela de calibração de novo: números que
     parecem separar grupos, sem poder estatístico nenhum. */
  const h = API.blocoCobertura(API.configuracoesDeCobertura(SERIE));
  if(h.indexOf("não é evidência de nada") === -1)
    throw new Error("o aviso sumiu — o painel volta a mentir por formatação");
  if(!/sobrepost/.test(h)) throw new Error("não explica a sobreposição das janelas");
  if(h.indexOf("v109") === -1) throw new Error("não cita a medição que estabeleceu isso");
});

t("sem leituras: a linha existe e diz que está vazia", ()=>{
  const h = API.blocoCobertura(API.configuracoesDeCobertura([]));
  if(h.indexOf("data-dobra=\"cobertura\"") === -1) throw new Error("a linha some");
  if(h.indexOf("sem leituras gravadas") === -1) throw new Error("não diz por quê");
  if(/NaN|undefined/.test(h)) throw new Error("inventou número: " + h.slice(0,200));
});

t("uma configuração só não vira plural", ()=>{
  const h = API.blocoCobertura(API.configuracoesDeCobertura(
    [{modelo:MODELO, falhas:[], cobertura:0.73, score:5},
     {modelo:MODELO, falhas:[], cobertura:0.73, score:7}]));
  if(h.indexOf("1 configuração") === -1) throw new Error("plural errado");
});

console.log("\nBLOCO C — as liquidações param de sumir do diagnóstico");

t("o diagnóstico distingue os TRÊS estados da Coinalyze", ()=>{
  /* falha contra a v141: lá o diagnóstico só imprimia falhas, e
     "nenhuma falha nesta rodada" era compatível com "funcionou" E com
     "a chave nem estava lá". */
  /* o texto do diagnóstico é montado em `relatorioTexto`, não em
     `copiarDiagnostico` — a segunda só copia. Errar a âncora aqui faria o
     teste passar/falhar pelo motivo errado. */
  const d = semComentarios(declDe("relatorioTexto"));
  if(d.indexOf("LIQUIDAÇÕES (Coinalyze)") === -1)
    throw new Error("o diagnóstico continua calado sobre as liquidações");
  if(!/DESLIGADA/.test(d)) throw new Error("não distingue chave ausente");
  if(!/chave salva, mas a coleta/.test(d)) throw new Error("não distingue coleta falhada");
  if(!/% vendidos/.test(d)) throw new Error("não imprime o valor quando existe");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.141/.test(m[1])) throw new Error("continua a v141: " + m[1]);
});
t("o painel não escreve no estado nem no score", ()=>{
  const f = semComentarios(declDe("configuracoesDeCobertura")) +
            semComentarios(declDe("blocoCobertura"));
  if(/S\.motors|saveState\(|S\.market\s*=|MODEL_VERSION\s*=/.test(f))
    throw new Error("o painel mexe no sistema");
});
t("a linha é desenhada, e falha sozinha", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf('id="coberturaBar"') === -1) throw new Error("sem container");
  if(!/\["cobertura", renderCobertura\]/.test(limpo))
    throw new Error("renderCobertura não entra no renderAll");
  const r = semComentarios(declDe("renderCobertura"));
  if(!/catch/.test(r)) throw new Error("sem proteção: pode derrubar a tela");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v142 verde — a configuração da série passa a ser contada, não descoberta no fim.");

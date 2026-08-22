/* =====================================================================
   harness-v129.js — o GDELT para de derrubar a cobertura
   =====================================================================
   MODEL_VERSION continua m12. Nenhum peso, fórmula ou voto muda.

   O DIAGNÓSTICO, medido em 21/08 direto na rota:
     {"error":"GDELT limitou a taxa (429) nas 2 tentativas",
      "tentativas":["1:429@10627ms","2:429@10299ms"]}
   Limite POR IP — e o IP é da Vercel, compartilhado. Não importa quantas
   vezes NÓS chamamos; importa quantas vezes o datacenter chama. Por isso o
   cache de 4h da v125 não resolveu, e por isso o ULTIMO_BOM em memória do
   servidor quase nunca serve: cada requisição pode cair numa instância nova.

   O QUE ESTAVA EM JOGO: quando o GDELT cai, dois indicadores saem da conta e
   a cobertura vai de ~73% para ~67%. O modelo amortece o score na direção de
   zero. O MESMO mercado produz scores diferentes conforme a fonte responde.
   Em 777 observações isso é medir a média de dois instrumentos.

   Uso:  node harness-v129.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v128 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
/* localStorage falso, para exercitar a guarda fora do navegador */
const guardado = {};
const localStorage = {
  getItem: function(k){ return Object.prototype.hasOwnProperty.call(guardado,k) ? guardado[k] : null; },
  setItem: function(k,v){ guardado[k] = String(v); },
  removeItem: function(k){ delete guardado[k]; }
};
let API;
try{
  API = new Function("localStorage", [
    "const GDELT_GUARDA_MS = " + (/const GDELT_GUARDA_MS = ([^;]+);/.exec(HTML)||[0,"12*3600*1000"])[1] + ";",
    declDe("guardarGdelt"), declDe("lerGuardaGdelt"),
    "return { guardarGdelt, lerGuardaGdelt, GDELT_GUARDA_MS };"
  ].join("\n"))(localStorage);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — a guarda no cliente");

t("guarda e devolve o valor", ()=>{
  API.guardarGdelt("tom", -2.65);
  const g = API.lerGuardaGdelt("tom");
  eq(g.valor, -2.65, "valor:");
});

t("tom e volume não se sobrescrevem", ()=>{
  API.guardarGdelt("tom", -2.65);
  API.guardarGdelt("volume", 25);
  eq(API.lerGuardaGdelt("tom").valor, -2.65, "tom:");
  eq(API.lerGuardaGdelt("volume").valor, 25, "volume:");
});

t("ALÉM DE 12 HORAS, RECUSA — dado velho demais volta a ser falha honesta", ()=>{
  localStorage.setItem("seios_gdelt_tom",
    JSON.stringify({ v:-2.65, em: Date.now() - 13*3600*1000 }));
  eq(API.lerGuardaGdelt("tom"), null, "13 horas:");
  localStorage.setItem("seios_gdelt_tom",
    JSON.stringify({ v:-2.65, em: Date.now() - 11*3600*1000 }));
  if(!API.lerGuardaGdelt("tom")) throw new Error("11 horas deveria servir");
});

t("a idade vem junto, e legível", ()=>{
  localStorage.setItem("seios_gdelt_tom",
    JSON.stringify({ v:-2.65, em: Date.now() - 30*60*1000 }));
  eq(API.lerGuardaGdelt("tom").idadeTexto, "30min", "meia hora:");
  localStorage.setItem("seios_gdelt_tom",
    JSON.stringify({ v:-2.65, em: Date.now() - 3*3600*1000 }));
  eq(API.lerGuardaGdelt("tom").idadeTexto, "3.0h", "três horas:");
});

t("lixo no armazenamento não vira valor", ()=>{
  /* um JSON corrompido virando 0 daria "tom neutro" onde há silêncio */
  localStorage.setItem("seios_gdelt_tom", "isto não é json");
  eq(API.lerGuardaGdelt("tom"), null, "texto solto:");
  localStorage.setItem("seios_gdelt_tom", JSON.stringify({ v:null, em:Date.now() }));
  eq(API.lerGuardaGdelt("tom"), null, "valor nulo:");
  localStorage.setItem("seios_gdelt_tom", JSON.stringify({ v:"abc", em:Date.now() }));
  eq(API.lerGuardaGdelt("tom"), null, "valor não numérico:");
  localStorage.removeItem("seios_gdelt_tom");
  eq(API.lerGuardaGdelt("tom"), null, "vazio:");
});

console.log("\nBLOCO B — A FALHA CONTINUA SENDO FALHA");

t("usar o guardado NÃO tira o GDELT da lista de falhas", ()=>{
  /* Jorge foi explícito: usar dado velho em silêncio esconderia a informação
     de que a fonte está ruim, e é essa informação que permite cobrar correção. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('const g = lerGuardaGdelt("tom")');
  if(i === -1) throw new Error("o tom não consulta a guarda ao falhar");
  const trecho = limpo.slice(i, i + 700);
  if(!/results\.fail\.push\("gdelt"\)/.test(trecho))
    throw new Error("ao usar o guardado, a falha deixou de ser contada");
});

t("a tela diz que o valor é guardado, e de quando", ()=>{
  const limpo = semComentarios(HTML);
  if(!/GUARDADO de \$\{g\.idadeTexto\} atrás/.test(limpo))
    throw new Error("a nota não declara a idade do valor usado");
  if(!/usando guardado de/.test(limpo))
    throw new Error("o log não avisa que está usando valor guardado");
});

console.log("\nBLOCO C — menos pedidos ao GDELT");

t("o volume passa a ser buscado 1x por dia", ()=>{
  /* tom e volume são consultas diferentes (timelinetone 3d "geo" e
     timelinevolraw 14d "crise") e não podem virar uma. Mas o volume compara
     contra uma janela de 14 dias: buscá-lo 3x/dia é desperdício num limite
     que é por IP compartilhado. */
  const limpo = semComentarios(HTML);
  if(!/idadeMs < 20\*3600\*1000/.test(limpo))
    throw new Error("o volume não tem janela diária");
  const i = limpo.indexOf("idadeMs < 20*3600*1000");
  const trecho = limpo.slice(i, i + 600);
  if(!/results\.ok\.push\("gdelt volume"\)/.test(trecho))
    throw new Error("o volume do dia não conta como sucesso");
});

t("o tom continua sendo buscado TODA rodada", ()=>{
  /* a janela do tom é de 3 dias e ele é o indicador que vota: reduzir a
     frequência dele seria trocar cobertura por economia de pedido. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("const tone = await fetchGdeltTone()");
  if(i === -1) throw new Error("o tom deixou de ser buscado");
  const antes = limpo.slice(Math.max(0, i-600), i);
  if(/idadeMs < \d+\*3600\*1000/.test(antes))
    throw new Error("o tom ganhou janela diária — não deveria");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("a guarda não escreve no estado nem no score", ()=>{
  const f = semComentarios(declDe("guardarGdelt")) + semComentarios(declDe("lerGuardaGdelt"));
  if(/S\.motors|saveState\(|excludeFromScore/.test(f))
    throw new Error("a guarda mexe no sistema");
});

t("a chave da guarda é separada do estado do sistema", ()=>{
  /* se escrevesse na mesma chave, um valor de GDELT corromperia o estado */
  const f = semComentarios(declDe("guardarGdelt"));
  if(!/seios_gdelt_/.test(f)) throw new Error("chave sem prefixo próprio");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.128/.test(m[1])) throw new Error("continua a v128: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v129 verde — o GDELT falha e a cobertura não oscila mais.");

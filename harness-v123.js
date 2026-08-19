/* =====================================================================
   harness-v123.js — as camadas ganham série própria
   =====================================================================
   MODEL_VERSION continua m12. O score não muda. O que muda é o que é
   GRAVADO em cada leitura.

   POR QUE. A leitura em três camadas descreve o mercado bem, e até agora
   não ficava salva em lugar nenhum: o snapshot guardava score, composites e
   pesos, mas não os rótulos. Daqui a um mês seria impossível perguntar
   "quantas vezes o AGORA disse ALTA e o preço subiu depois?" — a pergunta
   não teria dado para ser respondida. Sem isto, a leitura em camadas é uma
   tela bonita e nada mais.

   O que é gravado por camada: rótulo, proporções, força, medidos e total.
   Não os valores de cada indicador — esses já estão nas observações
   point-in-time, e duplicar criaria duas verdades para o mesmo fato.

   Uso:  node harness-v123.js index.html
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
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([declDe("resumoDasCamadas"), "return { resumoDasCamadas };"].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

/* a leitura REAL de 19/08 15:04 */
const LEITURAS = [
  { id:"agora",   nome:"AGORA",     janela:"24h", rotulo:"ALTA PARCIAL",
    pctAlta:42.857, pctBaixa:14.285, pctNeutro:42.857, forca:7.53, medidos:7,  total:7 },
  { id:"semana",  nome:"A SEMANA",  janela:"7d",  rotulo:"DIVIDIDO",
    pctAlta:33.333, pctBaixa:33.333, pctNeutro:33.333, forca:-1.43, medidos:6, total:7 },
  { id:"terreno", nome:"O TERRENO", janela:"30d", rotulo:"ALTA PARCIAL",
    pctAlta:50, pctBaixa:0, pctNeutro:50, forca:19.41, medidos:14, total:14 }
];

console.log("\nBLOCO A — o resumo guarda o que responde perguntas depois");

t("as três camadas entram, com rótulo e janela", ()=>{
  const r = API.resumoDasCamadas(LEITURAS);
  eq(Object.keys(r).length, 3, "camadas gravadas:");
  eq(r.agora.rotulo, "ALTA PARCIAL", "rótulo do AGORA:");
  eq(r.semana.rotulo, "DIVIDIDO", "rótulo da SEMANA:");
  eq(r.agora.janela, "24h", "janela do AGORA:");
});

t("proporção, força e cobertura são gravadas", ()=>{
  const r = API.resumoDasCamadas(LEITURAS);
  eq(Math.round(r.terreno.pctAlta), 50, "% alta do terreno:");
  eq(Math.round(r.terreno.forca), 19, "força do terreno:");
  eq(r.semana.medidos, 6, "medidos da semana:");
  eq(r.semana.total, 7, "total da semana:");
});

t("os VALORES de cada indicador NÃO são duplicados aqui", ()=>{
  /* eles já vivem nas observações point-in-time. Gravar de novo criaria duas
     verdades para o mesmo fato, e um dia elas divergiriam. */
  const r = API.resumoDasCamadas(LEITURAS);
  const bruto = JSON.stringify(r);
  if(/itens|valor|indicador/.test(bruto))
    throw new Error("o resumo está duplicando dado das observações: " + bruto.slice(0,120));
});

t("o resumo é pequeno — ele vai em TODA leitura, para sempre", ()=>{
  const r = API.resumoDasCamadas(LEITURAS);
  const bytes = JSON.stringify(r).length;
  if(bytes > 700) throw new Error(bytes + " bytes por leitura é caro demais para 777+");
});

t("entrada vazia não grava lixo", ()=>{
  eq(JSON.stringify(API.resumoDasCamadas([])), "{}", "lista vazia:");
  eq(JSON.stringify(API.resumoDasCamadas(null)), "{}", "nulo:");
});

t("camada sem medição entra com o rótulo dela, não sumindo", ()=>{
  /* se sumisse, a série teria buracos que ninguém saberia explicar depois. */
  const r = API.resumoDasCamadas([{ id:"semana", nome:"A SEMANA", janela:"7d",
    rotulo:"SEM DADO", pctAlta:0, pctBaixa:0, pctNeutro:0, forca:null, medidos:0, total:7 }]);
  eq(r.semana.rotulo, "SEM DADO", "rótulo:");
  eq(r.semana.medidos, 0, "medidos:");
  eq(r.semana.forca, null, "força:");
});

console.log("\nBLOCO B — o snapshot leva as camadas junto");

t("montarSnapshot grava o campo camadas", ()=>{
  /* a âncora original exigia `camadas: resumoDasCamadas(` colados e falhava
     com a função anônima que protege a gravação. Teste frágil demais: o que
     importa é que o campo exista E seja alimentado pela função. */
  const f = semComentarios(declDe("montarSnapshot"));
  if(!/camadas:/.test(f)) throw new Error("o snapshot não tem o campo camadas");
  if(!/resumoDasCamadas\(/.test(f))
    throw new Error("o campo camadas não é alimentado por resumoDasCamadas");
  if(!/leituraPorCadencia\(/.test(f))
    throw new Error("as camadas não vêm da leitura real");
});

t("se a leitura falhar, o snapshot NÃO cai", ()=>{
  /* o snapshot alimenta a série das 777. Um erro na leitura em camadas —
     que é exibição — não pode impedir a gravação do score. */
  const f = semComentarios(declDe("montarSnapshot"));
  const i = f.indexOf("camadas:");
  const trecho = f.slice(Math.max(0, i - 400), i + 200);
  if(!/try/.test(trecho))
    throw new Error("sem try: uma exceção nas camadas derrubaria a gravação da série");
});

console.log("\nBLOCO C — a auditoria dos painéis sob o m12");

t("NENHUM ponto da tela calcula contribuição por peso NOMINAL", ()=>{
  /* achado na auditoria de 19/08: a dica do pódio tinha um cálculo de reserva
     — `f.composite * S.motors[key].weight` — que reproduzia exatamente o
     defeito corrigido na v112. Nunca disparava, porque `contribution` sempre
     vinha preenchido. Era uma armadilha esperando o dia em que não viesse. */
  const limpo = semComentarios(HTML);
  if(/composite\s*\*\s*S\.motors\[[^\]]+\]\.weight/.test(limpo))
    throw new Error("voltou o cálculo por peso nominal na tela");
});

t("os painéis que comparam leituras continuam filtrando por modelo", ()=>{
  const limpo = semComentarios(HTML);
  ["computeCaseEngine", "computePersonalTrackRecord"].forEach(function(fn){
    const f = semComentarios(declDe(fn));
    if(!/mesmoModelo\(/.test(f)) throw new Error(fn + " deixou de filtrar por modelo");
  });
  if(!/mesmoModelo\(S\.market\.previousModelo/.test(limpo))
    throw new Error("o painel O QUE MUDOU deixou de filtrar por modelo");
});

t("o backtest reconstrói com os pesos e votantes ATUAIS", ()=>{
  const f = semComentarios(declDe("vetorCanonicoHistorico"));
  if(!/motor\.weight/.test(f)) throw new Error("o backtest não usa os pesos do estado");
  if(!/indicadoresVotantes/.test(f)) throw new Error("o backtest não usa os votantes atuais");
});

t("nenhum id repetido no HTML", ()=>{
  const ids = [...HTML.matchAll(/\sid="([^"]+)"/g)].map(function(m){ return m[1]; });
  const rep = [...new Set(ids.filter(function(x,i){ return ids.indexOf(x) !== i; }))];
  if(rep.length) throw new Error("ids repetidos: " + rep.join(", "));
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("o resumo não escreve estado nem altera valor", ()=>{
  const f = semComentarios(declDe("resumoDasCamadas"));
  if(/saveState\(|S\.motors|setAuto\(|excludeFromScore/.test(f))
    throw new Error("o resumo mexe no sistema");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.122/.test(m[1])) throw new Error("continua a v122: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v123 verde — as camadas passam a ter série própria.");

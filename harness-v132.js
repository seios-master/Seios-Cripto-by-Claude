/* =====================================================================
   harness-v132.js — dobras: o resultado à vista, a explicação sob demanda
   =====================================================================
   Só apresentação. MODEL_VERSION continua m12, score intocado.

   O PROBLEMA: os painéis cresceram build a build e cada um ganhou o parágrafo
   que justificava a decisão daquele dia. Somados, viraram três telas de texto
   antes do primeiro número — num iPhone, rolagem sem fim.

   A REGRA DA DOBRA, e é ela que faz a diferença: o resumo tem que carregar a
   RESPOSTA. Uma linha fechada dizendo só "Regime ▸" obriga a abrir para saber
   de que se trata — pior que o texto longo. A linha fechada diz
   "REGIME · ALTA PARCIAL 60 · 3 de 5 apontando alta".

   O texto não some porque ele é o que impede o instrumento de mentir: é onde
   está escrito que nada aqui prevê, que o corte de ±15 é herdado, que a
   correlação é de defasagem zero. Ele fica dobrado, não apagado.

   Uso:  node harness-v132.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v131 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const guardado = {};
const localStorage = {
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(guardado,k)?guardado[k]:null; },
  setItem:function(k,v){ guardado[k]=String(v); },
  removeItem:function(k){ delete guardado[k]; }
};
let API;
try{
  API = new Function("localStorage", "esc", [
    declDe("dobra"), "return { dobra };"
  ].join("\n"))(localStorage, function(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]; });
  });
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — a dobra fechada carrega a resposta");

t("o resumo aparece na linha, fora do corpo", ()=>{
  /* é a regra inteira: fechada, a dobra tem que informar. Se o resumo ficasse
     dentro do corpo, o painel viraria uma lista de títulos mudos. */
  const html = API.dobra("x", "Regime", "ALTA PARCIAL 60", "<p>detalhe</p>");
  const iResumo = html.indexOf("ALTA PARCIAL 60");
  const iCorpo  = html.indexOf("dobra-corpo");
  if(iResumo === -1) throw new Error("o resumo não aparece");
  if(iResumo > iCorpo) throw new Error("o resumo está dentro do corpo — fechada, não informa");
});

t("usa details/summary nativo", ()=>{
  /* funciona sem JavaScript, responde ao teclado e ao leitor de tela, e não
     inventa estado que possa dessincronizar com a tela */
  const html = API.dobra("x", "A", "B", "C");
  if(html.indexOf("<details") === -1) throw new Error("não usa details");
  if(html.indexOf("<summary") === -1) throw new Error("não usa summary");
});

t("o olho é escapado — rótulo não injeta HTML", ()=>{
  const html = API.dobra("x", '<img src=x onerror=alert(1)>', "ok", "corpo");
  if(html.indexOf("<img") !== -1) throw new Error("o olho entrou sem escapar");
});

console.log("\nBLOCO B — o aberto/fechado é lembrado");

t("respeita o padrão quando não há nada guardado", ()=>{
  eq(API.dobra("novo1", "A", "B", "C").indexOf(" open") !== -1, true, "padrão aberto:");
  eq(API.dobra("novo2", "A", "B", "C", false).indexOf(" open") !== -1, false, "padrão fechado:");
});

t("o que foi guardado VENCE o padrão", ()=>{
  localStorage.setItem("seios_dobra_k1", "0");
  eq(API.dobra("k1", "A", "B", "C", true).indexOf(" open") !== -1, false, "fechado à mão:");
  localStorage.setItem("seios_dobra_k2", "1");
  eq(API.dobra("k2", "A", "B", "C", false).indexOf(" open") !== -1, true, "aberto à mão:");
});

t("cada dobra tem chave própria", ()=>{
  localStorage.setItem("seios_dobra_a", "0");
  localStorage.setItem("seios_dobra_b", "1");
  eq(API.dobra("a", "A", "B", "C").indexOf(" open") !== -1, false, "a:");
  eq(API.dobra("b", "A", "B", "C", false).indexOf(" open") !== -1, true, "b:");
});

t("a chave é separada do estado do sistema", ()=>{
  const f = semComentarios(declDe("dobra"));
  if(!/seios_dobra_/.test(f)) throw new Error("chave sem prefixo próprio");
});

t("um ouvinte só, no documento", ()=>{
  /* um por dobra vazaria a cada render, e o painel é redesenhado a cada
     atualização de mercado */
  const f = semComentarios(declDe("ligarDobras"));
  if(!/__dobrasLigadas/.test(f)) throw new Error("sem guarda contra ligar duas vezes");
  if(!/document\.addEventListener/.test(f)) throw new Error("não usa delegação no documento");
});

console.log("\nBLOCO C — os painéis foram dobrados");

t("regime, fluxo e liquidações são dobras", ()=>{
  const limpo = semComentarios(HTML);
  ['dobra("regime"', 'dobra("fluxo"', 'dobra("liquidacoes"'].forEach(function(d){
    if(limpo.indexOf(d) === -1) throw new Error("não é dobra: " + d);
  });
});

t("as três camadas são dobras", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/dobra\("camada-"\+r\.id/.test(f)) throw new Error("as camadas não viraram dobras");
});

t("AS DOBRAS DE DETALHE NASCEM FECHADAS", ()=>{
  /* v133 — "porque2" e "cadencia-porque" deixaram de existir como LINHAS: o
     texto foi para dentro das dobras que ele explica, para a tela caber em
     quatro leituras. O que continua valendo é que o detalhe nasça fechado. */
  const limpo = semComentarios(HTML);
  [/dobra\("fluxo"[\s\S]{0,6000}?, false\)/,
   /dobra\("cadencia"[\s\S]{0,9000}?, false\)/].forEach(function(re){
    if(!re.test(limpo)) throw new Error("uma dobra de detalhe não nasce fechada: " + re);
  });
});

t("TODAS AS SEIS NASCEM FECHADAS", ()=>{
  /* v134 — a tela abre com cinco linhas e nada mais. Antes regime e
     liquidações abriam por padrão e a página já nascia longa. */
  const limpo = semComentarios(HTML);
  ["regime","fluxo","liquidacoes","cadencia","prazos","motores"].forEach(function(id){
    const i = limpo.indexOf('dobra("' + id + '"');
    if(i === -1) throw new Error("falta a dobra: " + id);
    const prox = limpo.indexOf('dobra("', i + 10);
    const trecho = limpo.slice(i, prox > 0 ? prox : i + 9000);
    if(!/,\s*false\s*\)/.test(trecho))
      throw new Error(id + " nasce aberta — a tela volta a nascer longa");
  });
});

t("cada dobra tem BOTÃO FECHAR", ()=>{
  /* num painel aberto e longo, rolar de volta até o título para fechar é pior
     que não ter fechado */
  const f = semComentarios(declDe("dobra"));
  if(!/dobra-fechar/.test(f)) throw new Error("sem botão fechar");
  const g = semComentarios(declDe("ligarDobras"));
  if(!/dobra-fechar/.test(g)) throw new Error("o botão não tem ouvinte");
  if(!/d\.open = false/.test(g)) throw new Error("o botão não fecha a dobra");
});

t("SÃO SEIS LINHAS — uma por leitura independente", ()=>{
  /* regime · fluxo · liquidações · cadência · prazos. As três camadas viram UMA
     linha e os três cartões de prazo — os "reloginhos" — viram outra. */
  const limpo = semComentarios(HTML);
  const linhas = ["regime","fluxo","liquidacoes","cadencia","prazos","motores"];
  linhas.forEach(function(id){
    if(limpo.indexOf('dobra("' + id + '"') === -1)
      throw new Error("falta a linha: " + id);
  });
  /* e as camadas NÃO podem ser linhas soltas */
  if(/dobra\("camada-"\+r\.id[\s\S]{0,200}?\n\s*\)/.test(limpo) &&
     limpo.indexOf('dobra("cadencia"') === -1)
    throw new Error("as camadas continuam como linhas separadas");
});

t("a linha da cadência mostra os TRÊS rótulos fechada", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/resumoCadencia/.test(f)) throw new Error("sem resumo dos três");
  if(!/setaDe/.test(f)) throw new Error("o resumo não traz as setas");
});

t("o AVISO de que não é previsão continua no texto", ()=>{
  /* dobrar não pode virar apagar: é onde está escrito o que o instrumento
     não faz */
  const limpo = semComentarios(HTML);
  if(!/não é previsão/.test(limpo)) throw new Error("o aviso sumiu");
  if(!/170 medições|~170/.test(limpo)) throw new Error("a evidência sumiu");
});

t("CADA PAINEL TEM NOME PRÓPRIO", ()=>{
  /* v135 — "Regime"/"Fluxo"/"Cadência" descreviam o método, não o que a linha
     responde. Os nomes novos são o rótulo que o Jorge lê na tela. */
  const limpo = semComentarios(HTML);
  [['dobra("regime", "Ciclo"', "Ciclo"],
   ['dobra("fluxo", "Pressão"', "Pressão"],
   ['dobra("liquidacoes", "Live"', "Live"],
   ['dobra("cadencia", "Velocidades"', "Velocidades"],
   ['dobra("prazos", "Prazos"', "Prazos"],
   ['dobra("motores", "Motores"', "Motores"]].forEach(function(p){
    if(limpo.indexOf(p[0]) === -1) throw new Error("falta o nome: " + p[1]);
  });
});

t("os mostradores dos motores SÓ aparecem abertos", ()=>{
  /* eram nove mostradores sempre visíveis — a maior parte da altura da tela */
  const limpo = semComentarios(HTML);
  if(!/id="summaryDash" hidden/.test(limpo))
    throw new Error("o painel dos motores continua visível por padrão");
  if(!/motoresCorpo/.test(limpo))
    throw new Error("os mostradores não foram movidos para dentro da dobra");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("a dobra não escreve no estado do sistema", ()=>{
  const f = semComentarios(declDe("dobra")) + semComentarios(declDe("ligarDobras"));
  if(/S\.motors|saveState\(|setAuto\(/.test(f)) throw new Error("a dobra mexe no sistema");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.131/.test(m[1])) throw new Error("continua a v131: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v132 verde — o resultado à vista, a explicação sob demanda.");

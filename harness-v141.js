/* =====================================================================
   harness-v141.js — as sete nascem abertas
   =====================================================================
   Só apresentação. MODEL_VERSION continua m12, score intocado.

   A v134 fechou tudo porque a página estava longa. O efeito: a tela abria
   com sete rótulos e nenhum painel — o índice do sistema, não o sistema.
   O Jorge pediu as sete abertas. Isto REVERTE a v134 de propósito, e o teste
   antigo ("TODAS NASCEM FECHADAS") passa a ser o comportamento errado.

   O detalhe que faz a diferença: o guardado VENCE o padrão (v132). Sem trocar
   o prefixo da chave, quem fechou uma linha sob a v134 continuaria com ela
   fechada contra o padrão novo — e isso pareceria "não funcionou".

   Uso:  node harness-v141.js index.html
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
const guardado = {};
const localStorage = {
  getItem:k=>Object.prototype.hasOwnProperty.call(guardado,k)?guardado[k]:null,
  setItem:(k,v)=>{guardado[k]=String(v);}, removeItem:k=>{delete guardado[k];}
};
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const API = new Function("localStorage","esc",[declDe("dobra"),"return {dobra};"].join("\n"))(localStorage, esc);
const aberta = h => /<details[^>]*\sopen>/.test(h);

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
const limpo = semComentarios(HTML);

console.log("\nBLOCO A — as SETE linhas do topo nascem abertas");

["regime","fluxo","liquidacoes","cadencia","prazos","contexto","motores"].forEach(function(id){
  t("nasce aberta: " + id, ()=>{
    const i = limpo.indexOf('dobra("' + id + '"');
    if(i === -1) throw new Error("a linha sumiu");
    const prox = limpo.indexOf('dobra("', i + 10);
    const trecho = limpo.slice(i, prox > 0 ? prox : i + 9000);
    if(/,\s*false\s*\)/.test(trecho)) throw new Error("continua nascendo fechada");
  });
});

t("as SUB-dobras de camada continuam fechadas", ()=>{
  /* abrir as três dentro de Velocidades somaria três telas de uma vez —
     elas não são linhas do topo. */
  const f = semComentarios(declDe("blocoCadencia"));
  const i = f.indexOf('dobra("camada-"+r.id');
  if(i === -1) throw new Error("as camadas sumiram");
  if(!/,\s*false\s*\)/.test(f.slice(i, i + 4000)))
    throw new Error("as camadas passaram a nascer abertas");
});

console.log("\nBLOCO B — o padrão novo VALE na primeira vez");

t("a chave de armazenamento mudou de prefixo", ()=>{
  /* sem isto, quem fechou uma linha sob a v134 fica com ela fechada para
     sempre, contra o padrão novo — e parece que a build não funcionou. */
  const f = semComentarios(declDe("dobra")) + semComentarios(declDe("ligarDobras"));
  if(/"seios_dobra_"/.test(f)) throw new Error("continua no prefixo antigo");
  if(!/seios_dobra2_/.test(f)) throw new Error("sem prefixo novo");
});

t("memória VELHA não fecha a linha nova", ()=>{
  guardado["seios_dobra_regime"] = "0";     // o que a v134 gravou
  eq(aberta(API.dobra("regime","Ciclo","x","y")), true, "aberta apesar do velho:");
});

t("a preferência NOVA continua vencendo o padrão", ()=>{
  guardado["seios_dobra2_fluxo"] = "0";
  eq(aberta(API.dobra("fluxo","Pressão","x","y")), false, "fechada à mão:");
  guardado["seios_dobra2_fluxo"] = "1";
  eq(aberta(API.dobra("fluxo","Pressão","x","y",false)), true, "aberta à mão:");
});

t("ler e escrever usam o MESMO prefixo", ()=>{
  const ler = (semComentarios(declDe("dobra")).match(/seios_dobra2_/g)||[]).length;
  const esc2 = (semComentarios(declDe("ligarDobras")).match(/seios_dobra2_/g)||[]).length;
  if(!ler || !esc2) throw new Error("leitura e escrita divergiram: " + ler + "/" + esc2);
});

console.log("\nBLOCO C — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.140/.test(m[1])) throw new Error("continua a v140: " + m[1]);
});
t("o botão fechar continua existindo", ()=>{
  /* com tudo aberto, ele passa a ser o controle principal */
  if(!/dobra-fechar/.test(semComentarios(declDe("dobra")))) throw new Error("sem botão fechar");
  if(!/d\.open = false/.test(semComentarios(declDe("ligarDobras")))) throw new Error("o botão não fecha");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v141 verde — a tela abre mostrando o sistema, não o índice dele.");

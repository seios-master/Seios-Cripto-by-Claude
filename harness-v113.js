/* =====================================================================
   harness-v113.js — copiar o relatório de calibração como texto
   =====================================================================
   Mesmo comando do "⧉ Diagnóstico" do topo, mas para o painel Backtest e
   Calibração: copia o que AQUELE relatório mostrou, não a leitura de
   mercado.

   O que este banco guarda, além de o botão existir:

   · o texto sai do que está NA TELA. Uma segunda montagem, a partir das
     variáveis, poderia divergir do que o painel exibe — e aí a conversa
     passaria a discutir números que ninguém viu. É a mesma razão pela qual
     o diagnóstico do topo serializa o snapshot, e não recalcula.

   · sem calibração rodada, o botão DIZ isso em vez de copiar um relatório
     vazio que parece resultado.

   · nada de estado é escrito: copiar um relatório não pode mudar leitura
     nenhuma. MODEL_VERSION continua m11.

   Uso:  node harness-v113.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v112 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([declDe("textoDeNo"), "return { textoDeNo };"].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

/* nós falsos com a forma mínima que o caminhador usa */
function txt(s){ return { nodeType:3, nodeValue:s }; }
function el(tag, filhos){ return { nodeType:1, tagName:tag, childNodes:filhos||[] }; }

console.log("\nBLOCO A — o caminhador vira tabela em texto legível");

t("uma tabela vira linhas com colunas separadas", ()=>{
  const tabela = el("TABLE", [
    el("THEAD", [ el("TR", [ el("TH",[txt("Indicador")]), el("TH",[txt("Separação")]) ]) ]),
    el("TBODY", [ el("TR", [ el("TD",[txt("rsi")]), el("TD",[txt("separa 4.2pp")]) ]),
                  el("TR", [ el("TD",[txt("epu")]), el("TD",[txt("não distinguível")]) ]) ])
  ]);
  const s = API.textoDeNo(tabela).trim().split("\n").map(function(l){ return l.trim(); });
  eq(s[0], "Indicador | Separação", "cabeçalho:");
  eq(s[1], "rsi | separa 4.2pp", "primeira linha:");
  eq(s[2], "epu | não distinguível", "segunda linha:");
});

t("célula vazia não some — a coluna tem que continuar alinhada", ()=>{
  const tabela = el("TABLE", [ el("TBODY", [
    el("TR", [ el("TD",[txt("curva")]), el("TD",[]), el("TD",[txt("—")]) ]) ]) ]);
  eq(API.textoDeNo(tabela).trim(), "curva |  | —", "linha com vazio:");
});

t("parágrafos viram linhas próprias, não um bloco só", ()=>{
  const div = el("DIV", [ el("P",[txt("primeira")]), el("P",[txt("segunda")]) ]);
  const linhas = API.textoDeNo(div).split("\n").filter(function(l){ return l.trim(); });
  eq(linhas.length, 2, "linhas:");
});

t("<br> quebra linha", ()=>{
  const div = el("DIV", [ txt("antes"), el("BR",[]), txt("depois") ]);
  const linhas = API.textoDeNo(div).split("\n").filter(function(l){ return l.trim(); });
  eq(linhas.length, 2, "linhas:");
});

t("espaço em excesso é colapsado, mas a linha não é perdida", ()=>{
  const div = el("DIV", [ txt("  muito     espaço  ") ]);
  eq(API.textoDeNo(div).trim(), "muito espaço", "texto:");
});

t("script e style não vazam para o texto copiado", ()=>{
  const div = el("DIV", [ el("SCRIPT",[txt("alert(1)")]), el("STYLE",[txt(".a{}")]), txt("conteúdo") ]);
  const s = API.textoDeNo(div);
  if(/alert|\.a\{/.test(s)) throw new Error("código foi copiado junto: " + s);
  eq(s.trim(), "conteúdo", "só o conteúdo:");
});

t("nó nulo ou desconhecido não derruba a cópia", ()=>{
  eq(API.textoDeNo(null), "", "nulo:");
  eq(API.textoDeNo({ nodeType: 8, nodeValue: "comentário" }), "", "comentário:");
});

console.log("\nBLOCO B — o botão existe, no lugar pedido, e faz o que diz");

t("o botão está DENTRO do painel de backtest, ao lado do de proxies", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('id="panelBacktest"');
  if(i === -1) throw new Error("não achei o painel");
  const fim = limpo.indexOf("</section>", i);
  const painel = limpo.slice(i, fim);
  if(painel.indexOf('id="btnCopiarBacktest"') === -1)
    throw new Error("o botão não está dentro do painel de backtest");
  const iProxy = painel.indexOf('id="btnRunScoreBacktest"');
  const iCopia = painel.indexOf('id="btnCopiarBacktest"');
  if(!(iCopia > iProxy))
    throw new Error("o botão não vem depois do de proxies — o pedido era ao lado dele");
  const entre = painel.slice(iProxy, iCopia);
  if((entre.match(/<button/g) || []).length > 1)
    throw new Error("há outro botão entre os dois");
});

t("o botão chama a cópia do painel, não o diagnóstico do topo", ()=>{
  const limpo = semComentarios(HTML);
  if(!/btnCopiarBacktest[\s\S]{0,400}?copiarRelatorioBacktest|copiarRelatorioBacktest[\s\S]{0,400}?btnCopiarBacktest/.test(limpo))
    throw new Error("o botão não está ligado a copiarRelatorioBacktest");
  const f = semComentarios(declDe("copiarRelatorioBacktest"));
  if(/relatorioTexto\(/.test(f))
    throw new Error("está copiando o diagnóstico de mercado, não o relatório do painel");
});

t("o texto vem do que está NA TELA", ()=>{
  const f = semComentarios(declDe("textoDoPainelBacktest"));
  ["calibrationTimestamp", "backtestResults", "scoreBacktestResults"].forEach(function(id){
    if(f.indexOf(id) === -1) throw new Error("não lê o conteúdo de " + id);
  });
  if(!/textoDeNo\(/.test(f)) throw new Error("não usa o caminhador");
});

t("sem calibração rodada, avisa em vez de copiar relatório vazio", ()=>{
  const f = semComentarios(declDe("textoDoPainelBacktest"));
  if(!/rode|Rode|ainda não/.test(f))
    throw new Error("copiaria um texto vazio que parece resultado");
});

t("o texto copiado se identifica: build e momento da calibração", ()=>{
  const f = semComentarios(declDe("textoDoPainelBacktest"));
  if(!/BUILD_VERSION/.test(f)) throw new Error("o texto não diz de qual build veio");
  if(!/MODEL_VERSION/.test(f)) throw new Error("o texto não diz sob qual modelo foi calibrado");
});

t("tem a mesma saída de emergência do diagnóstico do topo (iOS)", ()=>{
  const f = semComentarios(declDe("copiarRelatorioBacktest"));
  if(!/textarea/.test(f))
    throw new Error("sem campo selecionável: no iPad a cópia falha calada quando o gesto não conta");
});

console.log("\nBLOCO C — copiar não muda nada");

t("a cópia não escreve estado nenhum", ()=>{
  ["textoDoPainelBacktest", "copiarRelatorioBacktest", "textoDeNo"].forEach(function(fn){
    const f = semComentarios(declDe(fn));
    if(/setAuto|saveState\(|S\.motors|S\.market\.[a-z]\w* =/.test(f))
      throw new Error(fn + " está escrevendo no estado");
  });
});

t("MODEL_VERSION continua m11", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) !== 11) throw new Error("modelo mudou para m" + m[1] + " numa build de botão");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.112-/.test(m[1])) throw new Error("continua a v112: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v113 verde — o relatório de calibração vira texto colável.");

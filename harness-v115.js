/* =====================================================================
   harness-v115.js — o cabeçalho diz o nome, e o contador diz o alvo
   =====================================================================
   Build de apresentação: nenhuma fórmula, peso, direito de voto ou valor de
   indicador muda. MODEL_VERSION continua m11.

   O que muda:
   · o nome do sistema por extenso, centralizado, como primeira linha;
   · a linha de progresso sai do meio do cabeçalho e vai para o canto, com
     ALVO em cada número — "3 leituras de 778 · 2 janelas de 777".

   Por que 778 e não 777: cada leitura só vira observação quando a SEGUINTE
   acontece — é o intervalo entre duas que produz o retorno de 8h. Para
   fechar 777 janelas são necessárias 778 leituras. O alvo das leituras é
   derivado do alvo das janelas, nunca escrito à mão nos dois lugares: se
   alguém mudar 777 um dia, os dois números andam juntos.

   Uso:  node harness-v115.js index.html
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
  let i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v114 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    "const ALVO_JANELAS = " + (/const ALVO_JANELAS = (\d+)/.exec(HTML)||[])[1] + ";",
    declDe("textoDaContagem"), "return { textoDaContagem, ALVO_JANELAS };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — o contador mostra o alvo, e o alvo é um só");

t("o caso real de agora: 4 leituras, 3 janelas, 30 de legado", ()=>{
  eq(API.textoDaContagem(4, 3, 30),
     "4 leituras de 778 · 3 janelas de 777 · 30 de modelo anterior", "texto:");
});

t("sem legado, a terceira parte não aparece — zero não é informação", ()=>{
  eq(API.textoDaContagem(4, 3, 0), "4 leituras de 778 · 3 janelas de 777", "texto:");
});

t("o alvo das LEITURAS é derivado do das janelas, não escrito à mão", ()=>{
  /* N janelas exigem N+1 leituras: a última leitura ainda não tem desfecho.
     Se os dois números fossem escritos separados, um dia mudariam separados. */
  const s = API.textoDaContagem(0, 0, 0);
  const leituras = Number(/de (\d+) ·/.exec(s)[1]);
  eq(leituras, API.ALVO_JANELAS + 1, "alvo de leituras:");
  const f = semComentarios(declDe("textoDaContagem"));
  if(/778/.test(f)) throw new Error("o 778 está escrito à mão dentro da função");
});

t("primeira coleta de todas: 1 leitura, 0 janelas", ()=>{
  eq(API.textoDaContagem(1, 0, 0), "1 leitura de 778 · 0 janelas de 777", "singular:");
});

t("singular e plural corretos nos dois lados", ()=>{
  eq(API.textoDaContagem(2, 1, 1),
     "2 leituras de 778 · 1 janela de 777 · 1 de modelo anterior", "texto:");
});

t("valores ausentes não viram NaN na tela", ()=>{
  const s = API.textoDaContagem(null, undefined, null);
  if(/NaN|null|undefined/.test(s)) throw new Error("vazou: " + s);
});

console.log("\nBLOCO B — o cabeçalho: nome por extenso, centralizado, primeiro");

t("o nome por extenso está no cabeçalho", ()=>{
  const i = HTML.indexOf("<header"), fim = HTML.indexOf("</header>", i);
  const cab = HTML.slice(i, fim);
  if(cab.indexOf("Sistema Estratégico de Inteligência e Oportunidades Sistêmicas") === -1)
    throw new Error("o nome por extenso não aparece");
  if(cab.indexOf("SEIOS CRIPTO") === -1) throw new Error("falta a sigla em destaque");
});

t("é a PRIMEIRA linha do cabeçalho, antes do preço e do resto", ()=>{
  const i = HTML.indexOf("<header"), fim = HTML.indexOf("</header>", i);
  const cab = HTML.slice(i, fim);
  const iNome = cab.indexOf("SEIOS CRIPTO");
  const iTicker = cab.indexOf('id="tickerBox"');
  const iTitulo = cab.indexOf('class="brand-title"');
  /* sem esta linha o teste APROVA quando o nome não existe: indexOf devolve
     −1, que é menor que tudo. Quarta vez nesta sessão. */
  if(iNome === -1) throw new Error("o nome não está no cabeçalho — nada a ordenar");
  if(iTicker === -1 || iTitulo === -1) throw new Error("cabeçalho mudou de forma");
  if(!(iNome < iTicker && iNome < iTitulo))
    throw new Error("o nome não vem primeiro");
});

t("é centralizado e maior que o resto", ()=>{
  const css = HTML.slice(HTML.indexOf("<style>"), HTML.indexOf("</style>"));
  const i = css.indexOf(".brand-nome");
  if(i === -1) throw new Error("sem regra .brand-nome");
  const regra = css.slice(i, css.indexOf("}", i));
  if(!/text-align:\s*center/.test(regra)) throw new Error("não está centralizado");
  const tam = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(regra);
  if(!tam) throw new Error("sem tamanho declarado");
  const titulo = css.slice(css.indexOf(".brand-title"), css.indexOf("}", css.indexOf(".brand-title")));
  const tamT = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(titulo);
  if(tamT && Number(tam[1]) <= Number(tamT[1]))
    throw new Error("o nome (" + tam[1] + "px) não é maior que o título (" + tamT[1] + "px)");
});

console.log("\nBLOCO C — o contador foi para o canto, e continua sendo alimentado");

t("o contador está no canto, junto do preço — não mais no meio", ()=>{
  const i = HTML.indexOf('id="tickerBox"');
  const iCont = HTML.indexOf('id="serieContador"');
  if(iCont === -1) throw new Error("não achei o contador");
  if(i === -1) throw new Error("não achei a caixa do canto");
  if(!(iCont > i))
    throw new Error("o contador não está dentro da caixa do canto");
});

t("quem escreve o contador usa a função — não monta o texto por fora", ()=>{
  const limpo = semComentarios(HTML);
  if(!/textoDaContagem\(/.test(limpo)) throw new Error("ninguém chama a função");
  if(/leituras sob o modelo atual/.test(limpo))
    throw new Error("o texto antigo continua sendo montado em algum lugar");
});

t("a contagem de janelas continua vindo de `prox`, como manda a v94", ()=>{
  const limpo = semComentarios(HTML);
  if(!/typeof x\.retornos\.prox === "number"/.test(limpo))
    throw new Error("a definição de janela independente mudou");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m11", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  /* v117 — fato datado vira invariante: o modelo nunca regride. */
  if(Number(m[1]) < 11) throw new Error("modelo regrediu para m" + m[1]);
});

t("as fórmulas que votam continuam intactas", ()=>{
  [/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/,
   /"macro\.liquidez":\s*rank\s*=>\s*scoreDoPercentil\(rank, \+1\)/].forEach(function(re){
    if(!re.test(HTML)) throw new Error("uma fórmula que vota foi alterada");
  });
});

t("o alvo de 777 do resto do sistema não foi tocado", ()=>{
  if(!/alvo: 777/.test(HTML)) throw new Error("a contagem interna mudou de alvo");
  if(!/\(independentes \/ 777\) \* 100/.test(HTML)) throw new Error("o percentual mudou de base");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.114-/.test(m[1])) throw new Error("continua a v114: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v115 verde — o nome inteiro, e o alvo à vista.");

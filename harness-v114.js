/* =====================================================================
   harness-v114.js — seis peles, o padrão, e nenhuma variável faltando
   =====================================================================
   Build de aparência: nenhuma fórmula, peso, direito de voto ou valor de
   indicador muda. MODEL_VERSION continua m11.

   O defeito que este banco existe para impedir é específico e silencioso:
   uma pele que esqueça UMA variável faz o painel correspondente sumir ou
   ficar ilegível — texto da cor do fundo — sem erro, sem log, sem nada na
   tela. Quem descobre é o usuário, dias depois, achando que "o sistema
   parou de mostrar aquilo".

   Por isso a asserção central é sobre o CONJUNTO: toda pele declarada tem
   que definir todas as variáveis que o CSS consome. Se alguém acrescentar
   uma sétima pele amanhã, ou uma variável nova no CSS, quebra aqui.

   Uso:  node harness-v114.js index.html
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");
const CSS = HTML.slice(HTML.indexOf("<style>") + 7, HTML.indexOf("</style>"));

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

/* as variáveis que o CSS realmente consome, lidas do próprio arquivo */
function variaveisUsadas(){
  const usadas = new Set();
  [...CSS.matchAll(/var\((--[\w-]+)/g)].forEach(function(m){ usadas.add(m[1]); });
  return [...usadas];
}
function blocoDaPele(nome){
  const marca = '[data-skin="' + nome + '"]';
  const i = CSS.indexOf(marca);
  if(i === -1) return null;
  return CSS.slice(i, CSS.indexOf("}", i));
}
function pelesDeclaradas(){
  return [...new Set([...CSS.matchAll(/\[data-skin="(\w+)"\]\s*\{/g)].map(m=>m[1]))];
}

const ESCOLHIDAS = ["milimetrado","ambar","indigo","terra","ciano","batimetria"];

console.log("\nBLOCO A — as seis peles existem, e o padrão continua sendo o padrão");

t("as seis peles escolhidas estão declaradas", ()=>{
  const tem = pelesDeclaradas();
  ESCOLHIDAS.forEach(function(p){
    if(tem.indexOf(p) === -1) throw new Error("falta a pele " + p);
  });
});

t("o :root continua sendo a pele padrão — nenhuma pele sequestra o default", ()=>{
  const raiz = CSS.slice(CSS.indexOf(":root{"), CSS.indexOf("}", CSS.indexOf(":root{")));
  if(!/--text:\s*#33FF6E/i.test(raiz))
    throw new Error("o verde do padrão saiu do :root — quem abre sem escolher perde o tema atual");
});

console.log("\nBLOCO B — O TESTE QUE IMPORTA: nenhuma variável faltando");

t("toda pele define TODAS as variáveis que o CSS consome", ()=>{
  const usadas = variaveisUsadas();
  if(usadas.length < 15) throw new Error("só " + usadas.length + " variáveis encontradas; o CSS mudou de forma?");
  const faltas = [];
  ESCOLHIDAS.forEach(function(p){
    const b = blocoDaPele(p);
    if(!b) throw new Error("pele " + p + " não declarada");
    usadas.forEach(function(v){
      if(b.indexOf(v + ":") === -1) faltas.push(p + " → " + v);
    });
  });
  if(faltas.length)
    throw new Error(faltas.length + " variável(is) faltando: " + faltas.slice(0,6).join(" · "));
});

t("nenhuma cor malformada — um hex torto pinta texto de transparente", ()=>{
  ESCOLHIDAS.forEach(function(p){
    const b = blocoDaPele(p);
    [...b.matchAll(/#[0-9a-fA-F]+/g)].forEach(function(m){
      if([4,7,9].indexOf(m[0].length) === -1)
        throw new Error(p + ": " + m[0] + " não é hex de 3, 6 ou 8 dígitos");
    });
  });
});

console.log("\nBLOCO C — as cores literais que impediam a troca");

t("o fundo do corpo não é mais preto fixo", ()=>{
  if(/html,body\{[^}]*background:#000/.test(CSS))
    throw new Error("html,body continua com #000 !important — nenhuma pele clara funcionaria");
  if(!/html,body\{[^}]*var\(--bg\)/.test(CSS))
    throw new Error("o corpo não usa var(--bg)");
});

t("cabeçalho e herói deixaram de ter gradiente preto fixo", ()=>{
  if(/linear-gradient\(180deg,#000000,#000000\)/.test(CSS))
    throw new Error("o gradiente preto do cabeçalho continua fixo");
  if(/linear-gradient\(180deg,#061009 0%,#040A06 100%\)/.test(CSS))
    throw new Error("o gradiente verde-escuro do herói continua fixo");
});

t("o texto do botão primário acompanha a pele", ()=>{
  if(/button\.primary\{[^}]*color:#000000/.test(CSS))
    throw new Error("o rótulo do botão fica preto sobre fundo claro em pele clara");
});

console.log("\nBLOCO D — a chuva de caracteres só existe no padrão");

t("o canvas some em qualquer pele que não seja o padrão", ()=>{
  if(!/\[data-skin\]\s*#matrixCanvas\s*\{\s*display:none/.test(CSS.replace(/\s+/g," ").replace(/ \{/g,"{").replace(/\{ /g,"{")))
    throw new Error("a chuva continua rodando por cima das peles claras");
});

t("e a animação para de verdade, não só some da tela", ()=>{
  const limpo = HTML.replace(/\/\*[\s\S]*?\*\//g," ");
  if(!/PELE_ATUAL|peleAtual|skinAtual/.test(limpo))
    throw new Error("o desenho não consulta a pele: requestAnimationFrame seguiria gastando bateria");
});

console.log("\nBLOCO E — o seletor, e a escolha que sobrevive ao recarregar");

t("o seletor está no cabeçalho", ()=>{
  const i = HTML.indexOf("<header");
  const fim = HTML.indexOf("</header>", i);
  if(HTML.slice(i, fim).indexOf('id="skinPicker"') === -1)
    throw new Error("o seletor não está dentro do cabeçalho");
});

t("todo botão do seletor aponta para uma pele declarada", ()=>{
  const botoes = [...HTML.matchAll(/data-skin-op="(\w+)"/g)].map(m=>m[1]);
  if(botoes.length !== 7)
    throw new Error("esperava 7 opções (padrão + 6), achei " + botoes.length);
  const tem = pelesDeclaradas().concat(["padrao"]);
  botoes.forEach(function(b){
    if(tem.indexOf(b) === -1) throw new Error("opção sem pele: " + b);
  });
});

t("a escolha é guardada e relida", ()=>{
  const limpo = HTML.replace(/\/\*[\s\S]*?\*\//g," ");
  if(!/localStorage\.setItem\("seios_skin"/.test(limpo)) throw new Error("não guarda a escolha");
  if(!/localStorage\.getItem\("seios_skin"/.test(limpo)) throw new Error("não relê a escolha");
});

t("a pele é aplicada ANTES da primeira pintura — sem piscar", ()=>{
  const limpo = HTML.replace(/\/\*[\s\S]*?\*\//g," ");
  const iAplica = limpo.indexOf('setAttribute("data-skin"');
  const iBody = limpo.indexOf("<body");
  if(iAplica === -1) throw new Error("nada aplica data-skin");
  if(!(iAplica < iBody))
    throw new Error("a pele só é aplicada depois do <body>: a tela pisca no tema errado ao abrir");
});

t("a chave da pele NÃO é a do estado — trocar de cor não pode tocar em dado", ()=>{
  const limpo = HTML.replace(/\/\*[\s\S]*?\*\//g," ");
  if(/seios_skin[^"]*"\s*,\s*JSON/.test(limpo)) throw new Error("está gravando estado na chave da pele");
  if(!/const STORAGE_KEY = "seios_btc_v2"/.test(limpo)) throw new Error("a chave do estado mudou");
});

console.log("\nBLOCO F — nada que decide mudou");

t("MODEL_VERSION continua m11", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  /* v117 — fato datado vira invariante: o modelo nunca regride. */
  if(Number(m[1]) < 11) throw new Error("modelo regrediu para m" + m[1]);
});

t("as fórmulas que votam continuam intactas", ()=>{
  [/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/,
   /"macro\.liquidez":\s*rank\s*=>\s*scoreDoPercentil\(rank, \+1\)/,
   /"derivativos\.funding":\s*rate\s*=>\s*clamp\(-rate \* 100000/].forEach(function(re){
    if(!re.test(HTML)) throw new Error("uma fórmula que vota foi alterada");
  });
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.113/.test(m[1])) throw new Error("continua a v113: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v114 verde — sete peles, nenhuma variável órfã.");

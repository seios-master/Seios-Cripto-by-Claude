/* checa-paineis.js — todo painel tem porta? toda porta tem painel?
   Roda contra o HTML. Falha a build se encontrar órfão dos dois lados. */
const fs = require("fs");
const H = fs.readFileSync(process.argv[2] || "index.html", "utf8");
const uniq = a => [...new Set(a)];

const estat = uniq([...H.matchAll(/<section[^>]*class="[^"]*rel-panel[^"]*"[^>]*id="([^"]+)"/g)].map(m=>m[1]));
/* só conta como painel de relatório quem também recebe a classe rel-panel.
   Um bloco interno pode ter id "panel*" sem ser um relatório — mas se ele
   colidir com um id estático, o teste de duplicata abaixo pega. */
const dinam = uniq([...H.matchAll(/\.className\s*=\s*"[^"]*rel-panel[^"]*";\s*\n\s*\w+\.id\s*=\s*"([^"]+)"/g)].map(m=>m[1]));
const idsJs = uniq([...H.matchAll(/\.id\s*=\s*"(panel[A-Za-z]+)"/g)].map(m=>m[1]));
const viaHelper = uniq([...H.matchAll(/virarCardRelatorio\(\s*\w+\s*,\s*"([^"]+)"/g)].map(m=>m[1]));
/* só o que é de fato um botão no HTML. `data-rel="..."` também aparece
   dentro de seletores em JS (querySelector), e contar isso como botão
   produzia um "clique morto" que não existe. Ancora no <button. */
const botoes = uniq([...H.matchAll(/<button[^>]*data-rel="([^"]+)"/g)].map(m=>m[1]))
  .filter(x => !x.includes("+") && !x.includes("'"));
const botoesJs = uniq([...H.matchAll(/dataset\.rel\s*=\s*(\w+)/g)].map(m=>m[1]));

const paineis = uniq([...estat, ...dinam, ...viaHelper]);
// virarCardRelatorio cria painel E botão no mesmo ato — esses nunca ficam órfãos
const comPorta = uniq([...botoes, ...viaHelper]);

const semPorta = paineis.filter(p => !comPorta.includes(p));
const semPainel = botoes.filter(b => !paineis.includes(b));
const dup = idsJs.filter(d => estat.includes(d));   // colisão vale para QUALQUER id, painel ou não

/* v116 — ID REPETIDO NO PRÓPRIO HTML.
   A v115 criou um `serieContador` no canto sem ver que já existia um na
   fileira de botões. getElementById pega só o primeiro: o segundo nunca é
   preenchido e nada acusa. Este checador varria só ids que começam com
   "panel" — a colisão passou por baixo. Agora varre todos. */
const idsHtml = [...H.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const vistos = {}, repetidos = [];
idsHtml.forEach(function(x){ if(vistos[x]) repetidos.push(x); vistos[x] = 1; });
const idsRepetidos = [...new Set(repetidos)];

console.log(`painéis: ${paineis.length}  (${estat.length} estáticos, ${viaHelper.length} via helper, ${dinam.length} por id direto)`);
console.log(`botões estáticos: ${botoes.length}` + (botoesJs.length ? `  · ${botoesJs.length} via dataset.rel dinâmico` : ""));

let erro = 0;
if(semPorta.length){ erro++; console.log("\n✗ PAINEL SEM BOTÃO (invisível ao usuário):"); semPorta.forEach(p=>console.log("    " + p)); }
if(semPainel.length){ erro++; console.log("\n✗ BOTÃO SEM PAINEL (clique morto):"); semPainel.forEach(b=>console.log("    " + b)); }
if(dup.length){ erro++; console.log("\n✗ ID DUPLICADO entre HTML estático e JS (getElementById pega só o primeiro):"); dup.forEach(d=>console.log("    " + d)); }
if(idsRepetidos.length){ erro++; console.log("\n✗ ID REPETIDO NO HTML (getElementById pega só o primeiro):"); idsRepetidos.forEach(d=>console.log("    " + d)); }

if(!erro) console.log("\n✓ todo painel tem porta, toda porta tem painel, nenhum id colide.");
process.exit(erro ? 1 : 0);

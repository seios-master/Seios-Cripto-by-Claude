/* =====================================================================
   harness-v102.js — nenhuma comparação atravessa modelos
   =====================================================================
   Contra a v101 o BLOCO A falha: o delta lá subtrai o score de um modelo
   do score de outro e imprime a diferença como se fosse mercado. Foi o que
   a primeira leitura sob m6 mostrou: "11,01 (−0,75)", onde os 0,75 eram a
   correção do período em formação.

   Uso:  node harness-v102.js index.html
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
function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const M = "m6-2026-08-16";
let API;
try{
  API = new Function([
    'const MODEL_VERSION = "' + M + '";',
    fonteDe("snapshotDoModeloAtual"), fonteDe("separarPorModelo"),
    fonteDe("indicadoresCongelados"),
    "return { separarPorModelo, indicadoresCongelados };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

console.log("\nBLOCO A — o delta de score, no código");

/* O bloco do delta vive dentro de `relatorioTexto`, que depende de meia dúzia
   de leitores do estado. Em vez de montar tudo isso, o teste afirma sobre a
   FORMA do trecho: que ele filtra por modelo e que a saída antiga sumiu. */
function trechoDoDelta(){
  const f = semComentarios(fonteDe("relatorioTexto"));
  const i = f.indexOf("score na leitura anterior");
  if(i === -1) throw new Error("não achei o bloco do delta");
  return f.slice(Math.max(0, i - 900), i + 900);
}

t("o delta passa por separarPorModelo antes de subtrair", ()=>{
  const tr = trechoDoDelta();
  if(!/separarPorModelo\(snaps\)\.atual/.test(tr))
    throw new Error("continua comparando com a leitura anterior seja de que modelo for");
});

t("a leitura anterior é escolhida por identidade, não por posição na lista", ()=>{
  const tr = trechoDoDelta();
  if(/const ant = snaps\[snaps\.length-2\]/.test(tr))
    throw new Error("`snaps[length-2]` continua no arquivo — erra quando snap não é o último");
  if(!/s\.ts !== snap\.ts/.test(tr))
    throw new Error("não exclui o próprio snapshot da lista de anteriores");
});

t("sem par do mesmo modelo, a tela DIZ que não é comparável em vez de calar", ()=>{
  const tr = trechoDoDelta();
  if(!/não comparável/.test(tr))
    throw new Error("o caso do bump some da tela — silêncio no lugar de explicação");
  if(!/MODEL_VERSION/.test(tr))
    throw new Error("não diz qual é a régua de agora");
});

console.log("\nBLOCO B — o detector de congelados, executado");

function leitura(ts, modelo, vals){
  const ind = {};
  Object.keys(vals).forEach(function(k){ ind[k] = { valor: vals[k] }; });
  return { ts: ts, modelo: modelo, indicadores: ind };
}
/* três dias, uma leitura por dia, um indicador travado e um que varia */
function tresDias(modelo){
  return [
    leitura("2026-08-14T09:00:00Z", modelo, { travado: 10, varia: 1 }),
    leitura("2026-08-15T09:00:00Z", modelo, { travado: 10, varia: 2 }),
    leitura("2026-08-16T09:00:00Z", modelo, { travado: 10, varia: 3 })
  ];
}

t("com três dias do MESMO modelo, o travado é acusado", ()=>{
  const c = API.indicadoresCongelados(tresDias(M), 3);
  eq(c.length, 1, "acusados:");
  eq(c[0].chave, "travado", "quem:");
});

t("leitura de modelo anterior não entra na comparação", ()=>{
  const s = tresDias(M);
  s[0].modelo = "m5-2026-08-15";
  s[0].indicadores.travado.valor = 999;   // valor de outra régua
  /* sobram 2 dias sob o modelo atual: abaixo do mínimo, o detector cala.
     Na v101 esse 999 entraria e o travado "variaria" — sumindo do alerta. */
  eq(API.indicadoresCongelados(s, 3).length, 0, "acusados:");
});

t("depois de um bump o detector fica MUDO, não errado", ()=>{
  const s = tresDias("m5-2026-08-15").concat([
    leitura("2026-08-17T09:00:00Z", M, { travado: 10, varia: 4 })
  ]);
  eq(API.indicadoresCongelados(s, 3).length, 0, "1 dia sob o modelo novo:");
});

t("acumulados três dias sob o modelo novo, ele volta a falar", ()=>{
  const s = tresDias("m5-2026-08-15").concat(tresDias(M).map(function(x, i){
    return leitura("2026-08-2" + i + "T09:00:00Z", M, { travado: 10, varia: i });
  }));
  const c = API.indicadoresCongelados(s, 3);
  eq(c.length, 1, "acusados:"); eq(c[0].chave, "travado", "quem:");
});

t("lista vazia e lista só de legado não estouram", ()=>{
  eq(API.indicadoresCongelados([], 3).length, 0);
  eq(API.indicadoresCongelados(tresDias("m4-2026-08-15"), 3).length, 0);
});

console.log("\nBLOCO C — o que não podia mudar não mudou");

t("MODEL_VERSION continua m6 — esta build não toca em nada que decide", ()=>{
  const m = /const MODEL_VERSION = "([^"]+)"/.exec(HTML);
  if(m[1] !== M) throw new Error("modelo mudou numa build de apresentação: " + m[1]);
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.101-/.test(m[1])) throw new Error("continua a v101: " + m[1]);
});

t("nenhum outro leitor compara leituras sem separar por modelo", ()=>{
  /* asserção sobre o arquivo inteiro, como a da v101 que achou o ouro: se um
     quarto leitor de `snaps` nascer comparando por posição, quebra aqui. */
  const limpo = semComentarios(HTML);
  const porPosicao = [...limpo.matchAll(/snaps\[snaps\.length\s*-\s*2\]/g)];
  if(porPosicao.length)
    throw new Error(porPosicao.length + " comparação(ões) por posição na lista restante(s)");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v102 verde — uma régua por vez.");

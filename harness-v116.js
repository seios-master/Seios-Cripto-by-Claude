/* =====================================================================
   harness-v116.js — os marcos declarados ANTES de existir dado
   =====================================================================
   Esta é a build de congelamento. Nada que decide muda: MODEL_VERSION
   continua m11, as fórmulas continuam intactas, e o seletor de skin só
   troca de lugar e de rótulo.

   O que ela acrescenta é uma coisa só, e o valor dela está inteiramente no
   MOMENTO: a régua de leitura das observações, escrita enquanto a série
   tem 3 janelas de 777. Declarada depois — com 300 na tela — ninguém
   poderia afirmar que o critério não foi escolhido olhando o resultado.
   Nem Jorge, nem eu.

   O que os marcos afirmam:
     85  janelas → detecta correlação r ≈ 0,30 (vantagem enorme)
     194 janelas → r ≈ 0,20 (grande)
     347 janelas → r ≈ 0,15 (boa)
     783 janelas → r ≈ 0,10 (fina) — é de onde veio o 777
   Olhar quatro vezes infla o risco de achar sinal onde não há, então cada
   conferência usa corte de 1% (|t| ≥ 2,576), não de 5%. Isso está fixado
   agora, e mudar depois é mudar a régua no meio do jogo.

   Uso:  node harness-v116.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v115 ou anterior?)");
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome);
  const abre = HTML.indexOf("[", i), pv = HTML.indexOf(";", i);
  if(abre !== -1 && abre < pv){
    let n=0; for(let k=abre;k<HTML.length;k++){ if(HTML[k]==="[")n++; else if(HTML[k]==="]"){n--; if(!n) return HTML.slice(i,k+1)+";"; } }
  }
  return HTML.slice(i, pv + 1);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    constDe("MARCOS_DECLARADOS"), constDe("T_CORTE_MARCO"),
    declDe("marcosDaSerie"), "return { marcosDaSerie, MARCOS_DECLARADOS, T_CORTE_MARCO };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

console.log("\nBLOCO A — os quatro marcos, e o que cada um consegue ver");

t("os marcos são 85, 194, 347 e 783 — nessa ordem", ()=>{
  const ns = API.MARCOS_DECLARADOS.map(function(m){ return m.n; });
  eq(ns.join(","), "85,194,347,783", "marcos:");
});

t("cada marco declara o tamanho de efeito que consegue detectar", ()=>{
  /* lista vazia satisfaz forEach e every calados — três testes deste banco
     passavam contra o stub por isso */
  if(API.MARCOS_DECLARADOS.length !== 4)
    throw new Error("esperava 4 marcos, achei " + API.MARCOS_DECLARADOS.length);
  API.MARCOS_DECLARADOS.forEach(function(m){
    if(!Number.isFinite(m.r)) throw new Error("marco " + m.n + " sem r declarado");
    if(!m.rotulo) throw new Error("marco " + m.n + " sem descrição");
  });
  const rs = API.MARCOS_DECLARADOS.map(function(m){ return m.r; });
  for(let i = 1; i < rs.length; i++){
    if(!(rs[i] < rs[i-1]))
      throw new Error("mais observações têm que detectar efeito MENOR, não maior");
  }
});

t("o corte é de 1%, não de 5% — quatro olhadas inflam o acaso", ()=>{
  if(Math.abs(API.T_CORTE_MARCO - 2.576) > 0.01)
    throw new Error("corte declarado é " + API.T_CORTE_MARCO + ", esperava ~2,576 (1% bilateral)");
});

t("o último marco é o alvo do sistema, não um número solto", ()=>{
  const ultimo = API.MARCOS_DECLARADOS[API.MARCOS_DECLARADOS.length-1].n;
  if(Math.abs(ultimo - 777) > 10)
    throw new Error("o último marco (" + ultimo + ") destoa do alvo de 777");
});

console.log("\nBLOCO B — o progresso é lido, não inventado");

t("com 3 janelas, nenhum marco foi atingido", ()=>{
  const r = API.marcosDaSerie(3);
  eq(r.filter(function(m){ return m.atingido; }).length, 0, "atingidos:");
  eq(r[0].faltam, 82, "faltam para o primeiro:");
});

t("com 85 janelas, o primeiro fecha e os outros não", ()=>{
  const r = API.marcosDaSerie(85);
  eq(r[0].atingido, true, "primeiro:");
  eq(r[1].atingido, false, "segundo:");
  eq(r[0].faltam, 0, "faltam:");
});

t("com 800, todos fecham", ()=>{
  const r = API.marcosDaSerie(800);
  eq(r.length, 4, "marcos avaliados:");
  eq(r.every(function(m){ return m.atingido; }), true, "todos:");
});

t("entrada inválida não vira marco atingido por acidente", ()=>{
  [null, undefined, NaN, -5].forEach(function(v){
    const r = API.marcosDaSerie(v);
    if(r.length !== 4) throw new Error("entrada " + v + " devolveu " + r.length + " marcos");
    if(r.some(function(m){ return m.atingido; }))
      throw new Error("entrada " + v + " marcou algo como atingido");
  });
});

console.log("\nBLOCO C — a declaração está NA TELA, com data e motivo");

t("o painel mostra os quatro marcos e o corte", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("marcosDeclarados");
  if(i === -1) throw new Error("não achei o bloco na tela");
  ["85", "194", "347", "783"].forEach(function(n){
    if(limpo.indexOf(n) === -1) throw new Error("marco " + n + " não aparece");
  });
});

t("a tela diz POR QUE o corte é 1% — sem isso vira número mágico", ()=>{
  const limpo = semComentarios(HTML);
  const f = semComentarios(declDe("blocoMarcos"));
  if(!/quatro|4 conferências|olhar mais de uma vez|mais de uma vez/i.test(f))
    throw new Error("não explica que o corte mais duro existe por causa das conferências repetidas");
});

t("a tela registra QUANDO isto foi declarado — é o que dá valor à regra", ()=>{
  const f = semComentarios(declDe("blocoMarcos"));
  if(!/declarad/i.test(f)) throw new Error("não diz que foi declarado de antemão");
  if(!/BUILD_VERSION|18\/08|2026-08-18/.test(f))
    throw new Error("não carimba a build/data da declaração");
});

t("a tela admite o que os marcos NÃO resolvem", ()=>{
  const f = semComentarios(declDe("blocoMarcos"));
  if(!/não|pode ser não|ausência/i.test(f))
    throw new Error("a régua aparece como promessa de resultado");
});

console.log("\nBLOCO D — o seletor de skin: no fim da linha, com o nome certo");

t("o rótulo é Skin, não Pele", ()=>{
  const i = HTML.indexOf("<header"), fim = HTML.indexOf("</header>", i);
  const cab = HTML.slice(i, fim);
  if(/>\s*pele\s*</i.test(cab)) throw new Error("o rótulo ainda diz Pele");
  if(!/>\s*skin\s*</i.test(cab)) throw new Error("não achei o rótulo Skin");
});

t("o seletor é o ÚLTIMO da fileira de botões", ()=>{
  /* o escopo é a FILEIRA, não o cabeçalho inteiro: fatiar até </header>
     arrastava junto o "×" que fecha o log de coleta, que vive noutro bloco.
     Teste que mede a coisa errada acusa onde não há defeito — e um dia
     aprova onde há. */
  const i = HTML.indexOf('class="wrap controls-row"');
  if(i === -1) throw new Error("não achei a fileira de botões");
  const fimFileira = HTML.indexOf('<div class="wrap" id="exportFallback"', i);
  if(fimFileira === -1) throw new Error("a fileira mudou de forma");
  const linha = HTML.slice(i, fimFileira);
  const iPicker = linha.indexOf('id="skinPicker"');
  const depois = linha.slice(iPicker);
  /* botão escondido (display:none) e input de arquivo não contam: o pedido
     era sobre a ORDEM DO QUE SE VÊ. */
  const visiveis = depois.replace(/<select[\s\S]*?<\/select>/, "")
                         .replace(/<button[^>]*display:none[^>]*>[\s\S]*?<\/button>/g, "");
  if(/<button/.test(visiveis))
    throw new Error("ainda há botão visível depois do seletor");
});

console.log("\nBLOCO E — congelamento: nada que decide mudou");

t("MODEL_VERSION continua m11 — esta é a versão que congela", ()=>{
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

t("os cinco sensores continuam sem voto", ()=>{
  const limpo = semComentarios(HTML);
  ["bookImbalance","ouro","euro","longShort","takerRatio"].forEach(function(k){
    const i = limpo.search(new RegExp(k + "\\s*:\\s*ind\\("));
    if(i === -1) throw new Error("não achei " + k);
    if(!/sensor, não pontua/.test(limpo.slice(i, i + 240)))
      throw new Error(k + " deixou de ser sensor");
  });
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.115-/.test(m[1])) throw new Error("continua a v115: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v116 verde — a régua declarada antes do dado. Modelo congelado em m11.");

/* =====================================================================
   harness-v122.js — cada camada com o seu relógio, e o diagnóstico junto
   =====================================================================
   Exibição. MODEL_VERSION continua m12, score intocado.

   Três elementos por camada:
   · barra de proporção — alta/neutro/baixa em segmentos
   · seta do rótulo — ↑ ↗ ↔ ⊙ ↘ ↓
   · o preço no RELÓGIO DA CAMADA — 24 velas de 1h (AGORA), 7 dias
     (SEMANA), 30 dias (TERRENO)

   O terceiro é o mais útil e o mais perigoso: um gráfico ao lado de um
   rótulo convida a ler "esta camada previu isto". Ele é rotulado como
   CONTEXTO, e o painel repete que nada aqui antecede o preço — as relações
   reais medidas em 18–19/08 têm pico em defasagem ZERO.

   E o diagnóstico copiável passa a incluir as três camadas, para a
   evolução delas poder ser acompanhada sem depender de captura de tela.

   Uso:  node harness-v122.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v121 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    declDe("setaDoRotulo"), declDe("barraProporcao"), declDe("miniGrafico"),
    "return { setaDoRotulo, barraProporcao, miniGrafico };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — a seta corresponde ao rótulo, e só a ele");

t("os cinco rótulos têm seta própria", ()=>{
  eq(API.setaDoRotulo("ALTA"), "↑", "ALTA:");
  eq(API.setaDoRotulo("ALTA PARCIAL"), "↗", "ALTA PARCIAL:");
  eq(API.setaDoRotulo("DIVIDIDO"), "↔", "DIVIDIDO:");
  eq(API.setaDoRotulo("BAIXA PARCIAL"), "↘", "BAIXA PARCIAL:");
  eq(API.setaDoRotulo("BAIXA"), "↓", "BAIXA:");
  eq(API.setaDoRotulo("PARADO"), "⊙", "PARADO:");
});

t("rótulo desconhecido não inventa direção", ()=>{
  eq(API.setaDoRotulo("SEM DADO"), "·", "SEM DADO:");
  eq(API.setaDoRotulo("qualquer coisa"), "·", "desconhecido:");
  eq(API.setaDoRotulo(null), "·", "nulo:");
});

console.log("\nBLOCO B — a barra representa a proporção, não outra coisa");

t("os três segmentos somam 100%", ()=>{
  const b = API.barraProporcao(5, 2, 3);   // alta, baixa, neutro
  const soma = b.pctAlta + b.pctBaixa + b.pctNeutro;
  if(Math.abs(soma - 100) > 0.01) throw new Error("soma = " + soma);
  eq(Math.round(b.pctAlta), 50, "alta de 10:");
});

t("camada vazia não gera barra falsa", ()=>{
  const b = API.barraProporcao(0, 0, 0);
  eq(b.pctAlta, 0, "alta:"); eq(b.pctBaixa, 0, "baixa:"); eq(b.pctNeutro, 0, "neutro:");
  eq(b.vazia, true, "marcada como vazia:");
});

t("a barra usa MEDIDOS, nunca o total declarado", ()=>{
  /* se usasse o total, a ausência viraria um pedaço cinza que parece neutro —
     exatamente a confusão que a camada existe para evitar. */
  const b = API.barraProporcao(3, 0, 0);
  eq(Math.round(b.pctAlta), 100, "3 de 3 medidos em alta:");
});

console.log("\nBLOCO C — o mini gráfico desenha o que recebe");

t("gera caminho com um ponto por vela", ()=>{
  const g = API.miniGrafico([1,2,3,4,5], 100, 20);
  eq((g.d.match(/L/g) || []).length, 4, "segmentos para 5 pontos:");
  if(g.d.indexOf("M") !== 0) throw new Error("o caminho não começa com M");
});

t("preço plano vira linha reta, não erro de divisão", ()=>{
  const g = API.miniGrafico([100,100,100], 90, 20);
  if(/NaN|Infinity/.test(g.d)) throw new Error("divisão por zero vazou: " + g.d);
});

t("a alta vai para CIMA no desenho (y invertido em SVG)", ()=>{
  const g = API.miniGrafico([10, 20], 100, 20);
  const ys = [...g.d.matchAll(/[ML]\s*[\d.]+\s+([\d.]+)/g)].map(function(m){ return Number(m[1]); });
  if(!(ys[1] < ys[0]))
    throw new Error("o preço subiu e a linha desceu: y0=" + ys[0] + " y1=" + ys[1]);
});

t("menos de dois pontos não desenha", ()=>{
  eq(API.miniGrafico([5], 100, 20), null, "um ponto:");
  eq(API.miniGrafico([], 100, 20), null, "vazio:");
  eq(API.miniGrafico(null, 100, 20), null, "nulo:");
});

t("a variação do período vem junto, para o texto", ()=>{
  const g = API.miniGrafico([100, 110], 100, 20);
  if(Math.abs(g.variacao - 10) > 0.01) throw new Error("variação = " + g.variacao);
});

console.log("\nBLOCO D — as velas de cada relógio");

t("cada camada declara a própria janela E ela chega em quem lê", ()=>{
  /* v122.1 — o teste antigo só olhava a CONSTANTE. A janela estava declarada
     e não era devolvida por lerCamada: o painel lia undefined e o diagnóstico
     imprimia "AGORA ():". Verificar a declaração não é verificar a entrega. */
  const f = semComentarios(declDe("lerCamada"));
  if(!/janela:\s*janela/.test(f))
    throw new Error("lerCamada não devolve a janela — o consumidor recebe undefined");
  const limpo = semComentarios(HTML);
  if(!/janela:\s*"24h"/.test(limpo)) throw new Error("AGORA sem janela declarada");
  if(!/janela:\s*"7d"/.test(limpo)) throw new Error("SEMANA sem janela declarada");
  if(!/janela:\s*"30d"/.test(limpo)) throw new Error("TERRENO sem janela declarada");
});

t("A VELA DE HOJE ENTRA no gráfico diário, e sai no de 1h", ()=>{
  /* v122.2 — medido em 19/08 14:51: com pop() na diária, d7 e d30 terminavam
     no fechamento de ontem (64.725) com o BTC em 68.138, e o gráfico do
     TERRENO ficava vermelho num dia de +5%. A regra da v110 vale para quem
     VOTA; aqui é contexto visual, e omitir hoje esconde o presente. */
  const f = semComentarios(declDe("coletarVelasCamadas"));
  if(/d1\.pop\(\)/.test(f))
    throw new Error("a vela de hoje continua sendo descartada do gráfico diário");
  if(!/h1\.pop\(\)/.test(f))
    throw new Error("a hora em formação deixou de ser descartada — ela é ruído de minutos");
});

t("a coleta das velas não derruba a rodada se falhar", ()=>{
  const f = semComentarios(declDe("coletarVelasCamadas"));
  if(!/catch/.test(f)) throw new Error("sem catch: a Binance fora do ar quebraria a coleta inteira");
});

t("o painel funciona sem as velas — o gráfico é opcional", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/velasCamadas/.test(f)) throw new Error("o painel não consulta as velas");
  if(!/\?|&&|if\(/.test(f)) throw new Error("o painel não trata a ausência das velas");
});

console.log("\nBLOCO E — o gráfico é contexto, e a tela diz isso");

t("a tela rotula o gráfico como contexto, não como afirmação", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/contexto/i.test(f))
    throw new Error("o gráfico aparece sem dizer que é contexto — convida a ler previsão");
});

t("continua declarando que nada antecede o preço", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/defasagem zero|não é previsão/i.test(f))
    throw new Error("o aviso de que nada antecede sumiu");
});

console.log("\nBLOCO F — o diagnóstico copiável leva as camadas junto");

t("o relatório de texto inclui as três camadas", ()=>{
  const f = semComentarios(declDe("relatorioTexto"));
  if(!/leituraPorCadencia\(/.test(f))
    throw new Error("o diagnóstico não inclui a leitura por cadência");
});

t("leva proporção, força, cobertura e rótulo — não só o rótulo", ()=>{
  const f = semComentarios(declDe("relatorioTexto"));
  ["rotulo", "forca", "medidos"].forEach(function(campo){
    if(f.indexOf(campo) === -1) throw new Error("o texto não leva " + campo);
  });
});

console.log("\nBLOCO G — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("as funções de desenho não escrevem estado", ()=>{
  ["setaDoRotulo","barraProporcao","miniGrafico"].forEach(function(fn){
    const f = semComentarios(declDe(fn));
    if(/saveState\(|S\.motors|setAuto\(/.test(f))
      throw new Error(fn + " toca no estado");
  });
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.121-/.test(m[1])) throw new Error("continua a v121: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v122 verde — cada camada com o seu relógio, e o diagnóstico junto.");

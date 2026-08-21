/* =====================================================================
   harness-v125.js — TERMÔMETRO DE APETITE: painel próprio, série própria
   =====================================================================
   MODEL_VERSION continua m12. O score não muda. Nenhum indicador é
   promovido. O termômetro vive num painel separado e grava no JSON.

   DE ONDE VEIO. Em 19–20/08 o BTC saiu de ~62k e passou de 73k. Durante o
   movimento, 19 dos 31 indicadores do sistema NÃO SE MOVERAM um décimo —
   são fontes diárias ou de janela de 90 dias. E dos 12 que se moveram,
   quatro eram momentum, rsi, mediaMovel e tendencia: o preço com outro nome.

   O termômetro usa SÓ FLUXO, e nada derivado do preço.

   OS TRÊS COMPONENTES, e por que só três. A versão de laboratório testou
   cinco contra as 48 horas reais. Medido:
   · CVD 24h        — 29 → 92 na virada, e 92 → 50 esvaziando. O melhor.
   · Open interest 4h — 16 → 78 → 100 às 11:35, e o BTC saltou 3.166 na hora
     seguinte. Pegou o primeiro movimento.
   · Funding invertido — 74–90 na subida, despencou a 6 e ficou. Descreve
     regime: a manada entrou comprada e não saiu.
   REPROVADOS e retirados:
   · Taker oficial  — 67→33→50→95→38→64→93→3→5→81. Ruído. E mediu r=−0,001
     contra o retorno em 8.900 pontos: zero perfeito.
   · Agressão de 1h — oscila igual e é redundante com o CVD, que faz a mesma
     medida com memória.
   O padrão: os três que serviram são ACUMULADOS; os dois que falharam são
   INSTANTÂNEOS. É a terceira vez que isso aparece — foi o que rebaixou o
   takerRatio (v111) e o book (v106).

   PERCENTIL, NÃO ESCALA FIXA. Medido em 20/08: o corte de ±15, herdado de um
   indicador para todos, cruza em 0% dos dias no funding, 1,8% no CVD, 82% nos
   endereços ativos e 86% no hash rate. Dois nunca falam, dois falam sempre.
   Em percentil expandido — cada leitura comparada só com o próprio passado —
   todos falam a mesma língua. A versão de laboratório deu mediana 51 com
   distribuição quase simétrica.

   O QUE ELE NÃO É: previsão. Onze rodadas e ~150 testes, nada antecede o
   preço. O melhor resultado que apareceu (OI, r=+0,355, t=6,54 na reserva)
   EVAPOROU para r=+0,013 quando removemos as 48h do episódio que o gerou.

   Uso:  node harness-v125.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v124 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    declDe("percentilDeApetite"), declDe("estadoDeApetite"), declDe("calcularApetite"),
    declDe("estadoDeRegime"), declDe("estadoDeFluxo"), declDe("defaultState"), declDe("ind"),
    "return { percentilDeApetite, estadoDeApetite, calcularApetite, estadoDeRegime, estadoDeFluxo, defaultState };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function perto(a,b,m,tol){ if(Math.abs(a-b) > (tol===undefined?0.5:tol))
  throw new Error((m||"")+" esperado ~"+b+", veio "+a); }

console.log("\nBLOCO A — o percentil não pode olhar o futuro");

/* CORRIGIDO: os dois primeiros usavam 5 pontos de histórico, abaixo do mínimo
   de 30 — a função recusava com razão e o teste é que estava errado. */
t("valor maior que todo o passado dá 100", ()=>{
  const hist=[]; for(let i=0;i<40;i++) hist.push(i);
  perto(API.percentilDeApetite(hist, 99), 100, "acima de tudo:");
});
t("valor menor que todo o passado dá 0", ()=>{
  const hist=[]; for(let i=1;i<=40;i++) hist.push(i);
  perto(API.percentilDeApetite(hist, -5), 0, "abaixo de tudo:");
});
t("valor no meio dá ~50", ()=>{
  const hist=[]; for(let i=0;i<100;i++) hist.push(i);
  perto(API.percentilDeApetite(hist, 50), 50, "meio:", 2);
});
t("histórico curto não inventa percentil", ()=>{
  /* com pouca história, qualquer valor viraria 0 ou 100 — o que seria uma
     afirmação forte apoiada em nada. */
  eq(API.percentilDeApetite([1,2], 1.5), null, "2 pontos:");
  eq(API.percentilDeApetite([], 5), null, "vazio:");
  eq(API.percentilDeApetite(null, 5), null, "nulo:");
});
t("valor não-numérico não vira percentil", ()=>{
  const hist=[]; for(let i=0;i<60;i++) hist.push(i);
  eq(API.percentilDeApetite(hist, null), null, "nulo:");
  eq(API.percentilDeApetite(hist, NaN), null, "NaN:");
});

console.log("\nBLOCO B — os cinco estados, e os cortes");

t("os cortes produzem os cinco estados", ()=>{
  eq(API.estadoDeApetite(95).nome, "COMPRADOR FORTE", "95:");
  eq(API.estadoDeApetite(75).nome, "COMPRADOR FORTE", "75 (limite):");
  eq(API.estadoDeApetite(74).nome, "COMPRADOR", "74:");
  eq(API.estadoDeApetite(58).nome, "COMPRADOR", "58 (limite):");
  eq(API.estadoDeApetite(50).nome, "MORNO", "50:");
  eq(API.estadoDeApetite(42).nome, "MORNO", "42 (limite):");
  eq(API.estadoDeApetite(41).nome, "VENDEDOR", "41:");
  eq(API.estadoDeApetite(25).nome, "VENDEDOR", "25 (limite):");
  eq(API.estadoDeApetite(24).nome, "VENDEDOR FORTE", "24:");
});
t("sem dado não vira MORNO", ()=>{
  /* tratar ausência como "morno" seria afirmar equilíbrio onde há silêncio */
  eq(API.estadoDeApetite(null).nome, "SEM DADO", "nulo:");
  eq(API.estadoDeApetite(undefined).nome, "SEM DADO", "indefinido:");
});

console.log("\nBLOCO C — O CASO REAL de 19–20/08");

t("11:35 de 19/08 — o pico, antes do salto de 3.166 dólares", ()=>{
  /* percentis medidos no laboratório naquela hora: cvd 39, oi 100, fd 74 */
  const r = API.calcularApetite({ cvd:39, oi:100, funding:74 });
  perto(r.valor, 71, "apetite:", 1);
  eq(r.estado.nome, "COMPRADOR", "estado:");
  eq(r.componentes, 3, "componentes usados:");
});

t("AGORA (20/08 20:35) — preço no topo e fluxo no chão", ()=>{
  /* cvd 50, oi 33, funding 10 — a divergência que o score não mostrava */
  const r = API.calcularApetite({ cvd:50, oi:33, funding:10 });
  perto(r.valor, 31, "apetite:", 1);
  eq(r.estado.nome, "VENDEDOR", "estado:");
});

t("A CORREÇÃO QUE OS TRÊS FAZEM: o salto de 05:35 deixa de ser MORNO", ()=>{
  /* com os cinco componentes, 20/08 05:35 marcou 50 (MORNO) num salto de
     1.895 dólares — o taker (73) e a agressão (77) puxaram a média enquanto
     o CVD estava em 87. Com só os três acumulados o retrato muda. */
  const cinco = (87 + 77 + 73 + 7 + 7) / 5;      /* cvd, agr, tk, oi, fd */
  const tres  = (87 + 7 + 7) / 3;                 /* cvd, oi, fd */
  const r = API.calcularApetite({ cvd:87, oi:7, funding:7 });
  perto(r.valor, tres, "com três:", 0.6);
  if(Math.abs(r.valor - cinco) < 1)
    throw new Error("os três dão o mesmo que os cinco — a mudança não teve efeito");
});

console.log("\nBLOCO D — o que entra e o que NÃO entra");

t("são exatamente três componentes, e são os acumulados", ()=>{
  const limpo = semComentarios(declDe("calcularApetite"));
  ["cvd","oi","funding"].forEach(function(k){
    if(limpo.indexOf(k) === -1) throw new Error("falta o componente " + k);
  });
});

t("TAKER E AGRESSÃO INSTANTÂNEA ficaram de fora", ()=>{
  /* reprovados contra as 48 horas reais: o taker pulou 90 pontos entre horas
     consecutivas e mediu r=−0,001 contra o retorno em 8.900 pontos. */
  const limpo = semComentarios(declDe("calcularApetite"));
  if(/takerRatio|agressao1h|agr1h/.test(limpo))
    throw new Error("um componente instantâneo voltou para o termômetro");
});

t("NADA derivado do preço entra", ()=>{
  /* momentum, rsi, mediaMovel e tendencia são o preço com outro nome: um
     termômetro que os inclui só diz que o preço subiu. */
  const limpo = semComentarios(declDe("calcularApetite"));
  ["momentum","rsi","mediaMovel","tendencia","change24h"].forEach(function(k){
    if(limpo.indexOf(k) !== -1) throw new Error("entrou algo derivado do preço: " + k);
  });
});

t("com menos de dois componentes não há leitura", ()=>{
  eq(API.calcularApetite({ cvd:80 }).valor, null, "um só:");
  eq(API.calcularApetite({}).valor, null, "nenhum:");
  if(API.calcularApetite({ cvd:80, oi:60 }).valor === null)
    throw new Error("dois componentes deveriam bastar");
});

console.log("\nBLOCO D2 — A BASE DO PERCENTIL (defeito da v125, corrigido na v126)");

t("as velas são PAGINADAS até 30 dias", ()=>{
  /* MEDIDO em 21/08 com o BTC a 78.042: o CVD bruto de +3,11% (percentil ~88
     na distribuição de 8.976 janelas) apareceu como 53 — "normal" — porque a
     base tinha 711 pontos, 2,5 dias, QUE ERAM A PRÓPRIA ALTA.
     Uma chamada só de 1.000 velas não basta: depois da janela de 24h sobram
     ~700. O open interest eu paginei; as velas, esqueci. */
  const f = semComentarios(declDe("coletarApetite"));
  if(!/endTime=/.test(f))
    throw new Error("as velas não são paginadas — a base do CVD fica em ~2,5 dias");
  if(!/8700|30 dias/.test(f))
    throw new Error("a paginação não declara o alvo de 30 dias");
});

t("a base é declarada, e base curta é sinalizada", ()=>{
  const f = semComentarios(declDe("coletarApetite"));
  if(!/baseCurta/.test(f)) throw new Error("não marca quando a base é curta");
  if(!/base:\s*\{/.test(f)) throw new Error("não grava o tamanho da base");
});

t("o painel AVISA quando a base é curta", ()=>{
  /* sem o aviso, uma leitura calculada contra 2 dias pareceria igual a uma
     calculada contra 30 — e foi exatamente assim que o defeito passou. */
  const f = semComentarios(declDe("blocoApetite"));
  if(!/baseCurta/.test(f)) throw new Error("o painel não avisa sobre base curta");
});

console.log("\nBLOCO D3 — v127: duas perguntas, dois medidores");

t("o FLUXO deixou de usar escala comprador/vendedor", ()=>{
  /* MEDIDO em 21/08: BTC a 77.810, +8,37% em 24h, 21% acima da média de 200
     semanas — e o painel dizia "VENDEDOR". Os números estavam certos; o
     rótulo, errado. Fluxo de derivativos não é direção de mercado. */
  eq(API.estadoDeFluxo(80).nome, "MUITO FORTE", "80:");
  eq(API.estadoDeFluxo(65).nome, "FORTE", "65:");
  eq(API.estadoDeFluxo(50).nome, "NORMAL", "50:");
  eq(API.estadoDeFluxo(30).nome, "FRACO", "30:");
  eq(API.estadoDeFluxo(10).nome, "MUITO FRACO", "10:");
  ["COMPRADOR","VENDEDOR"].forEach(function(p){
    [10,30,50,65,80].forEach(function(v){
      if(API.estadoDeFluxo(v).nome.indexOf(p) !== -1)
        throw new Error("o fluxo ainda diz " + p);
    });
  });
});

t("o REGIME responde a pergunta sobre o mercado", ()=>{
  eq(API.estadoDeRegime(100).nome, "ALTA", "todos apontando alta:");
  eq(API.estadoDeRegime(70).nome, "ALTA PARCIAL", "maioria:");
  eq(API.estadoDeRegime(50).nome, "SEM DEFINIÇÃO", "dividido:");
  eq(API.estadoDeRegime(10).nome, "BAIXA", "todos apontando baixa:");
  eq(API.estadoDeRegime(null).nome, "SEM DADO", "nulo:");
});

t("O CASO DE 21/08: regime de ALTA com fluxo FRACO", ()=>{
  /* BTC 21% acima da MM200, 12% abaixo da MM100, 5% abaixo da MM50,
     tendência +10,8, MVRV 1,32 → 3 de 5 apontando alta.
     Fluxo: CVD 63, OI 33, funding 24 → 40. */
  const fluxo = API.calcularApetite({ cvd:63, oi:33, funding:24 });
  perto(fluxo.valor, 40, "fluxo:", 1);
  eq(API.estadoDeFluxo(fluxo.valor).nome, "FRACO", "estado do fluxo:");
  /* 3 alta, 2 baixa em 5 itens → (1/5+1)/2*100 = 60 */
  eq(API.estadoDeRegime(60).nome, "ALTA PARCIAL", "regime com 3 de 5:");
});

t("o regime NÃO entra no fluxo, e vice-versa", ()=>{
  /* misturar os dois recria exatamente o problema que a v127 conserta */
  const f = semComentarios(declDe("calcularApetite"));
  ["weeklyMAs","tendencia","mvrv"].forEach(function(k){
    if(f.indexOf(k) !== -1) throw new Error("o fluxo passou a usar " + k);
  });
  const r = semComentarios(declDe("calcularRegime"));
  ["cvd","funding"].forEach(function(k){
    if(r.indexOf(k) !== -1) throw new Error("o regime passou a usar " + k);
  });
});

t("o regime é gravado na série", ()=>{
  const f = semComentarios(declDe("montarSnapshot"));
  if(!/regime:/.test(f)) throw new Error("o snapshot não grava o regime");
});

console.log("\nBLOCO D4 — v128: o regime na manchete, e a saturação visível");

t("o topo mostra o REGIME, não o score", ()=>{
  /* MEDIDO: de 19 a 21/08 o BTC foi de 64.904 a 77.810 (+20%) e o veredito do
     topo ficou "Neutro · Observar" o tempo todo. Causa aritmética, na última
     leitura: motores rápidos 20,1% do peso, lentos 53,9%. Mais da metade do
     peso está em janelas de 90 dias que NÃO TÊM COMO se mover em dois dias. */
  const f = semComentarios(declDe("renderHero"));
  if(!/calcularRegime\(\)/.test(f)) throw new Error("o topo não calcula o regime");
  if(!/estadoDeRegime\(/.test(f)) throw new Error("o topo não usa o rótulo do regime");
});

t("o score continua visível, como linha secundária", ()=>{
  /* rebaixar não é apagar: ele continua alimentando a série das 777 */
  const f = semComentarios(declDe("renderHero"));
  if(!/ms\.score/.test(f)) throw new Error("o score sumiu do topo");
  if(!/secund/i.test(f)) throw new Error("o score não é apresentado como secundário");
});

t("A SATURAÇÃO É DECLARADA — teto não é medida", ()=>{
  /* a média móvel bateu 100 e ficou: não distingue 7% de 14% acima da MM50.
     O teto apaga a magnitude justamente quando o movimento é grande. */
  const f = semComentarios(declDe("marcarSaturacao"));
  if(!/TETO/.test(f)) throw new Error("a saturação não é marcada na nota");
  if(!/parou de medir/i.test(f))
    throw new Error("a nota não explica que o número deixou de crescer");
});

t("marcar saturação NÃO altera o valor nem o score", ()=>{
  const f = semComentarios(declDe("marcarSaturacao"));
  if(/ind\.value\s*=/.test(f)) throw new Error("a função mexe no valor do indicador");
  if(/excludeFromScore/.test(f)) throw new Error("a função mexe no direito de voto");
});

t("NENHUM peso foi mexido — a correção não é reponderar", ()=>{
  /* reponderar olhando o resultado é o encaixe no passado que este projeto
     passou três dias combatendo. O m12 continua intacto. */
  const S = API.defaultState();
  eq(S.motors.macro.weight, 0.15, "macro:");
  eq(S.motors.ativosGlobais.weight, 0.21, "ativosGlobais:");
  eq(S.motors.tecnico.weight, 0.04, "tecnico:");
  eq(S.motors.derivativos.weight, 0.15, "derivativos:");
});

t("o momentum continua sensor — não foi promovido de volta", ()=>{
  /* ele foi o que mais reagiu (saturou em +100) e fui eu que o rebaixei no
     m12. Promover agora seria escolher olhando o resultado. */
  const S = API.defaultState();
  eq(S.motors.tecnico.indicators.momentum.excludeFromScore, true, "momentum:");
});

console.log("\nBLOCO E — o painel, a série e a NÃO contaminação");

t("o painel existe e é próprio", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf('id="painelApetite"') === -1) throw new Error("não achei o painel");
});

t("o painel declara que NÃO é previsão", ()=>{
  const f = semComentarios(declDe("blocoApetite"));
  if(!/não é previsão|não prevê/i.test(f))
    throw new Error("o painel não deixa claro que descreve, não prevê");
});

t("o snapshot grava o apetite", ()=>{
  const f = semComentarios(declDe("montarSnapshot"));
  if(!/apetite:/.test(f)) throw new Error("o snapshot não grava o apetite");
});

t("gravar o apetite não pode derrubar a série", ()=>{
  const f = semComentarios(declDe("montarSnapshot"));
  const i = f.indexOf("apetite:");
  const trecho = f.slice(Math.max(0, i-300), i+250);
  if(!/try/.test(trecho))
    throw new Error("sem try: um erro no apetite impediria a gravação do score");
});

t("O SCORE NÃO É TOCADO — nenhum indicador foi promovido", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
  const f = semComentarios(declDe("calcularApetite")) + semComentarios(declDe("blocoApetite"));
  if(/excludeFromScore|setAuto\(|saveState\(/.test(f))
    throw new Error("o termômetro mexe no estado ou no voto");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.124/.test(m[1])) throw new Error("continua a v124: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v125 verde — termômetro de apetite: três fluxos acumulados, painel próprio.");

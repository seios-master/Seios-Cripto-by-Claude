/* =====================================================================
   harness-v112.js — os relatórios passam a obedecer o mesmo modelo
   =====================================================================
   Auditoria dos 14 painéis, feita sobre a v111. Quatro defeitos, todos de
   APRESENTAÇÃO — nenhuma fórmula, peso, direito de voto ou valor de
   indicador muda, e MODEL_VERSION continua m11.

   1. "MAIOR PESO NESTA LEITURA" ordenava por `composite × motor.weight`,
      peso NOMINAL — enquanto o rastro logo abaixo dizia "não é o nominal do
      cadastro que decide o score". MEDIDO na leitura de 08:28: o painel
      apontou o Geopolítico como um dos três maiores pesos, quando o peso
      efetivo dele era 1,7%, o menor do sistema (contribuição 0,86 contra
      2,04 do Macro, que ficou de fora). O agregador canônico já entrega
      `ms.ag.porMotor[mk].contribuicao`; o painel só não usava.

   2. Case Engine e track record liam o histórico inteiro sem separar por
      modelo — e o histórico nem gravava MODEL_VERSION. É a v102 (delta entre
      réguas) e a v94 (contagem) outra vez, agora nos painéis.

   3. Case Engine rotulava "coerente/invertida" comparando duas médias com
      mínimo de 5 casos, sem barra de erro. É o que a v109 corrigiu na tabela
      de calibração — que tinha 285 dias e ainda assim não passava.

   4. "O QUE MUDOU" comparava `previousComposites` gravado no estado, que
      sobrevive ao bump: no primeiro uso após a v111, parte do "que mudou"
      era a régua nova, não o mercado.

   Uso:  node harness-v112.js index.html
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
let API;
try{
  API = new Function([
    declDe("estatisticaSeparacao"), declDe("mesmoModelo"), declDe("fatoresPorContribuicao"),
    "return { estatisticaSeparacao, mesmoModelo, fatoresPorContribuicao };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

/* a leitura REAL de 08:28, com os pesos efetivos que a tela mostrou */
function leitura0828(){
  return {
    composites: { macro:5.69, institucional:-0.39, onchain:42.13, derivativos:-2.95,
                  tecnico:0.70, sentimento:18.00, geopolitico:-50.49, eventos:null, ativosGlobais:22.89 },
    ag: { porMotor: {
      macro:{contribuicao:5.69*0.359}, institucional:{contribuicao:-0.39*0.048},
      onchain:{contribuicao:42.13*0.096}, derivativos:{contribuicao:-2.95*0.160},
      tecnico:{contribuicao:0.70*0.051}, sentimento:{contribuicao:18.00*0.032},
      geopolitico:{contribuicao:-50.49*0.017}, ativosGlobais:{contribuicao:22.89*0.103}
    }}
  };
}
const MOTORES = { macro:{label:"Macro"}, institucional:{label:"Fluxo institucional (ETFs)"},
  onchain:{label:"On-chain"}, derivativos:{label:"Derivativos"}, tecnico:{label:"Técnico"},
  sentimento:{label:"Sentimento"}, geopolitico:{label:"Geopolítico"}, eventos:{label:"Eventos"},
  ativosGlobais:{label:"Ativos Globais"} };

console.log("\nBLOCO A — o painel passa a usar a contribuição canônica");

t("O CASO MEDIDO: às 08:28 o Geopolítico NÃO era um dos três maiores", ()=>{
  const ms = leitura0828();
  const top = API.fatoresPorContribuicao(ms, MOTORES).map(function(f){ return f.key; });
  if(top.indexOf("geopolitico") !== -1)
    throw new Error("o Geopolítico continua no pódio — peso efetivo 1,7%, contribuição 0,86");
  eq(top.join(","), "onchain,ativosGlobais,macro", "os três maiores por contribuição efetiva:");
});

t("a ordenação NÃO é a do peso nominal — as duas discordam neste caso", ()=>{
  /* se as duas coincidissem sempre, a correção não teria efeito e o teste
     não separaria nada. Aqui elas discordam, e é por isso que o caso serve. */
  const ms = leitura0828();
  const nominal = { macro:.28, institucional:.15, onchain:.15, derivativos:.15, tecnico:.04,
                    sentimento:.05, geopolitico:.05, ativosGlobais:.08 };
  const porNominal = Object.keys(nominal)
    .map(function(k){ return { k: k, v: Math.abs((ms.composites[k]||0) * nominal[k]) }; })
    .sort(function(a,b){ return b.v - a.v; }).slice(0,3).map(function(x){ return x.k; });
  if(porNominal.indexOf("geopolitico") === -1)
    throw new Error("o teste não reproduz o defeito: o nominal também excluiria o Geopolítico");
});

t("motor sem dado não entra no pódio", ()=>{
  const ms = leitura0828();
  const top = API.fatoresPorContribuicao(ms, MOTORES).map(function(f){ return f.key; });
  if(top.indexOf("eventos") !== -1) throw new Error("motor sem composite entrou");
});

t("o painel devolve a contribuição junto, para poder ser conferida na tela", ()=>{
  const f = API.fatoresPorContribuicao(leitura0828(), MOTORES)[0];
  if(!("contribuicao" in f)) throw new Error("não devolve o número que ordenou");
  if(Math.abs(f.contribuicao - 42.13*0.096) > 1e-9)
    throw new Error("a contribuição devolvida não é a canônica");
});

t("nenhum ponto da tela ordena fator por peso nominal", ()=>{
  const limpo = semComentarios(HTML);
  if(/\(ms\.composites\[key\]\|\|0\)\s*\*\s*motor\.weight/.test(limpo))
    throw new Error("a ordenação por nominal continua no arquivo");
  if(!/fatoresPorContribuicao\(ms/.test(limpo))
    throw new Error("o painel não passa pela função canônica");
});

t("a concentração é medida sobre a MESMA base do pódio", ()=>{
  const f = semComentarios(declDe("computeDecision"));
  if(/Math\.abs\(c\*m\.weight\)/.test(f))
    throw new Error("a dependência concentrada continua somando peso nominal");
});

console.log("\nBLOCO B — nenhum painel compara leituras de réguas diferentes");

t("mesmoModelo compara etiqueta, e trata ausência como NÃO comparável", ()=>{
  eq(API.mesmoModelo("m11-2026-08-18", "m11-2026-08-18"), true, "iguais:");
  eq(API.mesmoModelo("m10-2026-08-18", "m11-2026-08-18"), false, "réguas diferentes:");
  eq(API.mesmoModelo(null, "m11-2026-08-18"), false, "registro sem etiqueta:");
  eq(API.mesmoModelo(undefined, undefined), false, "ambos sem etiqueta:");
});

t("o histórico passa a gravar o MODELO, não só o build", ()=>{
  const limpo = semComentarios(HTML);
  const pushes = [...limpo.matchAll(/S\.history\.push\(\{[\s\S]{0,420}?\}\)/g)];
  if(pushes.length < 2) throw new Error("só " + pushes.length + " gravação(ões) de histórico encontrada(s)");
  pushes.forEach(function(m, i){
    if(!/modelo:\s*MODEL_VERSION/.test(m[0]))
      throw new Error("a gravação #" + (i+1) + " não etiqueta o modelo");
  });
});

t("Case Engine e track record filtram por modelo", ()=>{
  ["computeCaseEngine", "computePersonalTrackRecord"].forEach(function(fn){
    const f = semComentarios(declDe(fn));
    if(!/mesmoModelo\(/.test(f))
      throw new Error(fn + " continua misturando m5 até m11 na mesma média");
  });
});

t("e DIZEM quantos registros ficaram de fora — silêncio aqui vira número menor sem explicação", ()=>{
  const f = semComentarios(declDe("computeCaseEngine"));
  if(!/foraDoModelo/.test(f))
    throw new Error("o descarte por modelo não é contado nem reportado");
});

t("O QUE MUDOU não compara entre réguas", ()=>{
  const limpo = semComentarios(HTML);
  if(!/previousModelo/.test(limpo))
    throw new Error("o delta de composites não guarda de qual modelo veio");
  const i = limpo.indexOf("if(S.market.previousComposites");
  const trecho = limpo.slice(i, i + 400);
  if(!/mesmoModelo\(/.test(trecho))
    throw new Error("o delta continua subtraindo composite de m10 com m11");
});

console.log("\nBLOCO C — o Case Engine ganha a barra de erro da v109");

t("o rótulo coerente/invertida passa pela estatística", ()=>{
  const f = semComentarios(declDe("computeCaseEngine"));
  if(/avgBull > avgBear \? "coerente" : "invertida"/.test(f))
    throw new Error("continua decidindo por comparação crua de médias");
  if(!/estatisticaSeparacao\(/.test(f))
    throw new Error("não usa a mesma estatística da tabela de calibração");
});

t("cinco casos de cada lado NÃO sustentam veredito", ()=>{
  /* com janela de 7 a 12 dias, cinco decisões resolvidas não chegam perto de
     amostra efetiva — é o mesmo corte que a v109 aplicou. */
  const bull = [3,4,5,6,7], bear = [-3,-4,-5,-6,-7];
  const e = API.estatisticaSeparacao(bull, bear, 10);
  if(e && e.suficiente)
    throw new Error("5 casos por lado foram aceitos como amostra suficiente");
});

t("a tela explica por que quase tudo aqui vai dizer 'sem significância'", ()=>{
  /* ancorado no TÍTULO do painel, não na primeira aparição das palavras "Case
     Engine" — que é o botão, 150 linhas antes. Âncora errada dá falha onde não
     há defeito, e um dia daria aprovação onde há. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("Quem está acertando, motor por motor");
  if(i === -1) throw new Error("não achei o painel do Case Engine");
  const trecho = limpo.slice(i, i + 3000);
  if(!/significância/i.test(trecho))
    throw new Error("o painel não explica o critério novo");
  if(!/amostra insuficiente/i.test(trecho))
    throw new Error("o painel não avisa que vai dizer 'não sei' quase sempre");
  if(!/m5|modelo atual/i.test(trecho))
    throw new Error("o painel não explica o filtro por modelo");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m11 — build de apresentação", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 11) throw new Error("modelo regrediu para m" + m[1]);
  /* v117 — FATO DATADO ≠ INVARIANTE, sétima vez no projeto.
     "continua m11" expira no próximo bump legítimo. O invariante é que o
     modelo nunca REGRIDE. Que a v112 não bumpou é fato histórico, e está
     provado pelo próprio commit — não por este teste. */
  if(Number(m[1]) < 11)
    throw new Error("modelo regrediu para m" + m[1]);
});

t("as fórmulas que votam continuam intactas", ()=>{
  const limpo = semComentarios(HTML);
  [/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/,
   /"macro\.liquidez":\s*rank\s*=>\s*scoreDoPercentil\(rank, \+1\)/,
   /"derivativos\.funding":\s*rate\s*=>\s*clamp\(-rate \* 100000/].forEach(function(re){
    if(!re.test(limpo)) throw new Error("uma fórmula que vota foi alterada: " + re);
  });
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.111-/.test(m[1])) throw new Error("continua a v111: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v112 verde — os relatórios param de contradizer o modelo.");

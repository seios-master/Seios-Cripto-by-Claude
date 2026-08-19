/* =====================================================================
   harness-v120.js — o que ficou de fora do score, à vista
   =====================================================================
   Build de apresentação: MODEL_VERSION continua m12, nenhuma fórmula muda,
   nenhum sensor é promovido. O painel MOSTRA; não decide.

   POR QUE ELE EXISTE. Em 19/08 o BTC saiu de ~62k e bateu 68,7k (+5,96% em
   24h) e o score foi de 11,60 para 11,89 — "Neutro · Observar" o dia todo.
   Jorge perguntou o que estava sinalizando alta e o sistema não enxergou.
   A pergunta é legítima e a resposta estava espalhada por trinta linhas de
   diagnóstico.

   E a resposta contraria a intuição — inclusive a minha. MEDIDO com o
   agregador real naquela leitura: se os seis sensores votassem, o score
   NÃO subiria. Cairia de 11,89 para 10,07. Só momentum (+71,51) e book
   (+44,68) apontavam alta; ouro (−29,23), long/short (−11,32) e euro
   (−3,16) apontavam o contrário, e o ouro pesa dentro de Ativos Globais,
   o maior motor do m12.

   Por isso o painel mostra o CONTRAFACTUAL calculado, não uma impressão:
   "se os sensores votassem, o score seria X". Sem o número, a tela viraria
   uma lista de valores que cada um interpreta como quiser.

   Uso:  node harness-v120.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v119 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
function cst(n){
  const i = HTML.indexOf("const " + n + " ="); const a = HTML.indexOf("{", i);
  let d=0,s=null,e=false;
  for(let k=a;k<HTML.length;k++){ const c=HTML[k];
    if(e){e=false;continue;} if(c==="\\"){e=true;continue;}
    if(s){ if(c===s) s=null; continue; }
    if(c==='"'||c==="'"||c==="`"){ s=c; continue; }
    if(c==="{") d++; else if(c==="}"){ d--; if(!d) return HTML.slice(i,k+1)+";"; } }
  return HTML.slice(i, HTML.indexOf(";", i)+1);
}
const ctx = { S:null };
let API;
try{
  const m = /const EVENTO_JANELA_DIAS\s*=\s*(\d+)/.exec(HTML);
  API = new Function("ctx", "with(ctx){" + [
    "const EVENTO_JANELA_DIAS = " + (m?m[1]:30) + ";",
    cst("RENORM_MAX"), cst("TETO_POSITIVO"), cst("INDICATOR_HORIZON"), cst("VALIDADE_HORAS"),
    cst("FAMILIA_INDICADOR"), cst("SENSOR_SPECS"), cst("INDICATOR_SPECS"),
    declDe("ind"), declDe("defaultState"), declDe("indicadoresVotantes"),
    declDe("aplicarTetoPuro"), declDe("aplicarTeto"), declDe("validadeDoIndicador"),
    declDe("frescorDoIndicador"), declDe("valorVigente"), declDe("eventosDecaidos"),
    declDe("specDoIndicador"), declDe("familiaDoIndicador"), declDe("motorComposite"),
    declDe("contribuicoesCanonicas"), declDe("agregarCanonico"),
    declDe("sensoresDaLeitura"), declDe("contrafactualComSensores"),
    "return { defaultState, sensoresDaLeitura, contrafactualComSensores, agregarCanonico, contribuicoesCanonicas };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function perto(a,b,m,tol){ if(Math.abs(a-b) > (tol===undefined?0.05:tol))
  throw new Error((m||"")+" esperado ~"+b+", veio "+a); }

/* a leitura REAL de 19/08 12:44 */
const LEITURA = {
 "macro.juros":-0.40,"macro.inflacao":10.15,"macro.liquidez":-5.13,"macro.dxy":2.55,"macro.curva":20.51,
 "institucional.coinbasePremium":-2.04,
 "onchain.mvrv":30.84,"onchain.activeAddresses":-4.76,"onchain.hashrate":23.19,
 "derivativos.funding":-10.00,"derivativos.openInterest":30.21,"derivativos.putCall":26.83,
 "derivativos.longShort":-11.32,"derivativos.takerRatio":26.97,
 "tecnico.tendencia":21.41,"tecnico.momentum":71.51,"tecnico.rsi":-49.36,
 "tecnico.mediaMovel":60.52,"tecnico.bookImbalance":44.68,
 "sentimento.fearGreed":8.00,"geopolitico.epu":78.91,
 "ativosGlobais.petroleo":51.73,"ativosGlobais.sp500":20.55,"ativosGlobais.cobre":46.67,
 "ativosGlobais.vix":8.62,"ativosGlobais.juros10a":-2.00,
 "ativosGlobais.ouro":-29.23,"ativosGlobais.euro":-3.16
};
function carregar(){
  ctx.S = API.defaultState();
  Object.keys(LEITURA).forEach(function(id){
    const p = id.split(".");
    const i = ctx.S.motors[p[0]].indicators[p[1]];
    i.value = LEITURA[id]; i.status = "ok"; i.updatedAt = Date.now(); i.failed = false;
  });
}

console.log("\nBLOCO A — O CASO REAL: o dia em que o BTC subiu 6% e o score não");

t("o contrafactual reproduz o score REAL daquela leitura", ()=>{
  /* v124 — o valor "10,07" era FATO DATADO: foi medido com os seis sensores
     que existiam em 19/08 12:44. Quando o CVD nasceu sensor, o contrafactual
     daquela leitura mudou (passou a −2,12), porque com todos votando o número
     de votantes declarados muda e o peso por indicador junto.
     O que continua sendo invariante: o score REAL da leitura, que não depende
     de quantos sensores existem. O contrafactual é verificado pela DIREÇÃO no
     teste seguinte, não por um número que envelhece. */
  carregar();
  const c = API.contrafactualComSensores();
  perto(c.atual, 11.89, "score atual (não muda com sensor novo):", 0.05);
  if(!Number.isFinite(c.comSensores)) throw new Error("contrafactual não calculou");
});

t("E A DIREÇÃO É PARA BAIXO — o contrário da intuição", ()=>{
  carregar();
  const c = API.contrafactualComSensores();
  if(!(c.delta < 0))
    throw new Error("o teste perdeu o caso: os sensores deveriam DERRUBAR o score neste dia");
  /* faixa, não número: a composição de sensores muda com o tempo e o valor
     exato de um contrafactual passado deixa de ser reproduzível. A DIREÇÃO,
     que é o achado, continua. */
  if(!(c.delta < -1 && c.delta > -4))
    throw new Error("delta fora da faixa esperada: " + c.delta);
});

t("os seis sensores aparecem com valor e lado", ()=>{
  carregar();
  const s = API.sensoresDaLeitura();
  /* o número de sensores cresce quando um indicador novo nasce sem voto —
     fato datado. O invariante é que os seis daquele dia continuem listados. */
  if(s.length < 6) throw new Error("sensores listados: " + s.length);
  const porId = {}; s.forEach(function(x){ porId[x.id] = x; });
  perto(porId["tecnico.momentum"].valor, 71.51, "momentum:");
  perto(porId["ativosGlobais.ouro"].valor, -29.23, "ouro:");
  eq(porId["tecnico.momentum"].lado, "alta", "lado do momentum:");
  eq(porId["ativosGlobais.ouro"].lado, "baixa", "lado do ouro:");
});

t("a contagem de lados bate com os valores", ()=>{
  carregar();
  const s = API.sensoresDaLeitura();
  const alta = s.filter(function(x){ return x.lado === "alta"; }).length;
  const baixa = s.filter(function(x){ return x.lado === "baixa"; }).length;
  /* CORRIGIDO: eu contei errado ao escrever o teste. Apontando alta são TRÊS
     — momentum (+71,51), book (+44,68) e taker (+26,97). Apontando baixa,
     três — ouro (−29,23), long/short (−11,32) e euro (−3,16). O empate 3×3
     é justamente o motivo de o contrafactual dar NEGATIVO: quem está do lado
     de baixo pesa mais, porque o ouro vive em Ativos Globais (21%). */
  eq(alta, 3, "sensores apontando alta:");
  eq(baixa, 3, "sensores apontando baixa:");
});

console.log("\nBLOCO B — CALCULAR NÃO PODE ALTERAR NADA");

t("o estado sai intacto depois do contrafactual", ()=>{
  /* o cálculo precisa ligar os sensores, agregar e desligar. Se uma exceção
     acontecer no meio e não houver finally, o sistema passa a contar sensores
     no score de verdade — o pior defeito possível numa build de exibição. */
  carregar();
  const antes = JSON.stringify(Object.keys(ctx.S.motors).map(function(mk){
    return Object.keys(ctx.S.motors[mk].indicators).map(function(ik){
      return ctx.S.motors[mk].indicators[ik].excludeFromScore ? 1 : 0; });
  }));
  API.contrafactualComSensores();
  const depois = JSON.stringify(Object.keys(ctx.S.motors).map(function(mk){
    return Object.keys(ctx.S.motors[mk].indicators).map(function(ik){
      return ctx.S.motors[mk].indicators[ik].excludeFromScore ? 1 : 0; });
  }));
  eq(depois, antes, "excludeFromScore depois do cálculo:");
});

t("o score real continua o mesmo depois de calcular o contrafactual", ()=>{
  carregar();
  const antes = API.agregarCanonico(API.contribuicoesCanonicas()).score;
  API.contrafactualComSensores();
  const depois = API.agregarCanonico(API.contribuicoesCanonicas()).score;
  perto(depois, antes, "score:", 1e-9);
});

t("há finally no código — restaurar não pode depender de dar tudo certo", ()=>{
  const f = semComentarios(declDe("contrafactualComSensores"));
  if(!/finally/.test(f))
    throw new Error("sem finally: uma exceção deixaria os sensores votando de verdade");
});

console.log("\nBLOCO C — o painel mostra, e não recomenda");

t("o painel existe e é alimentado pelas duas funções", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf('id="painelForaDoScore"') === -1) throw new Error("não achei o painel");
  const f = semComentarios(declDe("blocoForaDoScore"));
  if(!/sensoresDaLeitura\(/.test(f)) throw new Error("não lista os sensores");
  if(!/contrafactualComSensores\(/.test(f)) throw new Error("não calcula o contrafactual");
});

t("NÃO recomenda nada — mostrar não é promover", ()=>{
  const f = semComentarios(declDe("blocoForaDoScore"));
  [/\bcompr[ae]\b/i, /\bvend[ae]\b/i, /recomend/i, /entrar agora/i].forEach(function(re){
    if(re.test(f)) throw new Error("o painel virou recomendação: " + re);
  });
});

t("diz por que cada sensor não vota — senão vira 'sinal ignorado'", ()=>{
  carregar();
  const s = API.sensoresDaLeitura();
  s.forEach(function(x){
    if(!x.motivo || x.motivo.length < 8)
      throw new Error("sensor sem motivo declarado: " + x.id);
  });
});

t("o painel avisa que sensor não é sinal validado", ()=>{
  const f = semComentarios(declDe("blocoForaDoScore"));
  if(!/direção|não verificad|não sabemos/i.test(f))
    throw new Error("o painel não lembra que a direção destes indicadores é desconhecida");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12 e os seis continuam sensores", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) !== 12) throw new Error("modelo virou m" + m[1] + " numa build de exibição");
  const S = API.defaultState();
  [["derivativos","longShort"],["derivativos","takerRatio"],["tecnico","bookImbalance"],
   ["tecnico","momentum"],["ativosGlobais","ouro"],["ativosGlobais","euro"]].forEach(function(p){
    eq(S.motors[p[0]].indicators[p[1]].excludeFromScore, true, p.join(".") + ":");
  });
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.119-/.test(m[1])) throw new Error("continua a v119: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v120 verde — o que ficou de fora do score, com o número do que custaria.");

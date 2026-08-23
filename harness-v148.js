/* =====================================================================
   harness-v148.js — a que passou no teste entra na camada
   =====================================================================
   Camadas e tela. MODEL_VERSION continua m12, score intocado.

   O ACHADO É DO JORGE: a camada AGORA reunia oito indicadores, entre eles
   funding (r = 0,004) e long/short (0,007) — os dois que REPROVARAM. E a
   proporção de liquidação, a única variável do projeto que comprovadamente
   descreve alta e baixa (71,4% nas altas contra 32,6% nas baixas, t = 18,46,
   em 2.999 horas), estava FORA de todas as camadas.

   As camadas são o único lugar onde as coisas se combinam sem passar pelo
   score. A que passou não participava dele.

   O RISCO DA CORREÇÃO era declarar cortes novos para converter a proporção
   em escala −100/+100, com o painel Live já declarando os dele (65 e 40).
   Duas réguas para a mesma variável é o defeito da v90 voltando. Por isso o
   mapa é ancorado nos cortes que já existem, e há teste para isso.

   Uso:  node harness-v148.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v147 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
/* o array CAMADAS, recortado inteiro */
function arrayCamadas(){
  const i = HTML.indexOf("const CAMADAS = [");
  const j = HTML.indexOf("[", i);
  let n=0,str=null,esc=false;
  for(let k=j;k<HTML.length;k++){
    const c=HTML[k];
    if(esc){esc=false;continue;}
    if(c==="\\"){esc=true;continue;}
    if(str){ if(c===str) str=null; continue; }
    if(c==='"'||c==="'"||c==="`"){ str=c; continue; }
    if(c==="[") n++; else if(c==="]"){ n--; if(!n) return HTML.slice(j,k+1); }
  }
  throw new Error("CAMADAS não fecha");
}

/* --- monta o miolo com talos ------------------------------------------- */
let S = { market:{}, motors:{} };
const API = new Function("getS","valorVigente",
  [ declDe("proporcaoParaEscala"), declDe("valorLiquidacaoNaCamada"),
    declDe("classificarValor"),
    "const CAMADAS = " + arrayCamadas() + ";",
    declDe("lerCamada"),
    "return { proporcaoParaEscala, valorLiquidacaoNaCamada, lerCamada, classificarValor, CAMADAS };" ].join("\n").
    replace(/\bS\.market\b/g, "getS().market").replace(/\bS\.motors\b/g, "getS().motors"))(
  function(){ return S; },
  function(motor, ind){
    const m = S.motors[motor]; const i = m && m.indicators[ind];
    return (i && i.value !== undefined) ? i.value : null;
  });

/* motores de mentira com os oito indicadores do AGORA */
function motoresCom(valores){
  const mk = { tecnico:{label:"Técnico",indicators:{}}, derivativos:{label:"Derivativos",indicators:{}} };
  Object.keys(valores).forEach(function(k){
    const p = k.split(".");
    if(!mk[p[0]]) mk[p[0]] = { label:p[0], indicators:{} };
    mk[p[0]].indicators[p[1]] = { label:p[1], value: valores[k] };
  });
  return mk;
}
const OITO_NEUTROS = { "tecnico.momentum":0, "tecnico.bookImbalance":0,
  "derivativos.takerRatio":0, "derivativos.longShort":0, "derivativos.funding":0,
  "derivativos.openInterest":0, "derivativos.putCall":0, "derivativos.cvd24h":0 };

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function perto(a,b,tol,m){ if(Math.abs(a-b) > (tol||0.01)) throw new Error((m||"")+" esperado ~"+b+", veio "+a); }

console.log("\nBLOCO A — UMA RÉGUA SÓ: os cortes da camada são os do painel Live");

t("os pontos de ancoragem batem exatamente", ()=>{
  /* é o teste que impede o defeito da v90 de voltar: se alguém mudar o mapa,
     a camada passa a discordar do rótulo do painel para o mesmo número. */
  perto(API.proporcaoParaEscala(100),  100, 0.01, "prop 100:");
  perto(API.proporcaoParaEscala(65),    15, 0.01, "prop 65 (corte de alta do painel):");
  perto(API.proporcaoParaEscala(50),     0, 0.01, "prop 50:");
  perto(API.proporcaoParaEscala(40),   -15, 0.01, "prop 40 (corte de baixa do painel):");
  perto(API.proporcaoParaEscala(0),   -100, 0.01, "prop 0:");
});

t("o rótulo da camada NUNCA discorda do rótulo do painel", ()=>{
  /* painel: ≥65 vendidos apanhando · ≤40 comprados apanhando · resto equilibrado
     camada: ≥+15 alta · ≤−15 baixa · resto neutro */
  [[71.4,"alta"],[99,"alta"],[65,"alta"],[64.9,"neutro"],[50,"neutro"],
   [40.1,"neutro"],[40,"baixa"],[32.6,"baixa"],[0,"baixa"]].forEach(function(par){
    const v = API.proporcaoParaEscala(par[0]);
    eq(API.classificarValor(v), par[1], "prop " + par[0] + " → " + v.toFixed(1) + ":");
  });
});

t("a régua é monótona — mais vendidos nunca vira menos alta", ()=>{
  let ant = -Infinity;
  for(let p=0; p<=100; p+=0.5){
    const v = API.proporcaoParaEscala(p);
    if(v < ant) throw new Error("quebra de monotonia em prop " + p);
    ant = v;
  }
});

t("os valores medidos caem onde a medição disse", ()=>{
  /* 71,4% é a média das ALTAS · 32,6% a das BAIXAS, medidos em 2.999 horas */
  eq(API.classificarValor(API.proporcaoParaEscala(71.4)), "alta", "média das altas:");
  eq(API.classificarValor(API.proporcaoParaEscala(32.6)), "baixa", "média das baixas:");
});

t("fora da faixa e valor ausente não viram número", ()=>{
  eq(API.proporcaoParaEscala(null), null, "null:");
  eq(API.proporcaoParaEscala(undefined), null, "undefined:");
  eq(API.proporcaoParaEscala("abc"), null, "texto:");
  perto(API.proporcaoParaEscala(140), 100, 0.01, "acima de 100:");
  perto(API.proporcaoParaEscala(-40), -100, 0.01, "abaixo de 0:");
});

console.log("\nBLOCO B — a liquidação participa da camada AGORA");

t("o AGORA passa a ter NOVE itens", ()=>{
  /* falha contra a v147: lá são oito, e a que passou no teste está fora. */
  S = { market:{}, motors: motoresCom(OITO_NEUTROS) };
  const r = API.lerCamada("agora");
  eq(r.total, 9, "itens da camada:");
  if(!r.itens.some(function(x){ return x.id === "live.liquidacoes"; }))
    throw new Error("a liquidação não está na lista");
});

t("SEM liquidação: fica fora da conta, não vira neutro", ()=>{
  /* tratar ausência como neutro diluiria a proporção com silêncio — regra
     da própria camada desde a v121. */
  S = { market:{}, motors: motoresCom(OITO_NEUTROS) };
  const r = API.lerCamada("agora");
  eq(r.medidos, 8, "medidos sem liquidação:");
  eq(r.total, 9, "total:");
});

t("COM liquidação alta: entra e conta como alta", ()=>{
  S = { market:{ liquidacoes:{ proporcaoVendidos: 99 } }, motors: motoresCom(OITO_NEUTROS) };
  const r = API.lerCamada("agora");
  eq(r.medidos, 9, "medidos:");
  eq(r.alta, 1, "quantos em alta:");
  const it = r.itens.filter(function(x){ return x.id === "live.liquidacoes"; })[0];
  if(it.valor < 90) throw new Error("valor baixo demais para 99%: " + it.valor);
});

t("COM liquidação baixa: conta como baixa", ()=>{
  S = { market:{ liquidacoes:{ proporcaoVendidos: 20 } }, motors: motoresCom(OITO_NEUTROS) };
  const r = API.lerCamada("agora");
  eq(r.baixa, 1, "quantos em baixa:");
});

t("liquidação em equilíbrio conta como NEUTRO, não some", ()=>{
  S = { market:{ liquidacoes:{ proporcaoVendidos: 52 } }, motors: motoresCom(OITO_NEUTROS) };
  const r = API.lerCamada("agora");
  eq(r.medidos, 9, "medidos:");
  eq(r.neutro, 9, "neutros:");
});

t("leitor que estoura não derruba a camada", ()=>{
  S = { market:{ get liquidacoes(){ throw new Error("boom"); } }, motors: motoresCom(OITO_NEUTROS) };
  let r;
  try{ r = API.lerCamada("agora"); }catch(e){ throw new Error("a camada caiu: " + e.message); }
  eq(r.medidos, 8, "medidos:");
});

console.log("\nBLOCO C — o que NÃO entrou, e por quê");

t("o APETITE fica de fora das camadas", ()=>{
  /* a escala dele é MUITO FORTE / FORTE / NORMAL / FRACO — força do fluxo,
     não direção, e a v127 mudou isso de propósito. Numa camada que classifica
     alta/baixa/neutro, "FORTE" não é alta. */
  const camadas = arrayCamadas();
  if(/apetite/i.test(camadas))
    throw new Error("o apetite entrou numa camada — a escala dele não é direcional");
});

t("as camadas continuam SEM tocar no score", ()=>{
  const f = semComentarios(declDe("lerCamada")) +
            semComentarios(declDe("valorLiquidacaoNaCamada")) +
            semComentarios(declDe("proporcaoParaEscala"));
  if(/S\.motors\[[^\]]+\]\.indicators\[[^\]]+\]\.value\s*=|saveState\(|agregarCanonico/.test(f))
    throw new Error("a camada passou a escrever no que decide");
});

t("as outras duas camadas não mudaram de tamanho", ()=>{
  S = { market:{}, motors:{} };
  eq(API.lerCamada("semana").total, 7, "A SEMANA:");
  eq(API.lerCamada("terreno").total, 14, "O TERRENO:");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.147/.test(m[1])) throw new Error("continua a v147: " + m[1]);
});
t("entrada em texto continua funcionando", ()=>{
  /* a mudança não pode ter quebrado o caminho de sempre */
  S = { market:{}, motors: motoresCom(Object.assign({}, OITO_NEUTROS,
        { "tecnico.momentum": 40 })) };
  const r = API.lerCamada("agora");
  const it = r.itens.filter(function(x){ return x.id === "tecnico.momentum"; })[0];
  eq(it.valor, 40, "indicador lido por texto:");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v148 verde — a que passou no teste passa a participar da leitura.");

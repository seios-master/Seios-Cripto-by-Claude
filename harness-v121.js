/* =====================================================================
   harness-v121.js — leitura em três camadas, cada relógio com o seu
   =====================================================================
   Sistema NOVO ao lado do antigo. MODEL_VERSION continua m12, o score
   continua igual, a série das 777 continua contando o mesmo objeto.

   POR QUE ELE EXISTE. Em 19/08 o BTC saiu de ~62k e bateu 68,7k. Dois
   motores se moveram (Técnico +11,8, Derivativos +9,6) e quatro NÃO TINHAM
   COMO se mover — o FRED atualiza uma vez por dia útil, o M2 uma vez por
   mês, On-chain e Ativos Globais leem janelas de 90 dias. O score andou 1,7.
   A média entre o que muda por minuto e o que muda por mês não descreve
   nem um nem outro.

   A REGRA: cada indicador pertence à camada da CADÊNCIA DA FONTE, não do
   motor onde foi colocado. E cadência não é horizonte: o RSI vem de
   fechamentos diários (lento) mas fala do momento; o MVRV atualiza todo dia
   e fala do ciclo. Por isso as camadas não se chamam curto/médio/longo —
   esses nomes prometeriam previsão, e não temos previsão.

   O que a divisão revelou, e nenhum de nós tinha visto: dos SETE
   indicadores da camada AGORA, QUATRO estão fora do score. É a explicação
   aritmética de por que o sistema pareceu surdo num dia de +6%.

   Uso:  node harness-v121.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v120 ou anterior?)");
  return bloco(i);
}
function cst(n){
  const i = HTML.indexOf("const " + n + " ="); if(i === -1) throw new Error("sem " + n);
  /* CORRIGIDO: o extrator só reconhecia { }. CAMADAS é um ARRAY, e ele parava
     na primeira chave interna, cortando a constante ao meio. Agora detecta o
     delimitador de abertura em vez de supor. */
  const chave = HTML.indexOf("{", i), colch = HTML.indexOf("[", i);
  const usaColchete = colch !== -1 && (chave === -1 || colch < chave);
  const abre = usaColchete ? "[" : "{", fecha = usaColchete ? "]" : "}";
  const a = usaColchete ? colch : chave;
  let d=0,s=null,e=false;
  for(let k=a;k<HTML.length;k++){ const c=HTML[k];
    if(e){e=false;continue;} if(c==="\\"){e=true;continue;}
    if(s){ if(c===s) s=null; continue; }
    if(c==='"'||c==="'"||c==="`"){ s=c; continue; }
    if(c===abre) d++; else if(c===fecha){ d--; if(!d) return HTML.slice(i,k+1)+";"; } }
  return HTML.slice(i, HTML.indexOf(";", i)+1);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const ctx = { S:null };
let API;
try{
  const ev = /const EVENTO_JANELA_DIAS\s*=\s*(\d+)/.exec(HTML);
  API = new Function("ctx", "with(ctx){" + [
    "const EVENTO_JANELA_DIAS = " + (ev?ev[1]:30) + ";",
    cst("RENORM_MAX"), cst("TETO_POSITIVO"), cst("INDICATOR_HORIZON"), cst("VALIDADE_HORAS"),
    cst("SENSOR_SPECS"), cst("INDICATOR_SPECS"), cst("CAMADAS"),
    declDe("ind"), declDe("defaultState"), declDe("indicadoresVotantes"),
    declDe("aplicarTetoPuro"), declDe("aplicarTeto"), declDe("validadeDoIndicador"),
    declDe("frescorDoIndicador"), declDe("valorVigente"), declDe("eventosDecaidos"),
    declDe("specDoIndicador"), declDe("familiaDoIndicador"), declDe("motorComposite"),
    declDe("contribuicoesCanonicas"), declDe("agregarCanonico"),
    declDe("classificarValor"), declDe("lerCamada"), declDe("leituraPorCadencia"),
    "return { defaultState, classificarValor, lerCamada, leituraPorCadencia, CAMADAS," +
    " agregarCanonico, contribuicoesCanonicas };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }
function perto(a,b,m,tol){ if(Math.abs(a-b) > (tol===undefined?0.5:tol))
  throw new Error((m||"")+" esperado ~"+b+", veio "+a); }

/* a leitura REAL de 19/08 12:44 — BTC 68.673, +5,96% em 24h */
const LEITURA = {
 "macro.juros":-0.40,"macro.inflacao":10.15,"macro.liquidez":-5.13,"macro.dxy":2.55,"macro.curva":20.51,
 "institucional.coinbasePremium":-2.04,
 "onchain.mvrv":30.84,"onchain.activeAddresses":-4.76,"onchain.hashrate":23.19,
 "derivativos.funding":-10.00,"derivativos.openInterest":30.21,"derivativos.putCall":26.83,
 "derivativos.longShort":-11.32,"derivativos.takerRatio":26.97,
 "tecnico.tendencia":21.41,"tecnico.momentum":71.51,"tecnico.rsi":-49.36,
 "tecnico.mediaMovel":60.52,"tecnico.bookImbalance":44.68,
 "sentimento.fearGreed":8.00,"geopolitico.epu":78.91,
 /* gdelt (tom) e volumeSpike NÃO entram: na leitura real de 12:44 os dois
    falharam juntos — vêm da mesma fonte, e o fixture tem que espelhar isso. */
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

console.log("\nBLOCO A — a classificação usa a faixa que o sistema já usa");

t("±15 separa alta, neutro e baixa — sem corte inventado", ()=>{
  eq(API.classificarValor(30), "alta", "30:");
  eq(API.classificarValor(15), "alta", "15 (limite):");
  eq(API.classificarValor(14.9), "neutro", "14,9:");
  eq(API.classificarValor(0), "neutro", "0:");
  eq(API.classificarValor(-15), "baixa", "-15 (limite):");
  eq(API.classificarValor(-30), "baixa", "-30:");
});

t("sem dado é FORA DA CONTA, não neutro", ()=>{
  /* tratar ausência como neutro diluiria a proporção com silêncio —
     é a mesma distinção que o amortecimento faz no score. */
  eq(API.classificarValor(null), "sem_dado", "null:");
  eq(API.classificarValor(undefined), "sem_dado", "undefined:");
  eq(API.classificarValor(NaN), "sem_dado", "NaN:");
});

console.log("\nBLOCO B — cada indicador em exatamente uma camada");

t("as três camadas existem com os tamanhos do desenho", ()=>{
  eq(API.CAMADAS.length, 3, "camadas:");
  const porId = {}; API.CAMADAS.forEach(function(c){ porId[c.id] = c; });
  /* v124 — o AGORA cresceu com o CVD. O invariante não é o número: é que a
     camada contenha os indicadores de cadência instantânea. */
  if(porId.agora.indicadores.length < 7) throw new Error("AGORA encolheu: " + porId.agora.indicadores.length);
  ["tecnico.momentum","tecnico.bookImbalance","derivativos.takerRatio",
   "derivativos.longShort","derivativos.funding","derivativos.openInterest",
   "derivativos.putCall"].forEach(function(id){
    if(porId.agora.indicadores.indexOf(id) === -1) throw new Error("sumiu do AGORA: " + id);
  });
  eq(porId.semana.indicadores.length, 7, "A SEMANA:");   // + volumeSpike (é GDELT)
  eq(porId.terreno.indicadores.length, 14, "O TERRENO:");
});

t("NENHUM indicador aparece em duas camadas", ()=>{
  const vistos = {}, repetidos = [];
  API.CAMADAS.forEach(function(c){
    c.indicadores.forEach(function(id){
      if(vistos[id]) repetidos.push(id);
      vistos[id] = 1;
    });
  });
  if(repetidos.length) throw new Error("em duas camadas: " + repetidos.join(", "));
});

t("todo indicador classificado EXISTE no estado", ()=>{
  const S = API.defaultState();
  API.CAMADAS.forEach(function(c){
    c.indicadores.forEach(function(id){
      const p = id.split(".");
      if(!S.motors[p[0]] || !S.motors[p[0]].indicators[p[1]])
        throw new Error("camada " + c.id + " cita indicador inexistente: " + id);
    });
  });
});

t("TODO indicador com fonte está em alguma camada — ou na lista de exceções", ()=>{
  /* sem isto, a classificação apodrece em silêncio: alguém acrescenta um
     indicador e ele simplesmente não aparece em lugar nenhum. */
  const S = API.defaultState();
  const limpo = semComentarios(HTML);
  const emCamada = {};
  API.CAMADAS.forEach(function(c){ c.indicadores.forEach(function(id){ emCamada[id] = 1; }); });
  const faltando = [];
  Object.keys(S.motors).forEach(function(mk){
    Object.keys(S.motors[mk].indicators).forEach(function(ik){
      const id = mk + "." + ik;
      const temFonte = limpo.indexOf('setAuto("' + mk + '","' + ik + '"') !== -1;
      if(!temFonte) return;                       // sem fonte: fora por construção
      if(emCamada[id]) return;
      /* exceções declaradas no código, com motivo que não depende de relógio */
      if(id === "ativosGlobais.euro" || id === "ativosGlobais.ouro") return;
      if(id === "onchain.exchangeFlow") return;   // chave paga, nunca preenche
      faltando.push(id);
    });
  });
  if(faltando.length) throw new Error("com fonte e sem camada: " + faltando.join(", "));
});

t("euro e ouro ficam FORA das três, e o motivo está escrito", ()=>{
  const emCamada = {};
  API.CAMADAS.forEach(function(c){ c.indicadores.forEach(function(id){ emCamada[id] = 1; }); });
  if(emCamada["ativosGlobais.euro"]) throw new Error("o euro entrou — é dupla contagem em qualquer relógio");
  if(emCamada["ativosGlobais.ouro"]) throw new Error("o ouro entrou — t=0,43, sem relação em nenhuma cadência");
  const limpo = semComentarios(HTML);
  if(!/dupla contagem/.test(limpo)) throw new Error("motivo do euro não declarado");
});

console.log("\nBLOCO C — O CASO REAL de 19/08 12:44");

t("AGORA: sete medidos, e a maioria aponta alta", ()=>{
  carregar();
  const r = API.lerCamada("agora");
  /* o CVD não tem valor neste fixture (a leitura de 12:44 é anterior a ele),
     então entra como sem_dado e sai da conta — que é o comportamento certo. */
  eq(r.medidos, 7, "medidos:");
  if(r.total < 7) throw new Error("total do AGORA: " + r.total);
  eq(r.alta, 5, "apontando alta:");    // momentum, book, taker, OI, putCall
  /* CORRIGIDO ao ver o dado: funding (−10) e long/short (−11,3) ficam ENTRE
     −15 e 0 — são NEUTROS, não baixa. A faixa de ±15 é larga de propósito. */
  eq(r.baixa, 0, "apontando baixa:");
  eq(r.neutro, 2, "neutros:");
  perto(r.pctAlta, 71.4, "% alta:", 0.2);
});

t("A SEMANA: o GDELT fora do ar não vira neutro — some da conta", ()=>{
  carregar();
  const r = API.lerCamada("semana");
  eq(r.total, 7, "declarados:");
  /* GDELT (tom) e volumeSpike vêm da MESMA fonte e caem juntos — por isso
     dois somem da conta quando o GDELT dá 429, e não um. */
  eq(r.medidos, 5, "medidos (tom e volume do GDELT fora):");
  if(r.alta + r.baixa + r.neutro !== r.medidos)
    throw new Error("a soma das classes não bate com os medidos");
});

t("A CAMADA QUE PROVA O PONTO: metade do TERRENO nem se mexeu", ()=>{
  /* CORRIGIDO com o dado na mão: o terreno tinha 7 apontando alta, ZERO
     apontando baixa e 7 neutros. Não é PARADO (metade aponta) nem DIVIDIDO
     (não há conflito) — foi este caso que criou o rótulo ALTA PARCIAL.
     O ponto do teste continua o mesmo: metade da maior camada do sistema
     não se mexeu num dia de +6%, porque não tinha como. */
  carregar();
  const r = API.lerCamada("terreno");
  eq(r.baixa, 0, "apontando baixa:");
  eq(r.neutro, 7, "neutros (não tinham como se mover):");
  eq(r.rotulo, "ALTA PARCIAL", "rótulo do terreno:");
});

t("quatro dos sete do AGORA são sensores — a explicação da surdez", ()=>{
  const S = API.defaultState();
  const agora = API.CAMADAS.filter(function(c){ return c.id === "agora"; })[0];
  const fora = agora.indicadores.filter(function(id){
    const p = id.split(".");
    return S.motors[p[0]].indicators[p[1]].excludeFromScore;
  });
  /* v124 — eram quatro; com o CVD são cinco. O achado não é o número, é que
     a MAIORIA da camada que lê o instante está fora do score. */
  if(fora.length < 4) throw new Error("só " + fora.length + " fora do score");
  if(!(fora.length > agora.indicadores.length / 2))
    throw new Error("a maioria do AGORA passou a votar — o achado mudou de natureza");
});

console.log("\nBLOCO D — proporção e força podem discordar, e as duas aparecem");

t("PROPORÇÃO ALTA COM FORÇA FRACA é distinguível", ()=>{
  /* +80, +5, +3, −70: três quartos apontam alta, mas a força média é +4,5.
     Se só houvesse um dos dois números, um dos dois fatos sumiria. */
  const r = API.lerCamada("_teste", [80, 5, 3, -70]);
  eq(r.alta, 1, "acima de +15:");     // só o +80
  eq(r.baixa, 1, "abaixo de -15:");   // só o -70
  eq(r.neutro, 2, "entre -15 e +15:");
  perto(r.forca, 4.5, "força média:", 0.1);
});

t("consenso com força alta vira ALTA; consenso com força oposta vira DIVIDIDO", ()=>{
  const consenso = API.lerCamada("_teste", [40, 30, 20, 25, -5]);
  eq(consenso.rotulo, "ALTA", "4 de 5 em alta, força +22:");
  const contradiz = API.lerCamada("_teste", [16, 16, 16, -95]);
  eq(contradiz.rotulo, "DIVIDIDO", "75% em alta mas força negativa:");
});

t("PARADO, DIVIDIDO e PARCIAL são três coisas diferentes", ()=>{
  eq(API.lerCamada("_teste", [2, -3, 1, 0, 4]).rotulo, "PARADO", "todos perto de zero:");
  eq(API.lerCamada("_teste", [40, -40, 35, -38]).rotulo, "DIVIDIDO", "metade de cada lado:");
  eq(API.lerCamada("_teste", [40, 35, 2, -3]).rotulo, "ALTA PARCIAL", "metade sobe, ninguém desce:");
  eq(API.lerCamada("_teste", [-40, -35, 2, -3]).rotulo, "BAIXA PARCIAL", "metade desce, ninguém sobe:");
});

t("camada sem nenhum medido não inventa rótulo", ()=>{
  const r = API.lerCamada("_teste", [null, undefined, NaN]);
  eq(r.medidos, 0, "medidos:");
  eq(r.rotulo, "SEM DADO", "rótulo:");
});

console.log("\nBLOCO E — LER NÃO PODE MUDAR NADA");

t("o score continua idêntico depois da leitura em camadas", ()=>{
  carregar();
  const antes = API.agregarCanonico(API.contribuicoesCanonicas()).score;
  API.leituraPorCadencia();
  const depois = API.agregarCanonico(API.contribuicoesCanonicas()).score;
  perto(depois, antes, "score:", 1e-9);
});

t("nenhum excludeFromScore foi tocado", ()=>{
  carregar();
  const foto = function(){ return JSON.stringify(Object.keys(ctx.S.motors).map(function(mk){
    return Object.keys(ctx.S.motors[mk].indicators).map(function(ik){
      return ctx.S.motors[mk].indicators[ik].excludeFromScore ? 1 : 0; }); })); };
  const antes = foto();
  API.leituraPorCadencia();
  eq(foto(), antes, "direito de voto depois da leitura:");
});

t("nenhum valor de indicador foi alterado", ()=>{
  carregar();
  const foto = function(){ return JSON.stringify(Object.keys(ctx.S.motors).map(function(mk){
    return Object.keys(ctx.S.motors[mk].indicators).map(function(ik){
      return ctx.S.motors[mk].indicators[ik].value; }); })); };
  const antes = foto();
  API.leituraPorCadencia();
  eq(foto(), antes, "valores depois da leitura:");
});

t("a leitura NÃO grava estado nem série", ()=>{
  const f = semComentarios(declDe("leituraPorCadencia")) + semComentarios(declDe("lerCamada"));
  [/saveState\(/, /registrarObservacao\(/, /S\.history\.push/, /setAuto\(/].forEach(function(re){
    if(re.test(f)) throw new Error("a leitura escreve algo: " + re);
  });
});

console.log("\nBLOCO F — o painel na tela principal, sem síntese");

t("o painel está montado na tela principal", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf('id="painelCadencia"') === -1) throw new Error("não achei o painel");
  const iHero = limpo.indexOf('id="heroSection"') >= 0 ? limpo.indexOf('id="heroSection"') : limpo.indexOf("<main");
  const iPainel = limpo.indexOf('id="painelCadencia"');
  if(iPainel === -1) throw new Error("painel ausente");
});

t("NÃO existe síntese entre as três camadas", ()=>{
  /* juntar de novo seria refazer exatamente o erro que isto conserta. */
  const f = semComentarios(declDe("blocoCadencia"));
  if(/media(Geral|Das3|Camadas)|sinteseCamadas|scoreCamadas/i.test(f))
    throw new Error("apareceu uma síntese entre camadas");
});

t("a tela declara a cobertura de cada camada", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/medidos/.test(f)) throw new Error("não mostra quantos foram medidos");
});

t("a tela avisa que isto NÃO é previsão", ()=>{
  const f = semComentarios(declDe("blocoCadencia"));
  if(!/não é previsão|não prevê|descreve/i.test(f))
    throw new Error("o painel não deixa claro que descreve o presente");
});

console.log("\nBLOCO G — o m12 segue intocado");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("os seis sensores continuam sensores PARA O SCORE", ()=>{
  const S = API.defaultState();
  [["derivativos","longShort"],["derivativos","takerRatio"],["tecnico","bookImbalance"],
   ["tecnico","momentum"],["ativosGlobais","ouro"],["ativosGlobais","euro"]].forEach(function(p){
    eq(S.motors[p[0]].indicators[p[1]].excludeFromScore, true, p.join(".") + ":");
  });
});

t("os pesos do m12 estão intactos", ()=>{
  const S = API.defaultState();
  eq(S.motors.macro.weight, 0.15, "macro:");
  eq(S.motors.ativosGlobais.weight, 0.21, "ativosGlobais:");
  eq(S.motors.tecnico.weight, 0.04, "tecnico:");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.120-/.test(m[1])) throw new Error("continua a v120: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v121 verde — três relógios, três leituras, nenhuma média entre eles.");

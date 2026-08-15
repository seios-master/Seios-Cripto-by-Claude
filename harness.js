/* Banco de provas do SEIOS — roda as FUNÇÕES REAIS extraídas do index.html.
   Não reimplementa nada: recorta o código-fonte por casamento de chaves e
   avalia num sandbox com um S de mentira. Se a função mudar, o teste sente. */
const fs = require("fs");

const ARQ = process.argv[2] || "index.html";
const src = fs.readFileSync(ARQ, "utf8").match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/)[1];

function recorta(decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error("não achei: " + decl);
  let j = src.indexOf("{", i), n = 0;
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") n++;
    else if (src[k] === "}") { n--; if (n === 0) return src.slice(i, k + 1); }
  }
  throw new Error("chaves desbalanceadas: " + decl);
}

const pedacos = [
  "function clamp(",
  "function escalaSuave(",
  "const NORMALIZACAO = {",
  "function norm(",
  "const VALIDADE_HORAS =",
  "const INDICATOR_HORIZON = {",
  "const INDICATOR_SPECS = {",
  "const OBS_FORMATO =",
  "function specDoIndicador(",
  "function provedorDoIndicador(",
  "function calcularAvailableAt(",
  "const MODEL_VERSION =",
  "function pesosEfetivos(",
  "function pesoEfetivoIndicador(",
  "function pesoSeMotorCompleto(",
  "function snapshotDoModeloAtual(",
  "function separarPorModelo(",
  "const TOLERANCIA_RECONSTRUCAO_H =",
  "function precoMaisProximoDe(",
  "function maturarRetornos(",
  "function resumirSerie(",
  "function diasSemColeta(",
  "const VALIDADE_MANUAL_HORAS =",
  "function validadeDoIndicador(",
  "function validadeManual(",
  "function manuaisSemCarimbo(",
  "function frescorDoIndicador(",
  "function valorVigente(",
  "function indicadoresExpirados(",
  "function coberturaAuto(",
  "function extractMetricValue(",
  "function serieCryptoQuantOrdenada(",
  "const DIVERGENCIA_ALTA =",
  "const COBERTURA_MINIMA =",
  "const COLETA_AUTO_MINIMA =",
  "const CONCENTRACAO_MAXIMA =",
  "const COBERTURA_ALTA_CONVICCAO =",
  "const TETO_POSITIVO =",
  "function aplicarTeto(",
  "function indicadoresVotantes(",
  "function computeCobertura(",
  "function motorComposite(",
  "function computeHorizonScores(",
  "function scoreLabel(",
  "const HISTERESE_PONTOS =",
  "const EVENTO_JANELA_DIAS =",
  "const EVENTO_MEIA_VIDA_DIAS =",
  "function eventosDecaidos(",
  "function degrauCru(",
  "function escadaDeAcao(",
  "function bucketAction(",
  "function computeRSI(",
  "function rsiAtIndex("
].map(d => d.startsWith("const VALIDADE")
  ? src.slice(src.indexOf(d), src.indexOf(";", src.indexOf(d)) + 1)
  : d.startsWith("const ")
  ? src.slice(src.indexOf(d), src.indexOf(";", src.indexOf(d)) + 1)
  : recorta(d)).join("\n");

const sandbox = { S: null };
const carrega = new Function("ctx", pedacos + "\nreturn {" +
  ["clamp","escalaSuave","NORMALIZACAO","norm","validadeDoIndicador","frescorDoIndicador",
   "valorVigente","indicadoresExpirados","coberturaAuto","computeRSI","rsiAtIndex"].join(",") +
  ", get S(){return ctx.S}, set S(v){ctx.S=v}};");
// S precisa ser visível de dentro das funções: injeta como global do processo
const api = (function () {
  const wrapper = new Function(pedacos + "\nreturn {" +
    ["clamp","escalaSuave","NORMALIZACAO","norm","validadeDoIndicador","frescorDoIndicador",
     "valorVigente","indicadoresExpirados","coberturaAuto","computeRSI","rsiAtIndex","serieCryptoQuantOrdenada","escadaDeAcao","bucketAction","indicadoresVotantes","computeCobertura","motorComposite","computeHorizonScores","aplicarTeto","manuaisSemCarimbo","validadeManual","eventosDecaidos","HISTERESE_PONTOS","INDICATOR_SPECS","specDoIndicador","provedorDoIndicador","calcularAvailableAt","resumirSerie","diasSemColeta","pesoEfetivoIndicador","pesoSeMotorCompleto","separarPorModelo","snapshotDoModeloAtual","MODEL_VERSION","precoMaisProximoDe","TOLERANCIA_RECONSTRUCAO_H","maturarRetornos"].join(",") + "};");
  return wrapper();
})();

/* --- estado de mentira, com a forma mínima que as funções leem --- */
function estado(updatedAt, value) {
  return {
    market: { lastFetch: new Date().toISOString() },
    motors: {
      macro: {
        label: "Macro", weight: 0.28,
        indicators: {
          juros: { label: "juros", source: "auto", value, updatedAt },
          dxy:   { label: "dxy",   source: "auto", value: 10, updatedAt: new Date().toISOString() }
        }
      }
    }
  };
}

let ok = 0, falhou = 0;
function t(nome, real, esperado) {
  const bate = JSON.stringify(real) === JSON.stringify(esperado);
  console.log((bate ? "  ok   " : "  FALHA") + "  " + nome +
    (bate ? "" : "   → obtido " + JSON.stringify(real) + ", esperado " + JSON.stringify(esperado)));
  bate ? ok++ : falhou++;
}

console.log("\n— C-02: carimbo de data inválido —");
global.S = estado("data-invalida", 42);
const f = api.frescorDoIndicador("macro", "juros");
t("idade não finita é marcada como inválida", f.invalido === true, true);
t("indicador com carimbo inválido expira", f.expirado, true);
t("valor inválido não pontua", api.valorVigente("macro", "juros"), null);
t("aparece na lista de vencidos", api.indicadoresExpirados().length, 1);
t("cobertura automática cai pra 50%", api.coberturaAuto(), 0.5);

console.log("\n— C-02: não pode ter efeito colateral no caminho normal —");
global.S = estado(new Date().toISOString(), 42);
t("carimbo válido e recente continua vigente", api.valorVigente("macro", "juros"), 42);
t("cobertura cheia", api.coberturaAuto(), 1);
global.S = estado(new Date(Date.now() - 400 * 3600e3).toISOString(), 42);
t("carimbo válido e velho expira como antes", api.valorVigente("macro", "juros"), null);
global.S = estado(null, 42);
global.S.market.lastFetch = null;
t("sem carimbo nenhum não expira (estado de versão antiga)", api.valorVigente("macro", "juros"), 42);

console.log("\n— M-01: RSI plano —");
const parado = Array.from({ length: 40 }, () => 100);
const subindo = Array.from({ length: 40 }, (_, i) => 100 + i);
const caindo = Array.from({ length: 40 }, (_, i) => 100 - i);
const pares = a => a.map((v, i) => [i, v]);
t("série constante → 50 (vivo)", api.computeRSI(pares(parado), 14), 50);
t("série constante → 50 (backtest)", api.rsiAtIndex(parado, 39, 14), 50);
t("só alta → 100 (vivo)", api.computeRSI(pares(subindo), 14), 100);
t("só alta → 100 (backtest)", api.rsiAtIndex(subindo, 39, 14), 100);
t("só baixa → 0 (vivo)", api.computeRSI(pares(caindo), 14), 0);
t("só baixa → 0 (backtest)", api.rsiAtIndex(caindo, 39, 14), 0);
const misto = [100,102,101,104,103,106,105,108,107,110,109,112,111,114,113,116];
t("série mista: vivo e backtest concordam",
  Math.round(api.computeRSI(pares(misto), 14) * 1e6),
  Math.round(api.rsiAtIndex(misto, 15, 14) * 1e6));

console.log("\n— v70: paridade de normalização —");
t("macro.juros: mesma curva do vivo", api.norm("macro.juros", 1), api.escalaSuave(-1, 2.5));
t("id desconhecido estoura em vez de virar null",
  (() => { try { api.norm("macro.inexistente", 1); return "não estourou"; } catch (e) { return "estourou"; } })(), "estourou");
t("bruto nulo devolve null", api.norm("macro.dxy", null), null);
t("bruto NaN devolve null", api.norm("macro.dxy", NaN), null);
t("14 indicadores na tabela canônica", Object.keys(api.NORMALIZACAO).length, 14);

console.log("\n— v72: ordem explícita da série CryptoQuant —");
const bruto = [
  { date: "2026-08-10", netflow: -500 },
  { date: "2026-08-11", netflow: -200 },
  { date: "2026-08-12", netflow:  900 },
  { date: "2026-08-13", netflow:  100 }
];
const embaralhado = [bruto[2], bruto[0], bruto[3], bruto[1]];
const invertido = bruto.slice().reverse();
const zDe = rows => {
  const v = api.serieCryptoQuantOrdenada(rows).map(p => p.value);
  const ult = v[v.length - 1], resto = v.slice(0, -1);
  const m = resto.reduce((a, b) => a + b, 0) / resto.length;
  const dp = Math.sqrt(resto.reduce((a, b) => a + (b - m) ** 2, 0) / resto.length) || 1;
  return Math.round(((ult - m) / dp) * 1e6);
};
t("ordena por data, não por posição", api.serieCryptoQuantOrdenada(embaralhado).map(p => p.date),
  ["2026-08-10","2026-08-11","2026-08-12","2026-08-13"]);
t("o mais recente é o último", api.serieCryptoQuantOrdenada(embaralhado).slice(-1)[0].value, 100);
t("permutar o payload não muda o z-score", zDe(embaralhado), zDe(bruto));
t("payload invertido não muda o z-score", zDe(invertido), zDe(bruto));
t("série sem data estoura em vez de virar array plausível",
  (() => { try { api.serieCryptoQuantOrdenada([{ netflow: 1 }, { netflow: 2 }]); return "não estourou"; }
           catch (e) { return "estourou"; } })(), "estourou");
t("linha sem data é descartada, as datadas sobrevivem",
  api.serieCryptoQuantOrdenada([{ netflow: 7 }, { date: "2026-08-12", netflow: 3 }]).length, 1);
t("data mal formada não entra",
  (() => { try { api.serieCryptoQuantOrdenada([{ date: "ontem", netflow: 3 }]); return "não estourou"; }
           catch (e) { return "estourou"; } })(), "estourou");

console.log("\n— C-01: o passado não pode consultar o presente —");
global.S = { motors: {}, market: {} }; // estado vivo VAZIO
const argsHist = [45, 0.9, 10, 0.8];
const aVazio = api.bucketAction(...argsHist, { coberturaAuto: null, concentracao: null });
global.S = estado(new Date().toISOString(), 42); // estado vivo SAUDÁVEL
const aSaudavel = api.bucketAction(...argsHist, { coberturaAuto: null, concentracao: null });
t("mesma entrada histórica → mesma ação, com S vazio ou cheio", aVazio, aSaudavel);
t("e a ação é a do score, não a trava", aVazio, "Reforçar");

console.log("\n— C-01: as travas continuam funcionando quando informadas —");
t("coleta automática baixa trava",
  api.bucketAction(45, 0.9, 10, 0.8, { coberturaAuto: 0.1, concentracao: 0.2 }),
  "Aguardar confirmação (dados insuficientes)");
t("concentração alta trava",
  api.bucketAction(45, 0.9, 10, 0.8, { coberturaAuto: 0.9, concentracao: 0.9 }),
  "Aguardar confirmação (dados insuficientes)");
t("saúde boa não trava",
  api.bucketAction(45, 0.9, 10, 0.8, { coberturaAuto: 0.9, concentracao: 0.2 }), "Reforçar");
t("cobertura de indicador baixa ainda trava",
  api.bucketAction(45, 0.9, 10, 0.10, { coberturaAuto: 0.9, concentracao: 0.2 }),
  "Aguardar confirmação (dados insuficientes)");

console.log("\n— v73: escada única (tela e backtest) —");
t("score 45, motores de acordo", api.escadaDeAcao(45, 10, false).action, "Reforçar");
t("score 45, motores discordando", api.escadaDeAcao(45, 40, false).action, "Entrar parcialmente");
t("e diz qual degrau perdeu", api.escadaDeAcao(45, 40, false).rebaixado, "Reforçar");
t("score 20, de acordo", api.escadaDeAcao(20, 10, false).action, "Entrar parcialmente");
t("score 20, discordando", api.escadaDeAcao(20, 40, false).action, "Observar");
t("score 0", api.escadaDeAcao(0, 10, false).action, "Observar");
t("score -30", api.escadaDeAcao(-30, 10, false).action, "Reduzir");
t("score -70 sem convicção", api.escadaDeAcao(-70, 10, false).action, "Sair");
t("score -70 com convicção", api.escadaDeAcao(-70, 10, true).action, "Avaliar posição vendida (short)");
t("bucketAction usa a mesma escada",
  api.bucketAction(-70, 0.9, 10, 0.8, {}), api.escadaDeAcao(-70, 10, true).action);

/* --- estado com motores de forma realista para os testes de cobertura --- */
function estadoCobertura() {
  const agora = new Date().toISOString();
  const auto = v => ({ label: "x", source: "auto", value: v, updatedAt: agora });
  return {
    events: [],
    market: { lastFetch: agora },
    motors: {
      macro: { label: "Macro", weight: 0.28, indicators: {
        juros: auto(10), inflacao: auto(10), liquidez: auto(10), dxy: auto(10), curva: auto(10) } },
      sentimento: { label: "Sentimento", weight: 0.05, indicators: { fearGreed: auto(-20) } },
      onchain: { label: "On-chain", weight: 0.15, indicators: {
        mvrv: auto(30),
        nupl: { label: "nupl", source: "auto", value: null, updatedAt: agora } } },
      ativosGlobais: { label: "Globais", weight: 0.08, indicators: {
        sp500: auto(20),
        ouro: { label: "ouro", source: "auto", value: 40, updatedAt: agora, excludeFromScore: true } } },
      geopolitico: { label: "Geo", weight: 0.05, indicators: {
        gdelt: auto(90), epu: auto(90), tensao: { label: "t", source: "manual", value: 90 } } }
    }
  };
}

console.log("\n— v75: cobertura mede a população votante —");
global.S = estadoCobertura();
t("100% é atingível: ouro e NUPL fora do denominador", Math.round(api.computeCobertura() * 1e6), 1e6);
t("indicadoresVotantes exclui o sensor ouro", api.indicadoresVotantes("ativosGlobais"), ["sp500"]);
t("indicadoresVotantes exclui NUPL", api.indicadoresVotantes("onchain"), ["mvrv"]);
global.S.motors.macro.indicators.juros.value = null;
t("um indicador votante faltando derruba a cobertura",
  api.computeCobertura() < 1 && api.computeCobertura() > 0.9, true);

console.log("\n— v75: coberturaAuto não é peso × quantidade —");
global.S = estadoCobertura();
t("tudo respondendo = 100%", Math.round(api.coberturaAuto() * 1e6), 1e6);
// invariante central: cada motor contribui com o SEU peso no denominador,
// não com peso × número de campos cadastrados
global.S = estadoCobertura();
global.S.motors.sentimento.indicators.fearGreed.value = null;
t("Macro (5 autos) vale 0,28 e Sentimento vale 0,05 no denominador",
  Math.round(api.coberturaAuto() * 1e4), Math.round(((0.61 - 0.05) / 0.61) * 1e4));
global.S = estadoCobertura();
global.S.motors.macro.indicators.juros.value = null;
t("perder 1 dos 5 automáticos do Macro custa 0,28/5",
  Math.round(api.coberturaAuto() * 1e4), Math.round(((0.61 - 0.28 / 5) / 0.61) * 1e4));
// sob a regra antiga (peso somado por indicador) o mesmo caso daria outro número
t("e esse número é diferente do que a regra antiga dava",
  Math.round(api.coberturaAuto() * 1e4) !== Math.round(((1.40 - 0.28) / 1.40) * 1e4), true);

console.log("\n— v75: o teto do Geopolítico chega aos relógios —");
global.S = estadoCobertura(); // Geo com gdelt=90 e epu=90, ambos curto prazo
const hs = api.computeHorizonScores();
t("composto do motor respeita o teto +30", api.motorComposite("geopolitico"), 30);
// Geo tem 3 indicadores usáveis (gdelt, epu, tensao), todos em 90: bruto 90,
// teto 30, logo a translação é -60 e cada indicador entra com 30.
const wGeoInd = 0.05 / 3;
const esperadoCurto = (30 * wGeoInd + 30 * wGeoInd + (-20) * 0.05) / (2 * wGeoInd + 0.05);
t("o relógio de curto usa o valor com teto, não o bruto",
  Math.round(hs.curto.score * 1e6), Math.round(esperadoCurto * 1e6));
t("sem o teto o relógio de curto seria bem mais otimista",
  esperadoCurto < (90 * wGeoInd + 90 * wGeoInd + (-20) * 0.05) / (2 * wGeoInd + 0.05), true);
global.S.motors.geopolitico.indicators.gdelt.value = -80;
global.S.motors.geopolitico.indicators.epu.value = -80;
global.S.motors.geopolitico.indicators.tensao.value = -80;
t("teto não mexe no lado negativo", api.motorComposite("geopolitico"), -80);
t("e o relógio negativo não é transladado",
  Math.round(api.computeHorizonScores().curto.score * 1e6),
  Math.round(((-80) * wGeoInd + (-80) * wGeoInd + (-20) * 0.05) / (2 * wGeoInd + 0.05) * 1e6));

console.log("\n— v76: a opinião manual envelhece —");
function estadoManual(enteredAt, motorKey, indKey, horizonteEsperado) {
  const agora = new Date().toISOString();
  return {
    events: [],
    market: { lastFetch: agora },
    motors: {
      [motorKey]: { label: "M", weight: 0.15, indicators: {
        [indKey]: { label: "manual", source: "manual", value: 80, enteredAt } } }
    }
  };
}
const h = 3600e3;
// institucional.soberanos é horizonte médio → 336h de validade manual
global.S = estadoManual(new Date(Date.now() - 10 * h).toISOString(), "institucional", "soberanos");
t("digitado há 10h continua valendo", api.valorVigente("institucional", "soberanos"), 80);
global.S = estadoManual(new Date(Date.now() - 400 * h).toISOString(), "institucional", "soberanos");
t("digitado há 400h não pontua mais", api.valorVigente("institucional", "soberanos"), null);
t("e aparece na lista de vencidos", api.indicadoresExpirados().length, 1);
t("prazo manual é mais generoso que o automático (médio)",
  api.validadeManual("institucional", "soberanos") > api.validadeDoIndicador("institucional", "soberanos"), true);

console.log("\n— v76: valor herdado não some sem avisar —");
global.S = estadoManual(null, "institucional", "soberanos");
t("sem carimbo continua pontuando", api.valorVigente("institucional", "soberanos"), 80);
t("mas é sinalizado como sem data", api.manuaisSemCarimbo().length, 1);
t("e não conta como vencido", api.indicadoresExpirados().length, 0);
global.S = estadoManual("data-invalida", "institucional", "soberanos");
t("carimbo manual corrompido não vota", api.valorVigente("institucional", "soberanos"), null);

console.log("\n— v76: prazo acompanha o horizonte declarado —");
t("sentimento social (curto) vence em 72h", api.validadeManual("sentimento", "social"), 72);
t("tensão geopolítica (longo) vence em 1080h", api.validadeManual("geopolitico", "tensao"), 1080);

console.log("\n— v77: histerese nos cortes —");
t("sem ação anterior, o corte vale como sempre",
  api.escadaDeAcao(40.1, 10, false).action, "Reforçar");
t("39,9 vindo de 'Entrar parcialmente' não vira Reforçar",
  api.escadaDeAcao(40.1, 10, false, "Entrar parcialmente").action, "Entrar parcialmente");
t("e o sistema declara que segurou",
  api.escadaDeAcao(40.1, 10, false, "Entrar parcialmente").mantidoPorHisterese, true);
t("dizendo o que diria sem a trava",
  api.escadaDeAcao(40.1, 10, false, "Entrar parcialmente").seriaAgora, "Reforçar");
t("atravessar o corte com folga muda mesmo",
  api.escadaDeAcao(43, 10, false, "Entrar parcialmente").action, "Reforçar");
t("perturbação de ±0,1 em torno de 15 não troca ação",
  api.escadaDeAcao(15.1, 10, false, "Observar").action,
  api.escadaDeAcao(14.9, 10, false, "Observar").action);
t("perturbação de ±0,1 em torno de -55 não troca ação",
  api.escadaDeAcao(-55.1, 10, true, "Reduzir").action,
  api.escadaDeAcao(-54.9, 10, true, "Reduzir").action);
t("a margem é simétrica: subindo também segura",
  api.escadaDeAcao(14.5, 10, false, "Entrar parcialmente").action, "Entrar parcialmente");
t("queda real de faixa não é segurada",
  api.escadaDeAcao(-30, 10, false, "Reforçar").action, "Reduzir");
t("bucketAction repassa a ação anterior",
  api.bucketAction(40.1, 0.9, 10, 0.8, {}, "Entrar parcialmente"), "Entrar parcialmente");

console.log("\n— v77: evento grave não é diluído pela média —");
const dia = 24 * 3600e3;
global.S = { events: [
  { id:"a", title:"crise", date:new Date(Date.now()-1*dia).toISOString(), impact:-90 },
  { id:"b", title:"ruído", date:new Date(Date.now()-1*dia).toISOString(), impact:-5 },
  { id:"c", title:"ruído", date:new Date(Date.now()-1*dia).toISOString(), impact:-5 },
  { id:"d", title:"ruído", date:new Date(Date.now()-1*dia).toISOString(), impact:-5 }
], motors: { eventos: { label:"Eventos", weight:0.05, indicators:{} } }, market:{} };
const evs = api.eventosDecaidos();
t("os quatro eventos entram na janela", evs.length, 4);
const forte = evs.reduce((m,e)=>Math.abs(e.efetivo)>Math.abs(m.efetivo)?e:m, evs[0]);
t("o mais severo domina, não a média", Math.round(forte.efetivo) < -70, true);
t("a média antiga daria algo perto de -26",
  Math.round(evs.reduce((a,e)=>a+e.impact,0)/evs.length), -26);
t("motor de eventos usa a severidade", Math.round(api.motorComposite("eventos")), Math.round(forte.efetivo));

console.log("\n— v77: choque decai com o tempo —");
const choque = d => { global.S = { events:[{ id:"x", title:"c", date:new Date(Date.now()-d*dia).toISOString(), impact:-100 }],
  motors:{ eventos:{ label:"E", weight:0.05, indicators:{} } }, market:{} };
  return api.eventosDecaidos()[0].efetivo; };
t("hoje vale integral", Math.round(choque(0)), -100);
t("meia-vida de 7 dias", Math.round(choque(7)), -50);
t("duas semanas vale ~um quarto", Math.round(choque(13.9)), -25);
global.S = { events:[{ id:"x", title:"c", date:new Date(Date.now()-20*dia).toISOString(), impact:-100 }],
  motors:{ eventos:{ label:"E", weight:0.05, indicators:{} } }, market:{} };
t("fora da janela de 14 dias, sai de vez", api.eventosDecaidos().length, 0);
t("evento com data inválida é ignorado",
  (() => { global.S = { events:[{ id:"x", title:"c", date:"nunca", impact:-100 }],
    motors:{ eventos:{ label:"E", weight:0.05, indicators:{} } }, market:{} };
    return api.eventosDecaidos().length; })(), 0);

console.log("\n— v78: ficha técnica de cada indicador —");
const idsCadastrados = Object.keys(api.INDICATOR_SPECS).sort();
// lê os indicadores direto do estado inicial do arquivo: o teste não confia
// numa lista minha, confia no que o sistema declara ter
const blocoMotores = src.slice(src.indexOf("motors: {"), src.indexOf("motors: {") + 8000);
const idsReais = [];
let motorAtual = null;
blocoMotores.split("\n").forEach(function (linha) {
  const m = linha.match(/^\s{6}(\w+):\s*\{\s*label:/);
  if (m) motorAtual = m[1];
  const i = linha.match(/^\s{8}(\w+)\s*:\s*ind\(/);
  if (i && motorAtual) idsReais.push(motorAtual + "." + i[1]);
});
idsReais.sort();
t("nenhum indicador do sistema ficou sem ficha técnica",
  idsReais.filter(id => !idsCadastrados.includes(id)), []);
t("nenhuma ficha técnica sobrando, sem indicador correspondente",
  idsCadastrados.filter(id => !idsReais.includes(id)), []);
t("todo spec declara provedor", idsCadastrados.every(k => !!api.INDICATOR_SPECS[k].provider), true);
t("todo spec declara unidade do bruto", idsCadastrados.every(k => !!api.INDICATOR_SPECS[k].rawUnit), true);
t("todo spec declara lag de publicação",
  idsCadastrados.every(k => Number.isFinite(api.INDICATOR_SPECS[k].lagH)), true);
t("todo spec declara família latente", idsCadastrados.every(k => !!api.INDICATOR_SPECS[k].family), true);
t("séries mensais têm lag maior que as diárias",
  api.INDICATOR_SPECS["macro.liquidez"].lagH > api.INDICATOR_SPECS["macro.dxy"].lagH, true);
t("provedor por indicador resolve o grupo de falha",
  api.provedorDoIndicador("macro", "dxy"), "FRED");
t("DXY e EUR/USD estão na mesma família cambial",
  api.INDICATOR_SPECS["macro.dxy"].family, api.INDICATOR_SPECS["ativosGlobais.euro"].family);

console.log("\n— v78: available_at é o que impede olhar o futuro —");
const obsAgora = "2026-08-14T12:00:00.000Z";
const cpi = api.calcularAvailableAt("2026-07-01T00:00:00.000Z", 312, obsAgora);
t("CPI de julho só fica disponível depois do lag declarado",
  cpi.at > "2026-07-01T00:00:00.000Z", true);
t("e o sistema registra que foi derivado do lag", cpi.origem, "lag_declarado");
t("disponibilidade nunca é anterior à referência", cpi.at >= "2026-07-01T00:00:00.000Z", true);
const rt = api.calcularAvailableAt(null, 0, obsAgora);
t("série em tempo real: disponível quando foi lida", rt.at, obsAgora);
t("e o sistema registra que veio da observação", rt.origem, "observacao");
const futuro = api.calcularAvailableAt("2026-08-14T11:00:00.000Z", 720, obsAgora);
t("lag que jogaria a disponibilidade pra frente é aparado no instante da leitura",
  futuro.at, obsAgora);
const ruim = api.calcularAvailableAt("data-invalida", 24, obsAgora);
t("referência corrompida cai pro instante da leitura", ruim.at, obsAgora);

console.log("\n— v79: lag mensal contado do início do mês —");
// o FRED carimba série mensal com o dia 1 do mês de referência
const cpiJul = api.calcularAvailableAt("2026-07-01", api.INDICATOR_SPECS["macro.inflacao"].lagH, "2026-09-01T00:00:00.000Z");
t("CPI de julho não fica disponível ainda em julho", cpiJul.at.slice(0,7) > "2026-07", true);
t("CPI de julho fica disponível em meados de agosto", cpiJul.at.slice(0,7), "2026-08");
const m2Jun = api.calcularAvailableAt("2026-06-01", api.INDICATOR_SPECS["macro.liquidez"].lagH, "2026-09-01T00:00:00.000Z");
t("M2 de junho não fica disponível ainda em junho", m2Jun.at.slice(0,7) > "2026-06", true);
t("M2 tem lag maior que o CPI, como na realidade",
  api.INDICATOR_SPECS["macro.liquidez"].lagH > api.INDICATOR_SPECS["macro.inflacao"].lagH, true);
t("toda série mensal tem lag de pelo menos 30 dias",
  Object.keys(api.INDICATOR_SPECS)
    .filter(k => api.INDICATOR_SPECS[k].frequency === "monthly")
    .every(k => api.INDICATOR_SPECS[k].lagH >= 720), true);

console.log("\n— v79: painel da série —");
const fake = [
  { indicador:"macro.dxy", provider:"FRED", bruto:1, qualidade:"ok", observed_at:"2026-08-15T03:00:00.000Z", run_id:"r1" },
  { indicador:"macro.juros", provider:"FRED", bruto:null, qualidade:"sem_bruto", observed_at:"2026-08-15T03:00:01.000Z", run_id:"r1" },
  { indicador:"macro.dxy", provider:"FRED", bruto:2, qualidade:"ok", observed_at:"2026-08-17T03:00:00.000Z", run_id:"r2" }
];
const res = api.resumirSerie(fake);
t("conta o total", res.total, 3);
t("conta as coletas distintas", res.runs, 2);
t("separa quem já grava bruto", res.comBruto, 2);
t("agrupa por indicador", Object.keys(res.porIndicador).sort(), ["macro.dxy","macro.juros"]);
t("acha o dia de buraco na coleta", api.diasSemColeta(res.dias), ["2026-08-16"]);
t("série sem buraco não inventa alarme", api.diasSemColeta(["2026-08-15","2026-08-16"]), []);
t("um dia só não gera buraco", api.diasSemColeta(["2026-08-15"]), []);

console.log("\n— v80: peso efetivo por indicador —");
// reproduz o caso real do Jorge: Institucional com só o prêmio Coinbase
global.S = { events: [], market: {}, motors: {
  institucional: { label:"Inst", weight:0.15, indicators: {
    coinbasePremium: { label:"premio", source:"auto", value:-2, updatedAt:new Date().toISOString() },
    etfFlow:   { label:"etf",  source:"manual", value:null },
    custodia:  { label:"cust", source:"manual", value:null },
    soberanos: { label:"sob",  source:"manual", value:null } } },
  macro: { label:"Macro", weight:0.28, indicators: {
    juros: { label:"j", source:"auto", value:10, updatedAt:new Date().toISOString() } } }
}};
const efetInst = api.pesoEfetivoIndicador("institucional","coinbasePremium");
const nomInst  = api.pesoSeMotorCompleto("institucional","coinbasePremium");
t("sozinho no motor, o prêmio carrega o peso inteiro do motor",
  Math.round(efetInst*1e4), Math.round((0.15/0.43)*1e4));
t("com o motor completo ele valeria um quarto disso", Math.round(nomInst*1e4), Math.round((0.15/0.43/4)*1e4));
t("logo, está inchado", efetInst > nomInst*1.15, true);
// preenche os três manuais e o peso dele desaba
global.S.motors.institucional.indicators.etfFlow.value = 10;
global.S.motors.institucional.indicators.custodia.value = 10;
global.S.motors.institucional.indicators.soberanos.value = 10;
const efetDepois = api.pesoEfetivoIndicador("institucional","coinbasePremium");
t("com os companheiros preenchidos, o peso dele cai pra um quarto",
  Math.round(efetDepois*1e4), Math.round((efetInst/4)*1e4));
t("e deixa de estar inchado", efetDepois > api.pesoSeMotorCompleto("institucional","coinbasePremium")*1.15, false);
t("o inchaço não se confunde com a renormalização entre motores",
  Math.round(efetDepois*1e6), Math.round(api.pesoSeMotorCompleto("institucional","coinbasePremium")*1e6));
t("indicador que não pontua tem peso zero, não peso pequeno",
  (() => { global.S.motors.macro.indicators.juros.value = null;
           return api.pesoEfetivoIndicador("macro","juros"); })(), 0);

console.log("\n— v80: leitura de modelo antigo não entra em estatística —");
const snapNovo = { ts:"2026-08-15T00:00:00.000Z", modelo: api.MODEL_VERSION, score: 10 };
const snapVelho = { ts:"2026-08-12T00:00:00.000Z", build:"2026-08-10.61", score: 90 };
const sep = api.separarPorModelo([snapVelho, snapNovo, snapVelho]);
t("separa por versão de modelo", [sep.atual.length, sep.legado.length], [1, 2]);
t("snapshot sem carimbo de modelo é legado", api.snapshotDoModeloAtual(snapVelho), false);
t("snapshot do modelo atual é aceito", api.snapshotDoModeloAtual(snapNovo), true);
t("carimbo de outro modelo também é legado",
  api.snapshotDoModeloAtual({ modelo: "m0-antigo" }), false);
t("lista vazia não quebra", api.separarPorModelo([]).atual.length, 0);

console.log("\n— v81: desfecho reconstruído da própria série —");
const base = new Date("2026-08-01T12:00:00.000Z").getTime();
const serie = [0, 1, 2, 3, 4].map(function(d){
  return { ts: new Date(base + d*24*3600e3).toISOString(), preco: 100 + d*10 };
});
const alvo1d = base + 1*24*3600e3;
const achado = api.precoMaisProximoDe(serie, alvo1d, 12);
t("acha a leitura exatamente no alvo", achado.preco, 110);
t("e registra distância zero", achado.distanciaH, 0);
const alvoTorto = base + 1*24*3600e3 + 6*3600e3; // 6h depois da leitura
const perto = api.precoMaisProximoDe(serie, alvoTorto, 12);
t("aceita a leitura mais próxima dentro da tolerância", perto.preco, 110);
t("e registra a distância real, sem fingir precisão", perto.distanciaH, 6);
const alvoLonge = base + 20*24*3600e3;
t("fora da tolerância devolve nada em vez de inventar",
  api.precoMaisProximoDe(serie, alvoLonge, 72), null);
t("série sem preço não é usada",
  api.precoMaisProximoDe([{ ts: serie[0].ts, preco: null }], base, 12), null);
t("timestamp corrompido é ignorado",
  api.precoMaisProximoDe([{ ts: "nunca", preco: 100 }], base, 12), null);
t("tolerância cresce com o horizonte",
  api.TOLERANCIA_RECONSTRUCAO_H[30] > api.TOLERANCIA_RECONSTRUCAO_H[1], true);
t("horizonte de 1 dia não aceita meio dia de erro proporcionalmente grande",
  api.TOLERANCIA_RECONSTRUCAO_H[1], 12);

console.log("\n— v81: maturação de desfecho —");
const umDia = 24 * 3600e3;
function serieDiaria(n, precoInicial) {
  return Array.from({ length: n }, (_, i) => ({
    ts: new Date(base + i * umDia).toISOString(), preco: precoInicial + i * 10, retornos: {}, retornosMeta: {}
  }));
}
// cenário 1: app aberto na hora certa
let sn = serieDiaria(2, 100);
api.maturarRetornos(sn, 110, base + 1 * umDia);
t("desfecho de 1 dia sai +10%", Math.round(sn[0].retornos.d1), 10);
t("e é marcado como colhido na janela", sn[0].retornosMeta.d1.origem, "janela");

// cenário 2: app fechado 5 dias — a v80 perdia este desfecho pra sempre
sn = serieDiaria(6, 100);
api.maturarRetornos(sn, 160, base + 5 * umDia);
t("desfecho de 1 dia é reconstruído da própria série",
  Math.round(sn[0].retornos.d1), 10);
t("marcado como reconstruído, não como se tivesse sido colhido na hora",
  sn[0].retornosMeta.d1.origem, "reconstruido");
t("e diz de qual leitura veio", sn[0].retornosMeta.d1.tsUsado, sn[1].ts);
t("desfecho de 3 dias também", Math.round(sn[0].retornos.d3), 30);

// cenário 3: buraco real na série — não dá pra reconstruir
sn = [
  { ts: new Date(base).toISOString(), preco: 100, retornos: {}, retornosMeta: {} },
  { ts: new Date(base + 10 * umDia).toISOString(), preco: 200, retornos: {}, retornosMeta: {} }
];
api.maturarRetornos(sn, 200, base + 10 * umDia);
t("sem leitura próxima do alvo, o desfecho é PERDIDO, não inventado",
  sn[0].retornosMeta.d1.origem, "perdido");
t("e o valor fica ausente", sn[0].retornos.d1, undefined);
t("perdido não se confunde com 'ainda não venceu'",
  sn[0].retornosMeta.d30, undefined);

// cenário 4: janela independente
sn = serieDiaria(3, 100);
api.maturarRetornos(sn, 120, base + 2 * umDia);
t("retorno até a leitura seguinte", Math.round(sn[0].retornos.prox), 10);
t("com o intervalo real registrado", sn[0].retornosMeta.prox.horas, 24);
t("a última leitura ainda não tem seguinte", sn[2].retornos.prox, undefined);

// cenário 5: não reescreve o que já foi apurado
sn = serieDiaria(6, 100);
sn[0].retornos.d1 = 999;
sn[0].retornosMeta.d1 = { origem: "janela" };
api.maturarRetornos(sn, 160, base + 5 * umDia);
t("desfecho já apurado não é recalculado", sn[0].retornos.d1, 999);
t("e a origem dele é preservada", sn[0].retornosMeta.d1.origem, "janela");

// cenário 6: prazo que ainda não venceu fica intocado
sn = serieDiaria(2, 100);
api.maturarRetornos(sn, 110, base + 1 * umDia);
t("30 dias não vence em 1 dia", sn[0].retornos.d30, undefined);
t("e não é marcado como perdido", sn[0].retornosMeta.d30, undefined);

console.log("\n" + (falhou ? "✗ " + falhou + " falha(s), " : "✓ ") + ok + " teste(s) ok\n");
process.exit(falhou ? 1 : 0);

/* =====================================================================
   harness-v91.js — banco de provas da v91
   ===================================================================== */

const fs = require("fs");
const arquivo = process.argv[2] || "index.html";
const HTML = fs.readFileSync(arquivo, "utf8");

function fonteDe(nome){
  const marcas = [
    "function " + nome + "(",
    "const " + nome + " = function(",
    "const " + nome + " = "
  ];
  for(const marca of marcas){
    const ini = HTML.indexOf(marca);
    if(ini === -1) continue;
    const abre = HTML.indexOf("{", ini);
    if(abre === -1) continue;
    let n = 0, emStr = null, escapa = false;
    for(let i = abre; i < HTML.length; i++){
      const c = HTML[i];
      if(escapa){ escapa = false; continue; }
      if(c === "\\"){ escapa = true; continue; }
      if(emStr){ if(c === emStr) emStr = null; continue; }
      if(c === '"' || c === "'" || c === "`"){ emStr = c; continue; }
      if(c === "{") n++;
      else if(c === "}"){ n--; if(n === 0) return HTML.slice(ini, i + 1); }
    }
  }
  throw new Error("não encontrei a função " + nome);
}

function constDe(nome){
  const marca = "const " + nome + " = ";
  const ini = HTML.indexOf(marca);
  if(ini === -1) throw new Error("não encontrei a constante " + nome);
  const abre = HTML.indexOf("{", ini);
  const ponto = HTML.indexOf(";", ini);
  if(abre === -1 || abre > ponto) return HTML.slice(ini, ponto + 1);
  let n = 0, emStr = null, escapa = false;
  for(let i = abre; i < HTML.length; i++){
    const c = HTML[i];
    if(escapa){ escapa = false; continue; }
    if(c === "\\"){ escapa = true; continue; }
    if(emStr){ if(c === emStr) emStr = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ emStr = c; continue; }
    if(c === "{") n++;
    else if(c === "}"){ n--; if(n === 0) return HTML.slice(ini, i + 1) + ";"; }
  }
  throw new Error("constante " + nome + " não fecha");
}

const ctx = {};
ctx.S = null;
ctx.COLOR = { brick: "#a33", teal: "#3aa", gold: "#ca3" };
ctx.registrarObservacao = function(){};
ctx.esc = s => String(s);
ctx.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const pecas = [
  constDe("VALIDADE_HORAS"),
  constDe("VALIDADE_MANUAL_HORAS"),
  constDe("INDICATOR_HORIZON"),
  constDe("COBERTURA_MINIMA"),
  fonteDe("validadeDoIndicador"),
  fonteDe("validadeManual"),
  fonteDe("frescorDoIndicador"),
  fonteDe("valorVigente"),
  fonteDe("ultimaLeituraConhecida"),
  fonteDe("indicadoresVotantes"),
  fonteDe("computeCobertura"),
  fonteDe("coberturaAuto"),
  fonteDe("indicadoresComFalha"),
  fonteDe("indicadoresExpirados"),
  fonteDe("setFailed"),
  fonteDe("marcarSaturacao"),
  fonteDe("setAuto"),
  fonteDe("brutoVigente"),
  fonteDe("comparaGatilho"),
  fonteDe("interpretarLegado"),
  fonteDe("avaliarGatilho"),
  fonteDe("textoDoGatilho"),
  constDe("GATILHO_FONTE"),
  constDe("CAMPOS_TEXTO_INDICADOR"),
  fonteDe("sanitizarBackup")
];

const corpo = pecas.join("\n") + "\nreturn { " + [
  "frescorDoIndicador","valorVigente","ultimaLeituraConhecida","computeCobertura",
  "coberturaAuto","indicadoresComFalha","indicadoresExpirados","setFailed","setAuto",
  "brutoVigente","comparaGatilho","interpretarLegado","avaliarGatilho","sanitizarBackup",
  "GATILHO_FONTE"
].join(",") + " };";

let API;
try{
  API = new Function("ctx", "with(ctx){ " + corpo + " }")(ctx);
}catch(e){
  console.error("FALHA AO MONTAR O AMBIENTE:", e.message);
  process.exit(1);
}
ctx.brutoVigente = API.brutoVigente;

function agora(desloc){ return new Date(Date.now() - (desloc || 0)).toISOString(); }

function estadoBase(){
  const ind = (label, source) => ({
    label, source, value: null, note: "", locked: false, fetchFailed: false,
    excludeFromScore: false, falhouEm: null, motivoFalha: "",
    bruto: null, brutoAt: null, enteredAt: null
  });
  return {
    market: { lastFetch: agora(0), price: 100000 },
    motors: {
      macro: { label: "Macro", weight: .28, indicators: {
        juros: ind("Juros", "auto"), inflacao: ind("CPI", "auto"),
        liquidez: ind("M2", "auto"), dxy: ind("DXY", "auto"), curva: ind("Curva", "auto")
      }},
      tecnico: { label: "Técnico", weight: .72, indicators: {
        rsi: ind("RSI", "auto"), mediaMovel: ind("MM50", "auto")
      }}
    }
  };
}

let ok = 0, falhou = 0;
const falhas = [];
function t(bloco, nome, fn){
  try{
    fn();
    ok++;
    console.log("  ✓ " + nome);
  }catch(e){
    falhou++;
    falhas.push(bloco + " › " + nome + ": " + e.message);
    console.log("  ✗ " + nome + "  — " + e.message);
  }
}
function eq(a, b, msg){
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if(A !== B) throw new Error((msg || "") + " esperado " + B + ", veio " + A);
}
function verdade(v, msg){ if(!v) throw new Error(msg || "esperava verdadeiro"); }

console.log("\nBLOCO A — falha de fonte retira o voto (v91)");

t("A", "fonte que falhou não pontua, mesmo com valor recente", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.macro.indicators.dxy;
  i.value = 42; i.updatedAt = agora(0);
  eq(API.valorVigente("macro","dxy"), 42, "antes da falha:");
  API.setFailed("macro","dxy","Load failed");
  eq(API.valorVigente("macro","dxy"), null, "depois da falha:");
});

t("A", "o valor NÃO é apagado — segue disponível como última leitura", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.macro.indicators.dxy;
  i.value = 42; i.updatedAt = agora(0);
  API.setFailed("macro","dxy","Load failed");
  eq(i.value, 42, "valor bruto no estado:");
  const u = API.ultimaLeituraConhecida("macro","dxy");
  eq(u.valor, 42, "última leitura:");
});

t("A", "falhou e expirado são estados distintos", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.macro.indicators.dxy;
  i.value = 42; i.updatedAt = agora(0);
  API.setFailed("macro","dxy","timeout");
  const f = API.frescorDoIndicador("macro","dxy");
  eq(f.falhou, true, "falhou:");
  eq(f.expirado, false, "expirado:");
});

t("A", "setFailed registra o momento e o motivo", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.macro.indicators.dxy;
  i.value = 42; i.updatedAt = agora(0);
  API.setFailed("macro","dxy","status 400 em /api/fred");
  verdade(i.falhouEm, "falhouEm não foi gravado");
  eq(i.motivoFalha, "status 400 em /api/fred");
});

t("A", "indicador TRAVADO pelo usuário sobrevive à falha da fonte", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.macro.indicators.dxy;
  i.value = 42; i.locked = true; i.enteredAt = agora(0);
  API.setFailed("macro","dxy","Load failed");
  eq(API.valorVigente("macro","dxy"), 42, "valor travado:");
});

t("A", "A COBERTURA CAI quando a fonte cai", ()=>{
  ctx.S = estadoBase();
  ["juros","inflacao","liquidez","dxy","curva"].forEach(k=>{
    const i = ctx.S.motors.macro.indicators[k];
    i.value = 10; i.updatedAt = agora(0);
  });
  ["rsi","mediaMovel"].forEach(k=>{
    const i = ctx.S.motors.tecnico.indicators[k];
    i.value = 10; i.updatedAt = agora(0);
  });
  eq(Math.round(API.computeCobertura()*100), 100, "cobertura cheia:");
  ["juros","inflacao","liquidez","dxy","curva"].forEach(k=> API.setFailed("macro",k,"FRED fora do ar"));
  const depois = API.computeCobertura();
  verdade(depois < 0.75, "cobertura devia despencar, veio " + depois);
  eq(Math.round(depois*100), 72, "cobertura sem o Macro:");
});

t("A", "coberturaAuto também cai", ()=>{
  ctx.S = estadoBase();
  Object.keys(ctx.S.motors).forEach(mk=>{
    Object.keys(ctx.S.motors[mk].indicators).forEach(ik=>{
      const i = ctx.S.motors[mk].indicators[ik];
      i.value = 10; i.updatedAt = agora(0);
    });
  });
  eq(Math.round(API.coberturaAuto()*100), 100, "antes:");
  API.setFailed("tecnico","rsi","Binance 451");
  verdade(API.coberturaAuto() < 1, "coberturaAuto não caiu");
});

t("A", "indicadoresComFalha lista o caído, e indicadoresExpirados não o inclui", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.macro.indicators.dxy;
  i.value = 42; i.updatedAt = agora(0);
  API.setFailed("macro","dxy","Load failed");
  eq(API.indicadoresComFalha().length, 1, "com falha:");
  eq(API.indicadoresExpirados().length, 0, "expirados:");
});

t("A", "setAuto limpa o estado de falha e grava o bruto", ()=>{
  ctx.S = estadoBase();
  API.setFailed("tecnico","rsi","timeout");
  API.setAuto("tecnico","rsi", -20, "RSI-SMA(14) diário: 60", { bruto: 60 });
  const i = ctx.S.motors.tecnico.indicators.rsi;
  eq(i.fetchFailed, false, "fetchFailed:");
  eq(i.falhouEm, null, "falhouEm:");
  eq(i.bruto, 60, "bruto:");
  eq(API.valorVigente("tecnico","rsi"), -20, "voltou a votar:");
});

console.log("\nBLOCO B — gatilhos estruturados (v91)");

function comRSI(bruto, score){
  ctx.S = estadoBase();
  const i = ctx.S.motors.tecnico.indicators.rsi;
  i.value = (score === undefined ? -20 : score);
  i.bruto = bruto; i.updatedAt = agora(0); i.brutoAt = i.updatedAt;
  return i;
}

t("B", "gatilho estruturado compara o BRUTO contra o limiar declarado", ()=>{
  comRSI(70);
  eq(API.avaliarGatilho({ id:"tecnico.rsi", op:">", limiar:60, texto:"x" }), true);
  comRSI(50);
  eq(API.avaliarGatilho({ id:"tecnico.rsi", op:">", limiar:60, texto:"x" }), false);
});

t("B", "o texto legado de RSI extrai 60, NÃO o 14 do 'RSI-SMA(14)'", ()=>{
  const g = API.interpretarLegado("RSI-SMA(14) diário permanece acima de 60 (sobrecompra sustentando a queda)");
  verdade(g, "não interpretou o texto");
  eq(g.limiar, 60, "limiar:");
  eq(g.op, ">", "operador:");
});

t("B", "o texto legado de RSI deixa de ser MUDO", ()=>{
  comRSI(47);
  const r = API.avaliarGatilho("RSI-SMA(14) diário permanece acima de 60 (sobrecompra sustentando a queda)");
  verdade(r !== null, "continua devolvendo null — o gatilho segue mudo");
  eq(r, false, "RSI 47 não está acima de 60:");
});

t("B", "RSI 47 com limiar 35 pela via legada: abaixo é falso", ()=>{
  comRSI(47);
  eq(API.avaliarGatilho("RSI-SMA(14) diário cai abaixo de 35 (sobrevenda pode reverter a tese)"), false);
  comRSI(30);
  eq(API.avaliarGatilho("RSI-SMA(14) diário cai abaixo de 35 (sobrevenda pode reverter a tese)"), true);
});

t("B", "gatilho não responde quando a fonte caiu", ()=>{
  comRSI(70);
  API.setFailed("tecnico","rsi","Load failed");
  eq(API.avaliarGatilho({ id:"tecnico.rsi", op:">", limiar:60, texto:"x" }), null);
});

t("B", "gatilho não responde quando não há bruto (dado anterior à v91)", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.tecnico.indicators.rsi;
  i.value = -20; i.updatedAt = agora(0); i.bruto = null;
  eq(API.avaliarGatilho({ id:"tecnico.rsi", op:">", limiar:60, texto:"x" }), null);
});

t("B", "os quatro operadores", ()=>{
  eq(API.comparaGatilho(5, ">", 3), true);
  eq(API.comparaGatilho(5, "<", 3), false);
  eq(API.comparaGatilho(3, ">=", 3), true);
  eq(API.comparaGatilho(3, "<=", 3), true);
  eq(API.comparaGatilho(5, "?", 3), null, "operador desconhecido:");
});

t("B", "MM50: distância percentual decide, e o sinal é respeitado", ()=>{
  ctx.S = estadoBase();
  const i = ctx.S.motors.tecnico.indicators.mediaMovel;
  i.value = 26; i.bruto = 3.2; i.updatedAt = agora(0);
  eq(API.avaliarGatilho({ id:"tecnico.mediaMovel", op:">", limiar:0, texto:"x" }), true);
  i.bruto = -1.4;
  eq(API.avaliarGatilho({ id:"tecnico.mediaMovel", op:">", limiar:0, texto:"x" }), false);
  eq(API.avaliarGatilho("Preço fecha abaixo da Média Móvel 50d"), true);
});

t("B", "id desconhecido devolve null em vez de estourar", ()=>{
  ctx.S = estadoBase();
  eq(API.avaliarGatilho({ id:"nao.existe", op:">", limiar:1, texto:"x" }), null);
});

console.log("\nBLOCO C — backup preserva gatilho estruturado (v91)");

t("C", "gatilho objeto sobrevive ao sanitizador", ()=>{
  const p = { motors:{}, scenarios:[{
    title:"t", probability:60,
    confirmTriggers:[{ id:"tecnico.rsi", op:">", limiar:60, texto:"RSI acima de 60" }],
    invalidateTriggers:[], premiseIds:[]
  }], premises:[], events:[], history:[] };
  API.sanitizarBackup(p);
  const g = p.scenarios[0].confirmTriggers[0];
  verdade(typeof g === "object", "virou " + JSON.stringify(g) + " — o backup apagou a correção");
  eq(g.limiar, 60, "limiar:");
  eq(g.op, ">", "operador:");
});

t("C", "gatilho com operador inválido é descartado, não aceito", ()=>{
  const p = { motors:{}, scenarios:[{
    title:"t", probability:60,
    confirmTriggers:[{ id:"tecnico.rsi", op:"DROP", limiar:60, texto:"x" }],
    invalidateTriggers:[], premiseIds:[]
  }], premises:[], events:[], history:[] };
  API.sanitizarBackup(p);
  eq(p.scenarios[0].confirmTriggers.length, 0);
});

t("C", "gatilho legado em texto continua aceito", ()=>{
  const p = { motors:{}, scenarios:[{
    title:"t", probability:60,
    confirmTriggers:["Preço se mantém acima da Média Móvel 50d"],
    invalidateTriggers:[], premiseIds:[]
  }], premises:[], events:[], history:[] };
  API.sanitizarBackup(p);
  eq(typeof p.scenarios[0].confirmTriggers[0], "string");
});

t("C", "campos novos do indicador são higienizados", ()=>{
  const p = { motors:{ macro:{ indicators:{ dxy:{
    label:"DXY", value: 10, bruto: "não é número", motivoFalha: 12345, falhouEm: 99
  }}}}, scenarios:[], premises:[], events:[], history:[] };
  API.sanitizarBackup(p);
  const i = p.motors.macro.indicators.dxy;
  eq(i.bruto, null, "bruto:");
  eq(i.falhouEm, null, "falhouEm:");
  eq(typeof i.motivoFalha, "string", "motivoFalha:");
});

console.log("\n" + "=".repeat(60));
console.log(`${ok} passaram · ${falhou} falharam`);
if(falhou){
  console.log("\nFALHAS:");
  falhas.forEach(f=>console.log("  " + f));
  process.exit(1);
}
console.log("v91 verde.");

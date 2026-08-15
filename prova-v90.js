/* =====================================================================
   prova-v90.js — demonstra os dois defeitos usando as funções REAIS da v90
   =====================================================================
   Não é o banco de provas: é a prova de que havia o que consertar. Roda
   contra o arquivo antigo e mostra o comportamento, não a opinião.

   Uso:  node prova-v90.js /caminho/index-v90.html
   ===================================================================== */

const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2], "utf8");

function fonteDe(nome){
  const ini = HTML.indexOf("function " + nome + "(");
  if(ini === -1) throw new Error("sem " + nome);
  const abre = HTML.indexOf("{", ini);
  let n = 0, str = null, esc = false;
  for(let i = abre; i < HTML.length; i++){
    const c = HTML[i];
    if(esc){ esc = false; continue; }
    if(c === "\\"){ esc = true; continue; }
    if(str){ if(c === str) str = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ str = c; continue; }
    if(c === "{") n++; else if(c === "}"){ n--; if(!n) return HTML.slice(ini, i+1); }
  }
}
function constDe(nome){
  const ini = HTML.indexOf("const " + nome + " = ");
  const abre = HTML.indexOf("{", ini);
  let n = 0, str = null, esc = false;
  for(let i = abre; i < HTML.length; i++){
    const c = HTML[i];
    if(esc){ esc = false; continue; }
    if(c === "\\"){ esc = true; continue; }
    if(str){ if(c === str) str = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ str = c; continue; }
    if(c === "{") n++; else if(c === "}"){ n--; if(!n) return HTML.slice(ini, i+1) + ";"; }
  }
}

const ctx = { S: null, registrarObservacao(){}, };
const API = new Function("ctx", "with(ctx){" + [
  constDe("VALIDADE_HORAS"), constDe("VALIDADE_MANUAL_HORAS"), constDe("INDICATOR_HORIZON"),
  fonteDe("validadeDoIndicador"), fonteDe("validadeManual"),
  fonteDe("frescorDoIndicador"), fonteDe("valorVigente"),
  fonteDe("indicadoresVotantes"), fonteDe("computeCobertura"), fonteDe("coberturaAuto"),
  fonteDe("setFailed"), fonteDe("avaliarGatilho")
].join("\n") + "\nreturn { valorVigente, computeCobertura, coberturaAuto, setFailed, avaliarGatilho };}")(ctx);

const agora = () => new Date().toISOString();
const ind = (label, source) => ({ label, source, value:null, note:"", locked:false,
                                  fetchFailed:false, excludeFromScore:false, enteredAt:null });
function estado(){
  return {
    market: { lastFetch: agora(), price: 100000 },
    motors: {
      macro: { label:"Macro", weight:.28, indicators:{
        juros:ind("Juros","auto"), inflacao:ind("CPI","auto"), liquidez:ind("M2","auto"),
        dxy:ind("DXY","auto"), curva:ind("Curva","auto") }},
      tecnico: { label:"Técnico", weight:.52, indicators:{
        rsi:ind("RSI","auto"), mediaMovel:ind("MM50","auto") }},
      derivativos: { label:"Derivativos", weight:.20, indicators:{
        funding:ind("Funding","auto") }}
    }
  };
}

console.log("PROVA CONTRA A v90 — " + process.argv[2] + "\n");

/* --- defeito 1 --------------------------------------------------------- */
console.log("DEFEITO 1 — a falha de fonte não retira o voto\n");
ctx.S = estado();
Object.keys(ctx.S.motors).forEach(mk=>Object.keys(ctx.S.motors[mk].indicators).forEach(ik=>{
  const i = ctx.S.motors[mk].indicators[ik]; i.value = 10; i.updatedAt = agora();
}));
console.log("  antes:  DXY vota com " + API.valorVigente("macro","dxy")
          + " · cobertura " + (API.computeCobertura()*100).toFixed(0) + "%"
          + " · coleta auto " + (API.coberturaAuto()*100).toFixed(0) + "%");

["juros","inflacao","liquidez","dxy","curva"].forEach(k=>API.setFailed("macro",k));

const v = API.valorVigente("macro","dxy");
const cob = API.computeCobertura();
console.log("  o FRED inteiro cai (5 de 5 séries do Macro):");
console.log("  depois: DXY vota com " + v
          + " · cobertura " + (cob*100).toFixed(0) + "%"
          + " · coleta auto " + (API.coberturaAuto()*100).toFixed(0) + "%");
console.log(v === null
  ? "\n  → o voto morreu. (comportamento da v91)"
  : "\n  → o Macro está MORTO e continua votando com o valor anterior,\n"
  + "    e a cobertura segue em " + (cob*100).toFixed(0) + "%: a trava de 70% de coleta\n"
  + "    automática não dispara porque os indicadores caídos a sustentam.\n"
  + "    Com horizonte 'longo', isso dura até 336 horas — catorze dias.");

/* --- defeito 2 --------------------------------------------------------- */
console.log("\n" + "-".repeat(62));
console.log("\nDEFEITO 2 — os gatilhos de RSI são mudos\n");
ctx.S = estado();
const r = ctx.S.motors.tecnico.indicators.rsi;
r.value = -20; r.updatedAt = agora();
r.note = "RSI-SMA(14) diário: 47 (leitura contrária: alto = risco de reversão)";
const mm = ctx.S.motors.tecnico.indicators.mediaMovel;
mm.value = 26; mm.updatedAt = agora();
mm.note = "preço +3.2% vs. MM50 diária";

const casos = [
  "RSI-SMA(14) diário permanece acima de 60 (sobrecompra sustentando a queda)",
  "RSI-SMA(14) diário cai abaixo de 35 (sobrevenda pode reverter a tese)",
  "Preço se mantém acima da Média Móvel 50d"
];
casos.forEach(c=>{
  const res = API.avaliarGatilho(c);
  const marca = res === true ? "✓ batido" : res === false ? "✗ não batido" : "— MUDO (null)";
  console.log("  " + marca.padEnd(16) + c.slice(0, 52));
});
console.log("\n  → a nota diz 'RSI-SMA(14)' e o regex procura 'rsi(14)'. Não casa.");
console.log("    A tela exibe dois gatilhos que o sistema não consegue verificar.");

/* --- o defeito embaixo do defeito -------------------------------------- */
console.log("\n  E se alguém consertar SÓ o regex da nota:");
const t = casos[0].toLowerCase();
const semRemocao = /(\d{2})/.exec(t.replace(/rsi\(14\)/i,""));
console.log("    limiar que o código extrairia: " + semRemocao[1] + "   (o texto diz 60)");
console.log("    → passaria a testar 'RSI > " + semRemocao[1] + "', verdadeiro quase sempre.");
console.log("    Gatilho mudo vira gatilho mentindo que bateu. É por isso que a");
console.log("    v91 abandona o parsing de texto em vez de melhorar o regex.");
console.log("");

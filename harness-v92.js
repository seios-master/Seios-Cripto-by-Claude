/* harness-v92.js — testes INVARIANTES do agregador único */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");

function bloco(ini){
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
  throw new Error("bloco não fecha");
}
function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome);
  const abre = HTML.indexOf("{", i), pv = HTML.indexOf(";", i);
  if(abre === -1 || abre > pv) return HTML.slice(i, pv + 1);
  return bloco(i) + ";";
}
const ctx = { S: null, registrarObservacao(){}, specDoIndicador: null };
const partes = [
  constDe("RENORM_MAX"), constDe("FAMILIA_TETO"), constDe("INDICATOR_HORIZON"),
  constDe("VALIDADE_HORAS"), constDe("VALIDADE_MANUAL_HORAS"),
  fonteDe("validadeDoIndicador"), fonteDe("validadeManual"),
  fonteDe("frescorDoIndicador"), fonteDe("valorVigente"),
  fonteDe("indicadoresVotantes"), fonteDe("aplicarTeto"), fonteDe("aplicarTetoPuro"),
  fonteDe("scoreLabel"), fonteDe("agregarCanonico"), fonteDe("scoreSemMotor")
];
const prelude = `
  const FAMILIA = ${JSON.stringify({})};
  function familiaDoIndicador(mk, ik){ return ctx.FAM[mk + "." + ik] || "sem_familia"; }
  function motorComposite(mk){ return ctx.COMPOSTO(mk); }
  function contribuicoesCanonicas(){ return ctx.VETOR(); }
`;
let API;
try{
  API = new Function("ctx", "with(ctx){" + prelude + partes.join("\n") +
    "\nreturn { agregarCanonico, scoreSemMotor, valorVigente, aplicarTeto };}")(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

function vetorTeste(){
  return {
    itens: [
      { id:"a.1", motor:"a", indicador:"1", familia:"f1", valor:  40, peso:0.20 },
      { id:"a.2", motor:"a", indicador:"2", familia:"f1", valor: -10, peso:0.20 },
      { id:"b.1", motor:"b", indicador:"1", familia:"f2", valor:  60, peso:0.25 }
    ],
    nominais: [
      { id:"a.1", motor:"a", indicador:"1", familia:"f1", peso:0.20 },
      { id:"a.2", motor:"a", indicador:"2", familia:"f1", peso:0.20 },
      { id:"a.3", motor:"a", indicador:"3", familia:"f1", peso:0.20 },
      { id:"b.1", motor:"b", indicador:"1", familia:"f2", peso:0.25 },
      { id:"b.2", motor:"b", indicador:"2", familia:"f2", peso:0.25 }
    ],
    massaTotal: 1.10, massaObservada: 0.65
  };
}
let ok = 0, bad = 0; const falhas = [];
function t(nome, fn){
  try{ fn(); ok++; console.log("  ✓ " + nome); }
  catch(e){ bad++; falhas.push(nome + ": " + e.message); console.log("  ✗ " + nome + "  — " + e.message); }
}
const QUASE = 1e-9;
function perto(a, b, msg){
  if(Math.abs(a - b) > QUASE) throw new Error((msg||"") + " " + a + " ≠ " + b + " (Δ " + (a-b) + ")");
}
function eq(a, b, msg){ if(a !== b) throw new Error((msg||"") + " esperado " + b + ", veio " + a); }

console.log("\nBLOCO A — as identidades do agregador (v92)");
t("A soma das contribuições reproduz o score EXATAMENTE", ()=>{
  const ag = API.agregarCanonico(vetorTeste());
  perto(Object.values(ag.contribuicoes).reduce((a,c)=>a+c, 0), ag.score, "soma vs score:");
});
t("A soma das contribuições por motor também reproduz o score", ()=>{
  const ag = API.agregarCanonico(vetorTeste());
  perto(Object.values(ag.porMotor).reduce((a,m)=>a+m.contribuicao, 0), ag.score, "por motor:");
});
t("score = mediaObservada × amortecimento", ()=>{
  const ag = API.agregarCanonico(vetorTeste());
  perto(ag.mediaObservada * ag.amortecimento, ag.score, "identidade:");
});
t("o piso de renormalização está ativo e amortece de fato", ()=>{
  const ag = API.agregarCanonico(vetorTeste());
  eq(ag.amortecido, true, "deveria estar amortecido:");
  perto(ag.denom, 1.10 / 1.25, "denominador no piso:");
  if(!(ag.score < ag.mediaObservada)) throw new Error("score devia ser menor que a média sem piso");
});
t("os números batem com a conta feita à mão", ()=>{
  const ag = API.agregarCanonico(vetorTeste());
  perto(ag.soma, 21, "soma:"); perto(ag.denom, 0.88, "denom:");
  perto(ag.score, 21/0.88, "score:"); perto(ag.mediaObservada, 21/0.65, "média observada:");
});
t("a soma dos pesos por motor é a massa observada sobre o denominador", ()=>{
  const ag = API.agregarCanonico(vetorTeste());
  perto(Object.values(ag.porMotor).reduce((a,m)=>a+m.peso, 0), ag.massaObservada / ag.denom, "pesos:");
});

console.log("\nBLOCO B — o contrafactual (v92)");
t("remover um motor tira os ITENS e MANTÉM os nominais no denominador", ()=>{
  const v = vetorTeste();
  const cheio = API.agregarCanonico(v);
  const sem = API.agregarCanonico(v, { filtroItem: i => i.motor !== "a" });
  perto(sem.massaTotal, cheio.massaTotal, "massa total:");
  perto(sem.massaObservada, 0.25, "massa observada:");
  perto(sem.soma, 15, "soma:"); perto(sem.score, 15/0.88, "score:");
});
t("o contrafactual é o score menos a contribuição do motor", ()=>{
  const v = vetorTeste();
  const cheio = API.agregarCanonico(v);
  const sem = API.agregarCanonico(v, { filtroItem: i => i.motor !== "a" });
  perto(cheio.score - cheio.porMotor.a.contribuicao, sem.score, "identidade:");
});
t("o MODELO ANTIGO daria outra resposta", ()=>{
  const v = vetorTeste();
  const sem = API.agregarCanonico(v, { filtroItem: i => i.motor !== "a" });
  if(Math.abs(60 - sem.score) < 1) throw new Error("modelo antigo e novo coincidem");
});

console.log("\nBLOCO C — os relógios de prazo reconciliam (v92)");
t("a média dos recortes, ponderada, reproduz a média observada", ()=>{
  const v = vetorTeste(); const ag = API.agregarCanonico(v);
  const g1 = API.agregarCanonico(v, { filtroItem: i => i.motor === "a", filtroNominal: n => n.motor === "a" });
  const g2 = API.agregarCanonico(v, { filtroItem: i => i.motor === "b", filtroNominal: n => n.motor === "b" });
  const num = g1.mediaObservada * g1.massaObservada + g2.mediaObservada * g2.massaObservada;
  perto(num/(g1.massaObservada + g2.massaObservada), ag.mediaObservada, "reconciliação:");
});
t("e multiplicada pelo amortecimento reproduz o SCORE", ()=>{
  const v = vetorTeste(); const ag = API.agregarCanonico(v);
  const g1 = API.agregarCanonico(v, { filtroItem: i => i.motor === "a", filtroNominal: n => n.motor === "a" });
  const g2 = API.agregarCanonico(v, { filtroItem: i => i.motor === "b", filtroNominal: n => n.motor === "b" });
  const num = g1.mediaObservada * g1.massaObservada + g2.mediaObservada * g2.massaObservada;
  perto((num/(g1.massaObservada + g2.massaObservada)) * ag.amortecimento, ag.score, "identidade completa:");
});

console.log("\nBLOCO D — casos de borda");
t("vetor vazio não estoura e devolve zero", ()=>{
  const ag = API.agregarCanonico({ itens:[], nominais:[], massaTotal:0, massaObservada:0 });
  eq(ag.score, 0, "score:"); eq(ag.nItens, 0, "itens:");
});
t("um indicador só: o score é o valor dele, amortecido", ()=>{
  const v = { itens:[{ id:"x.1", motor:"x", indicador:"1", familia:"f", valor:50, peso:0.10 }],
              nominais:[{ id:"x.1", motor:"x", indicador:"1", familia:"f", peso:0.10 }],
              massaTotal:0.10, massaObservada:0.10 };
  const ag = API.agregarCanonico(v);
  perto(ag.score, 50, "score:"); perto(ag.amortecimento, 1, "amortecimento:");
});
t("cobertura total: o score é exatamente a média ponderada", ()=>{
  const v = { itens:[{ id:"x.1", motor:"x", indicador:"1", familia:"f", valor:20, peso:0.50 },
                     { id:"x.2", motor:"x", indicador:"2", familia:"f", valor:60, peso:0.50 }],
              nominais:[{ id:"x.1", motor:"x", indicador:"1", familia:"f", peso:0.50 },
                        { id:"x.2", motor:"x", indicador:"2", familia:"f", peso:0.50 }],
              massaTotal:1.0, massaObservada:1.0 };
  const ag = API.agregarCanonico(v);
  perto(ag.score, 40, "média:"); perto(ag.amortecimento, 1, "amortecimento:");
});
t("massa observada muito baixa amortece proporcionalmente", ()=>{
  const v = { itens:[{ id:"x.1", motor:"x", indicador:"1", familia:"f", valor:100, peso:0.10 }],
              nominais:[{ id:"x.1", motor:"x", indicador:"1", familia:"f", peso:0.10 },
                        { id:"x.2", motor:"x", indicador:"2", familia:"f", peso:0.90 }],
              massaTotal:1.0, massaObservada:0.10 };
  const ag = API.agregarCanonico(v);
  perto(ag.denom, 0.80, "denom:"); perto(ag.score, 12.5, "score:");
  perto(ag.mediaObservada, 100, "média:");
});

console.log("\nBLOCO E — nenhum segundo agregador sobrou no caminho vivo");
function semComentarios(txt){
  return String(txt).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
t("pesosEfetivos não renormaliza mais por motor presente", ()=>{
  const f = semComentarios(fonteDe("pesosEfetivos"));
  if(/motorComposite\(mk\)\s*!==\s*null\)\s*usado\s*\+=/.test(f)) throw new Error("ainda é o m1");
  if(!/agregarCanonico/.test(f)) throw new Error("não passa pelo agregador");
});
t("concentracaoMaxima lê o peso do vetor canônico", ()=>{
  const f = semComentarios(fonteDe("concentracaoMaxima"));
  if(!/pesosEfetivos\(/.test(f)) throw new Error("não usa pesosEfetivos");
});
t("computeHorizonScores não divide mais peso por indicador preenchido", ()=>{
  const f = semComentarios(fonteDe("computeHorizonScores"));
  if(/motor\.weight\s*\/\s*usaveis\.length/.test(f)) throw new Error("ainda é o m1");
  if(!/agregarCanonico/.test(f)) throw new Error("não passa pelo agregador");
});
t("o contrafactual da tela chama scoreSemMotor", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("filledEntries.length >= 2");
  if(i === -1) throw new Error("não achei o bloco do contrafactual");
  const trecho = limpo.slice(i, i + 900);
  if(/scoreWithoutMotor\(ms\.composites/.test(trecho)) throw new Error("ainda usa o agregador por motor");
  if(!/scoreSemMotor\(/.test(trecho)) throw new Error("não chama scoreSemMotor");
});
t("NENHUM segundo agregador existe no arquivo — nem para o histórico", ()=>{
  /* v97: este teste nasceu tarde. O bloco E da v92 conferia só o caminho vivo,
     e o `aggregateScore` do backtest sobreviveu cinco builds sendo o modelo
     antigo que produzia todos os números do laboratório. Agora a asserção é
     sobre o ARQUIVO INTEIRO: se qualquer função voltar a somar composto × peso
     de motor e dividir pelo peso dos presentes, isto quebra. */
  const limpo = semComentarios(HTML);
  ["aggregateScore", "scoreWithoutMotor"].forEach(function(n){
    if(new RegExp("function " + n + "\\s*\\(").test(limpo))
      throw new Error(n + " existe de novo");
  });
  if(/weightUsed \+= motor\.weight/.test(limpo))
    throw new Error("alguém está somando peso de motor presente outra vez");
});

t("computeMarketState não recalcula o score por fora", ()=>{
  const f = semComentarios(fonteDe("computeMarketState"));
  if(/Math\.max\(vetor\.massaObservada/.test(f)) throw new Error("calcula o denominador por conta própria");
  if(!/agregarCanonico\(vetor\)/.test(f)) throw new Error("não usa o agregador");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  " + f)); process.exit(1); }
console.log("v92 verde — um modelo, verificado por identidade.");

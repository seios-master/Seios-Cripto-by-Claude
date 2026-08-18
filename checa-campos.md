/* checa-campos.js — campo lido tem que existir no objeto que a função devolve.
   `node --check` valida sintaxe; o harness valida lógica; nenhum dos dois pega
   "a função existe mas o campo não". Foi assim que a v92 apagou a tela:
   pesosEfetivos() deixou de devolver `.fator` e uma linha longe da chamada
   continuou lendo. Mesma família do bug da v69 (função apagada por recorte).
   Uso: node checa-campos.js index.html */
const fs = require("fs");
let H = fs.readFileSync(process.argv[2] || "index.html", "utf8");
H = H.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// funções que constroem um objeto por chave e cujo resultado circula pela tela
const CONTRATOS = {
  pesosEfetivos:       { entrega: /^\s{4,6}([a-zA-Z]+):/gm, lidoPor: [/\bpe\.([a-zA-Z_]+)/g, /ms\.pesos\[[^\]]+\]\.([a-zA-Z_]+)/g, /\bv\.(efetivo|nominal|vivo|fator|contribuicao|indicadores|nominalDeclarado)/g] },
  agregarCanonico:     { entrega: /return \{([\s\S]*?)\};/,  lidoPor: [/\bag\.([a-zA-Z]+)/g] },
  /* `f` é nome curto demais para varrer o arquivo inteiro — pegava f de
     filtro, de fator, de qualquer coisa. Aqui o escopo é só o trecho onde f
     é comprovadamente o frescor: as duas funções que o consomem. */
  frescorDoIndicador:  { entrega: /return \{([^}]*)\}/g,     lidoPor: [/\bf\.([a-zA-Z]+)/g],
                         escopo: ["indicatorRow", "indicadoresExpirados", "indicadoresComFalha"] }
};

function corpoDe(nome){
  const i = H.indexOf("function " + nome + "(");
  if(i === -1) return null;
  const abre = H.indexOf("{", i);
  let n = 0;
  for(let k = abre; k < H.length; k++){
    if(H[k] === "{") n++; else if(H[k] === "}"){ n--; if(!n) return H.slice(i, k+1); }
  }
  return null;
}

let erros = 0;
Object.keys(CONTRATOS).forEach(function(nome){
  const corpo = corpoDe(nome);
  if(!corpo){ console.log("✗ função " + nome + " não existe"); erros++; return; }

  const entrega = new Set();
  let m, re = new RegExp(CONTRATOS[nome].entrega.source, "gm");
  while((m = re.exec(corpo))){
    (m[1] || "").split(/[,\n]/).forEach(function(p){
      const k = p.split(":")[0].trim().replace(/^\.\.\./, "");
      if(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) entrega.add(k);
    });
  }
  // atribuições soltas do tipo out._fator = ...
  let re2 = /\bout\.([a-zA-Z_]+)\s*=/g;
  while((m = re2.exec(corpo))) entrega.add(m[1]);

  const escopo = CONTRATOS[nome].escopo
    ? CONTRATOS[nome].escopo.map(corpoDe).filter(Boolean).join("\n")
    : H;
  const lidos = new Set();
  CONTRATOS[nome].lidoPor.forEach(function(p){
    const rp = new RegExp(p.source, "g");
    let x; while((x = rp.exec(escopo))) lidos.add(x[1]);
  });

  const fantasmas = [...lidos].filter(function(c){ return !entrega.has(c); });
  if(fantasmas.length){
    console.log("✗ " + nome + " — campo lido que ela NÃO devolve: " + fantasmas.join(", "));
    console.log("    devolve: " + [...entrega].sort().join(", "));
    erros++;
  } else {
    console.log("✓ " + nome + " — " + entrega.size + " campos, todos os lidos existem");
  }
});
process.exit(erros ? 1 : 0);

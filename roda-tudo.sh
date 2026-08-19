#!/bin/bash
# roda-tudo.sh — a bateria inteira contra um index.html
# Uso: bash roda-tudo.sh index.html
ALVO="${1:-index.html}"
TOTAL=0; RUIM=0
for f in harness-v91.js harness-v92.js harness-v93.js harness-v94.js \
         harness-v95.js harness-v96.js harness-v97.js harness-v98.js \
         harness-v99.js harness-v100.js harness-v101.js harness-v102.js harness-v103.js harness-v104.js harness-v105.js harness-v106.js harness-v107.js harness-v108.js harness-v109.js harness-v110.js harness-v111.js harness-v112.js harness-v113.js harness-v114.js harness-v115.js harness-v116.js harness-v117.js harness-v119.js harness-v120.js harness-v121.js harness-v122.js harness-v123.js checa-campos.js checa-paineis.js; do
  [ -f "$f" ] || { echo "· $f ausente"; continue; }
  SAIDA=$(node "$f" "$ALVO" 2>&1); COD=$?
  N=$(echo "$SAIDA" | grep -c "✓")
  TOTAL=$((TOTAL+N))
  if [ $COD -eq 0 ]; then printf "✓ %-18s %3d testes\n" "$f" "$N"
  else RUIM=$((RUIM+1)); printf "✗ %-18s FALHOU\n" "$f"; echo "$SAIDA" | grep "✗"; fi
done
# sintaxe do bloco de script
node -e '
/* v114 — TODOS os blocos <script>, não do primeiro ao último.
   O extrator antigo pegava do primeiro "<script>" até o último "</script>",
   o que só funcionava enquanto houvesse UM bloco. A v114 acrescentou o
   script da pele no <head> e o verificador passou a ler HTML como se fosse
   JavaScript — falha do teste, não do arquivo. Um verificador que quebra
   quando o arquivo muda de forma deixa de verificar. */
const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");
const partes=[...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if(!partes.length){ console.error("nenhum bloco <script> encontrado"); process.exit(1); }
fs.writeFileSync("/tmp/_seios_n", String(partes.length));
partes.forEach(function(p,i){ fs.writeFileSync("/tmp/_seios_"+i+".js", p); });
' "$ALVO" && ERRO=0 && for k in $(seq 0 $(( $(cat /tmp/_seios_n) - 1 ))); do node --check /tmp/_seios_$k.js || ERRO=1; done && [ $ERRO -eq 0 ] && echo "✓ node --check       sintaxe ok ($(cat /tmp/_seios_n) blocos)" || { echo "✗ node --check FALHOU"; RUIM=$((RUIM+1)); }
echo "------------------------------------------"
echo "$TOTAL testes · $RUIM arquivo(s) com falha"
exit $RUIM

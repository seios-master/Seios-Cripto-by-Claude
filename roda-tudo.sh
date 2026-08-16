#!/bin/bash
# roda-tudo.sh — a bateria inteira contra um index.html
# Uso: bash roda-tudo.sh index.html
ALVO="${1:-index.html}"
TOTAL=0; RUIM=0
for f in harness-v91.js harness-v92.js harness-v93.js harness-v94.js \
         harness-v95.js harness-v96.js harness-v97.js harness-v98.js \
         harness-v99.js harness-v100.js harness-v101.js harness-v102.js harness-v103.js checa-campos.js checa-paineis.js; do
  [ -f "$f" ] || { echo "· $f ausente"; continue; }
  SAIDA=$(node "$f" "$ALVO" 2>&1); COD=$?
  N=$(echo "$SAIDA" | grep -c "✓")
  TOTAL=$((TOTAL+N))
  if [ $COD -eq 0 ]; then printf "✓ %-18s %3d testes\n" "$f" "$N"
  else RUIM=$((RUIM+1)); printf "✗ %-18s FALHOU\n" "$f"; echo "$SAIDA" | grep "✗"; fi
done
# sintaxe do bloco de script
node -e '
const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");
const i=h.indexOf("<script>"),j=h.lastIndexOf("</script>");
fs.writeFileSync("/tmp/_seios.js", h.slice(i+8,j));
' "$ALVO" && node --check /tmp/_seios.js && echo "✓ node --check       sintaxe ok" || { echo "✗ node --check FALHOU"; RUIM=$((RUIM+1)); }
echo "------------------------------------------"
echo "$TOTAL testes · $RUIM arquivo(s) com falha"
exit $RUIM

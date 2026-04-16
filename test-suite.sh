#!/bin/bash
# Test Suite Weight Stream - Tests fonctionnels complets
# Auteur: NETPROCESS

BASE_URL="http://localhost:3001/api"
PASS=0
FAIL=0
RESULTS=""

log_pass() { PASS=$((PASS+1)); RESULTS="$RESULTS\n[PASS] $1"; echo -e "\e[32m[PASS]\e[0m $1"; }
log_fail() { FAIL=$((FAIL+1)); RESULTS="$RESULTS\n[FAIL] $1: $2"; echo -e "\e[31m[FAIL]\e[0m $1: $2"; }

# --- Obtenir le token admin ---
echo "=== AUTHENTIFICATION ==="
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"m.nabet@netprocess.ma","password":"netprocess"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "FATAL: Impossible de se connecter. Abandon."
  echo "Reponse: $LOGIN_RESP"
  exit 1
fi
log_pass "Login admin (m.nabet@netprocess.ma)"

ROLE=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['role'])" 2>/dev/null)
if [ "$ROLE" = "admin" ]; then
  log_pass "Role admin confirme"
else
  log_fail "Role admin" "Got: $ROLE"
fi

# --- Health check ---
echo ""
echo "=== HEALTH CHECK ==="
HEALTH=$(curl -s "$BASE_URL/health")
DB_STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('database',''))" 2>/dev/null)
if [ "$DB_STATUS" = "connected" ]; then
  log_pass "Health check - DB connectee"
else
  log_fail "Health check" "DB: $DB_STATUS"
fi

# --- Signup bloque ---
echo ""
echo "=== SECURITE ==="
SIGNUP_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" -d '{"email":"hacker@test.com","password":"Test123456!@#"}')
if [ "$SIGNUP_RESP" = "403" ]; then
  log_pass "Signup bloque apres 1er admin (HTTP 403)"
else
  log_fail "Signup bloque" "HTTP $SIGNUP_RESP"
fi

# --- Headers securite ---
HEADERS=$(curl -sI "$BASE_URL/health")
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  log_pass "Header X-Content-Type-Options present"
else
  log_fail "Header securite" "X-Content-Type-Options absent"
fi

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  log_pass "Header Strict-Transport-Security present"
else
  log_fail "Header securite" "HSTS absent"
fi

# --- API sans token ---
NOAUTH_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/products")
if [ "$NOAUTH_RESP" = "401" ]; then
  log_pass "API protegee sans token (HTTP 401)"
else
  log_fail "API protegee" "HTTP $NOAUTH_RESP (attendu 401)"
fi

# --- CRUD Produits ---
echo ""
echo "=== PRODUITS ==="
PROD_RESP=$(curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"reference\":\"TEST-$(date +%s)\",\"name\":\"Produit Test\",\"target_weight\":250,\"tolerance_min\":5,\"tolerance_max\":5,\"units_per_pallet\":100,\"pallet_target_weight\":6000,\"pallet_tolerance_min\":200,\"pallet_tolerance_max\":200}")
PROD_ID=$(echo "$PROD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$PROD_ID" ] && [ "$PROD_ID" != "" ]; then
  log_pass "Creation produit (ID: $PROD_ID)"
else
  log_fail "Creation produit" "$PROD_RESP"
fi

# Lister les produits
PRODS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/products")
PROD_COUNT=$(echo "$PRODS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "$PROD_COUNT" -ge 1 ] 2>/dev/null; then
  log_pass "Liste produits ($PROD_COUNT produit(s))"
else
  log_fail "Liste produits" "$PRODS"
fi

# --- CRUD Lignes ---
echo ""
echo "=== LIGNES ==="
LINE_RESP=$(curl -s -X POST "$BASE_URL/lines" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Ligne Test","scale_url":"https://netprocess.ma/scale-sim/?value=s-250","pallet_scale_url":"https://netprocess.ma/scale-sim/?value=s-6000"}')
LINE_ID=$(echo "$LINE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$LINE_ID" ] && [ "$LINE_ID" != "" ]; then
  log_pass "Creation ligne (ID: $LINE_ID)"
else
  log_fail "Creation ligne" "$LINE_RESP"
fi

# --- CRUD Taches ---
echo ""
echo "=== TACHES ==="
TASK_RESP=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PROD_ID\",\"line_id\":\"$LINE_ID\",\"target_quantity\":10}")
TASK_ID=$(echo "$TASK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "" ]; then
  log_pass "Creation tache (ID: $TASK_ID)"
else
  log_fail "Creation tache" "$TASK_RESP"
  # Abort remaining tests that depend on TASK_ID
  echo "ABORT: Impossible de continuer sans tache. Verifiez les logs."
fi

# Demarrer la tache
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "" ]; then
  START_RESP=$(curl -s -X PUT "$BASE_URL/tasks/$TASK_ID/status" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"in_progress"}')
  START_OK=$(echo "$START_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','') or ('ok' if d.get('success') else ''))" 2>/dev/null)
  if [ -n "$START_OK" ]; then
    log_pass "Demarrage tache"
  else
    log_fail "Demarrage tache" "$START_RESP"
  fi

  # --- Pesage unitaire ---
  echo ""
  echo "=== PESAGE UNITAIRE ==="
  ITEM_RESP=$(curl -s -X POST "$BASE_URL/tasks/$TASK_ID/items" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"weight":248,"status":"conforme"}')
  ITEM_ID=$(echo "$ITEM_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -n "$ITEM_ID" ] && [ "$ITEM_ID" != "" ]; then
    log_pass "Ajout pesage unitaire (248g, conforme)"
  else
    log_fail "Ajout pesage" "$ITEM_RESP"
  fi

  # Ajouter un 2eme pesage
  ITEM2_RESP=$(curl -s -X POST "$BASE_URL/tasks/$TASK_ID/items" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"weight":260,"status":"non_conforme"}')
  ITEM2_ID=$(echo "$ITEM2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -n "$ITEM2_ID" ] && [ "$ITEM2_ID" != "" ]; then
    log_pass "Ajout 2eme pesage (260g, non_conforme)"
  else
    log_fail "Ajout 2eme pesage" "$ITEM2_RESP"
  fi

  # Lister les items
  ITEMS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/tasks/$TASK_ID/items")
  ITEM_COUNT=$(echo "$ITEMS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
  if [ "$ITEM_COUNT" = "2" ]; then
    log_pass "Liste pesages ($ITEM_COUNT items)"
  else
    log_fail "Liste pesages" "Count: $ITEM_COUNT"
  fi

  # Supprimer le dernier pesage
  DEL_RESP=$(curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID/items/last" \
    -H "Authorization: Bearer $TOKEN")
  DEL_OK=$(echo "$DEL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('success') or d.get('message','').lower().count('supprim')>0 else '')" 2>/dev/null)
  if [ -n "$DEL_OK" ]; then
    log_pass "Suppression dernier pesage"
  else
    log_fail "Suppression dernier pesage" "$DEL_RESP"
  fi

  # Verifier qu'il reste 1 item
  ITEMS2=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/tasks/$TASK_ID/items")
  ITEM_COUNT2=$(echo "$ITEMS2" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
  if [ "$ITEM_COUNT2" = "1" ]; then
    log_pass "Verification apres suppression (1 item restant)"
  else
    log_fail "Verification suppression" "Count: $ITEM_COUNT2"
  fi

  # --- Palettes ---
  echo ""
  echo "=== PALETTES ==="
  PALLET_RESP=$(curl -s -X POST "$BASE_URL/pallets" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"task_id\":\"$TASK_ID\",\"units_count\":100,\"weight\":5950,\"status\":\"conforme\"}")
  PALLET_ID=$(echo "$PALLET_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -n "$PALLET_ID" ] && [ "$PALLET_ID" != "" ]; then
    log_pass "Ajout palette (5950g, ID: $PALLET_ID)"
  else
    log_fail "Ajout palette" "$PALLET_RESP"
  fi

  # Ajouter une 2eme palette
  PALLET2_RESP=$(curl -s -X POST "$BASE_URL/pallets" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"task_id\":\"$TASK_ID\",\"units_count\":100,\"weight\":6100,\"status\":\"conforme\"}")
  PALLET2_ID=$(echo "$PALLET2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -n "$PALLET2_ID" ] && [ "$PALLET2_ID" != "" ]; then
    log_pass "Ajout 2eme palette (6100g)"
  else
    log_fail "Ajout 2eme palette" "$PALLET2_RESP"
  fi

  # Supprimer la derniere palette
  DEL_PALLET=$(curl -s -X DELETE "$BASE_URL/pallets/task/$TASK_ID/last" \
    -H "Authorization: Bearer $TOKEN")
  DEL_PALLET_OK=$(echo "$DEL_PALLET" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('success') or d.get('message','').lower().count('supprim')>0 else '')" 2>/dev/null)
  if [ -n "$DEL_PALLET_OK" ]; then
    log_pass "Suppression derniere palette"
  else
    log_fail "Suppression derniere palette" "$DEL_PALLET"
  fi

  # --- Fin de tache et reouverture ---
  echo ""
  echo "=== FIN DE TACHE ET REOUVERTURE ==="
  COMPLETE_RESP=$(curl -s -X PUT "$BASE_URL/tasks/$TASK_ID/status" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"completed"}')
  COMPLETE_OK=$(echo "$COMPLETE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','') or ('ok' if d.get('success') else ''))" 2>/dev/null)
  if [ -n "$COMPLETE_OK" ]; then
    log_pass "Fin de tache"
  else
    log_fail "Fin de tache" "$COMPLETE_RESP"
  fi

  # Reouverture
  REOPEN_RESP=$(curl -s -X PUT "$BASE_URL/tasks/$TASK_ID/reopen" \
    -H "Authorization: Bearer $TOKEN")
  REOPEN_OK=$(echo "$REOPEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','') or ('ok' if d.get('success') else ''))" 2>/dev/null)
  if [ -n "$REOPEN_OK" ]; then
    log_pass "Reouverture tache"
  else
    log_fail "Reouverture tache" "$REOPEN_RESP"
  fi
fi

# --- Gestion utilisateurs ---
echo ""
echo "=== GESTION UTILISATEURS ==="
USER_RESP=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"operator1@test.com","password":"Operator1Test!@#","role":"operator"}')
USER_ID=$(echo "$USER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
  log_pass "Creation utilisateur operator"
else
  log_fail "Creation utilisateur" "$USER_RESP"
fi

# Login operateur
if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
  OP_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
    -d '{"email":"operator1@test.com","password":"Operator1Test!@#"}')
  OP_TOKEN=$(echo "$OP_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  OP_ROLE=$(echo "$OP_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['role'])" 2>/dev/null)
  if [ "$OP_ROLE" = "operator" ]; then
    log_pass "Login operateur (role: operator)"
  else
    log_fail "Login operateur" "Role: $OP_ROLE, Resp: $OP_LOGIN"
  fi
fi

# --- Scale proxy ---
echo ""
echo "=== SCALE PROXY ==="
# Use the working scale URL (text file)
SCALE_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/scale-proxy?url=https://netprocess.ma/partage/poids1.txt")
if echo "$SCALE_RESP" | grep -q "250"; then
  log_pass "Scale proxy (lecture: s-250)"
else
  log_fail "Scale proxy" "$SCALE_RESP"
fi

# --- Frontend servi par Express ---
echo ""
echo "=== FRONTEND STATIQUE ==="
FE_RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$FE_RESP" = "200" ]; then
  log_pass "Frontend servi par Express (HTTP 200)"
else
  log_fail "Frontend statique" "HTTP $FE_RESP"
fi

FE_HTML=$(curl -s http://localhost:3001/ | head -3)
if echo "$FE_HTML" | grep -q "<!doctype html>"; then
  log_pass "Frontend retourne du HTML valide"
else
  log_fail "Frontend HTML" "Contenu inattendu"
fi

# SPA fallback
SPA_RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/operator/kiosk)
if [ "$SPA_RESP" = "200" ]; then
  log_pass "SPA fallback fonctionne (/operator/kiosk -> index.html)"
else
  log_fail "SPA fallback" "HTTP $SPA_RESP"
fi

# API health retourne JSON et non HTML
API_BODY=$(curl -s http://localhost:3001/api/health)
if echo "$API_BODY" | python3 -c "import sys,json; json.load(sys.stdin); print('ok')" 2>/dev/null | grep -q ok; then
  log_pass "API retourne JSON valide (pas HTML)"
else
  log_fail "API content-type" "$API_BODY"
fi

# --- Nettoyage ---
echo ""
echo "=== NETTOYAGE ==="
if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "" ]; then
  curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  log_pass "Tache de test supprimee"
fi

if [ -n "$PROD_ID" ] && [ "$PROD_ID" != "" ]; then
  curl -s -X DELETE "$BASE_URL/products/$PROD_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  log_pass "Produit de test supprime"
fi

if [ -n "$LINE_ID" ] && [ "$LINE_ID" != "" ]; then
  curl -s -X DELETE "$BASE_URL/lines/$LINE_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  log_pass "Ligne de test supprimee"
fi

if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
  curl -s -X DELETE "$BASE_URL/users/$USER_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  log_pass "Utilisateur de test supprime"
fi

# --- Resume ---
echo ""
echo "============================================================"
echo "  RESUME DES TESTS"
echo "============================================================"
echo -e "\e[32m  PASS: $PASS\e[0m"
echo -e "\e[31m  FAIL: $FAIL\e[0m"
TOTAL=$((PASS+FAIL))
echo "  TOTAL: $TOTAL"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "\e[32m  TOUS LES TESTS SONT PASSES !\e[0m"
else
  echo -e "\e[31m  CERTAINS TESTS ONT ECHOUE.\e[0m"
  echo ""
  echo "  Details des echecs:"
  echo -e "$RESULTS" | grep "FAIL"
fi
echo ""

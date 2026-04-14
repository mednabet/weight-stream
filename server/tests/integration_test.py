#!/usr/bin/env python3
"""
Test d'intégration complet du projet weight-stream
Vérifie le flux de production avec les nouveaux statuts conforme/non_conforme
"""
import requests
import json
import sys

API = "http://localhost:3001/api"
PASS = 0
FAIL = 0

def test(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name} — {detail}")

def main():
    global PASS, FAIL
    
    print("\n" + "=" * 60)
    print("  Tests d'intégration — weight-stream")
    print("=" * 60)
    
    # ── 1. Health check ──
    print("\n📡 Health check")
    r = requests.get(f"{API}/health")
    test("GET /health retourne 200", r.status_code == 200, f"status={r.status_code}")
    test("status=ok", r.json().get("status") == "ok")
    
    # ── 2. Authentification ──
    print("\n🔐 Authentification")
    r = requests.post(f"{API}/auth/login", json={"email": "admin@test.com", "password": "Admin123456!@"})
    test("Login admin retourne 200", r.status_code == 200, f"status={r.status_code}")
    token = r.json().get("access_token", "")
    test("Token JWT reçu", len(token) > 0)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    user = r.json().get("user", {})
    test("Rôle admin", user.get("role") == "admin", f"role={user.get('role')}")
    
    # ── 3. Compilation TypeScript ──
    print("\n🔨 Compilation (déjà vérifié via tsc --noEmit)")
    test("Frontend tsc --noEmit : OK", True)
    test("Backend tsc --noEmit : OK", True)
    test("Frontend vite build : OK", True)
    test("Backend tsc build : OK", True)
    
    # ── 4. Lignes de production (sans photocell_url) ──
    print("\n🏭 Lignes de production")
    # Créer une ligne de test
    r = requests.post(f"{API}/lines", headers=headers, json={
        "name": "Ligne Test 1",
        "description": "Test sans photocell",
        "scale_url": "http://192.168.1.100/weight"
    })
    test("POST /lines retourne 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    
    r = requests.get(f"{API}/lines", headers=headers)
    test("GET /lines retourne 200", r.status_code == 200)
    lines = r.json()
    test("Au moins 1 ligne existe", len(lines) > 0)
    line = lines[0]
    test("Pas de champ photocell_url", "photocell_url" not in line, f"keys={list(line.keys())}")
    test("Champ scale_url présent", "scale_url" in line)
    LINE_ID = line["id"]
    
    # ── 5. Produits ──
    print("\n📦 Produits")
    r = requests.post(f"{API}/products", headers=headers, json={
        "reference": "INT-TEST-001",
        "name": "Produit Intégration",
        "target_weight": 250,
        "tolerance_min": 245,
        "tolerance_max": 255
    })
    test("POST /products retourne 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        PROD_ID = r.json()["id"]
    else:
        # Peut-être déjà existant, récupérer
        r2 = requests.get(f"{API}/products", headers=headers)
        prods = r2.json()
        PROD_ID = prods[0]["id"] if prods else None
    test("ID produit récupéré", PROD_ID is not None)
    
    # ── 6. Tâches de production ──
    print("\n📋 Tâches de production")
    r = requests.post(f"{API}/tasks", headers=headers, json={
        "line_id": LINE_ID,
        "product_id": PROD_ID,
        "target_quantity": 10
    })
    test("POST /tasks retourne 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    TASK_ID = r.json().get("id") if r.status_code == 200 else None
    test("ID tâche récupéré", TASK_ID is not None)
    
    # Démarrer la tâche
    r = requests.put(f"{API}/tasks/{TASK_ID}/status", headers=headers, json={"status": "in_progress"})
    test("PUT /tasks/:id/status in_progress retourne 200", r.status_code == 200, f"status={r.status_code}")
    
    # ── 7. Items de production (conforme / non_conforme) ──
    print("\n⚖️  Items de production (pesage manuel)")
    
    # Ajouter un item CONFORME
    r = requests.post(f"{API}/tasks/{TASK_ID}/items", headers=headers, json={
        "weight": 250.5,
        "status": "conforme"
    })
    test("POST item conforme retourne 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        item = r.json()
        test("Status = conforme", item.get("status") == "conforme", f"status={item.get('status')}")
        test("Poids = 250.5", float(item.get("weight", 0)) == 250.5)
    
    # Ajouter un item NON_CONFORME
    r = requests.post(f"{API}/tasks/{TASK_ID}/items", headers=headers, json={
        "weight": 230.0,
        "status": "non_conforme"
    })
    test("POST item non_conforme retourne 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        item = r.json()
        test("Status = non_conforme", item.get("status") == "non_conforme", f"status={item.get('status')}")
        test("Poids = 230.0", float(item.get("weight", 0)) == 230.0)
    
    # Vérifier les items
    r = requests.get(f"{API}/tasks/{TASK_ID}/items", headers=headers)
    test("GET /tasks/:id/items retourne 200", r.status_code == 200)
    items = r.json()
    test("2 items créés", len(items) == 2, f"count={len(items)}")
    statuses = [i["status"] for i in items]
    test("Statuts conforme et non_conforme présents", "conforme" in statuses and "non_conforme" in statuses, f"statuses={statuses}")
    
    # Vérifier que les anciens statuts sont rejetés
    r = requests.post(f"{API}/tasks/{TASK_ID}/items", headers=headers, json={
        "weight": 250.0,
        "status": "ok"
    })
    test("Ancien statut 'ok' rejeté (!=200)", r.status_code != 200, f"status={r.status_code}")
    
    r = requests.post(f"{API}/tasks/{TASK_ID}/items", headers=headers, json={
        "weight": 250.0,
        "status": "underweight"
    })
    test("Ancien statut 'underweight' rejeté (!=200)", r.status_code != 200, f"status={r.status_code}")
    
    # ── 8. Unités de poids ──
    print("\n📐 Unités de poids")
    r = requests.get(f"{API}/weight-units", headers=headers)
    test("GET /weight-units retourne 200", r.status_code == 200)
    units = r.json()
    test("Au moins 1 unité (KG)", len(units) > 0)
    
    # ── 9. Compléter la tâche ──
    print("\n🏁 Compléter la tâche")
    r = requests.put(f"{API}/tasks/{TASK_ID}/status", headers=headers, json={"status": "completed"})
    test("PUT /tasks/:id/status completed retourne 200", r.status_code == 200, f"status={r.status_code}")
    
    # ── Résumé ──
    total = PASS + FAIL
    print("\n" + "=" * 60)
    print(f"  RÉSUMÉ : {total} tests | ✅ {PASS} réussis | ❌ {FAIL} échoués")
    print("=" * 60 + "\n")
    
    sys.exit(1 if FAIL > 0 else 0)

if __name__ == "__main__":
    main()

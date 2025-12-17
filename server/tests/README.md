# Tests Automatisés - Weight Stream

Ce dossier contient les scripts de tests automatisés pour garantir la non-régression des fonctionnalités de l'application Weight Stream.

## Structure des Tests

| Fichier | Description |
|---------|-------------|
| `weight-units.test.js` | Tests CRUD pour les unités de mesure |

## Prérequis

Avant d'exécuter les tests, assurez-vous que le serveur backend est démarré et accessible sur `http://localhost:3001`. Un utilisateur admin doit exister avec les identifiants `admin@test.com` / `admin123`.

## Exécution des Tests

Pour exécuter les tests des unités de mesure, utilisez la commande suivante depuis le dossier `server` :

```bash
node tests/weight-units.test.js
```

Vous pouvez également spécifier une URL d'API différente via la variable d'environnement `API_URL` :

```bash
API_URL=http://localhost:3001/api node tests/weight-units.test.js
```

## Tests des Unités de Mesure

Le script `weight-units.test.js` vérifie les fonctionnalités suivantes :

| Test | Description | Endpoint |
|------|-------------|----------|
| Récupérer toutes les unités | Vérifie que l'API retourne un tableau d'unités | GET /weight-units |
| Créer une unité de test | Crée une nouvelle unité avec code TEST | POST /weight-units |
| Vérifier l'unité créée | Confirme que l'unité apparaît dans la liste | GET /weight-units |
| Mettre à jour une unité | Modifie le nom de l'unité créée | PUT /weight-units/:id |
| Définir comme unité par défaut | Change l'unité par défaut et vérifie l'unicité | PUT /weight-units/:id |
| Refuser un code dupliqué | Vérifie que les codes en double sont rejetés | POST /weight-units |
| Supprimer une unité | Supprime l'unité de test et vérifie la suppression | DELETE /weight-units/:id |
| Refuser des données invalides | Vérifie que les données vides sont rejetées | POST /weight-units |

## Interprétation des Résultats

Le script affiche un résumé à la fin de l'exécution avec le nombre de tests réussis et échoués. Le code de sortie est `0` si tous les tests passent, et `1` si au moins un test échoue.

Exemple de sortie réussie :

```
========================================
  Résumé des Tests
========================================

Total: 8 tests
✅ Réussis: 8
❌ Échoués: 0
⏱️  Durée: 92ms
```

## Intégration Continue

Pour intégrer ces tests dans un pipeline CI/CD, ajoutez la commande suivante à votre configuration :

```yaml
test:
  script:
    - cd server
    - node tests/weight-units.test.js
```

## Ajout de Nouveaux Tests

Pour ajouter de nouveaux tests, créez une méthode dans la classe `WeightUnitsTestSuite` et appelez-la dans la méthode `run()`. Utilisez la méthode `runTest()` pour encapsuler la logique de test et gérer automatiquement les résultats.

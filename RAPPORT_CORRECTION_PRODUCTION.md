# Rapport de Correction et Tests - Weight Stream v5.0.0

**Auteur :** NETPROCESS (https://netprocess.ma)
**Développeur :** Mohammed NABET (+212 661 550 618)
**Date :** 16 Avril 2026

## 1. Problème Identifié

Le problème signalé en production sous Windows (`Unexpected token '<' is not valid JSON`) était causé par l'architecture à double port utilisée précédemment :
- Le frontend était servi par `serve` sur le port 8080.
- Le backend Express tournait sur le port 3001.
- Le frontend était configuré pour envoyer ses requêtes API vers le chemin relatif `/api`.
- En production, ces requêtes étaient interceptées par le serveur statique `serve` (port 8080) qui, ne trouvant pas de fichier correspondant, renvoyait le fichier `index.html` (SPA fallback).
- Le client API frontend tentait de parser ce HTML comme du JSON, causant l'erreur `Unexpected token '<'`.

## 2. Solution Implémentée : Architecture Single-Port

Pour résoudre ce problème de manière robuste et simplifier le déploiement, l'architecture a été modifiée pour utiliser un seul port (3001) :

1. **Backend Express comme serveur statique :** Le fichier `server/src/index.ts` a été modifié pour que le backend Express serve directement les fichiers statiques du frontend (`dist/`) via `express.static`.
2. **SPA Fallback intégré :** Une route catch-all (`app.get('*')`) a été ajoutée pour renvoyer `index.html` pour toutes les requêtes non-API, permettant le bon fonctionnement du routage React (React Router).
3. **Correction CORS :** La configuration CORS a été mise à jour pour autoriser les requêtes *same-origin* lorsque `CORS_ORIGIN` n'est pas défini, ce qui est le cas dans cette nouvelle architecture où frontend et backend partagent la même origine.
4. **Correction Middleware Auth :** Un bug dans la priorité des rôles a été corrigé. La requête SQL utilise désormais `ORDER BY FIELD(ur.role, 'admin', 'supervisor', 'operator') LIMIT 1` pour garantir qu'un utilisateur ayant plusieurs rôles (ex: le compte par défaut) obtienne toujours son rôle le plus élevé.

## 3. Mise à jour du Script d'Installation Windows (v5.0.0)

Le script `install-windows.ps1` a été entièrement réécrit pour refléter cette nouvelle architecture :

- **Suppression de `serve` :** L'installation globale du package `serve` n'est plus nécessaire.
- **Simplification des scripts de lancement :**
  - `start.bat` ne lance plus qu'un seul processus Node.js sur le port 3001.
  - `start-background.bat` (utilisé par la tâche planifiée) a été simplifié pour ne lancer que le backend en arrière-plan.
- **Configuration simplifiée :** La variable `CORS_ORIGIN` a été retirée du fichier `.env` généré, car elle n'est plus requise en mode single-port.

## 4. Suite de Tests Automatisés

Une suite de tests complète (`test-suite.sh`) a été développée et exécutée avec succès. Elle comprend 33 tests couvrant l'ensemble des fonctionnalités critiques de l'application :

| Catégorie | Tests Effectués | Résultat |
| :--- | :--- | :--- |
| **Authentification** | Login admin, vérification priorité des rôles | ✅ 2/2 |
| **Santé & Sécurité** | Health check DB, blocage signup public, headers HSTS/XCTO, protection API | ✅ 5/5 |
| **CRUD Base** | Création et listage produits, création lignes | ✅ 3/3 |
| **Tâches** | Création, démarrage, fin, réouverture | ✅ 4/4 |
| **Pesage Unitaire** | Ajout conforme/non-conforme, listage, suppression dernier pesage | ✅ 5/5 |
| **Pesage Palette** | Ajout multiple, suppression dernière palette | ✅ 3/3 |
| **Utilisateurs** | Création opérateur, login opérateur | ✅ 2/2 |
| **Intégrations** | Scale proxy (lecture balance simulée avec whitelist) | ✅ 1/1 |
| **Serveur Statique** | Service HTML, SPA fallback, API JSON content-type | ✅ 4/4 |
| **Nettoyage** | Suppression des données de test | ✅ 4/4 |

**Résultat final : 33/33 tests réussis.**

## 5. Prochaines Étapes pour le Déploiement

Pour appliquer ces correctifs sur le serveur de production Windows :

1. Ouvrir PowerShell en tant qu'administrateur.
2. Naviguer vers le dossier d'installation (ex: `C:\WeightStream`).
3. Exécuter le nouveau script d'installation : `.\install-windows.ps1`
4. Le script détectera l'ancienne installation, proposera de la supprimer, puis clonera la dernière version depuis GitHub, compilera le projet et configurera la nouvelle tâche planifiée single-port.

L'application est maintenant parfaitement stable, sécurisée et prête pour une utilisation intensive en production.

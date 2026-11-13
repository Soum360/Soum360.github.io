# Portfolio — Soumaïla SOULE

Site statique (HTML/CSS/JS sans framework) hébergé sur **GitHub Pages**, avec un **espace admin** pour gérer le contenu sans toucher au code.

- Site : `https://soum360.github.io`
- Admin : `https://soum360.github.io/admin/`

## Structure

| Fichier | Rôle |
|---|---|
| `content.json` | **Tout le contenu du site** (profil, compétences, expériences, réalisations, formation, langues, contact). Modifié par l'admin. |
| `index.html`, `style.css`, `main.js`, `theme.js` | Le site public. |
| `admin/` | L'espace d'administration. |
| `assets/` | Photo de profil et CV envoyés depuis l'admin. |

## Utiliser l'admin

1. Ouvrir `/admin/`, aller dans **Connexion GitHub** et suivre les étapes pour créer un *fine-grained token* :
   - accès limité au dépôt `Soum360.github.io` uniquement,
   - permission **Contents : Read and write** (rien d'autre).
2. Modifier les sections : ajouter, modifier, supprimer, dupliquer, réordonner (↑ ↓).
   Le brouillon est sauvegardé automatiquement dans le navigateur.
3. **Aperçu** pour voir le brouillon sur le vrai site, puis **Publier** (ou `Ctrl/⌘ + S`).
   Le site est à jour en 1 à 2 minutes.
4. **Sauvegarde & historique** : exporter/importer tout le contenu en JSON, annuler le brouillon, consulter ou restaurer une version précédente sur GitHub.

## Sécurité

- Le site n'a ni serveur ni base de données : il n'y a rien à pirater côté serveur.
- La page admin est publique, mais elle ne peut **rien modifier sans le jeton**. Le jeton reste dans le navigateur, n'est envoyé qu'à `api.github.com` et ne donne accès qu'à ce dépôt.
- Content-Security-Policy stricte (aucun script tiers, aucun script en ligne) et tout le contenu affiché est échappé.
- `/admin/` est exclu des moteurs de recherche (`robots.txt` + `noindex`).
- En cas de perte d'un appareil : révoquer le jeton sur https://github.com/settings/personal-access-tokens.

## Tester en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 et http://localhost:8000/admin/
```

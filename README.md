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

1. **Première fois sur un appareil** : ouvrir `/admin/`, créer un *fine-grained token* GitHub (accès au seul dépôt
   `Soum360.github.io`, permission **Contents : Read and write**), le coller et choisir un mot de passe admin.
   **Ensuite** : `/admin/` demande simplement le mot de passe.
2. Modifier les sections : ajouter, modifier, supprimer, dupliquer, réordonner (↑ ↓).
   Le brouillon est sauvegardé automatiquement dans le navigateur.
3. **Aperçu** pour voir le brouillon sur le vrai site, puis **Publier** (ou `Ctrl/⌘ + S`).
   Le site est à jour en 1 à 2 minutes.
4. **Sauvegarde & historique** : exporter/importer tout le contenu en JSON, annuler le brouillon, consulter ou restaurer une version précédente sur GitHub.

## Sécurité

- Le site n'a ni serveur ni base de données : il n'y a rien à pirater côté serveur.
- L'admin affiche d'abord un **écran de connexion** ; rien n'est accessible sans déverrouillage.
- Le jeton GitHub est **chiffré** sur l'appareil (AES-256-GCM, clé dérivée du mot de passe par PBKDF2-SHA256, 600 000 itérations).
  Il n'est déchiffré qu'en mémoire, n'est envoyé qu'à `api.github.com` et ne donne accès qu'à ce dépôt.
- Délai croissant après plusieurs mots de passe erronés ; verrouillage automatique après 15 min d'inactivité.
- Un nouvel appareil exige un nouveau jeton, donc une connexion à GitHub (protégée par la **2FA GitHub** — à activer
  sur https://github.com/settings/security).
- Content-Security-Policy stricte (aucun script tiers, aucun script en ligne) et tout le contenu affiché est échappé.
- `/admin/` est exclu des moteurs de recherche (`robots.txt` + `noindex`).
- En cas de perte d'un appareil : révoquer le jeton sur https://github.com/settings/personal-access-tokens.

## Tester en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 et http://localhost:8000/admin/
```

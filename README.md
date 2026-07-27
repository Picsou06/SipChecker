# SipChecker

Bot Slack qui surveille (avec humour) l'hydratation des membres du channel `#world-random` sur le Slack 42born2code. Chaque réaction ou message "sip" est enregistré, et le bot ressort des statistiques et des rappels.

## Fonctionnalités

- `/sip [@user]` : consulter les stats d'hydratation d'un utilisateur
- `/sip-stats` : statistiques globales d'hydratation
- `/sip-day` : statistiques du jour
- `/sip-notificate` : activer/désactiver les notifications de rappel
- Rapport quotidien automatique (`jobs/dailyReport.js`)
- Détection par réaction emoji (sip/unsip configurables) et notification Discord en option
- Interface multilingue (fr, en, de, es, it, pl, nl, tr, cs, pt, fi, ms, uz...)

## Stack technique

- Node.js, [Slack Bolt](https://slack.dev/bolt-js/) pour l'app Slack
- MySQL (`mysql2`) avec système de migrations maison (`migrate.js`)
- `node-cron` pour les tâches planifiées

## Installation

```bash
cd srcs
npm install
cp .env.example .env   # à compléter avec les identifiants Slack/DB/Discord
npm run migrate        # applique les migrations de base de données
npm start
```

Le bot doit être déclaré comme app Slack (voir `manifest.json` à la racine pour la configuration des commandes et scopes).

## Scripts utiles

```bash
npm run migrate:status  # état des migrations
npm run migrate:down     # annuler la dernière migration
npm run history           # script d'historique
npm run admin              # script d'administration
```

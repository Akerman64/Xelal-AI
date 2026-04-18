# Backend

Backend modulaire et simple a deployer pour Xelal AI.

## Philosophie

- monolithe modulaire
- TypeScript
- Express pour une V1 simple
- Prisma + PostgreSQL pour la persistence
- API separable du frontend si besoin
- fallback memoire en local tant que `DATABASE_URL` n'est pas branche
- migration progressive via repositories pour garder les routes stables

## Commandes

```bash
npm run backend:dev
npm run backend:typecheck
npm run prisma:generate
npm run prisma:seed
```

## Variables d'environnement attendues

- `BACKEND_PORT`
- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

## Etat actuel

- `auth` et `admin` utilisent deja Prisma si `DATABASE_URL` est defini
- `classes`, `academics` et `attendance` passent par `school-repository`
- `whatsapp` expose un webhook Meta et une route de simulation locale
- sans base configuree, tout continue de fonctionner avec les donnees de demo
- avec une base configuree, les memes routes utiliseront PostgreSQL

## Routes WhatsApp V1

- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`
- `POST /api/whatsapp/simulate`

La route `simulate` permet de tester localement le comportement parent WhatsApp avec un token admin ou enseignant.

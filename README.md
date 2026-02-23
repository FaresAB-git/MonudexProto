

## Lancer l'app

### 1. Backend Strapi
```bash
cd monudex-backend
npm run develop
```
→ http://localhost:1337

### 2. Serveur Proxy (requis pour Google Directions)
```bash
cd parcours-app
npm run server
```
→ http://localhost:3001

### 3. Frontend React
```bash
cd parcours-app
npm run dev
```
→ http://localhost:5173

## Technologies

- **Frontend**: React 19, Vite, @react-google-maps/api
- **Backend**: Strapi (CMS Node.js), SQLite
- **Tests**: Vitest, @testing-library/react

## Pourquoi un serveur Node.js ?

L'API Google Directions ne fonctionne pas directement depuis le navigateur (erreur CORS). Le serveur proxy reçoit les requêtes du frontend et les requettes vers Google.

## Tests

```bash
cd parcours-app
npm test
```

5 tests : affichage titre, liste parcours, loading, erreurs, message vide.

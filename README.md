PROJET : CERISoNet - Étape 4
AUTEUR : MOUSSAOUI Lucas
PORT HTTPS : 3115

--- MODULES NODE.JS UTILISÉS ---
Les modules suivants doivent être installés via npm install :
- express
- mongodb
- pg
- express-session
- connect-mongodb-session
- dotenv
- cors
- socket.io

Les modules suivants sont natifs à Node.js (pas d'installation nécessaire) :
- https
- fs
- crypto

--- LANCEMENT ---
1. Installer les dépendances : npm install
2. Lancer le serveur : node server.js
3. Accéder à l'application : https://pedago.univ-avignon.fr:3115

--- NOTES ---
Les variables d'environnement (identifiants PostgreSQL, port) sont
stockées dans un fichier .env à la racine du projet.
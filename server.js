require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const pgClient = require('pg');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://localhost:27017";
const clientMongo = new MongoClient(mongoUrl);

// Configuration de la connexion à PostgreSQL
const connectionObj = new pgClient.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 3115;

// Autorise mon front-end Angular (port 3114) à parler à ce serveur
app.use(cors({
    origin: 'https://pedago.univ-avignon.fr:3114',
    credentials: true
}));

// Gestion des sessions : on stocke qui est connecté dans MongoDB
app.use(session({
    secret: 'signature-sympa',
    saveUninitialized: false,
    resave: false,
    store: new MongoDBStore({
        uri: "mongodb://localhost:27017/db-CERI",
        collection: "MySession3115",
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 24 * 3600 * 1000, // La session dure 24h
        secure: true, // Obligatoire car on est en HTTPS
        sameSite: 'none',
    }
}));

// Route pour vérifier les identifiants
app.post('/login', (request, response) => {
    const email = request.body.mail;
    const password = request.body.password;

    if (email && password) {
        connectionObj.connect((err, client, done) => {
            if (err) return response.status(500).send("Erreur connexion PG");

            // Requête SQL pour vérifier si l'utilisateur existe
            const sql = "SELECT id, pseudo, mail FROM fredouil.compte WHERE mail = $1 AND motpasse = $2";
            const values = [email, password];

            client.query(sql, values, (err, result) => {
                done(); // Libère la connexion

                if (result.rows.length > 0) {
                    const user = result.rows[0];
                    // On enregistre l'utilisateur dans la session
                    request.session.isConnected = true;
                    request.session.user = { id: user.id, pseudo: user.pseudo, mail: user.mail };

                    response.json({ success: true, user: user.pseudo });
                } else {
                    response.status(401).json({ success: false, message: "Identifiants incorrects" });
                }
            });
        });
    }
});

// Route pour déconnecter : on vide la session et on efface le cookie
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('connect.sid', {
        path: '/',
        domain: 'pedago.univ-avignon.fr',
        secure: true,
        sameSite: 'none'
    });
    res.json({ success: true });
});

// Route pour savoir si l'utilisateur est toujours connecté au rafraîchissement de la page
app.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true, user: req.session.user.pseudo });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

app.get('/posts', async (req, res) => {
    // Récupération des posts depuis la base de données
    if (!req.session.user) {
        return res.status(401).send("Accès refusé");
    }

    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    try {
        const database = clientMongo.db('db-CERI');
        const collection = database.collection('CERISoNet');

        const posts = await collection.find()
            .sort({ _id: -1 }) // On trie via l'id ( car l'id contient la date de création dans ses 4 premier octet )
            .skip(skip)
            .limit(limit)
            .toArray(); // renvoi la liste des postes

        res.json(posts);
    } catch (err) {
        res.status(500).send("Erreur lors de la récupération des posts");
    }
});

app.post('/create-post', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Vous devez être connecté" });
    }

    try {
        const db = clientMongo.db('db-CERI');
        const collection = db.collection('CERISoNet');

        const maintenant = new Date();

        // Construction du nouveau post
        const nouveauPost = {
            date: maintenant.toLocaleDateString('sv-SE'), // YYYY-MM-DD
            hour: maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), // 14:30
            body: req.body.body,
            createdBy: req.session.user.id,
            images: req.body.image ? {
                url: req.body.image.url || "",
                title: req.body.image.title || ""
            } : null,
            likes: 0,
            hashtags: req.body.hashtags || [],
            comments: [],
            shared: null
        };

        const result = await collection.insertOne(nouveauPost); // Insertion dans mongo DB via insertOne

        if (result.acknowledged) { // Si mongo répond positivement
            res.json({ success: true, message: "Post publié !", postId: result.insertedId }); // on envoi aussi l'id créer par mongo ( a des fin de debug )
        }
    } catch (err) {
        console.error("Erreur création post:", err);
        res.status(500).json({ message: "Erreur lors de la publication" });
    }
});

// Lancement du serveur en HTTPS avec les certificats SSL
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(port, () => {
    console.log("Serveur Node sécurisé lancé sur le port : " + port);
})
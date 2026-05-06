require('dotenv').config(); // Chargement des variables d'environnement depuis le .env
const express = require('express');
const https = require('https');
const fs = require('fs');
const pgClient = require('pg');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const mongoUrl = "mongodb://localhost:27017";
const clientMongo = new MongoClient(mongoUrl);
const crypto = require('crypto');
const utilisateursConnectes = new Map(); // map pour stocker les utilisateurs connecté via WebSocket

// Configuration de la connexion à PostgreSQL
const connectionObj = new pgClient.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})

const app = express();
app.use(express.json()); // nouvelle manière de faire le body parser
app.use(express.urlencoded({ extended: true }));

const node_port = process.env.NODE_PORT;

// Autorise le front-end Angular (port 3114) a parler a ce serveur
app.use(cors({
    origin: 'https://pedago.univ-avignon.fr:3114',
    credentials: true
}));

// on stocke qui est connecté dans MongoDB
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

app.post('/login', (request, response) => {
    const email = request.body.mail;
    const password = request.body.password;

    if (email && password) {
        // on hache le password du body car les mdp de la bdd sont haché en sha1
        const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

        connectionObj.connect((err, client) => {
            if (err) return response.status(500).send("Erreur connexion PG");

            // requete SQL pour vérifier si l'utilisateur existe
            const sql = "SELECT id, pseudo, mail FROM fredouil.compte WHERE mail = $1 AND motpasse = $2";
            client.query(sql, [email, hashedPassword], (err, result) => {
                if (result.rows.length > 0) {
                    const user = result.rows[0];
                    client.query("UPDATE fredouil.compte SET statut_connexion = 1 WHERE id = $1", [user.id]);  // On met le statut de connexion a 1

                    // On enregistre l'utilisateur dans la session
                    request.session.isConnected = true;
                    request.session.user = { id: user.id, pseudo: user.pseudo, mail: user.mail };
                    client.release();
                    response.json({ success: true, user: user.pseudo, id: user.id });
                } else {
                    client.release();
                    response.status(401).json({ success: false, message: "Identifiants incorrects" });
                }
            });
        });
    }
});

// Route pour déconnecter : on vide la session et on efface le cookie
app.post('/logout', (req, res) => {
    const userId = req.session.user?.id;

    req.session.destroy();
    res.clearCookie('connect.sid', {
        path: '/',
        domain: 'pedago.univ-avignon.fr',
        secure: true,
        sameSite: 'none'
    });

    // on passe le statut de connexion a 0
    if (userId) {
        connectionObj.connect((err, client) => {
            if (!err) {
                client.query("UPDATE fredouil.compte SET statut_connexion = 0 WHERE id = $1", [userId], () => {
                    client.release();
                });
            }
        });
    }

    res.json({ success: true });
});

// Route pour savoir si l'utilisateur est toujours connecté quand on rafraichit la page
app.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true, user: req.session.user.pseudo, id: req.session.user.id });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// Route pour récupérer les posts
app.get('/posts', async (req, res) => {
    // Récupération des posts depuis la base de données
    if (!req.session.user) {
        return res.status(401).send("Vous devez être connecté");
    }

    const limit = parseInt(req.query.limit) || 10; // la limite est fixé a 10 par le post service
    const skip = parseInt(req.query.skip) || 0;
    const tri = req.query.tri || 'date'; // critere de tri, peut etre date, propriétaire ou popularité
    const ordre = parseInt(req.query.ordre) || -1; // -1 décroissant, 1 croissant
    const filtre = req.query.filtre || 'tous'; // filtre : tous ou mes posts uniquement

    // construction options de tri, ca fera comme un ORDER BY _id DESC ( si -1 )
    let sortOption = { _id: ordre };
    if (tri === 'proprietaire') {
        sortOption = { createdBy: ordre };
    }
    if (tri === 'popularite') {
        sortOption = { likes: ordre };
    }

    // récupération hashtag depuis l'url
    const hashtags = req.query.hashtags ? req.query.hashtags.split('|') : [];

    // construction filtre, ca fera comme un WHERE createdBy = 5
    let filtreQuery = {};
    if (filtre === 'moi') {
        filtreQuery = { createdBy: req.session.user.id };
    }
    if (hashtags.length > 0) {
        filtreQuery = { ...filtreQuery, hashtags: { $all: hashtags } }; // contient tout les hashtag dans le filtre
    }

    try {
        const database = clientMongo.db('db-CERI');
        const collection = database.collection('CERISoNet');
        const posts = await collection.find(filtreQuery) // Where
            .sort(sortOption) // Order
            .skip(skip)
            .limit(limit)
            .toArray(); // renvoi la liste des postes
        // Pour chaque post partagé, on récupère le post original
        const postsAvecOriginal = await Promise.all(posts.map(async (post) => { // on attend que toute les promesse soient accomplit
            if (post.shared) {  // pour chaque post on récupere sont original si il est partagé
                const postOriginal = await collection.findOne({ _id: post.shared });
                return { ...post, postOriginal };   // et on enrichie l'objet post avec l'attribut postOriginal
            }
            return post;
        }));

        res.json(postsAvecOriginal); // renvoi donc un post enrichie par l'attribut postOriginal
    } catch (err) {
        res.status(500).send("Erreur lors de la récupération des posts");
    }
});

// Route pour la création de posts
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

        await collection.insertOne(nouveauPost); // Insertion dans mongo DB via insertOne
        res.json({ success: true, message: "Post publié !"});

    } catch (err) {
        console.error("Erreur création post:", err);
        res.status(500).json({ message: "Erreur lors de la publication" });
    }
});

app.post('/comment', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Vous devez être connecté" });
    }

    try {
        const db = clientMongo.db('db-CERI');
        const collection = db.collection('CERISoNet');

        const maintenant = new Date();

        // construction commentaire
        const commentaire = {
            text: req.body.text,
            commentedBy: req.session.user.id,
            date: maintenant.toLocaleDateString('sv-SE'),
            hour: maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };

        await collection.updateOne(
            { _id: new ObjectId(req.body.postId) }, // cherche le bon document, creer l'objetId définit par mongoDb
            { $push: { comments: commentaire } } // ajout du commentaire
        );

        res.json({ success: true, comment: commentaire });
    } catch (err) {
        console.error("Erreur commentaire:", err);
        res.status(500).json({ message: "Erreur lors du commentaire" });
    }
});

// Route pour le partage
app.post('/share', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Vous devez être connecté" });
    }

    try {
        const db = clientMongo.db('db-CERI');
        const collection = db.collection('CERISoNet');

        const maintenant = new Date();

        const nouveauPost = {
            date: maintenant.toLocaleDateString('sv-SE'),
            hour: maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            body: req.body.body,
            createdBy: req.session.user.id,
            images: req.body.image?.url ? { url: req.body.image.url, title: req.body.image.title } : null,
            likes: 0,
            hashtags: req.body.hashtags,
            comments: [],
            shared: new ObjectId(req.body.postId) // possède l'id du post original
        };

        await collection.insertOne(nouveauPost);
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur partage:", err);
        res.status(500).json({ message: "Erreur lors du partage" });
    }
});

// Lancement du serveur en HTTPS avec les certificats SSL
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, app); // création du server

// Setup Socket.io sur le serveur HTTPS
const io = require('socket.io')(server, {
    cors: {
        origin: 'https://pedago.univ-avignon.fr:3114',
        credentials: true
    }
});

// Gestion des WebSockets
io.on('connection', (socket) => {
    console.log('Un client WebSocket connecté');

    // évenement pour déclarer la connexion d'un utilisateur
    socket.on('identification', (data) => {
        utilisateursConnectes.set(data.userId, { pseudo: data.pseudo, socketId: socket.id });
        // On broadcast la nouvelle liste à tout le monde pour afficher le nombre de personne connecté
        socket.broadcast.emit('utilisateursConnectes', Array.from(utilisateursConnectes.values()).map(u => u.pseudo));
        // Notif pour tout le monde
        socket.broadcast.emit('connexionNotif', { pseudo: data.pseudo, type: 'connexion' });
    });

    // Réception d'un like depuis un client
    socket.on('like', async (data) => {
        const db = clientMongo.db('db-CERI');
        const collection = db.collection('CERISoNet');

        const userId = parseInt(data.userId);

        // récupération du post possédant la même id
        const post = await collection.findOne({ _id: new ObjectId(data.postId) });

        const dejaLike = post.likedBy && post.likedBy.includes(userId);

        if (!dejaLike) {
            try {
                // dans le cas où ca n'a pas été encore liké
                await collection.updateOne(
                    {_id: new ObjectId(data.postId)},
                    {
                        $inc: {likes: 1},
                        $push: {likedBy: userId}
                    }
                );
                io.emit('like', {postId: data.postId, pseudo: data.pseudo, userId: userId}); // broadcast a tout le monde
            } catch (err) {
                console.error("Les likes sont encore corrompu", err.message);
            }
        }
    });

    socket.on('partage', (data) => {
        socket.broadcast.emit('partage', { pseudo: data.pseudo }); // envoi a tout le monde sauf soi
    });

    socket.on('deconnexion', (data) => {
        utilisateursConnectes.delete(data.userId); // on supprime le user de la liste
        socket.broadcast.emit('utilisateursConnectes', Array.from(utilisateursConnectes.values()).map(u => u.pseudo));
        socket.broadcast.emit('connexionNotif', { pseudo: data.pseudo, type: 'deconnexion' });
    });

    socket.on('disconnect', () => {
        console.log('Un client WebSocket déconnecté');
    });
});

server.listen(node_port, () => {
    console.log("Serveur Node sécurisé lancé sur le port : " + node_port);
});
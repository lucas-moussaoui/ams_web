require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require("path");
const pgClient = require('pg');
const MongoClient = require('mongodb').MongoClient;
const dsnMongoDB = "mongodb://localhost:27017/db-CERI";

const connectionObj = new pgClient.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})

const app = express();

// Lecture des certificats SSL pour le HTTPS
// 'key.pem' est la clé privée, 'cert.pem' est le certificat public
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const port = 3115;

// Création du serveur HTTPS
https.createServer(options, app).listen(port, () => {
    console.log("écoute sur le port : " + port);
})

// cette route renvoie le fichier HTML du front-end
app.get('/', (request, response) => {
    //response.sendFile(path.join(__dirname + '/../front-end/index.html'))
})

app.get('/test-db', (request, response) => {
    connectionObj.connect((err, client, done) => {
        if(err) {
            console.log('Erreur de connexion : ' + err.stack);
            return response.status(500).send("Erreur de connexion au serveur PG");
        }

        console.log('Connexion établie avec le serveur PG');

        const sql = "SELECT * FROM fredouil.compte";

        client.query(sql, (err, result) => {
            done();

            if (err) {
                console.log(err.stack);
                response.status(500).send("Erreur lors de l'exécution de la requête");
            } else {
                console.log(result.rows);
                response.json(result.rows);
            }
        });
    });
});
app.get('/test-mongo', (request, response) => {
    MongoClient.connect(dsnMongoDB)
        .then(client => {
            const db = client.db('db-CERI');

            db.collection('CERISoNet').find({}).toArray()
                .then(posts => {
                    console.log("Documents trouvés :", posts.length);
                    if (posts.length > 0) {
                        response.json(posts);
                    }
                    client.close();
                })
                .catch(err => {
                    console.log("Erreur find :", err);
                    response.status(500).send("Erreur de lecture");
                });
        })
});


// Récupère le login de l'utilisateur et l'affiche dans la console
app.get('/login', (request, response) => {

    var email = request.query.email;
    var password = request.query.password;

    if(email && password){
        console.log(email, password);
        response.status(200).send("");
    }
});
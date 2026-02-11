const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require("path");

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
    response.sendFile(path.join(__dirname + '/../front-end/index.html'))
})

// Récupère le login de l'utilisateur et l'affiche dans la console
app.get('/login', (request, response) => {

    var email = request.query.email;
    var password = request.query.password;

    if(email && password){
        console.log(email, password);
        response.status(200).send("");
    }
});
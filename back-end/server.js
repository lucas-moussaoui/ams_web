const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require("path");

const app = express();

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const port = 3115;

https.createServer(options, app).listen(port, () => {
    console.log("écoute sur le port : " + port);
})

app.get('/', (request, response) => {
    response.redirect('/login');
})

app.get('/login', (request, response) => {

    var email = request.query.email;
    var password = request.query.password;

    if(email && password){
        console.log(email, password);
        response.redirect('/login');
    } else{
        response.sendFile(path.join(__dirname + '/../front-end/index.html'))
    }
});
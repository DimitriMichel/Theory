const functions = require("firebase-functions");
const express = require("express");
const app = express();

const FBAuth = require("./util/fbAuth");

const { getAllWaves, createWave } = require("./handlers/waves");
const { signup, login, uploadImage } = require("./handlers/users");

/**Wave Routes**/
app.get("/waves", getAllWaves);
app.post("/wave", FBAuth, createWave);

/**Users Routes**/
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);

exports.api = functions.https.onRequest(app);

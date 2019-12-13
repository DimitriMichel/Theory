const functions = require("firebase-functions");
const express = require("express");
const app = express();

const FBAuth = require("./util/fbAuth");

const { getAllWaves, createWave } = require("./handlers/waves");
const {
  signup,
  login,
  uploadImage,
  addUserDetails
} = require("./handlers/users");

/**Wave Routes**/
app.get("/waves", getAllWaves);
app.post("/wave", FBAuth, createWave);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

/**Users Routes**/
app.post("/signup", signup);
app.post("/login", login);


exports.api = functions.https.onRequest(app);

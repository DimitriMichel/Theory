const functions = require("firebase-functions");
const express = require("express");
const app = express();

const FBAuth = require("./util/fbAuth");

/**Wave Functions**/
const {
  getAllWaves,
  createWave,
  getWave,
  commentOnWave,
  likeWave,
  unlikeWave,
  deleteWave
} = require("./handlers/waves");

/**User Functions**/
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");

/**Wave Routes**/
app.get("/waves", getAllWaves);
app.post("/wave", FBAuth, createWave);
app.get("/wave/:waveID", getWave);
app.post("/wave/:waveID/comment", FBAuth, commentOnWave);
app.get("/wave/:waveID/like", FBAuth, likeWave);
app.get("/wave/:waveID/unlike", FBAuth, unlikeWave);
app.delete("/wave/:waveID", FBAuth, deleteWave);

/**Users Routes**/
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);

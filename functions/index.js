const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const express = require("express");
const app = express();

// Fetch all documents/posts in Waves collection.
app.get("/waves", (request, response) => {
  admin
    .firestore()
    .collection("waves")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let waves = [];
      data.forEach(doc => {
        waves.push({
          waveID: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: new Date().toISOString()
        });
      });
      return response.json(waves);
    })
    .catch(err => console.error(err));
});

//Create post in Waves collection.
app.post("/wave", (request, response) => {
  if (request.method !== "POST") {
    return response.status(400).json({ error: "Method not allowed." });
  }
  const newWave = {
    body: request.body.body,
    userHandle: request.body.userHandle,
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
  };

  //Persist in database.
  admin
    .firestore()
    .collection("waves")
    .add(newWave)
    .then(doc => {
      response.json({ message: `document ${doc.id} created successfully` });
    })
    .catch(err => {
      response.status(500).json({ error: "Something went wrong.." });
      console.error(err);
    });
});

exports.api = functions.https.onRequest(app);

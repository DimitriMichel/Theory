const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const app = express();

admin.initializeApp();

const config = {
  apiKey: "AIzaSyBbqVc8GnWggwxu3GDykViihzjsZ_Ad1z0",
  authDomain: "theory-35917.firebaseapp.com",
  databaseURL: "https://theory-35917.firebaseio.com",
  projectId: "theory-35917",
  storageBucket: "theory-35917.appspot.com",
  messagingSenderId: "974992797141",
  appId: "1:974992797141:web:b7a1f2ff7583282283e15c",
  measurementId: "G-M1YFHTWHKN"
};

const firebase = require("firebase");
firebase.initializeApp(config);

const db = admin.firestore();

// Fetch all documents/posts in Waves collection.
app.get("/waves", (request, response) => {
  db.collection("waves")
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
  db.collection("waves")
    .add(newWave)
    .then(doc => {
      response.json({ message: `document ${doc.id} created successfully` });
    })
    .catch(err => {
      response.status(500).json({ error: "Something went wrong.." });
      console.error(err);
    });
});

//User Sign Up Route.
app.post("/signup", (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  };

  // Validate Data
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return response
          .status(400)
          .json({ handle: "This handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use")
      return response.status(500).json({ error: err.code });
    });
});

exports.api = functions.https.onRequest(app);

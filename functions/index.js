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

//Firebase Authentication Function
const FBAuth = (request, response, next) => {
  let idToken;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith("Bearer ")
  ) {
    //After split we taken the second element, the token.
    idToken = request.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found.");
    return response.status(403).json({ error: "Unauthorized." });
  }
  //Return goes to database to get user collection.
  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      request.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection("users")
        .where("userId", "==", request.user.uid)
        .limit(1)
        .get();
    })
    // Promise returns docs property as an array. Gets ' handle: "user" ' property and attaches it to request.user
    .then(data => {
      request.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      console.error("Error while verifying token.", err);
      return response.status(403).json(err);
    });
};
//Create post.
app.post("/wave", FBAuth, (request, response) => {
  if (request.method !== "POST") {
    return response.status(400).json({ error: "Method not allowed." });
  }

  const newWave = {
    body: request.body.body,
    userHandle: request.user.handle,
    createdAt: new Date().toISOString()
  };

  //Persist Wave in database.
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

//Validation Helper Functions
const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) return true;
  else return false;
};
const isEmpty = string => {
  if (string.trim() === "") return true;
  else return false;
};

//User Sign Up Route.
app.post("/signup", (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  };
  // Validating email, password, and handle (username)
  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid e-mail address.";
  }
  if (isEmpty(newUser.password)) {
    errors.password = "Must not be empty";
  }
  if (newUser.password !== newUser.confirmPassword) {
    errors.confirmPassword = "Passwords must match.";
  }
  if (isEmpty(newUser.handle)) {
    errors.handle = "Must not be empty";
  }
  if (Object.keys(errors).length > 0) {
    return response.status(400).json(errors);
  }

  // Validate Data
  let token, userId;
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
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return response
          .status(400)
          .json({ email: "E-mail is already in use." });
      }
      return response.status(500).json({ error: err.code });
    });
});

//User log-in route.
app.post("/login", (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  };
  let errors = {};
  if (isEmpty(user.email)) errors.email = "Must not be empty";
  if (isEmpty(user.password)) errors.password = "Must not be empty";
  if (Object.keys(errors).length > 0) return response.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return response
          .status(403)
          .json({ general: "Wrong credentials, please try again." });
      } else return response.status(500).json({ error: err.code });
    });
});

exports.api = functions.https.onRequest(app);

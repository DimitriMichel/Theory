const { db } = require("../util/admin");
const firebase = require("firebase");
const config = require("../util/config");
firebase.initializeApp(config);
const { validateSignupData, validateLogindata } = require("../util/validators");

exports.signup = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  };

  //Destructuring errors and validation in User Sign Up data
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return response.status(400).json(errors);

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
};

exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  };

  //Destructuring errors and validation in User Login data
  const { valid, errors } = validateLogindata(user);
  if (!valid) return response.status(400).json(errors);

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
};

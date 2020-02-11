const { db, admin } = require("../util/admin");
const firebase = require("firebase");
const config = require("../util/config");
firebase.initializeApp(config);
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails
} = require("../util/validators");

// User Sign Up Function.
exports.signup = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  };

  //Destructuring errors and validation in User Sign Up data.
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return response.status(400).json(errors);

  const noImg = "no-image.png";

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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
      return response
        .status(500)
        .json({ general: "Something went wrong.. Try Again." });
    });
};

//Login User Function.
exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  };

  //Destructuring errors and validation in User Login data
  const { valid, errors } = validateLoginData(user);
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
      return response
        .status(403)
        .json({ general: "Wrong credentials, please try again." });
    });
};

// Add User Details Function.
exports.addUserDetails = (request, response) => {
  let userDetails = reduceUserDetails(request.body);
  db.doc(`/users/${request.user.handle}`)
    .update(userDetails)
    .then(() => {
      return response.json({ message: "Details Added." });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

//Get User Details Function.
exports.getUserDetails = (request, response) => {
  let userData = {};
  //Ask users document for user handle
  db.doc(`/users/${request.params.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("waves")
          .where("userHandle", "==", request.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return response.json({ error: "User not found." });
      }
    })
    .then(data => {
      userData.waves = [];
      data.forEach(doc => {
        userData.waves.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          waveID: doc.id
        });
      });
      return response.json(userData);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

///Get User Details Function.
exports.getAuthenticatedUser = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", request.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("recipient", "==", request.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          waveID: doc.data().waveID,
          type: doc.data().type,
          read: doc.data().read,
          notificationID: doc.id
        });
      });
      return response.json(userData);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

//Upload Profile Picture Function (w/ BusBoy --> https://github.com/mscdex/busboy#readme ).
exports.uploadImage = (request, response) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  let imageFilename;
  let imageToBeUploaded = {};

  //Making sure only image file types are to be uploaded.
  const busboy = new BusBoy({ headers: request.headers });
  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return response.status(400).json({ error: "Wrong file type sent." });
    }
    console.log(fieldname);
    console.log(filename);
    console.log(mimetype);

    //extract image extension for example (jpeg, jpg, png)
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFilename = `${Math.round(
      Math.random() * 100000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFilename);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  //image sent to firebase storage bucket.
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket(`${config.storageBucket}`)
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`;
        return db.doc(`/users/${request.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return response.json({ message: "Image successfully uploaded." });
      })
      .catch(err => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
  });
  busboy.end(request.rawBody);
};
//Mark Notifications as "Read" Function.
exports.markNotificationsRead = (request, response) => {
  //Batch Write (update multiple firebase docs)
  let batch = db.batch();
  request.body.forEach(notificationID => {
    const notification = db.doc(`/notifications/${notificationID}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return response.json({ message: "Notification marked as read." });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

const functions = require("firebase-functions");
const express = require("express");
const app = express();
const { db } = require("./util/admin");
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
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead
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
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

//Like Notification Function
exports.createNotificationOnLike = functions
  .region("us-east1")
  .firestore.document("likes/{id}")
  //"snapshot" is wave.ID's corresponding like.
  .onCreate(snapshot => {
    return db
      .doc(`/waves/${snapshot.data().waveID}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            waveID: doc.id,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });
//Delete Notifications Function.
exports.deleteNotificationOnUnlike = functions
  .region("us-east1")
  .firestore.document("likes/{id}")
  .onDelete(snapshot => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch(err => {
        console.error(err);
      });
  });

//Comment Notification Function
exports.createNotificationOnComment = functions
  .region("us-east1")
  .firestore.document("comments/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/waves/${snapshot.data().waveID}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            waveID: doc.id
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

//Change Global User Image Function
exports.onUserImageChange = functions
  .region("us-east1")
  .firestore.document("/users/{userId}")
  .onUpdate(change => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("image has changed");
      const batch = db.batch();
      return db
        .collection("waves")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const wave = db.doc(`/waves/${doc.id}`);
            batch.update(wave, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else {
      return true;
    }
  });
//Delete child comments and likes on Parent Wave delete Function.
exports.onWaveDelete = functions
  .region("us-east1")
  .firestore.document("/waves/{waveID}")
  .onDelete((snapshot, context) => {
    const waveID = context.params.waveID;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("waveID", "==", waveID)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection("likes")
          .where("waveID", "==", waveID)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("waveID", "==", waveID)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch(err => console.error(err));
  });

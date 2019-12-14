const { db } = require("../util/admin");

// Get All Waves Function
exports.getAllWaves = (request, response) => {
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
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount
        });
      });
      return response.json(waves);
    })
    .catch(err => console.error(err));
};

// Create Wave Function
exports.createWave = (request, response) => {
  if (request.body.body.trim() === "") {
    return response.status(400).json({ body: "Must not be empty." });
  }
  if (request.method !== "POST") {
    return response.status(400).json({ error: "Method not allowed." });
  }

  const newWave = {
    body: request.body.body,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  //Persist Wave in database.
  db.collection("waves")
    .add(newWave)
    .then(doc => {
      const responseWave = newWave;
      responseWave.waveID = doc.id;
      response.json(responseWave);
    })
    .catch(err => {
      response.status(500).json({ error: "Something went wrong.." });
      console.error(err);
    });
};

//Get wave Function.
exports.getWave = (request, response) => {
  let waveData = {};
  db.doc(`/waves/${request.params.waveID}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Wave not found." });
      }
      waveData = doc.data();
      waveData.waveID = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "asc")
        .where("waveID", "==", request.params.waveID)
        .get();
    })
    .then(data => {
      waveData.comments = [];
      data.forEach(doc => {
        waveData.comments.push(doc.data());
      });
      return response.json(waveData);
    })
    .catch(err => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

//Comment on a Wave.
exports.commentOnWave = (request, response) => {
  if (request.body.body.trim() === "") {
    return response.status(400).json({ error: "Cannot not be empty." });
  }
  const newComment = {
    body: request.body.body,
    createdAt: new Date().toISOString(),
    waveID: request.params.waveID,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl
  };
  //Confirm parent Wave exists
  db.doc(`/waves/${request.params.waveID}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Wave not found." });
      }

      //Increment Comment Count
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      response.json();
    })
    .catch(err => {
      console.log(err);
      respose.status(500).json({ error: "Something went wrong.." });
    });
};

//Like Wave Function.
//For efficiency we structure our database with properties across different documents. - firebase docs.
//createdAt can be added to firebase db for statistics and data analysis.
exports.likeWave = (request, response) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", request.user.handle)
    .where("waveID", "==", request.params.waveID)
    .limit(1);
  const waveDocument = db.doc(`/waves/${request.params.waveID}`);
  let waveData;
  waveDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        waveData = doc.data();
        waveData.waveID = doc.id;
        return likeDocument.get();
      } else {
        return response.status(404).json({ error: "Wave not found." });
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            waveID: request.params.waveID,
            userHandle: request.user.handle
          }) // We must nest then statement to avoid empty going through.
          .then(() => {
            //increment like + 1 in database
            waveData.likeCount++;
            return waveDocument.update({ likeCount: waveData.likeCount });
          })
          .then(() => {
            return response.json(waveData);
          });
      } else {
        return response.status(400).json({ error: "Wave Already Liked." });
      }
    })
    .catch(err => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

exports.unlikeWave = (request, response) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", request.user.handle)
    .where("waveID", "==", request.params.waveID)
    .limit(1);
  const waveDocument = db.doc(`/waves/${request.params.waveID}`);
  let waveData;
  waveDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        waveData = doc.data();
        waveData.waveID = doc.id;
        return likeDocument.get();
      } else {
        return response.status(404).json({ error: "Wave not found." });
      }
    })
    .then(data => {
      if (data.empty) {
        return response.status(400).json({ error: "Wave Not Liked." });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            waveData.likeCount--;
            return waveDocument.update({ likeCount: waveData.likeCount });
          })
          .then(() => {
            response.json(waveData);
          });
      }
    })
    .catch(err => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

//Delete a Wave
exports.deleteWave = (request, response) => {
  const document = db.doc(`/waves/${request.params.waveID}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Wave not found." });
      }
      if (doc.data().userHandle !== request.user.handle) {
        return response.status(403).json({ error: "Unauthorized." });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      response.json({ message: "Wave deleted." });
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

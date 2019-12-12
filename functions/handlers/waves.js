const { db } = require("../util/admin");

exports.getAllWaves = (request, response) => {
  db.collection("waves")
    .orderBy('createdAt', 'desc')
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

exports.createWave = (request, response) => {
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
};

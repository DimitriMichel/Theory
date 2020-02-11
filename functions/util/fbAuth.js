const { admin, db } = require("./admin");

// Authentication Token Function
module.exports = (request, response, next) => {
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

    .then(data => {
      if (data) {
        console.log(data.docs);
        request.user.handle = data.docs[0].data().handle;
        request.user.imageUrl = data.docs[0].data().imageUrl;
        return next();
      }
      /*request.user.handle = data.docs[0].data().handle;
      request.user.imageUrl = data.docs[0].data().imageUrl;
      return next();*/
    })
    .catch(err => {
      console.error("Error while verifying token.", err);
      return response.status(403).json(err);
    });
};

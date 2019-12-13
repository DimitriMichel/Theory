//How things should look in Firebase database.

let db = {
  users: [
    {
      userId: "abcdefghijklmnop",
      email: "user@email.com",
      handle: "user",
      createdAt: "2019-12-11T07:57:13.221Z",
      imageUrl: "image/placeholder/placeholder",
      bio: "Hello, My name is User!",
      website: "https://user.com",
      location: "Concord, MA"
    }
  ],
  waves: [
    {
      userHandle: "user",
      body: "wave body",
      createdAt: "2019-12-11T07:57:13.221Z",
      likeCount: 20,
      commentCount: 8
    }
  ]
};

//Redux Data Fill.
const userDetails = {
  credentials: {
    userId: "abcdefghijklmnop",
    email: "user@email.com",
    handle: "user",
    createdAt: "2019-12-11T07:57:13.221Z",
    imageUrl: "image/placeholder/placeholder",
    bio: "Hello, My name is User!",
    website: "https://user.com",
    location: "Concord, MA"
  },
  likes: [
    {
      userHandle: "user",
      waveID: "ggnhtt78dwWfhgVzGrnPAA"
    },
    {
      userHandle: "user",
      waveID: "MRnn6inLlOMmdDErfd66e"
    }
  ]
};

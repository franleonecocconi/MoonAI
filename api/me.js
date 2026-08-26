const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

let client;
let db;

async function getDB() {
  if (db) return db;

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  db = client.db("moonai");

  return db;
}

function getInitials(username) {

  const words = username
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return (
      words[0][0] +
      words[1][0]
    ).toUpperCase();
  }

  return words[0][0].toUpperCase();
}

function generateBackground(username) {

  let hash = 0;

  for (let i = 0; i < username.length; i++) {
    hash =
      username.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  const backgrounds = [
    "#5865F2",
    "#7C3AED",
    "#2563EB",
    "#0891B2",
    "#059669",
    "#D97706",
    "#DB2777",
    "#9333EA"
  ];

  return backgrounds[
    Math.abs(hash) % backgrounds.length
  ];
}

module.exports = async (req, res) => {

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    const cookies = req.headers.cookie || "";

    const tokenCookie = cookies
      .split(";")
      .map(cookie => cookie.trim())
      .find(cookie =>
        cookie.startsWith("moonai_token=")
      );

    if (!tokenCookie) {
      return res.status(200).json({
        authenticated: false,
        user: null
      });
    }

    const token = tokenCookie.substring(
      "moonai_token=".length
    );

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const database = await getDB();

    const users = database.collection("users");

    const user = await users.findOne({
      _id: new (require("mongodb").ObjectId)(
        decoded.userId
      )
    });

    if (!user) {
      return res.status(200).json({
        authenticated: false,
        user: null
      });
    }

    let avatar = user.avatar;

    // Avatar automático

    if (!avatar) {

      const initials = getInitials(
        user.displayName || user.username
      );

      avatar = {
        type: "generated",
        initials,
        background: generateBackground(
          user.displayName || user.username
        )
      };

    }

    return res.status(200).json({

      authenticated: true,

      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        displayName:
          user.displayName || user.username,
        avatar
      }

    });

  } catch (error) {

    console.error("Avatar/session error:", error);

    return res.status(200).json({
      authenticated: false,
      user: null
    });

  }

};
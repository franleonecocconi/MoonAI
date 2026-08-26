const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
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

module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Completá todos los campos 🌙"
      });
    }

    const database = await getDB();
    const users = database.collection("users");

    const user = await users.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        error: "Email o contraseña incorrectos"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Email o contraseña incorrectos"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d"
      }
    );

    res.setHeader(
      "Set-Cookie",
      `moonai_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    );

    return res.status(200).json({
      ok: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {

    console.error("Login error:", error);

    return res.status(500).json({
      error: "Error iniciando sesión 🌙"
    });

  }
};
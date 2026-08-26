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

    const { username, email, password } = req.body;

    // Validaciones

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Completá todos los campos 🌙"
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: "El usuario debe tener al menos 3 caracteres"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres"
      });
    }

    const database = await getDB();

    const users = database.collection("users");

    // Comprobar si ya existe

    const existingUser = await users.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        error: "El usuario o email ya está registrado"
      });
    }

    // Hashear contraseña

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    // Crear usuario

    const user = {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: passwordHash,
      createdAt: new Date()
    };

    const result = await users.insertOne(user);

    // Crear sesión

    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        username: user.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d"
      }
    );

    // Cookie

    res.setHeader(
      "Set-Cookie",
      `moonai_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    );

    return res.status(201).json({
      ok: true,
      user: {
        id: result.insertedId,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {

    console.error("Register error:", error);

    return res.status(500).json({
      error: "Error creando la cuenta 🌙"
    });

  }
};
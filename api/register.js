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

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `moonai_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
  );
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const {
      username,
      email,
      password,
      displayName
    } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        error: "Completá todos los campos"
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const cleanDisplayName =
      typeof displayName === "string" &&
      displayName.trim()
        ? displayName.trim()
        : cleanUsername;

    if (
      !cleanUsername ||
      !cleanEmail ||
      !password
    ) {
      return res.status(400).json({
        error: "Completá todos los campos"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres"
      });
    }

    const database = await getDB();
    const users = database.collection("users");

    const existingUser = await users.findOne({
      $or: [
        { email: cleanEmail },
        { username: cleanUsername }
      ]
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        return res.status(409).json({
          error: "Ese correo ya está registrado"
        });
      }

      return res.status(409).json({
        error: "Ese nombre de usuario ya está ocupado"
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const now = new Date();

    const user = {
      username: cleanUsername,
      email: cleanEmail,
      displayName: cleanDisplayName,
      passwordHash,
      avatar: null,
      createdAt: now,
      updatedAt: now
    };

    const result =
      await users.insertOne(user);

    const token =
      jwt.sign(
        {
          userId: result.insertedId.toString()
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "30d"
        }
      );

    setSessionCookie(res, token);

    return res.status(201).json({
      ok: true,

      user: {
        id: result.insertedId.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: null
      }
    });

  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      error: "No se pudo crear la cuenta 🌙"
    });
  }
};

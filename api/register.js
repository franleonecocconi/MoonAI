const {
  MongoClient
} = require("mongodb");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

let client;
let db;

async function getDB() {
  if (db) return db;

  client = new MongoClient(
    process.env.MONGODB_URI
  );

  await client.connect();

  db = client.db("moonai");

  return db;
}


// =====================================================
// AVATAR
// =====================================================

function generateAvatar(username) {

  const words =
    username
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  let initials = "";

  if (words.length >= 2) {

    initials =
      words[0].charAt(0) +
      words[words.length - 1].charAt(0);

  } else {

    const name =
      words[0] || "U";

    if (name.length >= 2) {

      initials =
        name.charAt(0) +
        name.charAt(
          name.length - 1
        );

    } else {

      initials =
        name.charAt(0);

    }
  }

  initials =
    initials.toUpperCase();

  const backgrounds = [
    "#5865F2",
    "#8B5CF6",
    "#EC4899",
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#14B8A6",
    "#06B6D4",
    "#3B82F6"
  ];

  let hash = 0;

  for (
    let i = 0;
    i < username.length;
    i++
  ) {

    hash =
      username.charCodeAt(i) +
      ((hash << 5) - hash);

  }

  const background =
    backgrounds[
      Math.abs(hash) %
      backgrounds.length
    ];

  return {
    type: "generated",
    initials,
    background
  };
}


// =====================================================
// COOKIE
// =====================================================

function setSessionCookie(res, token) {

  res.setHeader(
    "Set-Cookie",
    `moonai_token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`
  );

}


// =====================================================
// API
// =====================================================

module.exports = async (req, res) => {

  // =========================
  // CORS
  // =========================

  const origin =
    req.headers.origin;

  if (
    origin === "http://localhost:8787" ||
    origin === "http://127.0.0.1:8787"
  ) {

    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );

  }

  res.setHeader(
    "Access-Control-Allow-Credentials",
    "true"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  if (req.method === "OPTIONS") {

    return res
      .status(200)
      .end();

  }


  // =========================
  // MÉTODO
  // =========================

  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        error:
          "Método no permitido"
      });

  }


  try {

    // =========================
    // DATOS
    // =========================

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

      return res
        .status(400)
        .json({
          error:
            "Completá todos los campos"
        });

    }


    const cleanUsername =
      username.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

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

      return res
        .status(400)
        .json({
          error:
            "Completá todos los campos"
        });

    }


    // =========================
    // VALIDACIÓN CONTRASEÑA
    // =========================

    if (password.length < 6) {

      return res
        .status(400)
        .json({
          error:
            "La contraseña debe tener al menos 6 caracteres"
        });

    }


    // =========================
    // MONGODB
    // =========================

    const database =
      await getDB();

    const users =
      database.collection(
        "users"
      );


    const existingUser =
      await users.findOne({
        $or: [
          {
            email:
              cleanEmail
          },
          {
            username:
              cleanUsername
          }
        ]
      });


    if (existingUser) {

      if (
        existingUser.email ===
        cleanEmail
      ) {

        return res
          .status(409)
          .json({
            error:
              "Ese correo ya está registrado"
          });

      }


      return res
        .status(409)
        .json({
          error:
            "Ese nombre de usuario ya está ocupado"
        });

    }


    // =========================
    // CONTRASEÑA
    // =========================

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );


    // =========================
    // AVATAR
    // =========================

    const avatar =
      generateAvatar(
        cleanDisplayName
      );


    // =========================
    // USUARIO
    // =========================

    const now =
      new Date();


    const user = {

      username:
        cleanUsername,

      email:
        cleanEmail,

      displayName:
        cleanDisplayName,

      passwordHash,

      avatar,

      createdAt:
        now,

      updatedAt:
        now

    };


    const result =
      await users.insertOne(
        user
      );


    // =========================
    // JWT
    // =========================

    const token =
      jwt.sign(
        {
          userId:
            result.insertedId.toString()
        },
        process.env.JWT_SECRET,
        {
          expiresIn:
            "30d"
        }
      );


    // =========================
    // SESIÓN
    // =========================

    setSessionCookie(
      res,
      token
    );


    // =========================
    // RESPUESTA
    // =========================

    return res
      .status(201)
      .json({

        ok: true,

        user: {

          id:
            result.insertedId.toString(),

          username:
            user.username,

          email:
            user.email,

          displayName:
            user.displayName,

          avatar:
            user.avatar

        }

      });


  } catch (error) {

    console.error(
      "Register error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "No se pudo crear la cuenta 🌙"
      });

  }

};
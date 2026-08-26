const { MongoClient, ObjectId } = require("mongodb");
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

function getUserId(req) {

  const cookies = req.headers.cookie || "";

  const cookie = cookies
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("moonai_token="));

  if (!cookie) return null;

  const token = cookie.substring(
    "moonai_token=".length
  );

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    return decoded.userId;

  } catch {
    return null;
  }
}

module.exports = async (req, res) => {

  if (req.method !== "PATCH") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Necesitás iniciar sesión 🌙"
      });
    }

    const {
      displayName,
      avatar
    } = req.body;

    const update = {};

    if (typeof displayName === "string") {

      const name = displayName.trim();

      if (name.length < 1 || name.length > 40) {
        return res.status(400).json({
          error: "Nombre inválido"
        });
      }

      update.displayName = name;
    }

    if (avatar) {

      if (
        avatar.type !== "generated" &&
        avatar.type !== "image"
      ) {
        return res.status(400).json({
          error: "Tipo de avatar inválido"
        });
      }

      update.avatar = avatar;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        error: "No hay cambios"
      });
    }

    const database = await getDB();

    const users = database.collection("users");

    await users.updateOne(
      {
        _id: new ObjectId(userId)
      },
      {
        $set: update
      }
    );

    return res.status(200).json({
      ok: true,
      message: "Perfil actualizado 🌙"
    });

  } catch (error) {

    console.error("Profile error:", error);

    return res.status(500).json({
      error: "No se pudo actualizar el perfil"
    });

  }
};
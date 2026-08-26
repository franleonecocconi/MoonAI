const {
  MongoClient,
  ObjectId
} = require("mongodb");

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

function getUserId(req) {

  const cookies = req.headers.cookie || "";

  const cookie = cookies
    .split(";")
    .map(c => c.trim())
    .find(c =>
      c.startsWith("moonai_token=")
    );

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

  try {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Necesitás una cuenta para guardar el historial 🌙"
      });
    }

    const database = await getDB();

    const chats = database.collection("chats");

    /*
      GET
      Obtener historial
    */

    if (req.method === "GET") {

      const list = await chats
        .find({
          userId: new ObjectId(userId)
        })
        .sort({
          updatedAt: -1
        })
        .toArray();

      return res.status(200).json({
        chats: list.map(chat => ({
          id: chat._id.toString(),
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        }))
      });
    }

    /*
      POST
      Crear chat
    */

    if (req.method === "POST") {

      const title =
        typeof req.body.title === "string"
          ? req.body.title.trim()
          : "Nuevo chat";

      const now = new Date();

      const chat = {

        userId: new ObjectId(userId),

        title:
          title.substring(0, 80) ||
          "Nuevo chat",

        createdAt: now,

        updatedAt: now

      };

      const result =
        await chats.insertOne(chat);

      return res.status(201).json({

        ok: true,

        chat: {
          id: result.insertedId.toString(),
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        }

      });
    }

    /*
      DELETE
      Borrar chat
    */

    if (req.method === "DELETE") {

      const id = req.query.id;

      if (!id || !ObjectId.isValid(id)) {

        return res.status(400).json({
          error: "ID de chat inválido"
        });

      }

      const result =
        await chats.deleteOne({

          _id: new ObjectId(id),

          userId:
            new ObjectId(userId)

        });

      if (result.deletedCount === 0) {

        return res.status(404).json({
          error: "Chat no encontrado"
        });

      }

      // También borrar mensajes

      const messages =
        database.collection("messages");

      await messages.deleteMany({

        chatId:
          new ObjectId(id),

        userId:
          new ObjectId(userId)

      });

      return res.status(200).json({
        ok: true
      });
    }

    return res.status(405).json({
      error: "Método no permitido"
    });

  } catch (error) {

    console.error(
      "Chats error:",
      error
    );

    return res.status(500).json({
      error: "Error con los chats 🌙"
    });

  }

};
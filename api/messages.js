const {
  MongoClient,
  ObjectId
} = require("mongodb");

const jwt =
  require("jsonwebtoken");

let client;
let db;

async function getDB() {
  if (db) return db;

  client =
    new MongoClient(
      process.env.MONGODB_URI
    );

  await client.connect();

  db =
    client.db("moonai");

  return db;
}

function setCors(res, origin) {
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
    "GET, POST, OPTIONS"
  );
}

function getUserId(req) {
  const cookies =
    req.headers.cookie || "";

  const cookie =
    cookies
      .split(";")
      .map(c => c.trim())
      .find(c =>
        c.startsWith(
          "moonai_token="
        )
      );

  if (!cookie) {
    return null;
  }

  const token =
    cookie.substring(
      "moonai_token=".length
    );

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    return decoded.userId;
  } catch {
    return null;
  }
}

module.exports =
  async (req, res) => {

    setCors(
      res,
      req.headers.origin
    );

    if (
      req.method === "OPTIONS"
    ) {
      return res
        .status(200)
        .end();
    }

    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res
          .status(401)
          .json({
            error:
              "Necesitás una cuenta 🌙"
          });
      }

      if (
        !ObjectId.isValid(userId)
      ) {
        return res
          .status(401)
          .json({
            error:
              "Sesión inválida"
          });
      }

      const database =
        await getDB();

      const chats =
        database.collection(
          "chats"
        );

      const messages =
        database.collection(
          "messages"
        );

      const userObjectId =
        new ObjectId(userId);

      const chatId =
        req.query &&
        req.query.chatId;

      if (
        !chatId ||
        !ObjectId.isValid(chatId)
      ) {
        return res
          .status(400)
          .json({
            error:
              "ID de chat inválido"
          });
      }

      const chatObjectId =
        new ObjectId(chatId);

      const chat =
        await chats.findOne({
          _id:
            chatObjectId,

          userId:
            userObjectId
        });

      if (!chat) {
        return res
          .status(404)
          .json({
            error:
              "Chat no encontrado"
          });
      }

      // =========================
      // GET
      // =========================

      if (
        req.method === "GET"
      ) {
        const list =
          await messages
            .find({
              chatId:
                chatObjectId,

              userId:
                userObjectId
            })
            .sort({
              createdAt: 1
            })
            .toArray();

        return res
          .status(200)
          .json({
            messages:
              list.map(
                message => ({
                  id:
                    message._id.toString(),

                  role:
                    message.role,

                  content:
                    message.content,

                  createdAt:
                    message.createdAt
                })
              )
          });
      }

      // =========================
      // POST
      // =========================

      if (
        req.method === "POST"
      ) {
        const role =
          req.body &&
          typeof req.body.role === "string"
            ? req.body.role
            : null;

        const content =
          req.body &&
          typeof req.body.content === "string"
            ? req.body.content
            : "";

        if (
          role !== "user" &&
          role !== "assistant"
        ) {
          return res
            .status(400)
            .json({
              error:
                "Rol de mensaje inválido"
            });
        }

        if (!content.trim()) {
          return res
            .status(400)
            .json({
              error:
                "Mensaje vacío"
            });
        }

        const now =
          new Date();

        const message = {
          chatId:
            chatObjectId,

          userId:
            userObjectId,

          role,

          content,

          createdAt:
            now
        };

        const result =
          await messages.insertOne(
            message
          );

        await chats.updateOne(
          {
            _id:
              chatObjectId,

            userId:
              userObjectId
          },
          {
            $set: {
              updatedAt:
                now
            }
          }
        );

        return res
          .status(201)
          .json({
            ok: true,

            message: {
              id:
                result.insertedId.toString(),

              role:
                message.role,

              content:
                message.content,

              createdAt:
                message.createdAt
            }
          });
      }

      return res
        .status(405)
        .json({
          error:
            "Método no permitido"
        });

    } catch (error) {
      console.error(
        "Messages error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Error con los mensajes 🌙"
        });
    }
  };
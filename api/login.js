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
"POST, OPTIONS"
);
}

module.exports = async (req, res) => {
setCors(res, req.headers.origin);

if (req.method === "OPTIONS") {
return res.status(200).end();
}

if (req.method !== "POST") {
return res.status(405).json({
error: "Método no permitido"
});
}

try {
const {
email,
password
} = req.body || {};

if (
  typeof email !== "string" ||
  typeof password !== "string"
) {
  return res.status(400).json({
    error: "Completá todos los campos 🌙"
  });
}

const cleanEmail =
  email.trim().toLowerCase();

if (!cleanEmail || !password) {
  return res.status(400).json({
    error: "Completá todos los campos 🌙"
  });
}

const database = await getDB();
const users = database.collection("users");

const user = await users.findOne({
  email: cleanEmail
});

if (!user) {
  return res.status(401).json({
    error: "Email o contraseña incorrectos"
  });
}

const validPassword =
  await bcrypt.compare(
    password,
    user.passwordHash
  );

if (!validPassword) {
  return res.status(401).json({
    error: "Email o contraseña incorrectos"
  });
}

const token = jwt.sign(
  {
    userId: user._id.toString()
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "30d"
  }
);

const origin =
  req.headers.origin || "";

const isLocal =
  origin === "http://localhost:8787" ||
  origin === "http://127.0.0.1:8787";

let cookie =
  "moonai_token=" +
  token +
  "; Path=/; HttpOnly; Max-Age=2592000; ";

if (isLocal) {
  cookie += "SameSite=Lax";
} else {
  cookie += "Secure; SameSite=None";
}

res.setHeader(
  "Set-Cookie",
  cookie
);

return res.status(200).json({
  ok: true,

  user: {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    displayName:
      user.displayName ||
      user.username,
    avatar:
      user.avatar || null
  }
});

} catch (error) {
console.error(
"Login error:",
error
);

return res.status(500).json({
  error:
    "Error iniciando sesión 🌙"
});

}
};
const {
MongoClient,
ObjectId
} = require("mongodb");

const jwt = require("jsonwebtoken");

let client;
let db;

async function getDB() {
if (db) {
return db;
}

client = new MongoClient(
process.env.MONGODB_URI
);

await client.connect();

db = client.db("moonai");

return db;
}

function cors(res, origin) {
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
"GET, OPTIONS"
);
}

module.exports = async function(req, res) {

cors(
res,
req.headers.origin
);

if (req.method === "OPTIONS") {
return res.status(200).end();
}

if (req.method !== "GET") {
return res.status(405).json({
error: "Método no permitido"
});
}

try {

```
const cookies =
  req.headers.cookie || "";

const cookie =
  cookies
    .split(";")
    .map(x => x.trim())
    .find(x =>
      x.startsWith(
        "moonai_token="
      )
    );

if (!cookie) {
  return res.status(200).json({
    authenticated: false,
    user: null
  });
}

const token =
  cookie.substring(
    "moonai_token=".length
  );

const decoded =
  jwt.verify(
    token,
    process.env.JWT_SECRET
  );

if (!decoded.userId) {
  return res.status(200).json({
    authenticated: false,
    user: null
  });
}

const database =
  await getDB();

const users =
  database.collection("users");

const user =
  await users.findOne({
    _id: new ObjectId(
      decoded.userId
    )
  });

if (!user) {
  return res.status(200).json({
    authenticated: false,
    user: null
  });
}

return res.status(200).json({

  authenticated: true,

  user: {
    id:
      user._id.toString(),

    username:
      user.username,

    email:
      user.email,

    displayName:
      user.displayName ||
      user.username,

    avatar:
      user.avatar || null
  }

});
```

} catch (error) {

```
console.error(
  "ME ERROR:",
  error
);

return res.status(500).json({
  error:
    "Error interno en /api/me"
});
```

}
};

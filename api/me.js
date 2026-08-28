const {
MongoClient,
ObjectId
} = require("mongodb");

const jwt =
require("jsonwebtoken");

let client;
let db;

// =====================================================
// MONGODB
// =====================================================

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

// =====================================================
// CORS
// =====================================================

function setCors(res, origin) {

if (
origin === "http://localhost:8787" ||
origin === "http://127.0.0.1:8787"
) {

```
res.setHeader(
  "Access-Control-Allow-Origin",
  origin
);
```

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

// =====================================================
// AVATAR
// =====================================================

function getInitials(username) {

const words =
username
.trim()
.split(/\s+/)
.filter(Boolean);

if (words.length >= 2) {

```
return (
  words[0][0] +
  words[1][0]
).toUpperCase();
```

}

return words[0][0].toUpperCase();
}

function generateBackground(username) {

let hash = 0;

for (
let i = 0;
i < username.length;
i++
) {

```
hash =
  username.charCodeAt(i) +
  ((hash << 5) - hash);
```

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
Math.abs(hash) %
backgrounds.length
];
}

// =====================================================
// API
// =====================================================

module.exports =
async (req, res) => {

```
// =========================
// CORS
// =========================

setCors(
  res,
  req.headers.origin
);


// =========================
// OPTIONS
// =========================

if (
  req.method === "OPTIONS"
) {

  return res
    .status(200)
    .end();

}


// =========================
// MÉTODO
// =========================

if (
  req.method !== "GET"
) {

  return res
    .status(405)
    .json({
      error:
        "Método no permitido"
    });

}


try {

  // =========================
  // COOKIE
  // =========================

  const cookies =
    req.headers.cookie || "";

  const tokenCookie =
    cookies
      .split(";")
      .map(
        cookie =>
          cookie.trim()
      )
      .find(
        cookie =>
          cookie.startsWith(
            "moonai_token="
          )
      );


  // =========================
  // SIN SESIÓN
  // =========================

  if (!tokenCookie) {

    return res
      .status(200)
      .json({

        authenticated:
          false,

        user:
          null

      });

  }


  const token =
    tokenCookie.substring(
      "moonai_token=".length
    );


  // =========================
  // JWT
  // =========================

  const decoded =
    jwt.verify(
      token,
      process.env.JWT_SECRET
    );


  // =========================
  // MONGODB
  // =========================

  const database =
    await getDB();

  const users =
    database.collection(
      "users"
    );


  const user =
    await users.findOne({

      _id:
        new ObjectId(
          decoded.userId
        )

    });


  // =========================
  // USUARIO NO EXISTE
  // =========================

  if (!user) {

    return res
      .status(200)
      .json({

        authenticated:
          false,

        user:
          null

      });

  }


  // =========================
  // AVATAR
  // =========================

  let avatar =
    user.avatar;


  if (!avatar) {

    const name =
      user.displayName ||
      user.username;

    avatar = {

      type:
        "generated",

      initials:
        getInitials(name),

      background:
        generateBackground(name)

    };

  }


  // =========================
  // RESPUESTA
  // =========================

  return res
    .status(200)
    .json({

      authenticated:
        true,

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

        avatar

      }

    });


} catch (error) {

  console.error(
    "Session error:",
    error
  );

  return res
    .status(200)
    .json({

      authenticated:
        false,

      user:
        null

    });

}
```

};

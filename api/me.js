const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {

const origin = req.headers.origin;

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

const tokenCookie =
  cookies
    .split(";")
    .map(cookie => cookie.trim())
    .find(cookie =>
      cookie.startsWith("moonai_token=")
    );

if (!tokenCookie) {
  return res.status(200).json({
    ok: true,
    authenticated: false,
    user: null
  });
}

const token =
  tokenCookie.substring(
    "moonai_token=".length
  );

const decoded =
  jwt.verify(
    token,
    process.env.JWT_SECRET
  );

return res.status(200).json({
  ok: true,
  authenticated: true,
  decoded
});
```

} catch (error) {

```
console.error("JWT ERROR:", error);

return res.status(401).json({
  ok: false,
  authenticated: false,
  user: null
});
```

}
};

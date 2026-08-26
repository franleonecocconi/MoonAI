module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  res.setHeader(
    "Set-Cookie",
    "moonai_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );

  return res.status(200).json({
    ok: true,
    message: "Sesión cerrada 🌙"
  });

};
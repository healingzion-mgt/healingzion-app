
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Not authorized" }, 403);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, phone, session_type, message, status, created_at FROM bookings ORDER BY created_at DESC`
  ).all();
  return jsonResponse({ ok: true, bookings: results });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const session_type = (body.session_type || "").trim();
    const message = (body.message || "").trim();

    if (!name || !email || !session_type) {
      return jsonResponse({ ok: false, error: "Please fill in all required fields" }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO bookings (name, email, phone, session_type, message) VALUES (?, ?, ?, ?, ?)`
    ).bind(name, email, phone, session_type, message).run();

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key") || "";
  return !!env.ADMIN_KEY && key.length > 0 && key === env.ADMIN_KEY;
}

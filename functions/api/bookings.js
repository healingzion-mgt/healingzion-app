const ADMIN_EMAIL = "oyibooyoma@gmail.com";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL) {
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

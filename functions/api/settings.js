const ADMIN_EMAIL = "oyibooyoma@gmail.com";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  results.forEach(r => settings[r.key] = r.value);
  return jsonResponse({ ok: true, settings });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    if (email !== ADMIN_EMAIL) {
      return jsonResponse({ ok: false, error: "Not authorized" }, 403);
    }

    const fields = ["bio_title", "bio_body", "profile_photo", "tagline"];
    for (const key of fields) {
      if (body[key] !== undefined) {
        await env.DB.prepare(
          `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`
        ).bind(key, body[key], body[key]).run();
      }
    }
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

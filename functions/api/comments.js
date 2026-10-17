export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const post_id = url.searchParams.get("post_id");
  if (!post_id) {
    return jsonResponse({ ok: false, error: "Missing post_id" }, 400);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, name, message, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC`
  ).bind(post_id).all();
  return jsonResponse({ ok: true, comments: results });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const post_id = body.post_id;
    const name = (body.name || "").trim();
    const message = (body.message || "").trim();

    // Honeypot: real people never fill this hidden field, bots do.
    if (body.website) {
      return jsonResponse({ ok: true });
    }
    if (!post_id || !name || !message) {
      return jsonResponse({ ok: false, error: "Please fill in your name and comment" }, 400);
    }
    if (name.length > 40) {
      return jsonResponse({ ok: false, error: "Name is too long" }, 400);
    }
    if (message.length > 300) {
      return jsonResponse({ ok: false, error: "Comment is too long (300 letters max)" }, 400);
    }
    if (/https?:|www\.|\b[a-z0-9-]+\.(com|net|org|ng|co|io|me|xyz|info|biz|ru|top)\b/i.test(message + " " + name)) {
      return jsonResponse({ ok: false, error: "Links are not allowed in comments" }, 400);
    }

    // Slow down repeat commenters: 3 comments per 10 minutes per device.
    try {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS rate_log (voter TEXT NOT NULL, ts INTEGER NOT NULL)`
      ).run();
      const voter = await voterKey(request);
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(`DELETE FROM rate_log WHERE ts < ?`).bind(now - 86400).run();
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM rate_log WHERE voter = ? AND ts > ?`
      ).bind(voter, now - 600).first();
      if (row && row.n >= 3) {
        return jsonResponse({ ok: false, error: "Too many comments. Please wait a few minutes." }, 429);
      }
      await env.DB.prepare(`INSERT INTO rate_log (voter, ts) VALUES (?, ?)`).bind(voter, now).run();
    } catch (e) {}

    await env.DB.prepare(
      `INSERT INTO comments (post_id, name, message) VALUES (?, ?, ?)`
    ).bind(post_id, name, message).run();

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

// Admin only: remove a comment.
export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    if (!isAdmin(request, env)) {
      return jsonResponse({ ok: false, error: "Not authorized" }, 403);
    }
    const body = await request.json();
    await env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(body.id).run();
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key") || "";
  return !!env.ADMIN_KEY && key.length > 0 && key === env.ADMIN_KEY;
}

async function voterKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ua = request.headers.get("User-Agent") || "";
  const data = new TextEncoder().encode(ip + "|" + ua);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
      }

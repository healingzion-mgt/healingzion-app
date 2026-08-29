const ADMIN_EMAIL = "oyibooyoma@gmail.com";

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.type, p.title, p.content, p.media_url, p.like_count, p.created_at,
     (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
     FROM posts p ORDER BY p.created_at DESC`
  ).all();
  return jsonResponse({ ok: true, posts: results });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    if (email !== ADMIN_EMAIL) {
      return jsonResponse({ ok: false, error: "Not authorized" }, 403);
    }

    const type = (body.type || "writeup").trim();
    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    const media_url = (body.media_url || "").trim();

    if (!content && !media_url) {
      return jsonResponse({ ok: false, error: "Add some content or media" }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO posts (type, title, content, media_url) VALUES (?, ?, ?, ?)`
    ).bind(type, title, content, media_url).run();

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const id = body.id;
    if (email !== ADMIN_EMAIL) {
      return jsonResponse({ ok: false, error: "Not authorized" }, 403);
    }
    await env.DB.prepare(`DELETE FROM comments WHERE post_id = ?`).bind(id).run();
    await env.DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
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
      

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

    if (!post_id || !name || !message) {
      return jsonResponse({ ok: false, error: "Please fill in your name and comment" }, 400);
    }
    if (message.length > 500) {
      return jsonResponse({ ok: false, error: "Comment is too long" }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO comments (post_id, name, message) VALUES (?, ?, ?)`
    ).bind(post_id, name, message).run();

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

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return jsonResponse({ ok: false, error: "Missing post id" }, 400);
    }

    await env.DB.prepare(
      `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`
    ).bind(id).run();

    const row = await env.DB.prepare(
      `SELECT like_count FROM posts WHERE id = ?`
    ).bind(id).first();

    return jsonResponse({ ok: true, like_count: row ? row.like_count : 0 });
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

// Share link for one post: /p/123
// Gives WhatsApp (and other apps) a preview card, then opens the post inside the app.
export async function onRequestGet(context) {
  const { env, params, request } = context;
  const origin = new URL(request.url).origin;
  const id = parseInt(params.id, 10);

  let title = "Healingzion";
  let desc = "Inspiring souls. Managing what matters.";
  let image = origin + "/logo.jpg";

  if (Number.isInteger(id)) {
    try {
      const post = await env.DB.prepare(
        "SELECT type, title, content, media_url FROM posts WHERE id = ?"
      ).bind(id).first();
      if (post) {
        if (post.title) title = post.title;
        if (post.content) desc = post.content.slice(0, 160);
        else if (post.type === "audio") desc = "Listen on the Healingzion app.";
        if (post.type === "photo" && post.media_url) image = post.media_url;
      }
    } catch (e) {}
  }

  const target = Number.isInteger(id) ? "/#post-" + id : "/";
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | Healingzion</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Healingzion">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(origin + "/p/" + (Number.isInteger(id) ? id : ""))}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${target}">
</head><body style="background:#0a1128;color:#fff;font-family:sans-serif;text-align:center;padding:40px">
<p>Opening Healingzion...</p>
<p><a style="color:#d4af37" href="${target}">Tap here if it does not open</a></p>
<script>location.replace(${JSON.stringify(target)});</script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/articles" && request.method === "GET") {
      const list = await env.ARTICLES.list();
      
      // Separate the special LAST_UPDATE key from article keys
      const articleKeys = list.keys.filter(key => key.name !== 'LAST_UPDATE');
      const lastUpdate = await env.ARTICLES.get('LAST_UPDATE');

      const promises = articleKeys.map(key => env.ARTICLES.get(key.name));
      const values = await Promise.all(promises);
      
      const articles = values.filter(v => v).map(v => {
        try {
          const parsedOnce = JSON.parse(v);
          if (typeof parsedOnce === 'string') {
            return JSON.parse(parsedOnce);
          }
          return parsedOnce;
        } catch (e) {
          console.error('Failed to parse article:', v, e);
          return null;
        }
      }).filter(Boolean);

      // Add key number to each article
      articles.forEach((article, index) => {
        article.key = index + 1; // Start numbering from 1
      });
      
      // Return articles and last update info, similar to the original cronograma.json structure
      const responsePayload = { 
        articles: articles,
        info: {
          last_update: lastUpdate
        }
      };

      return new Response(JSON.stringify(responsePayload), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // GET /articles/:key - Get a single article
    if (pathname.startsWith("/articles/") && request.method === "GET") {
      const key = pathname.split('/').pop();
      const value = await env.ARTICLES.get(key);
      if (value === null) {
        return new Response("Article not found", { status: 404 });
      }
      // The value from KV is a JSON string. Return it directly.
      return new Response(value, { headers: { 'Content-Type': 'application/json' } });
    }

    // POST /articles - Create a new article
    if (pathname === "/articles" && request.method === "POST") {
      try {
        const { key, value } = await request.json(); // `value` is an article object
        if (!key || !value) {
          return new Response("Missing key or value in request body", { status: 400 });
        }
        // Store the article object as a JSON string in KV
        await env.ARTICLES.put(key, JSON.stringify({ ...value, id: key }));
        await env.ARTICLES.put('LAST_UPDATE', new Date().toISOString());
        return new Response("Article added successfully", { status: 201 });
      } catch (e) {
        return new Response(`Error parsing request body: ${e.message}`, { status: 400 });
      }
    }

    // PUT /articles/:key - Update an existing article
    if (pathname.startsWith("/articles/") && request.method === "PUT") {
      try {
        const key = pathname.split('/').pop();
        const { value } = await request.json(); // `value` is an article object
        if (!value) {
          return new Response("Missing value in request body", { status: 400 });
        }
        // Store the updated article object as a JSON string in KV
        await env.ARTICLES.put(key, JSON.stringify({ ...value, id: key }));
        await env.ARTICLES.put('LAST_UPDATE', new Date().toISOString());
        return new Response("Article updated successfully");
      } catch (e) {
        return new Response(`Error parsing request body: ${e.message}`, { status: 400 });
      }
    }

    // DELETE /articles/:key - Delete an article
    if (pathname.startsWith("/articles/") && request.method === "DELETE") {
      const key = pathname.split('/').pop();
      await env.ARTICLES.delete(key);
      await env.ARTICLES.put('LAST_UPDATE', new Date().toISOString());
      return new Response("Article deleted successfully");
    }

    return new Response("Not found", { status: 404 });
  },
};
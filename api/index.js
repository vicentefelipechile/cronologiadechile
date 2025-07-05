/**
 * Configuration
 */

const RESPONSE_JSON = {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
}


/**
 * Functions
 */


async function GetArticles(env) {
  const list = await env.ARTICLES.list();

  const articleKeys = list.keys.filter(key => key.name !== 'LAST_UPDATE');
  const lastUpdate = await env.ARTICLES.get('LAST_UPDATE');

  const promises = articleKeys.map(key => env.ARTICLES.get(key.name));
  const values = await Promise.all(promises);
  
  const articles = values.filter(v => v).map(v => {
    try {
      const parsedOnce = JSON.parse(v);
      if (typeof parsedOnce === 'string') return JSON.parse(parsedOnce);
  
      return parsedOnce;
    } catch (e) {
      console.error('Failed to parse article:', v, e);
      return null;
    }
  }).filter(Boolean);

  articles.forEach((article, index) => { article.key = index + 1 });

  const lastAuthor = articles.length > 0 ? articles[articles.length - 1].last_author : null;
  
  return {
    articles: articles,
    info: {
      last_update: lastUpdate,
      last_author: lastAuthor
    }
  };
}


async function GetArticle(env, key) {
  const value = await env.ARTICLES.get(key);
  if (value === null) return null;

  try {
    const parsedOnce = JSON.parse(value);
    if (typeof parsedOnce === 'string') return JSON.parse(parsedOnce);
  
    return parsedOnce;
  } catch (e) {
    console.error('Failed to parse article:', value, e);
    return null;
  }
}


async function CreateArticle(env, key, article) {
  if (!key || !article) throw new Error("Missing key or value");

  // Store the new article object as a JSON string in KV
  await env.ARTICLES.put(key, JSON.stringify({ ...article }));
  await env.ARTICLES.put('LAST_UPDATE', new Date().toISOString());

  return { status: 201, message: "Article created successfully" };
}


async function UpdateArticle(env, key, article) {
  if (!key || !article) throw new Error("Missing key or value");

  // Store the updated article object as a JSON string in KV
  await env.ARTICLES.put(key, JSON.stringify({ ...article, id: key }));
  await env.ARTICLES.put('LAST_UPDATE', new Date().toISOString());

  return { status: 200, message: "Article updated successfully" };
}


async function DeleteArticle(env, key) {
  if (!key) throw new Error("Missing key");

  // Delete the article from KV
  await env.ARTICLES.delete(key);
  await env.ARTICLES.put('LAST_UPDATE', new Date().toISOString());

  return { status: 200, message: "Article deleted successfully" };
}


/**
 * Fetcher
 */

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    // Get all articles
    if (pathname === "/articles" && request.method === "GET") {
      const articles = await GetArticles(env);
    
      return new Response(JSON.stringify(articles), RESPONSE_JSON);
    }

    // Get last update info
    if (pathname === "/articles/info" && request.method === "GET") {
      const lastUpdate = await env.ARTICLES.get('LAST_UPDATE');
  
      return new Response(JSON.stringify({ last_update: lastUpdate }), RESPONSE_JSON);
    }

    // Get a single article by key
    if (pathname.startsWith("/articles/") && request.method === "GET") {
      const key = pathname.split('/').pop();
  
      const article = await GetArticle(env, key);
      if (article === null) return new Response("Article not found", { status: 404 });
  
      return new Response(JSON.stringify(article), RESPONSE_JSON);
    }

    // Create a new article
    if (pathname === "/articles" && request.method === "POST") {
      try {
        const { key, value } = await request.json();
        if (!key || !value) {
          return new Response("Missing key or value in request body", { status: 400 });
        }
        const result = await CreateArticle(env, key, value);
        return new Response(result.message, { status: result.status });
      } catch (e) {
        return new Response(`Error parsing request body: ${e.message}`, { status: 400 });
      }
    }

    // Update an existing article
    if (pathname.startsWith("/articles/") && request.method === "POST") {
      const key = pathname.split('/').pop();
      try {
        const value = await request.json();
        if (!value) {
          return new Response("Missing value in request body", { status: 400 });
        }
        const result = await UpdateArticle(env, key, value);
        return new Response(result.message, { status: result.status });
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
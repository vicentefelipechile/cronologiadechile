const fs = require('fs').promises;
const path = require('path');

async function clearKV() {
    try {
        const response = await fetch('http://127.0.0.1:8787/api/articles');
        if (response.ok) {
            const data = await response.json();
            const articles = data.articles;

            for (const article of articles) {
                const deleteResponse = await fetch(`http://127.0.0.1:8787/api/articles/${article.key}`, {
                    method: 'DELETE',
                });

                if (deleteResponse.ok) {
                    console.log(`Article with key '${article.key}' deleted successfully.`);
                } else {
                    console.error(`Failed to delete article with key '${article.key}'. Status: ${deleteResponse.status}`);
                }
            }
        } else {
            console.error('Failed to fetch data for clearing KV:', response.status, await response.text());
        }
    } catch (error) {
        console.error('Error clearing KV:', error);
    }
}

async function migrateArticles() {
  try {
    await clearKV();

    const filePath = path.join(__dirname, 'cronograma.json');
    const data = await fs.readFile(filePath, 'utf8');
    const cronograma = JSON.parse(data);
    const articles = cronograma.articles;

    const endpoint = 'http://127.0.0.1:8787/api/articles';

    console.log(`Starting migration of ${articles.length} articles to ${endpoint}...`);

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const key = (i + 1).toString();
      const value = JSON.stringify(article);

      const response = await fetch(`${endpoint}/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        console.log(`Article '${article.title}' migrated successfully with key ${key}.`);
      } else {
        console.error(`Failed to migrate article '${article.title}'. Status: ${response.status}`);
        const responseBody = await response.text();
        console.error('Response:', responseBody);
      }
    }
    console.log('Migration completed.');
  } catch (error) {
    console.error('An error occurred during migration:', error);
  }
}

migrateArticles();
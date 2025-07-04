
const fs = require('fs').promises;
const path = require('path');

// Function to create a slug from a string
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function migrateArticles() {
  try {
    const filePath = path.join(__dirname, 'cronograma.json');
    const data = await fs.readFile(filePath, 'utf8');
    const cronograma = JSON.parse(data);
    const articles = cronograma.articles;

    // The default address for a local Wrangler development server is http://127.0.0.1:8787
    const endpoint = 'http://127.0.0.1:8787/api/articles';

    console.log(`Starting migration of ${articles.length} articles to ${endpoint}...`);

    for (const article of articles) {
      // Create a unique key for each article
      const key = `${slugify(article.title)}-${article.date}`;
      const value = JSON.stringify(article);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (response.ok) {
        console.log(`Article '${article.title}' migrated successfully.`);
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

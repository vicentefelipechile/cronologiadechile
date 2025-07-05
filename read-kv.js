async function getKVData(limit) {
    try {
        const response = await fetch('http://127.0.0.1:8787/api/articles');
        if (response.ok) {
            const data = await response.json();
            let articles = data.articles;

            if (limit) {
                articles = articles.slice(0, limit);
            }

            console.log(JSON.stringify(articles, null, 2));
        } else {
            console.error('Failed to fetch data:', response.status, await response.text());
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

const limit = process.argv[2] ? parseInt(process.argv[2], 10) : null;
getKVData(limit);

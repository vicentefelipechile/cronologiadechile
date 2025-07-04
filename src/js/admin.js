document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('add-article-form');
    const formTitle = document.getElementById('title');
    const formDescription = document.getElementById('description');
    const responseMessage = document.getElementById('response-message');
    const previewContent = document.getElementById('preview-content');
    const previewSources = document.getElementById('preview-sources');
    const logoutButton = document.getElementById('logout-button');
    const submitButton = document.getElementById('submit-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const previewArticleTitle = document.getElementById('preview-article-title');
    const articleIdInput = document.getElementById('id');

    // Modal elements
    const manageArticlesButton = document.getElementById('manage-articles-button');
    const articlesModal = document.getElementById('articles-modal');
    const closeModalButton = articlesModal.querySelector('.close-button');
    const modalArticlesList = document.getElementById('modal-articles-list');
    const articleSearchInput = document.getElementById('article-search');

    const converter = new showdown.Converter();

    let allArticles = []; // To store all fetched articles
    editingArticleKey = null; // To store the key of the article being edited

    // Function to create a slug from a string
    function slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }

    // Function to update preview
    function updatePreview(title, description, sources) {
        title = title || form.title.value;
        description = description || form.description.value;
        sources = sources || form.source.value.split('\n').filter(s => s.trim() !== '');

        // Update preview section title
        previewArticleTitle.textContent = title ? title : 'Vista Previa del Artículo';

        // Preview content: Always attempt to convert to Markdown. Showdown handles HTML gracefully.
        previewContent.innerHTML = converter.makeHtml(description);

        // Preview sources
        const ol = document.createElement('ol');
        sources.forEach(source => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = source;
            a.textContent = source;
            a.target = '_blank';
            li.appendChild(a);
            ol.appendChild(li);
        });
        previewSources.innerHTML = '';
        previewSources.appendChild(ol);
    }

    // Function to fetch all articles
    async function fetchArticles() {
        try {
            const response = await fetch('/api/articles');
            if (response.ok) {
                const data = await response.json();
                // Assign a unique key based on the original index before sorting
                allArticles = data.articles.map((article, index) => ({
                    ...article,
                    key: index.toString()
                }));

                // Now, sort articles by date in descending order (newest first)
                allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

                renderArticlesInModal(allArticles); // Render all articles initially in modal
            } else {
                console.error('Failed to fetch articles:', response.status);
            }
        } catch (error) {
            console.error('Error fetching articles:', error);
        }
    }

    // Function to render the list of articles in the modal
    function renderArticlesInModal(articlesToRender) {
        modalArticlesList.innerHTML = '';
        if (articlesToRender.length === 0) {
            modalArticlesList.textContent = 'No hay artículos disponibles.';
            return;
        }

        const ul = document.createElement('ul');
        for (let i = 0; i < articlesToRender.length; i++) {
            const article = articlesToRender[i];
            const MAX_TITLE_LENGTH = 70; // Define max length for title
            const displayTitle = article.title.length > MAX_TITLE_LENGTH 
            ? article.title.substring(0, MAX_TITLE_LENGTH) + '...' 
            : article.title;
            const li = document.createElement('li');
            li.innerHTML = `
            <span><strong>${displayTitle}</strong> (${article.date})</span>
            <div>
                <button class="button edit-button" data-key="${article.key}">Editar</button>
                <button class="button delete-button" data-key="${article.key}">Eliminar</button>
            </div>
            `;
            ul.appendChild(li);
        }
        modalArticlesList.appendChild(ul);

        // Add event listeners to edit and delete buttons
        modalArticlesList.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', handleEditArticle);
        });
        modalArticlesList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', handleDeleteArticle);
        });
    }

    // Function to handle editing an article
    function handleEditArticle(event) {
        const keyToEdit = event.target.dataset.key;
        const articleToEdit = allArticles.find(article => article.key === keyToEdit);

        if (articleToEdit) {
            form.title.value = articleToEdit.title;
            form.date.value = articleToEdit.date;
            form.author.value = articleToEdit.author;
            // Remove the ![M] prefix if present for editing
            form.description.value = articleToEdit.description.startsWith('![M]') 
                ? articleToEdit.description.substring(4) 
                : articleToEdit.description;
            form.source.value = articleToEdit.source.join('\n');
            form.tags.value = articleToEdit.tags.join(', ');
            form.id.value = keyToEdit || ''; // Set the hidden ID field if available

            editingArticleKey = keyToEdit; // Set the key of the article being edited
            submitButton.textContent = 'Actualizar Artículo';
            cancelEditButton.style.display = 'inline-block';
            updatePreview(form.title.value, form.description.value, form.source.value.split('\n').filter(s => s.trim() !== '')); // Update preview with loaded data
            articlesModal.style.display = 'none'; // Close the modal after selecting an article
        }
    }

    // Function to handle deleting an article
    async function handleDeleteArticle(event) {
        const keyToDelete = event.target.dataset.key;
        if (confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
            try {
                const response = await fetch(`/api/articles/${keyToDelete}`, {
                    method: 'DELETE',
                });

                responseMessage.style.display = 'block';
                if (response.ok) {
                    responseMessage.textContent = '¡Artículo eliminado con éxito!';
                    responseMessage.className = 'response-message success';
                    fetchArticles(); // Refresh the list in the modal
                } else {
                    const errorText = await response.text();
                    responseMessage.textContent = `Error al eliminar el artículo: ${errorText}`;
                    responseMessage.className = 'response-message error';
                }
            } catch (error) {
                responseMessage.style.display = 'block';
                responseMessage.textContent = `Error de red: ${error.message}`;
                responseMessage.className = 'response-message error';
            }
        }
    }

    // Handle form submission (add or update)
    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const article = {
            title: formData.get('title'),
            date: formData.get('date'),
            author: formData.get('author'),
            description: `![M]${formData.get('description')}`,
            source: formData.get('source').split('\n').filter(s => s.trim() !== ''),
            tags: formData.get('tags').split(',').map(tag => tag.trim()),
        };

        const isUpdating = editingArticleKey === null;
        let key;
        let method;
        let url;
        let body;

        if (isUpdating) {
            key = editingArticleKey;
            method = 'PUT';
            url = `/api/articles/${key}`;
            body = JSON.stringify({ value: article }); // Send the article object directly
        } else {
            const maxKey = allArticles.reduce((max, art) => {
                const currentKey = parseInt(art.key, 10);
                return currentKey > max ? currentKey : max;
            }, -1);
            
            key = (maxKey + 1).toString();
            method = 'POST';
            url = '/api/articles';
            body = JSON.stringify({ key: key, value: article }); // Send key and article object
        }

        console.log(`Submitting article with key: ${key}, method: ${method}, url: ${url}`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5 * 1000); // 10 seconds timeout

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            responseMessage.style.display = 'block';
            if (response.ok) {
                responseMessage.textContent = `¡Artículo ${isUpdating ? 'actualizado' : 'añadido'} con éxito!`;
                responseMessage.className = 'response-message success';
                form.reset();
                editingArticleKey = null; // Reset editing state
                submitButton.textContent = 'Añadir Artículo';
                cancelEditButton.style.display = 'none';
                updatePreview('', '', []);
                fetchArticles(); // Refresh the list in the modal
            } else {
                const errorText = await response.text();
                responseMessage.textContent = `Error al ${isUpdating ? 'actualizar' : 'añadir'} el artículo: ${errorText}`;
                responseMessage.className = 'response-message error';
            }
        } catch (error) {
            responseMessage.style.display = 'block';
            responseMessage.textContent = `Error de red: ${error.message}`;
            responseMessage.className = 'response-message error';
        }
    });

    // Handle cancel edit
    cancelEditButton.addEventListener('click', () => {
        form.reset();
        articleIdInput.value = ''; // Clear the hidden ID field
        editingArticleKey = null;
        submitButton.textContent = 'Añadir Artículo';
        cancelEditButton.style.display = 'none';
        updatePreview(form.title.value, form.description.value, form.source.value.split('\n').filter(s => s.trim() !== ''));
    });

    // Handle logout
    logoutButton.addEventListener('click', async function(event) {
        event.preventDefault();
        const response = await fetch('/logout');
        if (response.ok) {
            window.location.href = '/login.html';
        } else {
            alert('Error al cerrar sesión.');
        }
    });

    // Modal event listeners
    manageArticlesButton.addEventListener('click', () => {
        articlesModal.style.display = 'flex'; // Use flex to center content
        fetchArticles(); // Refresh articles when modal opens
    });

    closeModalButton.addEventListener('click', () => {
        articlesModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === articlesModal) {
            articlesModal.style.display = 'none';
        }
    });

    formDescription.addEventListener('input', () => updatePreview(form.title.value, form.description.value, form.source.value.split('\n').filter(s => s.trim() !== '')));
    formTitle.addEventListener('input', () => updatePreview(form.title.value, form.description.value, form.source.value.split('\n').filter(s => s.trim() !== '')));
    form.source.addEventListener('input', () => updatePreview(form.title.value, form.description.value, form.source.value.split('\n').filter(s => s.trim() !== '')));

    // Search functionality within the modal
    articleSearchInput.addEventListener('input', () => {
        const searchTerm = articleSearchInput.value.toLowerCase();
        const filteredArticles = allArticles.filter(article => 
            article.title.toLowerCase().includes(searchTerm) ||
            article.description.toLowerCase().includes(searchTerm)
        );
        renderArticlesInModal(filteredArticles);
    });

    // Initial preview update and fetch articles
    updatePreview(form.title.value, form.description.value, form.source.value.split('\n').filter(s => s.trim() !== ''));
    fetchArticles();
});
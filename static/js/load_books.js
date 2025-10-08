// 加载电子书
function loadBook() {
    // 首先尝试获取books目录下的所有.epub文件
    fetch('/api/books')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(books => {
            console.log('Available books:', books);
                        
            // 清空并填充books选择器
            const booksSelect = document.getElementById('books');
            booksSelect.innerHTML = '<option value="">-- 选择书籍 --</option>';
            books.forEach(book => {
                const option = document.createElement('option');
                option.value = book;
                option.textContent = book.replace('.epub', '');
                booksSelect.appendChild(option);
            });
            
            // 如果有书籍且当前没有选中的书籍，默认选中第一本
            if (books.length > 0 && !currentBook) {
                currentBook = books[0];
                booksSelect.value = currentBook;
                // 加载第一本书
                loadSelectedBook(currentBook);
            }
            
            // 添加书籍选择事件监听器
            booksSelect.onchange = function() {
                const selectedBook = booksSelect.value;
                if (selectedBook) {
                    currentBook = selectedBook;
                    loadSelectedBook(currentBook);
                }
            };
        })
        .catch(error => {
            console.error('Error fetching books list:', error);
            // 降级处理：尝试加载默认书籍
            console.log('Falling back to default book loading');
            
            // 尝试两个可能的路径
            let bookPaths = ['/static/books/hp.epub', '/hp.epub'];
            bookPaths = ['/static/books/hp.epub'];
            let currentPathIndex = 0;
            
            function tryLoadPath() {
                if (currentPathIndex >= bookPaths.length) {
                    console.error('Failed to load book from all paths');
                    alert('加载电子书失败，请检查文件是否存在。');
                    showFallbackContent();
                    return;
                }
                
                const bookUrl = bookPaths[currentPathIndex];
                console.log(`Trying to load book from: ${bookUrl}`);
                
                if (typeof ePub !== 'undefined') {
                    try {
                        book = ePub(bookUrl);
                        renderBook();
                        // 独立加载目录，不依赖于渲染结果
                        loadTOC();
                    } catch (error) {
                        console.error(`Error creating ePub instance with path ${bookUrl}:`, error);
                        currentPathIndex++;
                        tryLoadPath(); // 尝试下一个路径
                    }
                } else {
                    console.error('epub.js library is not loaded.');
                    alert('epub.js库未加载，无法显示电子书内容。');
                    showFallbackContent();
                }
            }
            
            // 开始尝试加载
            tryLoadPath();
        });
}


// 加载选中的书籍
function loadSelectedBook(bookFilename) {
    console.log(`Loading selected book: ${bookFilename}`);
    
    // 停止当前的语音播放
    synth.cancel();
    
    // 重置currentPlaying变量
    currentPlaying = null;
    
    const bookUrl = `/static/books/${bookFilename}`;
    
    if (typeof ePub !== 'undefined') {
        try {
            book = ePub(bookUrl);
            renderBook();
            // 独立加载目录，不依赖于渲染结果
            loadTOC();
        } catch (error) {
            console.error(`Error creating ePub instance with path ${bookUrl}:`, error);
            alert(`加载电子书失败: ${error.message}`);
            showFallbackContent();
        }
    } else {
        console.error('epub.js library is not loaded.');
        alert('epub.js库未加载，无法显示电子书内容。');
        showFallbackContent();
    }
}

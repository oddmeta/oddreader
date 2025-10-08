// 全局变量
let book = null;
let currentSectionIndex = 0;
let currentPlaying = "p0";
const synth = window.speechSynthesis;
let rendition = null; // 存储rendition对象以便复用
let voices = []; // 存储可用的语音列表

let hasActiveContent = false; // 标记是否有活跃的内容可供朗读
let currentBook = null; // 存储当前加载的书籍

let audioSettingsVisible = false; // 跟踪音频设置是否可见

// DOM元素
const viewer = document.getElementById("viewer");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const pitch = document.querySelector("#pitch");
const pitchValue = document.querySelector(".pitch-value");
const rate = document.querySelector("#rate");
const rateValue = document.querySelector(".rate-value");
const tocSelect = document.getElementById("toc");
const settingsBtn = document.getElementById('settings-btn');
const audioSettingsDiv = document.querySelector('.audio-settings');


// 在全局变量区域添加一个变量来跟踪当前高亮的元素
let currentlyHighlightedElement = null;

// 添加highlightElement函数用于高亮显示播放中的文本
function highlightElement(elementId) {
    // 首先移除任何现有的高亮
    removeHighlight();
    
    // 尝试直接查找元素
    let element = document.getElementById(elementId);
    let iframeFound = false;
    
    // 如果没找到，检查iframe
    if (!element) {
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
            try {
                const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (iframeDoc) {
                    element = iframeDoc.getElementById(elementId);
                    if (element) {
                        iframeFound = true;
                        break;
                    }
                }
            } catch (e) {
                console.error('Error accessing iframe for highlight:', e);
            }
        }
    }
    
    if (element) {
        // 保存原始样式以便后续恢复
        element.dataset.originalBackgroundColor = element.style.backgroundColor;
        element.dataset.originalColor = element.style.color;
        
        // 设置高亮样式（半透明黄色背景）
        element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        element.style.color = 'inherit';
        
        // 记录当前高亮的元素
        currentlyHighlightedElement = element;
        
        console.log('Highlighted element:', elementId);
    } else {
        console.warn('Element not found for highlighting:', elementId);
    }
}

// 添加removeHighlight函数用于移除高亮
function removeHighlight() {
    if (currentlyHighlightedElement) {
        // 恢复原始样式
        if (currentlyHighlightedElement.dataset.originalBackgroundColor !== undefined) {
            currentlyHighlightedElement.style.backgroundColor = currentlyHighlightedElement.dataset.originalBackgroundColor;
        } else {
            currentlyHighlightedElement.style.backgroundColor = '';
        }
        
        if (currentlyHighlightedElement.dataset.originalColor !== undefined) {
            currentlyHighlightedElement.style.color = currentlyHighlightedElement.dataset.originalColor;
        } else {
            currentlyHighlightedElement.style.color = '';
        }
        
        // 清除记录
        currentlyHighlightedElement = null;
    }
}

// 独立加载目录的函数
function loadTOC() {
    if (!book) {
        console.error('Cannot load TOC: book is not initialized');
        return;
    }
    
    try {
        // 清除现有的目录选项
        tocSelect.innerHTML = '<option value="">-- 选择章节 --</option>';
        
        // 尝试通过两种方式加载目录
        // 方式1: 使用book.loaded.navigation
        book.loaded.navigation.then(function(toc) {
            console.log('TOC loaded via book.loaded.navigation:', toc);
            if (toc && toc.toc && toc.toc.length > 0) {
                populateTOC(toc.toc);
            } else {
                // 如果方式1失败，尝试方式2
                console.log('No TOC found via book.loaded.navigation, trying alternative method');
                loadTOCAlternative();
            }
        }).catch(err => {
            console.error('Error loading navigation:', err);
            // 如果方式1失败，尝试方式2
            loadTOCAlternative();
        });
    } catch (error) {
        console.error('Error in loadTOC:', error);
        loadTOCAlternative();
    }
}

// 备选的目录加载方法
function loadTOCAlternative() {
    if (!book) return;
    
    try {
        // 尝试直接使用book.navigation
        book.navigation.then(function(toc) {
            console.log('TOC loaded via alternative method:', toc);
            if (toc && toc.toc && toc.toc.length > 0) {
                populateTOC(toc.toc);
            } else {
                console.warn('No TOC found');
                // 添加一个提示选项
                const option = document.createElement('option');
                option.textContent = '[无法加载目录]';
                option.value = '';
                option.disabled = true;
                tocSelect.appendChild(option);
            }
        }).catch(err => {
            console.error('Error loading navigation (alternative):', err);
            // 添加一个提示选项
            const option = document.createElement('option');
            option.textContent = '[无法加载目录]';
            option.value = '';
            option.disabled = true;
            tocSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error in loadTOCAlternative:', error);
    }
}

function renderBook() {
    if (!book) return;
    
    try {
        // 清空viewer以防止旧内容干扰
        viewer.innerHTML = '<div class="loading">正在加载电子书...</div>';
        
        // 创建rendition对象并存储起来
        rendition = book.renderTo('viewer', {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'scrolled',
            manager: 'default',
            // manager: 'continuous',
            // manager: 'paginated',
            thema: 'night'
        });
        
        // 监听渲染完成事件
        rendition.on('rendered', function() {
            console.log('Book rendered, checking for content');
            // 检查是否有内容
            checkForContent();
            // 清除加载提示
            const loadingElement = viewer.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
                console.log('Loading indicator removed');
            }
        });
        
        // 监听显示完成事件
        rendition.on('displayed', function() {
            console.log('Content displayed');
            checkForContent();
            // 清除加载提示（确保在显示完成后也会清除）
            const loadingElement = viewer.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
                console.log('Loading indicator removed');
            }
        });
        
    }
    catch (error) {
        console.error('Error in renderBook:', error);
        showFallbackContent();
    }
}

// 首先，我们需要修改内容检测逻辑，使其能够检查iframe中的内容
function checkForContent() {
    const viewer = document.getElementById('viewer');
    console.log('Checking for content...');
    console.log('Viewer children:', viewer.children.length);
    console.log('Any content:', viewer.innerHTML);
    
    // 直接在viewer中查找p标签
    let paragraphs = viewer.querySelectorAll('p');
    
    // 如果没找到，检查iframe内容
    if (paragraphs.length === 0) {
        console.log('No paragraphs found directly, checking iframes...');
        const iframes = viewer.querySelectorAll('iframe');
        console.log('Found iframes:', iframes.length);
        
        // 遍历所有iframe查找内容
        for (let i = 0; i < iframes.length; i++) {
            try {
                const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (iframeDoc) {
                    console.log(`Checking iframe ${i} content...`);
                    const iframeParagraphs = iframeDoc.querySelectorAll('p');
                    console.log(`Found ${iframeParagraphs.length} paragraphs in iframe ${i}`);
                    
                    // 如果找到段落，为它们添加ID
                    if (iframeParagraphs.length > 0) {
                        paragraphs = iframeParagraphs;
                        for (let j = 0; j < paragraphs.length; j++) {
                            if (!paragraphs[j].id) {
                                paragraphs[j].id = `p${j}`;
                                console.log(`Added ID p${j} to paragraph in iframe`);
                            }
                        }
                        console.log('Content found and IDs added to text elements');
                        return true;
                    }
                }
            } catch (e) {
                console.error('Error accessing iframe content:', e);
            }
        }
        
        // 如果仍未找到内容，显示备用内容
        console.log('No content found in any iframe, showing fallback content');
        showFallbackContent();
        return false;
    }
    
    // 为段落添加ID
    for (let i = 0; i < paragraphs.length; i++) {
        if (!paragraphs[i].id) {
            paragraphs[i].id = `p${i}`;
            console.log(`Added ID p${i} to paragraph`);
        }
    }
    
    console.log(`Found ${paragraphs.length} paragraphs`);
    return true;
}

// 显示备用内容
function showFallbackContent() {
    console.log('Showing fallback content');
    // 清空viewer
    viewer.innerHTML = '';
    
    // 创建备用内容
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'fallback-content';
    fallbackDiv.innerHTML = `
        <p id="p0">这是备用内容。由于无法从电子书中提取文本，您可以点击此处测试语音朗读功能。</p>
        <p id="p1">如果您看到此消息，请检查电子书文件是否正确加载。</p>
    `;
    
    viewer.appendChild(fallbackDiv);
    hasActiveContent = true;
    
    // 为备用内容添加点击事件
    const paragraphs = viewer.querySelectorAll('p');
    paragraphs.forEach(p => {
        p.addEventListener('click', onTextClick);
    });
}

// 修改ensureInitialElement函数，使其能够处理iframe中的内容
function ensureInitialElement() {
    const viewer = document.getElementById('viewer');
    
    // 尝试直接获取第一个非空文本元素
    let firstElement = findFirstTextElement(viewer);
    
    // 如果没找到，检查iframe
    if (!firstElement) {
        const iframes = viewer.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
            try {
                const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (iframeDoc) {
                    firstElement = findFirstTextElement(iframeDoc.body);
                    if (firstElement) {
                        console.log('Found initial element in iframe');
                        break;
                    }
                }
            } catch (e) {
                console.error('Error accessing iframe for initial element:', e);
            }
        }
    }
    
    // 如果仍未找到，创建一个p0占位符
    if (!firstElement) {
        console.log('No text elements found, creating p0 placeholder');
        const placeholder = document.createElement('div');
        placeholder.id = 'p0';
        placeholder.textContent = '点击播放按钮开始朗读';
        placeholder.style.padding = '20px';
        placeholder.style.textAlign = 'center';
        viewer.appendChild(placeholder);
        currentPlaying = 'p0'; // 设置currentPlaying为占位符ID
        return true;
    } else {
        console.log('Found initial element:', firstElement.textContent.substring(0, 20) + '...');
        if (!firstElement.id) {
            firstElement.id = 'p0';
            console.log('Assigned id p0 to initial element');
        }
        
        // 确保初始元素有文本内容
        if (firstElement.textContent.trim() === '') {
            console.warn('Initial element has empty text, finding next valid element');
            // 尝试找到下一个有内容的元素
            const nextValidElement = findNextElementWithText(firstElement.id, false);
            if (nextValidElement) {
                currentPlaying = nextValidElement.id;
                console.log('Set currentPlaying to next valid element:', currentPlaying);
            }
        } else {
            // 直接设置currentPlaying为找到的元素ID
            currentPlaying = firstElement.id;
            console.log('Set currentPlaying to initial element:', currentPlaying);
        }
        
        return true;
    }
}

// 修改addTextClickListeners函数，支持iframe中的内容
function addTextClickListeners() {
    const viewer = document.getElementById('viewer');
    
    // 为直接内容添加监听器
    const paragraphs = viewer.querySelectorAll('p');
    paragraphs.forEach(p => {
        p.addEventListener('click', function() { onTextClick(this.id); });
        p.style.cursor = 'pointer';
    });
    
    // 为iframe中的内容添加监听器
    const iframes = viewer.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            iframe.onload = function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        const iframeParagraphs = iframeDoc.querySelectorAll('p');
                        iframeParagraphs.forEach(p => {
                            p.addEventListener('click', function() { onTextClick(this.id); });
                            p.style.cursor = 'pointer';
                        });
                    }
                } catch (e) {
                    console.error('Error adding listeners to iframe content:', e);
                }
            };
            
            // 立即尝试添加监听器（如果iframe已加载）
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.readyState === 'complete') {
                const iframeParagraphs = iframeDoc.querySelectorAll('p');
                iframeParagraphs.forEach(p => {
                    p.addEventListener('click', function() { onTextClick(this.id); });
                    p.style.cursor = 'pointer';
                });
            }
        } catch (e) {
            console.error('Error accessing iframe for listeners:', e);
        }
    });
}

function findFirstTextElement(container) {
    // const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
    const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
    
    for (let i = 0; i < elements.length; i++) {
        const text = elements[i].textContent.trim();
        // 确保有足够的文本内容，并且不是只包含空格或特殊字符
        if (text && text.length > 5 && /\S/.test(text)) {
            console.log('Found valid text element with content:', text.substring(0, 30) + '...');
            return elements[i];
        }
    }
    
    return null;
}


// 文本点击事件处理
function onTextClick(event) {
    synth.cancel();
    const id = event.target.id || event.target.parentNode.id;
    currentPlaying = id;
    console.log('Text clicked, playing:', id);
    playText(id);
}

// 修改playText函数，添加获取xml:lang属性并传递给speak函数
function playText(elementId) {
    console.log('Starting speech from:', elementId);
    
    // 尝试直接查找元素
    let element = document.getElementById(elementId);
    let iframeFound = false;
    let lang = null; // 存储段落的语言属性
    
    // 如果没找到，检查iframe
    if (!element) {
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
            try {
                const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (iframeDoc) {
                    element = iframeDoc.getElementById(elementId);
                    if (element) {
                        iframeFound = true;
                        console.log(`Element ${elementId} found in iframe`);
                        break;
                    }
                }
            } catch (e) {
                console.error('Error accessing iframe for element:', e);
            }
        }
    }
    
    if (element) {
        // 获取元素的xml:lang属性
        lang = element.getAttribute('xml:lang');
        if (!lang) {
            lang = 'en-US';
            console.log(`Language not found, defaulting to: ${lang}`);
        } else {
            console.log(`Found language attribute: ${lang} for element ${elementId}`);
        }
        
        // 自动滚动到要播放的元素
        scrollToElement(element, iframeFound);
        
        const text = element.textContent.trim();
        console.log('Text to speak:', text.substring(0, 50) + '...');
        
        // 如果文本为空，尝试查找下一个有内容的元素
        if (text === '') {
            console.warn(`Element ${elementId} has empty text, finding next element`);
            const nextElement = findNextElementWithText(elementId, iframeFound);
            if (nextElement) {
                playText(nextElement.id);
                return true;
            } else {
                console.error('No elements with text found');
                return false;
            }
        }
        
        speak(text, elementId, lang); // 传递语言属性给speak函数
        currentPlaying = elementId;
        return true;
    } else {
        console.error('Element not found:', elementId);
        // 尝试查找第一个可用元素
        ensureInitialElement();
        return false;
    }
}

// 优化后的滚动到指定元素函数
function scrollToElement(element, isInIframe) {
    if (!element) return;
    
    console.log(`Scrolling to element: ${element.id}`);
    
    // 检查元素是否已经在可视区域内
    if (isElementInViewport(element)) {
        console.log('Element already in viewport, no need to scroll');
        return;
    }
    
    try {
        if (isInIframe) {
            // 对于iframe中的元素，滚动iframe窗口
            const iframeDoc = element.ownerDocument;
            const iframeWindow = iframeDoc.defaultView;
            const iframeElement = iframeWindow.frameElement;
            
            if (iframeWindow) {
                console.log('Attempting to scroll iframe content');
                
                // 方法1: 直接使用元素的scrollIntoView（在iframe内部）
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('Tried element.scrollIntoView in iframe');
                
                // 方法2: 同时滚动父窗口，确保iframe本身在视口中
                setTimeout(() => {
                    if (iframeElement) {
                        iframeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        console.log('Also scrolled iframe element into view in parent window');
                    }
                }, 100);
            }
        } else {
            // 对于常规元素，滚动到顶部
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('Scrolled to element in main window');
        }
    } catch (e) {
        console.error('Error scrolling to element:', e);
        
        // 降级方案：使用更简单的滚动方法
        try {
            if (isInIframe) {
                const iframeWindow = element.ownerDocument.defaultView;
                if (iframeWindow) {
                    const rect = element.getBoundingClientRect();
                    iframeWindow.scrollTo({top: rect.top + iframeWindow.scrollY - 20, behavior: 'auto'});
                    console.log('Used fallback scroll method for iframe');
                }
            }
        } catch (fallbackError) {
            console.error('Fallback scroll method also failed:', fallbackError);
        }
    }
}

// 优化isElementInViewport函数，使其更严格地检查元素是否可见
function isElementInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    
    // 更严格的判断：要求元素至少80%在视口内
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // 计算元素在视口内的部分
    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    
    // 计算可见比例
    const visibleHeightRatio = visibleHeight / rect.height;
    const visibleWidthRatio = visibleWidth / rect.width;
    
    const isVisible = (
        visibleHeightRatio >= 0.8 &&  // 至少80%高度可见
        visibleWidthRatio >= 0.8 &&   // 至少80%宽度可见
        rect.top < viewportHeight &&  // 元素顶部在视口内
        rect.bottom > 0 &&            // 元素底部在视口内
        rect.left < viewportWidth &&  // 元素左侧在视口内
        rect.right > 0                // 元素右侧在视口内
    );
    
    console.log(`Element ${element.id} visibility check:`);
    console.log(`- Visible height ratio: ${visibleHeightRatio.toFixed(2)}`);
    console.log(`- Visible width ratio: ${visibleWidthRatio.toFixed(2)}`);
    console.log(`- Is visible: ${isVisible}`);
    
    return isVisible;
}


// 修改findNextElementWithText函数，增加可视区域检查
function findNextElementWithText(currentId, isInIframe) {
    const currentIndex = parseInt(currentId.replace('p', '')) || 0;
    let maxAttempts = 20; // 增加尝试次数，确保能找到页面上的所有元素
    let foundElements = [];
    
    // 先收集当前页面上所有有内容且在可视区域内的元素
    if (isInIframe) {
        const iframes = document.querySelectorAll('iframe');
        for (let j = 0; j < iframes.length; j++) {
            try {
                const iframeDoc = iframes[j].contentDocument || iframes[j].contentWindow.document;
                if (iframeDoc) {
                    const allElements = iframeDoc.querySelectorAll('[id^="p"]');
                    allElements.forEach(el => {
                        if (el.id && el.textContent.trim() !== '' && /\S/.test(el.textContent)) {
                            const idNum = parseInt(el.id.replace('p', '')) || 0;
                            if (idNum > currentIndex && isElementInViewport(el)) {
                                foundElements.push({id: el.id, index: idNum});
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('Error accessing iframe:', e);
            }
        }
    } else {
        const allElements = document.querySelectorAll('[id^="p"]');
        allElements.forEach(el => {
            if (el.id && el.textContent.trim() !== '' && /\S/.test(el.textContent)) {
                const idNum = parseInt(el.id.replace('p', '')) || 0;
                if (idNum > currentIndex && isElementInViewport(el)) {
                    foundElements.push({id: el.id, index: idNum});
                }
            }
        });
    }
    
    // 如果没有找到可见元素，则放宽条件，只要求元素有内容
    if (foundElements.length === 0) {
        console.log('No visible elements found, looking for any elements with content');
        
        if (isInIframe) {
            const iframes = document.querySelectorAll('iframe');
            for (let j = 0; j < iframes.length; j++) {
                try {
                    const iframeDoc = iframes[j].contentDocument || iframes[j].contentWindow.document;
                    if (iframeDoc) {
                        const allElements = iframeDoc.querySelectorAll('[id^="p"]');
                        allElements.forEach(el => {
                            if (el.id && el.textContent.trim() !== '' && /\S/.test(el.textContent)) {
                                const idNum = parseInt(el.id.replace('p', '')) || 0;
                                if (idNum > currentIndex) {
                                    foundElements.push({id: el.id, index: idNum});
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error accessing iframe:', e);
                }
            }
        } else {
            const allElements = document.querySelectorAll('[id^="p"]');
            allElements.forEach(el => {
                if (el.id && el.textContent.trim() !== '' && /\S/.test(el.textContent)) {
                    const idNum = parseInt(el.id.replace('p', '')) || 0;
                    if (idNum > currentIndex) {
                        foundElements.push({id: el.id, index: idNum});
                    }
                }
            });
        }
    }
    
    // 按ID索引排序并返回第一个元素
    if (foundElements.length > 0) {
        foundElements.sort((a, b) => a.index - b.index);
        const nextId = foundElements[0].id;
        
        // 查找实际元素
        let nextElement = document.getElementById(nextId);
        if (!nextElement && isInIframe) {
            const iframes = document.querySelectorAll('iframe');
            for (let j = 0; j < iframes.length; j++) {
                try {
                    const iframeDoc = iframes[j].contentDocument || iframes[j].contentWindow.document;
                    if (iframeDoc) {
                        nextElement = iframeDoc.getElementById(nextId);
                        if (nextElement) break;
                    }
                } catch (e) {
                    console.error('Error accessing iframe for next element:', e);
                }
            }
        }
        
        return nextElement;
    }
    
    return null;
}

// 修改speak函数，在onstart事件中添加高亮，在onend事件中移除高亮
function speak(data, elementId, lang) {
    if (synth.speaking || synth.paused) {
        console.error('Speech synthesis is already in use');
        return;
    }
    
    if (data.trim() === "") {
        console.warn('Empty text to speak');
        return;
    }
    
    console.log('Starting speech synthesis');
    const utterThis = new SpeechSynthesisUtterance(data);
    
    utterThis.onerror = function(event) {
        console.error('Speech synthesis error:', event.error);
        alert('语音合成错误：' + event.error);
        // 发生错误时移除高亮
        removeHighlight();
    };
    
    utterThis.onstart = function() {
        console.log('Speech started');
        // 在语音开始时高亮当前元素
        highlightElement(elementId);
    };
    
    utterThis.onend = function() {
        console.log('Speech ended');
        // 在语音结束时移除高亮
        removeHighlight();
        
        // 确保有有效的elementId
        if (!elementId) {
            elementId = currentPlaying || 'p0';
        }
        
        // 先检查当前元素是否在iframe中
        let element = document.getElementById(elementId);
        let iframeFound = false;
        
        if (!element) {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                    if (iframeDoc) {
                        element = iframeDoc.getElementById(elementId);
                        if (element) {
                            iframeFound = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.error('Error accessing iframe:', e);
                }
            }
        }
        
        if (!synth.paused && !synth.speaking) {
            // 使用findNextElementWithText查找下一个有内容的元素
            const nextElement = findNextElementWithText(elementId, iframeFound);
            if (nextElement) {
                currentPlaying = nextElement.id;
                playText(currentPlaying);
            } else {
                console.log('No more content on current page, trying to flip to next page');
                // 当前页面没有更多内容，尝试翻到下一页
                autoFlipToNextPage();
            }
        }
    };
    
    // 设置语音参数
    utterThis.pitch = parseFloat(pitch.value);
    utterThis.rate = parseFloat(rate.value);
    
    // 尝试使用中文语音（如果可用）
    if (voices.length > 0) {
        const speakVoice = voices.find(voice => 
            voice.lang.includes(lang) || voice.lang.includes('zh-CN')
        );
        if (speakVoice) {
            utterThis.voice = speakVoice;
        }
    }
    
    synth.speak(utterThis);
}

// 修改autoFlipToNextPage函数，增强新页面元素查找逻辑
function autoFlipToNextPage() {
    if (!rendition) {
        console.error('No rendition object available for page flipping');
        return;
    }
    
    console.log('Attempting to flip to next page');
    rendition.next().then(function() {
        console.log('Successfully flipped to next page');
        
        // 给新页面一些加载时间
        setTimeout(function() {
            // 检查新页面是否有内容
            checkForContent();
            
            // 确保有初始元素可以朗读
            ensureInitialElement();
            
            // 查找新页面上的第一个有内容的元素并开始朗读
            const firstElement = findFirstTextElementWithContent();
            if (firstElement) {
                // 检查找到的元素是否在可视区域内，如果不在，尝试找到下一个
                if (!isElementInViewport(firstElement)) {
                    console.warn('First element not in viewport, finding next visible element');
                    const visibleElement = findNextElementWithText('p-1', true); // 使用p-1确保从第一个元素开始找
                    if (visibleElement) {
                        currentPlaying = visibleElement.id;
                    } else {
                        currentPlaying = firstElement.id;
                    }
                } else {
                    currentPlaying = firstElement.id;
                }
                console.log('Starting playback from element:', currentPlaying);
                playText(currentPlaying); // 这里不需要额外修改，因为playText会自动获取lang属性
            } else {
                console.log('No content found on new page, stopping playback');
                currentPlaying = null;
            }
        }, 500); // 500毫秒延迟，确保新页面内容已加载
    }).catch(function(error) {
        console.error('Error flipping to next page:', error);
        
        // 如果翻页失败，检查是否还有其他可用章节
        try {
            if (book && book.spine && book.spine.length > 0) {
                // 尝试查找下一个章节
                const currentIndex = book.spine.indexOf(rendition.location.start.cfi);
                if (currentIndex >= 0 && currentIndex < book.spine.length - 1) {
                    console.log(`Trying to navigate to next chapter: ${currentIndex + 1}`);
                    rendition.display(book.spine[currentIndex + 1].href).then(function() {
                        console.log('Successfully navigated to next chapter');
                        setTimeout(function() {
                            checkForContent();
                            ensureInitialElement();
                            const firstElement = findFirstTextElementWithContent();
                            if (firstElement) {
                                // 检查找到的元素是否在可视区域内
                                if (!isElementInViewport(firstElement)) {
                                    console.warn('First element not in viewport, finding next visible element');
                                    const visibleElement = findNextElementWithText('p-1', true);
                                    if (visibleElement) {
                                        currentPlaying = visibleElement.id;
                                    } else {
                                        currentPlaying = firstElement.id;
                                    }
                                } else {
                                    currentPlaying = firstElement.id;
                                }
                                playText(currentPlaying);
                            }
                        }, 500);
                    }).catch(function(err) {
                        console.error('Error navigating to next chapter:', err);
                        currentPlaying = null;
                    });
                } else {
                    console.log('Reached the end of the book');
                    currentPlaying = null;
                }
            }
        } catch (e) {
            console.error('Error during fallback navigation:', e);
            currentPlaying = null;
        }
    });
}

// 修改findFirstTextElementWithContent函数，增加可视区域检查
// 修改findFirstTextElementWithContent函数，进一步放宽条件
function findFirstTextElementWithContent() {
    const viewer = document.getElementById('viewer');
    
    // 先检查直接内容（放宽条件）
    // let elements = viewer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
    let elements = viewer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
    
    for (let i = 0; i < elements.length; i++) {
        const text = elements[i].textContent.trim();
        if (text && text.length > 2 && /\S/.test(text)) { // 降低文字长度要求
            console.log('Found valid text element:', text.substring(0, 30) + '...');
            return elements[i];
        }
    }
    
    // 检查iframe（放宽条件）
    const iframes = viewer.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
        try {
            const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
            if (iframeDoc) {
                // elements = iframeDoc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
                elements = iframeDoc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
                
                for (let j = 0; j < elements.length; j++) {
                    const text = elements[j].textContent.trim();
                    if (text && text.length > 2 && /\S/.test(text)) { // 降低文字长度要求
                        console.log('Found valid text element in iframe:', text.substring(0, 30) + '...');
                        return elements[j];
                    }
                }
            }
        } catch (e) {
            console.error('Error accessing iframe for content search:', e);
        }
    }
    
    console.warn('No text elements with content found');
    return null;
}

// 填充目录
function populateTOC(toc) {
    // 先清空现有的选项，但保留默认选项
    tocSelect.innerHTML = '<option value="">-- 选择章节 --</option>';
    
    if (!Array.isArray(toc) || toc.length === 0) {
        console.warn('Empty or invalid TOC data');
        tocSelect.innerHTML = '<option value="">-- 未找到目录 --</option>';
        return;
    }
    
    toc.forEach(chapter => {
        if (chapter && chapter.label && chapter.href) {
            const option = document.createElement('option');
            option.textContent = chapter.label;
            option.value = chapter.href;
            tocSelect.appendChild(option);
        }
    });
}
// 修改翻页按钮的事件监听器，添加更新目录的逻辑
function bindEventListeners() {
    // 翻页按钮 - 使用epub.js的内置翻页功能
    nextBtn.addEventListener('click', () => {
        if (rendition) {
            rendition.next().then(() => {
                // 翻页成功后更新目录选择
                setTimeout(updateTOCSelect, 300); // 延迟执行以确保页面已加载
            }).catch(error => {
                console.error('Error going to next page:', error);
            });
        } else if (!hasActiveContent) {
            showFallbackContent();
        }
    });
    
    prevBtn.addEventListener('click', () => {
        if (rendition) {
            rendition.prev().then(() => {
                // 翻页成功后更新目录选择
                setTimeout(updateTOCSelect, 300); // 延迟执行以确保页面已加载
            }).catch(error => {
                console.error('Error going to previous page:', error);
            });
        }
    });
    
    // 其余代码保持不变
    // 音频控制按钮
    playBtn.addEventListener('click', toggleAudio);
    pauseBtn.addEventListener('click', toggleAudio);
    stopBtn.addEventListener('click', stopAudio);
    settingsBtn.addEventListener('click', toggleAudioSettings);

    // 初始化音频设置的可见性状态
    if (audioSettingsDiv) {
        // 默认隐藏音频设置
        audioSettingsDiv.style.display = 'none';
        audioSettingsVisible = false;
    }
    

    // 速度和音调控制
    pitch.onchange = function() {
        pitchValue.textContent = pitch.value;
    };
    
    rate.onchange = function() {
        rateValue.textContent = rate.value;
    };
    
    // 目录选择 - 增强的实现，确保切换章节后正确重置播放状态
    tocSelect.addEventListener('change', () => {
        const selectedHref = tocSelect.value;
        if (rendition && selectedHref) {
            console.log(`Switching to chapter: ${selectedHref}`);
            
            // 停止当前的语音播放
            synth.cancel();
            
            // 重置currentPlaying变量
            currentPlaying = null;
            
            rendition.display(selectedHref).then(function() {
                console.log('Successfully switched to selected chapter');
                
                // 给新页面一些加载时间
                setTimeout(function() {
                    // 检查新页面是否有内容
                    checkForContent();
                    
                    // 确保有初始元素可以朗读
                    ensureInitialElement();
                    
                    // 查找新页面上的第一个有内容的元素
                    const firstElement = findFirstTextElementWithContent();
                    if (firstElement) {
                        // 更新currentPlaying到新章节的第一个元素
                        currentPlaying = firstElement.id;
                        console.log('Updated currentPlaying to first element of new chapter:', currentPlaying);
                        
                        // 如果当前正在播放状态，自动从新章节开始播放
                        if (isPlaying) {
                            playText(currentPlaying);
                        }
                    }
                }, 500); // 500毫秒延迟，确保新页面内容已加载
            }).catch(error => {
                console.error('Error displaying selected chapter:', error);
                alert('切换章节失败：' + error.message);
            });
        }
    });
}

// 添加重试机制函数
// 增强attemptToStartPlayback函数，确保currentPlaying总是被设置
function attemptToStartPlayback(maxRetries, currentRetry = 0) {
    // 查找新页面上的第一个有内容的元素
    const firstElement = findFirstTextElementWithContent();
    if (firstElement) {
        // 更新currentPlaying到新章节的第一个元素
        currentPlaying = firstElement.id;
        console.log('Updated currentPlaying to first element of new chapter:', currentPlaying);
        
        // 如果当前正在播放状态，自动从新章节开始播放
        if (isPlaying) {
            console.log('Attempting to start playback (attempt ' + (currentRetry + 1) + ')');
            const success = playText(currentPlaying);
            if (!success && currentRetry < maxRetries - 1) {
                console.warn('Playback attempt failed, will retry');
                setTimeout(() => {
                    attemptToStartPlayback(maxRetries, currentRetry + 1);
                }, 300);
            }
        }
    } else if (currentRetry < maxRetries - 1) {
        console.warn('No text element found, will retry (attempt ' + (currentRetry + 1) + ')');
        // 即使没找到元素，也尝试创建一个初始元素
        ensureInitialElement();
        setTimeout(() => {
            attemptToStartPlayback(maxRetries, currentRetry + 1);
        }, 300);
    } else {
        console.error('Failed to find text element after multiple attempts');
        // 最后尝试确保有一个初始元素
        ensureInitialElement();
    }
}

// 全局变量跟踪播放状态
let isPlaying = false;

// 修改toggleAudio函数，在暂停时移除高亮，在恢复播放时重新高亮
function toggleAudio() {
    if (synth.speaking) {
        console.log('Pausing speech');
        synth.pause();
        isPlaying = false;
        // 暂停时移除高亮
        removeHighlight();
    } else if (synth.paused) {
        console.log('Resuming speech');
        synth.resume();
        isPlaying = true;
        // 恢复播放时重新高亮当前元素
        if (currentPlaying) {
            highlightElement(currentPlaying);
        }
    } else {
        console.log('Starting speech from:', currentPlaying);
        isPlaying = true;
        // 添加开始播放的逻辑 - 从currentPlaying指定的段落开始播放
        if (!currentPlaying) {
            // 如果没有指定当前播放元素，尝试找到第一个元素
            const firstElement = findFirstTextElementWithContent();
            if (firstElement) {
                currentPlaying = firstElement.id;
                playText(currentPlaying);
            } else {
                console.error('No text elements found to play');
                isPlaying = false;
            }
        } else {
            playText(currentPlaying);
        }
    }
}

// 修改stopAudio函数，在停止时移除高亮
function stopAudio() {
    console.log('Stopping speech');
    synth.cancel();
    isPlaying = false;
    // 停止播放时移除高亮
    removeHighlight();
}

// 添加一个函数来根据当前章节更新目录选择状态
function updateTOCSelect() {
    if (!rendition || !tocSelect || !tocSelect.options || tocSelect.options.length <= 1) {
        return; // 如果没有rendition、tocSelect或目录为空，直接返回
    }
    
    try {
        // 获取当前显示的章节href
        const currentLocation = rendition.location;
        if (!currentLocation || !currentLocation.start) {
            console.warn('No valid location information available');
            return;
        }
        
        // 获取当前章节的href或cfi
        let currentHref = '';
        if (currentLocation.start.href) {
            currentHref = currentLocation.start.href;
        } else if (currentLocation.start.cfi) {
            currentHref = currentLocation.start.cfi;
        }
        
        if (!currentHref) {
            console.warn('No href or cfi found in current location');
            return;
        }
        
        // 遍历目录选项，找到匹配的章节
        for (let i = 1; i < tocSelect.options.length; i++) { // 从1开始，跳过默认选项
            const option = tocSelect.options[i];
            if (option.value && (
                currentHref.includes(option.value) || 
                option.value.includes(currentHref)
            )) {
                tocSelect.selectedIndex = i;
                console.log(`Updated TOC selection to: ${option.text}`);
                return;
            }
        }
        
        console.log('No matching TOC entry found for current location');
    } catch (error) {
        console.error('Error updating TOC selection:', error);
    }
}

function toggleAudioSettings() {
    if (!audioSettingsDiv) return;
    
    // 切换可见性状态
    audioSettingsVisible = !audioSettingsVisible;
    
    // 根据状态更新显示
    if (audioSettingsVisible) {
        audioSettingsDiv.style.display = 'block';
        console.log('Audio settings shown');
    } else {
        audioSettingsDiv.style.display = 'none';
        console.log('Audio settings hidden');
    }
}

// 初始化函数
function init() {
    // 初始化语音合成
    initSpeechSynthesis();
    
    // 直接加载电子书，绕过API调用
    loadBook();
    
    // 绑定事件监听器
    bindEventListeners();

    // 初始化阅读模式
    initReadingMode();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);

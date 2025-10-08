// 添加阅读模式切换功能
function initReadingMode() {
    const readingModeSelect = document.getElementById('reading-mode');
    
    if (readingModeSelect) {
        // 获取保存的阅读模式（如果有的话）
        const savedMode = localStorage.getItem('readingMode') || 'normal';
        readingModeSelect.value = savedMode;
        applyReadingMode(savedMode);
        
        // 添加事件监听器
        readingModeSelect.addEventListener('change', function() {
            const selectedMode = this.value;
            applyReadingMode(selectedMode);
            // 保存选择到本地存储
            localStorage.setItem('readingMode', selectedMode);
        });
    }
}

// 应用阅读模式
function applyReadingMode(mode) {
    const readerSection = document.querySelector('.reader-section');
    
    if (readerSection) {
        // 移除所有可能的模式类
        readerSection.classList.remove('normal-mode', 'eye-care', 'high-contrast', 'dark');
        
        // 添加选定的模式类
        readerSection.classList.add(mode + '-mode');
        
        console.log('Reading mode changed to:', mode);
    }
}

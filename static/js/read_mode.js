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
        readerSection.classList.remove('normal-mode', 'eye-care-mode', 'high-contrast-mode', 'dark-mode');
        
        // 添加选定的模式类
        const modeClass = mode + '-mode';
        readerSection.classList.add(modeClass);
        
        console.log('Reading mode changed to:', mode);
        console.log('Applied class:', modeClass);
        console.log('Current classes:', readerSection.classList.toString());
    } else {
        console.log('Reader section not found');
    }
}

// 更新 read_mode.js 中的 initControlPanel 函数
function initControlPanel() {
    // 使用setTimeout确保DOM完全加载
    setTimeout(function() {
        const toggleButton = document.getElementById('control-panel-toggle');
        const toggleIcon = document.getElementById('toggle-icon');
        const closeButton = document.getElementById('close-panel-btn');
        const controlPanel = document.getElementById('control-panel');
        
        if (toggleButton && closeButton && controlPanel && toggleIcon) {
            // 确保控制面板默认显示
            controlPanel.classList.remove('hidden');
            toggleIcon.textContent = '✕'; // 默认显示关闭图标
            
            // 切换控制面板显示/隐藏
            toggleButton.addEventListener('click', function(e) {
                e.stopPropagation();
                // 切换隐藏状态
                if (controlPanel.classList.contains('hidden')) {
                    controlPanel.classList.remove('hidden');
                    toggleIcon.textContent = '✕'; // 更改为关闭图标
                } else {
                    controlPanel.classList.add('hidden');
                    toggleIcon.textContent = '⚙️'; // 更改为齿轮图标
                }
            });
            
            // 关闭控制面板（实际上是隐藏）
            closeButton.addEventListener('click', function(e) {
                e.stopPropagation();
                controlPanel.classList.add('hidden');
                toggleIcon.textContent = '⚙️'; // 更改为齿轮图标
            });
            
            // 点击面板外部隐藏面板
            document.addEventListener('click', function(event) {
                // 只有当面板当前是显示状态时才处理外部点击
                if (!controlPanel.classList.contains('hidden') && 
                    !controlPanel.contains(event.target) && 
                    event.target !== toggleButton) {
                    controlPanel.classList.add('hidden');
                    toggleIcon.textContent = '⚙️'; // 更改为齿轮图标
                }
            });
        } else {
            console.log('Control panel elements not found');
            console.log('Toggle button:', toggleButton);
            console.log('Close button:', closeButton);
            console.log('Control panel:', controlPanel);
            console.log('Toggle icon:', toggleIcon);
        }
    }, 100);
}


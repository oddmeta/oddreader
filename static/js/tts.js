
// 初始化语音合成
function initSpeechSynthesis() {
    // 确保语音合成API可用
    if (!synth) {
        console.error('Web Speech API is not supported in this browser.');
        alert('您的浏览器不支持Web Speech API，无法使用文本朗读功能。');
        return;
    }
    
    // 等待语音列表加载完成
    function loadVoices() {
        voices = synth.getVoices();
        console.log('Available voices:', voices.length);
    }
    
    // Chrome浏览器需要等待onvoiceschanged事件
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    
    // 立即尝试加载语音
    loadVoices();
}


// 额外添加一个测试函数，允许直接测试语音合成
function testSpeech() {
    console.log('Running speech synthesis test');
    const testUtterance = new SpeechSynthesisUtterance('语音合成测试成功');
    testUtterance.lang = 'zh-CN';
    synth.speak(testUtterance);
}

// 额外添加一个测试电子书加载的函数
function testBookLoading() {
    console.log('Testing book loading...');
    loadBook();
}

// 额外添加一个测试目录加载的函数
function testTOCLoading() {
    console.log('Testing TOC loading...');
    loadTOC();
}

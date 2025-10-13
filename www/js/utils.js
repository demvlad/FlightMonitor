function logMessage(text) {
    const logElement = document.getElementById('message-log');
    if (logElement) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${text}`;
        logElement.prepend(logEntry);
        
        // РћРіСЂР°РЅРёС‡РёРІР°РµРј Р»РѕРі 20 Р·Р°РїРёСЃСЏРјРё
        if (logElement.children.length > 20) {
            logElement.removeChild(logElement.lastChild);
        }
    } else {
        const logElement2 = document.getElementById('logBox');
        logElement2.textContent += text + "\n";
        console.log(text);
    }
}
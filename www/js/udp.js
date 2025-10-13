function setupUIHandlers() {
    document.getElementById('start-btn').addEventListener('click', startUDPListener);
    document.getElementById('stop-btn').addEventListener('click', stopUDPListener);
}

let udpSocketId = null;

function startUDPListener() {
    logMessage('🔄 Creating UDP socket...');
    // Создаем UDP сокет
    chrome.sockets.udp.create({}, function(createInfo) {
        if (!createInfo || createInfo.socketId === undefined) {
            logMessage('❌ Failed to create UDP socket: ' + chrome.runtime.lastError.message);
            return;
        }
        
        udpSocketId = createInfo.socketId;
        logMessage(`✅ UDP socket created (ID: ${udpSocketId})`);
        
        // Настраиваем обработчик входящих данных
        setupReceiveHandler();
        
        // Биндим сокет на порт
        chrome.sockets.udp.bind(udpSocketId, UDP_CONFIG.address, UDP_CONFIG.port, function(result) {
            if (result < 0) {
                logMessage('❌ Failed to bind UDP socket: ' + result);
                cleanupSocket();
                return;
            }
            
            logMessage(`✅ Listening on UDP ${UDP_CONFIG.address}:${UDP_CONFIG.port}`);
            updateUDPStatus('Listening');
            
            // Обновляем UI
            document.getElementById('start-btn').disabled = true;
            document.getElementById('stop-btn').disabled = false;
            
            // Устанавливаем размер буфера
            chrome.sockets.udp.setPaused(udpSocketId, false, function() {
                logMessage('✅ UDP receiver activated');
            });
        });
    });
}

function setupReceiveHandler() {
    // Обработчик входящих UDP пакетов
    chrome.sockets.udp.onReceive.addListener(function(receiveInfo) {
        // Проверяем что пакет от нашего сокета
        if (receiveInfo.socketId !== udpSocketId) return;
        
        try {
            // Данные приходят как ArrayBuffer
            const data = receiveInfo.data;
            handleMAVLinkData(data);
            
            // Логируем источник (опционально)
            // logMessage(`📨 From: ${receiveInfo.remoteAddress}:${receiveInfo.remotePort}`);
            
        } catch (error) {
            console.error('Error processing UDP data:', error);
            logMessage('❌ Error processing UDP data');
        }
    });
    
    // Обработчик ошибок
    chrome.sockets.udp.onReceiveError.addListener(function(errorInfo) {
        if (errorInfo.socketId === udpSocketId) {
            logMessage('❌ UDP receive error: ' + errorInfo.resultCode);
        }
    });
}

function stopUDPListener() {
    if (udpSocketId !== null) {
        logMessage('🔄 Stopping UDP listener...');
        
        chrome.sockets.udp.close(udpSocketId, function() {
            logMessage('✅ UDP listener stopped');
            cleanupSocket();
        });
    }
}

function cleanupSocket() {
    udpSocketId = null;
    updateUDPStatus('Disconnected');
    //document.getElementById('socket-id').textContent = '--';
    document.getElementById('start-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
}

function updateUDPStatus(status) {
    const element = document.getElementById('udp-status');
    if (element) {
        element.textContent = status;
        element.style.color = status === 'Listening' ? 'green' : 'red';
    } else {
        console.log(status);
    }
}
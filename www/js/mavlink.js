//MAVLink
let mavlinkParser = null;
function setupMAVLinkHandlers() {
    // Инициализируем MAVLink 2.0 парсер
    mavlinkParser = new MAVLink20Processor();
    // HEARTBEAT
    mavlinkParser.on('HEARTBEAT', function(message) {
        messageCount++;
//      updateMessageCount();
        logMessage(`💓 Heartbeat SYS:${message.sysid} COMP:${message.compid} Type:${getMAVTypeName(message.type)}`);
        updateHeartbeatDisplay(message);
    });

    // GPS данные
    mavlinkParser.on('GPS_RAW_INT', function(message) {
        logMessage(`📍 GPS Fix:${getGPSFixType(message.fix_type)} Sats:${message.satellites_visible}`);
        updateGPSDisplay(message);
    });

    // Статус системы
    mavlinkParser.on('SYS_STATUS', function(message) {
        logMessage(`🔋 System: ${message.voltage_battery / 1000}V ${message.battery_remaining || '--'}%`);
        updateBatteryDisplay(message);
    });

    // Ориентация
    mavlinkParser.on('ATTITUDE', function(message) {
        logMessage(`✈️ Attitude R:${radiansToDegrees(message.roll).toFixed(1)}° P:${radiansToDegrees(message.pitch).toFixed(1)}°`);
        updateAttitudeDisplay(message);
    });

    // Полетные данные
    mavlinkParser.on('VFR_HUD', function(message) {
        logMessage(`🛩️ Airspeed: ${message.airspeed.toFixed(1)}m/s Ground: ${message.groundspeed.toFixed(1)}m/s`);
        updateVFRDisplay(message);
    });

    // BATTERY_STATUS (MAVLink 2.0)
    mavlinkParser.on('BATTERY_STATUS', function(message) {
        logMessage(`🔋 Battery ${message.id}: ${message.battery_remaining}%`);
        updateBatteryStatusDisplay(message);
    });

    // Все сообщения для отладки
    mavlinkParser.on('message', function(message) {
        // console.log('MAVLink:', message.name);
    });
}


function handleMAVLinkData(arrayBuffer) {
    if (!mavlinkParser) return;
    
    try {
        // Конвертируем ArrayBuffer в Uint8Array
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Парсим MAVLink сообщения
        const messages = mavlinkParser.parseBuffer(uint8Array);
        
        // Сообщения автоматически обрабатываются через event handlers
        
    } catch (error) {
        console.error('MAVLink parsing error:', error);
        logMessage('❌ MAVLink parsing error');
    }
}

function addToTelemetryBuffer(message) {
    // Фильтруем только важные сообщения
    const importantMessages = ['HEARTBEAT', 'GPS_RAW_INT', 'ATTITUDE', 'VFR_HUD', 'SYS_STATUS', 'BATTERY_STATUS'];
    
    if (importantMessages.includes(message.name)) {
        telemetryBuffer.push({
            type: message.name,
            timestamp: Date.now(),
            data: message,
            systemId: message.sysid
        });
        
        // Ограничиваем размер буфера
        if (telemetryBuffer.length > 1000) {
            telemetryBuffer.shift();
        }
        
        //updateBufferDisplay();
    }
}


// Функции обновления отображения
function updateHeartbeatDisplay(message) {
    const element = document.getElementById('heartbeat-display');
    if (element) {
        element.innerHTML = `
            💓 Система ${message.sysid} | 
            Тип: ${getMAVTypeName(message.type)} | 
            Статус: ${getSystemStatusName(message.system_status)}
        `;
    }
}

function updateGPSDisplay(message) {
    const element = document.getElementById('gps-display');
    if (element) {
        element.innerHTML = `
            📍 Фикс: ${getGPSFixType(message.fix_type)} | 
            Спутников: ${message.satellites_visible} | 
            Широта: ${(message.lat / 1e7).toFixed(6)} | 
            Долгота: ${(message.lon / 1e7).toFixed(6)}
        `;
    }
}

function updateBatteryDisplay(message) {
    const element = document.getElementById('battery-display');
    if (element) {
        element.innerHTML = `
            🔋 ${message.voltage_battery / 1000}В | 
            ${message.current_battery / 100}А | 
            ${message.battery_remaining || '--'}%
        `;
    }
}

function updateAttitudeDisplay(message) {
    const element = document.getElementById('attitude-display');
    if (element) {
        element.innerHTML = `
            ✈️ Крен: ${radiansToDegrees(message.roll).toFixed(1)}° | 
            Тангаж: ${radiansToDegrees(message.pitch).toFixed(1)}° | 
            Рыскание: ${radiansToDegrees(message.yaw).toFixed(1)}°
        `;
    }
}

function updateVFRDisplay(message) {
    const element = document.getElementById('vfr-display');
    if (element) {
        element.innerHTML = `
            🛩️ Воздушная: ${message.airspeed.toFixed(1)}м/с | 
            Земная: ${message.groundspeed.toFixed(1)}м/с | 
            Высота: ${message.alt.toFixed(1)}м
        `;
    }
}

function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

// ��������� �������� ���� ��� �������� MAVLink
function getMAVTypeName(type) {
    const types = {
        0: 'Generic',
        1: 'Fixed Wing', 
        2: 'Quadrotor',
        3: 'Coaxial',
        4: 'Helicopter',
        // �������� ������ ���� �� �������������
    };
    return types[type] || `Unknown (${type})`;
}

function getAutopilotName(autopilot) {
    const autopilots = {
        0: 'Generic',
        3: 'ArduPilot',
        4: 'OpenPilot',
        8: 'PX4',
        12: 'BetaFlight'
    };
    return autopilots[autopilot] || `Unknown (${autopilot})`;
}

function getSystemStatusName(status) {
    const statuses = {
        0: 'Uninit',
        1: 'Booting',
        2: 'Calibrating',
        3: 'Standby', 
        4: 'Active',
        5: 'Critical',
        6: 'Emergency',
        7: 'Poweroff'
    };
    return statuses[status] || `Unknown (${status})`;
}

function updateBatteryStatusDisplay(message) {
    const element = document.getElementById('battery-status');
    if (element) {
        const voltages = message.voltages.slice(0, 4).filter(v => v !== 65535);
        const avgVoltage = voltages.length > 0 ? 
            voltages.reduce((a, b) => a + b) / voltages.length / 1000 : 0;
            
        element.innerHTML = `
            Battery ${message.id}: ${avgVoltage.toFixed(2)}V | 
            Temp: ${message.temperature}C | 
            Current: ${(message.current_battery / 100).toFixed(1)}A
        `;
    }
}

function updateQuaternionDisplay(message) {
    const euler = quaternionToEuler(message.q1, message.q2, message.q3, message.q4);
    const element = document.getElementById('attitude-quaternion');
    if (element) {
        element.innerHTML = `
            Roll: ${euler.roll.toFixed(1)}� | 
            Pitch: ${euler.pitch.toFixed(1)}� | 
            Yaw: ${euler.yaw.toFixed(1)}�
        `;
    }
}

function getMAVTypeName(type) {
    const types = {
        0: 'Generic', 1: 'Fixed Wing', 2: 'Quadrotor', 3: 'Coaxial',
        4: 'Helicopter', 5: 'Antenna Tracker', 6: 'GCS', 7: 'Airship',
        8: 'Free Balloon', 9: 'Rocket', 10: 'Ground Rover', 11: 'Surface Boat',
        12: 'Submarine', 13: 'Hexarotor', 14: 'Octorotor', 15: 'Tricopter',
        16: 'Flapping Wing', 17: 'Kite', 18: 'Onboard Companion', 19: 'Two'
    };
    return types[type] || `Unknown (${type})`;
}



function getGPSFixType(fixType) {
    const fixes = {
        0: 'No GPS', 1: 'No Fix', 2: '2D Fix', 3: '3D Fix',
        4: 'DGPS', 5: 'RTK Float', 6: 'RTK Fixed'
    };
    return fixes[fixType] || `Unknown (${fixType})`;
}
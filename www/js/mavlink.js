//MAVLink
let mavlinkParser = new MAVLink20Processor();
let flightData = new Map();
let uiData = new Map();

 /*
function setupMAVLinkHandlers() {
    // Ð˜Ð½Ð¸Ñ†Ð¸Ð°Ð»Ð¸Ð·Ð¸Ñ€ÑƒÐµÐ¼ MAVLink 2.0 Ð¿Ð°Ñ€ÑÐµÑ€
    mavlinkParser =
    // HEARTBEAT
    mavlinkParser.on('HEARTBEAT', function(message) {
        updateHeartbeatDisplay(message);
    });

    // GPS Ð´Ð°Ð½Ð½Ñ‹Ðµ
    mavlinkParser.on('GPS_RAW_INT', function(message) {
        updateGPSDisplay(message);
    });

    // Ð¡Ñ‚Ð°Ñ‚ÑƒÑ ÑÐ¸ÑÑ‚ÐµÐ¼Ñ‹
    mavlinkParser.on('SYS_STATUS', function(message) {
        updateBatteryDisplay(message);
    });

    // ÐžÑ€Ð¸ÐµÐ½Ñ‚Ð°Ñ†Ð¸Ñ
    mavlinkParser.on('ATTITUDE', function(message) {
        logMessage(`âœˆï¸ Attitude R:${radiansToDegrees(message.roll).toFixed(1)}Â° P:${radiansToDegrees(message.pitch).toFixed(1)}Â°`);
        updateAttitudeDisplay(message);
    });
}
*/

function shouldProcessPacket(parsed) {
    const allowedTypes = [
        'GPS_RAW_INT',
        'SYS_STATUS',
        'ATTITUDE',
        'HEARTBEAT',
        'BATTERY_STATUS',
        'VFR_HUD',
        'RC_CHANNELS_RAW',
    ];

    return allowedTypes.includes(parsed.name)
}

function handleMAVLinkData(arrayBuffer) {
    if (!mavlinkParser) return;

    try {
        // ÐšÐ¾Ð½Ð²ÐµÑ€Ñ‚Ð¸Ñ€ÑƒÐµÐ¼ ArrayBuffer Ð² Uint8Array
        const uint8Array = new Uint8Array(arrayBuffer);

        // ÐŸÐ°Ñ€ÑÐ¸Ð¼ MAVLink ÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ñ
        const messages = mavlinkParser.parseBuffer(uint8Array);
        for (const mavMessage of messages) {
            if (shouldProcessPacket(mavMessage)) {
                for (const [key, value] of Object.entries(mavMessage)) {
                    flightData.set(key, value);
                }
            }
        }
    } catch (error) {
        console.error('MAVLink parsing error:', error);
        logMessage(error);
    }
}

function getUIData() {
    return Object.fromEntries(uiData);
}

function updateUIData() {
    uiData = new Map(flightData);
}

function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

// Ïîëó÷åíèå ÷èòàåìûõ èìåí äëÿ êîíñòàíò MAVLink
function getMAVTypeName(type) {
    const types = {
        0: 'Generic',
        1: 'Fixed Wing',
        2: 'Quadrotor',
        3: 'Coaxial',
        4: 'Helicopter',
        // Äîáàâüòå äðóãèå òèïû ïî íåîáõîäèìîñòè
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
/*
        const voltages = message.voltages.slice(0, 4).filter(v => v !== 65535);
        const avgVoltage = voltages.length > 0 ?
            voltages.reduce((a, b) => a + b) / voltages.length / 1000 : 0;

        element.innerHTML = `
            Battery ${message.id}: ${avgVoltage.toFixed(2)}V |
            Temp: ${message.temperature}C |
            Current: ${(message.current_battery / 100).toFixed(1)}A
        `;
*/
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
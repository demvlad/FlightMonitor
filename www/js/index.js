/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready



        class MAVLinkApp {
            constructor() {
                this.currentTab = 'auth-tab';
                this.map = null;
                this.userMarker = null;
                this.droneMarker = null;
                this.userPosition = null;
                this.dronePosition = null;
                this.trackLayer = null;
                this.followDrone = false;
                this.autoScroll = true;

                this.isCordova = typeof window.cordova !== 'undefined';

                // Ждем готовности Cordova
                if (this.isCordova) {
                    document.addEventListener('deviceready', () => this.init(), false);
                } else {
                    this.init();
                }
            }

            init() {
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.switchTab(btn.dataset.tab);
                    });
                });

                document.getElementById('login-btn').addEventListener('click', () => {
                    this.handleLogin();
                });

                this.loadSavedData();
                this.initMap();
                this.getUserLocation();
                this.startMAVLinkConnection();

                // Cordova специфичные настройки
                if (this.isCordova) {
                    this.setupCordovaEvents();
                }
            }

            setupCordovaEvents() {
                // Пауза при сворачивании приложения
                document.addEventListener('pause', () => {
                    this.addLog('Приложение свернуто', 'warning');
                    this.pauseMAVLinkConnection();
                }, false);

                // Возобновление при разворачивании
                document.addEventListener('resume', () => {
                    this.addLog('Приложение восстановлено', 'success');
                    this.resumeMAVLinkConnection();
                }, false);

                // Кнопка назад на Android
                document.addEventListener('backbutton', () => {
                    this.handleBackButton();
                }, false);
            }

            handleBackButton() {
                // Выход из приложения при двойном нажатии назад
                if (this.currentTab === 'map-tab') {
                    navigator.app.exitApp();
                } else {
                    this.switchTab('map-tab');
                }
            }

            getUserLocation() {
                if (this.isCordova) {
                    // Используем Cordova Geolocation API
                    this.getCordovaLocation();
                } else {
                    // Используем браузерный API
                    this.getBrowserLocation();
                }
            }

            getCordovaLocation() {
                const onSuccess = (position) => {
                    this.userPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.updateUserMarker();
                    this.addLog('Местоположение получено через Cordova', 'success');
                };

                const onError = (error) => {
                    this.addLog('Ошибка геолокации: ' + error.message, 'error');
                    // Резервная позиция
                    this.userPosition = { lat: 55.7558, lng: 37.6173 };
                    this.updateUserMarker();
                };

                const options = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                };

                navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

                // Следим за изменениями позиции
                this.watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        this.userPosition = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        this.updateUserMarker();
                    },
                    onError,
                    options
                );
            }

            getBrowserLocation() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            this.userPosition = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };
                            this.updateUserMarker();
                            this.addLog('Местоположение получено', 'success');
                        },
                        (error) => {
                            this.addLog('Ошибка геолокации: ' + error.message, 'error');
                            this.userPosition = { lat: 55.7558, lng: 37.6173 };
                            this.updateUserMarker();
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 60000
                        }
                    );
                }
            }

            updateUserMarker() {
                if (!this.userPosition || typeof L === "undefined") return;

                if (!this.userMarker) {
                    this.userMarker = L.marker([this.userPosition.lat, this.userPosition.lng], {
                        icon: L.divIcon({
                            className: 'user-marker',
                            html: '👤',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(this.map);

                    this.userMarker.bindPopup("<b>Ваше местоположение</b>").openPopup();
                } else {
                    this.userMarker.setLatLng([this.userPosition.lat, this.userPosition.lng]);
                }

                this.updateUserPositionDisplay();
            }

            startMAVLinkConnection() {
                this.initUDPConnection();
                this.startUIUpdateLoop();
            }

            initUDPConnection() {
                startUDPListener();
            }

            pauseMAVLinkConnection() {
                // Приостановка UDP соединения при паузе
                stopUDPListener();
            }

            resumeMAVLinkConnection() {
                // Восстановление UDP соединения
                startUDPListener();
            }

            initMap() {
                if (typeof L == "undefined") {
                    console.log("Map not found");
                    return;
                }
                this.map = L.map('map').setView([55.7558, 37.6173], 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.map);

                this.trackLayer = L.layerGroup().addTo(this.map);

                this.addLog('Карта инициализирована', 'success');
            }


            updateDronePosition(lat, lng) {
                if (typeof L === "undefined") {
                    return;
                }
                this.dronePosition = { lat, lng };

                if (!this.droneMarker) {
                    this.droneMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'drone-marker',
                            html: '🚁',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(this.map);

                    this.droneMarker.bindPopup("<b>Квадрокоптер</b>");
                } else {
                    this.droneMarker.setLatLng([lat, lng]);
                }

                L.circleMarker([lat, lng], {
                    radius: 2,
                    color: '#ff4444',
                    fillColor: '#ff4444',
                    fillOpacity: 0.7
                }).addTo(this.trackLayer);

                if (this.followDrone) {
                    this.map.setView([lat, lng], this.map.getZoom());
                }

                this.updateDronePositionDisplay();
                this.calculateDistance();
            }

            updateUserPositionDisplay() {
                if (this.userPosition) {
                    document.getElementById('param-my-pos').textContent =
                        `${this.userPosition.lat.toFixed(6)}, ${this.userPosition.lng.toFixed(6)}`;
                }
            }

            updateDronePositionDisplay() {
                if (this.dronePosition) {
                    document.getElementById('param-drone-pos').textContent =
                        `${this.dronePosition.lat.toFixed(6)}, ${this.dronePosition.lng.toFixed(6)}`;
                }
            }

            calculateDistance() {
                if (this.userPosition && this.dronePosition) {
                    const R = 6371;
                    const dLat = (this.dronePosition.lat - this.userPosition.lat) * Math.PI / 180;
                    const dLon = (this.dronePosition.lng - this.userPosition.lng) * Math.PI / 180;
                    const a =
                        Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(this.userPosition.lat * Math.PI / 180) * Math.cos(this.dronePosition.lat * Math.PI / 180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const distance = R * c;

                    document.getElementById('param-distance').textContent = distance.toFixed(2) + ' км';

                    const y = Math.sin(dLon) * Math.cos(this.dronePosition.lat * Math.PI / 180);
                    const x = Math.cos(this.userPosition.lat * Math.PI / 180) * Math.sin(this.dronePosition.lat * Math.PI / 180) -
                              Math.sin(this.userPosition.lat * Math.PI / 180) * Math.cos(this.dronePosition.lat * Math.PI / 180) * Math.cos(dLon);
                    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

                    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
                    const index = Math.round(bearing / 45) % 8;
                    document.getElementById('param-direction').textContent = directions[index] + ` (${Math.round(bearing)}°)`;
                }
            }

            startUIUpdateLoop() {
                setInterval(() => {
                    updateUIData();
                    this.renderUI();
                }, 100);
            }

            renderUI() {
                const data = getUIData();
                this.updateDronePosition(data.lat ?? 0, data.lon ?? 0);
                   
                updateElement('param-lat', data.lat, v => (v / 1e7).toFixed(6));
                updateElement('param-lon', data.lon, v => (v / 1e7).toFixed(6));
                updateElement('param-alt', data.alt, v => (v / 1e3).toFixed(1));
                updateElement("param-sats", data.satellites_visible);
                updateElement("param-speed", data.vel, v => (v / 1e2).toFixed(1) + ' m/s');
                
                updateElement("param-yaw", data.yaw, v => radiansToDegrees(v).toFixed(0) + '°');
                updateElement("param-pitch", data.pitch, v => radiansToDegrees(v).toFixed(1) + '°');
                updateElement("param-roll", data.roll, v => radiansToDegrees(v).toFixed(1) + '°');

//              document.getElementById('param-mode').textContent = mockData.mode;
                
//              updateElement("fixType", data.fix_type, getGPSFixType);
//              updateElement("craftType", data.type, getMAVTypeName);

                updateElement("param-voltage", data.voltage_battery, v => (v / 1e3).toFixed(1) + 'V');
                updateElement("param-current", data.current_battery, v => (v / 1e2).toFixed(1) + 'A');
                updateElement("param-battery", data.battery_remaining, v => v  + '%');
            }

            switchTab(tabId) {
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                document.getElementById(tabId).classList.add('active');
                document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

                this.currentTab = tabId;
                this.onTabChange(tabId);
            }

            onTabChange(tabId) {
                switch(tabId) {
                    case 'map-tab':
                        setTimeout(() => {
                            if (this.map) {
                                this.map.invalidateSize();
                            }
                        }, 100);
                        break;
                    case 'params-tab':
                        this.updateParameters();
                        break;
                }
            }

            handleLogin() {
                const login = document.getElementById('login-input').value;
                const password = document.getElementById('password-input').value;
                const server = document.getElementById('server-input').value;

                if (!login || !password) {
                    this.addLog('Ошибка: Заполните все поля', 'error');
                    return;
                }

                this.addLog(`Попытка авторизации: ${login}@${server}`, 'info');

                localStorage.setItem('mavlink-login', login);
                localStorage.setItem('mavlink-server', server);

                setTimeout(() => {
                    this.addLog('Авторизация успешна!', 'success');
                    this.addLog('Подключение к БПЛА...', 'info');

                    setTimeout(() => {
                        this.switchTab('map-tab');
                    }, 1000);
                }, 1500);
            }

            addLog(message, type = 'info') {
                const logContent = document.getElementById('log-content');
                const timestamp = new Date().toLocaleString('ru-RU');
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.innerHTML = `
                    <span class="log-timestamp">[${timestamp}]</span>
                    <span class="log-${type}">${message}</span>
                `;

                logContent.appendChild(logEntry);

                if (this.autoScroll) {
                    logContent.scrollTop = logContent.scrollHeight;
                }
            }

            loadSavedData() {
                const savedLogin = localStorage.getItem('mavlink-login');
                const savedServer = localStorage.getItem('mavlink-server');

                if (savedLogin) {
                    document.getElementById('login-input').value = savedLogin;
                }
                if (savedServer) {
                    document.getElementById('server-input').value = savedServer;
                }
            }
        }

        function centerOnDrone() {
            if (window.app.dronePosition) {
                window.app.map.setView([window.app.dronePosition.lat, window.app.dronePosition.lng]);
                window.app.addLog('Карта отцентрирована на квадрокоптере', 'info');
            }
        }

        function centerOnUser() {
            if (window.app.userPosition) {
                window.app.map.setView([window.app.userPosition.lat, window.app.userPosition.lng]);
                window.app.addLog('Карта отцентрирована на вашем местоположении', 'info');
            }
        }

        function toggleFollowDrone() {
            window.app.followDrone = !window.app.followDrone;
            const btn = document.querySelector('[onclick="toggleFollowDrone()"]');
            btn.textContent = `Следовать за дроном: ${window.app.followDrone ? 'Вкл' : 'Выкл'}`;
            window.app.addLog(`Следование за дроном: ${window.app.followDrone ? 'включено' : 'выключено'}`, 'info');
        }

        function clearTrack() {
            if (window.app.trackLayer) {
                window.app.trackLayer.clearLayers();
                window.app.addLog('Трек полета очищен', 'warning');
            }
        }

        function clearLog() {
            document.getElementById('log-content').innerHTML = '';
            window.app.addLog('Журнал очищен', 'warning');
        }

        function exportLog() {
            window.app.addLog('Экспорт журнала...', 'info');
        }

        function toggleAutoScroll() {
            window.app.autoScroll = !window.app.autoScroll;
            const btn = document.querySelector('[onclick="toggleAutoScroll()"]');
            btn.textContent = `Автопрокрутка: ${window.app.autoScroll ? 'Вкл' : 'Выкл'}`;
            window.app.addLog(`Автопрокрутка: ${window.app.autoScroll ? 'включена' : 'выключена'}`, 'info');
        }
        
        function logMessage(text) {
            console.log(text);
        }
        
        function updateElement(elementId, value, formatter = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if(typeof value === 'function') {
            element.textContent = value();
        } else if (value != null && value !== undefined) {
            element.textContent = formatter ? formatter(value) : value;
        } else {
            element.textContent = '--';
        }
}

        document.addEventListener('DOMContentLoaded', () => {
            window.app = new MAVLinkApp();
        });

        document.addEventListener('deviceready', function() {
            console.log('Cordova готов');
            window.app = new MAVLinkApp();
        }, false);


    // Для отладки в браузере
    if (typeof cordova === 'undefined') {
        window.app = new MAVLinkApp();
    }








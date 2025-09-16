(function () {
        'use strict';
        
        const elements = {
            widget: document.getElementById('fh-chat'),
            header: document.getElementById('fh-chat-header'),
            messages: document.getElementById('fh-messages'),
            input: document.getElementById('fh-input'),
            sendBtn: document.getElementById('fh-send'),
            minimizeBtn: document.getElementById('fh-chat-minimize'),
            closeBtn: document.getElementById('fh-chat-close'),
            typing: document.getElementById('fh-typing'),
            errorBox: document.getElementById('fh-error'),
            statusIndicator: document.getElementById('fh-connection-status'),
            statusText: document.getElementById('fh-status-text'),
            messageCount: document.getElementById('fh-message-count')
        };

        const state = {
            isMinimized: false,
            isConnected: true,
            messageCount: 0,
            sessionId: null,
            retryCount: 0,
            maxRetries: 3
        };

        const config = {
            apiEndpoint: '/chat/api',
            maxMessageLength: 2000,
            retryDelay: 2000,
            typingDelay: 300,
            errorDisplayTime: 7000
        };

        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return String(unsafe)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function generateSessionId() {
            if (!state.sessionId) {
                state.sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
            }
            return state.sessionId;
        }

        function updateConnectionStatus(isConnected) {
            state.isConnected = isConnected;
            elements.statusIndicator.className = `fh-connection-status ${isConnected ? 'online' : 'offline'}`;
            elements.statusText.textContent = isConnected ? 'Online' : 'Offline';
        }

        function updateMessageCount() {
            state.messageCount++;
            elements.messageCount.textContent = state.messageCount;
        }

        function autoResizeTextarea() {
            elements.input.style.height = 'auto';
            const scrollHeight = elements.input.scrollHeight;
            const maxHeight = 120; 
            elements.input.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }

        function appendMessage(role, text, meta = '', sources = []) {
            const wrapper = document.createElement('div');
            wrapper.className = `fh-message fh-message-${role.toLowerCase()}`;
            
            let sourcesHtml = '';
            if (sources && sources.length > 0) {
                sourcesHtml = '<div class="fh-sources">' +
                    sources.map(s => `<div class="fh-source">📎 ${escapeHtml(s.source || 'Source')}: ${escapeHtml((s.snippet || s.text || '').slice(0, 100))}${(s.snippet || s.text || '').length > 100 ? '...' : ''}</div>`).join('') +
                    '</div>';
            }

            wrapper.innerHTML = `
                <div class="fh-role">${escapeHtml(role)}</div>
                <div class="fh-text">${text}${sourcesHtml}</div>
                ${meta ? `<div class="fh-meta">${escapeHtml(meta)}</div>` : ''}
            `;
            
            elements.messages.appendChild(wrapper);
            elements.messages.scrollTop = elements.messages.scrollHeight;
            
            if (role.toLowerCase() !== 'system') {
                updateMessageCount();
            }
            
            return wrapper;
        }

        function showError(message, duration = config.errorDisplayTime) {
            elements.errorBox.style.display = 'block';
            elements.errorBox.textContent = message;
            
            setTimeout(() => {
                elements.errorBox.style.display = 'none';
            }, duration);
        }

        function setLoading(loading) {
            elements.input.disabled = loading;
            elements.sendBtn.disabled = loading;
            elements.typing.style.display = loading ? 'inline' : 'none';
            
            if (loading) {
                elements.sendBtn.innerHTML = '⋯';
            } else {
                elements.sendBtn.innerHTML = '➤';
            }
        }

        async function sendMessage() {
            const text = elements.input.value.trim();
            if (!text) return;
            if (text.length > config.maxMessageLength) {
                showError(`Message too long. Maximum ${config.maxMessageLength} characters allowed.`);
                return;
            }

            elements.input.value = '';
            autoResizeTextarea();
            elements.errorBox.style.display = 'none';

            appendMessage('You', escapeHtml(text));
            const botMessage = appendMessage('Assistant', '<em>Thinking...</em>');

            setLoading(true);
            state.retryCount = 0;

            const payload = {
                message: text,
                session_id: generateSessionId()
            };

            while (true) {
                try {
                    const response = await fetch(config.apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    let data = {};
                    try {
                        data = await response.json();
                    } catch (e) {
                        throw new Error(`Invalid response from server (status ${response.status})`);
                    }

                    if (!response.ok) {
                        throw new Error(data.error || data.details || `Server error ${response.status}`);
                    }

                    const botTextElement = botMessage.querySelector('.fh-text');
                    botTextElement.innerHTML = escapeHtml(data.answer || 'Sorry, I couldn\'t generate a response.');

                    if (data.sources && data.sources.length > 0) {
                        const sourcesHtml = '<div class="fh-sources">' +
                            data.sources.map(s =>
                                `<div class="fh-source">📎 ${escapeHtml(s.source || 'Source')}: ${escapeHtml((s.snippet || s.text || '').slice(0, 100))}${(s.snippet || s.text || '').length > 100 ? '...' : ''}</div>`
                            ).join('') + '</div>';
                        botTextElement.innerHTML += sourcesHtml;
                    }

                    if (data.request_id) {
                        const timestamp = new Date().toLocaleTimeString();
                        const metaElement = botMessage.querySelector('.fh-meta') || document.createElement('div');
                        metaElement.className = 'fh-meta';
                        metaElement.textContent = `${timestamp} • ${data.request_id.slice(-8)}`;
                        if (!botMessage.querySelector('.fh-meta')) {
                            botMessage.appendChild(metaElement);
                        }
                    }

                    updateConnectionStatus(true);
                    state.retryCount = 0;
                    break;

                } catch (error) {
                    console.error('Chat error:', error);

                    state.retryCount++;
                    if (state.retryCount <= state.maxRetries) {
                        const botTextElement = botMessage.querySelector('.fh-text');
                        botTextElement.innerHTML = `<em>Connection issue, retrying... (${state.retryCount}/${state.maxRetries})</em>`;
                        await new Promise(r => setTimeout(r, config.retryDelay));
                        continue;
                    } else {
                        const botTextElement = botMessage.querySelector('.fh-text');
                        botTextElement.innerHTML = '<span style="color: #dc3545;">❌ Sorry, I\'m having trouble connecting. Please try again later.</span>';
                        state.retryCount = 0;
                        updateConnectionStatus(false);
                        showError(error.message || 'Failed to send message. Please try again.');
                        break;
                    }
                } finally {
                    setLoading(false);
                }
            }
        }

        function toggleMinimize() {
            state.isMinimized = !state.isMinimized;
            elements.widget.classList.toggle('fh-minimized', state.isMinimized);
            elements.minimizeBtn.textContent = state.isMinimized ? '+' : '−';
            elements.minimizeBtn.title = state.isMinimized ? 'Expand' : 'Minimize';
            
            try {
                localStorage.setItem('fh_chat_minimized', state.isMinimized.toString());
            } catch (e) {
            }
        }

        function closeChat() {
            elements.widget.style.display = 'none';
            
            try {
                localStorage.setItem('fh_chat_closed', 'true');
            } catch (e) {
            }
        }

        function loadChatState() {
            try {
                const isMinimized = localStorage.getItem('fh_chat_minimized') === 'true';
                const isClosed = localStorage.getItem('fh_chat_closed') === 'true';
                
                if (isClosed) {
                    elements.widget.style.display = 'none';
                    return;
                }
                
                if (isMinimized) {
                    state.isMinimized = true;
                    elements.widget.classList.add('fh-minimized');
                    elements.minimizeBtn.textContent = '+';
                    elements.minimizeBtn.title = 'Expand';
                }
            } catch (e) {
            }
        }

        elements.sendBtn.addEventListener('click', sendMessage);
        elements.minimizeBtn.addEventListener('click', toggleMinimize);
        elements.closeBtn.addEventListener('click', closeChat);
        elements.header.addEventListener('click', (e) => {
            if (e.target === elements.header || e.target.tagName === 'H4' || e.target.className.includes('fh-chat-status')) {
                toggleMinimize();
            }
        });

        elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        elements.input.addEventListener('input', () => {
            autoResizeTextarea();
            
            const remaining = config.maxMessageLength - elements.input.value.length;
            if (remaining < 100) {
                elements.input.style.borderColor = remaining < 0 ? '#dc3545' : '#ffc107';
            } else {
                elements.input.style.borderColor = '#e9ecef';
            }
        });

        elements.input.addEventListener('paste', (e) => {
            setTimeout(() => {
                autoResizeTextarea();
                if (elements.input.value.length > config.maxMessageLength) {
                    elements.input.value = elements.input.value.slice(0, config.maxMessageLength);
                    showError('Message was truncated to maximum length');
                }
            }, 0);
        });

        function checkConnection() {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            fetch('/chat/health', { method: 'GET', signal: controller.signal })
                .then(response => {
                    updateConnectionStatus(response.ok);
                })
                .catch(() => {
                    updateConnectionStatus(false);
                })
                .finally(() => {
                    clearTimeout(timeout);
                });
        }


        setInterval(checkConnection, 30000); 

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkConnection();
            }
        });

        window.addEventListener('online', () => updateConnectionStatus(true));
        window.addEventListener('offline', () => updateConnectionStatus(false));

        loadChatState();
        autoResizeTextarea();
        
        setTimeout(checkConnection, 1000);

        setTimeout(() => {
            if (state.messageCount === 0 && !state.isMinimized) {
                const welcomeBot = appendMessage('Assistant', 'Hello! I\'m your FeedHope assistant. How can I help you today? 😊');
                welcomeBot.querySelector('.fh-role').textContent = 'System';
            }
        }, 2000);
})();
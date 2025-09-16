const express = require('express');
const router = express.Router();
const fetch = global.fetch || require('node-fetch');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const config = {
  RAG_API_URL: process.env.RAG_API_URL || 'https://rag-chatbot-uvwl.onrender.com/chat',
  RAG_API_KEY: process.env.RAG_API_KEY || '',
  TIMEOUT_MS: parseInt(process.env.CHAT_TIMEOUT_MS) || 30000,
  MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH) || 2000,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 2,
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS) || 1000
};

const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many chat requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const validateChatInput = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'Message is required and must be a string'
    });
  }
  if (message.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'Message cannot be empty'
    });
  }
  if (message.length > config.MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: 'Message too long',
      details: `Message must be less than ${config.MAX_MESSAGE_LENGTH} characters`
    });
  }
  const suspiciousPatterns = [
    /script\s*>/i,
    /<\s*iframe/i,
    /javascript\s*:/i
  ];
  if (suspiciousPatterns.some(pattern => pattern.test(message))) {
    return res.status(400).json({
      error: 'Invalid content',
      details: 'Message contains potentially harmful content'
    });
  }
  next();
};

function stripSourcesText(answerText) {
  if (!answerText || typeof answerText !== 'string') return answerText;
  const sourcePatterns = [
    /\n\s*Sources\s*:/i,
    /\n\s*References\s*:/i,
    /\n\s*Citations\s*:/i
  ];
  for (const pattern of sourcePatterns) {
    const idx = answerText.search(pattern);
    if (idx !== -1) {
      return answerText.slice(0, idx).trim();
    }
  }
  return answerText;
}

function generateSessionId(req) {
  return (req.user?.id) ||
         (req.session?.userId) ||
         (req.body?.session_id) ||
         `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createTimeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, maxRetries = config.MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.info(`[chat-proxy] Attempt ${attempt + 1}/${maxRetries + 1} to ${url}`);
      const fetchPromise = fetch(url, {
        ...options,
        signal: AbortSignal.timeout(config.TIMEOUT_MS)
      });
      const response = await Promise.race([
        fetchPromise,
        createTimeoutPromise(config.TIMEOUT_MS)
      ]);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error;
      console.warn(`[chat-proxy] Attempt ${attempt + 1} failed:`, error.message);
      if (error.name === 'AbortError' ||
          error.message.includes('timeout') ||
          (error.response && error.response.status < 500)) {
        break;
      }
      if (attempt < maxRetries) {
        const delay = config.RETRY_DELAY_MS * Math.pow(2, attempt);
        console.info(`[chat-proxy] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

router.use((req, res, next) => {
  const start = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  req.requestId = requestId;
  console.info(`[chat-proxy] ${requestId} - ${req.method} ${req.path} - Start`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.info(`[chat-proxy] ${requestId} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

router.use(chatRateLimit);

router.post('/api', validateChatInput, async (req, res) => {
  const requestId = req.requestId;
  try {
    const { message } = req.body;
    const sessionId = generateSessionId(req);
    console.info(`[chat-proxy] ${requestId} - Processing message for session: ${sessionId}`);
    console.debug(`[chat-proxy] ${requestId} - Message preview: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`);
    const upstreamPayload = {
      message: message.trim(),
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      request_id: requestId
    };
    const upstreamOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FeedHope-ChatProxy/1.0',
        ...(config.RAG_API_KEY ? { 'x-api-key': config.RAG_API_KEY } : {}),
        ...(config.RAG_API_KEY ? { 'Authorization': `Bearer ${config.RAG_API_KEY}` } : {})
      },
      body: JSON.stringify(upstreamPayload)
    };
    console.info(`[chat-proxy] ${requestId} - Forwarding to upstream: ${config.RAG_API_URL}`);
    const upstreamResponse = await fetchWithRetry(config.RAG_API_URL, upstreamOptions);
    const upstreamText = await upstreamResponse.text();
    console.info(`[chat-proxy] ${requestId} - Upstream response status: ${upstreamResponse.status}`);
    console.debug(`[chat-proxy] ${requestId} - Upstream response preview: ${upstreamText.slice(0, 200)}${upstreamText.length > 200 ? '...' : ''}`);
    if (!upstreamResponse.ok) {
      const errorResponse = {
        error: 'Upstream service error',
        status: upstreamResponse.status,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };
      try {
        const errorData = JSON.parse(upstreamText);
        errorResponse.details = errorData.error || errorData.message || 'Unknown upstream error';
      } catch {
        errorResponse.details = upstreamText.slice(0, 200);
      }
      return res.status(upstreamResponse.status >= 500 ? 502 : upstreamResponse.status).json(errorResponse);
    }
    let upstreamData;
    try {
      upstreamData = JSON.parse(upstreamText);
    } catch (parseError) {
      console.warn(`[chat-proxy] ${requestId} - Failed to parse upstream JSON:`, parseError.message);
      return res.status(502).json({
        error: 'Invalid response from upstream service',
        request_id: requestId,
        timestamp: new Date().toISOString()
      });
    }
    const cleanAnswer = stripSourcesText(upstreamData.answer || '');
    if (!cleanAnswer.trim()) {
      console.warn(`[chat-proxy] ${requestId} - Empty response from upstream`);
      return res.status(502).json({
        error: 'Empty response from chat service',
        request_id: requestId,
        timestamp: new Date().toISOString()
      });
    }
    const responseData = {
      answer: cleanAnswer
    };
    console.info(`[chat-proxy] ${requestId} - Sending successful response`);
    return res.json(responseData);
  } catch (error) {
    console.error(`[chat-proxy] ${requestId} - Unexpected error:`, error);
    let statusCode = 502;
    let errorMessage = 'Chat service temporarily unavailable';
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Chat service timeout';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503;
      errorMessage = 'Chat service unavailable';
    }
    return res.status(statusCode).json({
      error: errorMessage,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' ? { debug: error.message } : {})
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const healthCheckResponse = await fetch(config.RAG_API_URL.replace('/chat', '/health'), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    const upstreamHealthy = healthCheckResponse.ok;
    res.json({
      status: upstreamHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      upstream: {
        url: config.RAG_API_URL,
        status: upstreamHealthy ? 'up' : 'down',
        response_time: upstreamHealthy ? 'ok' : 'timeout'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
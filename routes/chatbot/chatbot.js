const express = require('express');
const router = express('router');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

// Reusable Gemini call with retry logic
async function fetchAIResponse(userMessage, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const chat = model.startChat({
                history: [
                ],
                generationConfig: {
                    temperature: 0.7,
                },
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            return response.text();

        } catch (err) {
            console.error(`Attempt ${attempt + 1} failed:`, err.message);

            if (attempt < retries - 1) {
                console.warn(`⚠️ Retrying in ${1000 * (attempt + 1)} ms...`);
                await delay(1000 * (attempt + 1)); 
            } else {
                throw err;
            }
        }
    }
}

router.get('/chatbot', (req, res) => {
    res.render('chatbot/chatbot', {
        title: 'FeedHope AI Assistant',
        stylesheet: '', // Make sure this is correctly pointing to your CSS if needed
    });
});

router.post('/ai-chat', async (req, res) => {
    const userMessage = req.body.message;

    try {
        const botReply = await fetchAIResponse(userMessage);
        res.json({ reply: botReply });
    } catch (error) {
        console.error('❌ Chatbot error:', error.message);
        // More generic error message as Gemini error structure for rate limits can vary
        const msg = '⚠️ Something went wrong. Please try again later.';
        res.status(500).json({ reply: msg });
    }
});

module.exports = router;
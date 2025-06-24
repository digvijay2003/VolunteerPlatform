const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = new twilio(accountSid, authToken);

const sendSMS = async (to, body) => {
    try {
        console.log('print to: ', to);
        console.log('print process.env.Twi: ', process.env.TWILIO_PHONE_NUMBER);
        
        const message = await client.messages.create({
            body,
            to,
            from: process.env.TWILIO_PHONE_NUMBER, 
        });
        return message;
    } catch (error) {
        console.error('Twilio Error:', error.message);
        throw error; 
    }
};

module.exports = { sendSMS };
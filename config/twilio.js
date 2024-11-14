require('dotenv').config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);

const sendMessage = async () => {
    try {
        const message = await client.messages.create({
          body: 'Hello from Digvijay',
          to: '+',
          from: '+14797179508',
        });
        console.log(message);
    } catch (error) {
        console.error(error);
    }  
};

sendMessage();

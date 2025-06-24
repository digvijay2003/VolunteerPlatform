const formData = require('form-data');
const Mailgun = require('mailgun.js');
const fs = require('fs');
const path = require('path');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
});

const sendEmail = async (to, subject, templateName, data) => {
    let messageData;
    try {
        if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
            throw new Error('Missing Mailgun API Key or Domain in environment variables');
        }

        const templatePath = path.join(__dirname, '../emailTemplates', templateName);
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }

        let html = fs.readFileSync(templatePath, 'utf-8');
        Object.keys(data).forEach((key) => {
            const placeholder = `{{${key}}}`;
            html = html.replace(new RegExp(placeholder, 'g'), data[key]);
        });

        messageData = {
            from: `Work for FeedHope <noreply@digvijay.info>`,
            to,
            subject,
            html
        };

        const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);

        console.log('Email sent successfully:', response);
        
        if(response){
            console.log('Email sent successfully', messageData);
        } else {
            console.log('Email was not sent successfully', messageData)
        }

        return response;

    } catch (error) {
        console.error('Error in sendEmail function:', error.message);
        console.error('Request Details:', {
            domain: process.env.MAILGUN_DOMAIN,
            method: 'POST',
            messageData
        });
        throw error;
    }
};

module.exports = sendEmail;
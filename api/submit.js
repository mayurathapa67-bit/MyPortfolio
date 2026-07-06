const fs = require('fs');
const path = require('path');

const SUBMISSIONS_DIR = path.join(__dirname, '..', 'submissions');
try {
    if (!fs.existsSync(SUBMISSIONS_DIR)) {
        fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
    }
} catch (e) {
    // ignore on Vercel if filesystem is not writable
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Name, email, subject, and message are required' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const filename = `${timestamp}_${safeName}.json`;
        const filePath = path.join(SUBMISSIONS_DIR, filename);

        const record = {
            id: filename.replace('.json', ''),
            name: name.trim(),
            email: email.trim(),
            phone: (phone || '').trim(),
            subject: subject.trim(),
            message: message.trim(),
            receivedAt: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');

        return res.status(200).json({ success: true, message: 'Message saved!', id: record.id });
    } catch (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

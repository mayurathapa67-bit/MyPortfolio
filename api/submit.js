const fs = require('fs');
const DIR = '/tmp/portfolio-subs';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Name, email, subject, and message are required' });
        }

        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const record = {
            id, name: name.trim(), email: email.trim(),
            phone: (phone || '').trim(), subject: subject.trim(),
            message: message.trim(), receivedAt: new Date().toISOString()
        };

        fs.writeFileSync(DIR + '/' + id + '.json', JSON.stringify(record, null, 2), 'utf8');
        return res.status(200).json({ success: true, message: 'Message saved!', id });
    } catch (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

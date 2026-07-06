const fs = require('fs');
const path = require('path');

const SUBMISSIONS_DIR = path.join(__dirname, '..', 'submissions');
if (!fs.existsSync(SUBMISSIONS_DIR)) {
    fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
}

let kv;
try {
    kv = require('@vercel/kv').kv;
} catch {
    kv = null;
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

        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const record = {
            id,
            name: name.trim(),
            email: email.trim(),
            phone: (phone || '').trim(),
            subject: subject.trim(),
            message: message.trim(),
            receivedAt: new Date().toISOString()
        };

        let saved = false;

        if (kv) {
            try {
                await kv.lpush('submissions', JSON.stringify(record));
                saved = true;
            } catch (kvErr) {
                console.error('KV push failed, falling back to file:', kvErr);
            }
        }

        if (!saved) {
            const filename = `${record.receivedAt.replace(/[:.]/g, '-')}_${record.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}.json`;
            fs.writeFileSync(path.join(SUBMISSIONS_DIR, filename), JSON.stringify(record, null, 2), 'utf8');
        }

        return res.status(200).json({ success: true, message: 'Message saved!', id });
    } catch (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

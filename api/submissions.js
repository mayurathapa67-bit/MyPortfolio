const fs = require('fs');
const DIR = '/tmp/portfolio-subs';

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
        if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

        const { id } = req.query;

        // POST /api/submissions - Create a new submission
        if (req.method === 'POST') {
            const { name, email, phone, subject, message } = req.body;
            if (!name || !email || !subject || !message) {
                return res.status(400).json({ error: 'Name, email, subject, and message are required' });
            }
            const _id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const record = {
                id: _id, name: name.trim(), email: email.trim(),
                phone: (phone || '').trim(), subject: subject.trim(),
                message: message.trim(), receivedAt: new Date().toISOString()
            };
            fs.writeFileSync(DIR + '/' + _id + '.json', JSON.stringify(record, null, 2), 'utf8');
            return res.status(200).json({ success: true, message: 'Message saved!', id: _id });
        }

        // DELETE /api/submissions?id=xxx
        if (req.method === 'DELETE') {
            if (!id) return res.status(400).json({ error: 'Missing id' });
            const fp = DIR + '/' + id + '.json';
            if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
            fs.unlinkSync(fp);
            return res.status(200).json({ success: true });
        }

        // GET /api/submissions - List all submissions
        if (req.method === 'GET') {
            const subs = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().reverse().map(f =>
                JSON.parse(fs.readFileSync(DIR + '/' + f, 'utf8'))
            );
            if (id) {
                const s = subs.find(x => x.id === id);
                return s ? res.status(200).json(s) : res.status(404).json({ error: 'Not found' });
            }
            return res.status(200).json(subs);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Error' });
    }
};

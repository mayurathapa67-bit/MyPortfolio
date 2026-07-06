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

function parseAll(raw) {
    return (raw || []).map(item => {
        try { return JSON.parse(item); }
        catch { return null; }
    }).filter(Boolean);
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    const { id } = req.query;

    if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'Missing id' });
        try {
            if (kv) {
                const submissions = parseAll(await kv.lrange('submissions', 0, -1));
                const index = submissions.findIndex(s => s.id === id);
                if (index === -1) return res.status(404).json({ error: 'Submission not found' });
                await kv.lset('submissions', index, '__DEL__');
                await kv.lrem('submissions', 1, '__DEL__');
            } else {
                const filePath = path.join(SUBMISSIONS_DIR, id + '.json');
                if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Submission not found' });
                fs.unlinkSync(filePath);
            }
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'GET') {
        try {
            let submissions;
            if (kv) {
                submissions = parseAll(await kv.lrange('submissions', 0, -1));
            } else {
                const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
                submissions = files.map(f => {
                    const content = fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8');
                    return JSON.parse(content);
                });
            }
            if (id) {
                const submission = submissions.find(s => s.id === id);
                if (!submission) return res.status(404).json({ error: 'Submission not found' });
                return res.status(200).json(submission);
            }
            return res.status(200).json(submissions);
        } catch (err) {
            console.error('List error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

const fs = require('fs');
const path = require('path');

let kv;
try {
    kv = require('@vercel/kv').kv;
} catch {
    kv = null;
}

const TMP_DIR = path.join('/tmp', 'submissions');
try {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
} catch {}

function getLocalSubmissions() {
    if (!fs.existsSync(TMP_DIR)) return [];
    return fs.readdirSync(TMP_DIR).filter(f => f.endsWith('.json')).sort().reverse().map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(TMP_DIR, f), 'utf8')); } catch { return null; }
    }).filter(Boolean);
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    const { id } = req.query;

    try {
        let allSubmissions;
        if (kv) {
            const raw = await kv.lrange('submissions', 0, -1);
            allSubmissions = (raw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
        } else {
            allSubmissions = getLocalSubmissions();
        }

        if (req.method === 'DELETE') {
            if (!id) return res.status(400).json({ error: 'Missing id' });
            if (kv) {
                const index = allSubmissions.findIndex(s => s.id === id);
                if (index === -1) return res.status(404).json({ error: 'Submission not found' });
                await kv.lset('submissions', index, '__DEL__');
                await kv.lrem('submissions', 1, '__DEL__');
            } else {
                const filePath = path.join(TMP_DIR, id + '.json');
                if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Submission not found' });
                fs.unlinkSync(filePath);
            }
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            if (id) {
                const s = allSubmissions.find(x => x.id === id);
                if (!s) return res.status(404).json({ error: 'Submission not found' });
                return res.status(200).json(s);
            }
            return res.status(200).json(allSubmissions);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('API error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

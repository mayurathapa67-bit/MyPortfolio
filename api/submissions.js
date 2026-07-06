const fs = require('fs');
const path = require('path');

const SUBMISSIONS_DIR = path.join(__dirname, '..', 'submissions');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    const { id } = req.query;

    try {
        if (!fs.existsSync(SUBMISSIONS_DIR)) {
            fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
        }

        if (req.method === 'DELETE') {
            if (!id) return res.status(400).json({ error: 'Missing id' });
            const filePath = path.join(SUBMISSIONS_DIR, id + '.json');
            if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Submission not found' });
            fs.unlinkSync(filePath);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
            const submissions = files.map(f => {
                const content = fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8');
                return JSON.parse(content);
            });
            if (id) {
                const submission = submissions.find(s => s.id === id);
                if (!submission) return res.status(404).json({ error: 'Submission not found' });
                return res.status(200).json(submission);
            }
            return res.status(200).json(submissions);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('API error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

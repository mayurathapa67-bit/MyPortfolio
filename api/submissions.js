const fs = require('fs');

const TMP_DIR = '/tmp/submissions';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    try {
        const { id } = req.query;

        if (!fs.existsSync(TMP_DIR)) {
            fs.mkdirSync(TMP_DIR, { recursive: true });
        }

        if (req.method === 'DELETE') {
            if (!id) return res.status(400).json({ error: 'Missing id' });
            const filePath = TMP_DIR + '/' + id + '.json';
            if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
            fs.unlinkSync(filePath);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const files = fs.readdirSync(TMP_DIR).filter(f => f.endsWith('.json')).sort().reverse();
            const submissions = files.map(f => JSON.parse(fs.readFileSync(TMP_DIR + '/' + f, 'utf8')));
            if (id) {
                const s = submissions.find(x => x.id === id);
                if (!s) return res.status(404).json({ error: 'Not found' });
                return res.status(200).json(s);
            }
            return res.status(200).json(submissions);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: err.message || 'Error' });
    }
};

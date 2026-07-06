const fs = require('fs');
const DIR = '/tmp/portfolio-subs';

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
        const { id } = req.query;

        if (req.method === 'DELETE') {
            if (!id) return res.status(400).json({ error: 'Missing id' });
            const fp = DIR + '/' + id + '.json';
            if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
            fs.unlinkSync(fp);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const subs = fs.existsSync(DIR)
                ? fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().reverse().map(f =>
                    JSON.parse(fs.readFileSync(DIR + '/' + f, 'utf8'))
                  )
                : [];
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

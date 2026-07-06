module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body || {};

    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminPass) {
        console.error('ADMIN_PASSWORD env var not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (username !== adminUser || password !== adminPass) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = Buffer.from(`${username}:${adminPass}`).toString('base64');

    return res.status(200).json({ success: true, token });
};

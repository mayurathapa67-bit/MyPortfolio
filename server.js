const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const SUBMISSIONS_DIR = path.join(__dirname, 'submissions');
if (!fs.existsSync(SUBMISSIONS_DIR)) {
    fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
}

function serveStatic(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // POST /submit - Save form submission as JSON file
    if (req.method === 'POST' && pathname === '/submit') {
        try {
            const data = await parseBody(req);
            if (!data.name || !data.email || !data.subject || !data.message) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name, email, subject, and message are required' }));
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeName = data.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
            const filename = `${timestamp}_${safeName}.json`;
            const filePath = path.join(SUBMISSIONS_DIR, filename);

            const record = {
                id: filename.replace('.json', ''),
                ...data,
                receivedAt: new Date().toISOString()
            };

            fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Message saved!', id: record.id }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // GET /submissions - List all submissions
    if (req.method === 'GET' && pathname === '/submissions') {
        try {
            const files = fs.readdirSync(SUBMISSIONS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
            const submissions = files.map(f => {
                const content = fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8');
                return JSON.parse(content);
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(submissions));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // GET /submissions/:id - Get single submission
    const singleMatch = pathname.match(/^\/submissions\/(.+)$/);
    if (req.method === 'GET' && singleMatch) {
        const id = singleMatch[1];
        const filePath = path.join(SUBMISSIONS_DIR, id + '.json');
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Submission not found' }));
            }
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // DELETE /submissions?id=xxx or DELETE /submissions/:id
    if (req.method === 'DELETE' && (pathname === '/submissions' || pathname.match(/^\/submissions\/(.+)$/))) {
        const id = pathname === '/submissions' ? url.searchParams.get('id') : pathname.match(/^\/submissions\/(.+)$/)[1];
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing id' }));
            return;
        }
        const filePath = path.join(SUBMISSIONS_DIR, id + '.json');
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Submission not found' }));
            }
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Static file serving
    let filePath;
    if (pathname === '/' || pathname === '/index.html') {
        filePath = path.join(__dirname, 'index.html');
    } else if (pathname === '/dashboard' || pathname === '/dashboard.html') {
        filePath = path.join(__dirname, 'dashboard.html');
    } else {
        filePath = path.join(__dirname, pathname);
    }

    serveStatic(res, filePath);
});

server.listen(PORT, () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
    console.log(`Dashboard at http://localhost:${PORT}/dashboard`);
});

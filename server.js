const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Proxy configuration
const localServerUrl = 'http://localhost:5001'; // Your local server URL

// Proxy routes for file upload/download
app.use('/upload', createProxyMiddleware({ target: localServerUrl, changeOrigin: true }));
app.use('/files', createProxyMiddleware({ target: localServerUrl, changeOrigin: true }));

// Example endpoint on Render server
app.get('/test', (req, res) => {
  res.send('Render server is working.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Render server is running on http://localhost:${PORT}`);
});

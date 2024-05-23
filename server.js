const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, process.env.UPLOAD_DIR || 'public/upload/');
    },
    filename: function (_req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
    res.send('Server is running!');
});

app.get('/files', (_req, res) => {
    const uploadDir = process.env.UPLOAD_DIR || 'public/upload/';
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Internal Server Error');
        }

        try {
            const filesWithDescriptions = files.map(file => {
                const descriptionPath = path.join(uploadDir, `${file}.txt`);
                const description = fs.existsSync(descriptionPath) ? fs.readFileSync(descriptionPath, 'utf8') : '';
                return { filename: file, description };
            });
            res.json(filesWithDescriptions);
        } catch (error) {
            console.error('Error processing files:', error);
            res.status(500).send('Internal Server Error');
        }
    });
});

app.post('/upload', upload.single('uploadedFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const description = req.body.description || 'No description';
    const filename = req.file.originalname;
    const uploadDir = process.env.UPLOAD_DIR || 'public/upload/';

    try {
        fs.renameSync(req.file.path, path.join(uploadDir, filename));
        fs.writeFileSync(path.join(uploadDir, `${filename}.txt`), description);
        res.send('File uploaded successfully.');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/files/:filename/replies', (req, res) => {
    const filename = req.params.filename;
    const replyText = req.body;
    const dynamicKey = Object.keys(replyText)[0];
    const text = replyText[dynamicKey];
    const uploadDir = process.env.UPLOAD_DIR || 'public/upload/';

    try {
        fs.appendFileSync(path.join(uploadDir, `${filename}_reply.txt`), `${dynamicKey}\n`);
        res.send('Reply submitted successfully.');
    } catch (error) {
        console.error('Error writing reply to file:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/files/:filename/replies', (req, res) => {
    const filename = req.params.filename;
    const uploadDir = process.env.UPLOAD_DIR || 'public/upload/';

    fs.readFile(path.join(uploadDir, `${filename}_reply.txt`), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading reply text:', err);
            return res.status(500).send('Internal Server Error');
        }
        const replies = data.split('\n').filter(reply => reply.trim() !== '');
        res.json(replies);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

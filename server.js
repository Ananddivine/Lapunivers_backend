const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://lapunivers.vercel.app',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
}));

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, 'public/upload/');
  },
  filename: function (_req, file, cb) {
    cb(null, file.originalname);
  }
});

app.get('/files', (req, res) => {
  fs.readdir('public/upload/', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Internal Server Error');
    }

    const filesWithDescriptions = files.filter(file => !file.endsWith('_reply.txt')).map(file => {
      const descriptionPath = path.join('public/upload/', `${file}.txt`);
      const description = fs.existsSync(descriptionPath) ? fs.readFileSync(descriptionPath, 'utf8') : '';
      const fileUrl = `${req.protocol}://${req.get('host')}/upload/${file}`;
      return { filename: file, description, url: fileUrl };
    });

    res.json(filesWithDescriptions);
  });
});

const upload = multer({ storage });

app.post('/upload', upload.single('uploadedFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const description = req.body.description || 'No description';
  console.log('Request body:', req.body.description);

  const filename = req.file.originalname;

  fs.renameSync(req.file.path, path.join('public/upload/', filename));

  fs.writeFileSync(path.join('public/upload/', `${filename}.txt`), description);
  console.log('request description:', path.join('public/upload/', `${filename}.txt`), description);

  res.send('File uploaded successfully.');
});

app.post('/files/:filename/replies', (req, res) => {
  let filename = req.params.filename;
  if (filename.endsWith('.txt')) {
    filename = filename.slice(0, -4);
  }
  console.log('Filename received for reply:', filename);

  const replyText = req.body.reply;
  console.log('Request reply text from frontend:', req.body);
  console.log('Request body:', filename);
  console.log('Requested Reply text:', replyText);

  try {
    const replyFilePath = path.join('public/upload/', `${filename}_reply.txt`);
    console.log('Reply file path being used:', replyFilePath);
    fs.appendFileSync(replyFilePath, `${replyText}\n`);
    console.log('File path:', replyFilePath, `${replyText}\n`);
    res.send('Reply submitted successfully.');
  } catch (error) {
    console.error('Error writing reply to file:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/files/:filename/replies', (req, res) => {
  let filename = req.params.filename;
  if (filename.endsWith('.txt')) {
    filename = filename.slice(0, -4);
  }
  const replyFilePath = path.join('public/upload/', `${filename}_reply.txt`);

  console.log('Fetching replies for:', replyFilePath);

  fs.readFile(replyFilePath, 'utf8', (err, data) => {
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

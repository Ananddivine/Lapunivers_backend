const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); 
const bodyParser = require('body-parser'); // Add this line

const app = express();
const PORT = 5000; // Change this to the desired port number
 

app.use(cors({
    origin: 'https://lapunivers.vercel.app/', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  }));
  
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true })); // Add this line

// Set up multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, 'public/upload/');
    },
    filename: function (_req, file, cb) {
        cb(null, file.originalname);
    }
});

// Define endpoint for fetching list of files with descriptions
app.get('/files', (_req, res) => {
    // Get the list of files from the 'public/upload' directory
    fs.readdir('public/upload/', (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Read the description for each file and include it in the response
        const filesWithDescriptions = files.map(file => {
            const descriptionPath = path.join('public/upload/', `${file}.txt`);
            const description = fs.existsSync(descriptionPath) ? fs.readFileSync(descriptionPath, 'utf8') : '';
            return { filename: file, description };
        });

        // Send the list of files with descriptions as a JSON response
        res.json(filesWithDescriptions);
    });
});

// Set up multer for handling file uploads
const upload = multer({ storage });

// Define endpoint for file upload
app.post('/upload', upload.single('uploadedFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Extract the description from the request body
    const description = req.body.description || 'No description';
    console.log('Request body:', req.body.description);

    // Rename the file to include the description (if provided)
    const filename = req.file.originalname;

    // Move the uploaded file to the destination folder
    fs.renameSync(req.file.path, path.join('public/upload/', filename));

    // Save the description to a separate file
    fs.writeFileSync(path.join('public/upload/', `${filename}.txt`), description);
    console.log('request discription:', path.join('public/upload/', `${filename}.txt`), description)

    res.send('File uploaded successfully.');
});

// Define endpoint for storing replies
app.post('/files/:filename/replies', (req, res) => {
    const filename = req.params.filename;
    const replyText = req.body;
    const dynamicKey = Object.keys(replyText)[0]; // Assuming there's only one key
    const text = replyText[dynamicKey];

    console.log('Request reply text from frontend:', req.body);
    console.log('Request body:', filename);
    console.log('Requested Reply text:', text);
    console.log('Requested Reply text:', dynamicKey);

    // Save the reply to a separate file associated with the filename
    try {
        fs.appendFileSync(path.join('public/upload/', `${filename}_reply.txt`), `${dynamicKey}\n`);
        console.log('File path:', path.join('public/upload/', `${filename}_reply.txt`), `${dynamicKey}\n`);
        res.send('Reply submitted successfully.');
    } catch (error) {
        console.error('Error writing reply to file:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Define endpoint for fetching reply text for a file
app.route('/files/:filename/replies')
.get((req, res) => {
    const filename = req.params.filename;
    // Read reply text from file
    fs.readFile(path.join('public/upload/', `${filename}_reply.txt`), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading reply text:', err);
            return res.status(500).send('Internal Server Error');
        }
        // Split data into an array of replies
        const replies = data.split('\n').filter(reply => reply.trim() !== '');
        // Send reply text as JSON response
        res.json(replies);
    });
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  "https://lapunivers.vercel.app"
  ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token'],
  credentials: true,
  optionsSuccessStatus: 200
}));app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb+srv://ad91482948:zqEgXCJrQF4cONgk@cluster0.udg8e.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("Connected to MongoDB");

  // Drop the index if it exists
  try {
    await mongoose.connection.db.collection('users').dropIndex('image_1');
    console.log("Index 'image_1' dropped successfully");
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log("Index 'image_1' not found");
    } else {
      console.log("Error dropping index:", err.message);
    }
  }

}).catch(err => {
  console.log("Error connecting to MongoDB:", err.message);
});


  // API creation
  app.use('/images', express.static('public/upload'));
  app.get("/", (req, res) => {
    res.send("Express App is Running");
  });
// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }

});
const upload = multer({ storage });




  // Creating upload image for adminpanel
  app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    res.json({
      success: 1,
      Image_url:`https://lapuniversbackend-production.up.railway.app/images/${req.file.filename}`
    });
  });
// Schema for creating product
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});



// Creating API for deleting the product
app.post('/removeproduct', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.body.id });
    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    console.log("Removed:", product);
    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  console.log("All products fetched");
  res.send(products);
});

// Schema for creating user model
const User = mongoose.model('User', {
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  }
});


// Creating end point for users uploads
app.post('/uploadfile', upload.single('uploadedFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { description, username, token } = req.body;

  const filename = req.file.originalname;

  // Move the uploaded file to the desired location
  fs.renameSync(req.file.path, path.join('public/upload/', filename));

  // Save the description and metadata
  const metadata = { description: description || 'No description', username, token };
  fs.writeFileSync(path.join('public/upload/', `${filename}.json`), JSON.stringify(metadata));

  res.send('File uploaded successfully.');
});

// File handling routes...
app.get('/files', (req, res) => {
  fs.readdir('public/upload/', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Internal Server Error');
    }

    const filesWithDescriptions = files.filter(file => !file.endsWith('_reply.txt')).map(file => {
      const metadataPath = path.join('public/upload/', `${file}.json`);
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const fileUrl = `${req.protocol}://${req.get('host')}/upload/${file}`;
        return { filename: file, ...metadata, url: fileUrl };
      } else {
        return null;
      }
    }).filter(file => file !== null);

    res.json(filesWithDescriptions);
  });
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
app.put('/files/:filename/replies', (req, res) => {
  let filename = req.params.filename;
  
  // Remove ".txt" extension from filename if present
  if (filename.endsWith('.txt')) {
    filename = filename.slice(0, -4);
  }

  const replyFilePath = path.join('public/upload/', `${filename}_reply.txt`);
  const updatedReply = req.body.updatedReply;
  const username = req.body.username; // Capture username from the request body

  try {
    // Append the updated reply along with the username
    const replyContent = `${username}: ${updatedReply}\n`;
    
    // Overwrite the reply file with the new content
    fs.writeFileSync(replyFilePath, replyContent);
    res.send('Reply updated successfully.');
  } catch (error) {
    console.error('Error updating reply file:', error);
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

// Delete a file
app.delete('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join('public/upload/', filename);
  const descriptionPath = path.join('public/upload/', `${filename}.txt`);
  const replyPath = path.join('public/upload/', `${filename}_reply.txt`);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send('Internal Server Error');
    }

    fs.unlink(descriptionPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting description file:', err);
        return res.status(500).send('Internal Server Error');
      }

      fs.unlink(replyPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting reply file:', err);
          return res.status(500).send('Internal Server Error');
        }

        res.send('File deleted successfully.');
      });
    });
  });
});

// Update a file description
app.put('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const newDescription = req.body.updatedContent;
  const descriptionPath = path.join('public/upload/', `${filename}.txt`);

  fs.writeFile(descriptionPath, newDescription, (err) => {
    if (err) {
      console.error('Error updating description:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.send('Description updated successfully.');
  });
});

// Delete replies for a file
app.delete('/files/:filename/replies', (req, res) => {
  let filename = req.params.filename;
  if (filename.endsWith('.txt')) {
    filename = filename.slice(0, -4);
  }
  const replyFilePath = path.join('public/upload/', `${filename}_reply.txt`);

  fs.unlink(replyFilePath, (err) => {
    if (err) {
      console.error('Error deleting reply file:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.send('Reply file deleted successfully.');
  });
});

app.post('/addproduct', async (req, res) => {
  try {
    let products = await Product.find({});
    let id;

    if (products.length > 0) {
      let last_product = products[products.length - 1];
      id = last_product.id + 1;
    } else {
      id = 1;
    }

    const product = new Product({
      id: id,
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      description: req.body.description,
    });

    console.log(product);
    await product.save();
    console.log("saved");

    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Existing User Found" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Initialize cartData
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }

    // Generate unique token 
    const token = crypto.randomBytes(20).toString('hex');

    // Create user
    const user = new User({
      name: username,
      email,
      password: hashedPassword,
      cartData: cart,
      token: token,
    });

    await user.save();

    // Generate JWT token
    const data = {
      user: {
        id: user.id,
        name: user.name
      }
    };
    const authToken = jwt.sign(data, 'anand_secret');
    res.json({ success: true,  authToken, token: user.token,  name: user.name });

    // Set up email sending
    const transporter = nodemailer.createTransport({
      service: 'ad91482948@gmail.com',
      auth: {
        user: 'ad91482948@gmail.com',
        pass: 'apux vtxh copq iugq',
      },
    });

    const mailOptions = {
      from: 'ad91482948@gmail.com',
      to: email,
      subject: 'Thank you for registering',
      text: 'Thank you for registering on our platform!',
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email sending error:", error);
        return res.status(500).json({ success: false, message: 'Error sending email' });
      } else {
        console.log('Email sent: ' + info.response);
        res.status(201).json({ success: true, token, name: user.name });
      }
    });

  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Wrong password' });
    }

    // Generate JWT token
    const data = {
      user: {
        id: user._id,
        name: user.name
      }
    };

    const authToken = jwt.sign(data, 'anand_secret');
    res.json({ success: true,  authToken, token: user.token,  name: user.name });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});






// Route to send OTP
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set OTP and expiration time (e.g., 10 minutes)
    user.otp = otp;
    user.otpExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: 'ad91482948@gmail.com', // Use your email service
      auth: {
        user: 'ad91482948@gmail.com',
        pass: 'apux vtxh copq iugq',
      },
    });

    const mailOptions = {
      from: 'ad91482948@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Error sending OTP');
      } else {
        console.log('OTP email sent: ' + info.response);
        res.status(200).send('OTP sent to email');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending OTP');
  }
});
// Route to verify OTP
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiration) {
      return res.status(400).send('Invalid or expired OTP');
    }

    // Clear OTP after verification
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    res.status(200).send('OTP verified');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error verifying OTP');
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Find user by email and check OTP and expiration
    const user = await User.findOne({ email, otp });
    if (!user || Date.now() > user.otpExpiration) {
      return res.status(400).send('Invalid or expired OTP');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Specify email service provider
      auth: {
        user: 'ad91482948@gmail.com',
        pass: 'apux vtxh copq iugq',
      },
    });

    const mailOptions = {
      from: 'ad91482948@gmail.com',
      to: email,
      subject: 'Your LapUniverse Password Has Been Reset',
      text: `Dear User,

Your LapUniverse account password has been successfully reset. If you did not perform this action, please report this immediately by contacting us at the following link:

https://lapunivers.vercel.app/Contact

Thank you,
LapUniverse Security Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending confirmation email:', error);
      } else {
        console.log('Confirmation email sent:', info.response);
      }
    });

    res.status(200).send('Password reset successful');
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).send('Error resetting password');
  }
});









app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkj';

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// MongoDB Connection
mongoose.connect('mongodb+srv://abhinavnagar2696:VW4NqUAh5B9Sx2ap@clusterblog.vnx9y.mongodb.net/?retryWrites=true&w=majority&appName=ClusterBlog')
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });


// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.findOne({ username });
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          id: userDoc._id,
          username,
        });
      });
    } else {
      res.status(400).json('Wrong credentials');
    }
  } catch (e) {
    console.log(e);
    res.status(400).json('Error logging in');
  }
});

// Profile
app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    res.json(info);
  });
});

// Logout
app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

// Create Post
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  console.log('Request body:', req.body);
  console.log('Uploaded file:', req.file);
  const { title, summary, content } = req.body;
  const { file } = req;

  if (!title || !summary || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    try {
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
      });
      res.json(postDoc);
    } catch (e) {
      console.log(e);
      res.status(400).json(e);
    }
  });
});

// Update Post
app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('You are not the author');
    }

    try {
      // Update the post
      postDoc.title = title;
      postDoc.summary = summary;
      postDoc.content = content;
      postDoc.cover = newPath ? newPath : postDoc.cover;

      await postDoc.save();

      res.json(postDoc);
    } catch (e) {
      console.log(e);
      res.status(400).json(e);
    }
  });
});

// Get Posts
app.get('/post', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

// Get Single Post
app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});


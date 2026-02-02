
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devsync';

console.log('Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Hint: Check your .env file and ensure MONGODB_URI is correct.');
    console.error('   Current URI used:', MONGODB_URI.replace(/:([^@]+)@/, ':****@')); // Hide password in logs
  });

// Schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Note: In production, use bcrypt to hash this!
  createdAt: { type: Date, default: Date.now }
});

const DocumentSchema = new mongoose.Schema({
  title: { type: String, default: 'Untitled Doc' },
  content: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() }
});

const User = mongoose.model('User', UserSchema);
const Document = mongoose.model('Document', DocumentSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'dev_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes: Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'dev_secret');
    res.json({ user: { id: user._id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'dev_secret');
    res.json({ user: { id: user._id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.sendStatus(404);
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    res.sendStatus(500);
  }
});

// Routes: Documents
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const docs = await Document.find({ ownerId: req.user.id }).sort({ updatedAt: -1 });
    // Transform _id to id for frontend compatibility
    const docsClient = docs.map(d => ({
      id: d._id.toString(),
      title: d.title,
      content: d.content,
      ownerId: d.ownerId.toString(),
      isPrivate: d.isPrivate,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
    res.json(docsClient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    
    // Simple permission check (in a real app, handle shared docs here)
    if (doc.ownerId.toString() !== req.user.id && doc.isPrivate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId.toString(),
      isPrivate: doc.isPrivate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = new Document({
      title: title || 'Untitled Doc',
      content: content || '',
      ownerId: req.user.id
    });
    await doc.save();
    res.json({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId.toString(),
      isPrivate: doc.isPrivate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, isPrivate } = req.body;
    const updateData = { updatedAt: Date.now() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      updateData,
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: 'Document not found or access denied' });

    res.json({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId.toString(),
      isPrivate: doc.isPrivate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    await Document.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/**
 * StreamVault - Video Streaming Platform API
 * Industry: Entertainment / Media
 * Version: 3.0.2
 *
 * WARNING: This codebase contains intentional compliance violations
 * for demonstration purposes in the Compliance AutoPilot scanner.
 */

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// VIOLATION: Hardcoded JWT secret in source code
const JWT_SECRET = 'streamvault_jwt_secret_2024_production';

// VIOLATION: No CORS policy — any origin can make requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

// ========================
// USER SCHEMA
// ========================

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,          // VIOLATION: Plaintext password
  dateOfBirth: String,       // VIOLATION: Not used for age verification
  country: String,
  subscriptionTier: { type: String, default: 'free' },
  watchHistory: [String],    // Full content IDs stored without user consent
  profileData: Object,       // VIOLATION: Catch-all object stores arbitrary PII
  createdAt: { type: Date, default: Date.now },
  // No consent tracking fields
  // No data processing agreement field
  // No marketing opt-in flag
});

const User = mongoose.model('User', UserSchema);

// ========================
// CONTENT SCHEMA
// ========================

const ContentSchema = new mongoose.Schema({
  title: String,
  description: String,
  contentUrl: String,        // VIOLATION: Content served over HTTP (no TLS enforcement)
  ageRating: String,         // Field exists but NEVER enforced at route level
  licensedRegions: [String], // Exists but not checked on content delivery
  contentType: String,       // movie / series / live
  // VIOLATION: No DRM metadata
  // VIOLATION: No copyright expiry tracking
});

const Content = mongoose.model('Content', ContentSchema);

// ========================
// AUTH ROUTES
// ========================

app.post('/api/register', async (req, res) => {
  const { username, email, password, dateOfBirth, country } = req.body;

  // VIOLATION: No age verification despite ageRating field on content
  // VIOLATION: Logging full registration payload with PII
  console.log(`[REGISTER] New user: email=${email}, dob=${dateOfBirth}, country=${country}`);

  const user = new User({
    username,
    email,
    password,                // VIOLATION: No hashing
    dateOfBirth,
    country
  });

  await user.save();
  // VIOLATION: No cookie consent collected at registration
  // VIOLATION: No privacy policy acceptance recorded
  res.status(201).json({ userId: user._id, username });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // VIOLATION: Plain text comparison
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // VIOLATION: No MFA for account access
  // VIOLATION: Excessively long token expiry (365 days)
  const token = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '365d' });

  // VIOLATION: Logging token in response log
  console.log(`[LOGIN] User ${email} logged in. Token: ${token}`);

  res.json({ token, userId: user._id });
});

// ========================
// CONTENT DELIVERY
// ========================

app.get('/api/content/:id', async (req, res) => {
  const content = await Content.findById(req.params.id);
  if (!content) return res.status(404).json({ error: 'Not found' });

  // VIOLATION: ageRating field ignored — adult content delivered to any user
  // VIOLATION: No region check — content streamed regardless of licensedRegions
  // VIOLATION: No user authentication required to access content
  // VIOLATION: No watermarking for piracy traceability

  res.json({
    title: content.title,
    streamUrl: content.contentUrl,
    description: content.description
  });
});

app.get('/api/content', async (req, res) => {
  // VIOLATION: Returns ALL content without filtering by user region or age
  const content = await Content.find({});
  res.json(content);
});

// ========================
// USER DATA
// ========================

app.get('/api/user/:id', async (req, res) => {
  // VIOLATION: No ownership check — any logged-in user can view any user's profile
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // VIOLATION: Returns full PII including plaintext password
  res.json(user);
});

app.post('/api/user/:id/watch', async (req, res) => {
  const { contentId } = req.body;
  // VIOLATION: Watch history recorded without user consent
  // VIOLATION: No opt-out mechanism
  await User.findByIdAndUpdate(req.params.id, {
    $push: { watchHistory: contentId }
  });
  res.json({ recorded: true });
});

// VIOLATION: No route to delete watch history
// VIOLATION: No route for users to export their data
// VIOLATION: No route to delete account (Right to Erasure)
// VIOLATION: No cookie consent management endpoints
// VIOLATION: No parental control routes despite having ageRating on content

// ========================
// ANALYTICS (GDPR breach)
// ========================

app.post('/api/analytics/event', async (req, res) => {
  const { userId, event, metadata } = req.body;

  // VIOLATION: Sending user behavioral data to third-party without consent
  // VIOLATION: IP address logged and stored
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`[ANALYTICS] userId=${userId}, event=${event}, ip=${clientIp}, meta=${JSON.stringify(metadata)}`);

  // Simulated third-party analytics call (no consent check)
  // fetch('https://analytics-provider.com/collect', { method: 'POST', body: JSON.stringify({ userId, event, ip: clientIp }) })

  res.json({ tracked: true });
});

// ========================
// SUBSCRIPTION
// ========================

app.post('/api/subscribe', async (req, res) => {
  const { userId, plan, cardNumber, cvv, expiryDate } = req.body;

  // VIOLATION: Payment card data accepted and logged without tokenization
  console.log(`[PAYMENT] Processing card: ${cardNumber}, CVV: ${cvv}, expiry: ${expiryDate}`);

  // VIOLATION: Card stored in user record
  await User.findByIdAndUpdate(userId, {
    subscriptionTier: plan,
    profileData: { cardNumber, cvv, expiryDate }  // Storing raw card data
  });

  res.json({ subscribed: true, plan });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`StreamVault API running on port ${PORT}`);
  // VIOLATION: Debug logging enabled with no env check
});

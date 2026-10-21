require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const M = require('./models');

async function run() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || process.argv[3] || '';

  if (!email || !email.includes('@')) {
    console.error('Error: ADMIN_EMAIL environment variable is missing or invalid.');
    process.exit(1);
  }

  if (!password || typeof password !== 'string' || password.length < 12) {
    console.error('Error: ADMIN_PASSWORD environment variable must be at least 12 characters.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const password_hash = await bcrypt.hash(password, 10);
  const existing = await M.User.findOne({ email });

  if (existing) {
    existing.role = 'admin';
    existing.password_hash = password_hash;
    existing.email_verified = true;
    if (!existing.display_name) existing.display_name = 'Admin';
    await existing.save();
    console.log(`Updated account ${email} to admin role with new password.`);
  } else {
    await M.User.create({
      email,
      password_hash,
      role: 'admin',
      display_name: 'Admin',
      email_verified: true,
    });
    console.log(`Created new admin account for ${email}.`);
  }

  await mongoose.disconnect();
  console.log('Admin account setup complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to configure admin user:', err.message);
  process.exit(1);
});

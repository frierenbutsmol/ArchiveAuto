// Gives an existing account a role. Run on your computer or in the Render shell:
//   npm run make-admin -- you@example.com            (makes them admin)
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const M = require('./models');
const { ROLES } = require('./rbac');

const [email, role = 'admin'] = process.argv.slice(2);
if (!email || !ROLES.includes(role)) {
  console.log(`Usage: npm run make-admin -- email@example.com [${ROLES.join('|')}]`);
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await M.User.findOneAndUpdate(
    { email: email.toLowerCase().trim() }, { role }, { new: true }
  );
  console.log(user ? `${user.email} is now ${user.role}.` : `No account found with the email ${email}.`);
  await mongoose.disconnect();
  process.exit(user ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
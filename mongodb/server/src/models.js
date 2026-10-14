const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ROLES } = require('./rbac');

// Field names match what the app already sends/reads (snake_case, same as Supabase).
const TS = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

// Make API responses look like Supabase rows: `id` instead of `_id`, no internals.
function clean(schema) {
  schema.set('toJSON', {
    transform: (_doc, ret) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      delete ret.password_hash;
      return ret;
    },
  });
  return schema;
}

const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const vehicleRef = { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true };

// users = Supabase auth user + the old `profiles` table, in one collection.
const User = model('User', clean(new Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password_hash: String,          // empty for imported profiles that haven't set a password
  display_name: String,           // from profiles.display_name
  avatar_url: String,             // from profiles.avatar_url
  role: { type: String, enum: ROLES, default: 'user', index: true },   // user | mechanic | admin
  // false until the link in the sign-up email is opened. No default on purpose: accounts that
  // existed before this field was added have no value and are treated as already verified.
  email_verified: Boolean,
  legacy_id: { type: String, index: true },   // old Supabase user UUID
}, TS)));

const Vehicle = model('Vehicle', clean(new Schema({
  user_id: owner,
  vehicle_type: String,           // car, motorcycle, truck, van
  make: { type: String, required: true },
  series: { type: String, required: true },
  year: Number,
  nickname: String,
  plate_number: String,
  fuel_type: String,
  tank_capacity: Number,
  current_mileage: { type: Number, default: 0 },
}, TS)));

// Date-only fields are kept as 'YYYY-MM-DD' strings, exactly like Supabase `date` columns.
const MaintenanceRecord = model('MaintenanceRecord', clean(new Schema({
  user_id: owner,
  vehicle_id: vehicleRef,
  maintenance_type: String,
  description: String,
  service_date: String,
  mileage: Number,
  cost: Number,
  shop_name: String,
  parts_replaced: String,
  notes: String,
  added_by: { type: Schema.Types.ObjectId, ref: 'User' },   // set when a mechanic added the record
  added_by_name: String,
}, TS)), 'maintenance_records');

const Repair = model('Repair', clean(new Schema({
  user_id: owner,
  vehicle_id: vehicleRef,
  repair_type: String,
  description: String,
  repair_date: String,
  mileage: Number,
  cost: Number,
  shop_name: String,
  proof_file_path: String,        // id of the uploaded receipt/work-order photo (see StoredFile)
  proof_file_name: String,
  notes: String,
  added_by: { type: Schema.Types.ObjectId, ref: 'User' },   // set when a mechanic added the record
  added_by_name: String,
}, TS)), 'repairs');

const PartsReplacement = model('PartsReplacement', clean(new Schema({
  user_id: owner,
  vehicle_id: vehicleRef,
  part_name: { type: String, required: true },
  brand: String,
  replacement_date: String,
  mileage: Number,
  cost: Number,
  notes: String,
}, TS)), 'parts_replacements');

const VehicleDocument = model('Document', clean(new Schema({
  user_id: owner,
  vehicle_id: vehicleRef,
  document_type: String,
  file_path: String,              // URL/path in Cloudinary, S3, etc.
  issue_date: String,
  expiry_date: String,
  notes: String,
  file_name: String,              // original file name, for display
  file_type: String,              // MIME type: application/pdf, image/jpeg, image/png
}, TS)), 'documents');

// Uploaded documents and repair-proof photos, stored in MongoDB itself.
// documents.file_path / repairs.proof_file_path hold this record's id.
const StoredFile = model('StoredFile', new Schema({
  user_id: owner,
  name: String,
  mime: { type: String, required: true },
  size: Number,
  data: { type: Buffer, required: true, select: false },   // not loaded unless asked for
}, TS), 'files');

// An owner lets a mechanic see one vehicle and add service records to it.
const vehicleShareSchema = new Schema({
  owner_id: owner,
  vehicle_id: vehicleRef,
  mechanic_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, TS);
vehicleShareSchema.index({ vehicle_id: 1, mechanic_id: 1 }, { unique: true });
const VehicleShare = model('VehicleShare', clean(vehicleShareSchema), 'vehicle_shares');

// Security events (logins, role changes, deletions, ...). Deleted automatically after 180 days.
const AuditLog = model('AuditLog', clean(new Schema({
  action: { type: String, required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, index: true },   // who did it, when logged in
  role: String,
  target_type: String,
  target_id: String,
  ip: String,
  user_agent: String,
  request_id: String,
  detail: Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now, index: { expireAfterSeconds: 60 * 60 * 24 * 180 } },
}, { versionKey: false })), 'audit_logs');

// Password-reset tokens. Mongo deletes them automatically once expires_at passes.
const ResetToken = model('ResetToken', new Schema({
  user_id: owner,
  token_hash: { type: String, required: true, index: true },
  expires_at: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, TS));

// Email-verification tokens (sent at sign-up). Mongo deletes them automatically after 24 hours.
const VerifyToken = model('VerifyToken', new Schema({
  user_id: owner,
  token_hash: { type: String, required: true, index: true },
  expires_at: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, TS));

module.exports = {
  User, Vehicle, MaintenanceRecord, Repair, PartsReplacement,
  Document: VehicleDocument, ResetToken, VerifyToken, StoredFile, VehicleShare, AuditLog,
};
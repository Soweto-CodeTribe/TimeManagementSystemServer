import mongoose from 'mongoose';

const facilitatorSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  surname: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['facilitator', 'super_admin'], default: 'facilitator' },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Facilitator', facilitatorSchema);
import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  creationDate: { type: Date, default: Date.now },
  role: { type: String, default: 'user' },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

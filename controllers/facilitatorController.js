import admin from 'firebase-admin';
import Facilitator from '../models/facilitatorModels.js';
import crypto from 'crypto';

// Function to generate a secure random password
const generatePassword = (length = 12) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};


//Creates a new facilitator in both Firebase Auth and MongoDB
export const createFacilitator = async (req, res) => {
    try {
        // Generate a secure password
        const generatedPassword = generatePassword();

        // Create user in Firebase
        const userRecord = await admin.auth().createUser({
        email: req.body.email,
        password: generatedPassword,
        displayName: req.body.name
        });

        // Create facilitator in MongoDB
        const facilitator = new Facilitator({
            uid: userRecord.uid,
            surname: req.body.surname,
            name: req.body.name,
            email: req.body.email,
            location: req.body.location,
            role: req.body.role || 'facilitator'
        });

        await facilitator.save();
        console.log(`Generated password for ${req.body.email}: ${generatedPassword}`);
        res.status(201).json(facilitator);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


//Retrieves all facilitators from the database
export const getAllFacilitators = async (req, res) => {
    try {
        const facilitators = await Facilitator.find({}, { password: 0 });
        res.json(facilitators);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//Retrieves a single facilitator by their ID
export const getFacilitator = async (req, res) => {
    try {
        const facilitator = await Facilitator.findById(req.params.id, { password: 0 });
        if (!facilitator) {
        return res.status(404).json({ error: 'Facilitator not found' });
        }
        res.json(facilitator);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//Updates a facilitator's information
export const updateFacilitator = async (req, res) => {
    try {
        const facilitator = await Facilitator.findById(req.params.id);
        if (!facilitator) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        // Check if user is updating their own profile or is a super admin
        if (facilitator.uid !== req.user.uid) {
            const requester = await Facilitator.findOne({ uid: req.user.uid });
            if (requester?.role !== 'super_admin') {
                return res.status(403).json({ error: 'Unauthorized to edit this profile' });
            }
        }

        const updatedFacilitator = await Facilitator.findByIdAndUpdate(
        req.params.id,
        {
            ...req.body,
            updatedAt: Date.now()
        },
        { new: true }
        );

        res.json(updatedFacilitator);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Deletes a facilitator from both Firebase and MongoDB
export const deleteFacilitator = async (req, res) => {
    try {
        const facilitator = await Facilitator.findById(req.params.id);
        if (!facilitator) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        // Delete from Firebase
        await admin.auth().deleteUser(facilitator.uid);
        
        // Delete from MongoDB
        await Facilitator.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Facilitator deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const changePassword = async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
  
      // Retrieve current user
      const userUid = req.user.uid;
  
      // Check if facilitator exists
      const facilitator = await Facilitator.findOne({ uid: userUid });
      if (!facilitator) {
        return res.status(404).json({ error: 'Facilitator not found' });
      }
  
      // Update password in Firebase
      await admin.auth().updateUser(userUid, { password: newPassword });
  
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
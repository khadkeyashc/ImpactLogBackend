const RegistrationService = require('../services/registrationService');

class RegistrationController {
  
  

  static async register(req, res) {
    try {
      const eventId = req.params.eventId;
      const userId = req.user.id;
      
      const registration = await RegistrationService.registerUser(userId, eventId);
      res.status(201).json(registration);
    } catch (err) {
      console.log(err)
      res.status(400).json({ message: err.message });
    }
  }

  static async getUserRegistrations(req, res) {
    try {
      let { userId } = req.params;
      if(!userId) userId = req.user.id;
      const registrations = await RegistrationService.getUserRegistrations(userId);
      res.json(registrations);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  static async getEventRegistrations(req, res) {
    try {
      const { eventId } = req.params;
      const registrations = await RegistrationService.getEventRegistrations(eventId);
      res.json(registrations);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const registration = await RegistrationService.cancelRegistration(id);
      res.status(200).json(registration);
    } catch (err) {
      console.log(err)
      res.status(400).json({ message: err.message });
    }
  }

  static async checkIn(req, res) {
    try {
      const { userId, checkinMethod, proofUrl } = req.body;
      const attendance = await RegistrationService.checkIn(userId, checkinMethod, proofUrl);
      res.json(attendance);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
}

module.exports = RegistrationController;

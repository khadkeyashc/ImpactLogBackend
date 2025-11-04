const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const axios = require('axios'); // to call external services
const AppError = require('../utils/error.utils');

const USER_SERVICE_URL = "http://localhost:3000/users";
const EVENT_SERVICE_URL ="http://localhost:3005/events";

class RegistrationService {
  
  
  // Register user for an event
  static async registerUser(userId, eventId) {
    // 1. Validate user exists
    const userResp = await axios.get(`${USER_SERVICE_URL}/profile/${userId}`);
    if (!userResp.data) throw new Error('User not found');

    // 2. Validate event exists
    const eventResp = await axios.get(`${EVENT_SERVICE_URL}/${eventId}`);

    if (!eventResp.data) throw new Error('Event not found');

    const event = eventResp.data;

    // 3. Check current registrations
    const currentCount = await Registration.count({
      where: { eventId, status: 'registered' }
    });

    let status = 'registered';
    let positionInWaitlist = null;

    if (currentCount >= event.capacity) {
      status = 'waitlist';
      const waitlistCount = await Registration.count({
        where: { eventId, status: 'waitlist' }
      });
      positionInWaitlist = waitlistCount + 1;
    }

        let registration = await Registration.findOne({
          where: { userId, eventId }
        });

        if (registration) {
          if (registration.status === "cancelled") {
            // Reactivate the canceled registration
            registration.status = "registered";
            registration.positionInWaitlist = positionInWaitlist;
            await registration.save();
          } else {
            throw new AppError("Already registered for this event", 400);
          }
        } else {
          // Create a new registration
          registration = await Registration.create({
            userId,
            eventId,
            status,
            positionInWaitlist,
          });
        }

    return registration;
  }

 static async getUserRegistrations(userId) {
  const registrations = await Registration.findAll({
    where: { 
      userId,
      status: "registered"
    }
  });

  const eventIds = registrations.map(reg => reg.eventId);
  let events = [];

  if (eventIds.length > 0) {
    const response = await axios.get('http://localhost:3005/events/getEventsByIds', {
      params: { ids: eventIds }
    });
    events = response.data;
  }

  // Combine event data with registration info
  const combined = registrations.map(reg => {
    const event = events.find(e => e.id === reg.eventId);
    return { ...reg.toJSON(), event };
  });

  return combined;
}



  // Get all registrations for an event
   static async getEventRegistrations(eventId) {
    // 1️⃣ Get all registrations for that event
    const registrations = await Registration.findAll({ where: { eventId } });

    if (!registrations || registrations.length === 0) return [];

    // 2️⃣ Extract user IDs
    const userIds = registrations.map((r) => r.userId);

    // 3️⃣ Fetch user details from user service
    const response = await axios.post("http://localhost:3000/users/getUsersByUserIds", {
      userIds,
    });

    const users = response.data.users;
    console.log(response.data.users)

    // 4️⃣ Merge user data with registration info
    const userMap = new Map(users.map((u) => [u.id, u]));
    const result = registrations.map((r) => ({
      ...r.toJSON(),
      user: userMap.get(r.userId) || null,
    }));

    return result;
  }

  // Cancel registration
  static async cancelRegistration(registrationId) {
    const reg = await Registration.findByPk(registrationId);
    if (!reg) throw new Error('Registration not found');

    reg.status = 'cancelled';
    await reg.save();
    return reg;
  }

  // Check-in user
  static async checkIn(userId, checkinMethod, proofUrl = null) {
    const reg = await Registration.findByPk(userId);
    if (!reg) throw new Error('Registration not found');
    if (reg.status !== 'registered') throw new Error('Cannot check-in non-registered user');

    const attendance = await Attendance.create({
      registrationId : reg.id,
      checkinMethod, 
      proofUrl,
    });

    // TODO: Trigger points service and notifications asynchronously

    return attendance;
  }
}

module.exports = RegistrationService;

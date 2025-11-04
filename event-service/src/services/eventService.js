const Event = require("../models/Event");
const AppError = require("../utils/error.utils");
const { uploadMediaToCloudinary } = require("../middleware/uploadMediaToCloudinary");
const { Op } = require("sequelize");
const axios = require("axios");
const { response, enable } = require("../../../engagement-service/src/app");

class EventService {

static async giveRewardsToUsersInDb(event_id, selectedUsers, points, badge_id,badge_name ) {
  try {
    // 1️⃣ Verify event exists
    const event = await Event.findByPk(event_id);
    if (!event) throw new AppError("Event not found", 404);

    // 2️⃣ Validate inputs
    if (!Array.isArray(selectedUsers) || selectedUsers.length === 0) {
      throw new AppError("At least one user must be selected", 400);
    }

    // 3️⃣ Prepare payload for reward microservice
    const payload = {
      eventId: event_id,
      selectedUsers,
      points: points ?? event.points,
      badgeId: badge_id ?? event.badge_id,
      badgeName: badge_name ?? event.badge_name,
    };

    // 4️⃣ Send request to reward microservice
    const rewardResponse = await axios.post(
      `http://localhost:3002/reward-badges/giveRewards/${event_id}`,
      payload
    );

    // 5️⃣ If successful, update event status
    // if (rewardResponse?.status === 200 || rewardResponse?.data) {
    //   await Event.update(
    //     { status: "rewarded" },
    //     { where: { id: event_id } }
    //   );
    // }

    // 6️⃣ Return combined result
    return {
      eventId: event_id,
      totalUsersRewarded: selectedUsers.length,
      rewardServiceResponse: rewardResponse.data,
    };

  } catch (error) {
    console.error("Error in giveRewardsToUsersInDb:", error.message);
    throw new AppError(error.message || "Failed to distribute rewards", 500);
  }
}


static async getCompletedEventsFromDbByUserID(userId)
{
      const events = await Event.findAll({
    where: {
      organization_id: userId,
      status: "completed",
      scheduled_date: {
        [Op.lte]: new Date(), 
      },
    },
  });
  return events;
}

static async getPastEventsFromDb(userId) {
  const events = await Event.findAll({
    where: {
      organization_id: userId,
      status: "published",
      scheduled_date: {
        [Op.lte]: new Date(), 
      },
    },
  });
  return events;
}
  
static async getPublishedEventsFromDbByUserID(userId) {
  const events = await Event.findAll({
    where: {
      organization_id: userId,
      status: "published",
    },
  });
  return events;
}

static async changeEventStatusInDb(event_id,status)
{
    const event = await Event.findOne({ where: { id: event_id } });
  if (!event) {
    throw new Error("Event not found");
  }

  event.status = status;
  await event.save();

  return event; 
}

  // Create a new event
static async publishEventInDb(event_id) {
  const event = await Event.findOne({ where: { id: event_id } });
  if (!event) {
    throw new Error("Event not found");
  }

  event.status = "published";
  await event.save();

  return event; 
}


  static async createEvent(dto, organizationId, files = []) {
    try {
      
      let mediaUrls = [];

      // Upload media files if provided
      if (files && files.length > 0) {
        for (const file of files) {
          const uploaded = await uploadMediaToCloudinary(file.path, "ImpactLogProfile/Events");
          if (uploaded) mediaUrls.push(uploaded);
        }
      }

      if (!dto.badge_id) {
        throw new AppError("badgeId is required", 400);
      }

      const eventData = {
        ...dto,
        organization_id: organizationId,
        media: mediaUrls,
        points: dto.points ?? 0,
      };

      // create qr code for verification 

     

      const event = await Event.create(eventData);

      const qrcreation = await axios.post(
        "http://localhost:3008/verify/qr-generate",
        {eventId:event.id},
        { withCredentials: true }
      );

      return event;
    } catch (err) {
      throw new AppError(err.message || "Failed to create event", 400);
    }
  }

  // Get event by ID
  static async getEventById(eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new AppError("Event not found", 404);
    return event;
  }

  // _________________________________________________________________________________//
 

  static async getEventsByIdsFromDb(eventIds) {
    if (!eventIds || eventIds.length === 0) {
      return [];
    }

    // Step 1: Fetch events
    const events = await Event.findAll({
      where: {
        id: eventIds
      } // include needed fields
    });

    if (events.length === 0) {
      return [];
    }

    // Step 2: Extract unique organization IDs
    const organizationIds = [...new Set(events.map(ev => ev.organization_id).filter(id => id != null))];

    let organizationsMap = {};

    // Step 3: Fetch organization/user data in one API call (if any orgs)
    if (organizationIds.length > 0) {
      try {
        const response = await axios.post('http://localhost:3000/users/getUsersByUserIds', {
          userIds: organizationIds
        });

                // console.log(response.data)

        // Assuming API returns: { users: [ { id, name, email, ... }, ... ] }
        const users = response.data.users || response.data || [];
        // Create map: { orgId: userData }
        organizationsMap = users.reduce((map, user) => {
          map[user.id] = user;
          return map;
        }, {});
      } catch (error) {
        console.error('Failed to fetch organizations:', error.message);
        // Optional: continue without org data, or throw
      }
    }

    // Step 4: Enrich events with organization data
    const enrichedEvents = events.map(event => {
      const org = organizationsMap[event.organization_id] || null;
      return {
        ...event.toJSON(), // convert Sequelize instance to plain object
        organization: org ? {
          id: org.id,
          name: org.name || org.username || 'Unknown Org',
          email: org.email || null,
          username:org.username,
          avatarUrl:org.avatarUrl,
          contactNumber:org.contactNumber
          // add any other fields you need
        } : null
      };
    });

    return enrichedEvents;
  }






//___________________________________________________________________________________//
  // Update event
  static async updateEvent(eventId, dto, files = []) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new AppError("Event not found", 404);

    // Upload new media if any
    if (files && files.length > 0) {
      if (!Array.isArray(event.media)) event.media = [];
      for (const file of files) {
        const uploaded = await uploadMediaToCloudinary(file.path, "events");
        if (uploaded) event.media.push(uploaded);
      }
    }

    // Apply DTO fields
    Object.keys(dto || {}).forEach((key) => {
      if (dto[key] !== undefined && key !== "media") {
        event[key] = dto[key];
      }
    });

    // Validation: end_time must be after start_time
    if (event.start_time && event.end_time && event.end_time <= event.start_time) {
      throw new AppError("End time must be after start time", 400);
    }

    await event.save();
    return event;
  }

  // Delete event
  static async deleteEvent(eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new AppError("Event not found", 404);

    await event.destroy();
    return { message: "Event deleted successfully" };
  }

  

  // List events with optional filters
static async listEvents(query = {}) {
  // ------------------------------
  // 1️⃣ Fetch and map badges
  // ------------------------------
  const { data } = await axios.get("http://localhost:3002/reward-badges/getBadges");
  const badgeMap = Object.fromEntries(data.badges.map(b => [b.id, b.name]));

  // ------------------------------
  // 2️⃣ Build query filters
  // ------------------------------
  const where = {};

  // Basic filters
  if (query.organization_id) {
    where.organization_id = query.organization_id;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.badge_id) {
    where.badge_id = query.badge_id;
  }

  // Date range filter
  const fromDate = query.scheduled_date_from ? new Date(query.scheduled_date_from) : null;
  const toDate = query.scheduled_date_to ? new Date(query.scheduled_date_to) : null;

  if (fromDate && toDate) {
    where.scheduled_date = { [Op.between]: [fromDate, toDate] };
  } else if (fromDate) {
    where.scheduled_date = { [Op.gte]: fromDate };
  } else if (toDate) {
    where.scheduled_date = { [Op.lte]: toDate };
  }

  // Points range filter
  const minPoints = query.min_points ? parseInt(query.min_points, 10) : 0;
  const maxPoints = query.max_points ? parseInt(query.max_points, 10) : Number.MAX_SAFE_INTEGER;

  if (query.min_points || query.max_points) {
    where.points = { [Op.between]: [minPoints, maxPoints] };
  }

  // Tags filter
  if (query.tags) {
    if (Array.isArray(query.tags)) {
      where.tags = { [Op.overlap]: query.tags };
    } else if (typeof query.tags === "string") {
      where.tags = { [Op.contains]: [query.tags] };
    }
  }

  // ------------------------------
  // 3️⃣ Fetch and enrich events
  // ------------------------------
  const events = await Event.findAll({
    where: {
      status: "published",
      ...where,
    },
    order: [["scheduled_date", "ASC"]],
  });

  // Attach badge names
  return events.map(event => {
    const plainEvent = event.get({ plain: true });
    return {
      ...plainEvent,
      badge_name: badgeMap[plainEvent.badge_id] || null,
    };
  });
}


static async getUnpublishedEventsFromDb(userId) {
  console.log(userId)
  // 1️⃣ Fetch all reward badges from microservice
  const { data } = await axios.get("http://localhost:3002/reward-badges/getBadges");
  const badgeMap = Object.fromEntries(data.badges.map(b => [b.id, b]));

  // 2️⃣ Fetch draft events
  const events = await Event.findAll({
    where: {
      status: "draft",
      organization_id: userId,
    },
    order: [["scheduled_date", "ASC"]],
  });

  // 3️⃣ Enrich each event with badge details (and optionally rewards)
  const enrichedEvents = events.map(event => {
    const plain = event.get({ plain: true });
    const badge = badgeMap[plain.badge_id];

    return {
      ...plain,
      badge_name: badge ? badge.name : null,
      badge_icon: badge ? badge.icon : null,
      badge_points: badge ? badge.points : null,
      // optional if you have rewards or other relations:
      rewards: badge ? badge.rewards || [] : [],
    };
  });

  return enrichedEvents;
}

}

module.exports = EventService;

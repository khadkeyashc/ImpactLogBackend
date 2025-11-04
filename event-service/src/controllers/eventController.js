const EventService = require("../services/eventService");
const EventDto = require("../dto/EventDto");
const AppError = require("../utils/error.utils");

class EventController {
  // Create new event

  static async getCompletedEvents(req,res,next  )
  {
      const userId = req.user.id;
    const events = await EventService.getCompletedEventsFromDbByUserID(userId);

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error getting published events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get completed events",
      error: error.message,
    });
  }

  // Add this inside the EventController class
static async giveRewardsToUsers(req, res, next) {
  try {
    const { event_id } = req.params;
    const { selectedUsers, points, badge_id,badge_name } = req.body;

    console.log(req.body)
    const result = await EventService.giveRewardsToUsersInDb(
      event_id,
      selectedUsers, points, badge_id,badge_name 
    );

    res.status(200).json({
      success: true,
      message: "Rewards and badges distributed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error giving rewards:", error);
    next(error);
  }
}


  static async changeEventStatus(req,res,next)
  {
      try {         
          const { event_id,status} = req.params;
          const updatedEvent = await EventService.changeEventStatusInDb(event_id,status);

          if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
          }

          res.status(200).json({
            success: true,
            message: "Event status changes successfully",
            data: updatedEvent,
          });
      } catch (error) {
        console.log(error)
        next(error)
      }
  }


static async getPublishedEvents(req, res, next) {
  try {
    const userId = req.user.id;
    const events = await EventService.getPublishedEventsFromDbByUserID(userId);

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error getting published events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get published events",
      error: error.message,
    });
  }
}


  static async publishEvent(req, res, next) {
  try {
    const { event_id } = req.params;
    const updatedEvent = await EventService.publishEventInDb(event_id);

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      message: "Event published successfully",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Error publishing event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish event",
      error: error.message,
    });
  }
}


  static async createEvent(req, res, next) {
    try {
      const dto = EventDto.fromRequest(req.body).toPersistence();
      const organizationId = req.user?.organization_id || req.body.organization_id;


      if (!organizationId) throw new AppError("organization_id is required", 400);

      const files = req.files || [];

      console.log(dto, organizationId)
      const event = await EventService.createEvent(dto, organizationId, files);
      res.status(201).json(event);
    } catch (err) {
      console.error("Create Event Error:", err.message);
      next(err);
    }
  }

  // Get event by ID
  static async getEventById(req, res, next) {
    try {
      const event = await EventService.getEventById(req.params.id);
      res.json(event);
    } catch (err) { 
      next(err);
    }
  }

  // Update event
  static async updateEvent(req, res, next) {
    try {
      console.log("HEELO")
      const dto = EventDto.toUpdatePayload(req.body);
      const files = req.files || [];
      const event = await EventService.updateEvent(req.params.id, dto, files);
      res.json(event);
    } catch (err) {
      console.log(err.message)
      next(err);
    }
  }

  // Delete event
  static async deleteEvent(req, res, next) {
    try {
      const result = await EventService.deleteEvent(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // List events
  static async listEvents(req, res, next) {
    try {
      const events = await EventService.listEvents(req.query || {});
      res.json(events);
    } catch (err) {
      console.log(err.message)
      next(err);
    }
  }
static async getEventsByIds(req, res, next) {
  try {
    const ids = req.query['ids[]'] || []; // <-- use this
    console.log("request for ids:", ids);

    const events = await EventService.getEventsByIdsFromDb(ids);
    res.json(events);
  } catch (error) {
    next(error);
  }
}

static async getPastEvents(req,res,next)
{
  try {
    console.log(req.user)
    const userId = req.user.id;
    const events = await EventService.getPastEventsFromDb(userId);
    
    res.json(events);
  } catch (error) {
        next(error)

  }
}

static async getUnpublishedEvents(req,res,next)
{
  try {
    console.log(req.user)
    const userId = req.user.id;
    const events = await EventService.getUnpublishedEventsFromDb(userId);
    
    res.json(events);
  } catch (error) {
    next(error)
  }
}

}

module.exports = EventController;

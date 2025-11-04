// event_service/src/models/Event.js
const sequelize = require("../config/db"); // your sequelize instance
const { DataTypes } = require("sequelize");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    event_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Event name cannot be empty" },
        len: { args: [3, 150], msg: "Event name must be between 3 and 150 chars" }
      },
    },

    organization_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: { isUUID: 4 }
    },

    description: { type: DataTypes.TEXT, allowNull: true },

    start_time: { type: DataTypes.DATE, allowNull: false, validate: { isDate: true } },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStart(value) {
          if (this.start_time && value <= this.start_time) {
            throw new Error("End time must be after start time");
          }
        }
      }
    },

    scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },

    location: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidLocation(value) {
          if (value) {
            if (typeof value !== "object") throw new Error("Location must be JSON");
            if (!("lat" in value) || !("long" in value) || !("address" in value)) {
              throw new Error("Location must include lat, long, and address");
            }
          }
        }
      }
    },

    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { isInt: true, min: { args: [1], msg: "Capacity must be >= 1" } }
    },

    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      validate: {
        isArrayOfStrings(value) {
          if (value && !Array.isArray(value)) throw new Error("Tags must be array");
        }
      }
    },

    status: {
  type: DataTypes.ENUM("draft", "published", "cancelled", "completed", "rewarded"),
  allowNull: false,
  defaultValue: "draft",
  validate: {
    isIn: {
      args: [["draft", "published", "cancelled", "completed", "rewarded"]],
      msg: "Invalid event status",
    },
  },
},
    points:{
      type: DataTypes.INTEGER,
      allowNull:false,
      default:0,
      
    }
    ,

    badge_id :{
      type: DataTypes.UUID,
      allowNull: false,
      validate: { isUUID: 4 }
    },
    media: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidMedia(value) {
          if (value && !Array.isArray(value)) throw new Error("Media must be array");
          if (Array.isArray(value)) {
            value.forEach((m) => {
              if (!m.url || !m.type) throw new Error("Each media must have url and type");
            });
          }
        }
      }
    }
  },
  {
    tableName: "Events",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["status"] },
      { fields: ["scheduled_date"] }
    ]
  }
);

module.exports = Event;

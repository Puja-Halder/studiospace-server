
import mongoose from "mongoose";

const studioSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
      enum: ["photography", "workspace", "event", "meeting"],
    },

    location: {
      city: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },

    pricePerHour: {
      type: Number,
      required: true,
      min: 1,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    facilities: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      required: true,
    },

    hostId: {
      type: String,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Studio =
  mongoose.models.Studio ||
  mongoose.model("Studio", studioSchema);

export default Studio;

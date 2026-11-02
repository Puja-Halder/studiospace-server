import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Studio from "../models/Studio.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", async (req, res) => {
  try {
    const { studioId, startTime, endTime } = req.body;

    if (!studioId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Studio, start time, and end time are required.",
      });
    }

    if (!mongoose.isValidObjectId(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid booking dates.",
      });
    }

    if (start <= now) {
      return res.status(400).json({
        success: false,
        message: "Booking must start in the future.",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time.",
      });
    }

    const totalHours = (end.getTime() - start.getTime()) / 3600000;

    if (totalHours < 1) {
      return res.status(400).json({
        success: false,
        message: "A booking must be at least one hour.",
      });
    }

    const studio = await Studio.findOne({
      _id: studioId,
      isActive: true,
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or unavailable.",
      });
    }

    if (studio.hostId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own studio.",
      });
    }

    const conflictingBooking = await Booking.findOne({
      studioId,
      status: { $in: ["pending", "confirmed"] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: "This studio is already booked for the selected time.",
      });
    }

    const pricePerHour = Number(studio.pricePerHour);
    const securityDeposit = Number(studio.securityDeposit ?? 0);

    if (
      !Number.isFinite(pricePerHour) ||
      pricePerHour < 0 ||
      !Number.isFinite(securityDeposit) ||
      securityDeposit < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Studio pricing information is invalid.",
      });
    }

    const totalPrice = totalHours * pricePerHour;

    const booking = await Booking.create({
      studioId: studio._id,
      userId: req.user.id,
      hostId: studio.hostId,
      startTime: start,
      endTime: end,
      totalHours,
      totalPrice,
      securityDeposit,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Create booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create booking.",
    });
  }
});

router.get("/my", async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.user.id,
    })
      .populate("studioId", "name category location pricePerHour images")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Fetch customer bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your bookings.",
    });
  }
});

router.get("/host", async (req, res) => {
  try {
    const bookings = await Booking.find({
      hostId: req.user.id,
    })
      .populate("studioId", "name category location pricePerHour images")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Fetch host bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch host bookings.",
    });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "This booking cannot be cancelled.",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel booking.",
    });
  }
});

router.patch("/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      hostId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be confirmed.",
      });
    }

    const conflictingBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      studioId: booking.studioId,
      status: "confirmed",
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: "Another confirmed booking overlaps this time.",
      });
    }

    booking.status = "confirmed";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking confirmed successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Confirm booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm booking.",
    });
  }
});

router.patch("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      hostId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be rejected.",
      });
    }

    booking.status = "rejected";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking rejected successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Reject booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reject booking.",
    });
  }
});

export default router;
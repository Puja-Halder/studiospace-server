
import express from "express";
import mongoose from "mongoose";
import Studio from "../models/Studio.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      location,
      pricePerHour,
      capacity,
      facilities,
      images,
    } = req.body;

    if (
      !name?.trim() ||
      !description?.trim() ||
      !category ||
      !location?.city?.trim() ||
      !location?.address?.trim() ||
      !Array.isArray(images) ||
      images.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required studio information and at least one image.",
      });
    }

    const price = Number(pricePerHour);
    const studioCapacity = Number(capacity);

    if (!Number.isFinite(price) || price < 1) {
      return res.status(400).json({
        success: false,
        message: "Price per hour must be at least 1.",
      });
    }

    if (
      !Number.isInteger(studioCapacity) ||
      studioCapacity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive whole number.",
      });
    }

    const validCategories = [
      "photography",
      "workspace",
      "event",
      "meeting",
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid studio category.",
      });
    }

    if (
      !Array.isArray(images) ||
      images.some((image) => typeof image !== "string" || !image.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid studio image URLs.",
      });
    }

    const studio = await Studio.create({
      name: name.trim(),
      description: description.trim(),
      category,
      location: {
        city: location.city.trim(),
        address: location.address.trim(),
      },
      pricePerHour: price,
      capacity: studioCapacity,
      facilities: Array.isArray(facilities) ? facilities : [],
      images,
      hostId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Studio created successfully!",
      data: studio,
    });
  } catch (error) {
    console.error("Studio creation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create studio.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, category, maxPrice, sort } = req.query;

    const filter = { isActive: true };

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: searchRegex },
        { "location.city": searchRegex },
        { "location.address": searchRegex },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (maxPrice) {
      const price = Number(maxPrice);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid maximum price.",
        });
      }

      filter.pricePerHour = { $lte: price };
    }

    let studioQuery = Studio.find(filter);

    if (sort === "price-low") {
      studioQuery = studioQuery.sort({ pricePerHour: 1 });
    } else if (sort === "price-high") {
      studioQuery = studioQuery.sort({ pricePerHour: -1 });
    } else {
      studioQuery = studioQuery.sort({ createdAt: -1 });
    }

    const studios = await studioQuery;

    return res.status(200).json({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error("Studio retrieval failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve studios.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const studio = await Studio.findOne({
      _id: id,
      isActive: true,
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: studio,
    });
  } catch (error) {
    console.error("Studio retrieval failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve studio.",
    });
  }
});

export default router;


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
    console.log("Received studio data:", req.body);

    const {
      name,
      description,
      category,
      pricePerHour,
      capacity,
      facilities,
      images,
    } = req.body;

    const city = req.body.city || req.body.location?.city;
    const address = req.body.address || req.body.location?.address;

    const allowedCategories = [
      "photography",
      "workspace",
      "event",
      "meeting",
    ];

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      !allowedCategories.includes(category) ||
      typeof city !== "string" ||
      !city.trim() ||
      typeof address !== "string" ||
      !address.trim() ||
      !Array.isArray(images) ||
      images.length === 0 ||
      images.length > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required studio information.",
      });
    }

    if (
      !Number.isFinite(Number(pricePerHour)) ||
      Number(pricePerHour) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid hourly price.",
      });
    }

    if (
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid studio capacity.",
      });
    }

    if (
      images.some(
        (image) =>
          typeof image !== "string" ||
          !/^https?:\/\//i.test(image)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid image URLs.",
      });
    }

    const studio = await Studio.create({
      name: name.trim(),
      description: description.trim(),
      category,
      location: {
        city: city.trim(),
        address: address.trim(),
      },
      pricePerHour: Number(pricePerHour),
      capacity: Number(capacity),
      facilities: Array.isArray(facilities)
        ? facilities.filter((item) => typeof item === "string")
        : [],
      images,
      hostId: req.user.id,
    });

    console.log("Studio created successfully:", studio._id);

    return res.status(201).json({
      success: true,
      message: "Studio created successfully.",
      data: studio,
    });
  } catch (error) {
    console.error("Studio creation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create studio.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, category, maxPrice, sort, limit } = req.query;

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

    if (maxPrice !== undefined) {
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

    if (limit !== undefined) {
      const requestedLimit = Number(limit);

      if (
        !Number.isInteger(requestedLimit) ||
        requestedLimit < 1 ||
        requestedLimit > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid limit between 1 and 100.",
        });
      }

      studioQuery = studioQuery.limit(requestedLimit);
    }

    const studios = await studioQuery;

    return res.status(200).json({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error("Studio retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve studios.",
    });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const studios = await Studio.find({
      hostId: req.user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error("My listings retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your studio listings.",
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
    console.error("Studio details retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve studio.",
    });
  }
});

export default router;

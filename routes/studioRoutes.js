
import express from "express";
import mongoose from "mongoose";
import Studio from "../models/Studio.js";

const router = express.Router();

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

router.get("/", async (req, res) => {
  try {
    const { search, category, maxPrice, sort } = req.query;

    const filter = {
      isActive: true,
    };

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

    res.status(200).json({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    res.status(500).json({
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

    res.status(200).json({
      success: true,
      data: studio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve studio.",
    });
  }
});

export default router;

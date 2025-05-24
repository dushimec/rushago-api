import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { Car } from '../models/Car.js';
import { findCarsNear, logUserActivity, uploadMultipleImages } from '../utils/globalFeature.js';

export const createCar = asyncHandler(async (req, res) => {
  const { make, model, year, type, specifications, location, pricing, categories } = req.body;
  if (!make || !model || !year || !type || !specifications || !location || !pricing) {
    res.status(400);
    throw new Error('Required fields missing');
  }

  let photoUrls = [];
  if (req.files && req.files.length > 0) {
    photoUrls = await uploadMultipleImages(req.files, 'rushago/cars'); // Upload to Cloudinary
  }

  const car = await Car.create({
    owner_id: req.user.id,
    make,
    model,
    year,
    type,
    specifications: JSON.parse(specifications),
    location: JSON.parse(location),
    pricing: { ...JSON.parse(pricing), currency: 'RWF' },
    media: { photos: photoUrls, videos: [], thumbnail: photoUrls[0] || '' }, // Store Cloudinary URLs
    categories: JSON.parse(categories),
    status: { is_featured: req.user.subscription.plan === 'pro_owner' }
  });

  await logUserActivity(req.user.id, 'car_created', { action: 'create_car', target_id: car._id }, { device: req.headers['user-agent'] });
  res.status(201).json({ message: 'Car created successfully', car });
});

export const getCars = asyncHandler(async (req, res) => {
  const { make, model, type, min_price, max_price, city, longitude, latitude, maxDistance } = req.query;
  let query = { 'status.is_active': true, 'status.is_deleted': false };

  if (make) query.make = { $regex: make, $options: 'i' };
  if (model) query.model = { $regex: model, $options: 'i' };
  if (type) query.type = type;
  if (city) query['location.city'] = { $regex: city, $options: 'i' };
  if (min_price) query['pricing.base_price'] = { $gte: Number(min_price) };
  if (max_price) query['pricing.base_price'] = { $lte: Number(max_price) };

  let cars;
  if (longitude && latitude) {
    cars = await findCarsNear(Number(longitude), Number(latitude), Number(maxDistance) || 10000);
  } else {
    cars = await Car.find(query).populate('owner_id', 'name');
  }

  await logUserActivity(req.user?.id, 'car_search', { action: 'search_cars', metadata: req.query }, { device: req.headers['user-agent'] });
  res.status(200).json(cars);
});

export const updateCar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const car = await Car.findById(id);
  if (!car) {
    res.status(404);
    throw new Error('Car not found');
  }

  if (car.owner_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  let updateData = { ...req.body };
  if (req.files && req.files.length > 0) {
    const photoUrls = await uploadMultipleImages(req.files, 'rushago/cars');
    updateData.media = {
      ...car.media,
      photos: photoUrls,
      thumbnail: photoUrls[0] || car.media.thumbnail
    };
  }

  if (updateData.specifications) updateData.specifications = JSON.parse(updateData.specifications);
  if (updateData.location) updateData.location = JSON.parse(updateData.location);
  if (updateData.pricing) updateData.pricing = JSON.parse(updateData.pricing);
  if (updateData.categories) updateData.categories = JSON.parse(updateData.categories);

  const updatedCar = await Car.findByIdAndUpdate(id, updateData, { new: true });
  await logUserActivity(req.user.id, 'car_updated', { action: 'update_car', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Car updated successfully', car: updatedCar });
});

export const softDeleteCar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const car = await Car.findById(id);
  if (!car) {
    res.status(404);
    throw new Error('Car not found');
  }

  if (car.owner_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  car.status.is_deleted = true;
  car.status.is_active = false;
  await car.save();

  await logUserActivity(req.user.id, 'car_soft_deleted', { action: 'soft_delete_car', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Car soft deleted successfully' });
});

export const permanentDeleteCar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const car = await Car.findById(id);
  if (!car) {
    res.status(404);
    throw new Error('Car not found');
  }

  if (car.owner_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  await car.remove();
  await logUserActivity(req.user.id, 'car_permanently_deleted', { action: 'permanent_delete_car', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Car permanently deleted successfully' });
});

export const verifyCar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const car = await Car.findById(id);
  if (!car) {
    res.status(404);
    throw new Error('Car not found');
  }

  car.status.is_verified = true;
  await car.save();

  await logUserActivity(req.user.id, 'car_verified', { action: 'verify_car', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Car verified successfully' });
});

export const getAllCars = asyncHandler(async (req, res) => {
  const cars = await Car.find({ 'status.is_deleted': false }).populate('owner_id', 'name');
  await logUserActivity(req.user.id, 'cars_viewed', { action: 'view_all_cars' }, { device: req.headers['user-agent'] });
  res.status(200).json(cars);
});

export const carStats = asyncHandler(async (req, res) => {
  const totalCars = await Car.countDocuments({ 'status.is_deleted': false });
  const activeCars = await Car.countDocuments({ 'status.is_active': true, 'status.is_deleted': false });
  const verifiedCars = await Car.countDocuments({ 'status.is_verified': true, 'status.is_deleted': false });

  await logUserActivity(req.user.id, 'car_stats_viewed', { action: 'view_car_stats' }, { device: req.headers['user-agent'] });
  res.status(200).json({ totalCars, activeCars, verifiedCars });
});
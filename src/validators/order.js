import Joi from 'joi';

export const createOrderSchema = Joi.object({
  customer: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName:  Joi.string().min(2).max(50).required(),
    phone:     Joi.string().pattern(/^\+\d{10,15}$/).required()
      .messages({ 'string.pattern.base': 'Phone must be in format +20XXXXXXXXXX' }),
    email:     Joi.string().email().allow('').optional(),
  }).required(),

  delivery: Joi.object({
    address:    Joi.string().min(3).max(200).required(),
    apt:        Joi.string().allow('').optional(),
    city:       Joi.string().min(2).max(100).required(),
    governorate:Joi.string().min(2).max(100).required(),
  }).required(),

  items: Joi.array().min(1).max(50).items(
    Joi.object({
      productId: Joi.string().required(),
      name:      Joi.string().required(),
      brand:     Joi.string().allow('').optional(),
      sport:     Joi.string().allow('').optional(),
      color:     Joi.string().allow('').optional(),
      colorHex:  Joi.string().allow('').optional(),
      size:      Joi.string().required(),
      qty:       Joi.number().integer().min(1).max(100).required(),
      price:     Joi.number().positive().required(),
      image:     Joi.string().allow('').optional(),
    })
  ).required(),

  source:         Joi.string().valid('website', 'store').default('website'),
  deliveryMethod: Joi.string().valid('standard', 'pickup').default('standard'),
  notes:          Joi.string().max(500).allow('').optional(),
});

import Joi from 'joi';

const sizeSchema = Joi.object({
  label: Joi.string().required(),
  stock: Joi.number().integer().min(0).default(0),
});

const variantSchema = Joi.object({
  color:    Joi.string().required(),
  colorHex: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  images:   Joi.array().items(Joi.string().uri()).default([]),
  sizes:    Joi.array().items(sizeSchema).default([]),
  active:   Joi.boolean().default(true),
});

export const createProductSchema = Joi.object({
  slug:           Joi.string().pattern(/^[a-z0-9-]+$/).required()
    .messages({ 'string.pattern.base': 'Slug must be lowercase letters, numbers, and hyphens only' }),
  sport:          Joi.string().valid('padel', 'football', 'all').required(),
  category:       Joi.string().min(2).max(100).required(),
  brand:          Joi.string().min(1).max(100).required(),
  name:           Joi.string().min(2).max(200).required(),
  subtitle:       Joi.string().max(300).allow('').default(''),
  desc:           Joi.string().max(2000).allow('').default(''),
  price:          Joi.number().positive().required(),
  discountPrice:  Joi.number().positive().allow(null).default(null),
  discountActive: Joi.boolean().default(false),
  badge:          Joi.string().max(50).allow(null, '').default(null),
  variants:       Joi.array().items(variantSchema).default([]),
  active:         Joi.boolean().default(true),
  featured:       Joi.boolean().default(false),
  sortOrder:      Joi.number().integer().default(0),
});

export const updateProductSchema = createProductSchema.fork(
  ['slug', 'sport', 'category', 'brand', 'name', 'price'],
  (f) => f.optional()
);

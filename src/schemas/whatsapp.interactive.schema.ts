import { z } from 'zod';

// Schema for the image in the header
const CtaUrlHeaderImageSchema = z.object({
  link: z.string().url(),
});

// Schema for the header
const CtaUrlHeaderSchema = z.object({
  type: z.literal('image'),
  image: CtaUrlHeaderImageSchema,
});

// Schema for the body
const CtaUrlBodySchema = z.object({
  text: z.string(),
});

// Schema for the action parameters
const CtaUrlActionParamsSchema = z.object({
  display_text: z.string(),
  url: z.string().url(),
});

// Schema for the action
const CtaUrlActionSchema = z.object({
  name: z.literal('cta_url'),
  parameters: CtaUrlActionParamsSchema,
});

// Schema for the footer
const CtaUrlFooterSchema = z.object({
  text: z.string(),
});

// Schema for the interactive object
export const CtaUrlInteractiveObjectSchema = z.object({
  type: z.literal('cta_url'),
  header: CtaUrlHeaderSchema,
  body: CtaUrlBodySchema,
  action: CtaUrlActionSchema,
  footer: CtaUrlFooterSchema.optional(),
});

// Schema for the complete message payload
export const CtaUrlMessagePayloadSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  recipient_type: z.literal('individual'),
  to: z.string(),
  type: z.literal('interactive'),
  interactive: CtaUrlInteractiveObjectSchema,
});

export type CtaUrlInteractiveObject = z.infer<typeof CtaUrlInteractiveObjectSchema>;
export type CtaUrlMessagePayload = z.infer<typeof CtaUrlMessagePayloadSchema>;
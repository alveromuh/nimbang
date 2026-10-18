import { z } from 'zod';

export const ObjectiveSchema = z.object({
  id: z.string(),
  statement: z.string(),
  kind: z.enum(['hygiene', 'motivation']),
});

export const OptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  isBaseline: z.boolean(),
});

export const ItemSchema = z.object({
  id: z.string(),
  optionId: z.string(),
  objectiveId: z.string(),
  kind: z.enum(['benefit', 'cost']),
  value: z.number().min(1).max(5),
  probability: z.number().min(0).max(1),
  risk: z.enum(['ordinary', 'fatal']),
  referenceClass: z.string().optional(),
});

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  domain: z.enum(['fact', 'preference']),
  source: z.string().optional(),
  owner: z.string().optional(),
});

export const PredictionSchema = z.object({
  claimId: z.string(),
  probability: z.number().min(0).max(1),
});

export const DecisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  objectives: z.array(ObjectiveSchema),
  options: z.array(OptionSchema),
  items: z.array(ItemSchema),
  claims: z.array(ClaimSchema),
  predictions: z.array(PredictionSchema).optional(),
});

export type Objective = z.infer<typeof ObjectiveSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type Decision = z.infer<typeof DecisionSchema>;

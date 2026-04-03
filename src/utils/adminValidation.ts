
import { z } from 'zod';

// User validation schemas
export const userUpdateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  is_admin: z.boolean(),
  email_verified: z.boolean()
});

// System announcement validation
export const systemAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  message: z.string().min(1, 'Message is required').max(1000),
  type: z.enum(['info', 'warning', 'success', 'error']),
  target_audience: z.enum(['all', 'admins', 'users', 'specific_plan']),
  is_active: z.boolean(),
  expires_at: z.string().datetime().optional()
});

// Email notification validation
export const emailNotificationSchema = z.object({
  recipient_email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  template_type: z.string().min(1, 'Template type is required'),
  status: z.enum(['pending', 'sent', 'failed', 'delivered'])
});

// Security event validation
export const securityEventSchema = z.object({
  event_type: z.string().min(1, 'Event type is required'),
  user_id: z.string().uuid().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  event_data: z.record(z.any()).optional()
});

// Performance metric validation
export const performanceMetricSchema = z.object({
  metric_name: z.string().min(1, 'Metric name is required'),
  metric_value: z.number().min(0),
  metric_unit: z.string().min(1, 'Metric unit is required'),
  metadata: z.record(z.any()).optional()
});

// Generic validation function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ['Unknown validation error']
    };
  }
}

// Admin permission validation
export function validateAdminPermission(permissions: any, requiredPermission: string): boolean {
  if (!permissions || typeof permissions !== 'object') {
    return false;
  }
  
  return permissions[requiredPermission] === true;
}

// Data sanitization utilities
export function sanitizeUserInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmailAddress(email: string): string {
  return email.toLowerCase().trim();
}

// Rate limiting validation
export function validateRateLimit(lastAction: Date | null, minInterval: number): boolean {
  if (!lastAction) return true;
  
  const now = new Date();
  const timeDiff = now.getTime() - lastAction.getTime();
  return timeDiff >= minInterval;
}

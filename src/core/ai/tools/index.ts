// Export all tool functions
export { searchSimilarText } from './searchSimilarText';
export { checkSpecificAvailability } from './checkSpecificAvailability';
export { findGeneralAvailability } from './findGeneralAvailability';
export { scheduleAppointment } from './scheduleAppointment';

// Export all tool schemas
export { searchSimilarTextSchema } from './searchSimilarText';
export { checkSpecificAvailabilitySchema } from './checkSpecificAvailability';
export { findGeneralAvailabilitySchema } from './findGeneralAvailability';
export { scheduleAppointmentSchema } from './scheduleAppointment';

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  searchSimilarTextSchema,
  checkSpecificAvailabilitySchema,
  findGeneralAvailabilitySchema,
  // scheduleAppointmentSchema, // Commented out as in original
];

// Re-export for backward compatibility
import { searchSimilarTextSchema } from './searchSimilarText';
import { checkSpecificAvailabilitySchema } from './checkSpecificAvailability';
import { findGeneralAvailabilitySchema } from './findGeneralAvailability';
import { scheduleAppointmentSchema } from './scheduleAppointment';
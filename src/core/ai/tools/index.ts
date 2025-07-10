// Import functions and their schemas from respective modules
import { searchSimilarText, searchSimilarTextSchema } from './searchSimilarText';
import { checkSpecificAvailability, checkSpecificAvailabilitySchema } from './checkSpecificAvailability';
import { findGeneralAvailability, findGeneralAvailabilitySchema } from './findGeneralAvailability';
import { scheduleAppointment, scheduleAppointmentSchema } from './scheduleAppointment';
import { checkFreeBusyAndSchedule, checkFreeBusyAndScheduleSchema } from './checkfreeBussyAndSchedule';

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  searchSimilarTextSchema,
  //checkSpecificAvailabilitySchema,
  //findGeneralAvailabilitySchema,
  checkFreeBusyAndScheduleSchema,
  // scheduleAppointmentSchema, // Commented out as in original
];

export const functionRegistry = {
  searchSimilarText: searchSimilarText,
  //checkSpecificAvailability: checkSpecificAvailability,
  //findGeneralAvailability: findGeneralAvailability,
  checkFreeBusyAndSchedule: checkFreeBusyAndSchedule,
  //scheduleAppointment: scheduleAppointment,
};


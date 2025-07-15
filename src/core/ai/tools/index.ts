// Import functions and their schemas from respective modules
import { searchSimilarText, searchSimilarTextSchema } from './searchSimilarText';
import { checkFreeBusyAndSchedule, checkFreeBusyAndScheduleSchema } from './checkfreeBussyAndSchedule';
import { listCalendarEvents, listCalendarEventsSchema } from './listEvents';

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  searchSimilarTextSchema,
  //checkSpecificAvailabilitySchema,
  //findGeneralAvailabilitySchema,
  checkFreeBusyAndScheduleSchema,
  listCalendarEventsSchema,
  // scheduleAppointmentSchema, // Commented out as in original
];

export const functionRegistry = {
  searchSimilarText: searchSimilarText,
  checkFreeBusyAndSchedule: checkFreeBusyAndSchedule,
  listCalendarEvents: listCalendarEvents,

};


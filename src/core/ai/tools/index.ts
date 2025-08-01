// Import functions and their schemas from respective modules
import { searchSimilarText, searchSimilarTextSchema } from './searchSimilarText';
import { checkFreeBusyAndSchedule, checkFreeBusyAndScheduleSchema } from './checkfreeBussyAndSchedule';
import { listCalendarEvents, listCalendarEventsSchema } from './listEvents';
import { deleteEvent, deleteEventSchema } from './deleteEvent';
import { getCalendarFreeBusy, getCalendarFreeBusySchema } from './getFreeBusy';
import { scheduleAppointment, scheduleAppointmentSchema } from './scheduleAppointment';
import { updateAppointment, updateAppointmentSchema } from './updateAppointment';

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  searchSimilarTextSchema,
  //checkSpecificAvailabilitySchema,
  //findGeneralAvailabilitySchema,
  //checkFreeBusyAndScheduleSchema,
  listCalendarEventsSchema,
  deleteEventSchema,
  getCalendarFreeBusySchema,
  scheduleAppointmentSchema,
  updateAppointmentSchema,
];

export const functionRegistry = {
  searchSimilarText: searchSimilarText,
  //checkFreeBusyAndSchedule: checkFreeBusyAndSchedule,
  listCalendarEvents: listCalendarEvents,
  deleteEvent: deleteEvent,
  getCalendarFreeBusy: getCalendarFreeBusy,
  scheduleAppointment: scheduleAppointment,
  updateAppointment: updateAppointment,

};


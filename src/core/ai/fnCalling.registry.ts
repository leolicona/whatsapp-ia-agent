import { checkSpecificAvailability, findGeneralAvailability, scheduleAppointment, searchSimilarText } from './tools';

export const functionRegistry = {
  searchSimilarText: searchSimilarText,
  checkSpecificAvailability: checkSpecificAvailability,
  findGeneralAvailability: findGeneralAvailability,
  //scheduleAppointment: scheduleAppointment,
};

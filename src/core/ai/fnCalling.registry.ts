import { setLightValues, setThermostat, controlMusic, searchSimilarText } from './tools';

export const functionRegistry = {
  searchSimilarText: searchSimilarText,
  //userRequestAppointment: userRequestAppointment,
  set_light_values: setLightValues,
  set_thermostat: setThermostat,
  control_music: controlMusic,
};

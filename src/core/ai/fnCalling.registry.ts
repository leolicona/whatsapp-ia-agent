import { setLightValues, setThermostat, controlMusic, searchSimilarText, get_weather_forecast, userRequestAppointment } from './tools';

export const functionRegistry = {
  searchSimilarText: searchSimilarText,
  //userRequestAppointment: userRequestAppointment,
  set_light_values: setLightValues,
  set_thermostat: setThermostat,
  control_music: controlMusic,
  get_weather_forecast: get_weather_forecast,
  userRequestAppointment: userRequestAppointment
};

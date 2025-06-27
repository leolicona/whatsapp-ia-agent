import { FunctionDeclaration, Type } from '@google/genai';
import type { LightValues, ThermostatSettings, MusicControl } from './ai.types';

// Function implementations for smart home devices
export const setLightValues = (brightness: number, color_temp: string): LightValues => {
  console.log(`🔆 [setLightValues] Setting brightness to ${brightness}% and color temperature to ${color_temp}`);
  
  // Here you would implement the actual logic to control the lights
  // For now, we'll just return the values as confirmation
  return {
    brightness,
    color_temp
  };
};

export const setThermostat = (temperature: number, mode: string) => {
  console.log(`🌡️ [setThermostat] Setting temperature to ${temperature}°C in ${mode} mode`);
  return {
    temperature,
    mode,
    status: 'adjusted'
  };
};

export const controlMusic = (action: string, volume?: number) => {
  console.log(`🎵 [controlMusic] ${action} music${volume ? ` at volume ${volume}%` : ''}`);
  return {
    action,
    volume: volume || 50,
    status: 'success'
  };
};

// Function schemas for smart home devices
export const setLightValuesSchema = {
  name: 'set_light_values',
  description: 'Sets the brightness and color temperature of a light.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      brightness: {
        type: Type.NUMBER,
        description: 'Light level from 0 to 100. Zero is off and 100 is full brightness',
      },
      color_temp: {
        type: Type.STRING,
        enum: ['daylight', 'cool', 'warm'],
        description: 'Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.',
      },
    },
    required: ['brightness', 'color_temp'],
  },
};

// Thermostat control schema
export const setThermostatSchema = {
  name: 'set_thermostat',
  description: 'Control the smart thermostat temperature and mode',
  parameters: {
    type: Type.OBJECT,
    properties: {
      temperature: {
        type: Type.NUMBER,
        description: 'Target temperature in Celsius (16-30)',
      },
      mode: {
        type: Type.STRING,
        description: 'Thermostat mode: heat, cool, auto, or off',
        enum: ['heat', 'cool', 'auto', 'off'],
      },
    },
    required: ['temperature', 'mode'],
  },
};

// Music control schema
export const controlMusicSchema = {
  name: 'control_music',
  description: 'Control music playback and volume',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'Music action: play, pause, stop, next, previous',
        enum: ['play', 'pause', 'stop', 'next', 'previous'],
      },
      volume: {
        type: Type.NUMBER,
        description: 'Volume level (0-100), optional',
      },
    },
    required: ['action'],
  },
};

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  setLightValuesSchema,
  setThermostatSchema,
  controlMusicSchema,
];


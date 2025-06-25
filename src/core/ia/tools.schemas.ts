import { FunctionDeclaration, SchemaType, Schema } from '@google/generative-ai';

interface LightValues {
  brightness: number;
  color_temp: string;
}

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
    type: SchemaType.OBJECT,
    properties: {
      brightness: {
        type: SchemaType.NUMBER,
        description: 'Light level from 0 to 100. Zero is off and 100 is full brightness',
      } as Schema,
      color_temp: {
        type: SchemaType.STRING,
        enum: ['daylight', 'cool', 'warm'],
        description: 'Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.',
      } as Schema,
    },
    required: ['brightness', 'color_temp'],
  } as Schema,
} as FunctionDeclaration;

// Thermostat control schema
export const setThermostatSchema = {
  name: 'set_thermostat',
  description: 'Control the smart thermostat temperature and mode',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      temperature: {
        type: SchemaType.NUMBER,
        description: 'Target temperature in Celsius (16-30)',
      } as Schema,
      mode: {
        type: SchemaType.STRING,
        description: 'Thermostat mode: heat, cool, auto, or off',
        enum: ['heat', 'cool', 'auto', 'off'],
      } as Schema,
    },
    required: ['temperature', 'mode'],
  } as Schema,
} as FunctionDeclaration;

// Music control schema
export const controlMusicSchema = {
  name: 'control_music',
  description: 'Control music playback and volume',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: {
        type: SchemaType.STRING,
        description: 'Music action: play, pause, stop, next, previous',
        enum: ['play', 'pause', 'stop', 'next', 'previous'],
      } as Schema,
      volume: {
        type: SchemaType.NUMBER,
        description: 'Volume level (0-100), optional',
      } as Schema,
    },
    required: ['action'],
  } as Schema,
} as FunctionDeclaration;

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  setLightValuesSchema,
  setThermostatSchema,
  controlMusicSchema,
];


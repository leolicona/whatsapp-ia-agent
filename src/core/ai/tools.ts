import { FunctionDeclaration, Type } from '@google/genai';
import type { LightValues, ThermostatSettings, MusicControl } from './ai.types';
import type { Env } from '../../bindings';
import { embeddings } from '../embeddings/embeddings.service';

// Function implementations for smart home devices
export const setLightValues = (brightness: number, color_temp: string, env?: Env): LightValues => {
  console.log(`🔆 [setLightValues] Setting brightness to ${brightness}% and color temperature to ${color_temp}`);
  console.log("env", env);
  // Here you would implement the actual logic to control the lights
  // Access to Cloudflare services via env parameter if needed:
  // - env.KV for storing device states
  // - env.D1 for device configuration
  // - env.R2 for device logs
  // For now, we'll just return the values as confirmation
  return {
    brightness,
    color_temp
  };
};

export const setThermostat = (temperature: number, mode: string, env?: Env) => {
  console.log(`🌡️ [setThermostat] Setting temperature to ${temperature}°C in ${mode} mode`);
  
  // Access to Cloudflare services via env parameter if needed:
  // - env.ANALYTICS_ENGINE for tracking temperature changes
  // - env.KV for storing thermostat schedules
  return {
    temperature,
    mode,
    status: 'adjusted'
  };
};

export const controlMusic = (action: string, volume?: number, env?: Env) => {
  console.log(`🎵 [controlMusic] ${action} music${volume ? ` at volume ${volume}%` : ''}`);
  
  // Access to Cloudflare services via env parameter if needed:
  // - env.QUEUE for queuing music commands
  // - env.KV for storing playlists
  return {
    action,
    volume: volume || 50,
    status: 'success'
  };
};

/* export const searchSimilarText = async (text: string, env: Env) => {
  console.log(`🔍 [searchSimilarText] Searching for similarities with text: "${text}"`);
  
  try {
    // Initialize embeddings service with environment configuration
    const embeddingsService = embeddings({
      apiKey: env.GEMINI_API_KEY,
      vectorize: env.VECTORIZE,
    });

    console.log('🚀 Embeddings service initialized successfully');

    // Create vector from the input text
    const vectorResult = await embeddingsService.createVectors(text);
    console.log('📊 Vector created:', vectorResult.embeddings.length, 'dimensions');

    // Search for similar vectors (top 5 results)
    const searchResults = await embeddingsService.matchVectors({
      queryVector: vectorResult.embeddings,
      topK: 2,
    });

    console.log('🎯 Search results found:', searchResults.matches.length, 'matches');
    console.log('📋 Detailed results:', JSON.stringify(searchResults.matches, null, 2));

    // Extract and combine metadata content from all matches
    const metadataContent = searchResults.matches
      .map(match => match.metadata?.content)
      .filter(content => content !== undefined)
      .join(' ');
    
    console.log('📝 Extracted metadata content:', metadataContent);

    const testText = `Services Offered
We provide a variety of medical services to meet your needs. This includes:

General Check-ups: Annual physicals, wellness exams, and health screenings for adults and children.

Pediatric Care: Well-child visits, immunizations, and treatment for common childhood illnesses.

Women's Health: Pap smears, contraceptive counseling, and management of gynecological health.

Chronic Disease Management: Ongoing care and support for conditions like diabetes, hypertension, asthma, and high cholesterol.

Minor Procedures: Suture removal, wound care, and skin tag removal.
Our on-site laboratory provides convenient access to common tests like blood work, urinalysis, and strep tests, with results often available quickly.`;

    // Return the combined metadata content or the original text if no matches
    return {
      context: testText,
      status: 'success',
    }
  } catch (error) {
    console.error('❌ Error in searchSimilarText:', error);
    return text; // Return original text on error
  }
};
 */

export const searchSimilarText  = (text: string,  env?: Env) => {
  console.log(`🔍 [searchSimilarText] Searching for similarities with text: "${text}"`);
  
  // Access to Cloudflare services via env parameter if needed:
  // - env.ANALYTICS_ENGINE for tracking temperature changes
  // - env.KV for storing thermostat schedules
  return {
    result: "General Check-ups: Annual physicals, wellness exams, and health screenings for adults and children.",
    status: 'success',
  };
};



/* export const userRequestAppointment = async (text: string, env?: Env) => {
  console.log(`📅 [userRequestAppointment] Processing appointment request: "${text}"`);
  
  try {
    // Mock appointment scheduling logic
    const appointmentTypes = [
      'General Check-up',
      'Pediatric Care',
      'Women\'s Health',
      'Chronic Disease Management',
      'Minor Procedures'
    ];
    
    // Simulate determining appointment type based on user request
    const suggestedType = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];
    
    // Mock available time slots
    const availableSlots = [
      '2024-02-15 09:00 AM',
      '2024-02-15 02:30 PM',
      '2024-02-16 10:15 AM',
      '2024-02-16 03:45 PM',
      '2024-02-17 11:00 AM'
    ];
    
    const response = {
      status: 'appointment_request_initiated',
      message: 'I\'d be happy to help you schedule an appointment at Serenity Health Clinic.',
      suggestedAppointmentType: suggestedType,
      availableSlots: availableSlots.slice(0, 3), // Show first 3 slots
      nextSteps: [
        'Please let me know your preferred appointment type',
        'Choose from the available time slots',
        'Provide your contact information for confirmation'
      ],
      clinicInfo: {
        name: 'Serenity Health Clinic',
        phone: '(555) 123-4567',
        address: '123 Health Street, Wellness City, WC 12345'
      }
    };
    
    console.log('✅ Appointment request processed successfully:', response);
    
    // In a real implementation, you might:
    // - Store the request in env.D1 database
    // - Send notifications via env.QUEUE
    // - Log analytics via env.ANALYTICS_ENGINE
    
    return "Please confirm your appointment request here: https://serenityhealthclinic.com/confirm-appointment"
  } catch (error) {
    console.error('❌ Error in userRequestAppointment:', error);
    return 'I apologize, but there was an error processing your appointment request. Please try again or call our clinic directly at (555) 123-4567.';
  }
}; */



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

// Text similarity search schema
export const searchSimilarTextSchema = {
  name: 'searchSimilarText',
  description: 'Retrieves specific, up-to-date information from the Serenity Health Clinic\'s knowledge base. Use this tool to answer any user questions about the clinic, including its services, hours, location, appointment policies, doctors, and billing.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'The user\'s original question or a concise summary of the information they are looking for. This will be used to search the knowledge base for the most relevant context. Example: \'What do I need to bring for my first appointment?\'',
      },
    },
    required: ['text'],
  },
};

// Text similarity search schema
export const userRequestAppointmentSchema = {
  name: 'userRequestAppointment', 
  description: 'Initiates the appointment scheduling process for a patient at the Serenity Health Clinic. Call this function as soon as a user expresses intent to book an appointment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'The user question about their appointment request e.g. \'I want to schedule an appointment with a doctor\'',
      },
    },
    required: ['text'],
  },
};

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  setLightValuesSchema,
  setThermostatSchema,
  controlMusicSchema,
  searchSimilarTextSchema,
  userRequestAppointmentSchema,
];


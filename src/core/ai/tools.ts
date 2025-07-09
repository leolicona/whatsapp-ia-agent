import { Type } from '@google/genai';
import type { LightValues, ThermostatSettings, MusicControl } from './ai.types';
import type { Env } from '../../bindings';
import { embeddings } from '../embeddings/embeddings.service';
import { getFreeBusy, createEvent } from '../calendar/calendar.service';
import { createDatabase } from '../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../database/calendarServices.service';

// Type definitions for calendar API responses
interface FreeBusyResponse {
  calendars: {
    [calendarId: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
}
// 
export const searchSimilarText = async ({ text, env }: { text: string; env: Env }) => {
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


    return {
      context: metadataContent,
      status: 'success',
    }
  } catch (error) {
    console.error('❌ Error in searchSimilarText:', error);
    return { context: text, status: 'error' }; // Return consistent object structure on error
  }
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



export const checkSpecificAvailability = async ({ serviceName, timeMin, timeMax, env }: { serviceName: string, timeMin: string, timeMax?: string, env: Env }) => {
    console.log(`📅 [checkSpecificAvailability] Checking availability for service ${serviceName} from ${timeMin}`);
    try {
        const db = createDatabase(env);
        const businessId = env.BUSINESS_ID;
        
        if (!businessId) {
            throw new Error('BUSINESS_ID environment variable is not set');
        }
        
        // Get calendar service configuration from database
        const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, serviceName);
        
        if (!calendarService) {
            throw new Error(`Calendar service '${serviceName}' not found for business ${businessId}`);
        }
        
        const { googleCalendarId, settings } = calendarService;
        
        let finalTimeMax = timeMax;
        
        // If timeMax is not provided, calculate it from timeMin + duration
        if (!finalTimeMax) {
            const { duration } = settings as { duration: number }; // duration in minutes
            
            if (!duration) {
                throw new Error(`duration must be configured in calendar service settings when timeMax is not provided`);
            }
            
            // Calculate timeMax by adding duration to timeMin
            const startTime = new Date(timeMin);
            const endTime = new Date(startTime.getTime() + duration * 60000); // Convert minutes to milliseconds
            finalTimeMax = endTime.toISOString();
        }
        
        console.log(`📅 Using calendar ${googleCalendarId} from ${timeMin} to ${finalTimeMax}`);
        
        const freeBusy = await getFreeBusy(googleCalendarId, timeMin, finalTimeMax) as FreeBusyResponse;
        // Assuming the API returns a list of busy slots, if the list is empty, the slot is free.
        const isAvailable = freeBusy.calendars[googleCalendarId].busy.length === 0;
        return { isAvailable };
    } catch (error) {
        console.error('❌ Error in checkSpecificAvailability:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to check availability.';
        return { isAvailable: false, error: errorMessage };
    }
};

export const findGeneralAvailability = async ({ date, serviceName, env }: { date: string, serviceName: string, env: Env }) => {
    console.log(`📅 [findGeneralAvailability] Finding availability for service ${serviceName} on ${date}`);
    try {
        console.log('Creating database connection...');
        const db = createDatabase(env);
        
        console.log('Getting business ID from env...');
        const businessId = env.BUSINESS_ID;
        
        if (!businessId) {
            console.error('❌ Business ID not found in environment variables');
            throw new Error('BUSINESS_ID environment variable is not set');
        }
        console.log(`✅ Business ID found: ${businessId}`);
        
        // Get calendar service configuration from database
        console.log(`Fetching calendar service for business ${businessId} and service ${serviceName}...`);
        const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, serviceName);
        
        if (!calendarService) {
            console.error(`❌ Calendar service not found for ${serviceName}`);
            throw new Error(`Calendar service '${serviceName}' not found for business ${businessId}`);
        }
        console.log('✅ Calendar service found:', calendarService);
        
        const { googleCalendarId, settings } = calendarService;
        console.log('Calendar settings:', settings);
        
        // Extract timeMin and timeMax from settings
        const { openHours, closeHours, timeZone } = settings as { openHours: string, closeHours: string, timeZone: string };
        console.log(`Time range extracted - Min: ${openHours}, Max: ${closeHours}`);
        
        if (!openHours || !closeHours) {
            console.error('❌ Missing time range configuration in settings');
            throw new Error(`timeMin and timeMax must be configured in calendar service settings`);
        }
        
        const timeMin = `${date}${openHours}`;
        const timeMax = `${date}${closeHours}`;
        
        console.log(`📅 Using calendar ${googleCalendarId} from ${timeMin} to ${timeMax}`);
        
        console.log('Fetching free/busy information...');
        const freeBusy = await getFreeBusy(googleCalendarId, timeMin, timeMax) as FreeBusyResponse;
        console.log('Free/Busy response:', freeBusy);

        const calendarKeys = Object.keys(freeBusy.calendars);
        if (!calendarKeys.length) {
            console.error('❌ Invalid free/busy response: No calendars found.');
            throw new Error('Failed to retrieve availability information.');
        }

        // Use the first calendar in the response, regardless of its ID
        const firstCalendarKey = calendarKeys[0];
        const busySlots = freeBusy.calendars[firstCalendarKey].busy;
        
        console.log('✅ Busy slots found:', busySlots);

        // Generate and format available slots
        const availableSlots = generateAvailableSlots(timeMin, timeMax, busySlots, settings as { duration: number });
        const availabilitySummary = formatAvailability(availableSlots);

        return { availability: availabilitySummary };

    } catch (error) {
        console.error('❌ Error in findGeneralAvailability:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to find availability.';
        return { availability: '', error: errorMessage };
    }
};

const generateAvailableSlots = (timeMin: string, timeMax: string, busySlots: { start: string, end: string }[], settings: { duration: number }) => {
    const availableSlots = [];
    const { duration } = settings;
    let currentTime = new Date(timeMin);

    while (currentTime < new Date(timeMax)) {
        const slotEnd = new Date(currentTime.getTime() + duration * 60000);

        const isBusy = busySlots.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return (currentTime < busyEnd && slotEnd > busyStart);
        });

        if (!isBusy) {
            availableSlots.push({ start: new Date(currentTime), end: slotEnd });
        }

        currentTime = slotEnd;
    }

    return availableSlots;
};

const formatAvailability = (slots: { start: Date, end: Date }[]) => {
    if (slots.length === 0) {
        return 'No available slots found.';
    }

    const formattedSlots = slots.map(slot => {
        return `  - ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`;
    }).join('\n');

    return `Available slots:\n${formattedSlots}`;
};

export const scheduleAppointment = async ({ serviceName, day, hour, env, eventDetails }: { serviceName: string, day: string, hour: string, env: Env, eventDetails?: any }) => {
    console.log(`📅 [scheduleAppointment] Scheduling appointment for service ${serviceName} on ${day} at ${hour}`);
    try {
        const db = createDatabase(env);
        const businessId = env.BUSINESS_ID;
        
        if (!businessId) {
            throw new Error('BUSINESS_ID environment variable is not set');
        }
        
        // Get calendar service configuration from database
        const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, serviceName);
        
        if (!calendarService) {
            throw new Error(`Calendar service '${serviceName}' not found for business ${businessId}`);
        }
        
        const { googleCalendarId, settings } = calendarService;
        
        // Extract duration from settings
        const { duration } = settings as { duration: number }; // duration in minutes
        
        if (!duration) {
            throw new Error(`duration must be configured in calendar service settings`);
        }
        
        // Parse day and hour to create start and end times
        const startDateTime = new Date(`${day}T${hour}:00`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000); // Add duration in milliseconds
        
        // Create event object with retrieved data
        const event = {
            summary: eventDetails?.summary || `${serviceName} Appointment`,
            description: eventDetails?.description || `Appointment for ${serviceName}`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: eventDetails?.timeZone || 'UTC'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: eventDetails?.timeZone || 'UTC'
            },
            ...eventDetails // Spread any additional event details
        };
        
        console.log(`📅 Using calendar ${googleCalendarId} for ${duration} minutes`);
        
        const newEvent = await createEvent(googleCalendarId, event);
        return { event: newEvent, status: 'success' };
    } catch (error) {
        console.error('❌ Error in scheduleAppointment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to schedule appointment.';
        return { event: null, status: 'error', error: errorMessage };
    }
};

export const checkSpecificAvailabilitySchema = {
    name: 'checkSpecificAvailability',
    description: 'Checks if a specific time slot is available for an appointment. The calendar ID is automatically retrieved from the database. If timeMax is not provided, it will be calculated using the duration from calendar service settings.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            serviceName: {
                type: Type.STRING,
                description: 'The name of the calendar service to check availability for (e.g., "General Consultation", "Dental Cleaning", etc.). This must match a service name configured in the calendar_services table.',
            },
            timeMin: {
                type: Type.STRING,
                description: 'The start of the time slot to check in ISO 8601 format.',
            },
            timeMax: {
                type: Type.STRING,
                description: 'Optional. The end of the time slot to check in ISO 8601 format. If not provided, it will be calculated by adding the duration from calendar service settings to timeMin.',
            },
        },
        required: ['serviceName', 'timeMin'],
    },
};

export const findGeneralAvailabilitySchema = {
    name: 'findGeneralAvailability',
    description: 'Finds all available appointment slots for a specific service on a given day e.g. Please help to schedule on Monday',
    parameters: {
        type: Type.OBJECT,
        properties: {
            date: {
                type: Type.STRING,
                description: 'The date to check for availability in YYYY-MM-DD format.',
            },
            serviceName: {
                type: Type.STRING,
                description: 'The name of the calendar service to check availability for (e.g., "General Consultation", "Dental Cleaning", etc.). This must match a service name configured in the calendar_services table.',
            },
        },
        required: ['date', 'serviceName'],
    },
};

export const scheduleAppointmentSchema = {
    name: 'scheduleAppointment',
    description: 'Schedules a new appointment for a specific service. The calendar ID and duration are automatically retrieved from the database based on the service name.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            serviceName: {
                type: Type.STRING,
                description: 'The name of the calendar service to schedule the appointment for (e.g., "General Consultation", "Dental Cleaning", etc.). This must match a service name configured in the calendar_services table.',
            },
            day: {
                type: Type.STRING,
                description: 'The date for the appointment in YYYY-MM-DD format (e.g., "2024-01-15").',
            },
            hour: {
                type: Type.STRING,
                description: 'The time for the appointment in HH:MM format (24-hour format, e.g., "14:30" for 2:30 PM).',
            },
            eventDetails: {
                type: Type.OBJECT,
                description: 'Optional additional details for the event.',
                properties: {
                    summary: {
                        type: Type.STRING,
                        description: 'Custom summary or title for the event. If not provided, defaults to "[serviceName] Appointment".',
                    },
                    description: {
                        type: Type.STRING,
                        description: 'Custom description for the event. If not provided, defaults to "Appointment for [serviceName]".',
                    },
                    timeZone: {
                        type: Type.STRING,
                        description: 'The time zone for the appointment. If not provided, defaults to UTC.',
                    },
                },
            },
        },
        required: ['serviceName', 'day', 'hour'],
    },
};

// Export all schemas as an array for easy use
export const allFunctionSchemas = [
  searchSimilarTextSchema,
  checkSpecificAvailabilitySchema,
  findGeneralAvailabilitySchema,
  //scheduleAppointmentSchema,
];




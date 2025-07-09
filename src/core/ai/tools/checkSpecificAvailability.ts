import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { getFreeBusy } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';

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
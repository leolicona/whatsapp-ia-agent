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
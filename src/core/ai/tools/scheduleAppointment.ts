import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { createEvent } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';

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
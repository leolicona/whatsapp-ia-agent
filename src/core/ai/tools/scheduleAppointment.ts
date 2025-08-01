import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { createEvent } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';
import { ToolResponse } from '../ai.types';

// Types
interface ScheduleAppointmentResponse {
    status: 'success' | 'failure';
    message: string;
    data?: {
        event?: any;
        eventId?: string;
        startTime?: string;
        endTime?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

interface EventDetails {
    summary?: string;
    description?: string;
    timeZone?: string;
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
}

// Utility functions
const parseDate = (dateStr: string): string => {
    const today = new Date();
    const normalizedInput = dateStr.toLowerCase().trim();

    switch (normalizedInput) {
        case 'today':
            return today.toISOString().split('T')[0];
        case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        default:
            // Handle "next monday", "next tuesday", etc.
            if (normalizedInput.startsWith('next ')) {
                const dayName = normalizedInput.replace('next ', '');
                const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetDayIndex = daysOfWeek.indexOf(dayName);
                
                if (targetDayIndex !== -1) {
                    const currentDayIndex = today.getDay();
                    let daysToAdd = targetDayIndex - currentDayIndex;
                    if (daysToAdd <= 0) {
                        daysToAdd += 7; // Next week
                    }
                    const targetDate = new Date(today);
                    targetDate.setDate(today.getDate() + daysToAdd);
                    return targetDate.toISOString().split('T')[0];
                }
            }
            
            // Try to parse as ISO date or return as-is
            try {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0];
                }
            } catch (e) {
                // Fall through to return original string
            }
            
            return dateStr;
    }
};

const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    const normalizedTime = timeStr.toLowerCase().trim();
    
    // Handle AM/PM format
    const ampmMatch = normalizedTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = parseInt(ampmMatch[2] || '0');
        const period = ampmMatch[3];
        
        if (period === 'pm' && hours !== 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) {
            hours = 0;
        }
        
        return { hours, minutes };
    }
    
    // Handle 24-hour format
    const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
        return {
            hours: parseInt(timeMatch[1]),
            minutes: parseInt(timeMatch[2])
        };
    }
    
    // Handle hour only (e.g., "5" -> "5:00")
    const hourMatch = normalizedTime.match(/^(\d{1,2})$/);
    if (hourMatch) {
        return {
            hours: parseInt(hourMatch[1]),
            minutes: 0
        };
    }
    
    throw new Error(`Unable to parse time: ${timeStr}`);
};

const createDateTime = (dateStr: string, timeStr: string, timeZone: string = 'UTC'): Date => {
    const date = parseDate(dateStr);
    const { hours, minutes } = parseTime(timeStr);
    
    // Create date in the specified timezone
    const dateTime = new Date(`${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
    
    return dateTime;
};

const addMinutes = (date: Date, minutes: number): Date => {
    return new Date(date.getTime() + (minutes * 60 * 1000));
};

const formatDateTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

// Main function
export const scheduleAppointment = async ({
    serviceName,
    day,
    time,
    duration = 60,
    eventDetails,
    env
}: {
    serviceName: string;
    day: string;
    time: string;
    duration?: number;
    eventDetails?: EventDetails;
    env: Env;
}): Promise<ToolResponse<any>> => {
    try {
        console.log(`📅 Scheduling appointment for service: ${serviceName}`);
        console.log(`📅 Date: ${day}, Time: ${time}, Duration: ${duration} minutes`);

        // Get database connection and calendar service
        const db = createDatabase(env);
        const calendarService = await getCalendarServiceByBusinessIdAndName(db, env.BUSINESS_ID, serviceName);

        if (!calendarService) {
            throw new Error(`Calendar service '${serviceName}' not found. Please check the service name.`);
        }

        const { googleCalendarId, settings } = calendarService;
        const { timeZone, duration: defaultDuration } = settings as { 
            timeZone?: string; 
            duration?: number;
        };
        const appointmentDuration = duration || defaultDuration || 60;

        console.log(`📋 Service config - Calendar ID: ${googleCalendarId}, TimeZone: ${timeZone}`);

        // Parse and create start time
        const startTime = createDateTime(day, time, timeZone);
        const endTime = addMinutes(startTime, appointmentDuration);

        console.log(`🕐 Appointment time: ${formatDateTime(startTime)} - ${formatDateTime(endTime)}`);

        // Validate that the appointment is not in the past
        const now = new Date();
        if (startTime <= now) {
            return {
                status: 'failure',
                message: 'Cannot schedule appointments in the past. Please choose a future date and time.',
                error: {
                    code: 'INVALID_TIME',
                    message: 'Appointment time is in the past'
                }
            };
        }

        // Create the event object
        const event = {
            summary: eventDetails?.summary || `${serviceName} Appointment`,
            description: eventDetails?.description || `Appointment for ${serviceName}`,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            timeZone: eventDetails?.timeZone || timeZone || 'UTC',
            attendees: eventDetails?.attendees || []
        };

        console.log(`📝 Creating event:`, JSON.stringify(event, null, 2));

        // Create the appointment
        const newEvent = await createEvent(googleCalendarId, event);
        console.log(`✅ Appointment scheduled successfully:`, newEvent);

        return {
            status: 'success',
            message: `Appointment successfully scheduled for ${formatDateTime(startTime)}`,
            data: {
                event: newEvent,
                eventId: (newEvent as any)?.id,
                startTime: formatDateTime(startTime),
                endTime: formatDateTime(endTime)
            }
        };

    } catch (error) {
        console.error('❌ Error scheduling appointment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to schedule appointment';
        
        return {
            status: 'failure',
            message: errorMessage,
            error: {
                code: 'SCHEDULING_FAILED',
                message: errorMessage
            }
        };
    }
};

// Schema definition
export const scheduleAppointmentSchema = {
    name: 'scheduleAppointment',
    description: `SCHEDULING TOOL ONLY - Books a specific appointment at a given date and time. This tool is for SCHEDULING/BOOKING appointments only, never for checking availability or deleting appointments. Use this when the user wants to book a specific time slot. For checking availability, use getCalendarFreeBusy or checkFreeBusyAndSchedule. For deleting appointments, use deleteEvent.`,
    parameters: {
        type: Type.OBJECT,
        properties: {
            serviceName: {
                type: Type.STRING,
                description: 'The name of the calendar service to schedule the appointment for (e.g., "general-check-ups", "pediatric-care", etc.). This must match a service name configured in the calendar_services table.'
            },
            day: {
                type: Type.STRING,
                description: 'The day to schedule the appointment. Supports formats like "today", "tomorrow", "next monday", or "YYYY-MM-DD".'
            },
            time: {
                type: Type.STRING,
                description: 'The specific time for the appointment (e.g., "5pm", "5:30pm", "17:00", "2:30 PM"). This is required and must be a specific time.'
            },
            duration: {
                type: Type.NUMBER,
                description: 'Duration of the appointment in minutes. If not provided, uses the service default duration (usually 60 minutes).'
            },
            eventDetails: {
                type: Type.OBJECT,
                description: 'Optional details for the appointment.',
                properties: {
                    summary: {
                        type: Type.STRING,
                        description: 'Custom title for the appointment. If not provided, defaults to "[serviceName] Appointment".'
                    },
                    description: {
                        type: Type.STRING,
                        description: 'Custom description for the appointment. If not provided, defaults to "Appointment for [serviceName]".'
                    },
                    timeZone: {
                        type: Type.STRING,
                        description: 'Time zone for the appointment. If not provided, uses the service timezone or defaults to UTC.'
                    },
                    attendees: {
                        type: Type.ARRAY,
                        description: 'List of attendees for the appointment.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                email: {
                                    type: Type.STRING,
                                    description: 'Email address of the attendee.'
                                },
                                displayName: {
                                    type: Type.STRING,
                                    description: 'Display name of the attendee.'
                                }
                            },
                            required: ['email']
                        }
                    }
                }
            }
        },
        required: ['serviceName', 'day', 'time']
    }
};
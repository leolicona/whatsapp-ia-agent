import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { updateEvent } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';
import { ToolResponse } from '../ai.types';

// Types
interface UpdateAppointmentResponseData {
    event?: any;
    eventId?: string;
    startTime?: string;
    endTime?: string;
    updatedFields?: string[];
}

interface UpdateAppointmentResponse {
    status: 'success' | 'failure';
    message: string;
    data?: UpdateAppointmentResponseData;
    error?: {
        code: string;
        message: string;
    };
}

interface EventUpdateDetails {
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
export const updateAppointment = async ({
    serviceName,
    eventId,
    newDay,
    newTime,
    newDuration,
    eventDetails,
    env
}: {
    serviceName: string;
    eventId: string;
    newDay?: string;
    newTime?: string;
    newDuration?: number;
    eventDetails?: EventUpdateDetails;
    env: Env;
}): Promise<ToolResponse<UpdateAppointmentResponseData>> => {
    try {
        console.log(`📝 Updating appointment for service: ${serviceName}, Event ID: ${eventId}`);
        
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

        console.log(`📋 Service config - Calendar ID: ${googleCalendarId}, TimeZone: ${timeZone}`);

        // Build the update object
        const updateData: any = {};
        const updatedFields: string[] = [];

        // Handle time/date updates
        if (newDay || newTime) {
            if (!newDay || !newTime) {
                throw new Error('Both newDay and newTime must be provided when updating appointment time');
            }

            const startTime = createDateTime(newDay, newTime, timeZone);
            const appointmentDuration = newDuration || defaultDuration || 60;
            const endTime = addMinutes(startTime, appointmentDuration);

            // Validate that the appointment is not in the past
            const now = new Date();
            if (startTime <= now) {
                return {
                    status: 'failure',
                    message: 'Cannot update appointment to a time in the past. Please choose a future date and time.',
                    error: {
                        code: 'INVALID_TIME',
                        message: 'Appointment time is in the past'
                    }
                };
            }

            updateData.start = startTime.toISOString();
            updateData.end = endTime.toISOString();
            updatedFields.push('start time', 'end time');

            console.log(`🕐 New appointment time: ${formatDateTime(startTime)} - ${formatDateTime(endTime)}`);
        } else if (newDuration) {
            // If only duration is being updated, we need the current start time
            // For now, we'll require both newDay and newTime when updating duration
            throw new Error('When updating duration, both newDay and newTime must also be provided');
        }

        // Handle event details updates
        if (eventDetails?.summary) {
            updateData.summary = eventDetails.summary;
            updatedFields.push('title');
        }

        if (eventDetails?.description) {
            updateData.description = eventDetails.description;
            updatedFields.push('description');
        }

        if (eventDetails?.timeZone) {
            updateData.timeZone = eventDetails.timeZone;
            updatedFields.push('timezone');
        }

        if (eventDetails?.attendees) {
            updateData.attendees = eventDetails.attendees;
            updatedFields.push('attendees');
        }

        // Check if there are any updates to make
        if (Object.keys(updateData).length === 0) {
            return {
                status: 'failure',
                message: 'No updates provided. Please specify what you want to update (time, title, description, attendees, etc.).',
                error: {
                    code: 'NO_UPDATES',
                    message: 'No update fields provided'
                }
            };
        }

        console.log(`📝 Updating event with data:`, JSON.stringify(updateData, null, 2));

        // Update the appointment
        const updatedEvent = await updateEvent(googleCalendarId, eventId, updateData);
        console.log(`✅ Appointment updated successfully:`, updatedEvent);

        const responseMessage = `Appointment successfully updated. Updated: ${updatedFields.join(', ')}.`;

        return {
            status: 'success',
            message: responseMessage,
            data: {
                event: updatedEvent,
                eventId: eventId,
                startTime: updateData.start ? formatDateTime(new Date(updateData.start)) : undefined,
                endTime: updateData.end ? formatDateTime(new Date(updateData.end)) : undefined,
                updatedFields
            }
        };

    } catch (error) {
        console.error('❌ Error updating appointment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update appointment';
        
        return {
            status: 'failure',
            message: errorMessage,
            error: {
                code: 'UPDATE_FAILED',
                message: errorMessage
            }
        };
    }
};

// Schema definition
export const updateAppointmentSchema = {
    name: 'updateAppointment',
    description: `UPDATE APPOINTMENT TOOL ONLY - Updates an existing calendar appointment by its event ID. This tool is for UPDATING/MODIFYING existing appointments only. You can update the time, date, duration, title, description, or attendees. The event ID must be obtained from a previous call to listCalendarEvents. For creating new appointments, use scheduleAppointment. For deleting appointments, use deleteEvent.`,
    parameters: {
        type: Type.OBJECT,
        properties: {
            serviceName: {
                type: Type.STRING,
                description: 'The name of the calendar service that contains the appointment to update (e.g., "general-check-ups", "pediatric-care", etc.). This must match a service name configured in the calendar_services table.'
            },
            eventId: {
                type: Type.STRING,
                description: 'The unique ID of the event to update. This must be obtained from a previous call to listCalendarEvents.'
            },
            newDay: {
                type: Type.STRING,
                description: 'The new day for the appointment (optional). Supports formats like "today", "tomorrow", "next monday", or "YYYY-MM-DD". If provided, newTime must also be provided.'
            },
            newTime: {
                type: Type.STRING,
                description: 'The new time for the appointment (optional). Formats like "5pm", "5:30pm", "17:00", "2:30 PM". If provided, newDay must also be provided.'
            },
            newDuration: {
                type: Type.NUMBER,
                description: 'New duration of the appointment in minutes (optional). Can only be used when also updating newDay and newTime.'
            },
            eventDetails: {
                type: Type.OBJECT,
                description: 'Optional details to update for the appointment.',
                properties: {
                    summary: {
                        type: Type.STRING,
                        description: 'New title/summary for the appointment.'
                    },
                    description: {
                        type: Type.STRING,
                        description: 'New description for the appointment.'
                    },
                    timeZone: {
                        type: Type.STRING,
                        description: 'New time zone for the appointment.'
                    },
                    attendees: {
                        type: Type.ARRAY,
                        description: 'New list of attendees for the appointment (replaces existing attendees).',
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
        required: ['serviceName', 'eventId']
    }
};
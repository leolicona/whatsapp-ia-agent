import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { getFreeBusy, createEvent } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';
import { ToolResponse } from '../ai.types';

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

// Response types for different scenarios
type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE_SUGGESTIONS' | 'AVAILABLE_SUGGESTIONS' | 'UNAVAILABLE' | 'BOOKED';

interface AvailabilityResponseData {
  status: AvailabilityStatus;
  time?: string;
  message?: string;
  suggestions?: Array<{ start: string; end: string }>;
  event?: any;
}

// Helper functions for date and time parsing

const parseDate = (dateInput: string): string => {
    const today = new Date();
    const inputLower = dateInput.toLowerCase().trim();
    
    // Handle "today"
    if (inputLower === 'today') {
        return today.toISOString().split('T')[0];
    }
    
    // Handle "tomorrow"
    if (inputLower === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    
    // Handle "next [day]" format
    const nextDayMatch = inputLower.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
    if (nextDayMatch) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(nextDayMatch[1]);
        const currentDay = today.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7; // If same day, go to next week
        
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilTarget);
        return nextDate.toISOString().split('T')[0];
    }
    
    // Handle YYYY-MM-DD format (assume it's already valid)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }
    
    // Default to today if can't parse
    console.warn(`Could not parse date: ${dateInput}, defaulting to today`);
    return today.toISOString().split('T')[0];
};

const parseTime = (timeInput: string): { hour: number; minute: number } => {
    const timeStr = timeInput.toLowerCase().trim();
    
    // Handle formats like "5pm", "5:30pm", "17:00", "17:00:00", "5:30 PM"
    const timeMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/);
    
    if (!timeMatch) {
        throw new Error(`Invalid time format: ${timeInput}`);
    }
    
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2] || '0');
    // Ignore seconds (timeMatch[3]) as we only need hour and minute
    const period = timeMatch[4];
    
    if (period === 'pm' && hour !== 12) {
        hour += 12;
    } else if (period === 'am' && hour === 12) {
        hour = 0;
    }
    
    return { hour, minute };
};

const setTimeOnDate = (date: string, timeStr: string, timezone?: string): string => {
    const { hour, minute } = parseTime(timeStr);
    const dateTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
    
    if (timezone) {
        // Convert to timezone-aware ISO string
        // For API compatibility, we'll use UTC format with 'Z' suffix
        return dateTime.toISOString();
    }
    
    return `${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
};

const addHours = (isoString: string, hours: number): string => {
    const date = new Date(isoString);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
};

const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
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

const calculateFreeSlots = (dayStart: string, dayEnd: string, busySlots: Array<{ start: string; end: string }>, duration: number): Array<{ start: string; end: string }> => {
    const freeSlots: Array<{ start: string; end: string }> = [];
    const slotDurationMs = duration * 60 * 1000; // Convert minutes to milliseconds
    
    // Sort busy slots by start time
    const sortedBusySlots = [...busySlots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    let currentTime = new Date(dayStart);
    const endTime = new Date(dayEnd);
    
    for (const busySlot of sortedBusySlots) {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);
        
        // Check if there's a gap before this busy slot
        while (currentTime.getTime() + slotDurationMs <= busyStart.getTime()) {
            const slotEnd = new Date(currentTime.getTime() + slotDurationMs);
            freeSlots.push({
                start: currentTime.toISOString(),
                end: slotEnd.toISOString()
            });
            currentTime = slotEnd;
        }
        
        // Move current time to after this busy slot
        if (busyEnd > currentTime) {
            currentTime = busyEnd;
        }
    }
    
    // Check for remaining slots after the last busy period
    while (currentTime.getTime() + slotDurationMs <= endTime.getTime()) {
        const slotEnd = new Date(currentTime.getTime() + slotDurationMs);
        freeSlots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString()
        });
        currentTime = slotEnd;
    }
    
    return freeSlots;
};

export const checkFreeBusyAndSchedule = async ({ 
    day, 
    hour, 
    serviceName, 
    env,
    shouldBook = true,
    eventDetails
}: { 
    day: string; 
    hour?: string; 
    serviceName: string; 
    env: Env;
    shouldBook?: boolean;
    eventDetails?: {
        summary?: string;
        description?: string;
        timeZone?: string;
        attendees?: Array<{ email: string; displayName?: string; }>;
    };
}): Promise<ToolResponse<AvailabilityResponseData>> => {
    console.log(`📅 [checkfreeBussyAndSchedule] Checking availability for service ${serviceName} on ${day}${hour ? ` at ${hour}` : ''}`);
    console.log(`🔍 Input parameters:`, { day, hour, serviceName });
    
    try {
        // 1. Parse the input 'day' into a specific calendar date
        const targetDate = parseDate(day);
        console.log(`✅ Parsed date: ${targetDate}`);
        
        // Get database and calendar service configuration
        const db = createDatabase(env);
        const businessId = env.BUSINESS_ID;
        console.log(`🏢 Business ID: ${businessId}`);
        
        if (!businessId) {
            throw new Error('BUSINESS_ID environment variable is not set');
        }
        
        const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, serviceName);
        console.log(`📊 Calendar service found:`, calendarService);
        
        if (!calendarService) {
            throw new Error(`Calendar service '${serviceName}' not found for business ${businessId}`);
        }
        
        const { googleCalendarId, settings } = calendarService;
        
        const { openHours, closeHours, duration, timeZone } = settings as { 
            openHours: string; 
            closeHours: string; 
            duration: number;
            timeZone?: string; 
        };
        console.log(`⚙️ Service settings:`, { googleCalendarId, openHours, closeHours, duration });
        
        if (!openHours || !closeHours || !duration) {
            throw new Error('Missing required settings: openHours, closeHours, or duration');
        }
        
        // Validate time format
        try {
            parseTime(openHours.replace('T', ''));
            parseTime(closeHours.replace('T', ''));
        } catch (error) {
            console.error('❌ Invalid time format in business hours:', { openHours, closeHours });
            throw new Error(`Invalid business hours format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Check if a specific hour was provided
        if (hour) {
            // SCENARIO 1: User provided a specific day and hour
            console.log(`🎯 Checking specific time slot: ${hour}`);
            
            const startTime = setTimeOnDate(targetDate, hour, timeZone);
            const endTime = addHours(startTime, 1); // Assuming 1-hour appointments
            
            console.log(`⏰ Checking availability window: ${startTime} to ${endTime}`);
            
            // Check if the requested time is in the past for today
            const isToday = day.toLowerCase().trim() === 'today';
            if (isToday) {
                const now = new Date();
                const requestedTime = new Date(startTime);
                if (requestedTime <= now) {
                    console.log(`❌ Requested time ${hour} is in the past for today`);
                    return {
                        status: 'failure',
                        message: 'The requested time has already passed. Please choose a future time.',
                        data: {
                            status: 'UNAVAILABLE',
                            message: 'The requested time has already passed. Please choose a future time.'
                        }
                    };
                }
            }
            
            const freeBusy = await getFreeBusy(googleCalendarId, startTime, endTime) as FreeBusyResponse;
            console.log(`📑 FreeBusy response:`, freeBusy);
            
            const calendarKeys = Object.keys(freeBusy.calendars);
            
            if (!calendarKeys.length) {
                throw new Error('Failed to retrieve availability information.');
            }
            
            const busySlots = freeBusy.calendars[calendarKeys[0]].busy;
            console.log(`🚫 Busy slots found:`, busySlots);
            
            if (busySlots.length === 0) {
                // The requested time is available
                console.log(`✅ Requested time slot is available`);
                
                if (shouldBook) {
                    // Book the appointment
                    console.log(`📝 Booking appointment for ${hour} on ${day}`);
                    
                    const endTime = addHours(startTime, duration / 60); // Convert minutes to hours
                    
                    const event = {
                        summary: eventDetails?.summary || `${serviceName} Appointment`,
                        description: eventDetails?.description || `Appointment for ${serviceName}`,
                        start: new Date(startTime).toISOString(),
                        end: new Date(endTime).toISOString(),
                        timeZone: eventDetails?.timeZone || timeZone || 'UTC',
                        attendees: eventDetails?.attendees || []
                    };
                    
                    console.log(`🔍 Event object being sent:`, JSON.stringify(event, null, 2));
                    
                    try {
                        const newEvent = await createEvent(googleCalendarId, event);
                        console.log(`✅ Appointment booked successfully:`, newEvent);
                        
                        return {
                            status: 'success',
                            message: `Appointment successfully booked for ${formatDateTime(startTime)}`,
                            data: {
                                status: 'BOOKED',
                                time: formatDateTime(startTime),
                                message: `Appointment successfully booked for ${formatDateTime(startTime)}`,
                                event: newEvent
                            }
                        };
                    } catch (bookingError) {
                        console.error(`❌ Failed to book appointment:`, bookingError);
                        return {
                            status: 'failure',
                            message: `Time slot is available but booking failed: ${bookingError instanceof Error ? bookingError.message : 'Unknown error'}`,
                            error: {
                                code: 'BOOKING_FAILED',
                                message: bookingError instanceof Error ? bookingError.message : 'Unknown error'
                            },
                            data: {
                                status: 'UNAVAILABLE',
                                message: `Time slot is available but booking failed: ${bookingError instanceof Error ? bookingError.message : 'Unknown error'}`
                            }
                        };
                    }
                } else {
                    return {
                        status: 'success',
                        message: 'Time slot is available.',
                        data: {
                            status: 'AVAILABLE',
                            time: formatDateTime(startTime)
                        }
                    };
                }
            } else {
                // The requested time is booked, fall through to find other options
                console.log(`❌ Requested time ${hour} is booked, finding alternatives...`);
                // Continue to SCENARIO 2 logic below
            }
        }
        
        // SCENARIO 2: User only provided a day OR specific time was unavailable
        console.log(`📋 Finding all available slots for ${targetDate}`);
        
        const dayStartTime = setTimeOnDate(targetDate, openHours.replace('T', ''), timeZone);
        let dayEndTime = setTimeOnDate(targetDate, closeHours.replace('T', ''), timeZone);
        
        // Handle case where close time is before open time (next day)
        if (new Date(dayEndTime) <= new Date(dayStartTime)) {
            console.log(`⚠️ Close time is before open time, assuming next day close`);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            dayEndTime = setTimeOnDate(nextDay.toISOString().split('T')[0], closeHours.replace('T', ''), timeZone);
        }
        
        console.log(`🕒 Business hours: ${dayStartTime} to ${dayEndTime}`);
        
        const freeBusy = await getFreeBusy(googleCalendarId, dayStartTime, dayEndTime) as FreeBusyResponse;
        console.log(`📑 Full day FreeBusy response:`, freeBusy);
        
        const calendarKeys = Object.keys(freeBusy.calendars);
        
        if (!calendarKeys.length) {
            throw new Error('Failed to retrieve availability information.');
        }
        
        const allBusySlots = freeBusy.calendars[calendarKeys[0]].busy;
        console.log(`🚫 All busy slots for the day:`, allBusySlots);
        
        let availableSlots = calculateFreeSlots(dayStartTime, dayEndTime, allBusySlots, duration);
        console.log(`✅ Available slots calculated:`, availableSlots);
        
        // Filter out past time slots if checking for today
        const isToday = day.toLowerCase().trim() === 'today';
        if (isToday) {
            const now = new Date();
            const currentTimeWithBuffer = new Date(now.getTime() + (15 * 60 * 1000)); // Add 15-minute buffer
            availableSlots = availableSlots.filter(slot => {
                const slotStart = new Date(slot.start);
                return slotStart > currentTimeWithBuffer;
            });
            console.log(`🕐 Filtered out past slots for today. Remaining slots:`, availableSlots.length);
        }
        
        if (availableSlots.length === 0) {
            console.log(`❌ No available slots found for the day`);
            const message = isToday 
                ? 'Sorry, there are no more available appointments today.'
                : 'Sorry, there are no available appointments on that day.';
            return {
                status: 'no_data',
                message,
                data: {
                    status: 'UNAVAILABLE',
                    message
                }
            };
        }
        
        // Format suggestions for better readability
        const formattedSuggestions = availableSlots.map(slot => ({
            start: formatDateTime(slot.start),
            end: formatDateTime(slot.end)
        }));
        console.log(`📝 Formatted suggestions:`, formattedSuggestions);
        
        if (hour) {
            // Original request was for a specific hour that was unavailable
            console.log(`🔄 Returning alternative suggestions for unavailable requested time`);
            return {
                status: 'partial_success',
                message: 'That time is booked, but we have other openings on that day.',
                data: {
                    status: 'UNAVAILABLE_SUGGESTIONS',
                    message: 'That time is booked, but we have other openings on that day.',
                    suggestions: formattedSuggestions
                }
            };
        } else {
            // Original request was just for the day
            console.log(`📋 Returning all available slots for the day`);
            return {
                status: 'success',
                message: 'Available slots found.',
                data: {
                    status: 'AVAILABLE_SUGGESTIONS',
                    suggestions: formattedSuggestions
                }
            };
        }
        
    } catch (error) {
        console.error('❌ Error in checkfreeBussyAndSchedule:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        const errorMessage = error instanceof Error ? error.message : 'Failed to check availability.';
        return {
            status: 'failure',
            message: errorMessage,
            error: {
                code: 'AVAILABILITY_CHECK_FAILED',
                message: errorMessage
            },
            data: {
                status: 'UNAVAILABLE',
                message: errorMessage
            }
        };
    }
};
export const checkFreeBusyAndScheduleSchema = {
    name: 'checkFreeBusyAndSchedule',
    description: 'Checks appointment availability for a specific service and automatically books the appointment when a slot is available. Handles two scenarios: checking a specific time slot (day + hour) or suggesting all available slots for a given day (day only). Supports natural language dates like "today", "tomorrow", "next monday". By default, creates calendar events when slots are available unless shouldBook is explicitly set to false.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            day: {
                type: Type.STRING,
                description: 'The day to check for availability. Supports formats like "today", "tomorrow", "next monday", or "YYYY-MM-DD".'
            },
            hour: {
                type: Type.STRING,
                description: 'Optional specific hour to check (e.g., "5pm", "5:30pm", "17:00", "2:30 PM"). If provided, checks that specific time slot. If omitted, returns all available slots for the day.'
            },
            serviceName: {
                type: Type.STRING,
                description: 'The name of the calendar service to check availability for (e.g., "general-check-ups", "pediatric-care", etc.). This must match a service name configured in the calendar_services table.'
            },
            shouldBook: {
                type: Type.BOOLEAN,
                description: 'Whether to book the appointment if the requested time slot is available. Defaults to true (automatically books available slots). Set to false to only check availability without booking.'
            },
            eventDetails: {
                type: Type.OBJECT,
                description: 'Optional details for the appointment when booking.',
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
        required: ['day', 'serviceName']
    }
};
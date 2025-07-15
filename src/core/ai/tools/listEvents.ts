import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { listEvents } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';
import { ToolResponse } from '../ai.types';

// Reused utility functions from checkfreeBussyAndSchedule.ts
const parseDate = (dateInput: string): string => {
    console.log(`➡️ [parseDate] Input: ${dateInput}`);
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

const formatDateTime = (isoString: string): string => {
    console.log(`➡️ [formatDateTime] Input: ${isoString}`);
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

// Type definitions for calendar API responses
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  status: string;
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

interface ListEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
  summary: string;
  timeZone: string;
}

// Response types for different scenarios
type EventsStatus = 'EVENTS_FOUND' | 'NO_EVENTS_FOUND' | 'ERROR';

interface EventsResponseData {
  status: EventsStatus;
  message?: string;
  events?: Array<{
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
  }>;
  timeFrame?: {
    start: string;
    end: string;
  };
}

// Helper functions for date and time parsing (refactored to reuse parseDate)
const parseTimeFrame = (timeFrame?: string): { start: Date; end: Date } => {
  console.log(`➡️ [parseTimeFrame] Input: ${timeFrame}`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (!timeFrame) {
    // Smart Default: Current time to 14 days out
    const start = now;
    const end = new Date(now);
    end.setDate(now.getDate() + 14);
    return { start, end };
  }
  
  const timeFrameLower = timeFrame.toLowerCase().trim();
  
  // Handle "this week"
  if (timeFrameLower === 'this week') {
    const start = now;
    const end = new Date(today);
    const daysUntilSunday = 7 - today.getDay();
    end.setDate(today.getDate() + daysUntilSunday);
    return { start, end };
  }
  
  // Handle "next week"
  if (timeFrameLower === 'next week') {
    const start = new Date(today);
    const daysUntilNextMonday = 7 - today.getDay() + 1;
    start.setDate(today.getDate() + daysUntilNextMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  
  // Handle "[day]" format (this week) - for days that haven't passed yet
  const dayMatch = timeFrameLower.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (dayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(dayMatch[1]);
    const currentDay = today.getDay();
    
    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Next week if day has passed
    }
    
    const start = new Date(today);
    start.setDate(today.getDate() + daysUntilTarget);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }
  
  // For all other cases (today, tomorrow, next [day], specific dates), use parseDate
  try {
    const targetDateStr = parseDate(timeFrame);
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    
    // For single day requests, return the full day
    const start = targetDate;
    const end = new Date(targetDate);
    end.setDate(targetDate.getDate() + 1);
    
    return { start, end };
  } catch (error) {
    // Default to smart default if can't parse
    console.warn(`Could not parse time frame: ${timeFrame}, using smart default`);
    const start = now;
    const end = new Date(now);
    end.setDate(now.getDate() + 14);
    return { start, end };
  }
};

const formatTimeFrame = (start: Date, end: Date): string => {
  const startStr = start.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const endStr = end.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `${startStr} to ${endStr}`;
};

export const listCalendarEvents = async ({
  serviceName,
  timeFrame,
  maxResults = 50,
  env
}: {
  serviceName: string;
  timeFrame?: string;
  maxResults?: number;
  env: Env;
}): Promise<ToolResponse<EventsResponseData>> => {
  console.log(`📅 [listCalendarEvents] Retrieving events for service ${serviceName}${timeFrame ? ` for ${timeFrame}` : ' (smart default)'}`);
  console.log(`🔍 Input parameters:`, { serviceName, timeFrame, maxResults });
  console.log(`🌍 Environment:`, { env });
  
  try {
    // Get database and calendar service configuration
    const db = createDatabase(env);
    console.log(`🗄️ Database connection created`);
    
    const businessId = env.BUSINESS_ID;
    console.log(`🏢 Business ID: ${businessId}`);
    console.log(`🔑 Environment variables:`, { BUSINESS_ID: businessId });
    
    if (!businessId) {
      console.error('❌ Missing BUSINESS_ID in environment variables');
      throw new Error('BUSINESS_ID environment variable is not set');
    }
    
    console.log(`➡️ Calling getCalendarServiceByBusinessIdAndName with businessId: ${businessId}, serviceName: ${serviceName}`);
    const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, serviceName);
    console.log(`📊 Calendar service found:`, calendarService);
    console.log(`🔍 Calendar service details:`, JSON.stringify(calendarService, null, 2));
    
    if (!calendarService) {
      console.error(`❌ Calendar service not found`, { businessId, serviceName });
      throw new Error(`Calendar service '${serviceName}' not found for business ${businessId}`);
    }
    
    const { googleCalendarId, settings } = calendarService;
    const { timeZone } = settings as { timeZone?: string };
    console.log(`⚙️ Service settings:`, { googleCalendarId, timeZone });
    console.log(`📝 Full settings object:`, settings);
    
    // Parse time frame
    const { start, end } = parseTimeFrame(timeFrame);
    const timeMin = start.toISOString();
    const timeMax = end.toISOString();
    
    console.log(`⏰ Time range:`, { timeMin, timeMax, timeFrame });
    console.log(`📅 Formatted time frame: ${formatTimeFrame(start, end)}`);
    console.log(`🕒 Raw date objects:`, { start, end });
    
    // Retrieve events from calendar
    console.log(`➡️ Calling listEvents with googleCalendarId: ${googleCalendarId}, timeMin: ${timeMin}, timeMax: ${timeMax}, maxResults: ${maxResults}`);
    const eventsResponse = await listEvents(googleCalendarId, timeMin, timeMax, maxResults) as ListEventsResponse;
    console.log(`✅ Received eventsResponse.items.length: ${eventsResponse.items ? eventsResponse.items.length : 0}`);
    console.log(`📑 Events response:`, JSON.stringify(eventsResponse, null, 2));
    
    if (!eventsResponse.items || eventsResponse.items.length === 0) {
      console.log(`❌ No events found for the specified time frame`);
      console.log(`📊 Response details:`, { timeFrame, start: timeMin, end: timeMax });
      return {
        status: 'no_data',
        message: `No appointments found${timeFrame ? ` for ${timeFrame}` : ' in the next 14 days'}.`,
        data: {
          status: 'NO_EVENTS_FOUND',
          message: `No appointments found${timeFrame ? ` for ${timeFrame}` : ' in the next 14 days'}.`,
          timeFrame: {
            start: formatTimeFrame(start, end).split(' to ')[0],
            end: formatTimeFrame(start, end).split(' to ')[1]
          }
        }
      };
    }
    
    // Format events for response
    console.log(`🔄 Processing ${eventsResponse.items.length} events`);
    const formattedEvents = eventsResponse.items
      .filter(event => {
        const isNotCancelled = event.status !== 'cancelled';
        console.log(`📌 Event ${event.id}: status=${event.status}, included=${isNotCancelled}`);
        return isNotCancelled;
      })
      .map(event => {
        console.log(`🔍 Processing event:`, event);
        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description,
          startTime: formatDateTime(event.start.dateTime),
          endTime: formatDateTime(event.end.dateTime),
          location: event.location,
          attendees: event.attendees?.map(attendee => {
            console.log(`👤 Processing attendee:`, attendee);
            return attendee.displayName || attendee.email;
          }).filter(Boolean)
        };
      });
    
    console.log(`✅ Found ${formattedEvents.length} events`);
    console.log(`📝 Formatted events:`, JSON.stringify(formattedEvents, null, 2));
    
    return {
      status: 'success',
      message: `Found ${formattedEvents.length} appointment${formattedEvents.length === 1 ? '' : 's'}${timeFrame ? ` for ${timeFrame}` : ' in the next 14 days'}.`,
      data: {
        status: 'EVENTS_FOUND',
        message: `Found ${formattedEvents.length} appointment${formattedEvents.length === 1 ? '' : 's'}${timeFrame ? ` for ${timeFrame}` : ' in the next 14 days'}.`,
        events: formattedEvents,
        timeFrame: {
          start: formatTimeFrame(start, end).split(' to ')[0],
          end: formatTimeFrame(start, end).split(' to ')[1]
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Error in listCalendarEvents:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve calendar events.';
    return {
      status: 'failure',
      message: errorMessage,
      error: {
        code: 'CALENDAR_EVENTS_ERROR',
        message: errorMessage
      },
      data: {
        status: 'ERROR',
        message: errorMessage
      }
    };
  }
};

export const listCalendarEventsSchema = {
  name: 'listCalendarEvents',
  description: 'Retrieves calendar events for a specific service. Supports two scenarios: Smart Default Time Frame (current time to 14 days out) for general requests, and Specific Time Frame Request for user-defined periods like "today", "tomorrow", "this week", "next week", "monday", "next friday", etc. e.g. I would like to see my appointments for tomorrow.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: {
        type: Type.STRING,
        description: 'The name of the calendar service to retrieve events from (e.g., "general-check-ups", "pediatric-care", etc.). This must match a service name configured in the calendar_services table.'
      },
      timeFrame: {
        type: Type.STRING,
        description: 'Optional time frame for retrieving events. Supports natural language like "today", "tomorrow", "this week", "next week", "monday", "next friday", etc. If omitted, uses smart default (current time to 14 days out).'
      },
      maxResults: {
        type: Type.NUMBER,
        description: 'Optional maximum number of events to return (default: 50, max: 250).'
      }
    },
    required: ['serviceName']
  }
};
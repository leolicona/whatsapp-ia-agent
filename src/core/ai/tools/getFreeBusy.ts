import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { getFreeBusy } from '../../calendar/calendar.service';
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
type FreeBusyStatus = 'FREE_BUSY_FOUND' | 'NO_BUSY_PERIODS' | 'ERROR';

interface FreeBusyResponseData {
  status: FreeBusyStatus;
  message?: string;
  calendarId?: string;
  timeFrame?: {
    start: string;
    end: string;
  };
  busyPeriods?: Array<{
    start: string;
    end: string;
    startFormatted: string;
    endFormatted: string;
  }>;
  freePeriods?: Array<{
    start: string;
    end: string;
    startFormatted: string;
    endFormatted: string;
    durationMinutes: number;
  }>;
}

// Reused utility functions
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

const parseTimeFrame = (timeFrame?: string): { start: Date; end: Date } => {
  console.log(`➡️ [parseTimeFrame] Input: ${timeFrame}`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (!timeFrame) {
    // Default: Today from current time to end of day
    const start = now;
    const end = new Date(today);
    end.setDate(today.getDate() + 1);
    end.setHours(0, 0, 0, 0); // Start of next day
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
    // Default to today if can't parse
    console.warn(`Could not parse time frame: ${timeFrame}, using default`);
    const start = now;
    const end = new Date(today);
    end.setDate(today.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }
};

const calculateFreePeriods = (
  dayStart: string, 
  dayEnd: string, 
  busySlots: Array<{ start: string; end: string }>
): Array<{ start: string; end: string; durationMinutes: number }> => {
  const freePeriods: Array<{ start: string; end: string; durationMinutes: number }> = [];
  
  // Sort busy slots by start time
  const sortedBusySlots = [...busySlots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  let currentTime = new Date(dayStart);
  const endTime = new Date(dayEnd);
  
  for (const busySlot of sortedBusySlots) {
    const busyStart = new Date(busySlot.start);
    const busyEnd = new Date(busySlot.end);
    
    // If there's a gap between current time and busy start, it's a free period
    if (currentTime < busyStart) {
      const durationMs = busyStart.getTime() - currentTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      
      if (durationMinutes > 0) {
        freePeriods.push({
          start: currentTime.toISOString(),
          end: busyStart.toISOString(),
          durationMinutes
        });
      }
    }
    
    // Move current time to end of busy period
    currentTime = new Date(Math.max(currentTime.getTime(), busyEnd.getTime()));
  }
  
  // Check for free time after the last busy period
  if (currentTime < endTime) {
    const durationMs = endTime.getTime() - currentTime.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes > 0) {
      freePeriods.push({
        start: currentTime.toISOString(),
        end: endTime.toISOString(),
        durationMinutes
      });
    }
  }
  
  return freePeriods;
};

export const getCalendarFreeBusy = async ({
  serviceName,
  timeFrame,
  env
}: {
  serviceName: string;
  timeFrame?: string;
  env: Env;
}): Promise<ToolResponse<FreeBusyResponseData>> => {
  console.log(`📅 [getCalendarFreeBusy] Retrieving free/busy information for service ${serviceName}${timeFrame ? ` for ${timeFrame}` : ' (default timeframe)'}`);
  console.log(`🔍 Input parameters:`, { serviceName, timeFrame });
  
  try {
    // Get database and calendar service configuration
    const db = createDatabase(env);
    console.log(`🗄️ Database connection created`);
    
    const businessId = env.BUSINESS_ID;
    console.log(`🏢 Business ID: ${businessId}`);
    
    if (!businessId) {
      console.error('❌ Missing BUSINESS_ID in environment variables');
      throw new Error('BUSINESS_ID environment variable is not set');
    }
    
    console.log(`➡️ Calling getCalendarServiceByBusinessIdAndName with businessId: ${businessId}, serviceName: ${serviceName}`);
    const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, serviceName);
    console.log(`📊 Calendar service found:`, calendarService);
    
    if (!calendarService) {
      console.error(`❌ Calendar service not found`, { businessId, serviceName });
      throw new Error(`Calendar service '${serviceName}' not found for business ${businessId}`);
    }
    
    const { googleCalendarId, settings } = calendarService;
    const { timeZone, openHours, closeHours } = settings as { 
      timeZone?: string; 
      openHours?: string; 
      closeHours?: string; 
    };
    console.log(`⚙️ Service settings:`, { googleCalendarId, timeZone, openHours, closeHours });
    
    // Parse time frame
    const { start, end } = parseTimeFrame(timeFrame);
    const timeMin = start.toISOString();
    const timeMax = end.toISOString();
    
    console.log(`⏰ Time range:`, { timeMin, timeMax, timeFrame });
    
    // Retrieve free/busy information from calendar
    console.log(`➡️ Calling getFreeBusy with googleCalendarId: ${googleCalendarId}, timeMin: ${timeMin}, timeMax: ${timeMax}`);
    const freeBusyResponse = await getFreeBusy(googleCalendarId, timeMin, timeMax) as FreeBusyResponse;
    console.log(`✅ Received freeBusy response:`, JSON.stringify(freeBusyResponse, null, 2));
    
    const calendarKeys = Object.keys(freeBusyResponse.calendars);
    if (calendarKeys.length === 0) {
      throw new Error('No calendar data found in free/busy response');
    }
    
    const busyPeriods = freeBusyResponse.calendars[calendarKeys[0]].busy || [];
    console.log(`🚫 Found ${busyPeriods.length} busy periods`);
    
    // Format busy periods
    const formattedBusyPeriods = busyPeriods.map(period => ({
      start: period.start,
      end: period.end,
      startFormatted: formatDateTime(period.start),
      endFormatted: formatDateTime(period.end)
    }));
    
    // Calculate free periods if we have business hours
    let freePeriods: Array<{
      start: string;
      end: string;
      startFormatted: string;
      endFormatted: string;
      durationMinutes: number;
    }> = [];
    
    if (openHours && closeHours) {
      // For single day requests, calculate free periods within business hours
      if (timeFrame && timeFrame !== 'this week' && timeFrame !== 'next week') {
        const targetDate = parseDate(timeFrame || 'today');
        const dayStart = `${targetDate}T${openHours}`;
        const dayEnd = `${targetDate}T${closeHours}`;
        
        const calculatedFreePeriods = calculateFreePeriods(dayStart, dayEnd, busyPeriods);
        freePeriods = calculatedFreePeriods.map(period => ({
          ...period,
          startFormatted: formatDateTime(period.start),
          endFormatted: formatDateTime(period.end)
        }));
      }
    }
    
    const timeFrameFormatted = {
      start: formatDateTime(timeMin),
      end: formatDateTime(timeMax)
    };
    
    if (busyPeriods.length === 0) {
      console.log(`✅ No busy periods found - calendar is completely free`);
      return {
        status: 'success',
        message: `Calendar is completely free${timeFrame ? ` for ${timeFrame}` : ' for the specified time period'}.`,
        data: {
          status: 'NO_BUSY_PERIODS',
          message: `Calendar is completely free${timeFrame ? ` for ${timeFrame}` : ' for the specified time period'}.`,
          calendarId: googleCalendarId,
          timeFrame: timeFrameFormatted,
          busyPeriods: [],
          freePeriods
        }
      };
    }
    
    console.log(`✅ Found ${busyPeriods.length} busy period${busyPeriods.length === 1 ? '' : 's'} and ${freePeriods.length} free period${freePeriods.length === 1 ? '' : 's'}`);
    
    return {
      status: 'success',
      message: `Found ${busyPeriods.length} busy period${busyPeriods.length === 1 ? '' : 's'}${timeFrame ? ` for ${timeFrame}` : ' for the specified time period'}.`,
      data: {
        status: 'FREE_BUSY_FOUND',
        message: `Found ${busyPeriods.length} busy period${busyPeriods.length === 1 ? '' : 's'}${timeFrame ? ` for ${timeFrame}` : ' for the specified time period'}.`,
        calendarId: googleCalendarId,
        timeFrame: timeFrameFormatted,
        busyPeriods: formattedBusyPeriods,
        freePeriods
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getCalendarFreeBusy:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve free/busy information.';
    return {
      status: 'failure',
      message: errorMessage,
      error: {
        code: 'FREE_BUSY_ERROR',
        message: errorMessage
      },
      data: {
        status: 'ERROR',
        message: errorMessage
      }
    };
  }
};

export const getCalendarFreeBusySchema = {
  name: 'getCalendarFreeBusy',
  description: 'FREE/BUSY INFORMATION TOOL ONLY - Retrieves free/busy information for a calendar service. Shows when the calendar is busy (has appointments) and when it\'s free (available). Supports natural language time frames like "today", "tomorrow", "this week", "next week", etc. This tool is specifically for checking calendar availability status, not for booking or deleting appointments.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: {
        type: Type.STRING,
        description: 'The name of the calendar service to retrieve free/busy information from (e.g., "general-check-ups", "pediatric-care", etc.). This must match a service name configured in the calendar_services table.'
      },
      timeFrame: {
        type: Type.STRING,
        description: 'Optional time frame for retrieving free/busy information. Supports natural language like "today", "tomorrow", "this week", "next week", "monday", "next friday", etc. If omitted, defaults to today from current time to end of day.'
      }
    },
    required: ['serviceName']
  }
};
import { Type } from '@google/genai';
import type { Env } from '../../../bindings';
import { deleteEvent as deleteCalendarEvent } from '../../calendar/calendar.service';
import { createDatabase } from '../../database/connection';
import { getCalendarServiceByBusinessIdAndName } from '../../database/calendarServices.service';
import { ToolResponse } from '../ai.types';

// Type definitions for the delete event process
type DeleteEventStatus = 'SUCCESS' | 'ERROR';

interface DeleteEventResponseData {
  status: DeleteEventStatus;
  message?: string;
}

export const deleteEvent = async ({
  calendarName,
  eventId,
  env
}: {
  calendarName: string;
    eventId: string;
    env: Env;
}): Promise<ToolResponse<DeleteEventResponseData>> => {
    console.log(`🗑️ [deleteEvent] Starting event deletion process`);
    console.log(`📋 [deleteEvent] Parameters:`, { calendarName, eventId });
    
    try {
        // Initialize database connection
        console.log(`🔌 [deleteEvent] Creating database connection`);
        const db = createDatabase(env);
        const businessId = env.BUSINESS_ID;
        
        console.log(`🏢 [deleteEvent] Business ID:`, businessId);
        
        if (!businessId) {
            console.error(`❌ [deleteEvent] BUSINESS_ID environment variable is not set`);
            throw new Error('BUSINESS_ID environment variable is not set');
        }
        
        // 1. Get calendar service by name
        console.log(`🔍 [deleteEvent] Looking up calendar service: ${calendarName} for business: ${businessId}`);
    const calendarService = await getCalendarServiceByBusinessIdAndName(db, businessId, calendarName);

    if (!calendarService) {
      console.error(`❌ [deleteEvent] Calendar service not found`, { businessId, calendarName });
      return {
        status: 'failure',
        message: `Calendar service '${calendarName}' not found.`,
        data: {
          status: 'ERROR',
          message: `Calendar service '${calendarName}' not found.`
        }
      };
    }
        
        console.log(`✅ [deleteEvent] Calendar service found:`, {
            id: calendarService.id,
            name: calendarService.name,
            googleCalendarId: calendarService.googleCalendarId
        });
        
        // 2. Delete the event
        const { googleCalendarId } = calendarService;
        console.log(`🗑️ [deleteEvent] Attempting to delete event from Google Calendar`, {
            googleCalendarId,
            eventId
        });
        
        await deleteCalendarEvent(googleCalendarId, eventId);
        
        console.log(`✅ [deleteEvent] Event deleted successfully from Google Calendar`);
        console.log(`📊 [deleteEvent] Deletion summary:`, {
            eventId,
            calendarName,
            googleCalendarId,
            businessId,
            timestamp: new Date().toISOString()
        });
        
        return {
            status: 'success',
            message: `The event with ID ${eventId} has been successfully deleted.`,
            data: {
                status: 'SUCCESS',
                message: `The event with ID ${eventId} has been successfully deleted.`
            }
        };
        
    } catch (error) {
        console.error(`❌ [deleteEvent] Error occurred during deletion process:`, error);
        console.error(`🔍 [deleteEvent] Error details:`, {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            calendarName,
            eventId,
            timestamp: new Date().toISOString()
        });
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete event.';
        
        return {
            status: 'failure',
            message: errorMessage,
            error: {
                code: 'DELETE_EVENT_FAILED',
                message: errorMessage
            },
            data: {
                status: 'ERROR',
                message: errorMessage
            }
        };
    }
};

export const deleteEventSchema = {
    name: 'deleteEvent',
    description: "Deletes a scheduled appointment for a specific calendar and event ID. Before using this function, first get the event ID from scheduled appointments.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            calendarName: {
                type: Type.STRING,
                description: 'The name of the calendar service to delete the event from (e.g., "clinic_primary").'
            },
            eventId: {
                type: Type.STRING,
                description: 'The ID of the scheduled appointment to delete. Get this ID from scheduled appointments.'
            }
        },
        required: ['calendarName', 'eventId']
    }
};

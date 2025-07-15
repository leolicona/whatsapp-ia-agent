// src/core/calendar/calendar.service.ts

import { makeApiRequester } from '../makeApiRequester';

const API_BASE_URL = 'https://tourist-guide-service.leolicona-dev.workers.dev';

const apiRequester = makeApiRequester({ baseUrl: API_BASE_URL });

export const getFreeBusy = async (calendarId: string, timeMin: string, timeMax: string) => {
  const params = {
    timeMin,
    timeMax,
    calendarIds: calendarId,
  };
  return apiRequester.get('/calendar/free-busy', params);
};

export const createEvent = async (calendarId: string, event: any) => {
  return apiRequester.post('/calendar/events', { ...event, calendarId });
};

export const listEvents = async (calendarId: string, timeMin: string, timeMax: string, maxResults?: number) => {
  const params = {
    calendarId,
    timeMin,
    timeMax,
    ...(maxResults && { maxResults: maxResults.toString() })
  };
  const response = await apiRequester.get('/calendar/events', params);
  return { items: response };
};


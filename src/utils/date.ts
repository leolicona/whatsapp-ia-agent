import spacetime from 'spacetime';

// Defaults to UTC if no timezone is provided.
const defaultTimezone = 'America/Mexico_City';

export const FULL_DATE_TIME_FORMAT = '{day}, {month} {date-ordinal}, {year}, {time}';

export const getTime = ({ format = FULL_DATE_TIME_FORMAT, timezone = defaultTimezone }: { format?: string; timezone?: string }): string => {
  const s = spacetime.now(timezone);
  return s.format(format);
};

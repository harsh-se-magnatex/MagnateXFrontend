export const PAST_SCHEDULE_TIME_MESSAGE = 'Pick a time in the future.';

export function parseScheduleDateTime(
  date: string,
  time: string
): Date | null {
  const trimmedDate = date?.trim();
  const trimmedTime = time?.trim();
  if (!trimmedDate || !trimmedTime) return null;

  const normalizedTime =
    trimmedTime.length === 5 ? `${trimmedTime}:00` : trimmedTime;
  const parsed = new Date(`${trimmedDate}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isScheduleTimeInPast(
  date: string,
  time: string,
  nowMs: number = Date.now()
): boolean {
  const parsed = parseScheduleDateTime(date, time);
  if (!parsed) return false;
  return parsed.getTime() < nowMs;
}

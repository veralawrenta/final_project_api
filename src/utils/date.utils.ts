import { formatInTimeZone } from "date-fns-tz";
import { ApiError } from "./api-error";

export const PROPERTY_TIMEZONE = "Asia/Jakarta";
export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const formattedDate = (dateStr: string): Date => {
  if (!DATE_ONLY_REGEX.test(dateStr)) {
    throw new ApiError("Date must be in YYYY-MM-DD format", 400);
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

export const getTodayDateOnly = (): Date => {
  const now = new Date();
  const dateStr = formatInTimeZone(now, PROPERTY_TIMEZONE, "yyyy-MM-dd");
  return formattedDate(dateStr);
};

export const toDateOnlyString = (date: Date): string => {
  return formatInTimeZone(date, PROPERTY_TIMEZONE, "yyyy-MM-dd");
};

export const isOverlapping = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) => {
  return startA < endB && endA > startB;
};



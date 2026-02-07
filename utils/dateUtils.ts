/**
 * Utility functions for handling dates in local timezone
 * to avoid UTC conversion issues
 */

/**
 * Gets the current date in local timezone in YYYY-MM-DD format
 * @returns Current date string in YYYY-MM-DD format
 */
export const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Adds days to a date and returns the result in YYYY-MM-DD format
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param days - Number of days to add (can be negative)
 * @returns New date string in YYYY-MM-DD format
 */
export const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    date.setDate(date.getDate() + days);
    return getLocalDateString(date);
};

/**
 * Gets the first day of the month for a given date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns First day of month in YYYY-MM-DD format
 */
export const getFirstDayOfMonth = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(1);
    return getLocalDateString(date);
};

/**
 * Gets the last day of the month for a given date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Last day of month in YYYY-MM-DD format
 */
export const getLastDayOfMonth = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return getLocalDateString(date);
};

/**
 * Formats a date for display (e.g., "06/02/2026")
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string DD/MM/YYYY
 */
export const formatDisplayDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

/**
 * Gets the current date and time as a Date object in local timezone
 * @returns Current Date object
 */
export const getLocalDate = (): Date => {
    return new Date();
};

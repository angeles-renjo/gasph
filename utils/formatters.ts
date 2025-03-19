// utils/formatters.ts with improved TypeScript typings
/**
 * Format a number as Philippine Peso
 * Now handles zero values as a special case
 */
export const formatCurrency = (value: number | null | undefined): string => {
  // Return "--" for null, undefined, zero, or negative values
  if (value === null || value === undefined || value <= 0) {
    return '--';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Check if a price value is meaningful (not zero, null, or undefined)
 */
export const isValidPrice = (value: number | null | undefined): boolean => {
  return value !== null && value !== undefined && value > 0;
};

/**
 * Get a sort value for prices, with valid prices ranking higher than invalid ones
 * @returns A number where higher values mean higher priority
 */
export const getPriceSortValue = (value: number | null | undefined): number => {
  if (!isValidPrice(value)) return -1; // Invalid prices go last
  return value as number; // Type assertion since we've verified it's a valid number
};

/**
 * Format date to a readable string
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a time string (e.g. "08:00" to "8:00 AM")
 */
export const formatTime = (time: string | null | undefined): string => {
  if (!time) return '';

  try {
    // Parse the time string (assumes format like "08:00")
    const [hours, minutes] = time.split(':').map(Number);

    // Create a date object to use the built-in time formatting
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return time || ''; // Return the original if there's an error
  }
};

interface OperatingHours {
  open: string;
  close: string;
  is24_hours: boolean;
  days_open: string[];
}

/**
 * Format operating hours to a readable string
 */
export const formatOperatingHours = (
  operatingHours: OperatingHours | null | undefined
): string => {
  if (!operatingHours) return 'Hours unknown';

  if (operatingHours.is24_hours) {
    return 'Open 24 hours';
  }

  const daysString = formatDays(operatingHours.days_open);
  const hoursString = `${formatTime(operatingHours.open)} - ${formatTime(
    operatingHours.close
  )}`;

  return `${daysString}: ${hoursString}`;
};

/**
 * Format days array to a readable string
 */
export const formatDays = (days: string[] | null | undefined): string => {
  if (!days || days.length === 0) return '';

  // If all 7 days, return "Every day"
  if (days.length === 7) return 'Every day';

  // If weekdays only
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  if (days.length === 5 && weekdays.every((day) => days.includes(day))) {
    return 'Weekdays';
  }

  // If weekends only
  const weekends = ['Saturday', 'Sunday'];
  if (days.length === 2 && weekends.every((day) => days.includes(day))) {
    return 'Weekends';
  }

  // Otherwise, list the days
  return days.join(', ');
};

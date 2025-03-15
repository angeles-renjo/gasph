/**
 * Format a number as Philippine Peso
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format date to a readable string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a time string (e.g. "08:00" to "8:00 AM")
 */
export const formatTime = (time: string): string => {
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
    return time; // Return the original if there's an error
  }
};

/**
 * Format operating hours to a readable string
 */
export const formatOperatingHours = (operatingHours: {
  open: string;
  close: string;
  is24_hours: boolean; // Changed from is24Hours
  days_open: string[]; // Changed from daysOpen
}): string => {
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
export const formatDays = (days: string[]): string => {
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

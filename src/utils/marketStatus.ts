/**
 * Utility to determine if the US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
 */
export function isMarketOpen(): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', 
      hour12: false,
      weekday: 'short', 
      hour: '2-digit', 
      minute: '2-digit'
    }).formatToParts(new Date());
    
    const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
    
    const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
    const timeInMinutes = hour * 60 + minute;
    const marketStartTime = 9 * 60 + 30; // 9:30 AM
    const marketEndTime = 16 * 60; // 4:00 PM
    
    return isWeekday && timeInMinutes >= marketStartTime && timeInMinutes < marketEndTime;
  } catch {
    return false;
  }
}
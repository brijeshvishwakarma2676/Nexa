import { formatDistanceToNow } from 'date-fns'

/**
 * Parses a date string as UTC and returns a Date object.
 * Handles strings with or without 'Z'.
 */
export const parseUTC = (dateString) => {
  if (!dateString) return new Date()
  
  // If the date string doesn't have a timezone indicator, append 'Z'
  // assuming the backend always sends UTC.
  let formattedDate = dateString
  if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('+')) {
    // Replace space between date and time with 'T' if present
    formattedDate = dateString.replace(' ', 'T')
    if (!formattedDate.includes('Z')) {
      formattedDate += 'Z'
    }
  }
  
  const date = new Date(formattedDate)
  // Check if date is valid
  return isNaN(date.getTime()) ? new Date() : date
}

/**
 * Formats a date to "X ago" style, ensuring UTC parsing.
 */
export const formatTimeAgo = (date) => {
  const parsedDate = typeof date === 'string' ? parseUTC(date) : date
  return formatDistanceToNow(parsedDate, { addSuffix: true })
    .replace(/^about\s+/i, '')
    .replace(/^less\s+than\s+a\s+/i, '')
    .replace(/^less\s+than\s+/i, '')
    .replace(/minutes?/i, 'm')
    .replace(/hours?/i, 'h')
    .replace(/days?/i, 'd')
    .replace(/months?/i, 'mo')
    .replace(/years?/i, 'y')
    .replace(/\s+ago/i, '')
}

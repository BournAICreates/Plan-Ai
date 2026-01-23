import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

import type { CalendarEvent } from '../types/events';

import { addYears, subMonths } from 'date-fns';

export const parseIcalData = (icalData: string): CalendarEvent[] => {
    try {
        const jcalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jcalData);

        // Debug components
        try {
            if (comp.getAllSubcomponents) {
                const allSubs = comp.getAllSubcomponents();
                const subNames = allSubs.map((c: any) => c.name);
                console.log('[Calendar] Found subcomponents:', subNames);
            }
        } catch (e) {
            console.warn('[Calendar] Failed to list subcomponents', e);
        }

        // Get both events and tasks
        const vevents = comp.getAllSubcomponents('vevent');
        const vtodos = comp.getAllSubcomponents('vtodo');
        const allComps = [...vevents, ...vtodos];

        console.log(`[Calendar] Parsed ${vevents.length} events and ${vtodos.length} tasks from iCal source`);

        const parsedEvents: CalendarEvent[] = [];

        // Define expansion window: 6 months back to 1 year forward
        const now = new Date();
        const rangeStart = subMonths(now, 6);
        const rangeEnd = addYears(now, 1);
        const rangeStartIcal = ICAL.Time.fromJSDate(rangeStart);
        const rangeEndIcal = ICAL.Time.fromJSDate(rangeEnd);

        allComps.forEach((item: any) => {
            const event = new ICAL.Event(item);

            // Skip invalid items without start date (unless todo has due date logic, but keeping simple for now)
            if (!event.startDate) return;

            const title = event.summary || 'Untitled Event';
            const description = event.description || '';
            const location = event.location || '';
            const baseEvent = {
                title: title,
                type: 'personal' as const,
                description: [description, location].filter(Boolean).join('\n'),
                isExternal: true
            };

            if (event.isRecurring()) {
                const iterator = event.iterator();
                let next;
                let count = 0;
                const MAX_RECURRENCES = 365; // Safety limit

                while ((next = iterator.next())) {
                    if (count > MAX_RECURRENCES) break;

                    // Optimization: stop if we are past range
                    if (next.compare(rangeEndIcal) > 0) break;

                    // Skip if before range
                    if (next.compare(rangeStartIcal) < 0) {
                        continue;
                    }

                    // Create a stable ID for occurences: uid + recurrence-id (or just time)
                    const recurrenceId = next.convertToZone(ICAL.Timezone.utcTimezone).toString();
                    const stableId = `${event.uid}_${recurrenceId}`;

                    parsedEvents.push({
                        id: stableId,
                        start: next.toJSDate(),
                        ...baseEvent
                    });
                    count++;
                }
            } else {
                parsedEvents.push({
                    id: event.uid || `generated-${Date.now()}-${Math.random()}`,
                    start: event.startDate.toJSDate(),
                    ...baseEvent
                });
            }
        });

        return parsedEvents;
    } catch (error) {
        console.error('Error parsing iCal data:', error);
        return [];
    }
};

export const fetchAndParseCalendar = async (url: string): Promise<CalendarEvent[]> => {
    // Basic validation for Google Calendar HTML links which are common mistakes
    if (url.includes('calendar.google.com/calendar') && !url.includes('.ics')) {
        console.warn(`[Calendar] Detected HTML view URL instead of iCal: ${url}`);
        throw new Error('This looks like a Google Calendar view link. Please use the "Secret address in iCal format" (ends in .ics) found in your Google Calendar settings.');
    }

    // Ensure protocol is https
    let targetUrl = url.replace(/^webcal:\/\//i, 'https://');

    // Helper to fetch with a specific proxy strategy
    const tryFetch = async (fetchUrl: string, strategyName: string): Promise<string> => {
        console.log(`[Calendar] Trying strategy: ${strategyName}`);
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`Status ${response.status}`);

            const text = await response.text();

            // Basic validation to ensure we got iCal data and not an HTML error page
            if (!text.includes('BEGIN:VCALENDAR')) {
                throw new Error('Response does not look like iCal data');
            }

            console.log(`[Calendar] Success with strategy: ${strategyName}`);
            // Log first 500 chars to verify content
            console.log(`[Calendar] Raw Data Snippet:\n${text.substring(0, 500)}...`);
            return text;
        } catch (error) {
            console.warn(`[Calendar] Strategy ${strategyName} failed:`, error);
            throw error; // Propagate to try next strategy
        }
    };

    // Strategy 1: corsproxy.io (Fast, reliable)
    // We add a timestamp to the *target* URL to force the proxy to fetch a fresh copy, avoiding cached empty responses.
    const uniqueTargetUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `_noparsecache=${Date.now()}`;
    const encodedUniqueUrl = encodeURIComponent(uniqueTargetUrl);

    try {
        const proxyUrl = `https://corsproxy.io/?${encodedUniqueUrl}`;
        const data = await tryFetch(proxyUrl, 'corsproxy.io');
        return parseIcalData(data);
    } catch (e) { /* continue */ }

    // Strategy 2: allorigins.win (Reliable backup)
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodedUniqueUrl}`;
        const data = await tryFetch(proxyUrl, 'allorigins.win');
        return parseIcalData(data);
    } catch (e) { /* continue */ }

    // Strategy 3: CodeTabs (Another reliable public proxy)
    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodedUniqueUrl}`;
        const data = await tryFetch(proxyUrl, 'CodeTabs');
        return parseIcalData(data);
    } catch (e) { /* continue */ }

    // Strategy 5: cors-anywhere (Last resort, erratic)
    try {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${targetUrl}`;
        const data = await tryFetch(proxyUrl, 'cors-anywhere');
        return parseIcalData(data);
    } catch (e) { /* continue */ }

    console.error('All fetch strategies failed for URL:', targetUrl);
    throw new Error('Unable to connect to calendar. Please check the URL.');
};

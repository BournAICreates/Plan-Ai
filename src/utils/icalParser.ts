import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

import type { CalendarEvent } from '../types/events';

export const parseIcalData = (icalData: string): CalendarEvent[] => {
    try {
        const jcalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jcalData);

        // Debug components
        try {
            // Accessing internal storage for debug if public API fails, 
            // but comp.jCal[2] is usually the children array in jCal format.
            // Safer to use public API:
            if (comp.getAllSubcomponents) {
                const allSubs = comp.getAllSubcomponents();
                const subNames = allSubs.map((c: any) => c.name);
                console.log('[Calendar] Found subcomponents:', subNames);
            }
        } catch (e) {
            console.warn('[Calendar] Failed to list subcomponents', e);
        }

        const vevents = comp.getAllSubcomponents('vevent');

        console.log(`[Calendar] Parsed ${vevents.length} events from iCal source`);

        return vevents.map((vevent: any) => {
            const event = new ICAL.Event(vevent);

            // Handle dates
            let startDate = event.startDate.toJSDate();
            // let endDate = event.endDate.toJSDate(); // Unused for now

            // Handle title and description
            const title = event.summary || 'Untitled Event';
            const description = event.description || '';
            const location = event.location || '';

            return {
                id: `imported-${uuidv4()}`, // Temporary ID for display
                title: title,
                start: startDate,
                type: 'personal', // Default to personal for imported
                description: [description, location].filter(Boolean).join('\n'),
                isExternal: true // Flag to identify external events
            } as CalendarEvent & { isExternal?: boolean };
        });
    } catch (error) {
        console.error('Error parsing iCal data:', error);
        return [];
    }
};

export const fetchAndParseCalendar = async (url: string): Promise<CalendarEvent[]> => {
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

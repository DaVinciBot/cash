export const PARIS_TIMEZONE = 'Europe/Paris';

function toDate(value) {
	return value instanceof Date ? value : new Date(value);
}

function isValidDate(date) {
	return !Number.isNaN(date.getTime());
}

function getPartMap(parts) {
	const map = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			map[part.type] = part.value;
		}
	}
	return map;
}

function getParisParts(date) {
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: PARIS_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});
	const map = getPartMap(formatter.formatToParts(date));
	return {
		year: map.year ?? '0000',
		month: map.month ?? '00',
		day: map.day ?? '00',
		hour: map.hour ?? '00',
		minute: map.minute ?? '00',
		second: map.second ?? '00'
	};
}

function pad2(value) {
	return String(value).padStart(2, '0');
}

function getTimeZoneOffset(date, timeZone) {
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});
	const map = getPartMap(formatter.formatToParts(date));
	const year = Number(map.year ?? 0);
	const month = Number(map.month ?? 1);
	const day = Number(map.day ?? 1);
	const hour = Number(map.hour ?? 0);
	const minute = Number(map.minute ?? 0);
	const second = Number(map.second ?? 0);
	const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
	return (asUtc - date.getTime()) / 60000;
}

export function formatParisDate(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return '--/--/----';
	const { day, month, year } = getParisParts(date);
	return `${day}/${month}/${year}`;
}

export function formatParisDayShort(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return '--/--';
	const { day, month } = getParisParts(date);
	return `${day}/${month}`;
}

export function formatParisTime(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return '--h--';
	const { hour, minute } = getParisParts(date);
	return `${hour}h${minute}`;
}

export function formatParisTimeRange(startValue, durationHours) {
	const start = toDate(startValue);
	if (!isValidDate(start)) return '--h-- - --h--';
	const safeDuration = Number.isFinite(durationHours) ? Math.max(0.25, durationHours) : 1;
	const end = new Date(start.getTime() + safeDuration * 60 * 60 * 1000);
	return `${formatParisTime(start)} - ${formatParisTime(end)}`;
}

export function formatParisDateTimeShort(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return '--';
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone: PARIS_TIMEZONE,
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

export function formatParisDatetimeLocal(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return '';
	const { year, month, day, hour, minute } = getParisParts(date);
	return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseParisDatetimeLocal(value) {
	if (!value) return '';
	const [datePart, timePart] = value.split('T');
	if (!datePart || !timePart) return '';
	const [yearRaw, monthRaw, dayRaw] = datePart.split('-');
	const [hourRaw, minuteRaw, secondRaw] = timePart.split(':');
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	const hour = Number(hourRaw);
	const minute = Number(minuteRaw);
	const second = secondRaw ? Number(secondRaw) : 0;
	if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
		return '';
	}
	const utcLike = Date.UTC(year, month - 1, day, hour, minute, second);
	const offset = getTimeZoneOffset(new Date(utcLike), PARIS_TIMEZONE);
	return new Date(utcLike - offset * 60000).toISOString();
}

export function getParisDateKey(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return '';
	const { year, month, day } = getParisParts(date);
	return `${year}-${month}-${day}`;
}

export function getParisDateParts(value) {
	const date = toDate(value);
	if (!isValidDate(date)) return null;
	const { year, month, day } = getParisParts(date);
	return {
		year: Number(year),
		month: Number(month),
		day: Number(day)
	};
}

export function getParisMidnightUtcFromParts(parts) {
	const iso = parseParisDatetimeLocal(
		`${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T00:00`
	);
	return iso ? new Date(iso) : null;
}

export function getParisDateUtc(value) {
	const parts = getParisDateParts(value);
	if (!parts) return null;
	return getParisMidnightUtcFromParts(parts);
}

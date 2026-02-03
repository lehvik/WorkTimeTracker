/**
 * Google Apps Script Backend für Arbeitszeit Tracker (Event-Log)
 *
 * INSTALLATION:
 * 1. Öffne dein Google Sheet
 * 2. Menü: Erweiterungen → Apps Script
 * 3. Lösche den vorhandenen Code
 * 4. Füge diesen Code ein
 * 5. Setze unten dein API_TOKEN
 * 6. Klicke "Bereitstellen" → "Neue Bereitstellung"
 * 7. Typ: "Web-App"
 * 8. Ausführen als: "Ich"
 * 9. Zugriff: "Jeder" (mit Token abgesichert)
 * 10. Klicke "Bereitstellen"
 * 11. Kopiere die Web-App-URL
 */

const EVENTS_SHEET = 'events';
const DAYS_SHEET = 'days';
const SUMMARY_SHEET = 'summary';

// TODO: Setze ein eigenes, geheimes Token
const API_TOKEN = 'MeineKotjaistdie1!';

const CSV_DELIMITER = ';';

function doPost(e) {
  return handleRequest(e, 'POST');
}

function doGet(e) {
  return handleRequest(e, 'GET');
}

function handleRequest(e, method) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const payload = (method === 'POST' && e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents)
      : {};

    const action = payload.action || params.action || '';
    const token = payload.token || params.token || '';

    if (!isValidToken(token)) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(spreadsheet);

    if (action === 'test') {
      return jsonResponse({
        success: true,
        message: 'Apps Script funktioniert',
        spreadsheetId: spreadsheet.getId()
      });
    }

    if (action === 'getToday' && method === 'GET') {
      const date = params.date;
      const data = getTodayState(spreadsheet, date);
      return jsonResponse({ success: true, data: data });
    }

    if (action === 'summaryCsv' && method === 'GET') {
      const csv = buildSummaryCsv(spreadsheet);
      return ContentService
        .createTextOutput(csv)
        .setMimeType(ContentService.MimeType.CSV);
    }

    if (method === 'POST') {
      if (action === 'event') {
        const result = saveEvent(spreadsheet, payload.payload || payload);
        rebuildSummary(spreadsheet);
        return jsonResponse({ success: true, result: result });
      }

      if (action === 'day') {
        const result = saveDay(spreadsheet, payload.payload || payload);
        rebuildSummary(spreadsheet);
        return jsonResponse({ success: true, result: result });
      }

      if (action === 'bulk') {
        const events = payload.events || [];
        const days = payload.days || [];
        const results = { events: [], days: [] };

        events.forEach(item => {
          results.events.push(saveEvent(spreadsheet, item));
        });

        days.forEach(item => {
          results.days.push(saveDay(spreadsheet, item));
        });

        rebuildSummary(spreadsheet);
        return jsonResponse({ success: true, result: results });
      }
    }

    return jsonResponse({ success: false, error: 'Unbekannte Aktion' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function isValidToken(token) {
  return API_TOKEN && token && token === API_TOKEN;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheets(spreadsheet) {
  const events = spreadsheet.getSheetByName(EVENTS_SHEET) || spreadsheet.insertSheet(EVENTS_SHEET);
  const days = spreadsheet.getSheetByName(DAYS_SHEET) || spreadsheet.insertSheet(DAYS_SHEET);
  const summary = spreadsheet.getSheetByName(SUMMARY_SHEET) || spreadsheet.insertSheet(SUMMARY_SHEET);

  initializeSheet(events, [
    'event_id',
    'recorded_at',
    'event_date',
    'event_time',
    'event_type',
    'source',
    'note'
  ]);

  initializeSheet(days, [
    'day_id',
    'date',
    'mode',
    'day_fraction',
    'work_place',
    'recorded_at',
    'source',
    'note'
  ]);

  initializeSheet(summary, [
    'date',
    'mode',
    'day_fraction',
    'work_place',
    'depart_home',
    'arrive_work',
    'depart_work',
    'arrive_home',
    'work_start',
    'work_end',
    'commute_to',
    'work_duration',
    'commute_home'
  ]);
}

function initializeSheet(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = range.getValues();

  if (current[0].join('|') !== headers.join('|')) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0f4c5c')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function saveEvent(spreadsheet, data) {
  const sheet = spreadsheet.getSheetByName(EVENTS_SHEET);
  const eventId = data.event_id;
  if (!eventId) return { skipped: true, reason: 'missing_event_id' };

  if (eventExists(sheet, eventId)) {
    return { skipped: true, reason: 'duplicate_event_id', event_id: eventId };
  }

  const row = [
    data.event_id,
    data.recorded_at || '',
    data.event_date || '',
    data.event_time || '',
    data.event_type || '',
    data.source || '',
    data.note || ''
  ];

  sheet.appendRow(row);
  return { saved: true, event_id: eventId };
}

function saveDay(spreadsheet, data) {
  const sheet = spreadsheet.getSheetByName(DAYS_SHEET);
  const dayId = data.day_id;
  if (!dayId) return { skipped: true, reason: 'missing_day_id' };

  if (dayExists(sheet, dayId)) {
    return { skipped: true, reason: 'duplicate_day_id', day_id: dayId };
  }

  const row = [
    data.day_id,
    data.date || '',
    data.mode || '',
    data.day_fraction || '',
    data.work_place || '',
    data.recorded_at || '',
    data.source || '',
    data.note || ''
  ];

  sheet.appendRow(row);
  return { saved: true, day_id: dayId };
}

function eventExists(sheet, eventId) {
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === eventId) return true;
  }
  return false;
}

function dayExists(sheet, dayId) {
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === dayId) return true;
  }
  return false;
}

function getTodayState(spreadsheet, date) {
  if (!date) return null;

  const eventsSheet = spreadsheet.getSheetByName(EVENTS_SHEET);
  const daysSheet = spreadsheet.getSheetByName(DAYS_SHEET);

  const events = readSheet(eventsSheet);
  const days = readSheet(daysSheet);

  const latestEvents = {};
  events.forEach(row => {
    if (row.event_date !== date) return;
    const existing = latestEvents[row.event_type];
    if (!existing || isAfter(row.recorded_at, existing.recorded_at)) {
      latestEvents[row.event_type] = row;
    }
  });

  let day = null;
  days.forEach(row => {
    if (row.date !== date) return;
    if (!day || isAfter(row.recorded_at, day.recorded_at)) {
      day = row;
    }
  });

  const eventsMap = {
    depart_home: latestEvents.depart_home ? latestEvents.depart_home.event_time : '',
    arrive_work: latestEvents.arrive_work ? latestEvents.arrive_work.event_time : '',
    depart_work: latestEvents.depart_work ? latestEvents.depart_work.event_time : '',
    arrive_home: latestEvents.arrive_home ? latestEvents.arrive_home.event_time : '',
    work_start: latestEvents.work_start ? latestEvents.work_start.event_time : '',
    work_end: latestEvents.work_end ? latestEvents.work_end.event_time : ''
  };

  return {
    date: date,
    day: day ? {
      mode: day.mode || '',
      day_fraction: day.day_fraction || '1.0',
      work_place: day.work_place || '',
      note: day.note || ''
    } : null,
    events: eventsMap
  };
}

function readSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = data[i][index] !== undefined ? data[i][index] : '';
    });
    rows.push(row);
  }
  return rows;
}

function rebuildSummary(spreadsheet) {
  const eventsSheet = spreadsheet.getSheetByName(EVENTS_SHEET);
  const daysSheet = spreadsheet.getSheetByName(DAYS_SHEET);
  const summarySheet = spreadsheet.getSheetByName(SUMMARY_SHEET);

  const events = readSheet(eventsSheet);
  const days = readSheet(daysSheet);

  const eventsByDate = {};
  const daysByDate = {};

  events.forEach(row => {
    const date = row.event_date;
    if (!date) return;
    if (!eventsByDate[date]) eventsByDate[date] = {};
    const existing = eventsByDate[date][row.event_type];
    if (!existing || isAfter(row.recorded_at, existing.recorded_at)) {
      eventsByDate[date][row.event_type] = row;
    }
  });

  days.forEach(row => {
    const date = row.date;
    if (!date) return;
    const existing = daysByDate[date];
    if (!existing || isAfter(row.recorded_at, existing.recorded_at)) {
      daysByDate[date] = row;
    }
  });

  const dates = Object.keys(Object.assign({}, eventsByDate, daysByDate)).sort();

  const rows = dates.map(date => buildSummaryRow(date, daysByDate[date], eventsByDate[date] || {}));

  const headers = [
    'date',
    'mode',
    'day_fraction',
    'work_place',
    'depart_home',
    'arrive_work',
    'depart_work',
    'arrive_home',
    'work_start',
    'work_end',
    'commute_to',
    'work_duration',
    'commute_home'
  ];

  summarySheet.clear();
  summarySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    summarySheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  summarySheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0f4c5c')
    .setFontColor('#ffffff');

  summarySheet.setFrozenRows(1);
  summarySheet.autoResizeColumns(1, headers.length);
}

function buildSummaryRow(date, day, events) {
  const mode = day && day.mode ? day.mode : inferMode(events);
  const dayFraction = day && day.day_fraction ? day.day_fraction : '1.0';
  const workPlace = day && day.work_place ? day.work_place : '';

  const departHome = events.depart_home ? events.depart_home.event_time : '';
  const arriveWork = events.arrive_work ? events.arrive_work.event_time : '';
  const departWork = events.depart_work ? events.depart_work.event_time : '';
  const arriveHome = events.arrive_home ? events.arrive_home.event_time : '';
  const workStart = events.work_start ? events.work_start.event_time : '';
  const workEnd = events.work_end ? events.work_end.event_time : '';

  const commuteTo = diffTime(departHome, arriveWork);
  const commuteHome = diffTime(departWork, arriveHome);

  let workDuration = '';
  if (mode === 'pendeln') {
    workDuration = diffTime(arriveWork, departWork);
  } else if (mode === 'buero_stempeln' || mode === 'homeoffice') {
    workDuration = diffTime(workStart, workEnd);
  }

  return [
    date,
    mode,
    dayFraction,
    workPlace,
    departHome,
    arriveWork,
    departWork,
    arriveHome,
    workStart,
    workEnd,
    commuteTo,
    workDuration,
    commuteHome
  ];
}

function inferMode(events) {
  if (events.work_start || events.work_end) return 'buero_stempeln';
  if (events.depart_home || events.arrive_work || events.depart_work || events.arrive_home) return 'pendeln';
  return '';
}

function diffTime(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  if (start === null || end === null) return '';

  let diff = end - start;
  if (diff < 0) diff += 24 * 60;

  return minutesToTime(diff);
}

function parseTime(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${pad2(hours)}:${pad2(mins)}`;
}

function pad2(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function buildSummaryCsv(spreadsheet) {
  rebuildSummary(spreadsheet);
  const sheet = spreadsheet.getSheetByName(SUMMARY_SHEET);
  const data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) return '';

  return data.map(row => row.map(value => String(value)).join(CSV_DELIMITER)).join('\n');
}

function isAfter(a, b) {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}

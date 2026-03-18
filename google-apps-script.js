// ================================================================
// FlightHR — Google Sheets Logging Script
// Deploy as: Web App > Execute as: Me > Who has access: Anyone
// ================================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Write headers on first row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Name',
        'Email',
        'Company',
        'Industry',
        'Score',
        'Grade',
        'Grade Label',
        'Q1 — Team Size',
        'Q2 — Funding Stage',
        'Q3 — HR Situation',
        'Q4 — Desired Outcome',
        'Q5 — Tried Before',
        'Q6 — Interview Process',
        'Q7 — Contracts',
        'Q8 — Policies (count)',
        'Q8 — Policies (list)',
        'Q9 — Performance Confidence',
        'Q10 — Founder Hours/Week',
        'Q11 — Budget Readiness',
        'Q12 — Open Notes',
        'Top Gap 1',
        'Top Gap 2',
        'Top Gap 3',
      ]);

      // Style the header row
      const headerRange = sheet.getRange(1, 1, 1, 24);
      headerRange.setBackground('#0e2841');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(9);
      sheet.setFrozenRows(1);

      // Set column widths
      sheet.setColumnWidth(1, 160);  // Timestamp
      sheet.setColumnWidth(2, 130);  // Name
      sheet.setColumnWidth(3, 200);  // Email
      sheet.setColumnWidth(4, 150);  // Company
      sheet.setColumnWidth(5, 130);  // Industry
      sheet.setColumnWidth(6, 60);   // Score
      sheet.setColumnWidth(7, 50);   // Grade
      sheet.setColumnWidth(8, 150);  // Grade Label
    }

    const gaps = data.gaps || [];
    const q8list = data.q8 || [];

    // Grade → row background colour
    const gradeColors = {
      'A': '#e8f5e9',
      'B': '#fff8e1',
      'C': '#fff3e0',
      'D': '#fce4ec',
      'F': '#ffebee'
    };
    const rowColor = gradeColors[data.grade] || '#ffffff';

    const row = [
      new Date().toLocaleString('en-GB', {timeZone:'Europe/London'}),
      data.name        || '',
      data.email       || '',
      data.company     || '',
      data.industry    || '',
      data.score       || 0,
      data.grade       || '',
      data.gradeLabel  || '',
      data.q1          || '',
      data.q2          || '',
      data.q3          || '',
      data.q4          || '',
      (data.q5 || []).join(', '),
      data.q6          || '',
      data.q7          || '',
      q8list.length,
      q8list.join(', '),
      data.q9          || '',
      data.q10         || '',
      data.q11         || '',
      data.q12         || '',
      gaps[0]          || '',
      gaps[1]          || '',
      gaps[2]          || '',
    ];

    sheet.appendRow(row);

    // Colour the data row by grade
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, row.length).setBackground(rowColor);

    // Bold the score column
    sheet.getRange(lastRow, 6).setFontWeight('bold');

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

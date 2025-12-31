
import { Task, Experiment } from './types';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType } from 'docx';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Generates a "PDF" by opening a print-optimized window.
 * This is the most reliable way to handle Hebrew and complex CSS tables in the browser without heavy libraries.
 */
export const generateWeeklyPrintView = (
  tasks: Task[], 
  experiments: Experiment[], 
  weekDate: Date,
  selectedExperimentId?: string
) => {
  // Filter relevant data
  let filteredExperiments = experiments;
  if (selectedExperimentId && selectedExperimentId !== 'all') {
    filteredExperiments = experiments.filter(e => e.id === selectedExperimentId);
  }

  // Create HTML content
  const weekString = format(weekDate, 'dd/MM/yyyy');
  
  const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <title>דו"ח משימות שבועי - ${weekString}</title>
      <style>
        body { font-family: 'Assistant', sans-serif; padding: 20px; color: #1e293b; }
        h1 { text-align: center; color: #4f46e5; margin-bottom: 10px; }
        h2 { text-align: center; font-size: 16px; color: #64748b; margin-bottom: 30px; }
        .experiment-section { margin-bottom: 30px; page-break-inside: avoid; }
        .exp-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #f1f5f9; padding: 8px; text-align: right; font-size: 12px; border: 1px solid #cbd5e1; }
        td { padding: 8px; border: 1px solid #cbd5e1; font-size: 13px; vertical-align: top; }
        .checkbox-cell { width: 40px; text-align: center; }
        .checkbox-box { width: 16px; height: 16px; border: 2px solid #94a3b8; display: inline-block; border-radius: 3px; }
        .importance-high { color: #dc2626; font-weight: bold; }
        .desc { font-size: 11px; color: #64748b; margin-top: 4px; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap" rel="stylesheet">
    </head>
    <body>
      <h1>תוכנית עבודה שבועית</h1>
      <h2>שבוע המתחיל ב: ${weekString}</h2>

      ${filteredExperiments.map(exp => {
        const expTasks = tasks.filter(t => t.experimentId === exp.id);
        if (expTasks.length === 0) return '';
        
        return `
          <div class="experiment-section">
            <div class="exp-title">${exp.name}</div>
            <table>
              <thead>
                <tr>
                  <th class="checkbox-cell">ביצוע</th>
                  <th>משימה</th>
                  <th style="width: 80px;">חשיבות</th>
                  <th style="width: 80px;">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                ${expTasks.map(t => `
                  <tr>
                    <td class="checkbox-cell"><div class="checkbox-box"></div></td>
                    <td>
                      <div style="font-weight: 600;">${t.title}</div>
                      <div class="desc">${t.description || ''}</div>
                    </td>
                    <td>${t.importance >= 4 ? '<span class="importance-high">גבוהה</span>' : 'רגילה'}</td>
                    <td>${t.status === 'completed' ? 'הושלם' : 'מתוכנן'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
};

/**
 * Generates a DOCX file using 'docx' library.
 */
export const generateWeeklyDocx = async (
  tasks: Task[], 
  experiments: Experiment[], 
  weekDate: Date,
  selectedExperimentId?: string
) => {
  // Filter relevant data
  let filteredExperiments = experiments;
  if (selectedExperimentId && selectedExperimentId !== 'all') {
    filteredExperiments = experiments.filter(e => e.id === selectedExperimentId);
  }

  const sections = [];
  const weekString = format(weekDate, 'dd/MM/yyyy');

  // Title
  sections.push(
    new Paragraph({
      text: "תוכנית עבודה שבועית",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      bidirectional: true,
    }),
    new Paragraph({
      text: `שבוע: ${weekString}`,
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 400 }
    })
  );

  // Iterate Experiments
  filteredExperiments.forEach(exp => {
    const expTasks = tasks.filter(t => t.experimentId === exp.id);
    if (expTasks.length === 0) return;

    // Experiment Header
    sections.push(
      new Paragraph({
        text: exp.name,
        heading: HeadingLevel.HEADING_2,
        bidirectional: true,
        spacing: { before: 400, after: 200 },
        border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }
      })
    );

    // Tasks Table
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "ביצוע", alignment: AlignmentType.CENTER, bidirectional: true })], shading: { fill: "f1f5f9" } }),
          new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "תיאור משימה", alignment: AlignmentType.RIGHT, bidirectional: true })], shading: { fill: "f1f5f9" } }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "חשיבות", alignment: AlignmentType.CENTER, bidirectional: true })], shading: { fill: "f1f5f9" } }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "סטטוס", alignment: AlignmentType.CENTER, bidirectional: true })], shading: { fill: "f1f5f9" } }),
        ],
      })
    ];

    expTasks.forEach(t => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ 
              children: [new Paragraph({ text: "☐", alignment: AlignmentType.CENTER, size: 28 })], // Checkbox character
              verticalAlign: "center"
            }),
            new TableCell({ 
              children: [
                new Paragraph({ 
                  children: [new TextRun({ text: t.title, bold: true })],
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT
                }),
                new Paragraph({ 
                  text: t.description,
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  style: "Subtitle" // Or just smaller text
                })
              ] 
            }),
            new TableCell({ 
              children: [new Paragraph({ 
                text: t.importance >= 4 ? "גבוהה" : "רגילה", 
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                color: t.importance >= 4 ? "DC2626" : "000000"
              })],
              verticalAlign: "center"
            }),
            new TableCell({ 
              children: [new Paragraph({ text: t.completed ? "הושלם" : "לביצוע", alignment: AlignmentType.CENTER, bidirectional: true })],
              verticalAlign: "center"
            }),
          ],
        })
      );
    });

    sections.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
    compatibility: {
      doNotExpandShiftReturn: true,
    },
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Weekly_Tasks_${weekString.replace(/\//g, '-')}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

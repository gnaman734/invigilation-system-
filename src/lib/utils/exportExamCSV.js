function escapeCSV(value) {
  const raw = value == null ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function exportExamCSV(examDetail) {
  const exam = examDetail?.exam;
  const rooms = examDetail?.rooms ?? [];

  const headers = [
    'Room Number',
    'Floor',
    'Instructor Name',
    'Department',
    'Reporting Time',
    'Arrival Time',
    'Status',
  ];

  const rows = rooms.flatMap((room) => {
    const instructors = room.instructors ?? [];

    if (instructors.length === 0) {
      return [[room.room_number, room.floor_label, '', '', '', '', '']];
    }

    return instructors.map((instructor) => [
      room.room_number,
      room.floor_label,
      instructor.name,
      instructor.department,
      instructor.reporting_time || '',
      instructor.arrival_time || '',
      instructor.duty_status || '',
    ]);
  });

  const csvString = [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  const subject = toSlug(exam?.subject || 'exam');
  const examDate = toSlug(exam?.exam_date || 'date');
  anchor.href = url;
  anchor.download = `${subject}-${examDate}-duties.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return { rowCount: rows.length, fileName: `${subject}-${examDate}-duties.csv` };
}

export default exportExamCSV;

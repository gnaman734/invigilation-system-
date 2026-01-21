import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useExamManagement } from '../../lib/hooks/useExamManagement';
import { useToast } from '../../components/shared/Toast';

export default function ExamDetail() {
  const { examId } = useParams();
  const { addToast } = useToast();
  const examMgmt = useExamManagement();
  const [tab, setTab] = useState('rooms');

  useEffect(() => {
    examMgmt.fetchAllExams();
  }, [examId]);

  const exam = useMemo(() => (examMgmt.exams ?? []).find((item) => item.id === examId), [examMgmt.exams, examId]);

  if (examMgmt.loading) {
    return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><div className="skeleton h-48" /></div>;
  }

  if (!exam) {
    return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><p className="text-sm text-white/40">Exam not found</p></div>;
  }

  const allAssignments = (exam.exam_rooms ?? []).flatMap((room) => room.exam_room_instructors ?? []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <p className="text-xs text-white/35">Exams / {exam.subject}</p>
      <section className="mt-3 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/8 to-transparent p-8">
        <h1 className="text-2xl text-white/90">{exam.subject}</h1>
        <p className="mt-1 text-xs text-white/40">{exam.department || '--'} • {exam.exam_date || '--'} • {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center"><p className="text-sm text-white/80">{exam.exam_rooms?.length ?? 0}</p><p className="text-[11px] text-white/35">Total Rooms</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center"><p className="text-sm text-white/80">{allAssignments.length}</p><p className="text-[11px] text-white/35">Total Instructors</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center"><p className="text-sm text-white/80">{allAssignments.length}</p><p className="text-[11px] text-white/35">Confirmed</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center"><p className="text-sm text-white/80">0</p><p className="text-[11px] text-white/35">Pending</p></div>
        </div>
      </section>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setTab('rooms')} className={`rounded-xl px-3 py-2 text-xs ${tab === 'rooms' ? 'bg-amber-500/10 text-amber-400' : 'text-white/45'}`}>Rooms & Instructors</button>
        <button type="button" onClick={() => setTab('duty')} className={`rounded-xl px-3 py-2 text-xs ${tab === 'duty' ? 'bg-amber-500/10 text-amber-400' : 'text-white/45'}`}>Duty Status</button>
        <button type="button" onClick={() => setTab('edit')} className={`rounded-xl px-3 py-2 text-xs ${tab === 'edit' ? 'bg-amber-500/10 text-amber-400' : 'text-white/45'}`}>Edit Exam</button>
      </div>

      {tab === 'rooms' ? (
        <div className="mt-4 space-y-3">
          {(exam.exam_rooms ?? []).map((room) => (
            <section key={room.id} className="rounded-2xl border border-white/8 bg-[#111118] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-white/75">{room.rooms?.room_number} • {room.rooms?.floors?.floor_label || room.rooms?.building || '--'} • Capacity {room.rooms?.capacity ?? '--'}</p>
                <button type="button" className="text-xs text-amber-400">Edit room assignment</button>
              </div>
              <div className="space-y-2">
                {(room.exam_room_instructors ?? []).map((eri) => (
                  <div key={eri.id} className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-xs">
                    <span className="text-white/75">{eri.instructors?.name}</span>
                    <span className="text-white/40">{eri.instructors?.department}</span>
                    <span className="text-white/40">{eri.is_required ? 'Required' : 'Optional'}</span>
                    <button type="button" className="text-red-400" onClick={async () => {
                      const result = await examMgmt.removeInstructorFromExamRoom(room.id, eri.instructor_id);
                      if (result.error) addToast({ type: 'error', message: result.error });
                      else {
                        addToast({ type: 'success', message: 'Instructor removed' });
                        examMgmt.fetchAllExams();
                      }
                    }}>Remove</button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {tab === 'duty' ? (
        <section className="mt-4 rounded-2xl border border-white/8 bg-[#111118] p-4">
          <p className="text-sm text-white/70">Duty status entries for this exam are visible in Duty Manager.</p>
        </section>
      ) : null}

      {tab === 'edit' ? (
        <section className="mt-4 rounded-2xl border border-white/8 bg-[#111118] p-4">
          <p className="mb-2 text-sm text-white/70">Edit exam</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="app-input" defaultValue={exam.subject} id="edit-subject" />
            <input className="app-input" type="date" defaultValue={exam.exam_date} id="edit-date" />
            <input className="app-input" type="time" defaultValue={exam.start_time?.slice(0, 5)} id="edit-start" />
            <input className="app-input" type="time" defaultValue={exam.end_time?.slice(0, 5)} id="edit-end" />
          </div>
          <button type="button" className="btn-press mt-3 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black" onClick={async () => {
            const payload = {
              subject: document.getElementById('edit-subject')?.value,
              exam_date: document.getElementById('edit-date')?.value,
              start_time: document.getElementById('edit-start')?.value,
              end_time: document.getElementById('edit-end')?.value,
            };
            const result = await examMgmt.updateExam(exam.id, payload);
            if (result.error) addToast({ type: 'error', message: result.error });
            else {
              addToast({ type: 'success', message: 'Exam updated' });
              examMgmt.fetchAllExams();
            }
          }}>Save Changes</button>
        </section>
      ) : null}
    </div>
  );
}

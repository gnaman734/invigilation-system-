import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ExamWizard from '../../components/admin/ExamWizard';

export default function CreateExamPage() {
  const navigate = useNavigate();

  const title = useMemo(() => 'Create Exam + Duties', []);
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/admin/exams');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          className="btn-press inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white/85"
          onClick={goBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Exams
        </button>
        <p className="text-sm text-white/65">{title}</p>
      </div>

      <ExamWizard
        open
        allowDismiss={false}
        onOpenChange={() => {}}
        onCreated={() => navigate('/admin/exams')}
      />
    </div>
  );
}

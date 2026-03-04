import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, ClipboardList, Clock3, X } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useToast } from '../shared/Toast';

function getTypeConfig(type) {
  if (type === 'removed') {
    return {
      title: 'Duty removed',
      icon: <X className="h-4 w-4 text-red-400" />,
    };
  }

  if (type === 'reminder') {
    return {
      title: 'Duty tomorrow',
      icon: <Clock3 className="h-4 w-4 text-blue-400" />,
    };
  }

  return {
    title: 'New duty assigned',
    icon: <ClipboardList className="h-4 w-4 text-amber-400" />,
  };
}

function timeAgo(isoValue) {
  if (!isoValue) {
    return 'Just now';
  }

  const parsed = parseISO(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  return `${formatDistanceToNow(parsed)} ago`;
}

export default function NotificationPanel({ instructorId, onJumpToDuty }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dutyInfoMapRef = useRef(new Map());
  const panelRef = useRef(null);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!instructorId || !supabase) {
      return undefined;
    }

    let mounted = true;

    const fetchDutyInfoById = async (dutyId) => {
      const { data } = await supabase
        .from('duties_detailed')
        .select('duty_id, subject, exam_date, room_number, building, reporting_time')
        .eq('duty_id', dutyId)
        .maybeSingle();

      if (data?.duty_id) {
        dutyInfoMapRef.current.set(data.duty_id, data);
      }

      return data;
    };

    const pushNotification = (payload) => {
      setNotifications((previous) => [payload, ...previous].slice(0, 30));
    };

    const hydrateDutyMap = async () => {
      const { data } = await supabase
        .from('duties_detailed')
        .select('duty_id, subject, exam_date, room_number, building, reporting_time')
        .eq('instructor_id', instructorId)
        .order('exam_date', { ascending: false })
        .limit(30);

      (data ?? []).forEach((item) => {
        dutyInfoMapRef.current.set(item.duty_id, item);
      });

      const now = new Date();
      (data ?? []).forEach((item) => {
        if (!item.exam_date) {
          return;
        }

        const examDate = new Date(`${item.exam_date}T00:00:00`);
        const hoursToExam = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursToExam > 0 && hoursToExam <= 24) {
          pushNotification({
            id: `${item.duty_id}-reminder`,
            type: 'reminder',
            body: `Remember: ${item.subject ?? 'Exam'} at ${item.reporting_time ?? '--'} in ${item.room_number ?? '--'}`,
            dutyId: item.duty_id,
            createdAt: new Date().toISOString(),
            read: true,
          });
        }
      });
    };

    hydrateDutyMap();

    const channel = supabase
      .channel(`instructor-notifications-${instructorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duties', filter: `instructor_id=eq.${instructorId}` }, async (payload) => {
        if (!mounted) {
          return;
        }

        if (payload.eventType === 'INSERT') {
          const dutyId = payload.new?.id;
          if (!dutyId) {
            return;
          }

          const detail = await fetchDutyInfoById(dutyId);
          const body = `${detail?.subject ?? 'Duty'} on ${detail?.exam_date ?? '--'} at ${detail?.room_number ?? '--'}`;

          pushNotification({
            id: `${dutyId}-insert-${Date.now()}`,
            type: 'assigned',
            body,
            dutyId,
            createdAt: new Date().toISOString(),
            read: false,
          });

          addToast({ type: 'info', message: `New duty assigned: ${detail?.subject ?? 'Duty'}` });
        }

        if (payload.eventType === 'DELETE') {
          const dutyId = payload.old?.id;
          const known = dutyInfoMapRef.current.get(dutyId);

          pushNotification({
            id: `${dutyId}-delete-${Date.now()}`,
            type: 'removed',
            body: `${known?.subject ?? 'Duty'} on ${known?.exam_date ?? '--'} was removed`,
            dutyId,
            createdAt: new Date().toISOString(),
            read: false,
          });

          dutyInfoMapRef.current.delete(dutyId);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [addToast, instructorId]);

  const markAllRead = () => {
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
  };

  const handleNotificationClick = (notification) => {
    setNotifications((previous) =>
      previous.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    );

    if (notification.dutyId && typeof onJumpToDuty === 'function') {
      onJumpToDuty(notification.dutyId);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="btn-press relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition-all duration-200 hover:bg-white/5 hover:text-white/70"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-red-500" /> : null}
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#16161F] shadow-2xl md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-80">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <p className="text-sm text-white/70">Notifications</p>
            <button type="button" onClick={markAllRead} className="text-xs text-white/30 transition-colors duration-200 hover:text-white/60">
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <BellOff className="mx-auto h-8 w-8 text-white/10" />
              <p className="mt-2 text-xs text-white/25">No notifications</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => {
                const config = getTypeConfig(notification.type);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-white/4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-white/3"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-amber-400'}`} />
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">{config.icon}</span>
                    <span className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white/75">{config.title}</p>
                      <p className="mt-0.5 text-xs text-white/40">{notification.body}</p>
                      <p className="mt-1 text-xs text-white/20">{timeAgo(notification.createdAt)}</p>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

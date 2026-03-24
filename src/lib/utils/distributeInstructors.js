function toMax(value) {
  const parsed = Number.parseInt(String(value ?? 1), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function distributeInstructors(instructors = [], rooms = []) {
  const sortedInstructors = [...(instructors ?? [])].sort((a, b) => {
    const aDuties = Number(a?.total_duties ?? 0);
    const bDuties = Number(b?.total_duties ?? 0);
    if (aDuties !== bDuties) return aDuties - bDuties;
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
  });

  const normalizedRooms = (rooms ?? []).map((room) => ({
    ...room,
    max_instructors: toMax(room?.max_instructors),
  }));

  const assigned = normalizedRooms.reduce((acc, room) => {
    acc[room.id] = {
      instructors: [],
      max: room.max_instructors,
    };
    return acc;
  }, {});

  const unassigned = [];

  sortedInstructors.forEach((instructor) => {
    let placed = false;

    for (const room of normalizedRooms) {
      const roomState = assigned[room.id];
      if ((roomState?.instructors?.length ?? 0) < room.max_instructors) {
        roomState.instructors.push(instructor);
        placed = true;
        break;
      }
    }

    if (!placed) {
      unassigned.push(instructor);
    }
  });

  const totalAssigned = Object.values(assigned).reduce((sum, roomState) => sum + (roomState?.instructors?.length ?? 0), 0);

  return {
    assigned,
    unassigned,
    totalAssigned,
    totalUnassigned: unassigned.length,
    roomCount: normalizedRooms.length,
  };
}

export default distributeInstructors;

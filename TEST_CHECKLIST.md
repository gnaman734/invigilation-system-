# End-to-End Manual Test Checklist

## Auth Tests
- [ ] Admin login redirects to admin dashboard
- [ ] Instructor login redirects to instructor dashboard
- [ ] Wrong credentials shows error message
- [ ] Logout clears session and redirects to login
- [ ] Page refresh keeps user logged in
- [ ] Direct URL access to wrong role redirects

## Instructor Tests
- [ ] Upcoming duties load and group by date
- [ ] Past duties load and group by date
- [ ] Mark Arrival updates status instantly
- [ ] On-time arrival shows green badge
- [ ] Late arrival shows red badge
- [ ] Profile page shows correct stats
- [ ] Real-time: new duty appears without refresh
- [ ] Real-time: duty removal animates out

## Admin Tests
- [ ] Create instructor appears in table
- [ ] Edit instructor updates inline
- [ ] Delete instructor removes from table
- [ ] Create duty with smart suggest works
- [ ] Edit duty updates correctly
- [ ] Delete duty removes correctly
- [ ] Filters on duty table work correctly

## Analytics Tests
- [ ] All 4 charts render with data
- [ ] KPI cards show correct numbers
- [ ] CSV export downloads correct file
- [ ] Real-time: charts update on duty change

## Workload Tests
- [ ] Overloaded instructors flagged correctly
- [ ] Underutilized instructors flagged correctly
- [ ] Late offenders list shows correctly
- [ ] Smart suggest recommends least loaded

## Real-time Tests
- [ ] Connection indicator shows green
- [ ] Disconnect shows red indicator
- [ ] Reconnect works on manual retry
- [ ] Offline banner shows when browser offline
- [ ] Changes sync when back online

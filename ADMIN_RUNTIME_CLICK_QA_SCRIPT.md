# Admin Runtime Click-by-Click QA Script

This is a strict manual runtime script for admin-side flows.

## Preconditions

1. Run app:
   - `npm run dev`
2. Login as admin.
3. Ensure Supabase is reachable and has real operational records:
   - at least 1 floor
   - at least 1 room
   - at least 1 instructor
   - at least 1 exam + duty

---

## 1) Auth and route guard checks

### A. Admin login
- Go to `/login`
- Enter valid admin credentials
- Click **Sign in**
- Expected:
  - redirect to `/admin/dashboard`
  - no blank screen
  - navbar loads

### B. Wrong-role route access
- While logged in as admin, open `/instructor/dashboard`
- Expected:
  - redirected to `/login` or blocked

### C. Logout
- Click profile menu → **Logout**
- Expected:
  - redirect to `/login`
  - protected admin routes inaccessible after logout

---

## 2) Dashboard shell checks (`/admin/dashboard`)

### A. Left nav tab switching
Click each item:
- Overview
- Analytics
- Exams
- Duties
- Rooms
- Floors
- Instructors
- Workload
- Punctuality
- Requests

Expected for each:
- content panel changes immediately
- no stale previous view
- no console crash

### B. Overview quick actions
- Click **Create Exam + Duties**
- Expected: wizard modal opens
- Click close/cancel
- Expected: modal closes cleanly

- Click quick chips:
  - **Manage Rooms**
  - **Manage Floors**
  - **View Requests**
- Expected: active tab updates and content switches

---

## 3) Floors Manager hard pass

### A. Create floor
- Open Floors tab
- Click **Create Floor**
- Fill valid values
- Click **Create**
- Expected:
  - button shows busy state while submitting
  - success toast
  - dialog closes
  - new floor appears in list

### B. Validation
- Reopen create dialog
- Leave required fields empty
- Submit
- Expected: error feedback (toast/form error) and no close

### C. Inline edit
- Click pencil on a floor
- Change label/building/number
- Click **Save**
- Expected:
  - busy state appears
  - success toast
  - row exits edit mode
  - updated values persist after refresh

### D. Inline cancel
- Start inline edit
- Click **Cancel**
- Expected:
  - edit mode exits
  - no partial value persisted

### E. Delete floor
- Click delete icon on a floor with no dependency
- Confirm delete
- Expected:
  - deleting state in confirm
  - success toast
  - row removed

- Try delete floor with dependent rooms
- Expected:
  - error toast, floor remains

---

## 4) Rooms Manager hard pass

### A. Floor tabs/filter
- Click **All** and each floor chip
- Expected: visible room cards update by floor

### B. Create room
- Click **Create Room**
- Fill all fields
- Submit
- Expected:
  - busy state
  - success toast
  - modal closes
  - room appears in proper floor group

### C. Edit room
- Open edit on existing room
- Change capacity/is_active/department
- Save
- Expected:
  - success toast
  - updated card data visible

### D. Delete room
- Delete one room with no dependencies
- Expected:
  - success toast
  - room disappears

- Delete room with dependencies
- Expected:
  - error toast/confirm message
  - room remains

---

## 5) Instructor Manager hard pass

### A. Search/filter
- Type in search box (name/email/department)
- Expected: list narrows correctly

- Change department filter
- Expected: list updates correctly

### B. Create instructor
- Click **Add Instructor**
- Fill values, submit
- Expected:
  - busy state
  - success toast
  - optional invite warning/info toast
  - row appears in list

### C. Edit instructor (Save Changes)
- Edit existing instructor
- Change fields
- Click **Save Changes**
- Expected:
  - busy state
  - success toast
  - row values update immediately
  - no silent failure

### D. Delete instructor
- Delete one instructor
- Expected:
  - success toast
  - row removed

---

## 6) Instructor Setup Manager hard pass

### A. Search
- Search by name/department
- Expected: filtered rows

### B. Edit instructor
- Open edit dialog
- Change fields and save
- Expected:
  - busy state
  - success toast
  - data updated in table

### C. Deactivate
- Click deactivate icon
- Confirm
- Expected:
  - deactivating state
  - success toast
  - status becomes inactive

---

## 7) Duty Manager hard pass

### A. Search/filter chips/date/status
- Change each filter and search text
- Expected: table/cards update correctly

### B. Create duty
- Click **Add Duty**
- Fill required fields
- Submit
- Expected:
  - busy state
  - success toast
  - new duty appears

### C. Edit duty (Save Changes)
- Edit duty, change room/instructor/time
- Save
- Expected:
  - busy state
  - success toast
  - row updates

### D. Delete duty
- Delete one duty
- Expected:
  - success toast
  - row removed

### E. Smart Suggest
- Click **Smart Suggest** with and without department
- Expected:
  - suggestion card or fallback message
  - "Use This Instructor" updates selected instructor field

---

## 8) Duties Editor Manager hard pass

### A. Filters and search
- Switch status chips and search
- Expected: rows update correctly

### B. Single edit
- Click **Edit** row
- Save reporting/room/instructor/status
- Expected:
  - busy state
  - success toast
  - row updates

### C. Single delete
- Delete row and confirm
- Expected:
  - success toast
  - row removed

### D. Bulk select + actions
- Select multiple rows
- Click:
  - **Delete all**
  - **Mark pending**
  - **Mark cancelled**
- Expected:
  - busy state while action runs
  - success/warning aggregate toast
  - rows refresh and selection clears

---

## 9) Exam Management (`/admin/exams`) hard pass

### A. Filters/search
- status chips, department dropdown, month dropdown, search
- Expected: cards filter correctly

### B. Card actions
- View/Edit should open exam detail
- Duplicate should open wizard/info flow
- Delete should delete with visible result

### C. Create exam from page
- Click **Create Exam + Duties**
- Expected: wizard opens

---

## 10) Exam Detail (`/admin/exams/:examId`) hard pass

### A. Status dropdown
- Change status (upcoming/ongoing/completed)
- Expected: success toast and updated badge

### B. Add instructor modal
- Open from room section
- Expected: modal opens immediately
- Search instructor, add instructor
- Expected: success toast, list updates

### C. Row actions
- Cancel duty / Restore duty / Remove instructor
- Expected: action applies and row status updates

### D. Export CSV
- Click export
- Expected: file download + success toast

### E. Delete exam
- Click delete exam, confirm
- Expected:
  - success toast
  - redirect to `/admin/exams`

---

## 11) Requests tab hard pass

### A. Pending requests list
- Ensure list loads
- Approve request
- Expected: success toast and row removal

- Reject request
- Expected: warning/success and row removal

---

## 12) Regression sanity checks

After any create/edit/delete above:
- switch tabs away and back
- reload browser once
- verify persisted data state
- confirm no ghost/stale UI

---

## Failure logging format (use for each defect)

- Route:
- Component:
- Action clicked:
- Expected:
- Actual:
- API call observed:
- Console error:
- Repro steps:
- Severity:

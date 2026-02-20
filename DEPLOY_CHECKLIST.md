# Pre-Deploy Checklist

## Code Quality
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials anywhere
- [ ] All TODO comments resolved
- [ ] No unused imports
- [ ] All components have error boundaries

## Environment
- [ ] .env.example is up to date
- [ ] .env is in .gitignore
- [ ] All VITE_ variables documented
- [ ] Production Supabase URL ready

## Database
- [ ] schema.sql runs without errors
- [ ] SETUP_ONCE.sql runs without errors
- [ ] RLS policies tested for both roles
- [ ] Real-time enabled in Supabase dashboard
- [ ] Email confirm disabled for easy testing

## Performance
- [ ] Bundle size under 1MB total
- [ ] No chunk over 500kb
- [ ] Lazy loading working on all tabs
- [ ] Images optimized (if any)

## Security
- [ ] All inputs sanitized
- [ ] Rate limiting on login
- [ ] Security headers in vercel.json
- [ ] No sensitive data in client code

## UI/UX
- [ ] All loading states working
- [ ] All empty states working
- [ ] Mobile responsive on 375px
- [ ] All toasts working
- [ ] All animations smooth

## Final Test
- [ ] Full user journey as admin
- [ ] Full user journey as instructor
- [ ] Real-time sync between two tabs
- [ ] CSV export works
- [ ] Offline mode works
- [ ] Deploy to Vercel
- [ ] Test live URL on mobile

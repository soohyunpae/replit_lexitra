# Lexitra Auth Debug Guide: Session Cookie Issue (Replit)

This guide summarizes the current authentication issue experienced on Replit and outlines the likely causes and solutions.

---

## 🚨 Problem Summary

- Login request is successful, but authentication does not persist.
- All API requests after login show `req.headers.cookie` as `undefined`.
- Server creates a new session ID on every request → session is not maintained.

---

## 🔍 Potential Root Causes

### ✅ 1. Missing `credentials: 'include'` in client requests

Ensure all `fetch` or Axios requests include:
```ts
fetch(url, {
  method: 'POST',
  body: JSON.stringify(...),
  credentials: 'include',
});
```
> This includes any React Query or custom hooks using fetch.

---

### ✅ 2. Improper CORS settings on the server

Use **specific origin**, not `*`, when enabling credentials:
```ts
app.use(cors({
  origin: 'http://localhost:5173',  // Replace with your frontend URL
  credentials: true
}));
```
> ❗ `credentials: true` is ignored if origin is set to `*`

---

### ✅ 3. Cookie options conflict with local environment

Your current config:
```ts
cookie: {
  secure: false,              // Good for local
  httpOnly: true,
  sameSite: 'lax'             // Good for local too
}
```

> ✅ Recommended for local:
- `secure: false`
- `sameSite: 'lax'`

> ⚠️ If you set `sameSite: 'none'`, you **must** also set `secure: true`, which only works over HTTPS.

---

## ✅ Debug Checklist

| Check Item | Status |
|------------|--------|
| Client requests include `credentials: 'include'`? | ✅ |
| Server `cors()` has exact origin + `credentials: true`? | ✅ |
| Cookie config is correct for local dev? | ✅ |
| Cookie appears in **Set-Cookie** response header? | ⬜ |
| Cookie is stored in browser (DevTools → Application → Cookies)? | ⬜ |

---

## 🧪 Files Involved (See zip bundle)
- `server/auth.ts`: session and cookie setup
- `server/routes.ts`: routes and auth checks
- `client/src/hooks/use-auth.tsx`: login and session fetch logic
- `client/src/lib/queryClient.ts`: API layer config

---

## 🧩 Recommendation

Ensure that:
- All client API calls use `credentials: 'include'`
- Server CORS origin is exact and not using `*`
- Cookie config uses `secure: false`, `sameSite: 'lax'` for local

Then: test in browser
- Check for `Set-Cookie` in login response
- Check that cookie is saved and sent in following requests

Let me know if deeper network/DevTools debugging is needed.

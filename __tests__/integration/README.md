# Integration tests

Jest tests here focus on **multi-layer flows** (screens + mocked `supabase.from().select().eq()` + services). They complement colocated `*.test.js` files under `screens/` and `services/`.

Run:

```bash
npm test -- __tests__/integration
```

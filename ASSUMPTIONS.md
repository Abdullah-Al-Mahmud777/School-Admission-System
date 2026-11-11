# ASSUMPTIONS

1. **Payment is simulated**
   - `POST /holds/{holdId}/confirm` and `POST /holds/{holdId}/pay` are application-level simulation steps.
   - No external payment gateway integration is required for this take-home.

2. **DELETE /holds/{holdId} means cancel application**
   - Deleting an application transitions active holds to cancelled state.
   - This is treated as an idempotent operation and returns `204` on success.

3. **Student identity**
   - Student identity is represented by `X-Student-Id` only.
   - `X-Student-Id` must be exactly 17 digits (birth registration number).
   - No login/account system is required for student flows.

4. **Seat accounting**
   - Available seats are computed as `totalSeats - heldSeats - confirmedSeats`.
   - Expired held applications are excluded from active held seat counts.

5. **Admin scope**
   - Admin endpoints can coexist with public assignment endpoints for dashboard/management UI needs.

---
name: Deployment recovery safety
description: Data-preservation requirements for deployment recovery and seed handling.
---

Keep automatic destructive course reseeding disabled during deployment recovery. Do not re-enable it merely to repair hosting or a schema mismatch.

**Why:** The owner explicitly required recovery without deleting records or resetting seed data. Existing content-drift reseeding can delete student work as well as course content.

**How to apply:** Preserve the startup seed opt-out when changing deployment configuration. Any future content refresh must preserve records or obtain separate authorization for destructive changes.

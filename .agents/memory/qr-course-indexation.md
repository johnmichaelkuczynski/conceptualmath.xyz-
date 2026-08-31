---
name: SPA indexation policy
description: How public course pages and stateful student routes should be exposed to search crawlers.
---

Keep the sitemap limited to public URLs whose initial HTML contains meaningful page content and a self-referencing canonical. Stateful student routes must receive `X-Robots-Tag: noindex, follow` at the deployment response layer; client metadata may only be defense in depth.

**Why:** Client-side `noindex` is invisible to non-JavaScript crawlers, while blocking routes in `robots.txt` prevents crawlers from fetching the response that carries the noindex directive.

**How to apply:** When adding a new public page, give it a crawlable HTML shell before adding it to the sitemap. When adding a new student-route family, add a matching deployment response-header rule and keep robots crawl-permissive.
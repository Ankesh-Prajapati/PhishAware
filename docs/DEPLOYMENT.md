# GitHub Pages Deployment

## Repository Setup

Place `index.html`, all other HTML pages, `assets`, and `docs` at the repository root. Do not change the relative paths unless you also update every HTML reference.

From a terminal in the project directory:

```powershell
git init
git add .
git commit -m "Deploy PhishAware platform"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with the repository you created.

## Enable Pages

1. Open the repository on GitHub.
2. Select **Settings**, then **Pages**.
3. Set the source to **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`.
5. Save and wait for the deployment workflow to complete.

The site URL will be `https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/` for a project site. Relative asset and navigation paths make the application compatible with this repository subpath.

## Updating the Site

Commit and push changes to `main`. GitHub Pages automatically republishes the static files. Hard-refresh the site if a browser cache retains older assets.

## 404 Page

GitHub Pages automatically serves `404.html` at the repository root for any unmatched path - no configuration needed beyond having the file present, which it already is.

## Production Checklist

- Confirm every navigation route loads from the published URL.
- Complete one simulation and refresh to verify LocalStorage persistence.
- Test dark mode and the mobile sidebar.
- Confirm dashboard charts and PDF export load through the page's Content-Security-Policy `<meta>` tag and pinned Subresource Integrity (SRI) hashes - open the browser console on first deploy; a CSP violation or an integrity mismatch will log a clear, specific error rather than failing silently.
- Replace the placeholder `https://your-username.github.io/your-repo/` with your real published URL in `robots.txt`, `sitemap.xml`, and the per-page `canonical`/Open Graph/Twitter meta tags (cosmetic only - affects link previews and search indexing, not app functionality).
- Consider self-hosting pinned CDN assets when offline use or a strict supply-chain policy is required; keep the matching SRI hash if you do.
- Use a custom domain and enforced HTTPS when organizational policy requires it.


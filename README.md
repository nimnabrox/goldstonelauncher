# Goldstone County Launcher 0.3.4

Winter launcher and website source. The runtime source matches the locally verified release.

Build on Windows x64 with Node/npm, Rust's x86_64-pc-windows-gnu toolchain, and GCC/ar on PATH:

    npm ci
    npm test
    npm run build:windows

The unsigned build is src-tauri/target/x86_64-pc-windows-gnu/release/goldstone-launcher.exe. Name distributed release assets Goldstone.County.exe. Owner signing credentials are never included.

Music: config/music.json and root music.json are identical, oldest first. Append new songs at the end; the app presents new songs first. Publish both files together. Christmas Remix 01 is in this ordinary catalog; there is no private local override. Cached songs remain available offline.

Updates read public main/version.json. Publish the exact release asset before advancing that manifest. The 0.3.4 client ignores equal/older versions. The existing installer replaces the running file at its existing path, including older filenames. Private repo releases alone do not update public clients.

Website source is gsl_web. Runtime download files belong in GitHub Releases and the website deployment, rather than source control. Initial WebView2 setup may require internet. This release does not claim universal antivirus clearance or fresh-PC compatibility.

See RELEASE_NOTES.md and LICENSE.

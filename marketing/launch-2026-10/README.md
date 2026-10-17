# Launch posts — October 2026

Ready-to-post assets for **Builders of Tomorrow** (<https://builders.ascent-i-tech.in>). Everything here was
made from the live site: the frames are headless-Chrome captures of real pages, the cards use the site's own
fonts and colours, and the music was composed and synthesised for this project (no third-party audio, so
there is nothing to license).

| File | Use |
| --- | --- |
| `instagram-reel.mp4` | Instagram Reel (1080 × 1920, 9:16, ~25 s, H.264 + AAC). Also fine as a LinkedIn video post. |
| `instagram-reel-cover.png` | Reel cover / first frame (title card). |
| `linkedin-banner-1200x627.png` | Image for the LinkedIn post (LinkedIn's link-preview ratio). |
| `instagram-caption.md` | Reel caption with hashtags. |
| `linkedin-post.md` | LinkedIn post text (two lengths). |
| `background-music.wav` | The music on its own, in case you re-edit the reel. |

How the reel was built: `scratch/render.py` renders the title, end and scene cards from `cards/*.html` with
headless Chrome, and `build_video.py` applies slow zoom/pan to each card, cross-fades them and mixes the music
(loudness-normalised to −14 LUFS, Instagram's target). The scripts live in the session scratchpad, not in the
repo; the finished files here are what you post.

Posting notes:

- Instagram does not let you add a link in a caption; the link in the caption is for copy-paste, and the real
  link belongs in the **bio** (and as a sticker if you also share the reel to Stories).
- LinkedIn: paste the post text, attach `linkedin-banner-1200x627.png` or the reel, and put the URL in the
  first comment or in the text itself; both are fine for a personal or company page.
- The reel has no spoken words and no on-screen text that depends on sound, so it works muted.

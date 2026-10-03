(() => {
  const grid = document.getElementById('song-grid');
  const empty = document.getElementById('empty-library');
  const template = document.getElementById('song-template');
  const songs = Array.isArray(window.ONOLAB_SONGS) ? window.ONOLAB_SONGS : [];
  function youtubeLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname) ? url.href : null;
    } catch { return null; }
  }
  let count = 0;
  for (const song of songs) {
    const url = youtubeLink(song.youtubeUrl);
    if (!song.title || !url) continue;
    const card = template.content.cloneNode(true);
    const image = card.querySelector('img');
    const fallback = card.querySelector('.cover-fallback');
    if (song.cover) {
      image.src = song.cover;
      image.alt = `${song.title} — ジャケット`;
      image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
    } else { image.hidden = true; fallback.hidden = false; }
    fallback.querySelector('span').textContent = song.title;
    card.querySelector('h2').textContent = song.title;
    const english = card.querySelector('.song-title-en');
    english.textContent = song.titleEn || '';
    english.hidden = !song.titleEn;
    const link = card.querySelector('.youtube-link');
    link.href = url;
    link.setAttribute('aria-label', `${song.title} — YouTubeで聴く / Listen on YouTube（新しいタブで開きます）`);
    grid.append(card);
    count++;
  }
  empty.hidden = count > 0;
  grid.hidden = count === 0;
  if (count) document.getElementById('song-count').textContent = `${count} ${count === 1 ? 'SONG' : 'SONGS'}`;
})();

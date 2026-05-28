export default {
  async fetch(request, env, ctx) {
    // Menyajikan seluruh aset statis (index.html, script.js) dari folder public
    return env.ASSETS.fetch(request);
  },
};

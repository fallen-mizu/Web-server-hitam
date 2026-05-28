export default {
  async fetch(request, env, ctx) {
    // Menyajikan aset statis secara bersih, instan, dan 100% gratis dari Cloudflare Assets
    return env.ASSETS.fetch(request);
  },
};

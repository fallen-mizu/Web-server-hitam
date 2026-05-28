export default {
  async fetch(request, env, ctx) {
    // Backend Cloudflare Worker sekarang menjadi sangat sederhana, 
    // hanya menyajikan file statis dari folder public secara gratis.
    return env.ASSETS.fetch(request);
  },
};

// =====================================================
// index.js — Kode utama bot auto embed
// Jalankan dengan: node index.js
// =====================================================

const https = require("https");
const embeds = require("./embeds");

// ===================== KONFIGURASI =====================
const WEBHOOK_URL = "https://discord.com/api/webhooks/1425973692000636958/HuVsqPLKDxMRugsuz3aZjejJrwM0ucwGbzWT7u-SdOlFkEWIOWlnrgQhbQ3wxCeK8m-K";
const INTERVAL_JAM = 5; // Ganti angka ini untuk ubah interval jam
const DELAY_ANTAR_EMBED = 2000; // Jeda antar embed dalam milidetik (2 detik)
// =======================================================

const INTERVAL_MS = INTERVAL_JAM * 60 * 60 * 1000;

function kirimWebhook(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(WEBHOOK_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(res.statusCode));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function tunggu(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function kirimSemuaEmbed() {
  const waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  console.log(`\n[${waktu}] Mulai kirim ${embeds.length} embed...`);

  for (let i = 0; i < embeds.length; i++) {
    const embed = embeds[i];

    // Skip embed yang kosong (thumbnail/image kosong & deskripsi placeholder)
    if (embed.embeds[0].description.includes("Isi konten sponsor di sini")) {
      console.log(`  Embed ${i + 1}: Dilewati (belum diisi)`);
      continue;
    }

    try {
      const status = await kirimWebhook(embed);
      if (status === 204) {
        console.log(`  Embed ${i + 1} (${embed.embeds[0].title}): Berhasil dikirim ✅`);
      } else {
        console.log(`  Embed ${i + 1}: Status ${status} ⚠️`);
      }
    } catch (err) {
      console.error(`  Embed ${i + 1}: Gagal — ${err.message} ❌`);
    }

    // Jeda sebelum kirim embed berikutnya
    if (i < embeds.length - 1) {
      await tunggu(DELAY_ANTAR_EMBED);
    }
  }

  console.log(`Selesai! Embed berikutnya dalam ${INTERVAL_JAM} jam.\n`);
}

// Jalankan langsung saat bot start
kirimSemuaEmbed();

// Ulangi setiap X jam
setInterval(kirimSemuaEmbed, INTERVAL_MS);

console.log(`Bot aktif! Embed akan dikirim setiap ${INTERVAL_JAM} jam.`);
console.log(`Tekan Ctrl+C untuk menghentikan bot.\n`);

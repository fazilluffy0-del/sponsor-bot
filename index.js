// =====================================================
// index.js — Kode utama bot auto embed
// Jalankan dengan: node index.js
// =====================================================

const https = require("https");
const fs = require("fs");
const path = require("path");
const embeds = require("./embeds");

// ===================== KONFIGURASI =====================
const WEBHOOK_URL = "https://discord.com/api/webhooks/1425973692000636958/HuVsqPLKDxMRugsuz3aZjejJrwM0ucwGbzWT7u-SdOlFkEWIOWlnrgQhbQ3wxCeK8m-K";
const INTERVAL_JAM = 5; // Ganti angka ini untuk ubah interval jam
const DELAY_ANTAR_EMBED = 2000; // Jeda antar embed dalam milidetik (2 detik)
// =======================================================

const INTERVAL_MS = INTERVAL_JAM * 60 * 60 * 1000;

// ===================== ANTI KIRIM DOBEL =====================
// File ini menyimpan timestamp terakhir kali batch embed berhasil dikirim.
// Kalau proses restart (misalnya karena hosting merestart/crash) dan waktu
// sejak pengiriman terakhir belum sampai INTERVAL_MS, bot TIDAK akan kirim
// ulang — jadi mencegah embed dobel akibat restart mendadak.
const LOCK_FILE = path.join(__dirname, ".last-send.json");

function bacaWaktuTerakhirKirim() {
  try {
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
    return data.lastSend || 0;
  } catch {
    return 0; // Belum pernah kirim / file belum ada
  }
}

function simpanWaktuTerakhirKirim(timestamp) {
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ lastSend: timestamp }, null, 2));
  } catch (err) {
    console.error("Gagal menyimpan lock file:", err.message);
  }
}
// ==============================================================

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

  simpanWaktuTerakhirKirim(Date.now());
  console.log(`Selesai! Embed berikutnya dalam ${INTERVAL_JAM} jam.\n`);
}

// ===================== STARTUP =====================
// Cek kapan terakhir kali embed berhasil dikirim. Kalau belum melewati
// INTERVAL_MS, jangan kirim lagi (mencegah dobel akibat restart mendadak),
// cukup jadwalkan sisa waktunya saja.
const lastSend = bacaWaktuTerakhirKirim();
const sudahLewat = Date.now() - lastSend;

if (lastSend > 0 && sudahLewat < INTERVAL_MS) {
  const sisaMs = INTERVAL_MS - sudahLewat;
  const sisaJam = (sisaMs / (60 * 60 * 1000)).toFixed(2);
  console.log(`Restart terdeteksi. Batch embed terakhir baru dikirim ${(sudahLewat / 60000).toFixed(1)} menit lalu.`);
  console.log(`Melewati pengiriman sekarang. Pengiriman berikutnya dalam ${sisaJam} jam.\n`);

  setTimeout(() => {
    kirimSemuaEmbed();
    setInterval(kirimSemuaEmbed, INTERVAL_MS);
  }, sisaMs);
} else {
  // Belum pernah kirim, atau sudah lewat interval -> aman untuk kirim sekarang
  kirimSemuaEmbed();
  setInterval(kirimSemuaEmbed, INTERVAL_MS);
}

console.log(`Bot aktif! Embed akan dikirim setiap ${INTERVAL_JAM} jam.`);
console.log(`Tekan Ctrl+C untuk menghentikan bot.\n`);

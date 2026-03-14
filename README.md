# 🏫 YTKP Banjar Asri — Sistem Keuangan Yayasan

Aplikasi web manajemen keuangan untuk Yayasan YTKP Banjar Asri, menaungi SMP, SMA, dan SMK.

---

## 📋 Fitur

### Tampilan User (Bendahara Sekolah)
- Login dengan nama & PIN
- Input setoran: SPP, Dana Bangunan, Seragam, Kegiatan, DSP, Lainnya
- Pilih periode (bulan/tahun)
- Input nominal, tanggal transfer, no. rekening
- Riwayat 5 setoran terakhir
- Konfirmasi sebelum simpan

### Tampilan Admin (Yayasan)
- Dashboard ringkasan total dana masuk
- Rincian per sekolah (SMP, SMA, SMK) dengan persentase
- Rincian per jenis setoran
- Filter: hari ini, 7 hari, bulan ini, tahun ini, bulan tertentu, rentang tanggal
- Filter berdasarkan sekolah dan jenis setoran
- Notifikasi otomatis: sekolah yang belum setor SPP (3 bulan terakhir)
- Tabel status SPP per sekolah per bulan
- Semua transaksi lengkap dengan detail

---

## 👤 Akun Default

| Nama | PIN | Role | Sekolah |
|------|-----|------|---------|
| Admin Yayasan | 1234 | Admin | — |
| Bendahara SMP | 1111 | User | SMP |
| Bendahara SMA | 2222 | User | SMA |
| Bendahara SMK | 3333 | User | SMK |

> PIN dan nama bisa disesuaikan langsung di `lib/store.js` bagian `DEFAULT_USERS`

---

## 🚀 Cara Deploy ke Vercel (Gratis, Tanpa VPS)

### Langkah 1: Buat Akun GitHub
1. Buka [github.com](https://github.com) → Sign Up (gratis)
2. Buat repository baru bernama `ytkp-finance` (pilih Private agar data aman)

### Langkah 2: Upload Project ke GitHub
**Cara A — Pakai GitHub Desktop (lebih mudah):**
1. Download [GitHub Desktop](https://desktop.github.com)
2. File → Add Local Repository → pilih folder `ytkp-finance`
3. Publish repository
4. Commit & Push

**Cara B — Pakai terminal:**
```bash
cd ytkp-finance
git init
git add .
git commit -m "Initial commit YTKP Finance"
git remote add origin https://github.com/USERNAME/ytkp-finance.git
git push -u origin main
```

### Langkah 3: Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com) → Sign up pakai GitHub
2. Klik **"Add New Project"**
3. Pilih repository `ytkp-finance`
4. Framework otomatis terdeteksi sebagai **Next.js** ✓
5. Klik **"Deploy"** → tunggu 2-3 menit
6. Selesai! Dapat URL gratis seperti: `ytkp-finance.vercel.app`

### Langkah 4: Buka di Browser / HP
- Desktop: buka URL vercel di browser biasa
- Android/iOS: buka URL yang sama di Chrome/Safari
- Bisa ditambahkan ke Home Screen seperti aplikasi!

---

## ⚠️ Catatan Penting: Data

Versi ini menggunakan **localStorage** (tersimpan di browser). Artinya:
- Data tersimpan di browser masing-masing pengguna
- Jika ganti HP atau hapus cache → data hilang
- Tidak bisa lihat data dari HP lain

### Upgrade ke Database Permanen (Gratis - Supabase)

Jika butuh data tersimpan permanen dan bisa diakses dari mana saja:

1. Daftar gratis di [supabase.com](https://supabase.com)
2. Buat project baru → copy `SUPABASE_URL` dan `SUPABASE_ANON_KEY`
3. Buat tabel `transactions` di Supabase SQL Editor:

```sql
create table transactions (
  id uuid default gen_random_uuid() primary key,
  school text not null,
  payment_type text not null,
  amount bigint not null,
  month int not null,
  year int not null,
  date date not null,
  note text,
  rekening text,
  submitted_by text,
  created_at timestamp with time zone default now()
);
```

4. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

5. Tambahkan environment variable di Vercel:
   - Settings → Environment Variables
   - `NEXT_PUBLIC_SUPABASE_URL` = URL dari Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Key dari Supabase

6. Edit `lib/store.js` untuk menggunakan Supabase sebagai ganti localStorage

---

## 🛠️ Menjalankan Secara Lokal

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Buka di browser
# http://localhost:3000
```

---

## 📱 Cara Ubah PIN / Tambah User

Edit file `lib/store.js`, bagian `DEFAULT_USERS`:

```javascript
const DEFAULT_USERS = [
  { id: 'admin', name: 'Admin Yayasan', pin: '9999', role: 'admin' }, // ubah PIN
  { id: 'smp', name: 'Budi Santoso', pin: '5678', role: 'user', school: 'SMP' }, // ubah nama
  // tambah user baru...
];
```

Setelah edit, commit & push ke GitHub → Vercel otomatis redeploy.

---

## 🎨 Kustomisasi

- **Nama Yayasan**: cari `YTKP Banjar Asri` di semua file, ganti sesuai kebutuhan
- **Rekening Utama**: tambahkan di form konfirmasi di `pages/user.js`
- **Warna tema**: edit CSS variables di `styles/globals.css`
- **Jenis Setoran**: tambah/hapus di `lib/store.js` bagian `PAYMENT_TYPES`

---

## 📞 Struktur File

```
ytkp-finance/
├── pages/
│   ├── index.js      # Halaman login
│   ├── user.js       # Tampilan bendahara sekolah
│   ├── admin.js      # Dashboard admin yayasan
│   ├── 404.js        # Halaman error
│   └── _app.js       # App wrapper
├── lib/
│   ├── store.js      # Data & logika bisnis
│   └── format.js     # Format angka & tanggal
├── styles/
│   └── globals.css   # CSS global
├── package.json
├── next.config.js
└── vercel.json
```

**OpenJob API V2 — README**

Deskripsi singkat
- **Project**: OpenJob RESTful API V2 — backend untuk mengelola users, companies, categories, jobs, applications, bookmarks, dan dokumen.

**Prasyarat**
- **Node.js**: v16+ dan **npm** atau **yarn**.
- **PostgreSQL**: database yang bisa diakses (untuk migrasi dan runtime).
- **(Opsional) Redis**: caching (service boleh tidak aktif — aplikasi tetap jalan).
- **(Opsional) RabbitMQ**: notifikasi (boleh tidak aktif — aplikasi tetap jalan).

**Instalasi & Run**
- **Clone repository**: tempatkan sumber di mesin Anda.
- **Install deps**: jalankan:

```bash
cd openjob_api
npm install
```

- **Konfigurasi environment**: buat file `.env` di folder `openjob_api` berdasarkan contoh di bawah.
- **Migrasi database** (jika perlu):

```bash
# jalankan migrasi (node-pg-migrate)
npm run migrate
```

- **Menjalankan server (development)**:

```bash
npm run dev
```

- **Menjalankan server (production)**:

```bash
npm start
```

**File dan script penting**
- **Package script**: lihat [openjob_api/package.json](openjob_api/package.json#L1-L50) untuk `start`, `dev`, dan perintah migrasi.
- **Entrypoint**: server di [src/server.js](openjob_api/src/server.js#L1-L200).
- **Routes**: daftar route di [src/routes/index.js](openjob_api/src/routes/index.js#L1-L200).

**Contoh file `.env`**
Isi minimal yang disarankan (sesuaikan dengan environment Anda):

```
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/openjob_db
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

# Redis (opsional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ (opsional)
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
# atau AMQP_URL=amqp://user:pass@host:port

# NODE_ENV variable (opsional)
NODE_ENV=development
```

**Endpoint penting & Cara test di Postman**
Base URL: `http://localhost:3000`

- **Daftar / Register user**
  - **Method**: POST
  - **URL**: `/users`
  - **Body (JSON)**: `{ "name": "Nama User", "email": "user@example.com", "password": "secret123" }`

- **Login (dapatkan token)**
  - **Method**: POST
  - **URL**: `/authentications`
  - **Body (JSON)**: `{ "email": "user@example.com", "password": "secret123" }`
  - **Response**: berisi `accessToken` dan `refreshToken`.

- **Menggunakan token di Postman**
  - Tambahkan header `Authorization` dengan value: `Bearer <accessToken>` untuk endpoint yang membutuhkan autentikasi.

- **Contoh membuat job (authed)**
  - **Method**: POST
  - **URL**: `/jobs`
  - **Headers**: `Authorization: Bearer <accessToken>`
  - **Body (JSON)** contoh minimal:
    `{ "company_id": "<company-id>", "title": "Frontend Engineer" }`

- **Contoh upload dokumen (PDF)**
  - **Method**: POST
  - **URL**: `/documents`
  - **Headers**: `Authorization: Bearer <accessToken>`
  - **Body**: gunakan `form-data` di Postman; key `document` (type: File) — hanya menerima PDF, maksimal 5MB (lihat [src/middleware/upload.js](openjob_api/src/middleware/upload.js#L1-L200)).

- **Cek list jobs (no auth)**
  - **Method**: GET
  - **URL**: `/jobs`

Untuk daftar lengkap routes silakan lihat [src/routes/index.js](openjob_api/src/routes/index.js#L1-L200).

**Notes & Troubleshooting**
- **Redis / RabbitMQ optional**: server mencoba connect pada startup, tapi jika gagal akan menampilkan peringatan dan tetap menjalankan API.
- **Uploads**: file di-save ke folder `uploads/` (server menyediakan static route `/uploads`).
- **Errors**: cek console logs untuk stack traces dan pesan error.

Jika Anda mau, saya bisa membuat file koleksi Postman (.json) dengan beberapa request contoh (register, login, create job, upload document). Mau saya buatkan koleksi Postman juga?

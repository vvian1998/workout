# 🧠 AI TOOLS LIMITATIONS & WORKFLOW GUIDE

Tanggal: 20 Juli 2026  
Environment: Android (Termux)  
Project: Workout Personal  
Path: /storage/emulated/0/project/workout  

---

## 📊 RINGKASAN CEPAT

WRITE  → run_shell_command  
READ   → read_file  
DEBUG  → redirect output → read_file  
VERIFY → read_file  

---

## ⚠️ LIMITASI TOOLS

### write_file
- Tidak bisa create file baru (file jadi kosong)
- Tidak bisa overwrite file kosong
- Tidak konsisten pada file existing
- Tidak reliable → JANGAN digunakan

---

### run_shell_command
- Bisa execute command
- Bisa create & overwrite file
- Tidak return stdout (output kosong)
- Tidak bisa digunakan untuk membaca hasil langsung

Gunakan hanya untuk WRITE

---

### read_file
- Sangat reliable
- Bisa membaca file apapun
- Satu-satunya cara verifikasi

Gunakan untuk READ & VALIDASI

---

## ⚙️ SOP WAJIB

### CREATE FILE

Gunakan:

cat > /path/to/file.txt << 'EOF'
Isi file
Baris kedua
Baris ketiga
EOF

---

### EDIT FILE

Gunakan:

cat > /path/to/file.txt << 'EOF'
Konten baru
EOF

---

### READ FILE

Gunakan:

read_file({
  absolute_path: "/path/to/file.txt"
})

---

### DEBUG OUTPUT

Gunakan:

command > /tmp/output.txt 2>&1

Lalu baca dengan:

read_file({
  absolute_path: "/tmp/output.txt"
})

---

## 🔁 WORKFLOW STANDAR

CREATE:
1. run_shell_command  
2. read_file  

EDIT:
1. read_file  
2. run_shell_command  
3. read_file  

DEBUG:
1. run_shell_command (redirect)  
2. read_file  

---

## 🚫 LARANGAN

- Jangan gunakan write_file  
- Jangan gunakan cat / ls untuk baca output  
- Jangan mengandalkan stdout  
- Jangan create file tanpa verifikasi  

---

## 🧠 RULE UNTUK AI

Gunakan aturan berikut:

1. Untuk menulis file → gunakan run_shell_command  
2. Untuk membaca file → gunakan read_file  
3. Jangan mengandalkan output shell  
4. Selalu verifikasi dengan read_file  
5. Jangan gunakan write_file  
6. Jangan skip verifikasi  

---

## ⚡ PROMPT TEMPLATE (START SESSION)

Baca file:
- AI/00_SYSTEM.md  
- AI/01_RULES.md  
- AI/02_ROADMAP.md  
- AI/03_CODE_STYLE.md  
- PRD-Aplikasi-Workout-Personal.md  
- TOOLS_LIMITATIONS.md  

Ikuti semua rules dan limitations.

Gunakan:
- run_shell_command untuk write  
- read_file untuk read  

Jangan:
- gunakan write_file  
- bergantung pada output shell  

Jawab: READY

---

## ⚡ PROMPT EKSEKUSI

Eksekusi hanya 1 task.

Rules:
- gunakan run_shell_command  
- verifikasi dengan read_file  
- jangan lompat step  

---

## ⚡ PROMPT LANJUT

Lanjut ke step berikutnya  
Jangan ulang output sebelumnya  

---

## 💡 INSIGHT PENTING

Environment ini:
- AI bisa execute command  
- AI tidak bisa melihat output langsung  
- Semua verifikasi harus melalui file  

AI = executor tanpa mata  

---

## 📌 STATUS

Versi: 2.0  
Status: STABLE  

---

Dokumen ini adalah acuan utama workflow AI# Tools Limitations Reference

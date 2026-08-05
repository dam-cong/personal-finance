# Cấu hình Nginx cho personal-finance.com.vn

## 1. Copy file cấu hình vào server

```bash
sudo cp nginx/personal-finance.com.vn.conf /etc/nginx/sites-available/
```

## 2. Tạo symbolic link để kích hoạt

```bash
sudo ln -s /etc/nginx/sites-available/personal-finance.com.vn.conf /etc/nginx/sites-enabled/
```

## 3. Kiểm tra cấu hình nginx

```bash
sudo nginx -t
```

## 4. Reload nginx

```bash
sudo systemctl reload nginx
```

## 5. Cấp SSL certificate bằng Certbot

```bash
sudo certbot certonly --nginx -d personal-finance.com.vn -d www.personal-finance.com.vn
```

Sau khi cấp SSL, tự thêm 2 dòng sau vào server block 443 trong file cấu hình:

```nginx
ssl_certificate     /etc/letsencrypt/live/personal-finance.com.vn/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/personal-finance.com.vn/privkey.pem;
```

Rồi reload nginx:

```bash
sudo systemctl reload nginx
```

## 6. Kiểm tra SSL tự gia hạn

```bash
sudo certbot renew --dry-run
```

## 7. Xoá cấu hình mặc định (tùy chọn)

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

## Cấu trúc thư mục trên server

```
/etc/nginx/
├── sites-available/
│   └── personal-finance.com.vn.conf
└── sites-enabled/
    └── personal-finance.com.vn.conf -> ../sites-available/personal-finance.com.vn.conf
```

## Lưu ý

- File cấu hình này chỉ là redirect HTTP → HTTPS và proxy pass đến Go server chạy trên port 8080.
- SSL certificate do Let's Encrypt cấp qua Certbot.
- Port 8080 chỉ lắng nghe localhost, không mở ra ngoài Internet.
- Sau khi chạy certbot, tự thêm `ssl_certificate` và `ssl_certificate_key` vào server block 443.
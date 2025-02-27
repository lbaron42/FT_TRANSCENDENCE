FROM nginx

RUN rm -f /etc/nginx/conf.d/*

# Create necessary directories
RUN mkdir -p /usr/share/nginx/html/static/images \
    && mkdir -p /usr/share/nginx/html/static/js \
    && mkdir -p /usr/share/nginx/html/static/css

# Copy configuration
COPY ./config /etc/nginx/conf.d/

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl

RUN mkdir -p /etc/nginx/ssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
  -subj "/C=DE/ST=Berlin/L=Berlin/O=42/OU=42/CN=localhost/"

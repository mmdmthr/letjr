FROM php:8.3-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git unzip curl libzip-dev libpng-dev libonig-dev \
    && docker-php-ext-install pdo_mysql mbstring zip exif pcntl

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

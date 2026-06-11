<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

function crypto_encrypt(string $plaintext): string {
  $key = app_key();
  if ($key === '') {
    throw new RuntimeException('APP_KEY is missing; cannot encrypt');
  }
  $k = hash('sha256', $key, true);
  $iv = random_bytes(12);
  $tag = '';
  $ciphertext = openssl_encrypt($plaintext, 'aes-256-gcm', $k, OPENSSL_RAW_DATA, $iv, $tag);
  if ($ciphertext === false) throw new RuntimeException('Encryption failed');
  return base64_encode($iv . $tag . $ciphertext);
}

function crypto_decrypt(string $blob): string {
  $key = app_key();
  if ($key === '') throw new RuntimeException('APP_KEY is missing; cannot decrypt');
  $raw = base64_decode($blob, true);
  if ($raw === false || strlen($raw) < 12 + 16) throw new RuntimeException('Bad ciphertext');
  $iv = substr($raw, 0, 12);
  $tag = substr($raw, 12, 16);
  $ct = substr($raw, 28);
  $k = hash('sha256', $key, true);
  $pt = openssl_decrypt($ct, 'aes-256-gcm', $k, OPENSSL_RAW_DATA, $iv, $tag);
  if ($pt === false) throw new RuntimeException('Decryption failed');
  return $pt;
}

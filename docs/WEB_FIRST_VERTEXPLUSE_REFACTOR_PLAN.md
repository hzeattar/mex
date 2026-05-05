# Web-first VertexPluse Refactor Plan

## Goal
Convert the current Telegram-first trading mini-app into a web-first platform with Telegram as an optional login and notification channel.

## Keep
- PHP backend and current hosting model
- Markets, trades, ledger, deposits, withdrawals, investment plans
- Admin area as the operations back-office
- Telegram login as an optional identity provider

## Remove or isolate
- Direct client dependency on bot-only flows
- Legacy cookie auth based on raw user IDs
- Mixed routing decisions that assume Telegram is the main entry point
- Duplicate legacy payment/admin endpoints as they get replaced

## Refactor now
1. Secure browser sessions through server-side session records
2. User identities table for email and Telegram
3. Trading accounts table for live/demo modeling
4. Unified auth bootstrap that always ensures wallets + accounts + identities
5. Keep `/api/verify.php` as backward compatibility only

## Build next
1. Funding journey pages: method details, submitted request page, request tracking, proof uploads
2. Full onboarding: register -> verify -> fund -> trade
3. Public website CMS blocks from admin settings
4. Admin roles, audit trail, stronger ops workflows
5. Final UI polish for home, markets, trade, funds, portfolio, invest, account

## Phase status in this build
- Added secure `web_sessions` table and cookie-backed server-side browser sessions
- Added `user_identities` table
- Added `trading_accounts` table
- Updated login, register, Telegram login, and legacy verify flow to populate the new tables
- Preserved backward compatibility where practical
